import { describe, it, expect } from "vitest";
import { evidenceReconciliationFromSources } from "../assemble/evidenceReconciliationFromSources.js";
import { CORE_MESSAGES, CoreMessage } from "./messages.js";
import { coreMessage } from "./coreText.js";
import { codeSpan } from "./codeSpan.js";
import { renderMarkdown } from "../assemble/composers.js";
import type { EvidenceReconciliation } from "../assemble/renderInput.js";
import { sectionCtx as ctx } from "./runContext.test-utils.js";
import {
  endOfStepAccountingTable as endOfTable,
  linesOf,
  sectionUnder,
  stepAccountingSection as stepAccounting,
} from "./renderedSection.test-utils.js";
import {
  unitTestsAndTypesCi as ci,
  feature,
  reconcileStepAccounting,
  stepAccountingCi,
} from "../evidenceReconciliation.test-utils.js";
import { parsedFeatures } from "../parse/parsedFeatures.test-utils.js";
import { parsedWorkflows } from "../parse/parsedWorkflows.test-utils.js";
import { publishedExitCodeOf } from "./publishedExitCodes.test-utils.js";

const scripts = { test: "vitest run", typecheck: "tsc --noEmit" };

const twoTypesStepsCi = `name: fixture CI
jobs:
  quality:
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      - name: Unit tests
        run: pnpm test
      - name: Types
        run: pnpm typecheck
      - name: Types
        run: pnpm typecheck
`;

function reconciliationOf(
  notChecks?: readonly string[],
  workflows: Readonly<Record<string, string>> = { "ci.yml": ci }
): EvidenceReconciliation {
  const specController = notChecks === undefined ? {} : { notChecks };
  const packageJson = { scripts, specController } as Parameters<
    typeof evidenceReconciliationFromSources
  >[0]["packageJson"];
  return evidenceReconciliationFromSources({
    features: parsedFeatures([feature]),
    packageJson,
    ciWorkflows: parsedWorkflows(Object.values(workflows), Object.keys(workflows)),
    behaviouralObservations: [],
    deferralTags: [],
  });
}

function reportLines(notChecks?: readonly string[], workflows?: Readonly<Record<string, string>>): string[] {
  return renderMarkdown(reconciliationOf(notChecks, workflows), ctx, publishedExitCodeOf).split("\n");
}

const spanStepsCi = `name: fixture CI
jobs:
  quality:
    steps:
      - name: Unit tests
        run: pnpm test
      - name: "Run \`pnpm lint\`"
        run: pnpm lint
      - name: "Two\\nlines"
        run: pnpm typecheck
`;

const label = CORE_MESSAGES[CoreMessage.StepAccountingNonChecksLabel];

const nonCheck = (span: string): string => `- ${CORE_MESSAGES[CoreMessage.StepNonCheck](span)}`;

const nonCheckMark = (): string => `${CORE_MESSAGES[CoreMessage.StepNonCheck]("").split(":")[0]!.trim()}:`;

const nonChecksList = (lines: readonly string[], length: number): string[] => {
  const start = lines.indexOf(label);
  expect(start).toBeGreaterThanOrEqual(0);
  return lines.slice(start, start + length);
};

describe("[SCN-RPT-048] the step-accounting section lists each non-check beneath its table with its reason", () => {
  it("lists each non-check with its reason under a Non-checks label beneath the table, then a blank line, and no entry that matches no step", () => {
    const section = stepAccounting(reportLines(["ci.yml:quality:Types", "ci.yml:quality:Lint"]));
    const tableEnd = endOfTable(section);

    expect(section.indexOf(label)).toBeGreaterThan(tableEnd);
    expect(nonChecksList(section, 3)).toStrictEqual([label, nonCheck(codeSpan("ci.yml:quality:Types")), ""]);
    expect(section.some((line) => line.includes(coreMessage(CoreMessage.NotChecksEntryMatchesNoStep, { key: "", entry: "\0" }).replace(/^[^\0]*\0/, "")))).toBe(false);
  });

  it.each([
    { entry: "ci.yml:quality:Run `pnpm lint`", item: "`` ci.yml:quality:Run `pnpm lint` ``" },
    { entry: "ci.yml:quality:Two\nlines", item: '`"ci.yml:quality:Two\\nlines"`' },
  ])("lists the non-check $entry whole in its code span, as $item", ({ entry, item }) => {
    const section = stepAccounting(reportLines([entry], { "ci.yml": spanStepsCi }));
    expect(nonChecksList(section, 3)).toStrictEqual([label, nonCheck(item), ""]);
  });

  it("lists one line for each step an entry matches", () => {
    const section = stepAccounting(reportLines(["ci.yml:quality:Types"], { "ci.yml": twoTypesStepsCi }));
    const types = nonCheck(codeSpan("ci.yml:quality:Types"));
    expect(nonChecksList(section, 4)).toStrictEqual([label, types, types, ""]);
  });

  it("lists the non-checks after the reconciler steps, in the order the steps were read", () => {
    const section = stepAccounting(linesOf(reconcileStepAccounting([stepAccountingCi])));
    const reconcilerLabel = CORE_MESSAGES[CoreMessage.StepAccountingReconcilerLabel];
    expect(section.indexOf(reconcilerLabel)).toBeGreaterThanOrEqual(0);
    expect(section.indexOf(label)).toBeGreaterThan(section.indexOf(reconcilerLabel));
    expect(nonChecksList(section, 5)).toStrictEqual([
      label,
      nonCheck(codeSpan("ci.yml:ci:Checkout")),
      nonCheck(codeSpan("ci.yml:ci:Install")),
      nonCheck(codeSpan("ci.yml:ci:Build")),
      "",
    ]);
  });
});

describe("[SCN-RPT-098] the step-accounting section lists no non-check when the target names none", () => {
  it("lists no non-check, and prints no Non-checks label, for a target that names no step a non-check", () => {
    const lines = reportLines();
    expect(stepAccounting(lines).length).toBeGreaterThan(0);
    expect(lines).not.toContain(label);
    expect(lines.some((line) => line.includes(nonCheckMark()) || line.includes(coreMessage(CoreMessage.NotChecksEntryMatchesNoStep, { key: "", entry: "\0" }).replace(/^[^\0]*\0/, "")))).toBe(false);
  });

  it("prints no Non-checks label when the target's only entry matches no step", () => {
    const section = stepAccounting(reportLines(["ci.yml:quality:Lint"]));
    expect(section.length).toBeGreaterThan(0);
    expect(section).not.toContain(label);
    expect(section.some((line) => line.includes(coreMessage(CoreMessage.NotChecksEntryMatchesNoStep, { key: "", entry: "\0" }).replace(/^[^\0]*\0/, "")))).toBe(false);
  });
});

const callsAnotherWorkflowCi = `name: release
jobs:
  release:
    uses: ./.github/workflows/ci.yml
`;

const notAppliedLabelOf = (workflowsRead: readonly string[]): string =>
  CORE_MESSAGES[CoreMessage.StepAccountingNotAppliedLabel](
    "`specController.notChecks`",
    workflowsRead.map((workflow) => `\`${workflow}\``).join(", ")
  );

describe("[SCN-RPT-089] a well-formed notChecks entry naming a workflow the run did not read is listed beneath the step accounting's table as not applied, with every workflow the run read named beside it, one whose jobs only call another workflow included, and none is listed when every entry names a workflow the run read", () => {
  it.each<{ workflows: Readonly<Record<string, string>>; notChecks: readonly string[]; notApplied: readonly string[] }>([
    {
      workflows: { "ci.yml": ci },
      notChecks: ["ci.yml:quality:Types", "ci.yaml:quality:Deploy", ".github/workflows/ci.yml:quality:Deploy", "other.yml:build"],
      notApplied: ["ci.yaml:quality:Deploy", ".github/workflows/ci.yml:quality:Deploy"],
    },
    {
      workflows: { "ci.yml": ci, "ci.yml.bak": ci },
      notChecks: ["ci.yml.bak:quality:Types", "ci.yml.old.yml:quality:Types"],
      notApplied: ["ci.yml.old.yml:quality:Types"],
    },
    {
      workflows: { "ci.yml": ci, "release.yml": callsAnotherWorkflowCi },
      notChecks: ["ci.yml:quality:Types", "deploy.yml:release:Ship"],
      notApplied: ["deploy.yml:release:Ship"],
    },
  ])("lists $notApplied, reading $workflows, as not applied", ({ workflows, notChecks, notApplied }) => {
    const lines = reportLines(notChecks, workflows);
    const section = stepAccounting(lines);
    const notAppliedLabel = notAppliedLabelOf(Object.keys(workflows));
    const start = section.indexOf(notAppliedLabel);

    expect(start).toBeGreaterThan(Math.max(endOfTable(section), section.indexOf(label)));
    expect(section.slice(start, start + notApplied.length + 2)).toStrictEqual([
      notAppliedLabel,
      ...notApplied.map((entry) => `- \`${entry}\``),
      "",
    ]);
    expect(lines.filter((line) => notApplied.some((entry) => line.includes(entry)))).toStrictEqual(
      notApplied.map((entry) => `- \`${entry}\``)
    );
  });

  it.each([
    { case: "names no non-check", notChecks: undefined },
    { case: "names only workflows the run read", notChecks: ["ci.yml:quality:Types", "ci.yml:quality:Lint"] },
  ])("prints no not-applied label for a target that $case", ({ notChecks }) => {
    const section = stepAccounting(reportLines(notChecks));
    const placeholderLabel = notAppliedLabelOf(["\0"]);
    const labelOpening = placeholderLabel.slice(0, placeholderLabel.indexOf("`\0`"));

    expect(section.length).toBeGreaterThan(0);
    expect(section.filter((line) => line.startsWith(labelOpening))).toStrictEqual([]);
    expect(section.filter((line) => (notChecks ?? []).some((entry) => line === `- \`${entry}\``))).toStrictEqual([]);
  });

  it("names the workflows of the steps read, for a saved report that records no workflows read", () => {
    const reconciliation = reconciliationOf(["deploy.yml:release:Ship"], { "ci.yml": ci, "release.yml": callsAnotherWorkflowCi });
    const accounting = reconciliation.summary.stepAccounting;
    const saved = JSON.parse(
      JSON.stringify({ ...reconciliation, summary: { ...reconciliation.summary, stepAccounting: { ...accounting, workflowsRead: undefined } } })
    ) as EvidenceReconciliation;
    const section = stepAccounting(linesOf(saved));
    const notAppliedLabel = notAppliedLabelOf(["ci.yml"]);

    const start = section.indexOf(notAppliedLabel);

    expect(section.slice(start, start + 3)).toStrictEqual([notAppliedLabel, "- `deploy.yml:release:Ship`", ""]);
  });
});

const configurationNotRead = (lines: readonly string[]): string[] =>
  sectionUnder(CORE_MESSAGES[CoreMessage.ConfigurationNotReadHeading])(lines);

describe("[SCN-RPT-091] a run that reads no CI step lists each notChecks entry naming a workflow it did not read under the step accounting as not applied, with no table, under a label naming the workflows it read or saying it read none", () => {
  it.each<{ case: string; workflows: Readonly<Record<string, string>>; notChecks: readonly string[]; workflowsRead: string; malformed: readonly string[] }>([
    { case: "reads no workflow", workflows: {}, notChecks: ["deploy.yml:release:Ship", "ci.yml:build"], workflowsRead: "no workflow", malformed: ["ci.yml:build"] },
    { case: "reads one workflow whose only job calls another", workflows: { "release.yml": callsAnotherWorkflowCi }, notChecks: ["deploy.yml:release:Ship"], workflowsRead: "`release.yml`", malformed: [] },
  ])("holds only the not-applied list for a run that $case", ({ workflows, notChecks, workflowsRead, malformed }) => {
    const lines = reportLines(notChecks, workflows);
    const notAppliedLabel = CORE_MESSAGES[CoreMessage.StepAccountingNotAppliedLabel]("`specController.notChecks`", workflowsRead);

    expect(stepAccounting(lines)).toStrictEqual([
      CORE_MESSAGES[CoreMessage.StepAccountingHeading],
      "",
      notAppliedLabel,
      "- `deploy.yml:release:Ship`",
      "",
    ]);
    for (const entry of malformed) {
      expect(lines.filter((line) => line.includes(entry))).toStrictEqual(configurationNotRead(lines).filter((line) => line.includes(entry)));
      expect(configurationNotRead(lines).filter((line) => line.includes(entry))).toHaveLength(1);
    }
  });
});

const deployCi = `name: deploy
jobs:
  quality:
    steps:
      - name: Unit tests
        run: pnpm test
      - name: Deploy
        run: ./deploy.sh
`;

describe("[SCN-RPT-090] a notChecks entry naming a workflow whose name holds a colon makes that workflow's step a non-check", () => {
  it.each<{ workflows: Readonly<Record<string, string>>; entry: string }>([
    { workflows: { "a:b.yml": deployCi }, entry: "a:b.yml:quality:Deploy" },
    { workflows: { "a.yml": deployCi, "a.yml:b.yml": deployCi }, entry: "a.yml:b.yml:quality:Deploy" },
  ])("takes $entry's step as a non-check, reading $workflows, and lists it neither as unread nor as not applied", ({ workflows, entry }) => {
    const reconciliation = reconciliationOf([entry], workflows);
    const { nonChecksNotAStepName, nonChecksMatchingNoStep, stepAccounting: accounting } = reconciliation.summary;
    const lines = renderMarkdown(reconciliation, ctx, publishedExitCodeOf).split("\n");
    const [, nonCheckItem, afterItem] = nonChecksList(stepAccounting(lines), 3);

    expect(accounting?.steps.nonChecks).toStrictEqual([entry]);
    expect([nonChecksNotAStepName, nonChecksMatchingNoStep, accounting?.nonChecksNamingAWorkflowNotRead]).toStrictEqual([undefined, undefined, undefined]);
    expect(nonCheckItem).toContain(entry);
    expect(afterItem).toBe("");
    expect(lines.filter((line) => line.includes(entry) || line.includes(nonCheckMark()))).toStrictEqual([nonCheckItem]);
    expect(lines).not.toContain(CORE_MESSAGES[CoreMessage.ConfigurationNotReadHeading]);
  });
});
