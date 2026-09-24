/**
 * The whole-document report model (@SCN-RMD-001) — the ONE model
 * both renderings consume, in document order, so the JSON and the markdown are one
 * model in two renderings, not two dialects.
 *
 * `assembleRenderInput` builds it from the existing reconcile pieces (the balance, the run
 * context, and the obligation / observation / static-check sibling reads). The JSON renderer collapses
 * to a glue-free `JSON.stringify(assembleRenderInput(...))`. The assembler is the ONLY place the
 * JSON-surface vocabulary lives — the manifesto-vocabulary key renames (the revert)
 * are MAPPED here so they never ripple into markdown.ts / evidenceObservations.ts internals, keeping the
 * markdown byte-identical this slice.
 *
 * The sections are in document order with `runProvenance` renamed, a materialised `summary`,
 * the per-scenario reconciliation under `evidenceReconciliation` (RMD-002), and the observed
 * evidence under `evidenceObservations` (RMD-003) — every JSON section reads in the manifesto's
 * vocabulary. The static-check census is `summary.staticChecks` counts alone (2.4): its
 * member detail lives in the rows (named → fitness sub-rows; no-evidence-obligation → the suspense row),
 * so there is no standalone `staticChecks` section — symmetric with the runtime side.
 *
 * Parent: (@SCN-RMD-001).
 */

import type { ScenarioCodeError, ScenarioCodePopulation } from "../domain/scenarioCodeError.js";
import type { Ledger } from "../model.js";
// The Evidence Reconciliation arrives WHOLE from the concept that owns it (3F-2233); this module
// computes nothing. `Summary` and its sub-types are re-exported below so the frozen v1 barrel keeps
// the same surface off `./assemble/renderInput.js` — only their home moved.
import type { EvidenceReconciliation, Summary } from "../domain/evidenceReconciliation.js";
import { provenanceObject, type ProvenanceObject, type RunContext } from "../provenance/provenance.js";
import type { EvidenceObligations, SharedScnCode, UntaggedScenario } from "../census/evidenceObligations.js";

// The Ledger-pure summary-tally types moved to `domain/ledger` (3F-2000, Read @SCN-RMD-001) —
// "the summary is its totals". Re-exported here so the public v1 barrel (`index.ts`) keeps the
// SAME surface off `./assemble/renderInput.js`; only the types' home moved.
export type {
  ScenarioReconciliationTotals,
  EvidenceObligationTotals,
  MissingByQualityCheck,
  FitnessTally,
} from "../domain/ledger.js";
export type {
  Summary,
  TestVolumeTotals,
  StaticCheckTotals,
  EvidenceReconciliation,
} from "../domain/evidenceReconciliation.js";

/** The evidence-obligation census section, as serialised on the report. */
export interface EvidenceObligationsSection {
  excludedOccurrences: number;
  untaggedScenarios: UntaggedScenario[];
  proseOnlyCodes: string[];
  /** The codes more than one scenario carries (@SCN-STG-017) — present only when non-empty. */
  sharedScnCodes?: SharedScnCode[];
}

// The observed-evidence `EvidenceObservationsSection` interface is RETIRED (3F-2104):
// the section is no longer emitted (3F-2103), and its raw totals re-home onto
// `summary.rawByRuntimeQualityCheck` (a Ledger fold). The per-`(scnId, quality-check)` `attributed[]`
// re-represented the Ledger's posted credits and was deleted, not relocated.

/**
 * Presentation metadata — a small top-level object holding the run's PRESENTATION
 * facts (names/titles), kept cleanly SEPARATE from the reconciliation records (`summary` /
 * `evidenceReconciliation` / `evidenceObservations` / `staticChecks`). It carries the feature
 * titles (the `feature-code → slug` map the by-feature cut names each feature from); it is
 * NOT a reconciliation record, so it does not sit as a sibling of the records. Present only
 * when the run carries ≥1 coded feature (i.e. when `featureNames` is non-empty).
 */
export interface ReportMetadata {
  /** The feature titles — the `feature-code → slug` map (@SCN-RMD-006). */
  featureNames?: Record<string, string>;
}

/**
 * The whole-document report — the ordered sections as data. RMD-002 / RMD-003 rename the interim
 * `scenarios` / `evidenceObservations` keys to `evidenceReconciliation` / `evidenceObservations`;
 * the static-check census is `summary.staticChecks` counts alone (2.4 — the standalone
 * `staticChecks` section collapsed, its member detail now in the rows). The `warnings` top-level
 * key was RETIRED — a zero-evidence scenario is now a `both-missing` row in
 * `evidenceReconciliation`, not a separate axis.
 */
export interface RenderInput {
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
  /** The corpus's scenario code errors (3F-3635); absent when no corpus was judged. */
  scenarioCodeErrors?: readonly ScenarioCodeError[];
  /** The population the codes were judged over (3F-3666), so a re-render states it unchanged. */
  scenarioCodePopulation?: ScenarioCodePopulation;
  evidenceObligations?: EvidenceObligationsSection;
  // The `evidenceObservations` section is RETIRED (@SCN-RPT-010, 3F-2103): the runtime
  // evidence-observation counting folds onto the Ledger (`runtimeObservationTally`), its raw totals
  // re-homed onto `summary.rawByRuntimeQualityCheck`; the posted credits live on the ledger rows.
  // (`EvidenceObservationsSection` stays defined + barrel-exported until 3F-2104.)
  /**
   * The presentation metadata — the feature titles (`metadata.featureNames`, the
   * `feature-code → slug` map the by-feature cut names each feature in full from). It is
   * presentation *metadata* (names), NOT a reconciliation record, so it is cleanly separated
   * from the records rather than sitting as their sibling. The LAST document key (the retired
   * `warnings` key no longer trails it).
   */
  metadata?: ReportMetadata;
}

/**
 * Assemble the whole-document report from the reconcile pieces. The JSON-surface vocabulary
 * lives HERE (mapped, not renamed at the model): `provenance` → `runProvenance`; `scenarios`
 * → `evidenceReconciliation`; `evidenceObservations` → `evidenceObservations` (+ `phantom`/`suspense` →
 * `phantomEvidenceObservations`/`suspenseEvidenceObservations`); the static-check census is the
 * materialised `summary.staticChecks` counts alone (2.4 — no standalone section, the
 * member detail lives in the rows); the summary is materialised. Sections are inserted in document
 * order, so JSON.stringify preserves it. The optional sections are included only when their sibling
 * read is threaded (the CLI always threads them; the narrower-arg tests exercise omission).
 */
export function assembleRenderInput(
  evidenceReconciliation: EvidenceReconciliation,
  ctx: RunContext,
  evidenceObligations?: EvidenceObligations,
  featureNames?: ReadonlyMap<string, string>
): RenderInput {
  return {
    runProvenance: provenanceObject(ctx),
    // THE CONCEPT, SPREAD (3F-2233) — `summary` then `ledger`, exactly the key order the document
    // has always had, so the JSON is byte-identical. `assemble` no longer BUILDS either: the
    // Evidence Reconciliation arrives whole from its own factory, and this function only frames it
    // with the run's provenance, the census section and the presentation metadata.
    ...evidenceReconciliation,
    ...(evidenceObligations
      ? {
          evidenceObligations: {
            excludedOccurrences: evidenceObligations.excludedOccurrences,
            untaggedScenarios: evidenceObligations.untaggedScenarios,
            proseOnlyCodes: evidenceObligations.proseOnlyCodes,
            ...(evidenceObligations.sharedScnCodes && evidenceObligations.sharedScnCodes.length > 0
              ? { sharedScnCodes: evidenceObligations.sharedScnCodes }
              : {}),
          },
        }
      : {}),
    // No staticChecks census SECTION (2.4): the guard member detail lives in the rows
    // (named → each scenario's fitness sub-row; no-evidence-obligation → the suspense row), symmetric with
    // the runtime side. The counts survive in `summary.staticChecks` (the balance-check identity).

    // No `evidenceObservations` SECTION (@SCN-RMD-003 / @SCN-RPT-010, 3F-2103): the runtime
    // evidence-observation counting is RETIRED to the Ledger fold (`runtimeObservationTally`). Its
    // raw totals re-home onto `summary.rawByRuntimeQualityCheck`; the per-`(scnId, quality-check)`
    // `attributed[]` did NOT re-home — it re-represented the posted credits the Ledger already
    // carries (`ledger.scenarioReconciliations[].evidenceObservations`), the parallel store the
    // done-criterion deletes rather than relocates. The grid cell counts those credits off the rows.
    ...(featureNames && featureNames.size > 0
      ? { metadata: { featureNames: Object.fromEntries(featureNames) } }
      : {}),
  };
}
