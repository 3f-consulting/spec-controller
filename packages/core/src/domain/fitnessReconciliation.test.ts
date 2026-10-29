import { isDeepStrictEqual } from "node:util";
import { describe, it, expect } from "vitest";
import { linesOf, obligationsOf, observationsOf, reconcilingItemsOf } from "./claimReconciliation.js";
import { reconcile } from "./evidenceReconciliation.js";
import type { ScriptCitation } from "../parse/fitnessCitations.js";
import { parseScenarios } from "../parse/scenarioReaders.test-utils.js";
import { runningFitnessFunctions } from "../parse/runningFitnessFunctions.js";
import type { PackageJsonScripts } from "../parse/checkScriptsRunInCI.js";
import type { EvidenceObservation } from "../model.js";
import { parsedWorkflows } from "../parse/parsedWorkflows.test-utils.js";

const NO_RUNNERS: Readonly<Record<string, string | null>> = {};

const REAL_GUARD = "lint:feature-codes";

function wiringFor(script: string): { ciSource: string; packageJson: PackageJsonScripts } {
  return {
    ciSource: ["name: CI", "jobs:", "  ci:", "    steps:", `      - run: pnpm ${script}`].join("\n"),
    packageJson: { scripts: { [script]: `tsx ${script}.ts` } },
  };
}

function severedWiringFor(script: string): { ciSource: string; packageJson: PackageJsonScripts } {
  return {
    ciSource: [
      "name: CI",
      "jobs:",
      "  ci:",
      "    steps:",
      `      - run: pnpm ${script}`,
      "        continue-on-error: true",
    ].join("\n"),
    packageJson: { scripts: { [script]: `tsx ${script}.ts` } },
  };
}

describe("[SCN-LNT-009] a fitness evidence observation citing an @SCN no scenario carries posts to a phantom claim's row", () => {
  it("mints the phantom claim's row for the cited @SCN, posts the run's one evidence observation there naming the check, and holds it out-of-balance", () => {
    const { ciSource, packageJson } = wiringFor(REAL_GUARD);

    const citedScn = (script: string): ScriptCitation | null =>
      script === REAL_GUARD ? { scnId: "SCN-AAA-001" } : null;

    const corpusAtReconcile = [
      "@LNT",
      "Feature: fixture",
      "  Rule: a fixture rule",
      "    @fitness @SCN-AAA-002",
      "    Scenario: the corpus keeps its feature codes inside the threshold",
    ].join("\n");

    const evidenceObservations = runningFitnessFunctions(
      parsedWorkflows([ciSource]),
      packageJson,
      NO_RUNNERS,
      citedScn
    );
    const observation = evidenceObservations.find((o) => o.fitnessFunction === REAL_GUARD);
    expect(observation?.scnId).toBe("SCN-AAA-001");

    const scenarios = parseScenarios(
      corpusAtReconcile);
    expect(scenarios.map((s) => s.scnId)).toEqual(["SCN-AAA-002"]);

    const balance = reconcile(scenarios, evidenceObservations);

    const phantomClaimRow = balance.claimReconciliations.find((s) => s.kind === "phantom-claim");
    expect(phantomClaimRow?.claim).toBe("SCN-AAA-001");
    expect(phantomClaimRow?.verdict).toBe("out-of-balance");
    expect(obligationsOf(phantomClaimRow!)).toEqual([]);
    expect(observationsOf(phantomClaimRow!)).toEqual([{ ...observation, outcome: "cites-unknown-scenario" }]);
    expect(phantomClaimRow?.qualityCheckReconciliations).toEqual([
      {
        qualityCheck: "fitness",
        evidenceObservations: [{ ...observation, outcome: "cites-unknown-scenario" }],
      },
    ]);
    expect(reconcilingItemsOf(phantomClaimRow!)).toEqual(phantomClaimRow?.qualityCheckReconciliations.flatMap(linesOf));
    expect(phantomClaimRow?.pendingItems).toEqual([]);

    expect(
      balance.claimReconciliations
        .filter((row) => observationsOf(row).some(({ outcome: _outcome, ...posted }) => isDeepStrictEqual(posted, observation)))
        .map((row) => row.claim)
    ).toEqual(["SCN-AAA-001"]);
  });
});

const SEVERED_SCRIPT = "lint:severed-check";

describe("[SCN-LNT-004] a scenario raising Evidence Obligations for both a unit test and a fitness function reports each independently", () => {
  it("answers each obligation from an evidence observation of its own axis — the unit evidence observation satisfies the unit obligation, the citing fitness evidence observation the watermelon — and never one from the other", () => {
    const { ciSource: plantedCi, packageJson: plantedPackageJson } =
      severedWiringFor(SEVERED_SCRIPT);

    const corpus = [
      "@LNT",
      "Feature: fixture",
      "  Rule: a fixture rule",
      "    @unit @fitness @SCN-AAA-001",
      "    Scenario: the tree stays inside this check's threshold",
    ].join("\n");
    const scenarios = parseScenarios(
      corpus);
    expect(scenarios.map((s) => s.evidenceObligations)).toEqual([
      [{ qualityCheck: "unit" }, { qualityCheck: "fitness" }],
    ]);

    const citedScn = (script: string): ScriptCitation | null =>
      script === SEVERED_SCRIPT ? { scnId: "SCN-AAA-001" } : null;

    const unitObservation: EvidenceObservation = {
      qualityCheck: "unit",
      scnId: "SCN-AAA-001",
      status: "passed",
    };
    const fitnessObservations = runningFitnessFunctions(
      parsedWorkflows([plantedCi]),
      plantedPackageJson,
      NO_RUNNERS,
      citedScn
    ).filter((o) => o.fitnessFunction === SEVERED_SCRIPT);
    expect(fitnessObservations).toEqual([
      {
        qualityCheck: "fitness",
        fitnessFunction: SEVERED_SCRIPT,
        exists: true,
        enforcedOverRealSource: false,
        scnId: "SCN-AAA-001",
      },
    ]);

    const balance = reconcile(scenarios, [unitObservation, ...fitnessObservations]);
    const scenario = balance.claimReconciliations.find((s) => s.claim === "SCN-AAA-001");

    expect(scenario?.verdict).toBe("out-of-balance");

    const watermelonObservation = { ...fitnessObservations[0]!, outcome: "watermelon" };
    expect(scenario?.qualityCheckReconciliations).toEqual([
      {
        qualityCheck: "unit",
        evidenceObligation: { qualityCheck: "unit" },
        evidenceObservations: [{ ...unitObservation, outcome: "satisfied" }],
      },
      {
        qualityCheck: "fitness",
        evidenceObligation: { qualityCheck: "fitness" },
        evidenceObservations: [watermelonObservation],
      },
    ]);

    expect(reconcilingItemsOf(scenario!)).toEqual([
      {
        qualityCheck: "fitness",
        outcome: "watermelon",
        evidenceObligation: { qualityCheck: "fitness" },
        evidenceObservation: watermelonObservation,
      },
    ]);
  });
});
