import { describe, it, expect } from "vitest";
import { reconcile } from "./evidenceReconciliation.js";
import type { ScriptCitation } from "../parse/fitnessCitations.js";
import { parseScenarios } from "../parse/scenarios.js";
import { runningFitnessFunctions } from "../parse/runningFitnessFunctions.js";
import type { PackageJsonScripts } from "../parse/checkScriptsRunInCI.js";

const NO_RUNNERS: Readonly<Record<string, string | null>> = {};

const UNREGISTERED_HANDLE = "typecheck";

const PLANTED_CI = [
  `jobs:\n  ci:\n    steps:\n      - run: pnpm ${UNREGISTERED_HANDLE}\n`,
];
const PLANTED_PACKAGE_JSON: PackageJsonScripts = {
  scripts: { [UNREGISTERED_HANDLE]: "tsc --noEmit" },
};

const citedScn = (): ScriptCitation | null => null;

describe("[SCN-USG-001] an uncited fitness credit lands in suspense and never answers an Evidence Obligation by name", () => {
  it("posts the citing-nothing credit to suspense, leaves the scenario naming that check missing, and answers no obligation anywhere with it", () => {
    const corpus = [
      "@LNT",
      "Feature: fixture",
      "  Rule: a fixture rule",
      "    @fitness @SCN-AAA-001",
      "    Scenario: the tree compiles under the configured type settings",
    ].join("\n");
    const scenarios = parseScenarios(
      corpus);
    expect(scenarios.map((s) => [s.scnId, s.evidenceObligations])).toEqual([
      ["SCN-AAA-001", [{ qualityCheck: "fitness" }]],
    ]);

    const evidenceObservations = runningFitnessFunctions(
      PLANTED_CI,
      PLANTED_PACKAGE_JSON,
      NO_RUNNERS,
      citedScn
    );
    expect(evidenceObservations).toHaveLength(1);
    const observation = evidenceObservations.find((o) => o.fitnessFunction === UNREGISTERED_HANDLE);
    expect(observation).toEqual({
      qualityCheck: "fitness",
      fitnessFunction: UNREGISTERED_HANDLE,
      exists: true,
      enforcedOverRealSource: true,
    });

    const balance = reconcile(scenarios, [observation!]);

    const suspense = balance.scenarioReconciliations.find((s) => s.kind === "suspense-scenario");
    expect(suspense?.scnId).toBe("(no scenario)");
    expect(suspense?.verdict).toBe("out-of-balance");
    expect(suspense?.qualityCheckReconciliations).toEqual([
      {
        qualityCheck: "fitness",
        fitnessFunction: UNREGISTERED_HANDLE,
        outcome: "cites-no-scenario",
        evidenceObservation: observation,
      },
    ]);

    const fitness = balance.scenarioReconciliations.find((s) => s.scnId === "SCN-AAA-001");
    expect(fitness?.verdict).toBe("out-of-balance");
    const missingItem = {
      qualityCheck: "fitness",
      outcome: "missing",
      evidenceObligation: { qualityCheck: "fitness" },
    };
    expect(fitness?.qualityCheckReconciliations).toEqual([missingItem]);
    expect(fitness?.reconcilingItems).toEqual([missingItem]);

    expect(
      balance.scenarioReconciliations
        .filter((row) => row.evidenceObservations.includes(observation!))
        .map((row) => row.scnId)
    ).toEqual(["(no scenario)"]);

    expect(
      balance.scenarioReconciliations
        .flatMap((row) =>
          row.qualityCheckReconciliations.map((item) => ({ row: row.scnId, item }))
        )
        .filter(
          ({ item }) =>
            item.evidenceObservation === observation && item.evidenceObligation !== undefined
        )
        .map(({ row }) => row)
    ).toEqual([]);
  });
});
