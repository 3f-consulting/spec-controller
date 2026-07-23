/**
 * The static-evidence-observation COUNTER — the STATIC-axis analogue of the
 * runtime counter in `evidenceObservations.ts`, sitting BESIDE it. A static guard is a STATIC
 * evidence observation (a test result is a RUNTIME one); this counter walks the static guard
 * observations in the reconcile stream and counts them BY KIND — the demanded / undemanded
 * (uncited) split, mirroring `countRuntimeEvidenceObservationKinds`.
 *
 * The engine is unified: `reconcile` already reconciles every static guard observation
 * (a demanded static guard matches its `@lint` obligation; an undemanded one — a guard that runs
 * in CI with no `@lint` declaring it — folds to the suspense row). The static census no
 * longer derives-and-diffs the CI static-guard set; it just COUNTS the stream, symmetric with runtime.
 * The derive-and-diff census is gone — matching a static guard to its scenario (or the
 * suspense row) is `reconcile`'s job, so this file holds only the counter.
 *
 * Parent: (@SCN-USG-001 — the uncited static-guard).
 */

import type { GuardEvidenceObservation } from "../model.js";

/**
 * The static-evidence-observation kind-counts — the STATIC-axis analogue of
 * `RuntimeEvidenceObservationKindCounts`, one construction on both axes. `runningGuardCount` is the
 * VOLUME of running static guards (every `@lint=<guard>` a CI `run:` step invokes); `uncitedStaticGuardCount`
 * is how many of them NO `@lint` declares — a static guard that runs with nothing demanding it (an unposted
 * credit, the mirror of a runtime unattributed evidence observation). The demanded count is IMPLICIT
 * (`runningGuardCount − uncitedStaticGuardCount`): every demanded static guard is already a reconciled
 * `@lint` sub-row and carries no multiplicity, so it adds nothing the rows do not already hold and is
 * NOT carried on the surface. The completeness invariant `running === demanded + uncited`
 * is asserted internally by the counter.
 */
export interface StaticEvidenceObservationKindCounts {
  /** The running static-guard set volume — every `@lint=<guard>` a CI `run:` step invokes. */
  runningGuardCount: number;
  /** Running static guards NO `@lint` declares — the uncited static-guards (demanded is implicit). */
  uncitedStaticGuardCount: number;
}

/**
 * Count the static guard observations in the reconcile stream BY KIND — a pure counter,
 * symmetric with `countRuntimeEvidenceObservationKinds`. A RUNNING static guard is one that both `exists` (a
 * `package.json` script) and is `enforcedOverRealSource` (a CI `run:` step invokes it); a watermelon
 * (exists, unwired) or a missing guard does not run, so it is not a running static guard — the same running-set
 * filter `runningStaticGuards` applies. Each running static guard is demanded (its handle is in `demandedGuards`)
 * or an uncited static-guard. The `demanded` split is computed LOCALLY and used only to ASSERT the
 * completeness invariant `running === demanded + uncited`; it is never exposed (it is implicit,
 * `runningGuardCount − uncitedStaticGuardCount`).
 */
export function countStaticEvidenceObservationKinds(
  guardObservations: GuardEvidenceObservation[],
  demandedGuards: string[]
): StaticEvidenceObservationKindCounts {
  const demandedSet = new Set(demandedGuards);
  let runningGuardCount = 0;
  let demandedCount = 0;
  let uncitedStaticGuardCount = 0;
  for (const o of guardObservations) {
    if (!(o.exists && o.enforcedOverRealSource)) continue; // not a RUNNING static guard
    runningGuardCount++;
    if (demandedSet.has(o.staticGuard)) demandedCount++;
    else uncitedStaticGuardCount++;
  }
  // Completeness invariant (INTERNAL): every running static guard is demanded or uncited.
  // `demanded` is computed above solely to assert this and is NOT returned (it is implicit).
  if (runningGuardCount !== demandedCount + uncitedStaticGuardCount) {
    throw new Error(
      `static census completeness invariant violated: ${runningGuardCount} running !== ${demandedCount} demanded + ${uncitedStaticGuardCount} uncited`
    );
  }
  return { runningGuardCount, uncitedStaticGuardCount };
}
