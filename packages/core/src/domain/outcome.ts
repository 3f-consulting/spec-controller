/**
 * The outcome vocabulary a reconciling item and the fault that refuses one are both stated in.
 * A leaf: it imports nothing, so the reconciliation and its fault can both name it without either
 * importing the other.
 */

/**
 * The reconciled OUTCOME of a single quality-check evidence obligation — one
 * RECONCILING ITEM in the accounting frame (the per-evidenceObligation line explaining
 * why obligation and observation disagree). The rationalisation: the
 * per-evidenceObligation axis is the OUTCOME — `satisfied` (its `balanced` retired,
 * `balanced` being the scenario VERDICT's word), and the watermelon reads plainly
 * as `watermelon`.
 */
export type Outcome =
  | "satisfied" // required, present, and passing
  | "failing" // required, present, but failing (runtime)
  | "watermelon" // a static check that exists but is NOT wired into CI over the
  // real source — green on the surface, red within; a "broken"-class
  // outcome unique to the static kind.
  | "missing" // required, but no matching result/static check observed
  // CREDIT-SIDE (the bidirectional reconciler): an evidence observation
  // (credit) reconciling against no evidence obligation. The credit-side union grows
  // final-named across the LDG-006/007/008 sub-issues; LDG-006 lands the first:
  | "cites-unknown-scenario" // a credit citing an @SCN no scenario matches —
  // the reconciling item on a PHANTOM scenario.
  | "cites-no-scenario" // a credit citing NO @SCN at all — the reconciling item on the
  // SUSPENSE scenario. Aggregates uncited runtime credits AND the
  // uncited static-check (a `fitness` credit no evidence obligation names, ruling Q4).
  | "broken" // a credit whose PROOF NEVER RAN — the harness broke before the behaviour was
  // exercised, so it cites no @SCN and can be attributed to no scenario. READER-AGNOSTIC: a
  // vitest suite that failed to collect OR a cucumber step matched by two or
  // more definitions. A SIBLING of `cites-no-scenario` (both land in suspense
  // because they name no scenario), distinguished by broken-vs-completed. The scenario whose
  // proof was in that harness still reads `missing` (honest at its own resolution), but the RUN
  // now carries the fault — so the reader is sent to fix the harness, not to write a test that
  // already exists.
  | "no-evidence-obligation" // a credit citing a REAL scenario at a quality-check that scenario
  // NEVER NAMED — the GENERAL case (it applies whether or not the
  // scenario carries other evidence obligations). A credit-side reconciling item ON THE REAL scenario's
  // row (carrying the evidence observation locator, ruling Q5): the credit posts to a real account,
  // but against no evidence obligation. Fixes the latent `attributed` mis-count — a stray credit at a
  // quality-check the scenario never named is no longer silently counted as reconciliation-matched-attributed.
  // NEITHER-SIDE (the bidirectional reconciler's final outcome):
  | "no-scn-code" // a DEBIT outcome: a real scenario carrying no @SCN,
  // so its Evidence Obligation has NO CODE for an Evidence Observation to link to. The scenario is
  // ORDINARY — not phantom, not suspense; it exists and cucumber runs it — but its own Scenario
  // Reconciliation is out-of-balance, because the obligation is UNLINKABLE. The DEBIT TWIN of
  // `cites-no-scenario` (same missing link, opposite side); suspense stays credit-only. UNCODED
  // work: it can never reconcile satisfied, failing, or even `missing` — an obligation never
  // RAISED cannot be ABSENT — so without this it was invisible to the verdict entirely.
  | "duplicate-scn-code" // a DEBIT outcome: the Evidence Obligation's @SCN code is carried
  // by another scenario too, so the code names ONE account two scenarios claim and no credit citing
  // it can be attributed to either. It lands on EVERY quality check of that account, so the account
  // is out-of-balance by the ordinary rule — no new verdict, no precedence. Not `broken`: the proofs
  // ran; what fails is the attribution.
  | "both-missing"; // a scenario that reconciles to ZERO rows on BOTH sides (no
  // evidence obligation AND no citing evidence observation) — the ONE degenerate Quality Check Reconciliation it
  // posts, blank on both sides (label: "Evidence Obligation and Evidence Observation are both
  // missing — the Scenario is untagged and uncited"). Detected by the reconciler emitting NOTHING either way (NOT a
  // hard evidenceObligations.length === 0 map — a zero-evidence obligation scenario cited by a stray
  // credit is `no-evidence-obligation`). Retires the zero-evidence-scenario warning:
  // the zero-evidence scenario is now this out-of-balance row, never a separate axis.
  // The verdict stays two-valued (out-of-balance VIA this reconciling item, never a third verdict).

/**
 * Whether a canon-correct reconciling item CARRIES a given side — the value both halves of the
 * invariant are stated in: what the canon row required, and what the fields actually carried.
 *
 * Named rather than restated inline so the fault that reports a divergence (`qualityCheckFault.ts`)
 * is typed in the reconciliation's own vocabulary instead of re-spelling the two literals a third
 * and fourth time.
 */
export type SidePresence = "Exists" | "None";
