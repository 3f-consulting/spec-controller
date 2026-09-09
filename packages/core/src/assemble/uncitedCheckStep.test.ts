/**
 * @unit for @SCN-LNT-029 — a pipeline nobody has annotated is reported as every check it runs,
 * each citing no scenario, and the steps that are not checks are reported nowhere at all.
 *
 * IT READS THE LEDGER WHOLE, WHICH IS THE ONLY WAY THIS CLAIM CAN BE MADE. What `new-client`
 * promises is a REPORT, and a report is a cardinality before it is a value: an arm that looked one
 * uncited check up and found it in suspense would pass over a reader that had stopped raising the
 * other two, and over one that had started raising the install step beside them. So every row and
 * every item on it is asserted, and the population is the assertion.
 *
 * THE TARGET HAS NO CORPUS AND NO CONFIGURED ROW, because that is what the state IS. A consumer on
 * their first run has specified nothing — so there is no scenario a credit could have landed on by
 * accident, no row the suspense one could be mistaken for, and the whole report is one row. It
 * costs them nothing to obtain, which is the property this arm exists to keep true.
 *
 * THE SILENCE IS ASSERTED THROUGH `build`, NOT ONLY THROUGH `checkout`. Checkout and the toolchain
 * set-up are not scripts at all and could never be discovered; `pnpm build` runs a script the
 * manifest really holds, from a real `run:` step, and is excluded only because it carries no guard
 * prefix and no `staticChecks` entry names it. That is the discriminator actually discriminating,
 * rather than a step that was out of reach anyway.
 *
 * Bidirectional evidence: the describe carries its @SCN id, matching
 * features/fitness-reconciliation.feature and the @integration steps in
 * tests/steps/lintReconciliation.steps.ts.
 */

import { describe, it, expect } from "vitest";
import { evidenceReconciliationFromSources } from "./evidenceReconciliationFromSources.js";
import type { EvidenceReconciliation } from "./renderInput.js";

/**
 * The target's manifest — four scripts, three of which the check heuristic reaches: two under the
 * guard prefix and one the target names as a static check. No `fitnessChecks`, because a consumer
 * in this state has configured nothing.
 */
const manifest = {
  scripts: {
    "lint:alpha": "eslint",
    "lint:beta": "scn-subissues",
    typecheck: "tsc --noEmit",
    build: "tsup",
  },
  specController: { staticChecks: ["typecheck"] },
};

/**
 * The target's workflow — three checks and four steps that are not checks, and not one `id:`
 * anywhere. `pnpm build` is the sharp exclusion: a real script, really invoked, that the
 * heuristic does not reach.
 */
const unannotatedCi = `name: fixture CI
jobs:
  quality:
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      - name: Set up Node
        uses: actions/setup-node@v4
      - name: Install
        run: pnpm install --frozen-lockfile
      - name: Build
        run: pnpm build
      - name: Complexity
        run: pnpm lint:alpha
      - name: Traceability
        run: pnpm lint:beta
      - name: Types
        run: pnpm typecheck
`;

/** The reconcile composition over that target: its manifest and its workflow, and nothing else. */
function reconcileUnannotated(): EvidenceReconciliation {
  return evidenceReconciliationFromSources({
    featureSources: [],
    untaggedScenarios: [],
    packageJson: manifest,
    ciSources: [unannotatedCi],
    measurements: {},
    runtimeObservations: [],
    deferralTags: [],
    guardScriptPrefixes: ["lint:"],
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

describe("[SCN-LNT-029] an unannotated pipeline is reported as every check it runs, citing nothing", () => {
  it("puts every check on the one suspense row and reports the steps that are not checks nowhere", () => {
    // THE WHOLE REPORT, AS THE CONSUMER WOULD READ IT. One row, three items, one per check their
    // pipeline runs — and `build`, `install`, the checkout and the toolchain set-up on none of
    // them. This list IS the first useful sentence this axis says to a pipeline nobody has
    // specified, so its length is as load-bearing as its contents.
    expect(rowsOf(reconcileUnannotated())).toEqual([
      [
        "(no scenario)",
        "suspense-scenario",
        "out-of-balance",
        [
          ["lint:alpha", "cites-no-scenario"],
          ["lint:beta", "cites-no-scenario"],
          ["typecheck", "cites-no-scenario"],
        ],
      ],
    ]);
  });

  it("carries the handle that ran and no citation at all, so nothing was manufactured for it", () => {
    // BOTH TERMS OR NEITHER, read from the observation rather than off the row's outcome. A
    // reader that had invented a code to file these under would still report `cites-no-scenario`
    // nowhere — it would report them somewhere else entirely — but one that manufactured a HALF
    // citation would land here looking correct, and the ledger would be carrying a shape no
    // reader downstream knows how to read.
    expect(reconcileUnannotated().ledger.scenarioReconciliations[0]?.evidenceObservations).toEqual([
      {
        qualityCheck: "lint",
        staticCheck: "lint:alpha",
        exists: true,
        enforcedOverRealSource: true,
      },
      {
        qualityCheck: "lint",
        staticCheck: "lint:beta",
        exists: true,
        enforcedOverRealSource: true,
      },
      {
        qualityCheck: "lint",
        staticCheck: "typecheck",
        exists: true,
        enforcedOverRealSource: true,
      },
    ]);
  });
});
