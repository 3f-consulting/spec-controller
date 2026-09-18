/**
 * @unit for @SCN-LNT-026 — a check step's outcome credits its row only where it says WHAT THE CHECK
 * DID, and every other reading is broken evidence rather than a credit.
 *
 * ALL FOUR READINGS FROM ONE RECORD, WHICH IS WHY THEY ARE ONE FILE. The four entries below are
 * written down in one document about one run of one pipeline, and their rows are identical in
 * shape — static, one characteristic apiece, one command apiece, not one of them naming an ending
 * its command says it examined nothing with. Split across four records the set could agree by
 * accident: a reader crediting everything and a reader crediting nothing would each need a second
 * run to catch, when the whole claim is that ONE record draws the line between them.
 *
 * THE SENTENCE THAT MOVED. This scenario's text used to read "the credit is reached by the two
 * readings that say the check ran — every step passed, or a step failed". That collapse was honest
 * while a runner ran the checks: a check finding violations reddened the run through the runner's
 * exit code, so the credit only had to say the check ran. A CI step's exit code reaches this ledger
 * nowhere, so the failed step's credit carries what it found and its row REDS rather than balancing
 * beside the row whose check passed.
 *
 * THE HALF THAT DID NOT MOVE IS THE FALL-THROUGH, and it is asserted twice over rather than once. A
 * status this reader cannot vouch for is a check whose running it cannot vouch for — so a skip no
 * row asked for and a status nobody anticipated both reach `broken`, which carries no Evidence
 * Observation, leaves the obligation reconciling missing by absence, and stamps the run unsound.
 * No row can excuse a skip, so every skip reaches `broken` by the same route (3F-3252).
 *
 * THE CLAIM IS AN ABSENCE ON TWO OF THE FOUR ROWS, SO THE INSTRUMENT IS A CARDINALITY ONE. A stray
 * credit on either uncredited row is ABSORBED — each row does name its own characteristic, so the
 * extra credit answers its own obligation, never reaches the suspense row, and leaves that row
 * reading BALANCED. Asking what would FAIL answers nothing here; asking what would stop being
 * COUNTED answers in each row's credit list, asserted whole, and in the running-static-check total
 * beside it.
 *
 * IT READS THROUGH THE WHOLE RECONCILE COMPOSITION, for this axis's usual reason: the claim is
 * about what the LEDGER says, and a reader emitting an impeccable observation the composition never
 * threads produces exactly the ledger a reader emitting nothing produces.
 *
 * Bidirectional evidence: the describe carries its @SCN id, matching
 * features/fitness-reconciliation.feature and the @integration steps in
 * tests/steps/lintReconciliation.steps.ts.
 */

import { describe, it, expect } from "vitest";
import type { CiStepRecord } from "../parse/ciStepRecord.js";
// The run-integrity predicate the CLI and the renderer both ask, so "is this run unsound" is read
// here exactly as they read it rather than re-derived from the items.
import { hasBrokenEvidence } from "../domain/ledger.js";
import { evidenceReconciliationFromSources } from "./evidenceReconciliationFromSources.js";
import type { EvidenceReconciliation } from "./renderInput.js";

/**
 * The target's corpus — four stepless fitness scenarios, each named by one configured row, and no
 * characteristic tag anywhere in it. None of the four words the rows name appears in this source,
 * which is what makes every expectation below a claim about the rows rather than about a tag that
 * happens to spell the same word.
 */
const corpus = `@CVT
Feature: a converted target's fitness corpus

  Rule: the tree stays inside its thresholds

    @fitness @SCN-CVT-001
    Scenario: the codebase stays under its complexity threshold

    @fitness @SCN-CVT-002
    Scenario: every scenario in the corpus is traceable to its own sub-issue

    @fitness @SCN-CVT-003
    Scenario: the codebase carries no duplicated block above its threshold

    @fitness @SCN-CVT-004
    Scenario: every documented command is one this repository still ships
`;

/**
 * The target's manifest — four STATIC rows, no check registry, and four commands that are BARE ones
 * rather than scripts of this manifest. A guard-prefixed handle would be DISCOVERED from the
 * workflow below and observed by the derivation reader, whose credit would answer these rows'
 * obligations first.
 *
 * NO ROW CAN BUY ITS SKIP A CREDIT, and there is no field left with which to try (3F-3252), so the
 * fixture needs no second half holding it to one.
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
      { scn: "SCN-CVT-001", characteristic: "complexity", command: "eslint" },
      { scn: "SCN-CVT-002", characteristic: "traceability", command: "scn-subissues" },
      { scn: "SCN-CVT-003", characteristic: "duplication", command: "jscpd" },
      { scn: "SCN-CVT-004", characteristic: "doc-accuracy", command: "doc-audit" },
    ],
  },
};

/**
 * The target's workflow — four check steps, each stating the code of the row it answers, all four
 * wired identically. Nothing in this file tells the four apart, so everything the reader is heard
 * to say differently about them came from the record.
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
      - name: Duplication
        id: SCN-CVT-003
        if: always()
        run: jscpd
      - name: Doc accuracy
        id: SCN-CVT-004
        if: always()
        run: doc-audit
      - name: Dump this run's step record
        id: dump-the-step-record
        if: always()
        env:
          STEPS_JSON: \${{ toJSON(steps) }}
        run: printf '%s' "$STEPS_JSON" > ci-steps.json
`;

/**
 * ONE RUN'S RECORD, SAYING FOUR DIFFERENT THINGS. A step that succeeded, a step that failed, a step
 * that was skipped with no row asking for it, and a step carrying a status nobody anticipated — and
 * the step that wrote the record, which no configured row answers.
 */
const record: CiStepRecord = {
  "SCN-CVT-001": { outcome: "success", conclusion: "success" },
  "SCN-CVT-002": { outcome: "failure", conclusion: "failure" },
  "SCN-CVT-003": { outcome: "skipped", conclusion: "skipped" },
  "SCN-CVT-004": { outcome: "neutral", conclusion: "neutral" },
  "dump-the-step-record": { outcome: "success", conclusion: "success" },
};

/** The reconcile composition over that target, handed the one record its run wrote. */
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

/** The rows the corpus authored, each with the credits its Evidence Obligation was answered by. */
function scenarioRows(reconciliation: EvidenceReconciliation): [string, string, unknown[]][] {
  return reconciliation.ledger.scenarioReconciliations
    .filter((row) => row.kind === "scenario")
    .map((row) => [
      row.scnId,
      row.verdict,
      row.qualityCheckReconciliations.map((item) => [item.staticCheck, item.outcome]),
    ]);
}

/** The suspense row's reconciling items, as `[outcome, message]` — where broken evidence surfaces. */
function suspenseItemsOf(reconciliation: EvidenceReconciliation): unknown[] {
  const row = reconciliation.ledger.scenarioReconciliations.find(
    (r) => r.kind === "suspense-scenario"
  );
  return (row?.qualityCheckReconciliations ?? []).map((item) => [item.outcome, item.message]);
}

describe("[SCN-LNT-026] a check step's outcome credits its row only where it says what the check did", () => {
  it("credits the step that succeeded and the step that failed, and neither of the other two", () => {
    // ALL FOUR ROWS' CREDIT LISTS WHOLE, from one record. The step that succeeded balances; the
    // step that failed reds off its OWN verdict rather than balancing beside it — the sentence that
    // moved; and the two readings this reader cannot vouch for are credited by nothing at all.
    expect(scenarioRows(reconcile())).toEqual([
      ["SCN-CVT-001", "balanced", [["complexity", "satisfied"]]],
      ["SCN-CVT-002", "out-of-balance", [["traceability", "failing"]]],
      ["SCN-CVT-003", "out-of-balance", [["duplication", "missing"]]],
      ["SCN-CVT-004", "out-of-balance", [["doc-accuracy", "missing"]]],
    ]);
  });

  it("carries the failed step's verdict on its own observation, because nothing else carries it", () => {
    // THE VERDICT TRAVELS OR IT DOES NOT TRAVEL. A credit saying only "it ran" leaves this row
    // balanced over a check that found violations, which is this axis's own headline fault arriving
    // by the front door. The citation keys are asserted beside the verdict because this manifest
    // configures no check registry: a reading that needed one would carry neither.
    const failed = reconcile().ledger.scenarioReconciliations.find(
      (row) => row.scnId === "SCN-CVT-002"
    );
    expect(failed?.qualityCheckReconciliations[0]?.evidenceObservation).toEqual({
      qualityCheck: "lint",
      staticCheck: "traceability",
      scnId: "SCN-CVT-002",
      checkTag: "traceability",
      exists: true,
      enforcedOverRealSource: true,
      status: "failed",
    });
  });

  it("stamps the run unsound, naming each step it has no reading for and what the record said", () => {
    // THE DEFAULT IS THE SAFE ONE, ASSERTED TWICE OVER. A broken item carries no observation, so
    // its message is the whole of what a reader gets — it names the @SCN, says what the record
    // said, and prescribes no cure: which of a condition that went false, a cancelled job or a
    // provider spelling things differently produced it is not this reader's to say.
    const reconciliation = reconcile();
    expect(
      hasBrokenEvidence({ scenarioReconciliations: reconciliation.ledger.scenarioReconciliations })
    ).toBe(true);
    expect(suspenseItemsOf(reconciliation)).toEqual([
      [
        "broken",
        "SCN-CVT-003: the CI run's record says this check's step was skipped — so the check did not run.",
      ],
      [
        "broken",
        "SCN-CVT-004: the CI run's record says this check's step ended `neutral` — so the check " +
          "did not run.",
      ],
    ]);
  });

  it("counts TWO running static checks over a record holding four check steps", () => {
    // THE CARDINALITY INSTRUMENT. A reader crediting every reading leaves all four rows carrying a
    // credit and says so with two different verdicts, so the discriminating fact is HOW MANY
    // running static checks the ledger holds: four under such a reader, two here. A check that did
    // not run is not a running one, and it is not an uncited one either — and the step that wrote
    // the record is a fifth entry no configured row answers, silent in both counts.
    expect(reconcile().summary.staticChecks).toEqual({
      runningStaticCheckCount: 2,
      uncitedStaticCheckCount: 0,
    });
  });
});
