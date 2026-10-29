import { describe, it, expect } from "vitest";
import { observationsOf, reconcilingItemsOf } from "@3f-consulting/spec-controller-core/internal";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { runReconcile } from "./corpusReading.test-utils.js";
import { resolveTargetRoot } from "../run-management/resolveRunInputs.js";
import { temporaryDirectory } from "../temporaryDirectory.test-utils.js";

function unconfiguredTarget(tag: string): string {
  const root = temporaryDirectory(`scn-pnd-019-${process.pid}-`);
  writeFileSync(join(root, "package.json"), JSON.stringify({ name: "unconfigured-target", scripts: {} }));
  mkdirSync(join(root, "features"));
  writeFileSync(
    join(root, "features", "deferral.feature"),
    "@DFR\nFeature: deferral\n\n" +
      `  @${tag} @unit @SCN-DFR-001\n  Scenario: the deferred scenario\n    Given a thing\n\n` +
      "  @unit @SCN-DFR-002\n  Scenario: its untagged twin\n    Given a thing\n"
  );
  return root;
}

describe("[SCN-CLI-088] a community deferral tag raises the Pending Item, with no deferralTags configured", () => {
  it.each(["wip", "ignore", "skip", "todo", "pending"])(
    "@%s defers its scenario to a Pending Item, while its untagged twin is missing",
    (tag) => {
      const root = unconfiguredTarget(tag);
      const balance = runReconcile({
        features: join(root, "features"),
        packageJson: join(root, "package.json"),
        ci: root,
      }, resolveTargetRoot({ features: join(root, "features") }));
      const scenario = (scnId: string) => balance.ledger.claimReconciliations.find((s) => s.claim === scnId);

      expect(scenario("SCN-DFR-001")?.pendingItems).toEqual([{ qualityCheck: "unit" }]);
      expect(reconcilingItemsOf(scenario("SCN-DFR-001")!)).toEqual([]);
      expect(scenario("SCN-DFR-002")?.pendingItems).toEqual([]);
      expect(reconcilingItemsOf(scenario("SCN-DFR-002")!)).toEqual([
        { qualityCheck: "unit", outcome: "missing", evidenceObligation: { qualityCheck: "unit" } },
      ]);
    }
  );

  it.each(["wip", "ignore", "skip", "todo", "pending"])(
    "@%s defers its scenario to a Pending Item when Cucumber reports it pending, while its twin's evidence observation is read from the same report",
    (tag) => {
      const root = cucumberReportingTarget(tag);
      const balance = runReconcile({
        features: join(root, "features"),
        packageJson: join(root, "package.json"),
        ci: root,
        cucumber: join(root, "cucumber.json"),
      }, resolveTargetRoot({ features: join(root, "features") }));
      const scenario = (scnId: string) => balance.ledger.claimReconciliations.find((s) => s.claim === scnId);

      expect(scenario("SCN-DFR-001")?.pendingItems).toEqual([{ qualityCheck: "integration" }]);
      expect(reconcilingItemsOf(scenario("SCN-DFR-001")!)).toEqual([]);
      expect(observationsOf(scenario("SCN-DFR-001")!)).toEqual([]);
      expect(scenario("SCN-DFR-002")?.pendingItems).toEqual([]);
      expect(reconcilingItemsOf(scenario("SCN-DFR-002")!)).toEqual([]);
      expect(scenario("SCN-DFR-002")?.qualityCheckReconciliations).toEqual([
        {
          qualityCheck: "integration",
          evidenceObligation: { qualityCheck: "integration" },
          evidenceObservations: [{
            qualityCheck: "integration",
            scnId: "SCN-DFR-002",
            status: "passed",
            locator: "features/deferral.feature",
            testName: "its untagged twin",
            outcome: "satisfied",
          }],
        },
      ]);
    }
  );
});

function cucumberReportingTarget(tag: string): string {
  const root = temporaryDirectory(`scn-pnd-019-${process.pid}-`);
  writeFileSync(join(root, "package.json"), JSON.stringify({ name: "unconfigured-target", scripts: {} }));
  mkdirSync(join(root, "features"));
  writeFileSync(
    join(root, "features", "deferral.feature"),
    "@DFR\nFeature: deferral\n\n" +
      `  @${tag} @integration @SCN-DFR-001\n  Scenario: the deferred scenario\n    Given a thing\n\n` +
      "  @integration @SCN-DFR-002\n  Scenario: its untagged twin\n    Given a thing\n"
  );
  const step = (line: number, status: string) => ({
    arguments: [],
    keyword: "Given ",
    line,
    name: "a thing",
    match: { location: "tests/steps/deferral.steps.ts:3" },
    result: status === "pending" ? { status, duration: 0 } : { status, duration: 1_200_000 },
  });
  const scenarioOf = (id: string, name: string, line: number, tags: string[], status: string) => ({
    description: "",
    id: `deferral;${id}`,
    keyword: "Scenario",
    line,
    name,
    steps: [step(line + 1, status)],
    tags: [{ name: "@DFR", line: 1 }, ...tags.map((t) => ({ name: t, line: line - 1 }))],
    type: "scenario",
  });
  writeFileSync(
    join(root, "cucumber.json"),
    JSON.stringify([
      {
        description: "",
        elements: [
          scenarioOf("the-deferred-scenario", "the deferred scenario", 5, [`@${tag}`, "@integration", "@SCN-DFR-001"], "pending"),
          scenarioOf("its-untagged-twin", "its untagged twin", 9, ["@integration", "@SCN-DFR-002"], "passed"),
        ],
        id: "deferral",
        line: 2,
        keyword: "Feature",
        name: "deferral",
        tags: [{ name: "@DFR", line: 1 }],
        uri: "features/deferral.feature",
      },
    ])
  );
  return root;
}
