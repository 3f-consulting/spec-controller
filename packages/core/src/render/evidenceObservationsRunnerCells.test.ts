import { describe, it, expect } from "vitest";
import { evidenceReconciliationFromSources } from "../assemble/evidenceReconciliationFromSources.js";
import type { EvidenceObservation } from "../model.js";
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

function tableRows(workflow: string = ci): string[][] {
  const reconciliation = evidenceReconciliationFromSources({
    features: parsedFeatures([feature]),
    packageJson,
    ciWorkflows: parsedWorkflows([workflow]),
    behaviouralObservations,
    deferralTags: [],
  });
  const lines = sectionUnder("### Evidence observations")(linesOf(reconciliation));
  return lines.filter((line) => line.startsWith("|")).map(cells);
}

describe("[SCN-RPT-074] each quality check's row names its runner and the CI steps that run it, the fitness row says what runs a fitness function, and a quality check with no evidence observations has blank runner and CI step cells", () => {
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

  it("says in the fitness row what runs a fitness function, naming no step", () => {
    const fitness = tableRows().at(-1);
    expect(fitness?.[0]).toBe("fitness");
    expect(Number(fitness?.[1])).toBeGreaterThan(0);
    expect(fitness?.slice(2)).toStrictEqual(["each fitness function's check step", "the step whose id is its @SCN"]);
  });

  it("leaves both cells blank on a quality check with no evidence observations, though the target declares its runner and a step runs it", () => {
    const rows = tableRows().slice(2);
    expect(rows.find(([check]) => check === "e2e")).toStrictEqual(["e2e", "0", "", ""]);
    expect(rows.find(([check]) => check === "performance")).toStrictEqual(["performance", "0", "", ""]);
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
