import { describe, it, expect } from "vitest";
import { renderJson, renderMarkdown, renderReportFromJson } from "../assemble/composers.js";
import type { EvidenceReconciliation } from "../assemble/renderInput.js";
import { CORE_MESSAGES, CoreMessage } from "./messages.js";
import { sectionCtx as ctx } from "./runContext.test-utils.js";
import { stepAccountingSection } from "./renderedSection.test-utils.js";
import { publishedExitCodeOf } from "./publishedExitCodes.test-utils.js";
import { workflowSteps } from "../parse/parsedWorkflows.test-utils.js";
import { qualifiedStepName } from "../parse/stepNames.js";
import { runningFitnessObservations } from "../domain/ledger.js";
import {
  stepAccountingCi as ci,
  nightly,
  reconcileStepAccounting as reconcile,
} from "../evidenceReconciliation.test-utils.js";

const DEFINITIONS = [
  "- A Candidate is a step read that is not a Runner, Reconciler, Excluded or GitHub plumbing step. It is read as a fitness function, and no list below names it.",
  "- A Reconciler step runs this reconciliation or writes the step record it reads.",
  "- An Excluded step is one the target names a non-check under `specController.notChecks` and that is not a Reconciler step, a GitHub plumbing step included.",
  "- A GitHub plumbing step is one that is neither a Reconciler nor an Excluded step and uses one of GitHub's own actions `actions/checkout`, `actions/cache`, `actions/upload-artifact`, `actions/download-artifact` or `actions/setup-*`. A step that runs a command, an install included, is never plumbing.",
  "- Accounted for is the sum of the five columns from Candidates to GitHub plumbing, in which each step read is counted once.",
];

const everyKindOfStepCi = `name: fixture CI
jobs:
  ci:
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      - name: Setup Node
        uses: actions/setup-node@v4
      - name: Publish pages
        uses: actions/upload-pages-artifact@v3
      - name: Unit tests
        run: pnpm test
      - name: Reconciliation
        run: pnpm exec spec-controller balance --features features --ci .github/workflows
      - name: Sweep check
        run: pnpm lint:sweep
`;

const everyKindOfStepManifest = {
  scripts: { test: "vitest run", "lint:sweep": "madge --circular" },
  specController: { runners: { unit: "vitest" }, notChecks: ["ci.yml:ci:Setup Node", "ci.yml:ci:Reconciliation"] },
};

const PLUMBING_ACTION = /^actions\/(checkout|cache|upload-artifact|download-artifact|setup-[^/@]+)[/@]/;

const runnerAndTypesCi = `name: fixture CI
jobs:
  ci:
    steps:
      - name: Unit tests
        run: pnpm test
      - name: Types
        run: pnpm typecheck
`;

const sectionOf = (md: string): string[] => stepAccountingSection(md.split("\n"));

const linesBeforeTable = (md: string): string[] => {
  const section = sectionOf(md);
  const header = section.indexOf(CORE_MESSAGES[CoreMessage.StepAccountingTableHeader]);
  expect(header).toBeGreaterThan(0);
  return section.slice(1, header);
};

const markdownOf = (reconciliation: EvidenceReconciliation): string => renderMarkdown(reconciliation, ctx, publishedExitCodeOf);

describe("[SCN-RPT-092] the step-accounting section defines its Candidates, Reconciler, Excluded, GitHub plumbing and Accounted for columns before its table, and prints no definition when it prints no table", () => {
  it("prints the five definitions as a list between the heading and the table, the same on a one-job run and on a several-job run holding every disposition, with no figure from the run", () => {
    const oneJob = reconcile([ci]);
    const severalJobs = reconcile([nightly, ci], ["nightly.yml", "ci.yml"]);
    const total = severalJobs.summary.stepAccounting?.total;

    expect(oneJob.summary.stepAccounting?.byJob).toHaveLength(1);
    expect(severalJobs.summary.stepAccounting?.byJob.length).toBeGreaterThan(1);
    for (const count of [total?.candidates, total?.runners, total?.reconciler, total?.nonChecks, total?.plumbing]) {
      expect(count).toBeGreaterThan(0);
    }

    const oneJobLines = linesBeforeTable(markdownOf(oneJob));
    expect(oneJobLines).toStrictEqual(["", ...DEFINITIONS, ""]);
    expect(linesBeforeTable(markdownOf(severalJobs))).toStrictEqual(oneJobLines);
    for (const line of oneJobLines) expect(line).not.toMatch(/[0-9]/);
  });

  it("prints the same five for a run whose Reconciler and GitHub plumbing columns are zero throughout", () => {
    const reconciliation = reconcile([runnerAndTypesCi]);
    const total = reconciliation.summary.stepAccounting?.total;

    expect([total?.reconciler, total?.plumbing]).toStrictEqual([0, 0]);
    expect(linesBeforeTable(markdownOf(reconciliation))).toStrictEqual(["", ...DEFINITIONS, ""]);
  });

  it("prints the same five for a target with no specController block", () => {
    const reconciliation = reconcile([ci], ["ci.yml"], { scripts: { test: "vitest run" } });

    expect(linesBeforeTable(markdownOf(reconciliation))).toStrictEqual(["", ...DEFINITIONS, ""]);
  });

  it("prints the same five when a saved report is re-rendered from its JSON", () => {
    const saved = renderJson(reconcile([ci]), ctx);
    const regenerated = renderReportFromJson(saved, ctx.inputs, publishedExitCodeOf);

    expect(linesBeforeTable(regenerated)).toStrictEqual(["", ...DEFINITIONS, ""]);
  });

  it("prints no definition for a run that reads no CI step and lists a notChecks entry as not applied", () => {
    const reconciliation = reconcile([], [], {
      scripts: { test: "vitest run" },
      specController: { runners: { unit: "vitest" }, notChecks: ["deploy.yml:release:Ship"] },
    });
    const section = sectionOf(markdownOf(reconciliation));

    expect(section).toContain("- `deploy.yml:release:Ship`");
    expect(section).not.toContain(CORE_MESSAGES[CoreMessage.StepAccountingTableHeader]);
    for (const definition of DEFINITIONS) expect(section).not.toContain(definition);
  });
  it("holds each definition's claim about which steps it covers over a run holding a Reconciler and a plumbing step the target names a non-check, and a GitHub action outside the plumbing list", () => {
    const reconciliation = reconcile([everyKindOfStepCi], ["ci.yml"], everyKindOfStepManifest);
    const steps = workflowSteps([everyKindOfStepCi], ["ci.yml"]);
    const account = reconciliation.summary.stepAccounting!;
    const notChecks = everyKindOfStepManifest.specController.notChecks;
    const reconcilers = (account.steps.reconciler ?? []).map(({ step }) => step);
    const actionOf = (name: string) => {
      const step = steps.find((s) => qualifiedStepName(s) === name);
      return step !== undefined && "action" in step ? step.action.name : "";
    };

    expect(account.steps.nonChecks).toStrictEqual(["ci.yml:ci:Setup Node"]);
    for (const step of account.steps.nonChecks ?? []) expect([notChecks.includes(step), reconcilers.includes(step)]).toStrictEqual([true, false]);
    expect(reconcilers).toContain("ci.yml:ci:Reconciliation");
    expect(account.steps.plumbing).toStrictEqual(["ci.yml:ci:Checkout"]);
    for (const step of account.steps.plumbing ?? []) expect(actionOf(step)).toMatch(PLUMBING_ACTION);

    const listed = new Set([...(account.steps.runners ?? []), ...reconcilers, ...(account.steps.nonChecks ?? []), ...(account.steps.plumbing ?? [])]);
    const candidates = steps.map(qualifiedStepName).filter((name) => !listed.has(name));
    expect(candidates).toStrictEqual(["ci.yml:ci:Publish pages", "ci.yml:ci:Sweep check"]);
    expect(actionOf("ci.yml:ci:Publish pages")).not.toMatch(PLUMBING_ACTION);
    expect(account.total.candidates).toBe(candidates.length);
    const readAsFitness = runningFitnessObservations(reconciliation.ledger).map((o) => o.step);
    for (const step of candidates) expect(readAsFitness).toContain(step);
    expect(linesBeforeTable(markdownOf(reconciliation))).toStrictEqual(["", ...DEFINITIONS, ""]);
  });
});
