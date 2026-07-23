/**
 * Unit tests for the static-evidence-observation COUNTER
 * (src/staticEvidenceObservations.ts) — the static-axis analogue of
 * `countRuntimeEvidenceObservationKinds`. Proves the static guard observations in the reconcile
 * stream count BY KIND (demanded / uncited) over the RUNNING CI static-guard set; the reader
 * arms (checkStaticEvidenceObligations in src/ingest/guard.test.ts, runningStaticGuards in src/ingest/ciGuards.test.ts)
 * and reconcile folding an undemanded static guard onto the suspense row (src/reconcile/reconcile.test.ts)
 * are pinned separately.
 *
 * Parent: (@SCN-USG-001 — the uncited static-guard).
 */

import { describe, it, expect } from "vitest";
import { countStaticEvidenceObservationKinds } from "./staticEvidenceObservations.js";
import type { GuardEvidenceObservation } from "../model.js";

/** A running CI static guard observation — exists as a script AND enforced over real source. */
const running = (guard: string): GuardEvidenceObservation => ({
  qualityCheck: "lint",
  staticGuard: guard,
  exists: true,
  enforcedOverRealSource: true,
});

describe("[SCN-USG-001] countStaticEvidenceObservationKinds — the uncited static-guard counter", () => {
  it("counts a running guard no @lint declares in uncitedStaticGuardCount, and folds a declared one into runningGuardCount only", () => {
    const counts = countStaticEvidenceObservationKinds([running("lint:bar"), running("lint:foo")], ["lint:foo"]);
    expect(counts).toEqual({ runningGuardCount: 2, uncitedStaticGuardCount: 1 });
  });

  it("keeps demanded implicit — runningGuardCount − uncitedStaticGuardCount", () => {
    const counts = countStaticEvidenceObservationKinds([running("lint:bar"), running("lint:foo")], ["lint:foo"]);
    // `demanded` is not on the surface; it is the implied remainder.
    expect(counts.runningGuardCount - counts.uncitedStaticGuardCount).toBe(1);
  });

  it("counts a demanded @lint handle that never runs in CI as neither running nor uncited (the deferred inverse)", () => {
    // A demanded static guard whose script exists but is NOT enforced (a watermelon) does not RUN,
    // so it is not a running static guard — the forward detection keys on real CI steps.
    const watermelon: GuardEvidenceObservation = {
      qualityCheck: "lint",
      staticGuard: "lint:planted-watermelon",
      exists: true,
      enforcedOverRealSource: false,
    };
    const counts = countStaticEvidenceObservationKinds([running("lint:foo"), watermelon], ["lint:foo", "lint:planted-watermelon"]);
    expect(counts).toEqual({ runningGuardCount: 1, uncitedStaticGuardCount: 0 });
  });
});

describe("[SCN-USG-002] a guard an @lint scenario declares is demanded, not uncited", () => {
  it("counts a running guard an @lint declares as running-but-not-uncited (demanded implicit)", () => {
    const counts = countStaticEvidenceObservationKinds([running("lint:bar"), running("lint:foo")], ["lint:foo", "lint:bar"]);
    expect(counts.runningGuardCount).toBe(2);
    expect(counts.uncitedStaticGuardCount).toBe(0);
  });
});

describe("[SCN-USG-005] a declared guard:-prefixed script is attributed, not uncited", () => {
  it("counts a running guard:* an @lint declares as running-but-not-uncited (guard:* mirror of USG-002)", () => {
    // guard:domain-purity RUNS in CI and is DEMANDED (@lint=guard:domain-purity); the prefix-agnostic
    // demanded set attributes it exactly once — folded into runningGuardCount, never uncited,
    // never double-counted. Keeps the USG-004 guard:* broadening honest at the declared boundary.
    const counts = countStaticEvidenceObservationKinds([running("guard:domain-purity")], ["guard:domain-purity"]);
    expect(counts.runningGuardCount).toBe(1);
    expect(counts.uncitedStaticGuardCount).toBe(0);
  });
});

describe("[SCN-USG-003] non-running guard observations are not counted as running guards", () => {
  it("skips a missing guard (no script) — it does not run, so it is not a running guard", () => {
    const missing: GuardEvidenceObservation = {
      qualityCheck: "lint",
      staticGuard: "lint:absent-guard",
      exists: false,
      enforcedOverRealSource: false,
    };
    const counts = countStaticEvidenceObservationKinds([running("lint:foo"), missing], ["lint:foo", "lint:absent-guard"]);
    expect(counts).toEqual({ runningGuardCount: 1, uncitedStaticGuardCount: 0 });
  });
});
