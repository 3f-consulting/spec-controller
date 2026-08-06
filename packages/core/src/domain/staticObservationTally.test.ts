/**
 * Unit test for the static-observation tally (@SCN-USG-001, 3F-2118) — the Ledger fold that OWNS
 * the static-check counting (the retired static census's home, relocated here from
 * `census/staticEvidenceObservations.test.ts`).
 *
 * Bidirectional evidence (Evidence Manifesto §9): the describe carries @SCN-USG-001, matching
 * features/uncited-static-check.feature, so a grep of the id returns both halves.
 *
 * `staticObservationTally` walks the POSTED static-check CREDITS on the Ledger rows (@SCN-LDG-022)
 * and reads each off the row it posted to — the reconciler's own ruling, never re-classified. It is
 * MORE CAREFUL than the runtime fold on the two axes the static posting rules differ on
 * (double-entry-manifesto.md line 160, @SCN-LDG-024):
 *   - IDENTITY-DEDUPE the named side — a guard named by N scenarios is the SAME object posted
 *     N times by reference, so it must count ONCE (never N).
 *   - FILTER TO RUNNING (`exists && enforcedOverRealSource`) — a named watermelon (exists,
 *     unwired) or missing (absent) guard STILL posts (posting is not classifying), but does not RUN,
 *     so it is excluded, matching the retired census's running-only `continue`.
 * The Ledger is BUILT BY `reconcile()` over a spanning corpus, never hand-written
 * (evidence-manifesto §11A): the fixture can only state posted-entry shapes the pipeline emits.
 *
 * Parent: (@SCN-USG-001) — the static-observation tally is the Ledger's own fold.
 */

import { describe, it, expect } from "vitest";

import { staticObservationTally } from "./ledger.js";
import { reconcile } from "./evidenceReconciliation.js";
import { runningStaticChecks } from "../parse/runningStaticChecks.js";
import type { PackageJsonScripts } from "../parse/checkScriptsRunInCI.js";
import type {
  EvidenceObservation,
  Ledger,
  Scenario,
  ScenarioReconciliation,
} from "../model.js";

describe("[SCN-USG-001] staticObservationTally folds the posted static-check credits, deduped and running-filtered", () => {
  // A SPANNING corpus reconciling to every static-check credit shape:
  //   lint:foo — RUNNING, named by TWO scenarios (SCN-A + SCN-B): ONE object posted twice by
  //              reference (@SCN-LDG-024) → the identity-dedupe must count it ONCE.
  //   lint:water — a named WATERMELON (exists, unwired): posts to SCN-C but does NOT run → the
  //                running filter excludes it.
  //   lint:absent — a named MISSING guard (absent): posts to SCN-D but does NOT run → excluded.
  //   lint:bar — RUNNING, no-evidence-obligation (no @lint cites it): the reconciler folds it to the SUSPENSE
  //              row → the 1 uncited static check.
  // Built through reconcile(), so every row is a shape the pipeline actually emits.
  const scenarios: Scenario[] = [
    { scnId: "SCN-A", evidenceObligations: [{ qualityCheck: "lint", staticCheck: "lint:foo" }] },
    { scnId: "SCN-B", evidenceObligations: [{ qualityCheck: "lint", staticCheck: "lint:foo" }] },
    { scnId: "SCN-C", evidenceObligations: [{ qualityCheck: "lint", staticCheck: "lint:water" }] },
    { scnId: "SCN-D", evidenceObligations: [{ qualityCheck: "lint", staticCheck: "lint:absent" }] },
  ];
  const observations: EvidenceObservation[] = [
    { qualityCheck: "lint", staticCheck: "lint:foo", exists: true, enforcedOverRealSource: true }, // RUNNING, named ×2
    { qualityCheck: "lint", staticCheck: "lint:water", exists: true, enforcedOverRealSource: false }, // watermelon (posts, not running)
    { qualityCheck: "lint", staticCheck: "lint:absent", exists: false, enforcedOverRealSource: false }, // missing (posts, not running)
    { qualityCheck: "lint", staticCheck: "lint:bar", exists: true, enforcedOverRealSource: true }, // RUNNING, no-evidence-obligation → suspense
  ];
  const ledger: Ledger = reconcile(scenarios, observations);
  const tally = staticObservationTally(ledger);

  it("counts the DISTINCT running guards, identity-deduping a guard named by two scenarios (@SCN-LDG-024)", () => {
    // lint:foo is named by SCN-A AND SCN-B — the SAME object posted to both rows by reference — so
    // it counts ONCE; lint:bar is the no-evidence-obligation running guard on suspense. lint:water (watermelon)
    // and lint:absent (missing) post but do NOT run, so the running filter excludes them. → 2.
    expect(tally.runningStaticCheckCount).toBe(2);
  });

  it("counts the lint credits on the SUSPENSE row as the uncited static checks", () => {
    // lint:bar cites no scenario — the reconciler folded it to the suspense row (@SCN-LDG-007). It is
    // the only uncited static check; every named guard sits on its own scenario's @lint row.
    expect(tally.uncitedStaticCheckCount).toBe(1);
  });

  it("keeps named implicit — runningStaticCheckCount − uncitedStaticCheckCount (the running named count)", () => {
    // named is not on the surface; it is the implied remainder — here lint:foo (counted once).
    expect(tally.runningStaticCheckCount - tally.uncitedStaticCheckCount).toBe(1);
  });

  it("returns EXACTLY the two-field surface (named is never materialised)", () => {
    expect(tally).toEqual({ runningStaticCheckCount: 2, uncitedStaticCheckCount: 1 });
  });
});

/**
 * @SCN-USG-005 (3F-2348) — a `guard:`-prefixed static check that CI runs AND a scenario names is
 * ATTRIBUTED to that scenario's row, never counted as an uncited static check.
 *
 * THE SEAM THIS OWNS, and why @SCN-USG-004 does not already cover it. The two sides are
 * prefix-sensitive in DIFFERENT ways, and only their COMPOSITION is this scenario's subject:
 *   - the OBSERVED side IS prefix-sensitive — `runningStaticChecks` admits a script only when its
 *     name matches an injected prefix (`["lint:", "guard:"]`, set at the CLI edge);
 *   - the NAMED side is NOT — `postingOf` does a `Set.has()` on the full opaque handle.
 * @SCN-USG-004 pins the first half ALONE (the observer, in isolation). Nothing pinned that the two
 * halves MEET: that a `guard:`-prefixed script CI runs and a scenario names reconciles `satisfied`
 * on that scenario's row, rather than vanishing (observer drops it) or landing on suspense (the
 * named side misses it). Every other reconciled corpus in the suite names a `lint:`-prefixed
 * handle, so the prefix-independence of the named side was never exercised at this layer.
 *
 * BOTH HALVES ARE DRIVEN FOR REAL (evidence-manifesto §11A). The observation is DERIVED by the
 * observer from a CI source and a scripts manifest — never hand-written — so this asserts against
 * output the pipeline actually emits. The import of `../parse/` from a domain TEST is the
 * established idiom here (`evidenceReconciliation.test.ts` reads the same layer) and is outside the
 * domain-purity check's population by construction: its collector walks PRODUCTION files only,
 * excluding `*.test.ts`.
 *
 * TEETH. Prefix-scoping the NAMED-side match to `lint:` in `postingOf`'s lint arm reds this arm —
 * the handle then misses the named set, mints a suspense row and counts as uncited — while
 * @SCN-USG-004's arm (observer only, never reaching the named side) and every other unit arm (all
 * `lint:`-named) stay green.
 *
 * `guard:domain-purity` is a script NAME — a value, not vocabulary — so the handle is deliberately
 * untouched by the static-check rename (3F-1929; 3F-1852 owns script names).
 *
 * Parent: @SCN-USG-005; sibling of @SCN-USG-004 (the observer half).
 */
describe("[SCN-USG-005] a named guard:-prefixed static check is attributed to its scenario, never an uncited static check", () => {
  const accountFor = (ledger: Ledger, scnId: string): ScenarioReconciliation | undefined =>
    ledger.scenarioReconciliations.find((r) => r.scnId === scnId);

  // The guard-prefix set is SET at the CLI edge and INJECTED, so the core assumes no
  // convention; this fixture injects the portfolio default exactly as the edge does.
  const guardPkg: PackageJsonScripts = {
    scripts: {
      "guard:domain-purity": "echo domain-purity",
      test: "vitest run",
      cucumber: "cucumber-js",
    },
  };
  const guardCi = [
    "jobs:",
    "  ci:",
    "    steps:",
    "      - run: pnpm install --frozen-lockfile",
    "      - run: pnpm guard:domain-purity",
    "      - run: pnpm test",
    "      - run: pnpm cucumber",
  ].join("\n");

  // THE OBSERVED HALF — derived by the observer over the CI source above, not hand-seeded.
  const observed: EvidenceObservation[] = runningStaticChecks([guardCi], guardPkg, ["lint:", "guard:"]);
  // THE NAMED HALF — one scenario whose `@lint` obligation names the SAME handle.
  const naming: Scenario[] = [
    {
      scnId: "SCN-GRD-001",
      evidenceObligations: [{ qualityCheck: "lint", staticCheck: "guard:domain-purity" }],
    },
  ];
  const ledger: Ledger = reconcile(naming, observed);

  const observation = {
    qualityCheck: "lint",
    staticCheck: "guard:domain-purity",
    exists: true,
    enforcedOverRealSource: true,
  };

  it("derives the running guard:-prefixed static check from the CI source (the corpus is real, not seeded)", () => {
    // Anti-vacuity: were the observer to drop the handle, the corpus below would be EMPTY and the
    // attribution assertions would pass over nothing. This pins that they run over real output.
    expect(observed).toEqual([observation]);
  });

  it("posts it to the naming scenario's row, satisfied on that handle — the ATTRIBUTED half", () => {
    // The scenario's actual claim: attributed, and attributed HERE. The report's `### Static
    // checks` section carries counts only, so no rendered surface can tell this from the handle
    // landing on some OTHER row — which is exactly why this belongs at the unit layer.
    expect(accountFor(ledger, "SCN-GRD-001")?.qualityCheckReconciliations).toEqual([
      {
        qualityCheck: "lint",
        staticCheck: "guard:domain-purity",
        outcome: "satisfied",
        evidenceObligation: { qualityCheck: "lint", staticCheck: "guard:domain-purity" },
        evidenceObservation: observation,
      },
    ]);
    expect(accountFor(ledger, "SCN-GRD-001")?.verdict).toBe("balanced");
  });

  it("mints NO suspense row — a named static check is never uncited, whatever its prefix", () => {
    // The negative half, and the one the mutation reds first: under a `lint:`-scoped named-side
    // match the handle misses the named set and this row appears.
    expect(accountFor(ledger, "(no scenario)")).toBeUndefined();
  });

  it("tallies the run as 1 running static check and 0 uncited", () => {
    expect(staticObservationTally(ledger)).toEqual({
      runningStaticCheckCount: 1,
      uncitedStaticCheckCount: 0,
    });
  });
});
