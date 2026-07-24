/**
 * Unit test for the static-observation tally (@SCN-USG-001, 3F-2118) — the Ledger fold that OWNS
 * the static-guard counting (the retired static census's home, relocated here from
 * `census/staticEvidenceObservations.test.ts`).
 *
 * Bidirectional evidence (Evidence Manifesto §9): the describe carries @SCN-USG-001, matching
 * features/uncited-static-guard.feature, so a grep of the id returns both halves.
 *
 * `staticObservationTally` walks the POSTED static-guard CREDITS on the Ledger rows (@SCN-LDG-022)
 * and reads each off the row it posted to — the reconciler's own ruling, never re-classified. It is
 * MORE CAREFUL than the runtime fold on the two axes the static posting rules differ on
 * (double-entry-manifesto.md line 160, @SCN-LDG-024):
 *   - IDENTITY-DEDUPE the demanded side — a guard demanded by N scenarios is the SAME object posted
 *     N times by reference, so it must count ONCE (never N).
 *   - FILTER TO RUNNING (`exists && enforcedOverRealSource`) — a demanded watermelon (exists,
 *     unwired) or missing (absent) guard STILL posts (posting is not classifying), but does not RUN,
 *     so it is excluded, matching the retired census's running-only `continue`.
 * The Ledger is BUILT BY `reconcile()` over a spanning corpus, never hand-written
 * (evidence-manifesto §11A): the fixture can only state posted-entry shapes the pipeline emits.
 *
 * Parent: (@SCN-USG-001) — the static-observation tally is the Ledger's own fold.
 */

import { describe, it, expect } from "vitest";

import { staticObservationTally } from "./ledger.js";
import { reconcile } from "../reconcile/reconcile.js";
import type { EvidenceObservation, Ledger, Scenario } from "../model.js";

describe("[SCN-USG-001] staticObservationTally folds the posted static-guard credits, deduped and running-filtered", () => {
  // A SPANNING corpus reconciling to every static-guard credit shape:
  //   lint:foo — RUNNING, demanded by TWO scenarios (SCN-A + SCN-B): ONE object posted twice by
  //              reference (@SCN-LDG-024) → the identity-dedupe must count it ONCE.
  //   lint:water — a demanded WATERMELON (exists, unwired): posts to SCN-C but does NOT run → the
  //                running filter excludes it.
  //   lint:absent — a demanded MISSING guard (absent): posts to SCN-D but does NOT run → excluded.
  //   lint:bar — RUNNING, undemanded (no @lint declares it): the reconciler folds it to the SUSPENSE
  //              row → the 1 uncited static guard.
  // Built through reconcile(), so every row is a shape the pipeline actually emits.
  const scenarios: Scenario[] = [
    { scnId: "SCN-A", evidenceObligations: [{ qualityCheck: "lint", staticGuard: "lint:foo" }] },
    { scnId: "SCN-B", evidenceObligations: [{ qualityCheck: "lint", staticGuard: "lint:foo" }] },
    { scnId: "SCN-C", evidenceObligations: [{ qualityCheck: "lint", staticGuard: "lint:water" }] },
    { scnId: "SCN-D", evidenceObligations: [{ qualityCheck: "lint", staticGuard: "lint:absent" }] },
  ];
  const observations: EvidenceObservation[] = [
    { qualityCheck: "lint", staticGuard: "lint:foo", exists: true, enforcedOverRealSource: true }, // RUNNING, demanded ×2
    { qualityCheck: "lint", staticGuard: "lint:water", exists: true, enforcedOverRealSource: false }, // watermelon (posts, not running)
    { qualityCheck: "lint", staticGuard: "lint:absent", exists: false, enforcedOverRealSource: false }, // missing (posts, not running)
    { qualityCheck: "lint", staticGuard: "lint:bar", exists: true, enforcedOverRealSource: true }, // RUNNING, undemanded → suspense
  ];
  const ledger: Ledger = reconcile(scenarios, observations);
  const tally = staticObservationTally(ledger);

  it("counts the DISTINCT running guards, identity-deduping a guard demanded by two scenarios (@SCN-LDG-024)", () => {
    // lint:foo is demanded by SCN-A AND SCN-B — the SAME object posted to both rows by reference — so
    // it counts ONCE; lint:bar is the undemanded running guard on suspense. lint:water (watermelon)
    // and lint:absent (missing) post but do NOT run, so the running filter excludes them. → 2.
    expect(tally.runningGuardCount).toBe(2);
  });

  it("counts the lint credits on the SUSPENSE row as the uncited static guards", () => {
    // lint:bar cites no scenario — the reconciler folded it to the suspense row (@SCN-LDG-007). It is
    // the only uncited static guard; every demanded guard sits on its own scenario's @lint row.
    expect(tally.uncitedStaticGuardCount).toBe(1);
  });

  it("keeps demanded implicit — runningGuardCount − uncitedStaticGuardCount (the running demanded count)", () => {
    // demanded is not on the surface; it is the implied remainder — here lint:foo (counted once).
    expect(tally.runningGuardCount - tally.uncitedStaticGuardCount).toBe(1);
  });

  it("returns EXACTLY the two-field surface (demanded is never materialised)", () => {
    expect(tally).toEqual({ runningGuardCount: 2, uncitedStaticGuardCount: 1 });
  });
});
