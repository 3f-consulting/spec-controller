/**
 * THE LEDGER — the accounts with their posted entries, co-located with its OWN whole-run
 * behaviour: `isBalanced`, `hasPendingItems`, `hasBrokenEvidence` (module, not class). These
 * three pure predicates are the whole-run verdict surface the CLI edge maps to exit codes;
 * they were the reconcile orchestration's exports and now live WITH the concept they fold over.
 */

import type { ScenarioReconciliation } from "./scenarioReconciliation.js";

/**
 * THE LEDGER — the accounts with their POSTED ENTRIES. Canon (double-entry-manifesto, chain
 * step 4 + the Ledger entry): "the evidence obligations (debits) and evidence observations
 * (credits) organised by real or invented scenario, keyed by quality-check — THIS IS WHERE
 * RECONCILIATION HAPPENS."
 *
 * RENAMED FROM `Ledger` (3F-1846 / 3F-1830). 3F-1138 corrected a real error — the
 * rendered report was titled `# Ledger`, and the per-scenario reconciliation is the trial balance,
 * not the ledger — but corrected it by DELETING the concept rather than distinguishing it. The
 * Ledger was never the report, so removing the report's wrong name should not have removed the
 * Ledger. This restores it. `Ledger` is now canon's name for LAYER 1 — the
 * assembled statement (`assemble/report.ts`, formerly `EvidenceReconciliation`); the four layers are
 * `Ledger` → `Ledger` → `ScenarioReconciliation` → `QualityCheckReconciliation`,
 * under canon's four names.
 *
 * The Ledger is NOT a second name for the Evidence Reconciliation, and NOT a pre-reconciliation
 * input stage: the SAME accounts live in it before and after balancing off, gaining their verdict
 * IN PLACE. It holds entries, so it is an OBJECT and never a bare array of rows — the code and the
 * JSON are one vocabulary (`interface Ledger { scenarioReconciliations }` ↔
 * `"ledger": { "scenarioReconciliations": [...] }`).
 *
 * `scenarioReconciliations` (renamed from `scenarios`) is the collection of Scenario
 * Reconciliation rows — declared (`kind: scenario`, including the degenerate `both-missing`
 * row a zero-evidence scenario posts), cited-but-undeclared (`kind: phantom-scenario`), and
 * cites-nothing (`kind: suspense-scenario`). The name reserves `scenario`/`scenarios` for the
 * DECLARED kind (a phantom / suspense is NOT a scenario).
 *
 * EVERY declared scenario is a row now: the separate-axis authoring-quality
 * `warnings` collection was RETIRED — a scenario declaring zero evidence obligations and cited
 * by no evidence observation reconciles to a `both-missing` out-of-balance row, not a warning excluded
 * from the balance.
 */
export interface Ledger {
  scenarioReconciliations: ScenarioReconciliation[];
}

/**
 * The WHOLE-RUN verdict — is the ENTIRE reconciliation balanced? A pure domain
 * derivation over the WHOLE `Ledger`: balanced IFF NO reconciling
 * item exists ANYWHERE, across every Scenario Reconciliation row — declared,
 * phantom, and suspense alike. Out-of-balance iff ANY row carries a reconciling
 * item: a declared scenario's out-of-balance items (failing / missing /
 * undemanded / both-missing) AND the credit-side suspense/phantom rows (an
 * undemanded static-guard watermelon, an uncited credit, a phantom scenario).
 *
 * It is deliberately NOT a scan of DECLARED-scenario verdicts alone — that would
 * let a watermelon-only run (every declared scenario balanced, yet an undemanded
 * static guard sitting unreconciled in the suspense row) read as balanced, the
 * false pass a CI gate must never give. Every row's `reconcilingItems` is
 * consulted, so the suspense/phantom rows (verdict ALWAYS out-of-balance) count.
 *
 * The CLI edge maps this boolean to the process exit code — balanced → 0,
 * out-of-balance → EXACTLY 1 — an ENUMERATED status, never a count (a count would
 * 8-bit `& 0xFF` wrap → false pass).
 */
export function isBalanced(reconciliation: Ledger): boolean {
  return reconciliation.scenarioReconciliations.every(
    (row) => row.reconcilingItems.length === 0
  );
}

/**
 * Does the WHOLE reconciliation carry any Pending Item? A pure domain predicate over the
 * WHOLE `Ledger`, SYMMETRIC with `isBalanced` — together they are the
 * whole-run verdict surface. True iff ANY Scenario Reconciliation row carries a Pending
 * Item (a deferred `<quality-check>pending` obligation partitioned off before reconciliation,
 * @SCN-PND-004). Pending Items are run-neutral by default (@SCN-PND-008); the CLI edge
 * consults this ALONGSIDE `isBalanced` to escalate an otherwise-balanced run to the distinct
 * exit code 3 under `--strict` (@SCN-CLI-011) — an OPT-IN gate on deferred obligations,
 * checked only when `isBalanced` is true (out-of-balance dominates, exit 1).
 */
export function hasPendingItems(reconciliation: Ledger): boolean {
  return reconciliation.scenarioReconciliations.some((row) => row.pendingItems.length > 0);
}

/**
 * Does the WHOLE reconciliation carry BROKEN evidence — i.e. is the run UNSOUND? The THIRD
 * whole-run predicate (@SCN-LDG-018), beside `isBalanced` and `hasPendingItems`, and the
 * EXISTENTIAL TWIN of the latter: the same `some(row => some(item => item.outcome === X))` scan.
 *
 * Soundness is a property of the RUN, not of a scenario. If any PROOF NEVER RAN — a vitest suite
 * that failed to collect (@SCN-LDG-017), or a cucumber step matched by two or more definitions
 * (@SCN-LDG-019) — the evidence never fully materialised, so every `missing` in that run is
 * SUSPECT: it may be a broken proof rather than an absent one, and the remedies differ (fix the
 * harness vs write a test). The scenario's own row stays honest at its own resolution (`missing`);
 * the RUN is what is stamped unsound.
 *
 * DERIVED, NEVER STORED — no soundness flag is written onto `Ledger`, the same
 * no-drift reason `isBalanced` and `hasPendingItems` derive. Machine consumers read soundness off
 * `summary.byOutcome.broken > 0` (type-forced into the JSON the moment `broken` joined the
 * `Outcome` union); the markdown renderer prints the HEADLINE word — "unsound" is the render word,
 * never the predicate's name, exactly as "out-of-balance" is for `isBalanced`.
 *
 * Keyed on the `broken` OUTCOME specifically, never on `!isBalanced`: an ordinary out-of-balance
 * run (an honest `missing`, no broken evidence) is perfectly SOUND. The three whole-run
 * predicates are INDEPENDENT — a run may carry Pending Items and be sound; a run may carry broken
 * evidence and no Pending Items. (A broken run is ALWAYS out-of-balance, since the `broken` item
 * sits on the suspense row — which is why the CLI edge must consult THIS predicate BEFORE the
 * balance verdict, @SCN-CLI-012, or its exit code would be unreachable.)
 */
export function hasBrokenEvidence(reconciliation: Ledger): boolean {
  return reconciliation.scenarioReconciliations.some((row) =>
    row.reconcilingItems.some((item) => item.outcome === "broken")
  );
}
