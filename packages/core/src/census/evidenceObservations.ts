/**
 * The evidence-observation reconciliation — the OBSERVED test evidence
 * evidence observations, counted by kind off the Ledger's own rows in ONE pass so the
 * four-way completeness identity holds BY CONSTRUCTION.
 *
 * The report's evidence-observation side — how much evidence actually ran, and how it breaks down
 * by kind — is a FOLD OVER THE LEDGER (@SCN-RPT-023 / 3F-1859).
 * `countRuntimeEvidenceObservationKinds` takes the `Ledger` the reconciler produced and walks the
 * POSTED CREDITS on its rows (@SCN-LDG-022), reading each credit's kind off THE ROW IT POSTED TO
 * and summing the raw per-quality-check total in lockstep, so
 * `Σ rawByRuntimeQualityCheck = Σ attributed.count + undemandedCount + phantomCount + suspenseCount`
 * can never drift.
 *
 * It does NOT classify, and it re-derives NOTHING: not the level (that rides the parsed
 * observation, tag-derived per @SCN-LDG-011 / 3F-1434 — the drift bug 3F-1452 fixed), and no
 * longer the KIND either. This module USED to hold a second implementation of the reconciler's
 * classification — same inputs, same question, two codebases — and the two disagreed twice: on a
 * credit citing a pending obligation (3F-1858) and on a `broken` credit carrying a real scnId
 * (@SCN-RPT-023). The views (Test volume, attributed, E2e cell) now agree with the verdict because
 * they are projections of the same rows, not because a parallel opinion is kept in step.
 *
 * The attributed counts (per `(scnId, quality-check)`) feed the per-scenario columns;
 * the undemanded/phantom/suspense counts feed the anchor-audit slices.
 *
 * Parent: (@SCN-RPT-010) — the evidence-observation-reconciliation spine.
 */

import type { RuntimeQualityCheck, Ledger } from "../model.js";
import { evidenceObligationPairsOf } from "../model.js";

/** An attributed-to-declared evidence observation tally: a `(scnId, quality-check)` with its count. */
export interface AttributedCount {
  scnId: string;
  qualityCheck: RuntimeQualityCheck;
  count: number;
}

/**
 * The evidence-observation reconciliation — the observed test evidence observations counted by
 * kind against the `@SCN` anchor. `rawByRuntimeQualityCheck` is the per-quality-check evidence
 * evidence observation total over ALL results; the FOUR kind-counts are mutually exclusive and
 * jointly exhaust the raw total (`undemanded` broke out of `attributed`):
 * `Σ rawByRuntimeQualityCheck = Σ attributed.count + undemandedCount + phantomCount + suspenseCount`
 * (the identity, by construction). The atoms here are non-derivable from the balance and persist on JSON.
 */
export interface RuntimeEvidenceObservationKindCounts {
  /** Raw per-quality-check evidence observation totals — ALL results, regardless of `@SCN`. */
  rawByRuntimeQualityCheck: Record<RuntimeQualityCheck, number>;
  /**
   * Reconciliation-MATCHED attributed: per-`(scnId, quality-check)` counts for credits that
   * match a declared `(scnId, quality-check)` PAIR. This is NOT the same number as the
   * Test-volume attributed (credits citing a declared scenario, which INCLUDES undemanded) — a
   * credit citing a real scenario at an UNDECLARED quality-check is undemanded, not matched, so
   * it lands in `undemandedCount`, not here (the latent `attributed` mis-count fix).
   */
  attributed: AttributedCount[];
  /**
   * Undemanded count (@SCN-LDG-008): credits citing a REAL declared scenario at a
   * quality-check that scenario NEVER declared. Each cites a declared scenario (so is neither
   * phantom nor suspense), but matches no declared `(scnId, quality-check)` pair.
   * `Σ rawByRuntimeQualityCheck = Σ attributed.count + undemandedCount + phantomCount + suspenseCount`.
   */
  undemandedCount: number;
  /** Attributed-to-undeclared count (phantom-id): evidence observations carrying an `@SCN` no declared scenario matches. */
  phantomCount: number;
  /** Suspense count: evidence observations that ran carrying no `@SCN` at all. */
  suspenseCount: number;
}

/** The canonical runtime quality-check order, in reading order. */
export const RUNTIME_QUALITY_CHECKS: readonly RuntimeQualityCheck[] = ["unit", "integration", "e2e", "performance"];

/**
 * Build the evidence-observation reconciliation as a FOLD OVER THE LEDGER (@SCN-RPT-023 / 3F-1859).
 *
 * The census does not classify. It walks the POSTED CREDITS on each Scenario Reconciliation row
 * (@SCN-LDG-022) and reads each credit's kind off THE ROW IT POSTED TO — suspense row ⇒ suspense,
 * phantom row ⇒ phantom, real row ⇒ attributed or undemanded by the model's one demanded-pair rule.
 * The reconciler is the single classifier; the census re-derives NOTHING (not the level, which
 * rides the parsed observation per @SCN-LDG-011, and no longer the KIND either).
 *
 * This retires the second implementation of the reconciler's classification. Two classifiers over
 * the same inputs can disagree, and did — twice: on a credit citing a pending obligation (3F-1858)
 * and on a `broken` credit carrying a real scnId (@SCN-RPT-023). Correctness comes from there being
 * ONE place that decides what a credit is; it does NOT come from the exhaustion identity below,
 * which is invariant under a misclassification between its own terms and can only catch a credit
 * that VANISHED.
 *
 * Guard (`lint`) credits are skipped: this is the runtime axis. Runtime quality-checks no
 * observation carries stay zero and surface as facts in the tally.
 */
export function countRuntimeEvidenceObservationKinds(
  ledger: Ledger
): RuntimeEvidenceObservationKindCounts {
  // The DEMANDED pairs — the model's ONE rule (3F-1858), now asked of the LEDGER rather than of a
  // separately-passed scenario corpus. A `ScenarioReconciliation` carries `scnId` and its POSTED
  // DEBITS (`evidenceObligations`, @SCN-LDG-023), so it IS a `Scenario` structurally: the pair set
  // is built over the ledger's own declarations, by the same function `reconcile` uses. Pending
  // obligations are excluded there — a pending obligation demands nothing — so a credit citing one
  // counts `undemanded` here exactly as it reconciles `undemanded` on its row (@SCN-PND-005).
  const evidenceObligationPairs = evidenceObligationPairsOf(ledger.scenarioReconciliations);
  const rawByRuntimeQualityCheck: Record<RuntimeQualityCheck, number> = {
    unit: 0,
    integration: 0,
    e2e: 0,
    performance: 0,
  };
  // Keyed by `${scnId} ${qualityCheck}` so two quality-checks of one scenario stay distinct.
  const attributedByKey = new Map<string, AttributedCount>();
  let undemandedCount = 0;
  let phantomCount = 0;
  let suspenseCount = 0;

  // THE FOLD (@SCN-RPT-023 / 3F-1859). The census no longer CLASSIFIES — it walks the Ledger's
  // POSTED CREDITS and reads each credit's kind off THE ROW IT POSTED TO. The reconciler already
  // decided what every credit is; asking the row is asking that decision. There is now exactly ONE
  // place that decides what a credit is, so the census can no longer disagree with the verdict —
  // not because a second implementation was made to agree, but because the second implementation
  // is GONE.
  //
  // What the old classifier got wrong, and why this is not a refactor no-op: it had NO `broken`
  // branch at all. Its only suspense test was `scnId === null`, so a `broken` observation carrying
  // a REAL scnId — an ambiguous cucumber step (@SCN-LDG-019) cites its @SCN and still never runs —
  // passed every test: not null, scenario declared, pair demanded → counted ATTRIBUTED. The
  // reconciler always posted it to SUSPENSE, and canon says the reconciler is right: a proof that
  // never ran can neither discharge nor fail an obligation, so it attributes to NOTHING. Folding
  // over the rows therefore MOVES the count — attributed −1, suspense +1 (@SCN-RPT-023 names it).
  //
  // NB the exhaustion identity below cannot see this and never could: it is INVARIANT under a
  // misclassification between its own terms. It is a COMPLETENESS check (a credit vanished), never
  // a correctness one (a credit is in the wrong bucket).
  for (const row of ledger.scenarioReconciliations) {
    for (const obs of row.evidenceObservations) {
      // THE RUNTIME SCOPING, preserved exactly. The census is the RUNTIME axis:
      // `rawByRuntimeQualityCheck` has no lint key and ingest never even passed guard observations
      // to it. It matters MORE under the fold than it did under the walk: @SCN-LDG-022 posts the
      // SAME guard object to EVERY account demanding it, so a naive walk of the rows would count
      // one guard's single run once per demanding scenario — double-counting an axis the census
      // must not see at all.
      if (obs.qualityCheck === "lint") continue;
      rawByRuntimeQualityCheck[obs.qualityCheck]++;
      if (row.kind === "suspense-scenario") {
        // The suspense account holds every credit that cites no scenario — the uncited (scnId
        // null) AND the broken (it named no test, so it cites nothing whatever scnId it
        // structurally carries). The reconciler's fail-safe took `broken` FIRST, on the flag; the
        // fold inherits that ruling by reading the row rather than re-testing the credit.
        suspenseCount++;
      } else if (row.kind === "phantom-scenario") {
        // A credit citing an @SCN no declared scenario matches, posted to the invented account.
        phantomCount++;
      } else if (evidenceObligationPairs.has(`${row.scnId} ${obs.qualityCheck}`)) {
        // A real account, at a pair it DEMANDS → reconciliation-matched attributed.
        const key = `${row.scnId} ${obs.qualityCheck}`;
        const existing = attributedByKey.get(key);
        if (existing) existing.count++;
        else attributedByKey.set(key, { scnId: row.scnId, qualityCheck: obs.qualityCheck, count: 1 });
      } else {
        // A real account, at a quality-check it never demanded → UNDEMANDED (@SCN-LDG-008),
        // including a credit citing a PENDING obligation (3F-1858 — pending demands nothing).
        undemandedCount++;
      }
    }
  }

  const result: RuntimeEvidenceObservationKindCounts = {
    rawByRuntimeQualityCheck,
    attributed: [...attributedByKey.values()],
    undemandedCount,
    phantomCount,
    suspenseCount,
  };

  // Kind-count COMPLETENESS identity, by construction (the single-walk drift-proofing): the raw
  // per-quality-check total equals the sum of the four mutually-exclusive kind-counts.
  //
  // COMPLETENESS, and ONLY completeness — it is invariant under any misclassification BETWEEN its
  // own terms (move a credit from attributed to suspense and the sum is unchanged), so it catches
  // exactly one thing: a credit VANISHING. It was green through BOTH divergences 3F-1831 closed
  // and could never have caught either. Do not read it as a correctness check; the `@SCN`s are that.
  const raw = RUNTIME_QUALITY_CHECKS.reduce((n, qualityCheck) => n + rawByRuntimeQualityCheck[qualityCheck], 0);
  const attributedTally = result.attributed.reduce((n, a) => n + a.count, 0);
  if (raw !== attributedTally + undemandedCount + phantomCount + suspenseCount) {
    throw new Error(
      `evidence-observation kind-count drift: raw ${raw} != attributed ${attributedTally} + undemanded ${undemandedCount} + phantom ${phantomCount} + suspense ${suspenseCount}`
    );
  }

  return result;
}

/** The raw evidence observation total — `Σ rawByRuntimeQualityCheck` (the left side of the evidence-observation identity). */
export function totalEvidenceObservations(evidenceObservations: RuntimeEvidenceObservationKindCounts): number {
  return RUNTIME_QUALITY_CHECKS.reduce((n, qualityCheck) => n + evidenceObservations.rawByRuntimeQualityCheck[qualityCheck], 0);
}

/**
 * The attributed total — attributed-to-declared (`Σ attributed.count`) PLUS the phantom
 * evidence observations (attributed-to-undeclared); i.e. every evidence observation that carried an `@SCN`.
 * `totalEvidenceObservations = attributedTotal + suspenseCount` is the rendered identity.
 */
export function attributedTotal(evidenceObservations: RuntimeEvidenceObservationKindCounts): number {
  return evidenceObservations.attributed.reduce((n, a) => n + a.count, 0) + evidenceObservations.phantomCount;
}
