/**
 * @unit for @SCN-LNT-022 — a MEASURED row's step in the CI run's record raises no credit, because
 * that row's credit is its NUMBER.
 *
 * THE CLAIM IS COUNTED ON THE ROW'S OWN CREDIT LIST, not on its verdict, and the difference is what
 * makes these arms teeth rather than decoration. A second credit here is ABSORBED: the row does
 * carry an Evidence Obligation naming `mutation`, so a stray static credit is not a
 * `no-evidence-obligation` item and never reaches the verdict — the run reads balanced while one
 * obligation holds two credits. So `evidenceObservations` is asserted WHOLE on both rows, and the
 * ledger's static-check total beside it, because those are the two places the double count is
 * legible at all.
 *
 * ONE FACT, ONE SPELLING. Both sides ask `carriesBar` of the same row from the same reading of the
 * same manifest, which is why the two rows below can be identical in every other respect — same
 * axis tag, same corpus, same workflow, same outcome in the same record — and still be routed to
 * different streams.
 *
 * IT READS THROUGH THE WHOLE RECONCILE COMPOSITION rather than through the record reader alone, for
 * this axis's usual reason: the claim is that the credit lands on the row the DEBIT was raised on,
 * and two readings agree only when they are taken from one walk of one corpus. A test over the
 * reader in isolation would assert the shape of an observation and leave a composition free to post
 * it against a corpus the obligations never came from (@SCN-LNT-009).
 *
 * NO CHECK REGISTRY IS CONFIGURED ANYWHERE IN THIS FILE, and that absence is an assertion. The
 * two-hop seam — handle to characteristic, characteristic to `@SCN` — is exactly what conversion
 * retires, so a reading that still needed it would find nothing here and every row would reconcile
 * `missing`.
 *
 * Bidirectional evidence: the describe carries its @SCN id, matching
 * features/fitness-reconciliation.feature and the @integration steps in
 * tests/steps/lintReconciliation.steps.ts.
 */

import { describe, it, expect } from "vitest";
// The union's OWN discriminators, so "which stream carried this credit" is read here exactly as
// the reconciler reads it rather than re-derived from the observation's fields.
import { isMeasuredObservation, isStaticCheckObservation } from "../domain/journal.js";
import type { CiStepRecord } from "../parse/ciStepRecord.js";
import { evidenceReconciliationFromSources } from "./evidenceReconciliationFromSources.js";
import type { EvidenceReconciliation } from "./renderInput.js";

/**
 * The target's corpus — two stepless fitness scenarios, each named by one configured row, and no
 * characteristic tag anywhere. Neither word the rows name appears in this source, which is what
 * makes every expectation below a claim about the rows rather than about a tag that happens to
 * spell the same word.
 */
const corpus = `@CVT
Feature: a converted target's fitness corpus

  Rule: the tree stays inside its thresholds

    @fitness @SCN-CVT-001
    Scenario: the codebase stays under its complexity threshold

    @fitness @SCN-CVT-003
    Scenario: the domain's mutation score stays above its floor
`;

/**
 * One STATIC row and one MEASURED row, differing in exactly ONE thing — the second names a bar.
 * Both commands are BARE ones rather than scripts of this manifest: a guard-prefixed handle would
 * be DISCOVERED from the workflow below and the derivation reader's credit would answer these rows'
 * obligations first, leaving the reading under test untested behind a green arm.
 */
const manifest = {
  scripts: { build: "tsc" },
  specController: {
    fitnessChecks: [
      { scn: "SCN-CVT-001", characteristic: "complexity", command: "eslint" },
      { scn: "SCN-CVT-003", characteristic: "mutation", command: "mutation-score", atLeast: 90 },
    ],
  },
};

/**
 * The target's workflow — the measured check is a step of that pipeline exactly as the static one
 * is, stating the code of the row it answers, beside the step that writes the record.
 */
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
      - name: Mutation score
        id: SCN-CVT-003
        if: always()
        run: mutation-score
      - name: Dump this run's step record
        id: dump-the-step-record
        if: always()
        run: printf '%s' "$STEPS_JSON" > ci-steps.json
`;

/**
 * THE RECORD OF A RUN ON WHICH BOTH STEPS SUCCEEDED — and nothing in it tells the two checks apart.
 * A fixture whose measured step were absent, or skipped, would green a reading that never had to
 * skip anything.
 */
const record: CiStepRecord = {
  "SCN-CVT-001": { outcome: "success", conclusion: "success" },
  "SCN-CVT-003": { outcome: "success", conclusion: "success" },
  "dump-the-step-record": { outcome: "success", conclusion: "success" },
};

/** The measured row's own credit — the NUMBER, on the stream that carries numbers. */
const mutationMeasured = {
  measurements: [{ scnId: "SCN-CVT-003", checkTag: "mutation", measured: 92 }],
};

/** The reconcile composition over that target, handed the record of the run and what it measured. */
function reconcile(measurements: { measurements: readonly unknown[] }): EvidenceReconciliation {
  return evidenceReconciliationFromSources({
    featureSources: [corpus],
    untaggedScenarios: [],
    packageJson: manifest,
    ciSources: [ci],
    measurements,
    runtimeObservations: [],
    deferralTags: [],
    guardScriptPrefixes: ["lint:"],
    killFloor: () => null,
    ciStepRecord: record,
  });
}

/**
 * Every credit posted to one row, as `[characteristic, which stream carried it]`.
 *
 * The two published predicates rather than a hand-written `"measured" in …`: the union's own
 * discriminators are what the reconciler routes on, and a second reading of "which shape is this"
 * here could class a credit differently from the code under test and then agree with itself.
 */
function creditsOn(reconciliation: EvidenceReconciliation, scnId: string) {
  const row = reconciliation.ledger.scenarioReconciliations.find((r) => r.scnId === scnId);
  return (row?.evidenceObservations ?? []).map((observation) =>
    isMeasuredObservation(observation)
      ? [observation.checkTag, "the number"]
      : isStaticCheckObservation(observation)
        ? [observation.staticCheck, "the run's record"]
        : ["a runtime result", "neither stream"]
  );
}

/** One scenario's row — its verdict, and its reconciled sub-rows as `[check, outcome]`. */
function rowOf(reconciliation: EvidenceReconciliation, scnId: string) {
  const row = reconciliation.ledger.scenarioReconciliations.find((r) => r.scnId === scnId);
  return {
    verdict: row?.verdict,
    items: (row?.qualityCheckReconciliations ?? []).map((item) => [item.staticCheck, item.outcome]),
  };
}

describe("[SCN-LNT-022] a measured check's step in the CI run's record raises no credit", () => {
  it("posts the measured row exactly one credit — its number, with nothing from the record beside it", () => {
    const reconciliation = reconcile(mutationMeasured);
    expect(creditsOn(reconciliation, "SCN-CVT-003")).toEqual([["mutation", "the number"]]);
    // And the number is what settles the obligation, so the row balances on one credit alone.
    expect(rowOf(reconciliation, "SCN-CVT-003")).toEqual({
      verdict: "balanced",
      items: [["mutation", "satisfied"]],
    });
  });

  it("still credits the STATIC row off that same record — what the reading skips is the bar, not the axis", () => {
    // The discriminator against a cure that stopped reading the record at all: both steps are in it,
    // both succeeded, and only the one whose row names a bar is skipped.
    const reconciliation = reconcile(mutationMeasured);
    expect(creditsOn(reconciliation, "SCN-CVT-001")).toEqual([["complexity", "the run's record"]]);
    expect(rowOf(reconciliation, "SCN-CVT-001")).toEqual({
      verdict: "balanced",
      items: [["complexity", "satisfied"]],
    });
  });

  it("counts ONE static check as having run, not two — the measured row is not a static check that ran", () => {
    // Where the double count is legible in the ROLL-UP. A static credit for a measured row is
    // absorbed by that row's own obligation rather than surfacing as an unmatched item, so the
    // verdict says nothing about it; this total is what a reader would see move.
    expect(reconcile(mutationMeasured).summary.staticChecks).toEqual({
      runningStaticCheckCount: 1,
      uncitedStaticCheckCount: 0,
    });
  });

  it("posts the measured row NO credit at all when no number arrives — the record stands in for nothing", () => {
    // The sharpest arm, and the reason the skip is not merely tidy. A reading that credited a
    // measured row off its step's outcome would answer this row with "it ran" where a value is
    // owed, leaving a check nothing measured looking observed — and the step IS in the record,
    // succeeding, so there is a green here for such a reading to reach.
    const reconciliation = reconcile({ measurements: [] });
    expect(creditsOn(reconciliation, "SCN-CVT-003")).toEqual([]);
    expect(rowOf(reconciliation, "SCN-CVT-003")).toEqual({
      verdict: "out-of-balance",
      items: [["mutation", "missing"]],
    });
  });
});
