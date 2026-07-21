/**
 * The whole-document report model (@SCN-RMD-001) — the ONE model
 * both renderings consume, in document order, so the JSON and the markdown are one
 * model in two renderings, not two dialects.
 *
 * `assembleReport` builds it from the existing reconcile pieces (the balance, the run
 * context, and the declared / observed / static guard sibling reads). The JSON renderer collapses
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

import type { Ledger } from "../model.js";
import { ledgerTally } from "../domain/ledger.js";
import type {
  ScenarioReconciliationTotals,
  EvidenceObligationTotals,
  MissingByQualityCheck,
  LintTally,
} from "../domain/ledger.js";
import { provenanceObject, type ProvenanceObject, type RunContext } from "../provenance/provenance.js";
import type { EvidenceObligations, UntaggedScenario } from "../census/evidenceObligations.js";
import { totalEvidenceObservations, type AttributedCount, type RuntimeEvidenceObservationKindCounts } from "../census/evidenceObservations.js";
import type { StaticEvidenceObservationKindCounts } from "../census/staticEvidenceObservations.js";

// The Ledger-pure summary-tally types moved to `domain/ledger` (3F-2000, Read @SCN-RMD-001) —
// "the summary is its totals". Re-exported here so the frozen v1 barrel (`index.ts`,
// @SCN-API-001) keeps the SAME surface off `./assemble/report.js`; only the types' home moved.
export type {
  ScenarioReconciliationTotals,
  EvidenceObligationTotals,
  MissingByQualityCheck,
  LintTally,
} from "../domain/ledger.js";

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
 * `runningGuardCount` (the volume of running static guards) and `unattributedStaticGuardCount` (how many
 * of them NO `@lint` declares). The demanded count is IMPLICIT (`running − unattributed`) and is
 * not carried (every demanded static guard is already a reconciled `@lint` sub-row).
 */
export interface StaticGuardTotals {
  runningGuardCount: number;
  unattributedStaticGuardCount: number;
}

/** The materialised summary — the totals (manifesto: "the aggregate of the trial balance"). */
export interface Summary {
  scenarioReconciliations: ScenarioReconciliationTotals;
  evidenceObligations: EvidenceObligationTotals;
  /**
   * The Pending Items tally (@SCN-PND-011) — the count of Pending Items across the
   * reconciliation (one per deferred `<quality-check>pending` obligation, evidence-manifesto §11B),
   * SEPARATE from the scenario balanced / out-of-balance counts and the evidence-obligation counts.
   * A Pending Item is deferred, NOT out-of-balance, so it is NEVER folded into
   * `OUT_OF_BALANCE_OUTCOMES` (never a leaf of its own, at any leaf count — the constraint is
   * categorical, not arithmetic) nor into `evidenceObligations` — its own tally.
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
export interface EvidenceReconciliation {
  runProvenance: ProvenanceObject;
  summary: Summary;
  /**
   * THE LEDGER — the accounts with their posted entries (@SCN-RMD-002, 3F-1848). Sits BESIDE
   * `summary`, so root reads as chain step 6 literally: "The summary has the totals and the ledger
   * the detail."
   *
   * Renamed from the member `evidenceReconciliation` — the 3F-1138 error ONE LAYER DOWN. This
   * document IS the Evidence Reconciliation, so a key of that name was the layer naming itself
   * inside itself, and the grid it named is by canon the LEDGER.
   *
   * Typed `Ledger`, NOT `ScenarioReconciliation[]`: code identifiers and JSON keys are ONE
   * vocabulary (manifesto line 3), so this and `"ledger": { "scenarioReconciliations": [...] }`
   * agree as OBJECTS — a Ledger that holds entries cannot serialise as a bare array of rows.
   */
  ledger: Ledger;
  evidenceObligations?: EvidenceObligationsSection;
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

/**
 * Materialise the summary totals from the balance — the aggregate the markdown's trial-balance
 * table derives, carried AS DATA so a later render-from-saved-JSON rebuilds it with zero
 * computation (the MATERIALISE ruling). THIN COMPOSITION (3F-2000): the LEDGER-PURE totals
 * (`scenarioReconciliations`, `evidenceObligations`, `pending`, `lint`) come from `ledgerTally`
 * — the Ledger owns its own totals ("the summary is its totals") — and are MERGED here with the
 * census pass-throughs (`testVolume`, `staticGuards`), which are NOT Ledger-pure. The keys are
 * assembled in DOCUMENT ORDER (…, testVolume?, staticGuards?, lint) so the JSON stays
 * byte-identical.
 */
function buildSummary(
  balance: Ledger,
  evidenceObservations?: RuntimeEvidenceObservationKindCounts,
  guards?: StaticEvidenceObservationKindCounts
): Summary {
  const tally = ledgerTally(balance);
  return {
    scenarioReconciliations: tally.scenarioReconciliations,
    evidenceObligations: tally.evidenceObligations,
    pending: tally.pending,
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
    // The static-only lint tally (RMD-005), a LEDGER-PURE derive from `ledgerTally` — LAST key in
    // document order (after the census pass-throughs).
    lint: tally.lint,
  };
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
  balance: Ledger,
  ctx: RunContext,
  evidenceObligations?: EvidenceObligations,
  evidenceObservations?: RuntimeEvidenceObservationKindCounts,
  guards?: StaticEvidenceObservationKindCounts,
  featureNames?: ReadonlyMap<string, string>
): EvidenceReconciliation {
  return {
    runProvenance: provenanceObject(ctx),
    summary: buildSummary(balance, evidenceObservations, guards),
    // THE LEDGER, beside the summary (@SCN-RMD-002) — chain step 6 read literally: "The summary
    // has the totals and the ledger the detail." An OBJECT mirroring `interface Ledger {
    // scenarioReconciliations }`, never a bare array: the accounts arrive carrying the entries
    // 3F-1846 and 3F-1847 posted, so every entry is visible ON THE ARTEFACT — including the
    // pending credit that reconciles to nothing (3F-1831 makes it correct; here it becomes
    // VISIBLE).
    ledger: { scenarioReconciliations: balance.scenarioReconciliations },
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
