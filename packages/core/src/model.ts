/**
 * The reconciliation data model — now a thin re-export of the co-located domain concept
 * modules under `domain/**` (3F-1994, the DDD retrofit's Slice A). The types and their
 * behaviour moved to the modules that OWN them — each concept co-locating its type with its
 * pure free functions (module, not class):
 *   - `domain/journal.ts`                   — the debit/credit input concepts (evidence
 *                                              obligations, scenarios, evidence observations,
 *                                              pending items) + `evidenceObligationPairsOf`.
 *   - `domain/qualityCheckReconciliation.ts` — the reconciling item (`Outcome`,
 *                                              `OUTCOME_DESCRIPTION`, `OUT_OF_BALANCE_OUTCOMES`,
 *                                              `QualityCheckReconciliation`) +
 *                                              `reconcileEvidenceObligation`.
 *   - `domain/scenarioReconciliation.ts`     — the account (`ScenarioReconciliation`,
 *                                              `ScenarioVerdict`, `ScenarioKind`) + `verdictFor` /
 *                                              `reconcilingItemsOf`.
 *   - `domain/ledger.ts`                     — the Ledger + the whole-run predicates.
 *
 * This module stays as the stable internal aggregation point (`../model.js`) so the many
 * in-core importers and the frozen v1 barrel (`index.ts`, @SCN-API-001) see the SAME surface —
 * only the concepts' HOME moved. It is NOT a `domain/**` module itself (it re-exports across the
 * concept modules, and it sits OUTSIDE `packages/core/src/domain/`, which is what `lint:boundaries`'s
 * `domain-imports-adapter` rule is scoped to — the domain-purity guard's population until 3F-3438).
 */

export * from "./domain/journal.js";
export * from "./domain/qualityCheckReconciliation.js";
export * from "./domain/scenarioReconciliation.js";
export * from "./domain/ledger.js";
