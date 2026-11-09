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

describe("[CLM-LNT-009] a fitness evidence observation citing a claim code no scenario carries posts to a phantom claim's row", () => {
  it("mints the phantom claim's row for the cited claim code, posts the run's one evidence observation there naming the check, and holds it out-of-balance", () => {
    const { ciSource, packageJson } = wiringFor(REAL_GUARD);

    const citedClaimCode = (script: string): ScriptCitation | null =>
      script === REAL_GUARD ? { claimCode: "CLM-AAA-001" } : null;

    const corpusAtReconcile = [
      "@LNT",
      "Feature: fixture",
      "  Rule: a fixture rule",
      "    @fitness @CLM-AAA-002",
      "    Scenario: the corpus keeps its feature codes inside the threshold",
    ].join("\n");

    const evidenceObservations = runningFitnessFunctions(
      parsedWorkflows([ciSource]),
      packageJson,
      NO_RUNNERS,
      citedClaimCode
    );
    const observation = evidenceObservations.find((o) => o.fitnessFunction === REAL_GUARD);
    expect(observation?.claimCode).toBe("CLM-AAA-001");

    const scenarios = parseScenarios(
      corpusAtReconcile);
    expect(scenarios.map((s) => s.claimCode)).toEqual(["CLM-AAA-002"]);

    const balance = reconcile(scenarios, evidenceObservations);

    const phantomClaimRow = balance.claimReconciliations.find((s) => s.kind === "phantom-claim");
    expect(phantomClaimRow?.claim).toBe("CLM-AAA-001");
    expect(phantomClaimRow?.verdict).toBe("out-of-balance");
    expect(obligationsOf(phantomClaimRow!)).toEqual([]);
    expect(observationsOf(phantomClaimRow!)).toEqual([{ ...observation, outcome: "cites-unknown-claim" }]);
    expect(phantomClaimRow?.qualityCheckReconciliations).toEqual([
      {
        qualityCheckKind: "fitness",
        evidenceObservations: [{ ...observation, outcome: "cites-unknown-claim" }],
      },
    ]);
    expect(reconcilingItemsOf(phantomClaimRow!)).toEqual(phantomClaimRow?.qualityCheckReconciliations.flatMap(linesOf));
    expect(phantomClaimRow?.pendingItems).toEqual([]);

    expect(
      balance.claimReconciliations
        .filter((row) => observationsOf(row).some(({ outcome: _outcome, ...posted }) => isDeepStrictEqual(posted, observation)))
        .map((row) => row.claim)
    ).toEqual(["CLM-AAA-001"]);
  });
});

const SEVERED_SCRIPT = "lint:severed-check";

describe("[CLM-LNT-004] a scenario raising Evidence Obligations for both a unit test and a fitness function reports each independently", () => {
  it("answers each obligation from an evidence observation of its own kind of quality check — the unit evidence observation satisfies the unit obligation, the citing fitness evidence observation the cannot-fail — and never one from the other", () => {
    const { ciSource: plantedCi, packageJson: plantedPackageJson } =
      severedWiringFor(SEVERED_SCRIPT);

    const corpus = [
      "@LNT",
      "Feature: fixture",
      "  Rule: a fixture rule",
      "    @unit @fitness @CLM-AAA-001",
      "    Scenario: the tree stays inside this check's threshold",
    ].join("\n");
    const scenarios = parseScenarios(
      corpus);
    expect(scenarios.map((s) => s.evidenceObligations)).toEqual([
      [{ qualityCheckKind: "unit" }, { qualityCheckKind: "fitness" }],
    ]);

    const citedClaimCode = (script: string): ScriptCitation | null =>
      script === SEVERED_SCRIPT ? { claimCode: "CLM-AAA-001" } : null;

    const unitObservation: EvidenceObservation = {
      qualityCheckKind: "unit",
      claimCode: "CLM-AAA-001",
      status: "passed",
    };
    const fitnessObservations = runningFitnessFunctions(
      parsedWorkflows([plantedCi]),
      plantedPackageJson,
      NO_RUNNERS,
      citedClaimCode
    ).filter((o) => o.fitnessFunction === SEVERED_SCRIPT);
    const withoutStep = ({ step: _step, ...rest }: (typeof fitnessObservations)[number] & { step?: string }) => rest;
    expect(fitnessObservations.map(withoutStep)).toEqual([
      {
        qualityCheckKind: "fitness",
        fitnessFunction: SEVERED_SCRIPT,
        exists: true,
        enforcedOverRealSource: false,
        claimCode: "CLM-AAA-001",
      },
    ]);

    const balance = reconcile(scenarios, [unitObservation, ...fitnessObservations]);
    const scenario = balance.claimReconciliations.find((s) => s.claim === "CLM-AAA-001");

    expect(scenario?.verdict).toBe("out-of-balance");

    const watermelonObservation = { ...fitnessObservations[0]!, outcome: "cannot-fail" };
    expect(scenario?.qualityCheckReconciliations).toEqual([
      {
        qualityCheckKind: "unit",
        evidenceObligation: { qualityCheckKind: "unit" },
        evidenceObservations: [{ ...unitObservation, outcome: "satisfied" }],
      },
      {
        qualityCheckKind: "fitness",
        evidenceObligation: { qualityCheckKind: "fitness" },
        evidenceObservations: [watermelonObservation],
      },
    ]);

    expect(reconcilingItemsOf(scenario!)).toEqual([
      {
        qualityCheckKind: "fitness",
        outcome: "cannot-fail",
        evidenceObligation: { qualityCheckKind: "fitness" },
        evidenceObservation: watermelonObservation,
      },
    ]);
  });
});
