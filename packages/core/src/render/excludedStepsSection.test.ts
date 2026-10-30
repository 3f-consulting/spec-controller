import { describe, it, expect } from "vitest";
import { evidenceReconciliationFromSources } from "../assemble/evidenceReconciliationFromSources.js";
import { CORE_MESSAGES, CoreMessage } from "./messages.js";
import { renderMarkdown } from "../assemble/composers.js";
import { sectionCtx as ctx } from "./runContext.test-utils.js";
import { linesOf, sectionUnder } from "./renderedSection.test-utils.js";
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

function reportLines(notChecks?: readonly string[], ciSource: string = ci): string[] {
  const specController = notChecks === undefined ? {} : { notChecks };
  const packageJson = { scripts, specController } as Parameters<
    typeof evidenceReconciliationFromSources
  >[0]["packageJson"];
  const reconciliation = evidenceReconciliationFromSources({
    features: parsedFeatures([feature]),
    packageJson,
    ciWorkflows: parsedWorkflows([ciSource], ["ci.yml"]),
    behaviouralObservations: [],
    deferralTags: [],
  });
  return renderMarkdown(reconciliation, ctx, publishedExitCodeOf).split("\n");
}

const label = "Excluded:";

const stepAccounting = (lines: readonly string[]): string[] =>
  sectionUnder(CORE_MESSAGES[CoreMessage.StepAccountingHeading])(lines);

const endOfTable = (section: readonly string[]): number => {
  const header = section.indexOf(CORE_MESSAGES[CoreMessage.StepAccountingTableHeader]);
  expect(header).toBeGreaterThanOrEqual(0);
  const end = section.indexOf("", header);
  expect(end).toBeGreaterThan(header);
  return end;
};

const excludedList = (lines: readonly string[], length: number): string[] => {
  const start = lines.indexOf(label);
  expect(start).toBeGreaterThanOrEqual(0);
  return lines.slice(start, start + length);
};

describe("[SCN-RPT-048] the step-accounting section lists each excluded step beneath its table with its reason, and lists none when the target names no non-check", () => {
  it("lists each excluded step with its reason under an Excluded label beneath the table, then a blank line, and no entry that matches no step", () => {
    const section = stepAccounting(reportLines(["ci.yml:quality:Types", "ci.yml:quality:Lint"]));
    const tableEnd = endOfTable(section);

    expect(section.indexOf(label)).toBeGreaterThan(tableEnd);
    expect(excludedList(section, 3)).toStrictEqual([
      "Excluded:",
      "- ci.yml:quality:Types — excluded: the target names this step a non-check.",
      "",
    ]);
    expect(section.some((line) => line.includes("matches no step"))).toBe(false);
  });

  it("prints no Excluded label when the target's only entry matches no step", () => {
    const section = stepAccounting(reportLines(["ci.yml:quality:Lint"]));
    expect(section.length).toBeGreaterThan(0);
    expect(section).not.toContain(label);
    expect(section.some((line) => line.includes("matches no step"))).toBe(false);
  });

  it("lists one line for each step an entry matches", () => {
    const section = stepAccounting(reportLines(["ci.yml:quality:Types"], twoTypesStepsCi));
    expect(excludedList(section, 4)).toStrictEqual([
      "Excluded:",
      "- ci.yml:quality:Types — excluded: the target names this step a non-check.",
      "- ci.yml:quality:Types — excluded: the target names this step a non-check.",
      "",
    ]);
  });

  it("lists the excluded steps after the reconciler steps, in the order the steps were read", () => {
    const section = stepAccounting(linesOf(reconcileStepAccounting([stepAccountingCi])));
    expect(section.indexOf("Reconciler:")).toBeGreaterThanOrEqual(0);
    expect(section.indexOf(label)).toBeGreaterThan(section.indexOf("Reconciler:"));
    expect(excludedList(section, 5)).toStrictEqual([
      "Excluded:",
      "- ci.yml:ci:Checkout — excluded: the target names this step a non-check.",
      "- ci.yml:ci:Install — excluded: the target names this step a non-check.",
      "- ci.yml:ci:Build — excluded: the target names this step a non-check.",
      "",
    ]);
  });

  it("lists no excluded step, and prints no Excluded label, for a target that names no step a non-check", () => {
    const lines = reportLines();
    expect(stepAccounting(lines).length).toBeGreaterThan(0);
    expect(lines).not.toContain(label);
    expect(lines.some((line) => line.includes("— excluded:") || line.includes("matches no step"))).toBe(false);
  });
});
