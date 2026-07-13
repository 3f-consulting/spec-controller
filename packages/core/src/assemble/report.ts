/**
 * The whole-document report model (@SCN-RMD-001) — the ONE model
 * both renderings consume, in document order, so the JSON and the markdown are one
 * model in two renderings, not two dialects.
 *
 * `assembleReport` builds it from the existing reconcile pieces (the balance, the run
 * context, and the declared / observed / guard sibling reads). The JSON renderer collapses
 * to a glue-free `JSON.stringify(assembleReport(...))`. The assembler is the ONLY place the
 * JSON-surface vocabulary lives — the manifesto-vocabulary key renames (the revert)
 * are MAPPED here so they never ripple into markdown.ts / evidenceObservations.ts internals, keeping the
 * markdown byte-identical this slice.
 *
 * The sections are in document order with `runProvenance` renamed, a materialised `summary`,
 * the per-scenario reconciliation under `evidenceReconciliation` (RMD-002), and the observed
 * evidence under `evidenceObservations` (RMD-003) — every JSON section reads in the manifesto's
 * vocabulary. The static-guard census is `summary.staticGuards` counts alone (2.4): its
 * member detail lives in the rows (demanded → `@lint` sub-rows; undemanded → the suspense row),
 * so there is no standalone `staticGuards` section — symmetric with the runtime side.
 *
 * Parent: (@SCN-RMD-001).
 */

import type { EvidenceReconciliation, Outcome, ScenarioReconciliation } from "../model.js";
import { provenanceObject, type ProvenanceObject, type RunContext } from "../provenance/provenance.js";
import type { EvidenceObligations, UntaggedScenario } from "../census/evidenceObligations.js";
import { totalEvidenceObservations, type AttributedCount, type RuntimeEvidenceObservationKindCounts } from "../census/evidenceObservations.js";
import type { StaticEvidenceObservationKindCounts } from "../census/staticEvidenceObservations.js";

/**
 * The materialised totals over the Scenario Reconciliations — the headline verdict tally,
 * counted over EVERY row (@SCN-RMD-001, 3F-1724).
 *
 * The Evidence Reconciliation is ALL Scenario Reconciliations assembled, and the summary is
 * its totals (`the maintainers' private notes`). There are three row kinds — declared
 * (`scenario`), `phantom-scenario` (cited by a credit, declared by no feature) and
 * `suspense-scenario` (credits citing no scenario at all) — and phantom / suspense
 * reconciliations are ALWAYS out-of-balance. So `total` / `balanced` / `outOfBalance` count
 * every row, phantom and suspense among them.
 *
 * (The earlier "ruling Q3" — a declared-only tally with phantom / suspense bucketed APART —
 * was a divergence from the manifesto, not a decision: it let `isBalanced` (which correctly
 * walks every row's reconciling items → exit 1) disagree with a tally reading 0
 * out-of-balance, so a failing run rendered a headline that read as a pass. RETRACTED by the
 * operator, 2026-07-13; the bug it caused is 3F-1703.)
 */
export interface ScenarioTotals {
  /** Every Scenario Reconciliation — declared, phantom and suspense rows alike. */
  total: number;
  balanced: number;
  /** Every out-of-balance row — the phantom and suspense rows among them (they always are). */
  outOfBalance: number;
  /**
   * Phantom-scenario rows (cited by a credit, declared by no feature) — a SUB-COUNT, i.e. a
   * breakdown OF `total` / `outOfBalance`, not a bucket outside them.
   */
  phantom: number;
  /**
   * Suspense-scenario rows — credits citing NO scenario, aggregated into the one
   * `(no scenario)` row. A SUB-COUNT like `phantom`: counted INSIDE `total` and
   * `outOfBalance`, and surfaced separately so a reader recovers the declared count as
   * `total − phantom − suspense`.
   */
  suspense: number;
}

/** A missing bucket — a rendered subject (a quality-check: `lint` or a runtime quality-check) and its count. */
export interface MissingByQualityCheck {
  subject: string;
  count: number;
}

/**
 * The materialised evidence-obligation totals — the aggregate the markdown's Evidence
 * reconciliation table derives, carried AS DATA (the MATERIALISE ruling): the total, the
 * per-reconciliation-outcome breakdown, the out-of-balance sum, and the missing
 * split by rendered subject.
 */
export interface EvidenceObligationTotals {
  total: number;
  byOutcome: Record<Outcome, number>;
  outOfBalance: number;
  missingByQualityCheck: MissingByQualityCheck[];
}

/**
 * The materialised test-volume totals (RMD-005) — the runtime evidence-observation kind-counts
 * the markdown's `### Test volume` identity line derives, carried AS DATA. The identity
 * `totalEvidenceObservations = attributed + citesUnknownScenario + citesNoScenario` holds by
 * construction (one shared `countRuntimeEvidenceObservationKinds` pass), so a JSON consumer reads the balance
 * rather than re-deriving it. The two credit-side terms are named for their OUTCOME
 * (ruling Q1): `citesUnknownScenario` (on a phantom scenario) and `citesNoScenario` (on the
 * suspense scenario) — retiring the `phantom` / `suspense` identity words.
 */
export interface TestVolumeTotals {
  totalEvidenceObservations: number;
  attributed: number;
  citesUnknownScenario: number;
  citesNoScenario: number;
}

/**
 * The materialised static-guard totals (RMD-005) — the static-guard kind-counts the
 * markdown's `### Static guards` line derives, following the census shape exactly:
 * `runningGuardCount` (the volume of running guards) and `unattributedStaticGuardCount` (how many
 * of them NO `@lint` declares). The demanded count is IMPLICIT (`running − unattributed`) and is
 * not carried (every demanded guard is already a reconciled `@lint` sub-row).
 */
export interface StaticGuardTotals {
  runningGuardCount: number;
  unattributedStaticGuardCount: number;
}

/**
 * The materialised lint tally (RMD-005) — the static-only evidenceObligation tally the markdown's
 * `### Lint evidence obligations` total line derives: how many `@lint` (static) evidence obligations
 * reconcile satisfied (balanced), out of the total declared. `summary.byOutcome` is
 * kind-agnostic and cannot evidenceObservations the static-only lint total, so it is materialised explicitly.
 */
export interface LintTally {
  satisfied: number;
  total: number;
}

/** The materialised summary — the totals (manifesto: "the aggregate of the trial balance"). */
export interface Summary {
  scenarios: ScenarioTotals;
  evidenceObligations: EvidenceObligationTotals;
  /**
   * The Pending Items tally (@SCN-PND-011) — the count of Pending Items across the
   * reconciliation (one per deferred `<quality-check>pending` obligation, evidence-manifesto §11B),
   * SEPARATE from the scenario balanced / out-of-balance counts and the evidence-obligation counts.
   * A Pending Item is deferred, NOT out-of-balance, so it is NEVER folded into the seven
   * `OUT_OF_BALANCE_OUTCOMES` (never an eighth leaf) nor into `evidenceObligations` — its own tally.
   * Counts Pending ITEMS, not scenarios-carrying-pending (mirroring the out-of-balance
   * decomposition, which counts obligations, not scenarios). Always present (a pure balance derive,
   * like `lint`); reads 0 when no scenario declares a pending obligation.
   */
  pending: number;
  /** The runtime test-volume kind-counts (RMD-005) — present when the evidenceObservations read is threaded. */
  testVolume?: TestVolumeTotals;
  /** The static-guard kind-counts (RMD-005) — present when the guard read is threaded. */
  staticGuards?: StaticGuardTotals;
  /** The static-only lint evidenceObligation tally (RMD-005) — always present (a pure balance derive). */
  lint: LintTally;
}

/** The declared-evidence-obligation census section, as serialised on the report. */
export interface EvidenceObligationsSection {
  excludedOccurrences: number;
  untaggedScenarios: UntaggedScenario[];
  proseOnlyCodes: string[];
}

/**
 * The observed-evidence section (RMD-003) — the credits, retiring the made-up "evidenceObservations" word.
 *
 * The PHANTOM detail array has DISSOLVED into the phantom-scenario rows (@SCN-LDG-006):
 * a credit citing an undeclared @SCN now surfaces as a `phantom-scenario` Scenario Reconciliation
 * in `evidenceReconciliation` (carrying the id + locator on its `cites-unknown-scenario` item), so it no
 * longer double-reports as a standalone `phantomEvidenceObservations` array here. The phantom COUNT
 * survives in `summary.testVolume` (the balance-check identity is kept).
 *
 * The SUSPENSE detail array has ALSO dissolved (@SCN-LDG-007): a credit citing
 * NO @SCN now surfaces as a `cites-no-scenario` item on the suspense-scenario `(no scenario)`
 * row in `evidenceReconciliation` (carrying its locator, ruling Q5), so it no longer double-reports as
 * a standalone `suspenseEvidenceObservations` array. Its COUNT survives in `summary.testVolume`.
 */
export interface EvidenceObservationsSection {
  rawByRuntimeQualityCheck: RuntimeEvidenceObservationKindCounts["rawByRuntimeQualityCheck"];
  attributed: AttributedCount[];
}

/**
 * Presentation metadata — a small top-level object holding the run's PRESENTATION
 * facts (names/titles), kept cleanly SEPARATE from the reconciliation records (`summary` /
 * `evidenceReconciliation` / `evidenceObservations` / `staticGuards`). It carries the feature
 * titles (the `feature-code → slug` map the by-feature cut names each feature from); it is
 * NOT a reconciliation record, so it does not sit as a sibling of the records. Present only
 * when the run declares ≥1 coded feature (i.e. when `featureNames` is non-empty).
 */
export interface ReportMetadata {
  /** The feature titles — the `feature-code → slug` map (@SCN-RMD-006). */
  featureNames?: Record<string, string>;
}

/**
 * The whole-document report — the ordered sections as data. RMD-002 / RMD-003 rename the interim
 * `scenarios` / `evidenceObservations` keys to `evidenceReconciliation` / `evidenceObservations`;
 * the static-guard census is `summary.staticGuards` counts alone (2.4 — the standalone
 * `staticGuards` section collapsed, its member detail now in the rows). The `warnings` top-level
 * key was RETIRED — a zero-evidence scenario is now a `both-missing` row in
 * `evidenceReconciliation`, not a separate axis.
 */
export interface Report {
  runProvenance: ProvenanceObject;
  summary: Summary;
  evidenceObligations?: EvidenceObligationsSection;
  /** The per-scenario reconciliation — the trial balance (the revert, RMD-002). */
  evidenceReconciliation: ScenarioReconciliation[];
  /** The observed evidence — the credits (RMD-003, retiring "evidenceObservations"). */
  evidenceObservations?: EvidenceObservationsSection;
  /**
   * The presentation metadata — the small top-level object carrying the feature
   * titles (`metadata.featureNames`, the `feature-code → slug` map the by-feature cut names each
   * feature in full from). MOVED out from under a top-level `featureNames` key: it is presentation
   * *metadata* (names), NOT a reconciliation record, so it is cleanly separated from the records
   * (`summary` / `evidenceReconciliation` / `evidenceObservations` / `staticGuards`) rather than
   * sitting as their sibling. A render from the saved report alone reconstructs the
   * by-feature names from `metadata.featureNames` with no external map. Present only when the run
   * declares ≥1 coded feature. The last document key (the retired `warnings` key no longer trails
   * it).
   */
  metadata?: ReportMetadata;
}

/** The canonical quality-check subject order (lint first, then the runtime quality-checks). */
const QUALITY_CHECK_ORDER: readonly string[] = ["lint", "unit", "integration", "e2e", "performance"];

/**
 * Materialise the summary totals from the balance — the aggregate the markdown's trial-balance
 * table derives, carried AS DATA so a later render-from-saved-JSON rebuilds it with zero
 * computation (the MATERIALISE ruling). Re-derived here (not imported from
 * markdown.ts) so the markdown stays untouched this slice.
 */
function buildSummary(
  balance: EvidenceReconciliation,
  evidenceObservations?: RuntimeEvidenceObservationKindCounts,
  guards?: StaticEvidenceObservationKindCounts
): Summary {
  // The headline verdict tally counts EVERY Scenario Reconciliation (@SCN-RMD-001, 3F-1724):
  // the summary is the totals over ALL rows (double-entry-manifesto), and phantom / suspense
  // reconciliations are ALWAYS out-of-balance, so they count into the tally like any other row.
  // `phantom` / `suspense` are kept as SUB-COUNTS — a breakdown OF the total, not a bucket
  // outside it. (The retracted "ruling Q3" tallied declared rows only, which is what let the
  // tally read 0 out-of-balance on a run `isBalanced` correctly failed → exit 1: 3F-1703.)
  const verdict: Record<"balanced" | "out-of-balance", number> = { balanced: 0, "out-of-balance": 0 };
  let phantom = 0;
  let suspense = 0;
  // The Pending Items tally (@SCN-PND-011) — the count of Pending Items across the
  // reconciliation, one per deferred `<quality-check>pending` obligation. Counts ITEMS, not
  // scenarios-carrying-pending (a scenario may declare several), mirroring the out-of-balance
  // decomposition, which counts obligations, not scenarios. A Pending Item is a structurally
  // distinct category (never a reconciling item / evidence obligation), so it is tallied
  // SEPARATELY here — never folded into `byOutcome` (the seven out-of-balance leaves) below.
  let pending = 0;
  for (const s of balance.scenarioReconciliations) {
    // Pending Items ride every row's `pendingItems` (only declared scenarios carry them; a
    // phantom / suspense row has none), so the tally is a plain sum across all rows.
    pending += (s.pendingItems ?? []).length;
    // The kind sub-counts, tallied ALONGSIDE the verdict (never instead of it) — the row still
    // falls through to the verdict tally below, so a phantom / suspense reconciliation counts
    // into `total` and (being always out-of-balance) into `outOfBalance`.
    if (s.kind === "phantom-scenario") phantom++;
    if (s.kind === "suspense-scenario") suspense++;
    verdict[s.verdict]++;
  }

  // byOutcome tallies EVERY Quality Check Reconciliation across ALL rows (declared AND
  // phantom), so `cites-unknown-scenario` reflects the real phantom count.
  const byOutcome: Record<Outcome, number> = {
    satisfied: 0,
    "missing": 0,
    "failing": 0,
    "watermelon": 0,
    "cites-unknown-scenario": 0,
    "cites-no-scenario": 0,
    // The broken reconciling item (@SCN-LDG-017) — a proving suite that failed to collect. A
    // machine consumer reads run-soundness off this count: `byOutcome.broken > 0` ⇒ any `missing`
    // in the run may be a BROKEN proof rather than an absent one.
    "broken": 0,
    // The undemanded reconciling item (@SCN-LDG-008) — a credit citing a real
    // scenario at an undeclared quality-check. Shown here so a reader sees it break out of
    // the reconciliation-matched-attributed count (ruling Q1).
    "undemanded": 0,
    // The both-missing reconciling item (@SCN-LDG-009) — the NEITHER-side outcome:
    // a declared scenario reconciling to zero rows on both sides. `byOutcome` is now 8-valued.
    "both-missing": 0,
  };
  const missing = new Map<string, number>();
  for (const s of balance.scenarioReconciliations) {
    for (const o of s.evidenceObligations) {
      byOutcome[o.outcome]++;
      // The subject IS the flat quality-check — `lint` or a runtime quality-check. The
      // both-missing item carries no quality-check (it is not a `missing` evidence obligation), so the
      // guard both narrows the type and keeps it out of the missing split.
      if (o.outcome === "missing" && o.qualityCheck) {
        missing.set(o.qualityCheck, (missing.get(o.qualityCheck) ?? 0) + 1);
      }
    }
  }
  const total = (Object.values(byOutcome) as number[]).reduce((a, b) => a + b, 0);

  return {
    scenarios: {
      // Every row's verdict is tallied, so this IS the count of all Scenario Reconciliations
      // (declared + phantom + suspense) — the manifesto's "the summary is the totals".
      total: verdict.balanced + verdict["out-of-balance"],
      balanced: verdict.balanced,
      outOfBalance: verdict["out-of-balance"],
      // Sub-counts: a breakdown OF the totals above (declared = total − phantom − suspense).
      phantom,
      suspense,
    },
    evidenceObligations: {
      total,
      byOutcome,
      outOfBalance: total - byOutcome.satisfied,
      missingByQualityCheck: QUALITY_CHECK_ORDER.filter((s) => (missing.get(s) ?? 0) > 0).map(
        (subject) => ({ subject, count: missing.get(subject)! })
      ),
    },
    // The Pending Items tally (@SCN-PND-011) — its OWN summary count, SEPARATE from the
    // scenario verdict counts and the evidence-obligation counts. A Pending Item is deferred,
    // not out-of-balance, so it is never one of the seven `OUT_OF_BALANCE_OUTCOMES` (never an
    // eighth `byOutcome` leaf). Always present (a pure balance derive, like `lint`); reads 0
    // when no scenario declares a pending obligation.
    pending,
    // The runtime test-volume kind-counts (RMD-005), materialised only when the evidenceObservations read is
    // threaded. Ruling Q1: this `attributed` is the TEST-VOLUME attributed — credits that
    // CITE A DECLARED SCENARIO, which INCLUDES undemanded as a subset (matched-pair + undemanded). It
    // is a DIFFERENT number from the reconciliation-matched-attributed (Σ evidenceObservations.attributed[].count,
    // which shrank as undemanded broke out into summary.byOutcome). Keeping undemanded inside this
    // count preserves the 3-termed identity `totalEvidenceObservations = attributed +
    // citesUnknownScenario + citesNoScenario` (undemanded is a subset here, NOT a 4th identity
    // term) — the same shape the markdown's `### Test volume` line derives.
    ...(evidenceObservations
      ? {
          testVolume: {
            totalEvidenceObservations: totalEvidenceObservations(evidenceObservations),
            attributed:
              evidenceObservations.attributed.reduce((n, a) => n + a.count, 0) +
              evidenceObservations.undemandedCount,
            citesUnknownScenario: evidenceObservations.phantomCount,
            citesNoScenario: evidenceObservations.suspenseCount,
          },
        }
      : {}),
    // The static-guard kind-counts (RMD-005), materialised only when the guard
    // read is threaded — the pure COUNTER's output (`countStaticEvidenceObservationKinds`, computed
    // in cli), symmetric with the runtime `testVolume` counter. The surface follows the census
    // shape exactly (`{ runningGuardCount, unattributedStaticGuardCount }`; demanded is implicit),
    // so it is a direct pass-through. The member detail lives in the rows (demanded → each
    // scenario's `@lint` sub-row; undemanded → the suspense row) — there is no census section
    // (2.4).
    ...(guards ? { staticGuards: guards } : {}),
    // The static-only lint tally (RMD-005) — replicates markdown's `countStaticEvidenceObligations`
    // (static evidenceObligations balanced / total). Always present (a pure balance derive); `byOutcome`
    // is kind-agnostic and cannot evidenceObservations this static-only cut.
    lint: buildLintTally(balance),
  };
}

/**
 * The static-only lint tally (RMD-005) — how many `@lint` (static) evidence obligations reconcile
 * satisfied (`balanced`), out of the total declared. Byte-for-byte the markdown's
 * `countStaticEvidenceObligations` (`src/render/markdown.ts`), so slice 2 can read `satisfied` / `total`
 * with zero byte change. `summary.byOutcome` counts ALL kinds, so the static-only total is derived
 * here explicitly.
 */
function buildLintTally(balance: EvidenceReconciliation): LintTally {
  let satisfied = 0;
  let total = 0;
  for (const s of balance.scenarioReconciliations) {
    // DECLARED rows only — a lint evidence obligation is declared-side. The suspense row's lint
    // credit (an unattributed static-guard, cites-no-scenario) is not an evidence obligation and
    // must not inflate the declared lint total.
    if (s.kind === "phantom-scenario" || s.kind === "suspense-scenario") continue;
    for (const o of s.evidenceObligations) {
      if (o.qualityCheck !== "lint") continue;
      total++;
      if (o.outcome === "satisfied") satisfied++;
    }
  }
  return { satisfied, total };
}

/**
 * Assemble the whole-document report from the reconcile pieces. The JSON-surface vocabulary
 * lives HERE (mapped, not renamed at the model): `provenance` → `runProvenance`; `scenarios`
 * → `evidenceReconciliation`; `evidenceObservations` → `evidenceObservations` (+ `phantom`/`unattributed evidence observation` →
 * `phantomEvidenceObservations`/`suspenseEvidenceObservations`); the static-guard census is the
 * materialised `summary.staticGuards` counts alone (2.4 — no standalone section, the
 * member detail lives in the rows); the summary is materialised. Sections are inserted in document
 * order, so JSON.stringify preserves it. The optional sections are included only when their sibling
 * read is threaded (the CLI always threads them; the narrower-arg tests exercise omission).
 */
export function assembleReport(
  balance: EvidenceReconciliation,
  ctx: RunContext,
  evidenceObligations?: EvidenceObligations,
  evidenceObservations?: RuntimeEvidenceObservationKindCounts,
  guards?: StaticEvidenceObservationKindCounts,
  featureNames?: ReadonlyMap<string, string>
): Report {
  return {
    runProvenance: provenanceObject(ctx),
    summary: buildSummary(balance, evidenceObservations, guards),
    ...(evidenceObligations
      ? {
          evidenceObligations: {
            excludedOccurrences: evidenceObligations.excludedOccurrences,
            untaggedScenarios: evidenceObligations.untaggedScenarios,
            proseOnlyCodes: evidenceObligations.proseOnlyCodes,
          },
        }
      : {}),
    // No staticGuards census SECTION (2.4): the guard member detail lives in the rows
    // (demanded → each scenario's `@lint` sub-row; undemanded → the suspense row), symmetric with
    // the runtime side. The counts survive in `summary.staticGuards` (the balance-check identity).
    evidenceReconciliation: balance.scenarioReconciliations,
    ...(evidenceObservations
      ? {
          evidenceObservations: {
            rawByRuntimeQualityCheck: evidenceObservations.rawByRuntimeQualityCheck,
            attributed: evidenceObservations.attributed,
            // phantom dissolved into the phantom-scenario rows; suspense dissolved into
            // the suspense-scenario row. Both counts kept in summary.testVolume.
          },
        }
      : {}),
    // The presentation metadata — the feature titles (@SCN-RMD-006), the by-feature
    // cut's `feature-code → slug` map, now nested under a small top-level `metadata` object
    // rather than a top-level `featureNames` sibling of the reconciliation records. It is
    // presentation metadata (names), not a reconciliation record, so it sits apart from the
    // records; a render from the saved report alone reconstructs the by-feature names
    // from `metadata.featureNames` with no external map. Included only when the run declares ≥1
    // coded feature — the LAST document key (the retired `warnings` key no longer trails it).
    ...(featureNames && featureNames.size > 0
      ? { metadata: { featureNames: Object.fromEntries(featureNames) } }
      : {}),
  };
}
