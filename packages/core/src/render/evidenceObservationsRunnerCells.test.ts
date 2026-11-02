import { describe, it, expect } from "vitest";
import { evidenceReconciliationFromSources } from "../assemble/evidenceReconciliationFromSources.js";
import type { EvidenceObservation } from "../model.js";
import type { EvidenceReconciliation } from "../assemble/renderInput.js";
import type { QualityCheckKindObservations } from "../domain/ledger.js";
import { parsedFeatures } from "../parse/parsedFeatures.test-utils.js";
import { parsedWorkflows } from "../parse/parsedWorkflows.test-utils.js";
import { cells, linesOf, sectionUnder } from "./renderedSection.test-utils.js";
import { CORE_MESSAGES, CoreMessage } from "./messages.js";

const feature = `Feature: fixture

  @unit @SCN-FIX-001
  Scenario: a behaviour proved by a unit test

  @integration @SCN-FIX-002
  Scenario: a behaviour proved by an integration test
`;

const ci = `name: fixture CI
jobs:
  quality:
    steps:
      - name: Unit tests
        run: pnpm test
      - name: Cucumber
        run: pnpm cucumber
      - name: E2e
        run: pnpm e2e
      - name: Lint
        run: pnpm lint
  again:
    steps:
      - name: Unit tests again
        run: pnpm test
`;

const packageJson = {
  scripts: { test: "vitest run", cucumber: "cucumber-js", e2e: "playwright test", lint: "eslint ." },
  specController: { runners: { unit: "vitest", integration: "cucumber-js", e2e: "playwright", performance: "k6" } },
};

const behaviouralObservations: EvidenceObservation[] = [
  { qualityCheckKind: "unit", scnId: "SCN-FIX-001", status: "passed" },
  { qualityCheckKind: "unit", scnId: "SCN-FIX-001", status: "passed" },
  { qualityCheckKind: "integration", scnId: "SCN-FIX-002", status: "passed" },
];

const runnersOnlyCi = `name: fixture CI
jobs:
  quality:
    steps:
      - name: Unit tests
        run: pnpm test
      - name: Cucumber
        run: pnpm cucumber
`;

const nonCheckRunnerCi = `name: fixture CI
jobs:
  quality:
    steps:
      - name: Unit tests not a check
        run: pnpm test
      - name: Cucumber
        run: pnpm cucumber
`;

function assembled(workflow: string = ci, observations: EvidenceObservation[] = behaviouralObservations): EvidenceReconciliation {
  return evidenceReconciliationFromSources({
    features: parsedFeatures([feature]),
    packageJson,
    ciWorkflows: parsedWorkflows([workflow]),
    behaviouralObservations: observations,
    deferralTags: [],
  });
}

function rowsOf(reconciliation: EvidenceReconciliation): string[][] {
  const lines = sectionUnder("### Evidence observations")(linesOf(reconciliation));
  return lines.filter((line) => line.startsWith("|")).map(cells);
}

function tableRows(workflow: string = ci, observations: EvidenceObservation[] = behaviouralObservations): string[][] {
  return rowsOf(assembled(workflow, observations));
}

function summaryCiSteps(reconciliation: EvidenceReconciliation, qualityCheckKind: string): readonly string[] {
  const entry = reconciliation.summary.evidenceObservations?.byQualityCheckKind.find(
    (observed) => observed.qualityCheckKind === qualityCheckKind
  );
  return entry?.ciSteps ?? [];
}

function fitnessRowWith(fitness: QualityCheckKindObservations): string[] | undefined {
  const reconciliation = evidenceReconciliationFromSources({
    features: parsedFeatures([feature]),
    packageJson,
    ciWorkflows: parsedWorkflows([ci]),
    behaviouralObservations,
    deferralTags: [],
  });
  const observations = reconciliation.summary.evidenceObservations;
  expect(observations).toBeDefined();
  const withFitness: EvidenceReconciliation = {
    ...reconciliation,
    summary: {
      ...reconciliation.summary,
      evidenceObservations: observations && {
        ...observations,
        byQualityCheckKind: observations.byQualityCheckKind.map((entry) => (entry.qualityCheckKind === "fitness" ? fitness : entry)),
      },
    },
  };
  const lines = sectionUnder("### Evidence observations")(linesOf(withFitness));
  return lines
    .filter((line) => line.startsWith("|"))
    .map(cells)
    .find(([check]) => check === "fitness");
}

describe("[SCN-RPT-074] each kind of quality check's row names its runner and the CI steps the summary names for it, whatever its count, says when no step counted as a runner runs a declared runner, and the fitness row counts the steps that run its fitness functions, each named on its row of Claim Reconciliations", () => {
  it("heads the table with the quality check, its count, its runner and its CI step", () => {
    const [header, separator] = tableRows();
    expect(header).toStrictEqual(["Quality-check", "Evidence observations", "Runner", "CI step"]);
    expect(separator).toStrictEqual(["---", "---", "---", "---"]);
  });

  it("names on each behavioural row with evidence observations its declared runner and the steps the summary names for it", () => {
    const reconciliation = assembled();
    const rows = rowsOf(reconciliation).slice(2);
    const unitSteps = summaryCiSteps(reconciliation, "unit");
    const integrationSteps = summaryCiSteps(reconciliation, "integration");
    expect(unitSteps).toHaveLength(2);
    expect(integrationSteps).toHaveLength(1);
    expect(rows.find(([check]) => check === "unit")).toStrictEqual(["unit", "2", "vitest", unitSteps.join(", ")]);
    expect(rows.find(([check]) => check === "integration")).toStrictEqual([
      "integration",
      "1",
      "cucumber-js",
      integrationSteps.join(", "),
    ]);
  });

  it("counts in the fitness row the steps that run its fitness functions, each named on its row of Claim Reconciliations", () => {
    const fitness = fitnessRowWith({ qualityCheckKind: "fitness", count: 3, ciSteps: ["Lint", "Typecheck"] });
    expect(fitness).toStrictEqual([
      "fitness",
      "3",
      "each fitness function's check step",
      "2 step(s), each named on its fitness function's row of Claim Reconciliations.",
    ]);
  });

  it("leaves the CI step cell blank on a fitness row with evidence observations and no steps", () => {
    const fitness = fitnessRowWith({ qualityCheckKind: "fitness", count: 2 });
    expect(fitness).toStrictEqual(["fitness", "2", "each fitness function's check step", ""]);
  });

  it("names the declared runner and the step that runs it on a quality check with no evidence observations", () => {
    const reconciliation = assembled();
    const rows = rowsOf(reconciliation).slice(2);
    const e2eSteps = summaryCiSteps(reconciliation, "e2e");
    expect(e2eSteps).toHaveLength(1);
    expect(rows.find(([check]) => check === "e2e")).toStrictEqual(["e2e", "0", "playwright", e2eSteps.join(", ")]);
  });

  it("says no step counted as its runner runs a declared runner that no step runs, with no evidence observations", () => {
    const rows = tableRows().slice(2);
    expect(rows.find(([check]) => check === "performance")).toStrictEqual([
      "performance",
      "0",
      "k6",
      "no step counted as its runner runs it.",
    ]);
  });

  it("says no step counted as its runner runs a declared runner that no step runs, with evidence observations", () => {
    const withPerformance: EvidenceObservation[] = [
      ...behaviouralObservations,
      { qualityCheckKind: "performance", scnId: "SCN-FIX-001", status: "passed" },
    ];
    const rows = tableRows(ci, withPerformance).slice(2);
    expect(rows.find(([check]) => check === "performance")).toStrictEqual([
      "performance",
      "1",
      "k6",
      "no step counted as its runner runs it.",
    ]);
  });

  it("says no step counted as its runner runs a declared runner that only a step named a non-check runs", () => {
    const reconciliation = evidenceReconciliationFromSources({
      features: parsedFeatures([feature]),
      packageJson: { ...packageJson, specController: { ...packageJson.specController, notChecks: ["workflow-0.yml:quality:Unit tests not a check"] } },
      ciWorkflows: parsedWorkflows([nonCheckRunnerCi]),
      behaviouralObservations,
      deferralTags: [],
    });
    expect(rowsOf(reconciliation).slice(2).find(([check]) => check === "unit")).toStrictEqual([
      "unit",
      "2",
      "vitest",
      "no step counted as its runner runs it.",
    ]);
  });

  it("leaves both cells blank on the fitness row when no fitness function ran", () => {
    expect(tableRows(runnersOnlyCi).at(-1)).toStrictEqual(["fitness", "0", "", ""]);
  });

  it("keeps a row per quality check, fitness last", () => {
    expect(tableRows().slice(2).map(([check]) => check)).toStrictEqual([
      "unit",
      "integration",
      "e2e",
      "performance",
      "fitness",
    ]);
  });
});

const unescapedCells = (row: string): string[] =>
  row
    .split(/(?<!\\)\|/)
    .slice(1, -1)
    .map((cell) => cell.trim().replace(/\\\|/g, "|"));

function assembledWith(workflow: string, runners: Record<string, string>): EvidenceReconciliation {
  return evidenceReconciliationFromSources({
    features: parsedFeatures([feature]),
    packageJson: { scripts: packageJson.scripts, specController: { runners } },
    ciWorkflows: parsedWorkflows([workflow]),
    behaviouralObservations,
    deferralTags: [],
  });
}

const rawRowsOf = (reconciliation: EvidenceReconciliation): string[] =>
  sectionUnder("### Evidence observations")(linesOf(reconciliation)).filter((line) => line.startsWith("|"));

const pipeStepCi = `name: fixture CI
jobs:
  quality:
    steps:
      - name: Unit tests
        run: pnpm test
      - name: Cucumber
        run: pnpm cucumber
      - name: "E2e | headless"
        run: pnpm e2e
`;

const separatorStepCi = `name: fixture CI
jobs:
  quality:
    steps:
      - name: Unit tests
        run: pnpm test
      - name: Pack both packages, once
        run: pnpm test
      - name: Cucumber
        run: pnpm cucumber
      - name: 'E2e, headless \\ cloud | ci'
        run: pnpm e2e
`;

describe("[SCN-RPT-079] every cell of the evidence observations table holds its text whole, a runner or a step name holding a pipe included", () => {
  const declared = { unit: "vitest", integration: "cucumber-js", e2e: "playwright", performance: "k6 | cloud" };

  it("keeps a step name holding a pipe in its CI step cell, the row keeping four cells", () => {
    const reconciliation = assembledWith(pipeStepCi, declared);
    const e2eCell = summaryCiSteps(reconciliation, "e2e").join(", ");
    const e2e = rawRowsOf(reconciliation).find((row) => row.startsWith("| e2e "));
    expect(e2e).toContain("E2e \\| headless");
    expect(unescapedCells(e2e ?? "")).toStrictEqual(["e2e", "0", "playwright", e2eCell]);
  });

  it("quotes a step name holding a row separator in its code span, beside a step that holds none", () => {
    const unit = rawRowsOf(assembledWith(separatorStepCi, declared)).find((row) => row.startsWith("| unit "));
    expect(unit).toBe("| unit | 2 | vitest | workflow-0.yml:quality:Unit tests, `workflow-0.yml:quality:Pack both packages, once` |");
  });

  it("keeps the pipe escaped and a backslash as written inside the code span of a step name holding a row separator", () => {
    const e2e = rawRowsOf(assembledWith(separatorStepCi, declared)).find((row) => row.startsWith("| e2e "));
    expect(e2e).toBe("| e2e | 0 | playwright | `workflow-0.yml:quality:E2e, headless \\ cloud \\| ci` |");
  });

  it("keeps a declared runner holding a pipe in its runner cell, the row keeping four cells", () => {
    const performance = rawRowsOf(assembledWith(pipeStepCi, declared)).find((row) => row.startsWith("| performance "));
    expect(performance).toBeDefined();
    expect(unescapedCells(performance ?? "")).toStrictEqual([
      "performance",
      "0",
      "k6 | cloud",
      CORE_MESSAGES[CoreMessage.NoStepCountedAsItsRunnerRunsIt],
    ]);
  });
});
