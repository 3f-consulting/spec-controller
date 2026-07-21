/**
 * THE LEDGER — the accounts with their posted entries, co-located with its OWN whole-run
 * behaviour: `isBalanced`, `hasPendingItems`, `hasBrokenEvidence` (module, not class). These
 * three pure predicates are the whole-run verdict surface the CLI edge maps to exit codes;
 * they were the reconcile orchestration's exports and now live WITH the concept they fold over.
 */

import type { Outcome } from "./qualityCheckReconciliation.js";
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

// ---------------------------------------------------------------------------
// THE LEDGER'S SUMMARY TALLY (3F-2000, Read @SCN-RMD-001) — co-located here because
// "the summary is the totals" (double-entry-manifesto): the Ledger computes how many balance
// because it IS the balance. These are the LEDGER-PURE derivations of the report's `summary`
// (the verdict tally, `byOutcome`, `missingByQualityCheck`, `pending`, and the static-only lint
// tally) — pure functions over `Ledger`, moved out of `assemble/report.ts`'s `buildSummary` /
// `buildLintTally`. The census pass-throughs (`testVolume`, `staticGuards`) are NOT Ledger-pure
// and stay in the assembler, which merges this tally with them.
// ---------------------------------------------------------------------------

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
export interface ScenarioReconciliationTotals {
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
 * The materialised lint tally (RMD-005) — the static-only evidenceObligation tally the markdown's
 * `### Lint evidence obligations` total line derives: how many `@lint` (static) evidence obligations
 * reconcile satisfied (balanced), out of the total declared. `summary.byOutcome` is
 * kind-agnostic and cannot evidenceObservations the static-only lint total, so it is materialised explicitly.
 */
export interface LintTally {
  satisfied: number;
  total: number;
}

/**
 * The LEDGER-PURE part of the report summary — every totals field derived from the `Ledger`
 * alone. The assembler merges this with the census pass-throughs (`testVolume`, `staticGuards`)
 * and interleaves the keys in document order to build the full `Summary`.
 */
export interface LedgerTally {
  scenarioReconciliations: ScenarioReconciliationTotals;
  evidenceObligations: EvidenceObligationTotals;
  pending: number;
  lint: LintTally;
}

/** The canonical quality-check subject order (lint first, then the runtime quality-checks). */
const QUALITY_CHECK_ORDER: readonly string[] = ["lint", "unit", "integration", "e2e", "performance"];

/**
 * Tally the LEDGER-PURE summary totals from the balance — the aggregate the markdown's
 * trial-balance table derives, carried AS DATA so a later render-from-saved-JSON rebuilds it with
 * zero computation (the MATERIALISE ruling). The census pass-throughs (`testVolume`,
 * `staticGuards`) are not Ledger-pure and are merged in by the assembler.
 */
export function ledgerTally(balance: Ledger): LedgerTally {
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
  // SEPARATELY here — never folded into `byOutcome` (the out-of-balance leaves) below.
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
    // The debit twin of cites-no-scenario (@SCN-LDG-021) — a scenario with no @SCN code to link.
    "no-scn-code": 0,
    // The broken reconciling item — a proof that NEVER RAN: a vitest suite that failed to collect
    // (@SCN-LDG-017), or a cucumber step matched by two or more definitions (@SCN-LDG-019). A
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
    for (const o of s.qualityCheckReconciliations) {
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
    scenarioReconciliations: {
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
    // not out-of-balance, so it is never one of the `OUT_OF_BALANCE_OUTCOMES` (never a `byOutcome`
    // leaf of its own, at any leaf count). Always present (a pure balance derive, like `lint`);
    // reads 0 when no scenario declares a pending obligation.
    pending,
    // The static-only lint tally (RMD-005) — replicates markdown's `countStaticEvidenceObligations`
    // (static evidenceObligations balanced / total). Always present (a pure balance derive); `byOutcome`
    // is kind-agnostic and cannot evidenceObservations this static-only cut.
    lint: lintTally(balance),
  };
}

/**
 * The static-only lint tally (RMD-005) — how many `@lint` (static) evidence obligations reconcile
 * satisfied (`balanced`), out of the total declared. Byte-for-byte the markdown's
 * `countStaticEvidenceObligations` (`src/render/markdown.ts`), so slice 2 can read `satisfied` / `total`
 * with zero byte change. `summary.byOutcome` counts ALL kinds, so the static-only total is derived
 * here explicitly.
 */
export function lintTally(balance: Ledger): LintTally {
  let satisfied = 0;
  let total = 0;
  for (const s of balance.scenarioReconciliations) {
    // DECLARED rows only — a lint evidence obligation is declared-side. The suspense row's lint
    // credit (an unattributed static-guard, cites-no-scenario) is not an evidence obligation and
    // must not inflate the declared lint total.
    if (s.kind === "phantom-scenario" || s.kind === "suspense-scenario") continue;
    for (const o of s.qualityCheckReconciliations) {
      if (o.qualityCheck !== "lint") continue;
      total++;
      if (o.outcome === "satisfied") satisfied++;
    }
  }
  return { satisfied, total };
}
