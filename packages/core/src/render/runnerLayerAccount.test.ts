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
  { qualityCheckKind: "unit", scnId: "SCN-FIX-001", status: "passed" },
  { qualityCheckKind: "e2e", scnId: "SCN-FIX-002", status: "passed" },
  { qualityCheckKind: "performance", scnId: "SCN-FIX-003", status: "passed" },
];

const NO_RUNNER =
  "no runner: the target declares this layer has none, by setting it to `null` under `specController.runners` in its `package.json`.";
const UNNAMED =
  "unnamed: the target leaves this layer's runner undeclared: `specController.runners` in its `package.json` is missing or not a block, leaves the layer out, or gives it a value that is neither a string nor `null`. A string there names the layer's runner.";

function rowsOf(specController?: { runners?: unknown }): Map<string, string[]> {
  const reconciliation = evidenceReconciliationFromSources({
    features: parsedFeatures([feature]),
    packageJson: {
      scripts: { test: "vitest run", cucumber: "cucumber-js" },
      ...(specController === undefined ? {} : { specController }),
    },
    ciWorkflows: parsedWorkflows([ci]),
    behaviouralObservations,
    deferralTags: [],
  });
  const lines = sectionUnder("### Evidence observations")(linesOf(reconciliation));
  const rows = lines
    .filter((line) => line.startsWith("|"))
    .map(cells)
    .slice(2);
  return new Map(rows.map((row) => [row[0] ?? "", row]));
}

function rowsByCheck(runners: unknown): Map<string, string[]> {
  return rowsOf({ runners });
}

describe("[SCN-RPT-051] a layer the target gives no runner's name says in its runner cell whether the target declared that the layer has none or left its runner undeclared, and where a target names a layer's runner, whatever its count", () => {
  it("says in the runner cell of a layer the target sets to null that the target declares it has none, and where, with a blank CI step cell", () => {
    const rows = rowsByCheck({ unit: "vitest", performance: null });
    expect(rows.get("performance")).toStrictEqual(["performance", "1", NO_RUNNER, ""]);
  });

  it("says at count 0 that the target declares a layer it sets to null has none", () => {
    expect(rowsByCheck({ unit: "vitest", integration: null }).get("integration")).toStrictEqual([
      "integration",
      "0",
      NO_RUNNER,
      "",
    ]);
  });

  it("names the declared runner, not a note, on a layer the target names", () => {
    const rows = rowsByCheck({ unit: "vitest", performance: null });
    expect(rows.get("unit")?.slice(0, 3)).toStrictEqual(["unit", "1", "vitest"]);
  });

  const leftOut = { runners: { unit: "vitest", performance: null } };
  it.each<[string, { runners?: unknown } | undefined, string, string]>([
    ["leaves out a layer with evidence", leftOut, "e2e", "1"],
    ["leaves out a layer at count 0", leftOut, "integration", "0"],
    ["has no specController block, as with no package.json", undefined, "unit", "1"],
    ["has no runners block", {}, "unit", "1"],
    ["has a runners block holding only a key that is not a layer", { runners: { lint: "eslint" } }, "unit", "1"],
    ["gives a layer a value of the wrong kind", { runners: { unit: 5 } }, "unit", "1"],
    ["has a runners block that is a string", { runners: "vitest" }, "unit", "1"],
    ["has a runners block that is a list", { runners: ["vitest"] }, "unit", "1"],
  ])(
    "says the layer's runner is undeclared, where a string names it, with a blank CI step cell, when the target %s",
    (_target, specController, layer, count) => {
      expect(rowsOf(specController).get(layer)).toStrictEqual([layer, count, UNNAMED, ""]);
    }
  );
});
