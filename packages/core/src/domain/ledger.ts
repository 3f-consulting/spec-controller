/**
 * THE LEDGER — the accounts with their posted entries, co-located with its OWN whole-run
 * behaviour: `isBalanced`, `hasPendingItems`, `hasBrokenEvidence` (module, not class). These
 * three pure predicates are the whole-run verdict surface the CLI edge maps to exit codes;
 * they were the reconcile orchestration's exports and now live WITH the concept they fold over.
 */

import type { Outcome, QualityCheckReconciliation } from "./qualityCheckReconciliation.js";
import type { ScenarioReconciliation } from "./scenarioReconciliation.js";
// The row-level static-check cut (3F-2203) — the Ledger-wide lint list is built ON it, so the
// obligation-side rule is stated once, at the row.
import { staticCheckReconciliationsOf, isScenario } from "./scenarioReconciliation.js";
import type { RuntimeQualityCheck, GuardEvidenceObservation } from "./journal.js";

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
 * Reconciliation rows — real (`kind: scenario`, including the degenerate `both-missing`
 * row a zero-evidence scenario posts), cited-but-UNKNOWN (`kind: phantom-scenario`), and
 * cites-nothing (`kind: suspense-scenario`). The name reserves `scenario`/`scenarios` for the
 * real kind (a phantom / suspense is NOT a scenario).
 *
 * EVERY scenario is a row now: the separate-axis authoring-quality
 * `warnings` collection was RETIRED — a scenario raising zero evidence obligations and cited
 * by no evidence observation reconciles to a `both-missing` out-of-balance row, not a warning excluded
 * from the balance.
 */
export interface Ledger {
  scenarioReconciliations: ScenarioReconciliation[];
}

/**
 * The WHOLE-RUN verdict — is the ENTIRE reconciliation balanced? A pure domain
 * derivation over the WHOLE `Ledger`: balanced IFF NO reconciling
 * item exists ANYWHERE, across every Scenario Reconciliation row — scenario,
 * phantom, and suspense alike. Out-of-balance iff ANY row carries a reconciling
 * item: a scenario's out-of-balance items (failing / missing /
 * no-evidence-obligation / both-missing) AND the credit-side suspense/phantom rows (a
 * no-evidence-obligation static-check watermelon, an uncited credit, a phantom scenario).
 *
 * It is deliberately NOT a scan of scenario verdicts alone — that would
 * let a watermelon-only run (every scenario balanced, yet a no-evidence-obligation
 * static check sitting unreconciled in the suspense row) read as balanced, the
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
  return brokenItemsOf(reconciliation).length > 0;
}

/**
 * The BROKEN reconciling items across the WHOLE run (3F-2203) — every proof that never ran, in row
 * order, each carrying its WHERE-to-fix (locator) and WHAT-broke (the runner's message).
 *
 * The QUANTITATIVE twin of `hasBrokenEvidence`, which is now derived FROM it: "is this run
 * unsound?" and "which proofs never ran?" are one question at two resolutions, so they are one
 * scan. The markdown's Run-integrity section listed these by re-deriving the scan itself — a model
 * query living in the renderer, and a second statement of which outcome means broken.
 *
 * The renderer READS this list and takes its length for the count-phrase; asking a list you were
 * given how long it is is projection, not derivation.
 */
export function brokenItemsOf(reconciliation: Ledger): QualityCheckReconciliation[] {
  return reconciliation.scenarioReconciliations.flatMap((row) =>
    row.reconcilingItems.filter((item) => item.outcome === "broken")
  );
}

/**
 * The OBLIGATION-SIDE static-check sub-rows across the whole Ledger (3F-2203) — each `lint` Quality
 * Check Reconciliation with the scnId of the row that names it, in row-then-document order.
 *
 * SCENARIO ROWS ONLY. A `lint` obligation is obligation-side, so a phantom or suspense row can carry
 * none; the suspense row's lint CREDIT (a no-evidence-obligation static check, `cites-no-scenario`) is an
 * observation, not an obligation, and must never inflate the obligation-side lint total.
 *
 * ONE COPY, BY CONSTRUCTION. That scenario-rows-only filter plus the lint cut existed TWICE,
 * character-identical — here in `lintTally` and in the markdown's `### Lint evidence obligations`
 * table. They agreed by copy-paste, not construction: either could have grown a clause alone and
 * nothing would have redded. Same anaemia, same cure as `evidenceObligationPairsOf` and
 * the corpus's own fitness obligations; the tally and the table are now two readings of ONE list.
 */
export function lintReconciliationsOf(
  reconciliation: Ledger
): { scnId: string; reconciliation: QualityCheckReconciliation }[] {
  return reconciliation.scenarioReconciliations
    .filter(isScenario)
    .flatMap((row) =>
      staticCheckReconciliationsOf(row).map((r) => ({ scnId: row.scnId, reconciliation: r }))
    );
}

// ---------------------------------------------------------------------------
// THE LEDGER'S SUMMARY TALLY (3F-2000, Read @SCN-RMD-001) — co-located here because
// "the summary is the totals" (double-entry-manifesto): the Ledger computes how many balance
// because it IS the balance. These are the LEDGER-PURE derivations of the report's `summary`
// (the verdict tally, `byOutcome`, `missingByQualityCheck`, `pending`, and the static-only lint
// tally) — pure functions over `Ledger`, moved out of `assemble/report.ts`'s `buildSummary` /
// `buildLintTally`. The census pass-throughs (`testVolume`, `staticChecks`) are NOT Ledger-pure
// and stay in the assembler, which merges this tally with them.
// ---------------------------------------------------------------------------

/**
 * The materialised totals over the Scenario Reconciliations — the headline verdict tally,
 * counted over EVERY row (@SCN-RMD-001, 3F-1724).
 *
 * The Evidence Reconciliation is ALL Scenario Reconciliations assembled, and the summary is
 * its totals (`the maintainers' private notes`). There are three row kinds — real
 * (`scenario`), `phantom-scenario` (cited by a credit, carried by no feature) and
 * `suspense-scenario` (credits citing no scenario at all) — and phantom / suspense
 * reconciliations are ALWAYS out-of-balance. So `total` / `balanced` / `outOfBalance` count
 * every row, phantom and suspense among them.
 *
 * (The earlier "ruling Q3" — a scenario-only tally with phantom / suspense bucketed APART —
 * was a divergence from the manifesto, not a decision: it let `isBalanced` (which correctly
 * walks every row's reconciling items → exit 1) disagree with a tally reading 0
 * out-of-balance, so a failing run rendered a headline that read as a pass. RETRACTED by the
 * operator, 2026-07-13; the bug it caused is 3F-1703.)
 */
export interface ScenarioReconciliationTotals {
  /** Every Scenario Reconciliation — scenario, phantom and suspense rows alike. */
  total: number;
  balanced: number;
  /** Every out-of-balance row — the phantom and suspense rows among them (they always are). */
  outOfBalance: number;
  /**
   * Phantom-scenario rows (cited by a credit, carried by no feature) — a SUB-COUNT, i.e. a
   * breakdown OF `total` / `outOfBalance`, not a bucket outside them.
   */
  phantom: number;
  /**
   * Suspense-scenario rows — credits citing NO scenario, aggregated into the one
   * `(no scenario)` row. A SUB-COUNT like `phantom`: counted INSIDE `total` and
   * `outOfBalance`, and surfaced separately so a reader recovers the scenario count as
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
 * reconcile satisfied (balanced), out of the total raised. `summary.byOutcome` is
 * kind-agnostic and cannot express the static-only lint total, so it is materialised explicitly.
 */
export interface LintTally {
  satisfied: number;
  total: number;
}

/**
 * The LEDGER-PURE part of the report summary — every totals field derived from the `Ledger`
 * alone. The assembler merges this with the census pass-throughs (`testVolume`, `staticChecks`)
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
 * `staticChecks`) are not Ledger-pure and are merged in by the assembler.
 */
export function ledgerTally(balance: Ledger): LedgerTally {
  // The headline verdict tally counts EVERY Scenario Reconciliation (@SCN-RMD-001, 3F-1724):
  // the summary is the totals over ALL rows (double-entry-manifesto), and phantom / suspense
  // reconciliations are ALWAYS out-of-balance, so they count into the tally like any other row.
  // `phantom` / `suspense` are kept as SUB-COUNTS — a breakdown OF the total, not a bucket
  // outside it. (The retracted "ruling Q3" tallied scenario rows only, which is what let the
  // tally read 0 out-of-balance on a run `isBalanced` correctly failed → exit 1: 3F-1703.)
  const verdict: Record<"balanced" | "out-of-balance", number> = { balanced: 0, "out-of-balance": 0 };
  let phantom = 0;
  let suspense = 0;
  // The Pending Items tally (@SCN-PND-011) — the count of Pending Items across the
  // reconciliation, one per deferred `<quality-check>pending` obligation. Counts ITEMS, not
  // scenarios-carrying-pending (a scenario may raise several), mirroring the out-of-balance
  // decomposition, which counts obligations, not scenarios. A Pending Item is a structurally
  // distinct category (never a reconciling item / evidence obligation), so it is tallied
  // SEPARATELY here — never folded into `byOutcome` (the out-of-balance leaves) below.
  let pending = 0;
  for (const s of balance.scenarioReconciliations) {
    // Pending Items ride every row's `pendingItems` (only scenario rows carry them; a
    // phantom / suspense row has none), so the tally is a plain sum across all rows.
    pending += (s.pendingItems ?? []).length;
    // The kind sub-counts, tallied ALONGSIDE the verdict (never instead of it) — the row still
    // falls through to the verdict tally below, so a phantom / suspense reconciliation counts
    // into `total` and (being always out-of-balance) into `outOfBalance`.
    if (s.kind === "phantom-scenario") phantom++;
    if (s.kind === "suspense-scenario") suspense++;
    verdict[s.verdict]++;
  }

  // byOutcome tallies EVERY Quality Check Reconciliation across ALL rows (scenario AND
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
    // The no-evidence-obligation reconciling item (@SCN-LDG-008) — a credit citing a real
    // scenario at a quality-check it never named. Shown here so a reader sees it break out of
    // the reconciliation-matched-attributed count (ruling Q1).
    "no-evidence-obligation": 0,
    // The both-missing reconciling item (@SCN-LDG-009) — the NEITHER-side outcome:
    // a scenario reconciling to zero rows on both sides. `byOutcome` is now 8-valued.
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
      // (scenario + phantom + suspense) — the manifesto's "the summary is the totals".
      total: verdict.balanced + verdict["out-of-balance"],
      balanced: verdict.balanced,
      outOfBalance: verdict["out-of-balance"],
      // Sub-counts: a breakdown OF the totals above (scenario = total − phantom − suspense).
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
    // reads 0 when no scenario raises a pending obligation.
    pending,
    // The static-only lint tally (RMD-005) — replicates markdown's `countStaticEvidenceObligations`
    // (static evidenceObligations balanced / total). Always present (a pure balance derive); `byOutcome`
    // is kind-agnostic and cannot evidenceObservations this static-only cut.
    lint: lintTally(balance),
  };
}

/**
 * The static-only lint tally (RMD-005) — how many `@lint` (static) evidence obligations reconcile
 * satisfied (`balanced`), out of the total raised. Byte-for-byte the markdown's
 * `countStaticEvidenceObligations` (`src/render/markdown.ts`), so slice 2 can read `satisfied` / `total`
 * with zero byte change. `summary.byOutcome` counts ALL kinds, so the static-only total is derived
 * here explicitly.
 */
export function lintTally(balance: Ledger): LintTally {
  // TWO READINGS OF ONE LIST (3F-2203) — the obligation-side lint sub-rows come from
  // `lintReconciliationsOf`, the same list the markdown's lint table renders. The
  // scenario-rows-only cut lives there, once, so the tally and the table cannot disagree.
  const lint = lintReconciliationsOf(balance);
  return {
    satisfied: lint.filter(({ reconciliation }) => reconciliation.outcome === "satisfied").length,
    total: lint.length,
  };
}

// ---------------------------------------------------------------------------
// THE RUNTIME-OBSERVATION TALLY (3F-2102, Read @SCN-RMD-003) — the credit-side
// headline the report's `### Test volume` cut derives, a FOLD OVER THE LEDGER co-located here
// beside `ledgerTally` for the same reason: "the summary is the totals" — the Ledger counts its
// OWN posted credits because it IS the balance. This RETIRES the runtime evidence-observation
// census (`census/evidenceObservations.ts`): "census" and "collection of evidence observations"
// are not manifesto concepts, so the counting folds onto the Ledger rather than living in a
// parallel store. Only the AGGREGATE headlines survive (the raw per-quality-check totals and the
// per-scenario-kind counts) — the per-`(scnId, quality-check)` `attributed[]` list did not, being
// a re-representation of the Ledger's own posted credits (retire, don't relocate).
// ---------------------------------------------------------------------------

/** The canonical runtime quality-check order, in reading order. */
export const RUNTIME_QUALITY_CHECKS: readonly RuntimeQualityCheck[] = ["unit", "integration", "e2e", "performance"];

/**
 * The materialised runtime-observation totals — the aggregate the markdown's `### Test volume`
 * cut derives, carried AS DATA (the MATERIALISE ruling). Two keyings of the SAME posted credits:
 *   - `rawByRuntimeQualityCheck` — the per-quality-check evidence-observation total over ALL
 *     runtime credits, regardless of `@SCN` (the runtime axis; `lint` credits are not counted).
 *   - the per-scenario-kind counts — how many credits posted to a scenario's account
 *     (`onScenario`), to an invented `phantom-scenario` account (`onPhantomScenario`), and to the
 *     `suspense-scenario` account (`onSuspenseScenario`).
 * These jointly exhaust the raw total by construction:
 * `Σ rawByRuntimeQualityCheck = onScenario + onPhantomScenario + onSuspenseScenario`.
 */
export interface RuntimeObservationTally {
  /** Raw per-quality-check evidence-observation totals — ALL runtime credits, regardless of `@SCN`. */
  rawByRuntimeQualityCheck: Record<RuntimeQualityCheck, number>;
  /**
   * The runtime credit total — `Σ rawByRuntimeQualityCheck`, and equally
   * `onScenario + onPhantomScenario + onSuspenseScenario` (3F-2231).
   *
   * RETURNED, not left for the caller to re-derive. The fold computed this sum and discarded it,
   * so the assembler summed the same record again to fill `summary.testVolume` — the identical
   * `reduce`, in an adapter, for a number the Ledger already knew. Two homes for one total is the
   * shape this domain model exists to remove: the Ledger counts its own posted credits because it
   * IS the balance, and a consumer asks rather than counts.
   */
  total: number;
  /** Runtime credits posted to a scenario's account (matched-attributed OR no-evidence-obligation). */
  onScenario: number;
  /** Runtime credits posted to an invented `phantom-scenario` account (an `@SCN` no feature carries). */
  onPhantomScenario: number;
  /** Runtime credits posted to the `suspense-scenario` account (citing no scenario, or broken). */
  onSuspenseScenario: number;
}

/**
 * Tally the runtime evidence observations from the Ledger — a FOLD OVER THE POSTED CREDITS
 * (@SCN-RMD-003), the credit-side twin of `ledgerTally`'s debit-side fold. It walks the POSTED
 * CREDITS on each Scenario Reconciliation row (@SCN-LDG-022) and reads each credit's account off
 * THE ROW IT POSTED TO — a scenario row ⇒ `onScenario`, a phantom row ⇒ `onPhantomScenario`,
 * the suspense row ⇒ `onSuspenseScenario` — summing the raw per-quality-check total in lockstep.
 *
 * It RE-DERIVES NOTHING and it does NOT classify: the reconciler already decided which account
 * every credit posts to (the account IS the citation, @SCN-LDG-022), so asking the row is asking
 * that decision. There is ONE place that decides what a credit is, so this tally can never disagree
 * with the verdict — the views (Test volume, the per-quality-check table) are projections of the
 * same rows, not a parallel opinion kept in step.
 *
 * Static check (`lint`) credits are SKIPPED, ON THE CHECK and never on the absence of a citation
 * (@SCN-RPT-023). A fitness credit now CITES its own stepless scenario and posts to an ordinary
 * scenario row, so to a naive walk it is indistinguishable from a runtime credit by the account it
 * landed on; the `qualityCheck` is the only thing that tells them apart. Counting one would fold
 * the static axis into the Test volume, which must not see it at all.
 *
 * The per-scenario-kind counts feed `summary.testVolume` directly (`onScenario` counts credits
 * citing a scenario, INCLUDING no-evidence-obligation — so the 3-termed identity
 * `total = onScenario + onPhantomScenario + onSuspenseScenario` holds); `rawByRuntimeQualityCheck`
 * is the re-homed per-quality-check headline the by-level table renders.
 */
export function runtimeObservationTally(ledger: Ledger): RuntimeObservationTally {
  const rawByRuntimeQualityCheck: Record<RuntimeQualityCheck, number> = {
    unit: 0,
    integration: 0,
    e2e: 0,
    performance: 0,
  };
  let onScenario = 0;
  let onPhantomScenario = 0;
  let onSuspenseScenario = 0;

  // THE FOLD (@SCN-RMD-003). Walk the POSTED CREDITS and read each credit's ACCOUNT off the row it
  // posted to — the reconciler's own ruling, never re-classified here.
  for (const row of ledger.scenarioReconciliations) {
    for (const obs of row.evidenceObservations) {
      // THE RUNTIME SCOPING — a static check credit rides the `lint` quality-check and is not a
      // runtime observation, so it is not counted (see the docstring).
      if (obs.qualityCheck === "lint") continue;
      rawByRuntimeQualityCheck[obs.qualityCheck]++;
      if (row.kind === "phantom-scenario") onPhantomScenario++;
      else if (row.kind === "suspense-scenario") onSuspenseScenario++;
      else onScenario++;
    }
  }

  // THE COMPLETENESS IDENTITY — `Σ raw = onScenario + onPhantomScenario + onSuspenseScenario` —
  // holds BY CONSTRUCTION: the single walk above increments a per-quality-check counter and exactly
  // one per-scenario-kind counter in the SAME iteration, so the two sides cannot diverge. It is
  // COMPLETENESS ONLY: invariant under a misfile BETWEEN its own terms, so it catches a credit
  // VANISHING, never a credit in the wrong account (the `@SCN`s and the rows are that).
  //
  // THE RUNTIME `throw` THAT STOOD HERE IS GONE (3F-2231). It could not fire — both sides move
  // together in one loop — so it was dead code asserting an invariant the structure already
  // guarantees, which is precisely the scar-tissue shape `why-ddd-for-spec-controller.md` names as
  // the anemic tell ("kept honest by hand-written identity assertions"); the goal is that summing
  // the wrong rows "stops being POSSIBLE, not merely asserted-against". The invariant is not
  // unguarded by its removal: `runtimeObservationTally.test.ts` pins it over a spanning corpus,
  // which is where an invariant belongs. If this fold is ever split into two walks the identity
  // becomes a real risk again — and that test, not a throw in a pure function, is what will red.
  const total = RUNTIME_QUALITY_CHECKS.reduce((n, qc) => n + rawByRuntimeQualityCheck[qc], 0);

  return { rawByRuntimeQualityCheck, total, onScenario, onPhantomScenario, onSuspenseScenario };
}

// ---------------------------------------------------------------------------
// THE STATIC-OBSERVATION TALLY (3F-2118, Read) — the static-check credit-side headline the
// report's `### Static checks` cut derives, a FOLD OVER THE LEDGER beside `runtimeObservationTally`
// for the same reason: "the summary is the totals" — the Ledger counts its OWN posted static-check
// credits because it IS the balance. This RETIRES the static evidence-observation census
// (`census/staticEvidenceObservations.ts`, `countStaticEvidenceObservationKinds`): a parallel store
// that re-derives the running / uncited split from a re-read of the CI config is not a manifesto
// concept, so the counting folds onto the Ledger's posted credits rather than living beside it.
//
// ONE CARE-MOVE LEFT, AND THE OTHER IS GONE (3F-2590). This fold used to need TWO, because the
// posting rules differed per axis: a static check was posted to EVERY account naming it, so a
// check named by N scenarios was the SAME object posted N times by reference and had to be
// IDENTITY-DEDUPED (a `Set` keyed by object identity). That route is deleted — a fitness credit
// cites, so it posts to exactly one row like every other credit — and the dedupe went with it: a
// `Set` collapsing objects that can no longer repeat is a guard against an unreachable state, and
// keeping it would leave a reader inferring a cardinality the model no longer has. What SURVIVES
// is the axis the two folds still differ on: a credit is posted whatever it reconciles to
// (posting is not classifying), so a watermelon/missing check posts too though it does not RUN —
//   - FILTER TO RUNNING (`exists && enforcedOverRealSource`), so a watermelon/missing check
//     that still posts is excluded — exactly the running-only `continue` the retired census applied.
// ---------------------------------------------------------------------------

/**
 * The materialised static-check totals — the STATIC-axis analogue of `RuntimeObservationTally`,
 * two counts read off the SAME posted static-check credits: `runningStaticCheckCount` (the volume of
 * distinct running static checks — every static-check script a CI `run:` step invokes) and
 * `uncitedStaticCheckCount` (how many of them NO scenario cites — a static check running with
 * nothing naming it, the mirror of a runtime `cites-no-scenario` credit). The named count is
 * IMPLICIT (`runningStaticCheckCount − uncitedStaticCheckCount`) and NOT carried: every cited
 * static check is already a reconciled `lint` sub-row and adds nothing the rows do not already hold.
 */
export interface StaticObservationTally {
  /** The running static-check set volume — every static-check script a CI `run:` step invokes. */
  runningStaticCheckCount: number;
  /** Running static checks NO `@lint` cites — the uncited static-checks (named is implicit). */
  uncitedStaticCheckCount: number;
}

/**
 * Tally the static-check observations from the Ledger — a FOLD OVER THE POSTED static-check CREDITS
 * (3F-2118), the static-axis twin of `runtimeObservationTally`. It walks the POSTED CREDITS on each
 * Scenario Reconciliation row (@SCN-LDG-022), reads each credit off THE ROW IT POSTED TO, and — like
 * its runtime sibling — RE-DERIVES NOTHING: the reconciler already decided which account every credit
 * posts to, so this can never disagree with the verdict.
 *
 * `uncitedStaticCheckCount` is the count of lint credits on the SUSPENSE row — the no-evidence-obligation
 * static checks the reconciler folded there (a static check running with no scenario citing it,
 * `cites-no-scenario` on the credit side). By construction the app only pushes RUNNING guards into
 * that no-evidence-obligation stream (`runningStaticChecks`), so every suspense lint credit is running — the
 * plain count is the census's running-and-uncited count.
 *
 * `runningStaticCheckCount` is the count of RUNNING lint credits across ALL rows. One care-move the
 * runtime axis does not need (see the block comment above):
 *   - FILTER TO RUNNING (`exists && enforcedOverRealSource`): a watermelon (exists, unwired) or
 *     missing (absent) check STILL posts (posting is not classifying), but it does not RUN, so it
 *     is not a running static check — excluded here exactly as the retired census's running-only
 *     `continue` excluded it.
 *
 * The named (implicit) count is `runningStaticCheckCount − uncitedStaticCheckCount`.
 */
export function staticObservationTally(ledger: Ledger): StaticObservationTally {
  // The RUNNING static-check credits across ALL rows. Only running checks
  // (`exists && enforcedOverRealSource`) are counted — a watermelon/missing check, which posts but
  // does not run, is filtered out (the census's running-only `continue`).
  let runningStaticCheckCount = 0;
  // The uncited static checks — the lint credits the reconciler folded onto the SUSPENSE row (a
  // no-evidence-obligation running check, `cites-no-scenario`). A plain count: the app pushes only RUNNING
  // checks into the no-evidence-obligation stream, so every suspense lint credit is a running uncited check.
  let uncitedStaticCheckCount = 0;
  for (const row of ledger.scenarioReconciliations) {
    for (const obs of row.evidenceObservations) {
      // THE STATIC SCOPING — only static-check credits ride the `lint` quality-check; a runtime
      // credit (the uncited/broken ones the suspense row also holds) is not a static observation.
      if (obs.qualityCheck !== "lint") continue;
      if (row.kind === "suspense-scenario") uncitedStaticCheckCount++;
      if (obs.exists && obs.enforcedOverRealSource) runningStaticCheckCount++;
    }
  }

  return { runningStaticCheckCount, uncitedStaticCheckCount };
}
