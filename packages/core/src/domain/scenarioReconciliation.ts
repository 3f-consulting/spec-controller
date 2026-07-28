/**
 * THE SCENARIO RECONCILIATION — the account (canon: "bookkeeping term: Account"), holding its
 * posted debits and credits, its reconciled sub-rows, and its binary verdict. This module
 * co-locates the concept's type with its OWN behaviour: `verdictFor` (the binary roll-up) and
 * `reconcilingItemsOf` (the non-balanced items), the pure derivations that were the reconcile
 * orchestration's private helpers (module, not class; the rule lives WITH the concept).
 */

import type {
  EvidenceObligation,
  EvidenceObservation,
  PendingItem,
} from "./journal.js";
import type { QualityCheckReconciliation } from "./qualityCheckReconciliation.js";
// The degenerate item's CONSTRUCTION stays with the item concept; the rule for WHEN a row carries
// it instead of its sub-rows is the ROW's, so it lives here (3F-2204).
import { bothMissingReconciliation } from "./qualityCheckReconciliation.js";

/**
 * The scenario-level VERDICT — its OWN type, distinct from Outcome
 * (superseding the `ScenarioOutcome = Outcome` collapse).
 *
 * A ledger is BINARY: `balanced` (every evidenceObligation balances — zero
 * reconciling items) or `out-of-balance` (one or more). The two discrepancy kinds
 * (failing, missing) are different problems, not points
 * on one scale, so the verdict does NOT rank them into a single picked outcome — an
 * out-of-balance scenario carries the full LIST of its non-balanced reconciling
 * items (`ScenarioReconciliation.reconcilingItems`), reported in full by the renderers.
 */
export type ScenarioVerdict = "balanced" | "out-of-balance";

/**
 * The scenario-kind discriminator — which KIND of scenario a Scenario
 * Reconciliation row is *about* (Account ≠ Scenario):
 *   - `scenario`          — a real scenario (the ordinary row).
 *   - `phantom-scenario`  — a cited-but-UNDECLARED scenario id: an evidence observation
 *                            cites an `@SCN` no feature declares (outcome
 *                            `cites-unknown-scenario`; @SCN-LDG-006).
 *   - `suspense-scenario` — the placeholder for credits citing NO scenario (outcome
 *                            `cites-no-scenario`; arrives with LDG-007).
 * The enum carries all three now; LDG-006 PRODUCES only `scenario` + `phantom-scenario`.
 * Reserve `scenario`/`scenarios` for the real kind — the collection is the
 * `scenarioReconciliations`, never `scenarios`.
 */
export type ScenarioKind = "scenario" | "phantom-scenario" | "suspense-scenario";

/** A scenario's reconciliation outcome — its per-evidenceObligation outcomes + the verdict. */
export interface ScenarioReconciliation {
  scnId: string;
  /**
   * The scenario-kind this row is about — `scenario` on a real row, `phantom-scenario` on a
   * cited-but-undeclared row, `suspense-scenario` on the cites-nothing placeholder.
   *
   * REQUIRED (3F-1861). It was optional, defaulting to `scenario`, "for back-compat with
   * hand-built fixtures" — the model made ambiguous to accommodate the test data. Stating the
   * kind is now unskippable.
   */
  kind: ScenarioKind;
  /**
   * The binary scenario verdict: `balanced` iff EVERY required quality-check
   * balances; otherwise `out-of-balance`.
   */
  verdict: ScenarioVerdict;
  /**
   * The POSTED CREDITS — every evidence observation that posts to THIS account (@SCN-LDG-022).
   * The account is the Scenario Reconciliation (canon: "bookkeeping term: Account"), and this is
   * where its credits SIT: canon's Ledger is "the evidence obligations (debits) and evidence
   * observations (credits) organised by real or invented scenario, keyed by quality-check".
   * Named for canon's vocabulary — NEVER `credits`, which is the bookkeeping ROOT of the metaphor,
   * not the vocabulary (the same reason Evidence Reconciliation rejects the alias "trial balance",
   * "kept as the bookkeeping root of the metaphor").
   *
   * POSTING IS NOT CLASSIFYING. An observation posts here whatever it later reconciles to — or
   * even when it reconciles to NOTHING. A credit citing a `<quality-check>pending` obligation
   * produces no `QualityCheckReconciliation` at all (the obligation is partitioned off before the
   * match, and the pending pair keeps the credit out of `undemanded`), and it posts here ANYWAY:
   * a misclassification must MISFILE an entry, never vaporise it. So this array is NOT derivable
   * from `qualityCheckReconciliations` — that is the whole point of the layer.
   *
   * THE ACCOUNT IS THE CITATION, never the outcome. A credit citing a declared @SCN posts to that
   * scenario's account; one citing an unknown @SCN posts to that phantom account; one citing NO
   * scenario posts to suspense. Exactly one account each, jointly exhaustive over the input.
   *
   * REQUIRED (3F-1861) — `[]` states "nothing posted" explicitly. It was optional, defaulting to
   * `[]` "for back-compat with hand-built fixtures", which collapsed "nothing posted" and
   * "unstated" into the same absence: a reader could not tell them apart, and a fold read 0 on a
   * fixture that had merely never spoken.
   */
  evidenceObservations: EvidenceObservation[];
  /**
   * The POSTED DEBITS — every evidence obligation THIS scenario declares (@SCN-LDG-023), keyed by
   * quality-check. The debit half of `evidenceObservations` above: canon's Ledger is "the evidence
   * obligations (debits) and evidence observations (credits) organised by real or invented
   * scenario, KEYED BY QUALITY-CHECK", and this is where an account's debits SIT.
   *
   * Named for canon's vocabulary — NEVER `debits`, the bookkeeping ROOT of the metaphor rather than
   * the vocabulary (the same reason Evidence Reconciliation rejects the alias "trial balance",
   * "kept as the bookkeeping root of the metaphor"). The name is free because 3F-1846 renamed the
   * misnomer that held it — see `qualityCheckReconciliations` below.
   *
   * POSTING IS NOT CLASSIFYING, on this side too. A `<quality-check>pending` obligation partitions
   * off to a one-sided Pending Item BEFORE the observation match and earns NO
   * `QualityCheckReconciliation` at all — and it posts here ANYWAY. So this array is NOT derivable
   * from `qualityCheckReconciliations`; that is the whole point of the layer.
   *
   * THE ACCOUNT IS THE DECLARATION. Unlike a credit there is no citation to follow and no
   * suspense: a declared obligation always has a real account, by construction. The accounts a
   * CREDIT mints — phantom and suspense — declare nothing, so their debit side is empty. That
   * asymmetry is real, not an omission.
   *
   * REQUIRED (3F-1861) — `[]` states "nothing declared" explicitly, which is the honest value on a
   * phantom or suspense account. It was optional, defaulting to `[]` "for back-compat with
   * hand-built fixtures", which made the real asymmetry above indistinguishable from a fixture
   * that had simply not said.
   */
  evidenceObligations: EvidenceObligation[];
  /**
   * Every reconciled quality-check's outcome (the full per-quality-check breakdown) — the SUB-ROWS
   * of this account, typed `QualityCheckReconciliation[]`. Renamed from `evidenceObligations`
   * (3F-1846): it holds reconciled sub-rows, not posted debits, and canon lists "reconciled
   * evidence obligation" under Quality Check Reconciliation's REJECTED ALIASES — so the old name
   * carried a rejected alias. The rename frees `evidenceObligations` for the real posted debits
   * (3F-1847).
   */
  qualityCheckReconciliations: QualityCheckReconciliation[];
  /**
   * The non-balanced reconciling items — EMPTY when balanced; otherwise EVERY
   * non-balanced evidenceObligation (no prioritisation, no picked winner), in document
   * order. This is the list an out-of-balance verdict carries.
   */
  reconcilingItems: QualityCheckReconciliation[];
  /**
   * The one-sided PENDING ITEMS — one per `<quality-check>pending` obligation the
   * scenario declared (evidence-manifesto §11B). PARTITIONED OFF before reconciliation:
   * a Pending Item is never a Reconciling Item (never in `evidenceObligations` /
   * `reconcilingItems`), so `verdictFor` / `reconcilingItemsOf` / `isBalanced` need no
   * pending-awareness. REQUIRED — `[]` when the scenario declared no pending obligation. (The
   * comment here claimed it was OPTIONAL with an `ABSENCE ≡ []` default; the field never was.
   * Corrected with 3F-1861, which removed that convention from the fields that really had it.)
   */
  pendingItems: PendingItem[];
}

/**
 * Reduce a scenario's reconciling items to its binary VERDICT:
 * `balanced` IFF the scenario has NO reconciling item; otherwise `out-of-balance`,
 * carrying the FULL list of non-balanced items (no prioritisation, no picked
 * winner — `reconcilingItemsOf` carries them all, the renderers list them all).
 * The verdict is DERIVED from reconciling-item emptiness, so the two stay in lock
 * step by construction (an out-of-balance verdict always has ≥1 item; a balanced
 * one always has zero).
 *
 * Empty-list case (@SCN-PND-007): a scenario reconciling to an EMPTY
 * evidenceObligations set has no reconciling item, so it is `balanced` — verdict-neutral.
 * This is the ONLY-PENDING scenario: its sole obligation partitioned off to a
 * one-sided Pending Item upstream, leaving zero reconciled rows. A Pending Item
 * never contributes a reconciling item, so it never tips the verdict. (Deriving
 * from emptiness — not `every satisfied` over a non-empty list — is what makes the
 * empty list read `balanced` rather than the earlier vacuous `out-of-balance`.)
 *
 * Both-missing is NOT this case: the degenerate zero-rows-on-both-sides scenario
 * (no obligation, no pending, no citing observation) is posted ONE `both-missing`
 * reconciling item UPSTREAM by `reconcile`, so its list is NON-empty and it stays
 * `out-of-balance` — untouched by the emptiness derivation.
 */
export function verdictFor(evidenceObligations: QualityCheckReconciliation[]): ScenarioVerdict {
  return reconcilingItemsOf(evidenceObligations).length === 0 ? "balanced" : "out-of-balance";
}

/**
 * The non-balanced reconciling items — EVERY one (no prioritisation, no picked
 * winner), in document order. Empty when the scenario is balanced.
 */
export function reconcilingItemsOf(
  evidenceObligations: QualityCheckReconciliation[]
): QualityCheckReconciliation[] {
  return evidenceObligations.filter((r) => r.outcome !== "satisfied");
}

/**
 * Is this row about a REAL scenario? (3F-2230.)
 *
 * Canon, Scenario: *"**Scenario** names **only the declared thing**: a cited-but-undeclared id is a
 * **phantom scenario**, and the bucket for uncited credits is the **suspense scenario** — neither is
 * a scenario."* This function is that sentence; every consumer that needs the real-scenario cut asks
 * it rather than restating it.
 *
 * It had no home and was open-coded FIVE times — four in the renderer, one in the Ledger's lint
 * fold — as the double negative `kind !== "phantom-scenario" && kind !== "suspense-scenario"`. They
 * agreed by copy, not by construction: any one could have grown a clause alone and nothing would
 * have redded.
 *
 * STATED POSITIVELY, which is not merely tidier. `ScenarioKind` has exactly three values, so the
 * double negative is equivalent TODAY — but only by exhaustion. A fourth kind would silently fall
 * into the real-scenario cut under the negative form and be excluded under this one, and canon is
 * unambiguous about which is right: `scenario` is reserved for the declared thing, so a kind nobody
 * has taught this function about is not one.
 */
export function isScenario(row: ScenarioReconciliation): boolean {
  return row.kind === "scenario";
}

/**
 * A row's STATIC-GUARD sub-rows — its `lint` Quality Check Reconciliations, in document order, one
 * per `@lint=<guard>` obligation the scenario demanded (3F-2203).
 *
 * The DECLARED-side cut: `lint` reconciliations only ever arise from a declared obligation, so this
 * is the row's demanded-static-guard count as well as its list. It is the single source both the
 * renderer's grid cell and the Ledger's `lintTally` read — they each re-derived it before, agreeing
 * by copy.
 */
export function staticGuardReconciliationsOf(
  row: ScenarioReconciliation
): QualityCheckReconciliation[] {
  return row.qualityCheckReconciliations.filter((r) => r.qualityCheck === "lint");
}

/**
 * How many of a row's demanded static guards are PRESENT (3F-2203) — the count of `lint`
 * reconciliations that found a real script, whether or not it is wired.
 *
 * PRESENCE IS NOT QUALITY, and that is the whole rule: `satisfied` (wired into CI over the real
 * source) and `watermelon` (the script exists but guards nothing) BOTH count, because both mean a
 * static guard is THERE. Only `missing` — no script at all — is absent. The watermelon's inadequacy
 * is quality, and quality is reported in the reconciling items (🍉), never by shrinking this count.
 *
 * A domain fact, not a rendering choice: which outcomes imply the guard exists is the outcome
 * vocabulary's business, the same class as `OUT_OF_BALANCE_OUTCOMES`. The renderer READS it.
 */
export function presentStaticGuardCountOf(row: ScenarioReconciliation): number {
  return staticGuardReconciliationsOf(row).filter(
    (r) => r.outcome === "satisfied" || r.outcome === "watermelon"
  ).length;
}

/**
 * A real scenario row's SUB-ROWS — the reconciled debits and the credit-side undemanded items
 * together, degenerating to the ONE `both-missing` item when the row reconciled to nothing either
 * way (@SCN-LDG-009, 3F-2204). The row-SHAPE rule, so it lives with the row.
 *
 * BOTH-MISSING is the NEITHER-side outcome: zero declared obligations AND zero undemanded credits.
 * It is detected on ROWS-EMITTED — the concatenated set being empty — never on
 * `evidenceObligations.length === 0`. That distinction is load-bearing: a zero-obligation scenario
 * whose `@SCN` IS cited by a stray credit (@SCN-LDG-010, the twin) already produced an `undemanded`
 * row above, so it falls through here and is never both-missing. Keying on the declaration count
 * instead would post a spurious degenerate item beside a real one.
 *
 * THE PENDING CLAUSE (@SCN-PND-004) — the degenerate item fires only on zero rows AND zero Pending
 * Items. A scenario whose ONLY obligation is pending reconciles to zero rows on both sides and is
 * NOT both-missing: it is balanced-with-pending, the partition having made "nothing is reconciled"
 * true by construction. Without the clause an only-pending scenario would post a spurious
 * both-missing and red a run canon says is deferred, not broken. (A bare-empty scenario — no
 * obligation, no pending, no citation — is still both-missing, which is the point of the rule.)
 *
 * This retires the no-evidence-declared warning (@SCN-WRN-001 Update): a zero-evidence scenario is
 * an out-of-balance row now, not a separate authoring-quality axis excluded from the balance.
 */
export function qualityCheckReconciliationsOf(
  reconciledEvidenceObligations: readonly QualityCheckReconciliation[],
  undemandedItems: readonly QualityCheckReconciliation[],
  pendingItems: readonly PendingItem[]
): QualityCheckReconciliation[] {
  const rows = [...reconciledEvidenceObligations, ...undemandedItems];
  return rows.length === 0 && pendingItems.length === 0 ? [bothMissingReconciliation()] : rows;
}
