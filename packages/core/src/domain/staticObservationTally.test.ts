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
import type { EvidenceObservation, Ledger, Scenario } from "../model.js";

describe("[SCN-USG-001] staticObservationTally folds the posted static-check credits, deduped and running-filtered", () => {
  // A SPANNING corpus reconciling to every static-check credit shape:
  //   lint:foo — RUNNING, named by TWO scenarios (SCN-A + SCN-B): ONE object posted twice by
  //              reference (@SCN-LDG-024) → the identity-dedupe must count it ONCE.
  //   lint:water — a named WATERMELON (exists, unwired): posts to SCN-C but does NOT run → the
  //                running filter excludes it.
  //   lint:absent — a named MISSING guard (absent): posts to SCN-D but does NOT run → excluded.
  //   lint:bar — RUNNING, no-evidence-obligation (no @lint declares it): the reconciler folds it to the SUSPENSE
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
