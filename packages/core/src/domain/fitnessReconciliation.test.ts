import { describe, it, expect } from "vitest";
import { reconcile } from "./evidenceReconciliation.js";
import type { ScriptCitation } from "../parse/fitnessCitations.js";
import { parseScenarios } from "../parse/scenarios.js";
import { runningFitnessFunctions } from "../parse/runningFitnessFunctions.js";
import type { PackageJsonScripts } from "../parse/checkScriptsRunInCI.js";
import type { EvidenceObservation } from "../model.js";

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

describe("[SCN-LNT-009] a fitness credit citing an @SCN no scenario carries posts to a phantom row", () => {
  it("mints the phantom row for the cited @SCN, posts the run's one credit there naming the check, and holds it out-of-balance", () => {
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
      [ciSource],
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

    const phantom = balance.scenarioReconciliations.find((s) => s.kind === "phantom-scenario");
    expect(phantom?.scnId).toBe("SCN-AAA-001");
    expect(phantom?.verdict).toBe("out-of-balance");
    expect(phantom?.evidenceObligations).toEqual([]);
    expect(phantom?.evidenceObservations).toEqual([observation]);
    expect(phantom?.qualityCheckReconciliations).toEqual([
      {
        qualityCheck: "fitness",
        fitnessFunction: REAL_GUARD,
        outcome: "cites-unknown-scenario",
        evidenceObservation: observation,
      },
    ]);
    expect(phantom?.reconcilingItems).toEqual(phantom?.qualityCheckReconciliations);
    expect(phantom?.pendingItems).toEqual([]);

    expect(
      balance.scenarioReconciliations
        .filter((row) => row.evidenceObservations.includes(observation!))
        .map((row) => row.scnId)
    ).toEqual(["SCN-AAA-001"]);
  });
});

const SEVERED_SCRIPT = "lint:severed-check";

describe("[SCN-LNT-004] a scenario raising Evidence Obligations for both a unit test and a fitness function reports each independently", () => {
  it("answers each obligation from a credit of its own axis — the unit credit satisfies the unit obligation, the citing fitness credit the watermelon — and never one from the other", () => {
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

    const unitCredit: EvidenceObservation = {
      qualityCheck: "unit",
      scnId: "SCN-AAA-001",
      status: "passed",
    };
    const fitnessCredits = runningFitnessFunctions(
      [plantedCi],
      plantedPackageJson,
      NO_RUNNERS,
      citedScn
    ).filter((o) => o.fitnessFunction === SEVERED_SCRIPT);
    expect(fitnessCredits).toEqual([
      {
        qualityCheck: "fitness",
        fitnessFunction: SEVERED_SCRIPT,
        exists: true,
        enforcedOverRealSource: false,
        scnId: "SCN-AAA-001",
      },
    ]);

    const balance = reconcile(scenarios, [unitCredit, ...fitnessCredits]);
    const scenario = balance.scenarioReconciliations.find((s) => s.scnId === "SCN-AAA-001");

    expect(scenario?.verdict).toBe("out-of-balance");

    const watermelonItem = {
      qualityCheck: "fitness",
      outcome: "watermelon",
      evidenceObligation: { qualityCheck: "fitness" },
      evidenceObservation: fitnessCredits[0],
    };
    expect(scenario?.qualityCheckReconciliations).toEqual([
      {
        qualityCheck: "unit",
        outcome: "satisfied",
        evidenceObligation: { qualityCheck: "unit" },
        evidenceObservation: unitCredit,
      },
      watermelonItem,
    ]);

    expect(scenario?.reconcilingItems).toEqual([watermelonItem]);
  });
});
