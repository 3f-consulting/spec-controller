/**
 * @unit for @SCN-LNT-020 — a `@fitness` scenario nothing cites reconciles **missing**, and its row
 * is out of balance (3F-3582).
 *
 * IT REPLACES THE CENSUS READER'S OWN TEST FILE, WHICH ASSERTED THE OPPOSITE (3F-3588 deleted it).
 * That file held the corpus-reading half of the retired model: which scenarios on the fitness axis
 * no `specController.fitnessChecks` entry named, so a census line could report them while they
 * raised nothing. The entry is retired; the obligation is raised by the tag; so the reading that
 * file existed for has no answer to give, and the fault it named is an ordinary missing row.
 *
 * IN `domain/` RATHER THAN `parse/`, BECAUSE THE CLAIM MOVED WITH THE MODEL. What is asserted is no
 * longer what the corpus reader ANSWERS about a scenario — `parse` raises the obligation for every
 * `@fitness` scenario alike, which is `convertedFitnessObligations.test.ts`'s — but what the
 * RECONCILER does with an obligation no credit answers.
 *
 * Bidirectional evidence: the describe carries its @SCN id, matching
 * features/fitness-reconciliation.feature and the @integration steps in
 * tests/steps/fitnessReconciliation.steps.ts.
 */

import { describe, it, expect } from "vitest";
import { reconcile } from "./evidenceReconciliation.js";
import { parseScenarios } from "../parse/scenarios.js";

/** Two scenarios on the fitness axis, and nothing anywhere naming either as a configured check. */
const CORPUS = [
  "@HCV",
  "Feature: a half-declared target's fitness corpus",
  "  Rule: the tree stays inside its thresholds",
  "    @fitness @SCN-HCV-001",
  "    Scenario: the codebase stays under its complexity threshold",
  "    @fitness @SCN-HCV-002",
  "    Scenario: the tree stays above its mutation floor",
].join("\n");

/**
 * A fitness credit, shaped exactly as `ciStepRecordCredits` builds one off a step that succeeded —
 * the step's own `id:` as both the check that ran and the scenario it cites.
 */
const creditFor = (scnId: string) => ({
  qualityCheck: "fitness" as const,
  staticCheck: scnId,
  scnId,
  exists: true,
  enforcedOverRealSource: true,
  status: "passed" as const,
});

describe("[SCN-LNT-020] a @fitness scenario nothing cites reconciles missing, and its row is out of balance", () => {
  it("answers the cited scenario and leaves the uncited one missing", () => {
    const ledger = reconcile(parseScenarios(CORPUS), [creditFor("SCN-HCV-001")]);
    const rowOf = (scnId: string) =>
      ledger.scenarioReconciliations.find((row) => row.scnId === scnId);

    // BOTH raise the obligation — that is what the tag does, and it is the premise the outcome
    // below is only interesting against.
    expect(rowOf("SCN-HCV-001")?.evidenceObligations).toEqual([{ qualityCheck: "fitness" }]);
    expect(rowOf("SCN-HCV-002")?.evidenceObligations).toEqual([{ qualityCheck: "fitness" }]);

    // SATISFIED lands on the row's quality-check reconciliations; `reconcilingItems` is the
    // OUT-OF-BALANCE subset, which is why the cited row's is empty and the uncited row's is not.
    expect(
      rowOf("SCN-HCV-001")?.qualityCheckReconciliations.map((item) => item.outcome)
    ).toEqual(["satisfied"]);
    expect(rowOf("SCN-HCV-001")?.reconcilingItems).toEqual([]);
    expect(rowOf("SCN-HCV-001")?.verdict).toBe("balanced");

    // MISSING, the word a @unit scenario with no test already gets — never `both-missing`, which
    // says the scenario raised nothing at all, and never a minted outcome of this axis's own.
    expect(rowOf("SCN-HCV-002")?.reconcilingItems.map((item) => item.outcome)).toEqual(["missing"]);
    expect(
      rowOf("SCN-HCV-002")?.qualityCheckReconciliations.map((item) => item.outcome)
    ).toEqual(["missing"]);
    expect(rowOf("SCN-HCV-002")?.verdict).toBe("out-of-balance");
  });

  it("leaves a corpus nothing cites at all entirely missing, rather than entirely silent", () => {
    // THE OLD MODEL'S HEADLINE CASE, inverted. A target that had converted its scenarios and
    // written no manifest entries reconciled BALANCED over every one of them, and said so in a
    // census line. Every one of them is now a debit nothing answered.
    const ledger = reconcile(parseScenarios(CORPUS), []);
    expect(
      ledger.scenarioReconciliations.map((row) => [
        row.scnId,
        row.verdict,
        row.reconcilingItems.map((item) => item.outcome),
      ])
    ).toEqual([
      ["SCN-HCV-001", "out-of-balance", ["missing"]],
      ["SCN-HCV-002", "out-of-balance", ["missing"]],
    ]);
  });
});
