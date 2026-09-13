/**
 * @unit for @SCN-LNT-030 — the reader takes what the STEP did, so a red the job swallowed still
 * reds the row that step names.
 *
 * THE FIXTURE IS THE ARM. A record whose step reports `failure` to itself and `success` to its job
 * is the one document that tells a reader taking the first field apart from a reader taking the
 * second: everywhere else the two agree, and both readers look identical. `@SCN-LNT-028` had this
 * record available and deliberately kept its own two fields in agreement, so that the WORD it
 * settles and the FIELD this settles could not each pass on the strength of the other's half.
 *
 * IT READS THROUGH THE WHOLE COMPOSITION, for this axis's usual reason: the claim is about what
 * the LEDGER says, and a reader emitting an impeccable observation the composition never threads
 * produces exactly the ledger a reader emitting nothing produces.
 *
 * WHAT A `conclusion` READER PRODUCES INSTEAD, measured rather than asserted: no credit is raised
 * at all, so the row's item reads `missing` and carries no observation. Both readings leave the
 * row out of balance — a green job does not balance this ledger either way — which is why the
 * assertion is over the OUTCOME WORD and the observation beneath it rather than over the verdict.
 *
 * Bidirectional evidence: the describe carries its @SCN id, matching
 * features/fitness-reconciliation.feature and the @integration steps in
 * tests/steps/lintReconciliation.steps.ts.
 */

import { describe, it, expect } from "vitest";
import { hasBrokenEvidence } from "../domain/ledger.js";
import type { CiStepRecord } from "../parse/ciStepRecord.js";
import { evidenceReconciliationFromSources } from "./evidenceReconciliationFromSources.js";
import type { EvidenceReconciliation } from "./renderInput.js";

/** The target's corpus — one stepless fitness scenario, which its one configured row names. */
const corpus = `@CVT
Feature: a target's fitness corpus

  Rule: the tree stays inside its thresholds

    @fitness @SCN-CVT-001
    Scenario: the codebase stays under its complexity threshold
`;

/**
 * The target's manifest — one STATIC row whose command is a BARE one, not a script of this
 * manifest. Until @SCN-USG-004 inverted the membership rule that
 * was also this fixture's isolation, because no prefix reached such a command; the isolation is now
 * a mechanism — a run handed its own record is answered for its CONFIGURED rows by that record.
 */
const manifest = {
  scripts: { build: "tsc" },
  specController: {
    // THE CHECKOUT STEP IS NOT A CHECK, and under the inverted membership rule it is a
    // candidate until this target says so (@SCN-USG-013). An action is a candidate on the same
    // terms as a command — a quality check can BE an action — so a pipeline that opens with a
    // checkout answers for it here, exactly as a consumer's own manifest does.
    notChecks: ["ci.yml:quality:Checkout"],
    fitnessChecks: [{ scn: "SCN-CVT-001", characteristic: "complexity", command: "eslint" }],
  },
};

/**
 * The target's workflow — the check runs under `continue-on-error`, which is what makes the record
 * below possible. Nothing in this reading consults the workflow for that attribute; it is here so
 * the fixture is a pipeline that could exist rather than a record nobody could have written.
 */
const ci = `name: fixture CI
jobs:
  quality:
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      - name: Complexity
        id: SCN-CVT-001
        continue-on-error: true
        run: eslint
      - name: Dump this run's step record
        id: dump-the-step-record
        if: always()
        env:
          STEPS_JSON: \${{ toJSON(steps) }}
        run: printf '%s' "$STEPS_JSON" > ci-steps.json
`;

/**
 * THE DISCRIMINATING RECORD. The check's step failed and its job was told it succeeded — the two
 * results a `continue-on-error` step reports, and the only shape in which the field choice is
 * visible from outside the reader.
 */
const record: CiStepRecord = {
  "SCN-CVT-001": { outcome: "failure", conclusion: "success" },
  "dump-the-step-record": { outcome: "success", conclusion: "success" },
};

/** The reconcile composition over that target, handed the record of the run. */
function reconcile(): EvidenceReconciliation {
  return evidenceReconciliationFromSources({
    featureSources: [corpus],
    untaggedScenarios: [],
    packageJson: manifest,
    ciSources: [ci],
    // The workflow FILE the exclusion above opens with — an entry can name no step of a
    // source this run was given no name for.
    ciSourceNames: ["ci.yml"],
    measurements: {},
    runtimeObservations: [],
    deferralTags: [],
    killFloor: () => null,
    ciStepRecord: record,
  });
}

describe("[SCN-LNT-030] the reader takes the step's outcome, so a swallowed red still reds its row", () => {
  it("reds the row off what the step did, though every other result in the record is a success", () => {
    const reconciliation = reconcile();

    // THE LEDGER WHOLE, so a credit landing anywhere but on the row its step named is visible
    // rather than absorbed. `failing` here and `missing` under a reader taking the laundered
    // field — the one cell that tells the two apart, on a fixture where nothing else does.
    expect(
      reconciliation.ledger.scenarioReconciliations.map((row) => [
        row.scnId,
        row.kind,
        row.verdict,
        row.qualityCheckReconciliations.map((item) => [item.staticCheck, item.outcome]),
      ])
    ).toEqual([["SCN-CVT-001", "scenario", "out-of-balance", [["complexity", "failing"]]]]);

    // THE OBSERVATION IS CARRIED, which is the second half of the same discrimination: a reader
    // taking the laundered field raises no credit at all, so this item would hold none.
    const [item] = reconciliation.ledger.scenarioReconciliations[0]!.qualityCheckReconciliations;
    expect(item?.evidenceObservation).toMatchObject({
      qualityCheck: "lint",
      scnId: "SCN-CVT-001",
      checkTag: "complexity",
    });

    // AND THE RUN IS SOUND. The evidence stream did its job perfectly — it carried a red past a
    // job that had been told there wasn't one.
    expect(hasBrokenEvidence(reconciliation.ledger)).toBe(false);
  });
});
