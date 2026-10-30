import { describe, it, expect } from "vitest";
import { evidenceReconciliationFromSources } from "../assemble/evidenceReconciliationFromSources.js";
import type { EvidenceObservation } from "../model.js";
import type { EvidenceReconciliation } from "../assemble/renderInput.js";
import type { QualityCheckObservations } from "../domain/ledger.js";
import { parsedFeatures } from "../parse/parsedFeatures.test-utils.js";
import { parsedWorkflows } from "../parse/parsedWorkflows.test-utils.js";
import { cells, linesOf, sectionUnder } from "./renderedSection.test-utils.js";

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
  { qualityCheck: "unit", scnId: "SCN-FIX-001", status: "passed" },
  { qualityCheck: "unit", scnId: "SCN-FIX-001", status: "passed" },
  { qualityCheck: "integration", scnId: "SCN-FIX-002", status: "passed" },
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

function tableRows(workflow: string = ci, observations: EvidenceObservation[] = behaviouralObservations): string[][] {
  const reconciliation = evidenceReconciliationFromSources({
    features: parsedFeatures([feature]),
    packageJson,
    ciWorkflows: parsedWorkflows([workflow]),
    behaviouralObservations: observations,
    deferralTags: [],
  });
  const lines = sectionUnder("### Evidence observations")(linesOf(reconciliation));
  return lines.filter((line) => line.startsWith("|")).map(cells);
}

function fitnessRowWith(fitness: QualityCheckObservations): string[] | undefined {
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
        byQualityCheck: observations.byQualityCheck.map((entry) => (entry.qualityCheck === "fitness" ? fitness : entry)),
      },
    },
  };
  const lines = sectionUnder("### Evidence observations")(linesOf(withFitness));
  return lines
    .filter((line) => line.startsWith("|"))
    .map(cells)
    .find(([check]) => check === "fitness");
}

describe("[SCN-RPT-074] each quality check's row names its runner and the CI steps that run it, whatever its count, says when no step read runs a declared runner, and the fitness row counts the steps that run its fitness functions, each named on its row of Claim Reconciliations", () => {
  it("heads the table with the quality check, its count, its runner and its CI step", () => {
    const [header, separator] = tableRows();
    expect(header).toStrictEqual(["Quality-check", "Evidence observations", "Runner", "CI step"]);
    expect(separator).toStrictEqual(["---", "---", "---", "---"]);
  });

  it("names on each behavioural row with evidence observations its declared runner and every step that runs it, in step order", () => {
    const rows = tableRows().slice(2);
    expect(rows.find(([check]) => check === "unit")).toStrictEqual(["unit", "2", "vitest", "Unit tests, Unit tests again"]);
    expect(rows.find(([check]) => check === "integration")).toStrictEqual([
      "integration",
      "1",
      "cucumber-js",
      "Cucumber",
    ]);
  });

  it("counts in the fitness row the steps that run its fitness functions, each named on its row of Claim Reconciliations", () => {
    const fitness = fitnessRowWith({ qualityCheck: "fitness", count: 3, ciSteps: ["Lint", "Typecheck"] });
    expect(fitness).toStrictEqual([
      "fitness",
      "3",
      "each fitness function's check step",
      "2 step(s), each named on its fitness function's row of Claim Reconciliations.",
    ]);
  });

  it("leaves the CI step cell blank on a fitness row with evidence observations and no steps", () => {
    const fitness = fitnessRowWith({ qualityCheck: "fitness", count: 2 });
    expect(fitness).toStrictEqual(["fitness", "2", "each fitness function's check step", ""]);
  });

  it("names the declared runner and the step that runs it on a quality check with no evidence observations", () => {
    const rows = tableRows().slice(2);
    expect(rows.find(([check]) => check === "e2e")).toStrictEqual(["e2e", "0", "playwright", "E2e"]);
  });

  it("says no step read runs a declared runner that no step runs, with no evidence observations", () => {
    const rows = tableRows().slice(2);
    expect(rows.find(([check]) => check === "performance")).toStrictEqual([
      "performance",
      "0",
      "k6",
      "no step read runs it.",
    ]);
  });

  it("says no step read runs a declared runner that no step runs, with evidence observations", () => {
    const withPerformance: EvidenceObservation[] = [
      ...behaviouralObservations,
      { qualityCheck: "performance", scnId: "SCN-FIX-001", status: "passed" },
    ];
    const rows = tableRows(ci, withPerformance).slice(2);
    expect(rows.find(([check]) => check === "performance")).toStrictEqual([
      "performance",
      "1",
      "k6",
      "no step read runs it.",
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

function rawTableRows(workflow: string, runners: Record<string, string>): string[] {
  const reconciliation = evidenceReconciliationFromSources({
    features: parsedFeatures([feature]),
    packageJson: { scripts: packageJson.scripts, specController: { runners } },
    ciWorkflows: parsedWorkflows([workflow]),
    behaviouralObservations,
    deferralTags: [],
  });
  return sectionUnder("### Evidence observations")(linesOf(reconciliation)).filter((line) => line.startsWith("|"));
}

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

describe("[SCN-RPT-079] every cell of the evidence observations table holds its text whole, a runner or a step name holding a pipe included", () => {
  const declared = { unit: "vitest", integration: "cucumber-js", e2e: "playwright", performance: "k6 | cloud" };

  it("keeps a step name holding a pipe in its CI step cell, the row keeping four cells", () => {
    const e2e = rawTableRows(pipeStepCi, declared).find((row) => row.startsWith("| e2e "));
    expect(e2e).toBeDefined();
    expect(unescapedCells(e2e ?? "")).toStrictEqual(["e2e", "0", "playwright", "E2e | headless"]);
  });

  it("keeps a declared runner holding a pipe in its runner cell, the row keeping four cells", () => {
    const performance = rawTableRows(pipeStepCi, declared).find((row) => row.startsWith("| performance "));
    expect(performance).toBeDefined();
    expect(unescapedCells(performance ?? "")).toStrictEqual([
      "performance",
      "0",
      "k6 | cloud",
      "no step read runs it.",
    ]);
  });
});
