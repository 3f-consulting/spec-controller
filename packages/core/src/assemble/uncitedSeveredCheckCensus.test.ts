/**
 * @unit for @SCN-LNT-033 — the static-check census counts only the checks the job's verdict
 * depends on, ON BOTH OF ITS COUNTS, so the named count it implies stays sound.
 *
 * IT READS THE CENSUS OFF THE WHOLE COMPOSITION rather than folding a hand-built Ledger. The two
 * counts are a fold over the credits the RECONCILER posted, so a Ledger assembled here would be a
 * second opinion about which account each credit lands in — and the claim is precisely that the
 * two counts agree about the credits the product itself posts. Only the assembled reconciliation
 * can say what the census LINE ends up reading.
 *
 * WHAT SEPARATES THIS FROM @SCN-LNT-032 IS THE READER, not the key. That scenario is the NAMED
 * row, where an obligation exists and its outcome moves. Here there is no obligation at all and no
 * row moves: what moves is the census, and the figure a consumer takes from it is the subtraction
 * neither count prints — the checks that run AND something names.
 *
 * THE TARGET REGISTERS BOTH HANDLES AND CARRIES NEITHER TAG, which is what leaves the severance as
 * the only variable. The two checks are identical in prefix, in manifest, in registry treatment and
 * in their absence from the corpus; the job's verdict depends on one and not the other. A fixture
 * whose two checks also differed in their citation could report this census for a reason that has
 * nothing to do with the key.
 *
 * Bidirectional evidence: the describe carries its @SCN id, matching
 * features/fitness-reconciliation.feature and the @integration steps in
 * tests/steps/lintReconciliation.steps.ts.
 */

import { describe, it, expect } from "vitest";
import { evidenceReconciliationFromSources } from "./evidenceReconciliationFromSources.js";
import type { EvidenceReconciliation } from "./renderInput.js";

/**
 * The target's corpus — one scenario, carrying NEITHER check's bare tag.
 *
 * The tag it does carry is what makes this a corpus rather than an empty file. A tag naming either
 * check would make that check CITED and take the whole claim away, since what this target is for
 * is the count of the checks nothing names.
 */
const uncitedCorpus = `@TSC
Feature: a fixture target whose corpus names neither of the two static checks its CI runs

  Rule: the target holds itself to the one behaviour it has written down

    @unit @SCN-TSC-001
    Scenario: the target keeps a behaviour it has actually specified
`;

/**
 * The target's manifest — two static checks, BOTH registered and NEITHER carried by the corpus.
 *
 * Registered-but-uncarried is the shape only the one posting rule can produce: the seam resolves a
 * bare check for each handle and then reaches no `@SCN` for either, so both credits cite nothing
 * and fold onto the suspense row. Leaving one out of the registry would put it there for a second
 * reason, and the pair would stop being a pair.
 */
const uncitedManifest = {
  scripts: {
    "lint:advisory": "eslint",
    "lint:enforced": "anemic-domain",
  },
  specController: {
    checkRegistry: {
      "lint:advisory": "complexity",
      "lint:enforced": "tech-conformance",
    },
  },
};

/** The target's workflow — two ordinary `run:` steps, one of which the job's verdict survives. */
const uncitedCi = `name: fixture CI
on: [push, pull_request]
jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      - name: Advisory analysis
        continue-on-error: true
        run: pnpm lint:advisory
      - name: Enforced analysis
        run: pnpm lint:enforced
`;

/** The reconcile composition over that target, with no CI step record in sight. */
function reconcileUncited(): EvidenceReconciliation {
  return evidenceReconciliationFromSources({
    featureSources: [uncitedCorpus],
    untaggedScenarios: [],
    packageJson: uncitedManifest,
    ciSources: [uncitedCi],
    measurements: {},
    runtimeObservations: [],
    deferralTags: [],
    guardScriptPrefixes: ["lint:"],
    killFloor: () => null,
  });
}

describe("[SCN-LNT-033] the static-check census counts only the checks the job's verdict depends on", () => {
  it("counts the severed uncited check in neither census count", () => {
    // BOTH COUNTS AS ONE VALUE, because the fault is a DISAGREEMENT between them rather than a
    // wrong number in either. Asserting the uncited count alone would pass over a reader that had
    // narrowed the running count to nothing as well, which is the opposite fault and just as
    // wrong: two counts that agree by both being empty report a pipeline with no checks in it.
    expect(reconcileUncited().summary.staticChecks).toEqual({
      runningStaticCheckCount: 1,
      uncitedStaticCheckCount: 1,
    });
  });

  it("leaves the named count it implies at nil, and never below it", () => {
    // THE FIGURE NOBODY PRINTS, ASSERTED ANYWAY. `running − uncited` is stated as the named count
    // in the tally's own docblock and read by anyone holding the pair, and it is where the
    // asymmetry surfaces: on this target the untreated fold reports −1 named checks, a number no
    // pipeline can have. One severed uncited check is all it takes.
    const census = reconcileUncited().summary.staticChecks;
    const named = (census?.runningStaticCheckCount ?? 0) - (census?.uncitedStaticCheckCount ?? 0);
    expect(named).toBe(0);
  });

  it("still POSTS both checks to the suspense row, the severed one included", () => {
    // THE COUNT MOVES AND THE POSTING DOES NOT, which is the one way to get this backwards.
    // Dropping the severed check from the STREAM would satisfy the counts above by deleting the
    // check from the report — the reader would never learn they are running a check that guards
    // nothing and that nobody has named, which is two omissions at once and silent. It is counted
    // as neither running nor uncited, and it is still on the books.
    const suspense = reconcileUncited().ledger.scenarioReconciliations.filter(
      (row) => row.kind === "suspense-scenario"
    );
    expect(suspense.flatMap((row) => row.evidenceObservations)).toEqual([
      {
        qualityCheck: "lint",
        staticCheck: "lint:advisory",
        exists: true,
        enforcedOverRealSource: false,
      },
      {
        qualityCheck: "lint",
        staticCheck: "lint:enforced",
        exists: true,
        enforcedOverRealSource: true,
      },
    ]);
  });
});
