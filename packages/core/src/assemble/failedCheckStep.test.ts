/**
 * @unit for @SCN-LNT-028 — a check step the CI run's record says FAILED posts a `failing`
 * observation: out of balance, sound, and carrying what the check found.
 *
 * IT READS THROUGH THE WHOLE COMPOSITION, for this axis's usual reason. The claim is about WHERE
 * the run's verdict lands and WHAT WORD the ledger says about it, and neither the record reader nor
 * the reconciler can answer that alone — a reader emitting an impeccable observation the
 * composition never threads produces exactly the ledger a reader emitting nothing produces.
 *
 * THE THREE WRONG ANSWERS ARE WHAT THE ASSERTION IS SHAPED AGAINST. A reader posting `broken` and
 * a reader posting nothing both leave the row saying "no evidence" — and `broken` additionally
 * stamps the run unsound, which is why soundness is asserted rather than assumed. A reader
 * collapsing failed into "the check ran" leaves the row balanced. The row's outcome, the
 * observation it carries, and the run's soundness tell all four apart in one reconciliation.
 *
 * THE STEP'S TWO FIELDS AGREE IN THIS FIXTURE, DELIBERATELY. Which of them a reader must take is
 * its own claim with its own scenario (3F-3264); settling both from one record would let each arm
 * pass on the strength of the other's half.
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

/** The target's workflow — the check is an ordinary `run:` step stating the code of its row. */
const ci = `name: fixture CI
jobs:
  quality:
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      - name: Complexity
        id: SCN-CVT-001
        if: always()
        run: eslint
      - name: Dump this run's step record
        id: dump-the-step-record
        if: always()
        env:
          STEPS_JSON: \${{ toJSON(steps) }}
        run: printf '%s' "$STEPS_JSON" > ci-steps.json
`;

/**
 * The record that run wrote about itself — the check's step failed, and the record's remaining step
 * succeeded, so a reader summarising the run rather than reading the row's own step has a green to
 * reach for.
 */
const record: CiStepRecord = {
  "SCN-CVT-001": { outcome: "failure", conclusion: "failure" },
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

describe("[SCN-LNT-028] a check step the run's record says failed posts a failing observation", () => {
  it("reds the row it names, carrying what the check found, and leaves the run sound", () => {
    const reconciliation = reconcile();

    // THE LEDGER WHOLE, so a credit landing anywhere but on the row its step named is visible
    // rather than absorbed. A suspense row appearing here would say the citation had been lost.
    expect(
      reconciliation.ledger.scenarioReconciliations.map((row) => [
        row.scnId,
        row.kind,
        row.verdict,
        row.qualityCheckReconciliations.map((item) => [item.staticCheck, item.outcome]),
      ])
    ).toEqual([["SCN-CVT-001", "scenario", "out-of-balance", [["complexity", "failing"]]]]);

    // THE OBSERVATION IS CARRIED, WHICH IS WHAT `failing` MEANS AND `broken` DOES NOT. A check that
    // ran and found violations said something, and a reading that discarded it would be reporting
    // the strictly weaker fact that nothing was heard from the check at all.
    const [item] = reconciliation.ledger.scenarioReconciliations[0]!.qualityCheckReconciliations;
    expect(item?.evidenceObservation).toMatchObject({
      qualityCheck: "lint",
      scnId: "SCN-CVT-001",
      checkTag: "complexity",
    });

    // AND THE RUN IS SOUND. `broken` stamps a run unsound — the evidence stream itself is faulty —
    // and this run's evidence stream worked perfectly: it delivered a red.
    expect(hasBrokenEvidence(reconciliation.ledger)).toBe(false);
  });
});
