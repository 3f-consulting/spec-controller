/**
 * @unit for @SCN-LNT-033 — the static-check census counts a check whose red its job survives as a
 * check that RAN, ON BOTH OF ITS COUNTS, so the named count it implies stays sound (3F-3280, ruled
 * 2026-09-17: change the count, not the word — whether the check enforces is its row's answer).
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
 * tests/steps/fitnessReconciliation.steps.ts.
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
    // THE CHECKOUT STEP IS NOT A CHECK, and under the inverted membership rule it is a
    // candidate until this target says so (@SCN-USG-013). An action is a candidate on the same
    // terms as a command — a quality check can BE an action — so a pipeline that opens with a
    // checkout answers for it here, exactly as a consumer's own manifest does.
    notChecks: ["ci.yml:quality:Checkout"],
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
    // The workflow FILE the exclusion above opens with — an entry can name no step of a
    // source this run was given no name for.
    ciSourceNames: ["ci.yml"],
    runtimeObservations: [],
    deferralTags: [],
  });
}

describe("[SCN-LNT-033] the static-check census counts a check whose red its job survives as a check that ran", () => {
  it("counts the severed uncited check in both census counts", () => {
    // BOTH COUNTS AS ONE VALUE, because each wrong answer is a DISAGREEMENT between them. The
    // enforced-only rule reads {1, 1}: one check fewer than ran. Counting the severed check as
    // running but not as uncited reads {2, 1}, and the one check nothing names turns into a named
    // one. Only {2, 2} says what ran and what nothing names.
    expect(reconcileUncited().summary.staticChecks).toEqual({
      runningStaticCheckCount: 2,
      uncitedStaticCheckCount: 2,
    });
  });

  it("leaves the named count it implies at nil, and never below it", () => {
    // THE FIGURE NOBODY PRINTS, ASSERTED ANYWAY. `running − uncited` is stated as the named count
    // in the tally's own docblock and read by anyone holding the pair, and it is where an
    // asymmetry between the two counts surfaces: a fold that took the severed check into one count
    // and not the other reports +1 or −1 named checks on a target whose corpus names none.
    const census = reconcileUncited().summary.staticChecks;
    const named = (census?.runningStaticCheckCount ?? 0) - (census?.uncitedStaticCheckCount ?? 0);
    expect(named).toBe(0);
  });

  it("still POSTS both checks to the suspense row, the severed one included", () => {
    // THE COUNT MOVES AND THE POSTING DOES NOT, which is the one way to get this backwards.
    // Dropping the severed check from the STREAM would satisfy the counts above by deleting the
    // check from the report — the reader would never learn they are running a check that guards
    // nothing and that nobody has named, which is two omissions at once and silent. It is counted
    // as running and as uncited, and it is on the books still carrying enforcedOverRealSource: false.
    const suspense = reconcileUncited().ledger.scenarioReconciliations.filter(
      (row) => row.kind === "suspense-scenario"
    );
    expect(suspense.flatMap((row) => row.evidenceObservations)).toEqual([
      {
        qualityCheck: "fitness",
        staticCheck: "lint:advisory",
        exists: true,
        enforcedOverRealSource: false,
      },
      {
        qualityCheck: "fitness",
        staticCheck: "lint:enforced",
        exists: true,
        enforcedOverRealSource: true,
      },
    ]);
  });
});
