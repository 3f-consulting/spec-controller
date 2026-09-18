/**
 * @unit for @SCN-LNT-034 — a configured row whose `@SCN` no scenario in the corpus carries reaches
 * the ledger as an Evidence Obligation nothing observed, and no credit can ever settle it.
 *
 * THE THIRD OF THE THREE, BESIDE `unconfiguredFitnessScenarios.test.ts` AND
 * `unenumeratedFitnessRows.test.ts`. The first reads a `@fitness` scenario no row names; the second
 * a row no recorded step names; this one a row no SCENARIO names. Each is about the half of a pair
 * its own fixture is built to lose, and this is the half the engine did not perform at all until
 * 3F-3472: the Evidence Obligations travel with the scenarios, so a row the corpus carries no
 * scenario for raised nothing, and a target holding one reconciled BALANCED over a check it had
 * declared and never specified.
 *
 * THE TWO ARMS ARE THE TWO CLAIMS, AND THE SECOND IS NOT A RESTATEMENT OF THE FIRST. One says the
 * debit exists with no run input of any kind behind it; the other says no credit discharges it. The
 * second is what forecloses the implementation that would satisfy the first and be worse than the
 * fault: synthesising a `Scenario` for the row puts its code INTO the set the citation router posts
 * against, so a run whose CI step cites a declared-but-unspecified check would reconcile balanced —
 * a new false green in exactly the case the phantom row (@SCN-LNT-009) already covers.
 *
 * BOTH ARMS ARE OF ONE TARGET — one manifest, one corpus — for @SCN-LNT-027's reason: split across
 * two fixtures they could agree by accident about a manifest neither of them shares. What differs
 * between the readings is the RUN: the first is handed a pipeline that cites only the row the
 * corpus does specify and no record at all; the second a pipeline whose step states the
 * unspecified row's code, and the record that run wrote about itself.
 *
 * THE FIRST ARM'S TARGET BALANCES EXCEPT FOR THIS ONE ROW, which is what makes its verdict an
 * assertion rather than a coincidence. A fixture out of balance for some second reason would go on
 * reporting a failed run with this rule removed.
 *
 * IT READS THROUGH THE WHOLE RECONCILE COMPOSITION rather than through the new reading alone, for
 * @SCN-LNT-021's reason: what is asserted is where the debit LANDS and what the run's verdict then
 * is, and a reading producing an impeccable row the composition never threads produces exactly the
 * ledger a reading producing nothing produces.
 *
 * Bidirectional evidence: the describe carries its @SCN id, matching
 * features/fitness-reconciliation.feature and the @integration steps in
 * tests/steps/lintReconciliation.steps.ts.
 */

import { describe, it, expect } from "vitest";
import { evidenceReconciliationFromSources } from "../assemble/evidenceReconciliationFromSources.js";
import type { CiStepRecord } from "./ciStepRecord.js";
import type { EvidenceReconciliation } from "../assemble/renderInput.js";
// @SCN-LNT-034 — the WHOLE-RUN verdict the CLI edge maps to its exit code, asked here exactly as
// the CLI asks it rather than re-derived from the rows, so "the run fails" means what it means to
// a consumer.
import { isBalanced } from "../domain/ledger.js";

/** A corpus carrying a scenario for the FIRST of the two checks the manifest below declares. */
const corpusMissingTheSecond = `@CVT
Feature: a converted target's fitness corpus, carrying a scenario for one of its two configured checks

  Rule: the tree stays inside its thresholds

    @fitness @SCN-CVT-001
    Scenario: the codebase stays under its complexity threshold
`;

/** The target's manifest — two STATIC rows, and the corpus above specifies one of them. */
const manifest = {
  specController: {
    fitnessChecks: [
      { scn: "SCN-CVT-001", characteristic: "complexity", command: "eslint" },
      { scn: "SCN-CVT-002", characteristic: "traceability", command: "scn-subissues" },
    ],
  },
};

/**
 * The run that cites ONLY the row the corpus specifies — the quiet pipeline the first arm needs.
 *
 * It is what leaves this target balanced but for the one row: the check that HAS a scenario is
 * credited, so nothing else on these books is out of balance and the verdict below is about the
 * unspecified row alone.
 */
const runCitingTheSpecifiedRowAlone = `name: fixture CI
on: [push]

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - name: Complexity
        id: SCN-CVT-001
        run: eslint
`;

/** The SAME target's run, one step further on: it states the unspecified row's code as well. */
const runCitingTheUnspecifiedRow = `name: fixture CI
on: [push]

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - name: Complexity
        id: SCN-CVT-001
        if: always()
        run: eslint
      - name: Traceability
        id: SCN-CVT-002
        if: always()
        run: scn-subissues
      - name: Dump this run's step record
        id: dump-the-step-record
        if: always()
        env:
          STEPS_JSON: \${{ toJSON(steps) }}
        run: printf '%s' "$STEPS_JSON" > ci-steps.json
`;

/** What that run recorded about itself: both check steps ran and passed, beside the dump's own. */
const bothStepsSucceeded: CiStepRecord = {
  "SCN-CVT-001": { outcome: "success", conclusion: "success" },
  "SCN-CVT-002": { outcome: "success", conclusion: "success" },
  "dump-the-step-record": { outcome: "success", conclusion: "success" },
};

/**
 * The reconcile composition over the one target, for a given run.
 *
 * `ciStepRecord` is OMITTED rather than passed `undefined` where no record was handed over, because
 * that is the shape the application layer produces: a consumer whose pipeline dumps none reaches
 * the reader with none at all (@SCN-LNT-027).
 */
function reconcileTarget(ciSource: string, record?: CiStepRecord): EvidenceReconciliation {
  return evidenceReconciliationFromSources({
    featureSources: [corpusMissingTheSecond],
    untaggedScenarios: [],
    packageJson: manifest,
    ciSources: [ciSource],
    runtimeObservations: [],
    deferralTags: [],
    ...(record === undefined ? {} : { ciStepRecord: record }),
  });
}

/** Every row of the ledger, as `[scnId, kind, verdict, [staticCheck, outcome][]]`. */
function rowsOf(reconciliation: EvidenceReconciliation) {
  return reconciliation.ledger.scenarioReconciliations.map((row) => [
    row.scnId,
    row.kind,
    row.verdict,
    row.qualityCheckReconciliations.map((item) => [item.staticCheck, item.outcome]),
  ]);
}

describe("[SCN-LNT-034] a configured row the corpus carries no scenario for is on the books", () => {
  it("raises an Evidence Obligation nothing observed, out of balance, with no CI run record at all", () => {
    // THE LEDGER WHOLE, because the claim is that a row appears at all where none used to. Until
    // 3F-3472 this target reconciled with ONE row — the scenario its corpus carries, credited by
    // the step that cites it — and the run read BALANCED at exit 0 over a check the manifest
    // declares and nothing specifies.
    const reconciliation = reconcileTarget(runCitingTheSpecifiedRowAlone);
    expect(rowsOf(reconciliation)).toEqual([
      ["SCN-CVT-001", "scenario", "balanced", [["complexity", "satisfied"]]],
      ["SCN-CVT-002", "scenario", "out-of-balance", [["traceability", "missing"]]],
    ]);
    // AND THE DEBIT IS POSTED, NOT MERELY REPORTED. The row names exactly one characteristic — the
    // one its manifest row names — and that is the obligation the manifest raised.
    const unspecified = reconciliation.ledger.scenarioReconciliations[1]!;
    expect(unspecified.evidenceObligations).toEqual([
      { qualityCheck: "lint", staticCheck: "traceability" },
    ]);
    // THE RUN'S OWN VERDICT, asked of the predicate the CLI edge maps to its exit code. Every other
    // account of this target agrees, so this is the row the run fails for and there is no second
    // reason it could have failed.
    expect(isBalanced(reconciliation.ledger)).toBe(false);
  });

  it("stays out of balance where a CI step cites it — the credit posts to a phantom row instead", () => {
    // NO CREDIT CAN SETTLE THIS DEBIT, and it is a set the row is not a member of rather than a
    // rule the code follows: `scenarioIds` is built from the corpus's scenarios alone, so the
    // citation router cannot post here. The run executed something and said so; the books show the
    // credit landing on a PHANTOM row and the obligation still missing beside it.
    const reconciliation = reconcileTarget(runCitingTheUnspecifiedRow, bothStepsSucceeded);
    expect(rowsOf(reconciliation)).toEqual([
      ["SCN-CVT-001", "scenario", "balanced", [["complexity", "satisfied"]]],
      [
        "SCN-CVT-002",
        "phantom-scenario",
        "out-of-balance",
        [["traceability", "cites-unknown-scenario"]],
      ],
      ["SCN-CVT-002", "scenario", "out-of-balance", [["traceability", "missing"]]],
    ]);
    expect(isBalanced(reconciliation.ledger)).toBe(false);
  });
});
