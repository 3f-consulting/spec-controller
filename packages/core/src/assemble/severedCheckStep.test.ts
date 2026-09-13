/**
 * @unit for @SCN-LNT-032 — a check the job's verdict does not depend on reconciles as the
 * watermelon, wherever the severance is written, beside a sibling check whose red IS that verdict.
 *
 * IT READS THROUGH THE WHOLE COMPOSITION, because the fact was already correct one layer down and
 * still never arrived. `abortsJob` has been read off both carriers since 3F-3042 and every consumer
 * it reached was under `tests/`; an arm over the walk alone is green on a tree where the published
 * reader certifies a severed check as satisfied. Only the assembled reconciliation can say what the
 * ROW ends up reading.
 *
 * BOTH OBSERVERS ARE LOAD-BEARING HERE, AND THE TARGET IS SHAPED SO THAT THEY ARE. The first check
 * is registered, so the corpus obliges its handle and the OBLIGATION-side observer answers for it
 * while the running-check stream drops it; the second and third are configured rows their steps
 * cite, so the RUNNING-check observer answers for those. Neither module can be reverted without
 * redding this arm, which is what stops one of the two being threaded and called done.
 *
 * THREE CHECKS FROM ONE TARGET. They run under one manifest, are discovered by one prefix, and
 * differ in exactly one thing — where the severance is written, or whether it is written at all.
 * Split across three targets they could agree by accident: a reader that flags everything and a
 * reader that flags nothing each need a second run to catch, and the claim is that ONE run tells
 * them apart.
 *
 * Bidirectional evidence: the describe carries its @SCN id, matching
 * features/fitness-reconciliation.feature and the @integration steps in
 * tests/steps/lintReconciliation.steps.ts.
 */

import { describe, it, expect } from "vitest";
import { evidenceReconciliationFromSources } from "./evidenceReconciliationFromSources.js";
import type { EvidenceReconciliation } from "./renderInput.js";

/** The target's corpus — one stepless fitness scenario per check its manifest names. */
const severedCorpus = `@CVT
Feature: a target's fitness corpus, two of whose three checks the job's verdict does not depend on

  Rule: the tree stays inside its thresholds

    @complexity @SCN-CVT-001
    Scenario: the codebase stays under its complexity threshold

    @fitness @SCN-CVT-002
    Scenario: every scenario is matched by a sub-issue

    @fitness @SCN-CVT-003
    Scenario: the domain holds its own behaviour
`;

/**
 * The target's manifest — three static checks named two ways, so both observers answer.
 *
 * The REGISTERED handle reaches the obligation-side observer (its check tag is one the corpus
 * carries, which is what puts it on `checkHandles`); the two CONFIGURED rows reach the
 * running-check observer, whose steps cite them by code.
 */
const severedManifest = {
  scripts: {
    "lint:alpha": "eslint",
    "lint:beta": "scn-subissues",
    "lint:gamma": "anemic-domain",
  },
  specController: {
    // THE CHECKOUT STEP IS NOT A CHECK, and under the inverted membership rule it is a
    // candidate until this target says so (@SCN-USG-013). An action is a candidate on the same
    // terms as a command — a quality check can BE an action — so a pipeline that opens with a
    // checkout answers for it here, exactly as a consumer's own manifest does.
    notChecks: ["ci.yml:quality:Checkout"],
    checkRegistry: { "lint:alpha": "complexity" },
    fitnessChecks: [
      { scn: "SCN-CVT-002", characteristic: "traceability", command: "pnpm lint:beta" },
      { scn: "SCN-CVT-003", characteristic: "tech-conformance", command: "pnpm lint:gamma" },
    ],
  },
};

/**
 * The target's workflow — three ordinary `run:` steps, severed in the two places GitHub spells the
 * key and in neither place for the third.
 *
 * TWO JOBS, BECAUSE A JOB-LEVEL KEY REACHES EVERY STEP IN ITS JOB. The job-carried severance is a
 * fact about the job, so the check it severs cannot sit beside the one whose red is still the
 * verdict — a single job carrying the key would sever all three and the arm would stop
 * discriminating anything while still reading green on one half.
 */
const severedCi = `name: fixture CI
jobs:
  quality:
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      - name: Complexity
        continue-on-error: true
        run: pnpm lint:alpha
      - name: Anemic domain
        id: SCN-CVT-003
        run: pnpm lint:gamma
  advisory:
    continue-on-error: true
    steps:
      - name: Scenario sub-issue match
        id: SCN-CVT-002
        run: pnpm lint:beta
`;

/** The reconcile composition over that target, with no CI step record in sight. */
function reconcileSevered(): EvidenceReconciliation {
  return evidenceReconciliationFromSources({
    featureSources: [severedCorpus],
    untaggedScenarios: [],
    packageJson: severedManifest,
    ciSources: [severedCi],
    // The workflow FILE the exclusion above opens with — an entry can name no step of a
    // source this run was given no name for.
    ciSourceNames: ["ci.yml"],
    measurements: {},
    runtimeObservations: [],
    deferralTags: [],
    killFloor: () => null,
  });
}

/** Every ledger row as `[scnId, kind, verdict, [[staticCheck, outcome], …]]`. */
function rowsOf(reconciliation: EvidenceReconciliation) {
  return reconciliation.ledger.scenarioReconciliations.map((row) => [
    row.scnId,
    row.kind,
    row.verdict,
    row.qualityCheckReconciliations.map((item) => [item.staticCheck, item.outcome]),
  ]);
}

describe("[SCN-LNT-032] a check the job's verdict does not depend on reconciles as the watermelon", () => {
  it("reads the watermelon off both carriers of the severance and leaves the sibling satisfied", () => {
    // THE LEDGER WHOLE, because what this watches for is a DISCRIMINATION rather than one row's
    // value. Asserting only the severed rows would pass over a reader that had started flagging
    // the third as well, which is the opposite fault and just as wrong.
    expect(rowsOf(reconcileSevered())).toEqual([
      ["SCN-CVT-001", "scenario", "out-of-balance", [["complexity", "watermelon"]]],
      ["SCN-CVT-002", "scenario", "out-of-balance", [["traceability", "watermelon"]]],
      ["SCN-CVT-003", "scenario", "balanced", [["tech-conformance", "satisfied"]]],
    ]);
  });

  it("still OBSERVES a severed check, as one that exists and enforces nothing", () => {
    // THE FIELD MOVES AND THE MEMBERSHIP FILTER DOES NOT, which is the one way to get this
    // backwards. `runningStaticChecks` decides whether a script is observed AT ALL by asking
    // whether any step invokes it; narrowing THAT on `abortsJob` would delete a severed check from
    // the report rather than surface it — the same fault this scenario closes, reached from the
    // other side, and silent. A watermelon that carries no observation is that mistake showing.
    const observed = reconcileSevered()
      .ledger.scenarioReconciliations.filter((row) => row.scnId !== "SCN-CVT-003")
      .flatMap((row) => row.evidenceObservations);
    expect(observed).toEqual([
      {
        qualityCheck: "lint",
        staticCheck: "lint:alpha",
        exists: true,
        enforcedOverRealSource: false,
        scnId: "SCN-CVT-001",
        checkTag: "complexity",
      },
      {
        qualityCheck: "lint",
        staticCheck: "lint:beta",
        exists: true,
        enforcedOverRealSource: false,
        scnId: "SCN-CVT-002",
        checkTag: "traceability",
      },
    ]);
  });
});
