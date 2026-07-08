/**
 * The evidence-observation reconciliation — the OBSERVED test evidence
 * evidence observations, counted by kind against the `@SCN` anchor in ONE shared pass so the
 * three-way identity holds BY CONSTRUCTION.
 *
 * The reconcile core (`reconcile.ts`) records evidence EXISTENCE (`.find()`), never
 * counts, and the observed readers drop every result carrying no `@SCN`. The report's
 * evidence-observation side — how much evidence actually ran, and how it breaks down by kind —
 * needs the raw evidence observations the pipeline otherwise throws away. `countRuntimeEvidenceObservationKinds`
 * walks the raw Vitest / Cucumber reports once, counting every evidence observation by kind into
 * exactly one of {attributed-to-declared, undemanded, attributed-to-undeclared (phantom),
 * suspense} while summing the raw per-quality-check total — so
 * `Σ rawByRuntimeQualityCheck = Σ attributed.count + undemandedCount + phantomCount + suspenseCount`
 * can never drift (the failure mode of independent passes).
 *
 * The attributed counts (per `(scnId, quality-check)`) feed the per-scenario columns;
 * the undemanded/phantom/suspense counts feed the anchor-audit slices.
 *
 * Parent: (@SCN-RPT-010) — the evidence-observation-reconciliation spine.
 */

import type { Scenario, RuntimeQualityCheck } from "../model.js";
import type { VitestJsonReport } from "../parse/vitest.js";
import type { CucumberJsonReport } from "../parse/cucumber.js";

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

/** An `@SCN-FFF-NNN` id anywhere in a Vitest assertion's name (the bidirectional link). */
const SCN_IN_NAME = /\bSCN-[A-Z0-9]+-\d+\b/;
/** A bare `@SCN-FFF-NNN` Cucumber tag. */
const SCN_TAG = /^@?(SCN-[A-Z0-9]+-\d+)$/;

/**
 * Build the evidence-observation reconciliation from the raw runner reports + the declared corpus.
 * A SINGLE walk per report counts each evidence observation by kind and sums the raw total in
 * lockstep, so the kind-count identity holds by construction. Missing reports contribute
 * nothing (their quality-checks stay zero); runtime quality-checks no input declares are zero
 * (the JS-ecosystem CLI declares only unit + integration) and surface as facts in the tally.
 */
export function countRuntimeEvidenceObservationKinds(args: {
  /** The Vitest source + the quality-check it DECLARES (no Vitest⇒unit hardcode). */
  vitest?: { report: VitestJsonReport; qualityCheck: RuntimeQualityCheck };
  /** The Cucumber source + the quality-check it DECLARES (no Cucumber⇒integration hardcode). */
  cucumber?: { report: CucumberJsonReport; qualityCheck: RuntimeQualityCheck };
  scenarios: Scenario[];
}): RuntimeEvidenceObservationKindCounts {
  const scenarioIds = new Set(args.scenarios.map((d) => d.scnId));
  // The declared `(scnId, quality-check)` PAIRS — a credit citing a declared scenario is
  // reconciliation-matched only when its `(scnId, quality-check)` is a declared pair; otherwise it is
  // UNDEMANDED (a real scenario, at a quality-check it never declared). A runtime credit's quality-check
  // is a RuntimeQualityCheck, so a declared `lint` evidence obligation never matches one (as intended).
  const evidenceObligationPairs = new Set<string>();
  for (const d of args.scenarios) {
    for (const o of d.evidenceObligations) evidenceObligationPairs.add(`${d.scnId} ${o.qualityCheck}`);
  }
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

  /** Count one evidence observation into exactly one kind AND bump the raw total. */
  const countKind = (qualityCheck: RuntimeQualityCheck, scnId: string | null): void => {
    rawByRuntimeQualityCheck[qualityCheck]++;
    if (scnId === null) {
      suspenseCount++;
    } else if (scenarioIds.has(scnId) && !evidenceObligationPairs.has(`${scnId} ${qualityCheck}`)) {
      // Cites a REAL declared scenario, but at a quality-check it never declared → UNDEMANDED
      // (@SCN-LDG-008), NOT reconciliation-matched-attributed. The pair-check is the
      // latent `attributed` mis-count fix.
      undemandedCount++;
    } else if (scenarioIds.has(scnId)) {
      const key = `${scnId} ${qualityCheck}`;
      const existing = attributedByKey.get(key);
      if (existing) existing.count++;
      else attributedByKey.set(key, { scnId, qualityCheck, count: 1 });
    } else {
      phantomCount++;
    }
  };

  // Vitest source → its DECLARED quality-check. One evidence observation per assertion.
  const vitestInput = args.vitest;
  if (vitestInput) {
    for (const file of vitestInput.report.testResults ?? []) {
      for (const assertion of file.assertionResults ?? []) {
        const name = `${assertion.fullName ?? ""} ${assertion.title ?? ""}`;
        const m = SCN_IN_NAME.exec(name);
        countKind(vitestInput.qualityCheck, m ? m[0] : null);
      }
    }
  }

  // Cucumber source → its DECLARED quality-check. One evidence observation per scenario element.
  const cucumberInput = args.cucumber;
  if (cucumberInput) {
    for (const feature of cucumberInput.report) {
      for (const scenario of feature.elements ?? []) {
        const tag = (scenario.tags ?? [])
          .map((t) => SCN_TAG.exec(t.name ?? ""))
          .find((x): x is RegExpExecArray => x !== null);
        countKind(cucumberInput.qualityCheck, tag ? tag[1]! : null);
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

  // Kind-count completeness identity, by construction (the single-walk drift-proofing): the raw
  // per-quality-check total equals the sum of the four mutually-exclusive kind-counts.
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
