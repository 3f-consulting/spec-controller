/**
 * @unit for @SCN-LNT-031 — a discovered check whose CI step states the code of the row it runs
 * posts to that row; one whose step states none still posts to suspense.
 *
 * IT READS THROUGH THE WHOLE COMPOSITION, AND THAT IS THE POINT RATHER THAN A CONVENIENCE. Both
 * halves of this behaviour already existed one layer down — the CI walk carries a step's `id:`
 * (3F-3261) and the running-check observer reads it — and between them stood a composition that
 * handed the observer no citation seam at all. So an arm over either reader alone is green on a
 * tree where every annotated pipeline still reports as an unannotated one. Only the assembled
 * reconciliation can say where a run's credit LANDED.
 *
 * ONE TARGET, TWO CHECKS. The two steps run two scripts of one manifest, discovered by one prefix,
 * and differ in exactly one thing — whether the step states its row's code. Split across two
 * targets the pair could agree by accident: a reader citing nothing and a reader citing everything
 * each need a second run to catch, and the claim is that ONE run tells them apart.
 *
 * THE CHARACTERISTIC IS ASSERTED, NOT ONLY THE ROW. A citation is two terms, and only one of them
 * can be written on a CI step: an `id:` is a code and never a characteristic. So the credited
 * observation is read for its `checkTag` as well as its `scnId` — a `complexity` taken off the ROW
 * the code names, never off the `lint:alpha` handle that ran, which would be name-match in a new
 * spelling.
 *
 * Bidirectional evidence: the describe carries its @SCN id, matching
 * features/fitness-reconciliation.feature and the @integration steps in
 * tests/steps/lintReconciliation.steps.ts.
 */

import { describe, it, expect } from "vitest";
import { evidenceReconciliationFromSources } from "./evidenceReconciliationFromSources.js";
import type { EvidenceReconciliation } from "./renderInput.js";

/** The target's corpus — one stepless fitness scenario per configured row. */
const annotatedCorpus = `@CVT
Feature: an annotated target's fitness corpus

  Rule: the tree stays inside its thresholds

    @fitness @SCN-CVT-001
    Scenario: the codebase stays under its complexity threshold

    @fitness @SCN-CVT-002
    Scenario: every feature file carries a registered header code
`;

/** The target's manifest — two STATIC rows, each naming the script its own check runs. */
const manifest = {
  scripts: { "lint:alpha": "eslint", "lint:beta": "scn-subissues" },
  specController: {
    // THE CHECKOUT STEP IS NOT A CHECK, and under the inverted membership rule it is a
    // candidate until this target says so (@SCN-USG-013). An action is a candidate on the same
    // terms as a command — a quality check can BE an action — so a pipeline that opens with a
    // checkout answers for it here, exactly as a consumer's own manifest does.
    notChecks: ["ci.yml:quality:Checkout"],
    fitnessChecks: [
      { scn: "SCN-CVT-001", characteristic: "complexity", command: "pnpm lint:alpha" },
      { scn: "SCN-CVT-002", characteristic: "traceability", command: "pnpm lint:beta" },
    ],
  },
};

/**
 * The target's workflow — both checks are ordinary `run:` steps, and only the first states the
 * code of the row it runs.
 */
const annotatedCi = `name: fixture CI
jobs:
  quality:
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      - name: Complexity
        id: SCN-CVT-001
        run: pnpm lint:alpha
      - name: Traceability
        run: pnpm lint:beta
`;

/** The reconcile composition over that target, with no CI step record in sight. */
function reconcileAnnotated(): EvidenceReconciliation {
  return evidenceReconciliationFromSources({
    featureSources: [annotatedCorpus],
    untaggedScenarios: [],
    packageJson: manifest,
    ciSources: [annotatedCi],
    // The workflow FILE the exclusion above opens with — an entry can name no step of a
    // source this run was given no name for.
    ciSourceNames: ["ci.yml"],
    runtimeObservations: [],
    deferralTags: [],
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

describe("[SCN-LNT-031] a check step stating its row's code supplies that row's citation", () => {
  it("credits the row the annotated step names and leaves the unannotated check in suspense", () => {
    // THE LEDGER WHOLE, because the fault is a MISPLACEMENT rather than an absence: before the
    // seam was wired both credits landed on the suspense row and both rows read `missing`, so a
    // fully annotated pipeline and a fully unannotated one produced the identical ledger.
    expect(rowsOf(reconcileAnnotated())).toEqual([
      ["SCN-CVT-001", "scenario", "balanced", [["complexity", "satisfied"]]],
      ["SCN-CVT-002", "scenario", "out-of-balance", [["traceability", "missing"]]],
      ["(no scenario)", "suspense-scenario", "out-of-balance", [["lint:beta", "cites-no-scenario"]]],
    ]);
  });

  it("stamps the credited run with the characteristic its ROW names, not the handle that ran", () => {
    // BOTH TERMS OR NEITHER. The `@SCN` says which row the credit posts to and the bare check tag
    // says which of that row's obligations it answers, and a CI step can state only the first —
    // so a `checkTag` reading `lint:alpha` here would be the handle answering for the row.
    const credited = reconcileAnnotated().ledger.scenarioReconciliations.find(
      (row) => row.scnId === "SCN-CVT-001"
    );
    expect(credited?.evidenceObservations).toEqual([
      {
        qualityCheck: "lint",
        staticCheck: "lint:alpha",
        exists: true,
        enforcedOverRealSource: true,
        scnId: "SCN-CVT-001",
        checkTag: "complexity",
      },
    ]);
  });
});
