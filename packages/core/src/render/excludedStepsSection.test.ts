import { describe, it, expect } from "vitest";
import { evidenceReconciliationFromSources } from "../assemble/evidenceReconciliationFromSources.js";
import { CORE_MESSAGES, CoreMessage } from "./messages.js";
import { renderMarkdown } from "../assemble/composers.js";
import { sectionCtx as ctx } from "./runContext.test-utils.js";
import {
  endOfStepAccountingTable as endOfTable,
  linesOf,
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

function reportLines(notChecks?: readonly string[], ciSource: string = ci, files: readonly string[] = ["ci.yml"]): string[] {
  const specController = notChecks === undefined ? {} : { notChecks };
  const packageJson = { scripts, specController } as Parameters<
    typeof evidenceReconciliationFromSources
  >[0]["packageJson"];
  const reconciliation = evidenceReconciliationFromSources({
    features: parsedFeatures([feature]),
    packageJson,
    ciWorkflows: parsedWorkflows(files.map(() => ciSource), files),
    behaviouralObservations: [],
    deferralTags: [],
  });
  return renderMarkdown(reconciliation, ctx, publishedExitCodeOf).split("\n");
}

const label = "Excluded:";

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
    expect(section.some((line) => line.includes(CORE_MESSAGES[CoreMessage.NotChecksEntryMatchesNoStep]("", "\0").replace(/^[^\0]*\0/, "")))).toBe(false);
  });

  it("prints no Excluded label when the target's only entry matches no step", () => {
    const section = stepAccounting(reportLines(["ci.yml:quality:Lint"]));
    expect(section.length).toBeGreaterThan(0);
    expect(section).not.toContain(label);
    expect(section.some((line) => line.includes(CORE_MESSAGES[CoreMessage.NotChecksEntryMatchesNoStep]("", "\0").replace(/^[^\0]*\0/, "")))).toBe(false);
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
    expect(lines.some((line) => line.includes("— excluded:") || line.includes(CORE_MESSAGES[CoreMessage.NotChecksEntryMatchesNoStep]("", "\0").replace(/^[^\0]*\0/, "")))).toBe(false);
  });
});

describe("[SCN-RPT-089] a notChecks entry naming a workflow the run did not read is listed beneath the step accounting's table as not applied, beside the workflows the run read", () => {
  it.each([
    {
      files: ["ci.yml"],
      notChecks: ["ci.yml:quality:Types", "ci.yaml:quality:Deploy", ".github/workflows/ci.yml:quality:Deploy"],
      notApplied: ["ci.yaml:quality:Deploy", ".github/workflows/ci.yml:quality:Deploy"],
    },
    {
      files: ["ci.yml", "ci.yml.bak"],
      notChecks: ["ci.yml.bak:quality:Types", "ci.yml.old:quality:Types"],
      notApplied: ["ci.yml.old:quality:Types"],
    },
  ])("lists $notApplied, reading $files, as not applied", ({ files, notChecks, notApplied }) => {
    const lines = reportLines(notChecks, ci, files);
    const section = stepAccounting(lines);
    const notAppliedLabel = CORE_MESSAGES[CoreMessage.StepAccountingNotAppliedLabel](
      "`specController.notChecks`",
      files.map((file) => `\`${file}\``).join(", ")
    );
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
});
