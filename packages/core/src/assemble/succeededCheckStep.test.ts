/**
 * @unit for @SCN-LNT-021 — a static check's step the CI run's record says SUCCEEDED credits the
 * row that step names, citing its own `@SCN`.
 *
 * THE CREDIT ARRIVES ALREADY CITING, WHICH IS THE SEAM THIS ROUTE RETIRES. A DISCOVERED static
 * check is found as a runnable script handle, and a handle does not know what it is for — hence
 * `checkRegistry`, and hence the corpus lookup behind it, two hops to recover what the check was
 * about. Here the step's `id:` IS the code of the row it answers and that row carries the
 * @SCN: one term, read off what was observed.
 *
 * NO CHECK REGISTRY IS CONFIGURED ANYWHERE IN THIS FILE, and that absence is an assertion. A
 * reading that still needed the seam would find nothing here and both rows would reconcile
 * `missing`.
 *
 * TWO ROWS FROM ONE RECORD, BECAUSE THE CLAIM IS THAT EACH IS CREDITED BY ITS OWN STEP. A reader
 * posting one entry's credit to every configured row, and a reader crossing the two, both leave
 * every row BALANCED and say so with the same verdict — so the assertion is over the
 * @SCN each row's credit cites, per row, rather than over a count or a verdict.
 *
 * IT READS THROUGH THE WHOLE COMPOSITION, for this axis's usual reason: the claim is about what the
 * LEDGER says, and a reader emitting an impeccable observation the composition never threads
 * produces exactly the ledger a reader emitting nothing produces.
 *
 * Bidirectional evidence: the describe carries its @SCN id, matching
 * features/fitness-reconciliation.feature and the @integration steps in
 * tests/steps/fitnessReconciliation.steps.ts.
 */

import { describe, it, expect } from "vitest";
import { hasBrokenEvidence } from "../domain/ledger.js";
import type { CiStepRecord } from "../parse/ciStepRecord.js";
import { evidenceReconciliationFromSources } from "./evidenceReconciliationFromSources.js";
import type { EvidenceReconciliation } from "./renderInput.js";

/**
 * The target's corpus — two stepless fitness scenarios, each named by one configured row, and no
 * word naming what a check is about anywhere in it, nor on the rows, which is
 * what makes every expectation below a claim about the rows rather than about a tag that happens
 * to spell the same word.
 */
const corpus = `@CVT
Feature: a converted target's fitness corpus

  Rule: the tree stays inside its thresholds

    @fitness @SCN-CVT-001
    Scenario: the codebase stays under its complexity threshold

    @fitness @SCN-CVT-002
    Scenario: every scenario in the corpus is traceable to its own sub-issue
`;

/**
 * The target's manifest — two STATIC rows, no check registry, and two commands that are BARE ones
 * rather than scripts of this manifest. A guard-prefixed handle would be DISCOVERED from the
 * workflow below and observed by the derivation reader, whose credit would answer these rows'
 * obligations first.
 */
const manifest = {
  scripts: { build: "tsc" },
  specController: {
    // THE CHECKOUT STEP IS NOT A CHECK, and under the inverted membership rule it is a
    // candidate until this target says so (@SCN-USG-013). An action is a candidate on the same
    // terms as a command — a quality check can BE an action — so a pipeline that opens with a
    // checkout answers for it here, exactly as a consumer's own manifest does.
    notChecks: ["ci.yml:quality:Checkout"],
    fitnessChecks: [
      { scn: "SCN-CVT-001", command: "eslint" },
      { scn: "SCN-CVT-002", command: "scn-subissues" },
    ],
  },
};

/**
 * The target's workflow — each check states the code of the row it answers, beside the step that
 * writes the record and the checkout that is not a check at all.
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

/**
 * THE RECORD OF A RUN ON WHICH BOTH CHECKS HELD. Its third entry is the step that wrote it — an id
 * no configured row answers, and the silence that earns is asserted below rather than assumed.
 */
const record: CiStepRecord = {
  "SCN-CVT-001": { outcome: "success", conclusion: "success" },
  "SCN-CVT-002": { outcome: "success", conclusion: "success" },
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
    runtimeObservations: [],
    deferralTags: [],
    ciStepRecord: record,
  });
}

describe("[SCN-LNT-021] a static check's step the run's record says succeeded credits its own row", () => {
  it("credits each row by the step citing its OWN @SCN, and both balance", () => {
    const reconciliation = reconcile();

    // THE LEDGER WHOLE, so a credit landing on the wrong row, or a second credit landing beside a
    // first, is visible rather than absorbed. Both rows read `satisfied` off their own step; under
    // the reader before this scenario neither credit is raised at all and both read `missing`.
    expect(
      reconciliation.ledger.scenarioReconciliations.map((row) => [
        row.scnId,
        row.kind,
        row.verdict,
        row.qualityCheckReconciliations.map((item) => [item.staticCheck, item.outcome]),
      ])
    ).toEqual([
      ["SCN-CVT-001", "scenario", "balanced", [[undefined, "satisfied"]]],
      ["SCN-CVT-002", "scenario", "balanced", [[undefined, "satisfied"]]],
    ]);
  });

  it("carries both facts as OBSERVED and cites the row's own code, no registry standing behind it", () => {
    // `exists` and `enforcedOverRealSource` are the two facts a static credit carries, and on this
    // route both are read off the run: the record says the step RAN, and it ran in the consumer's
    // own checkout over that checkout's tree. The citation keys are asserted beside them because
    // together they are the whole of "citing its own @SCN" — this manifest configures no registry,
    // so a reading that needed one would carry neither.
    const [first, second] = reconcile().ledger.scenarioReconciliations;
    expect(first?.qualityCheckReconciliations[0]?.evidenceObservation).toEqual({
      qualityCheck: "fitness",
      staticCheck: "SCN-CVT-001",
      scnId: "SCN-CVT-001",
      exists: true,
      enforcedOverRealSource: true,
      status: "passed",
    });
    expect(second?.qualityCheckReconciliations[0]?.evidenceObservation).toMatchObject({
      staticCheck: "SCN-CVT-002",
      scnId: "SCN-CVT-002",
    });
  });

  it("says nothing at all about the step that wrote the record, and the run is sound and in balance", () => {
    // THE SILENCE IS THE ASSERTION. `dump-the-step-record` succeeded exactly as the checks did, and
    // no configured row answers that id — so a reader crediting every entry it can read would put a
    // third row, or a suspense item, on a ledger that has neither. The two totals beside it are
    // where such a credit would surface if it landed nowhere visible.
    const reconciliation = reconcile();
    expect(reconciliation.ledger.scenarioReconciliations).toHaveLength(2);
    expect(reconciliation.summary.staticChecks).toEqual({
      runningStaticCheckCount: 2,
      uncitedStaticCheckCount: 0,
    });
    expect(hasBrokenEvidence(reconciliation.ledger)).toBe(false);
  });
});
