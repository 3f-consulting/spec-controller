/**
 * The static-evidence-observation COUNTER — the STATIC-axis analogue of the
 * runtime counter in `evidenceObservations.ts`, sitting BESIDE it. A guard is a STATIC
 * evidence observation (a test result is a RUNTIME one); this counter walks the guard
 * observations in the reconcile stream and counts them BY KIND — the demanded / undemanded
 * (unattributed) split, mirroring `countRuntimeEvidenceObservationKinds`.
 *
 * The engine is unified: `reconcile` already reconciles every guard observation
 * (a demanded guard matches its `@lint` obligation; an undemanded one — a guard that runs
 * in CI with no `@lint` declaring it — folds to the suspense row). The static census no
 * longer derives-and-diffs the CI guard-set; it just COUNTS the stream, symmetric with runtime.
 * The derive-and-diff census is gone — matching a guard to its scenario (or the
 * suspense row) is `reconcile`'s job, so this file holds only the counter.
 *
 * Parent: (@SCN-USG-001 — the unattributed static-guard).
 */

import type { GuardEvidenceObservation } from "../model.js";

/**
 * The static-evidence-observation kind-counts — the STATIC-axis analogue of
 * `RuntimeEvidenceObservationKindCounts`, one construction on both axes. `runningGuardCount` is the
 * VOLUME of running guards (every `@lint=<guard>` a CI `run:` step invokes); `unattributedStaticGuardCount`
 * is how many of them NO `@lint` declares — a guard that runs with nothing demanding it (an unposted
 * credit, the mirror of a runtime unattributed evidence observation). The demanded count is IMPLICIT
 * (`runningGuardCount − unattributedStaticGuardCount`): every demanded guard is already a reconciled
 * `@lint` sub-row and carries no multiplicity, so it adds nothing the rows do not already hold and is
 * NOT carried on the surface. The completeness invariant `running === demanded + unattributed`
 * is asserted internally by the counter.
 */
export interface StaticEvidenceObservationKindCounts {
  /** The running guard-set volume — every `@lint=<guard>` a CI `run:` step invokes. */
  runningGuardCount: number;
  /** Running guards NO `@lint` declares — the unattributed static-guards (demanded is implicit). */
  unattributedStaticGuardCount: number;
}

/**
 * Count the guard observations in the reconcile stream BY KIND — a pure counter,
 * symmetric with `countRuntimeEvidenceObservationKinds`. A RUNNING guard is one that both `exists` (a
 * `package.json` script) and is `enforcedOverRealSource` (a CI `run:` step invokes it); a watermelon
 * (exists, unwired) or a missing guard does not run, so it is not a running guard — the same running-set
 * filter `runningStaticGuards` applies. Each running guard is demanded (its handle is in `demandedGuards`)
 * or an unattributed static-guard. The `demanded` split is computed LOCALLY and used only to ASSERT the
 * completeness invariant `running === demanded + unattributed`; it is never exposed (it is implicit,
 * `runningGuardCount − unattributedStaticGuardCount`).
 */
export function countStaticEvidenceObservationKinds(
  guardObservations: GuardEvidenceObservation[],
  demandedGuards: string[]
): StaticEvidenceObservationKindCounts {
  const demandedSet = new Set(demandedGuards);
  let runningGuardCount = 0;
  let demandedCount = 0;
  let unattributedStaticGuardCount = 0;
  for (const o of guardObservations) {
    if (!(o.exists && o.enforcedOverRealSource)) continue; // not a RUNNING guard
    runningGuardCount++;
    if (demandedSet.has(o.guard)) demandedCount++;
    else unattributedStaticGuardCount++;
  }
  // Completeness invariant (INTERNAL): every running guard is demanded or unattributed.
  // `demanded` is computed above solely to assert this and is NOT returned (it is implicit).
  if (runningGuardCount !== demandedCount + unattributedStaticGuardCount) {
    throw new Error(
      `static census completeness invariant violated: ${runningGuardCount} running !== ${demandedCount} demanded + ${unattributedStaticGuardCount} unattributed`
    );
  }
  return { runningGuardCount, unattributedStaticGuardCount };
}
