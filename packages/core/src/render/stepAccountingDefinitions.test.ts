import { describe, it, expect } from "vitest";
import { renderJson, renderMarkdown, renderReportFromJson } from "../assemble/composers.js";
import type { EvidenceReconciliation } from "../assemble/renderInput.js";
import { CoreMessage } from "./messages.js";
import { coreMessage } from "./coreText.js";
import { sectionCtx as ctx } from "./runContext.test-utils.js";
import { stepAccountingSection } from "./renderedSection.test-utils.js";
import { publishedExitCodeOf } from "./publishedExitCodes.test-utils.js";
import {
  stepAccountingCi as ci,
  nightly,
  reconcileStepAccounting as reconcile,
} from "../evidenceReconciliation.test-utils.js";

const DEFINITIONS = (): string[] => [
  `- ${coreMessage(CoreMessage.StepAccountingCandidatesTerm)}`,
  `- ${coreMessage(CoreMessage.StepAccountingReconcilerTerm)}`,
  `- ${coreMessage(CoreMessage.StepAccountingNonChecksTerm)}`,
  `- ${coreMessage(CoreMessage.StepAccountingPlumbingTerm)}`,
  `- ${coreMessage(CoreMessage.StepAccountingAccountedForTerm)}`,
];

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
  const header = section.indexOf(coreMessage(CoreMessage.StepAccountingTableHeader));
  expect(header).toBeGreaterThan(0);
  return section.slice(1, header);
};

const markdownOf = (reconciliation: EvidenceReconciliation): string => renderMarkdown(reconciliation, ctx, publishedExitCodeOf);

describe("[CLM-RPT-092] the step-accounting section defines its Candidates, Reconciler, Non-checks, GitHub plumbing and Accounted for columns before its table", () => {
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
    expect(oneJobLines).toStrictEqual(["", ...DEFINITIONS(), ""]);
    expect(linesBeforeTable(markdownOf(severalJobs))).toStrictEqual(oneJobLines);
    for (const line of oneJobLines) expect(line).not.toMatch(/[0-9]/);
  });

  it("prints the same five for a run whose Reconciler and GitHub plumbing columns are zero throughout", () => {
    const reconciliation = reconcile([runnerAndTypesCi]);
    const total = reconciliation.summary.stepAccounting?.total;

    expect([total?.reconciler, total?.plumbing]).toStrictEqual([0, 0]);
    expect(linesBeforeTable(markdownOf(reconciliation))).toStrictEqual(["", ...DEFINITIONS(), ""]);
  });

  it("prints the same five for a target with no specController block", () => {
    const reconciliation = reconcile([ci], ["ci.yml"], { scripts: { test: "vitest run" } });

    expect(linesBeforeTable(markdownOf(reconciliation))).toStrictEqual(["", ...DEFINITIONS(), ""]);
  });

  it("prints the same five when a saved report is re-rendered from its JSON", () => {
    const saved = renderJson(reconcile([ci]), ctx);
    const regenerated = renderReportFromJson(saved, ctx.inputs, publishedExitCodeOf);

    expect(linesBeforeTable(regenerated)).toStrictEqual(["", ...DEFINITIONS(), ""]);
  });
});

describe("[CLM-RPT-100] the step-accounting section prints no column definition when it prints no table", () => {
  it("prints no definition for a run that reads no CI step and lists a notChecks entry as not applied", () => {
    const reconciliation = reconcile([], [], {
      scripts: { test: "vitest run" },
      specController: { runners: { unit: "vitest" }, notChecks: ["deploy.yml:release:Ship"] },
    });
    const section = sectionOf(markdownOf(reconciliation));

    expect(section).toContain("- `deploy.yml:release:Ship`");
    expect(section).not.toContain(coreMessage(CoreMessage.StepAccountingTableHeader));
    for (const definition of DEFINITIONS()) expect(section).not.toContain(definition);
  });
});
