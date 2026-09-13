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
 * WHAT KEEPS THE PLUMBING OFF THE BOOKS IS THE TARGET'S OWN LIST, NOT A HEURISTIC OF OURS
 * (@SCN-USG-004, 3F-3343). It used to be the check heuristic: `pnpm build` runs a script the
 * manifest really holds, from a real `run:` step, and was silent only because it carried no guard
 * prefix and no `staticChecks` entry named it. Nothing decides that by a name any more, so the
 * install and build steps are candidates like any other and this target names them non-checks —
 * one line each, which is what the inversion asks of a consumer in place of a convention.
 *
 * AND THEY ARE NOT SILENT NOW, THEY ARE ACCOUNTED. An excluded step is named on the report under
 * its own section; what this arm holds is that it is not on the BOOKS, which is the half that
 * would drown the sentence the report exists to say.
 *
 * Bidirectional evidence: the describe carries its @SCN id, matching
 * features/fitness-reconciliation.feature and the @integration steps in
 * tests/steps/lintReconciliation.steps.ts.
 */

import { describe, it, expect } from "vitest";
import { evidenceReconciliationFromSources } from "./evidenceReconciliationFromSources.js";
import type { EvidenceReconciliation } from "./renderInput.js";

/**
 * The target's manifest — four scripts, three of which are checks its pipeline runs. Two carry a
 * guard prefix and one is named a static check, which is how the retired check heuristic reached
 * them; discovery reaches all three because their STEPS are steps (@SCN-USG-004), and the fourth
 * (`build`) is off the books because the target says so. No `fitnessChecks`, because a consumer in
 * this state has configured nothing about its rows.
 */
const manifest = {
  scripts: {
    "lint:alpha": "eslint",
    "lint:beta": "scn-subissues",
    typecheck: "tsc --noEmit",
    build: "tsup",
  },
  specController: {
    staticChecks: ["typecheck"],
    // The four steps of the pipeline below that are not checks — the `uses:` pair among them, on
    // the same terms as the two commands (@SCN-USG-013). A quality check can BE an action, so
    // there is no shape a step can take that answers this question for its author; the consumer
    // answers it, once, about their own pipeline.
    notChecks: [
      "ci.yml:quality:Checkout",
      "ci.yml:quality:Set up Node",
      "ci.yml:quality:Install",
      "ci.yml:quality:Build",
    ],
  },
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
    // The workflow FILE the entries above open with — the one half of an exclusion that does not
    // come out of the workflow's own text, and which a caller supplying none makes unnameable.
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
