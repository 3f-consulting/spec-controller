import { describe, it, expect } from "vitest";
import { evidenceReconciliationFromSources } from "../assemble/evidenceReconciliationFromSources.js";
import type { EvidenceObservation } from "../model.js";
import { parsedFeatures } from "../parse/parsedFeatures.test-utils.js";
import { parsedWorkflows } from "../parse/parsedWorkflows.test-utils.js";
import { cells, linesOf, sectionUnder } from "./renderedSection.test-utils.js";

const feature = `Feature: fixture

  @unit @SCN-FIX-001
  Scenario: a behaviour proved by a unit test

  @e2e @SCN-FIX-002
  Scenario: a behaviour proved end to end

  @performance @SCN-FIX-003
  Scenario: a behaviour proved under load
`;

const ci = `name: fixture CI
jobs:
  quality:
    steps:
      - name: Unit tests
        run: pnpm test
      - name: Cucumber
        run: pnpm cucumber
`;

const behaviouralObservations: EvidenceObservation[] = [
  { qualityCheck: "unit", scnId: "SCN-FIX-001", status: "passed" },
  { qualityCheck: "e2e", scnId: "SCN-FIX-002", status: "passed" },
  { qualityCheck: "performance", scnId: "SCN-FIX-003", status: "passed" },
];

function rowsByCheck(runners: Record<string, string | null>): Map<string, string[]> {
  const reconciliation = evidenceReconciliationFromSources({
    features: parsedFeatures([feature]),
    packageJson: { scripts: { test: "vitest run", cucumber: "cucumber-js" }, specController: { runners } },
    ciWorkflows: parsedWorkflows([ci]),
    behaviouralObservations,
    deferralTags: [],
  });
  const lines = sectionUnder("### Evidence observations")(linesOf(reconciliation));
  const rows = lines.filter((line) => line.startsWith("|")).map(cells).slice(2);
  return new Map(rows.map((row) => [row[0] ?? "", row]));
}

describe("[SCN-RPT-051] a quality check with evidence observations and no runner the target declares says in its runner cell that the target names none, or that it has not said", () => {
  it("says in the runner cell of a quality check the target names null that the target names none, with a blank CI step cell", () => {
    const rows = rowsByCheck({ unit: "vitest", performance: null });
    expect(rows.get("performance")).toStrictEqual(["performance", "1", "no runner: the target names none.", ""]);
  });

  it("says in the runner cell of a quality check the target omits that the target has not said, with a blank CI step cell", () => {
    const rows = rowsByCheck({ unit: "vitest", performance: null });
    expect(rows.get("e2e")).toStrictEqual(["e2e", "1", "unnamed: the target has not said.", ""]);
  });

  it("names the declared runner, not a note, on a quality check the target names", () => {
    const rows = rowsByCheck({ unit: "vitest", performance: null });
    expect(rows.get("unit")).toStrictEqual(["unit", "1", "vitest", "Unit tests"]);
  });

  it("leaves both cells blank on a quality check with no evidence observations, whatever the target declares", () => {
    expect(rowsByCheck({ unit: "vitest", performance: null }).get("integration")).toStrictEqual([
      "integration",
      "0",
      "",
      "",
    ]);
    expect(rowsByCheck({ unit: "vitest", integration: null }).get("integration")).toStrictEqual([
      "integration",
      "0",
      "",
      "",
    ]);
  });
});
