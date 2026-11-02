import { describe, it, expect } from "vitest";
import { evidenceReconciliationFromSources } from "../assemble/evidenceReconciliationFromSources.js";
import { CORE_MESSAGES, CoreMessage } from "./messages.js";
import { codeSpan } from "./codeSpan.js";
import { renderMarkdown } from "../assemble/composers.js";
import { sectionCtx as ctx } from "./runContext.test-utils.js";
import { endOfStepAccountingTable as endOfTable, stepAccountingSection as stepAccounting } from "./renderedSection.test-utils.js";
import { reconcilerCi as ci, ciWithoutReconciler, feature, reconcilerPackageJson as packageJson } from "../evidenceReconciliation.test-utils.js";
import { parsedFeatures } from "../parse/parsedFeatures.test-utils.js";
import { parsedWorkflows } from "../parse/parsedWorkflows.test-utils.js";
import { publishedExitCodeOf } from "./publishedExitCodes.test-utils.js";

function reportLines(ciSource: string): string[] {
  const reconciliation = evidenceReconciliationFromSources({
    features: parsedFeatures([feature]),
    packageJson,
    ciWorkflows: parsedWorkflows([ciSource], ["ci.yml"]),
    reconcilerInvocation: "spec-controller balance",
    behaviouralObservations: [],
    deferralTags: [],
  });
  return renderMarkdown(reconciliation, ctx, publishedExitCodeOf).split("\n");
}

const label = "Reconciler:";
const dump = "ci.yml:ci:Dump this run's step record";
const balance = "ci.yml:ci:Reconciliation";
const reconciles = CORE_MESSAGES[CoreMessage.ReconcilerReconciles];
const records = CORE_MESSAGES[CoreMessage.ReconcilerRecords];

const spanStepsCi = `name: fixture CI
jobs:
  ci:
    steps:
      - name: "Run \`balance\`"
        run: pnpm exec spec-controller balance --features features --ci .github/workflows
      - name: "Two\\nlines"
        run: pnpm exec spec-controller balance --features features --ci .github/workflows
`;

const reconcilerList = (lines: readonly string[]): string[] => {
  const start = lines.indexOf(label);
  expect(start).toBeGreaterThanOrEqual(0);
  return lines.slice(start, start + 4);
};

describe("[SCN-RPT-050] the step-accounting section lists each reconciler step beneath its table with what it does, and lists none for a pipeline that runs no reconciliation", () => {
  it("lists each reconciler step under a Reconciler label beneath the table, with what that step does, in the order the steps were read", () => {
    const section = stepAccounting(reportLines(ci));
    const tableEnd = endOfTable(section);

    expect(reconciles).not.toBe(records);
    expect(section.indexOf(label)).toBeGreaterThan(tableEnd);
    expect(reconcilerList(section)).toStrictEqual([
      "Reconciler:",
      "- `ci.yml:ci:Dump this run's step record` — the reconciler: this step writes the step record the reconciliation reads.",
      "- `ci.yml:ci:Reconciliation` — the reconciler: this step runs the reconciliation this report is.",
      "",
    ]);
  });

  it.each([
    { step: "ci.yml:ci:Run `balance`", item: "- `` ci.yml:ci:Run `balance` `` — the reconciler: this step runs the reconciliation this report is." },
    { step: "ci.yml:ci:Two\nlines", item: '- `"ci.yml:ci:Two\\nlines"` — the reconciler: this step runs the reconciliation this report is.' },
  ])("lists the reconciler step $step whole in its code span, as $item", ({ item }) => {
    const section = stepAccounting(reportLines(spanStepsCi));
    const start = section.indexOf(label);
    expect(start).toBeGreaterThanOrEqual(0);
    expect(section.slice(start)).toContain(item);
  });

  it("lists neither reconciler step as excluded", () => {
    const lines = reportLines(ci);
    for (const step of [dump, balance]) {
      expect(lines).not.toContain(`- ${CORE_MESSAGES[CoreMessage.StepExcluded](codeSpan(step))}`);
    }
  });

  it("lists no reconciler step, and prints no Reconciler label, for a pipeline that runs no reconciliation", () => {
    const lines = reportLines(ciWithoutReconciler);
    expect(stepAccounting(lines).length).toBeGreaterThan(0);
    expect(lines).not.toContain(label);
    expect(lines.some((line) => line.includes(reconciles) || line.includes(records))).toBe(false);
  });
});
