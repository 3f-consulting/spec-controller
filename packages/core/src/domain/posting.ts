/**
 * POSTING — the rule for WHERE an entry lands. Canon gives Posting its own glossary group
 * (`the maintainers' private notes`, "### Posting") beside Journal, Ledger and Reconciling,
 * and this module is that group's home (module, not class), co-locating the destination type with
 * the pure rule that decides it.
 *
 * It sits BETWEEN the journal and the Ledger, which is why it is neither's: `domain/ledger` folds
 * over an ASSEMBLED Ledger, and the posting rule runs BEFORE a Ledger exists; `domain/journal`
 * owns the entry types and what a scenario NAMES. Posting reads both sides and yields the row an
 * entry lands on. (3F-2202 — extracted from the `reconcile` fold, which decided this inline.)
 *
 * CANON, in two clauses that set the cardinality (manifesto "Attribution / attributed (by `@SCN`)"):
 *   - the RUNTIME quality-checks — the CREDIT cites. A test carries `@SCN-XXX`, so one credit
 *     names one scenario and posts to EXACTLY ONE row. A credit posting to no real scenario is
 *     PHANTOM (its `@SCN` is undeclared) or SUSPENSE (it cites nothing).
 *   - `lint` — the DEBIT cites. The scenario carries `@lint=<static-guard>`, so the static guard's
 *     run cites nothing and is matched BY NAME — to EVERY row whose evidence obligation names it
 *     (manifesto, Static Guard: "one run is evidence for all of them"), or to SUSPENSE if none
 *     does.
 *
 * "Every evidence observation posts to at least one account, never to none" (manifesto line 160) —
 * NOT *exactly* one, which is the runtime property over-generalised. `Posting` is total over the
 * `EvidenceObservation` union by construction: every variant yields a destination.
 *
 * POSTING IS NOT CLASSIFYING. This rule decides WHERE an entry lands, never what it reconciles TO.
 * A credit posts to its row whatever outcome it later earns — or none at all. The outcome rules
 * are the sibling concepts' (`qualityCheckReconciliation`, `scenarioReconciliation`).
 */

import type {
  Scenario,
  EvidenceObservation,
  RuntimeEvidenceObservation,
  GuardEvidenceObservation,
} from "./journal.js";

/**
 * WHERE an entry lands — the posting destination, one variant per route canon names.
 *
 * The three `kind` values that name a row match `ScenarioKind` exactly, because they ARE the row
 * kind the entry posts to. `every-naming-scenario` is the fourth and is NOT a row kind: a static
 * guard is not citation-routed at all, so its destination is a SET of rows resolved by name, and
 * naming it as a row-kind would flatten canon's central asymmetry between the two axes.
 *
 * Named for the ROW, never `Account`: `account` is RETIRED vocabulary (the container re-term —
 * Evidence / Scenario / Quality-Check Reconciliation replaced trial-balance / account /
 * sub-account), kept only as the bookkeeping ROOT of the metaphor in canon's glossary.
 */
export type Posting =
  /** BY CITATION → the row of the one real scenario this credit's `@SCN` names. */
  | { kind: "scenario"; scnId: string }
  /** BY CITATION → an INVENTED row: the credit's `@SCN` is one no scenario declares. */
  | { kind: "phantom-scenario"; scnId: string }
  /**
   * BY NAME → every row whose evidence obligation names this static guard handle. NOT a row
   * kind: the destination is a set, and `reconcile` resolves the members per row (in that row's
   * own obligation order) via `staticGuardCreditsPostingTo`.
   */
  | { kind: "every-naming-scenario"; staticGuard: string }
  /**
   * → the SUSPENSE row: the entry names no row at all. `posted` carries WHICH of the three
   * routes brought it here — they are genuinely different facts with different remedies, and the
   * suspense row's items distinguish them (`broken` vs `cites-no-scenario`):
   *   - `broken`                   — a proof that NEVER RAN, so it names no test and cites
   *                                  nothing, WHATEVER `scnId` / `status` it structurally carries.
   *   - `cites-nothing`            — a runtime credit that RAN and carried no `@SCN`.
   *   - `undemanded-static-guard`  — a static guard that ran with no `@lint` naming it.
   */
  | { kind: "suspense-scenario"; posted: "broken" | "cites-nothing" | "undemanded-static-guard" };

/** The destinations a RUNTIME credit can reach — it is citation-routed, so never by name. */
export type RuntimePosting =
  | { kind: "scenario"; scnId: string }
  | { kind: "phantom-scenario"; scnId: string }
  | { kind: "suspense-scenario"; posted: "broken" | "cites-nothing" };

/** The destinations a STATIC-GUARD credit can reach — it is name-routed, so never by citation. */
export type StaticGuardPosting =
  | { kind: "every-naming-scenario"; staticGuard: string }
  | { kind: "suspense-scenario"; posted: "undemanded-static-guard" };

/**
 * WHERE does this evidence observation post? THE posting rule, in one place.
 *
 * The two set parameters are the DECLARED side, each already the model's own rule built once by
 * the caller: `scenarioIds` is which scenarios exist, and `staticCheckEvidenceObligations` is
 * `staticCheckEvidenceObligationsOf(scenarios)` (the journal's rule for which handles are named). They
 * are passed rather than re-derived here so the rule stays a pure decision over prepared inputs
 * and cannot disagree with the census that shares them.
 *
 * ORDER IS LOAD-BEARING — the arms are checked exactly as canon fail-safes them:
 *   1. `broken` FIRST, on the FLAG, never on `scnId` / `status` (@SCN-LDG-017). A proof that never
 *      ran cannot discharge or fail an obligation, so it must never be citation-routed — not to a
 *      real row, not to a phantom one. It structurally MAY carry an `scnId` and a `status`; both
 *      are ignored here. Checking `broken` after either would misfile it.
 *   2. an uncited credit (`scnId === null`) → suspense, never phantom.
 *   3. a cited credit whose `@SCN` no scenario declares → phantom.
 *   4. otherwise → that scenario's row.
 *
 * The overloads keep the two axes' destinations apart at the type level, so a caller that has
 * already narrowed the union cannot be handed a destination its axis can never reach.
 */
export function postingOf(
  observation: RuntimeEvidenceObservation,
  scenarioIds: ReadonlySet<string>,
  staticCheckEvidenceObligations: ReadonlySet<string>
): RuntimePosting;
export function postingOf(
  observation: GuardEvidenceObservation,
  scenarioIds: ReadonlySet<string>,
  staticCheckEvidenceObligations: ReadonlySet<string>
): StaticGuardPosting;
export function postingOf(
  observation: EvidenceObservation,
  scenarioIds: ReadonlySet<string>,
  staticCheckEvidenceObligations: ReadonlySet<string>
): Posting;
export function postingOf(
  observation: EvidenceObservation,
  scenarioIds: ReadonlySet<string>,
  staticCheckEvidenceObligations: ReadonlySet<string>
): Posting {
  // THE STATIC AXIS — the DEBIT cites, so a static guard's run is matched BY NAME, never by
  // attribution. Named → every naming row; named by nobody → suspense (the static
  // analogue of an uncited runtime credit).
  if (observation.qualityCheck === "lint") {
    return staticCheckEvidenceObligations.has(observation.staticGuard)
      ? { kind: "every-naming-scenario", staticGuard: observation.staticGuard }
      : { kind: "suspense-scenario", posted: "undemanded-static-guard" };
  }
  // THE RUNTIME AXIS — the CREDIT cites, so exactly one row, resolved from the `@SCN` it carries.
  // The fail-safe first: broken is taken on the FLAG, before scnId is ever consulted.
  if (observation.broken === true) return { kind: "suspense-scenario", posted: "broken" };
  if (observation.scnId === null) return { kind: "suspense-scenario", posted: "cites-nothing" };
  if (!scenarioIds.has(observation.scnId)) {
    return { kind: "phantom-scenario", scnId: observation.scnId };
  }
  return { kind: "scenario", scnId: observation.scnId };
}

/**
 * The static-guard credits posting to THIS scenario's row — the BY-NAME half of the posting rule,
 * resolved for one row (canon, Static Guard: a static guard "posts to every account whose evidence
 * obligation names it"). `postingOf` answers WHETHER a static guard posts to naming rows at all;
 * this answers WHICH credits land on a given row, and IN WHAT ORDER.
 *
 * The order is the ROW'S OWN obligation document order, not the observation stream's: the row's
 * `@lint` obligations name the handles it names, and the credits answering them post in that
 * order. Two rows naming the same two guards in opposite orders hold them in opposite orders —
 * so this walks the OBLIGATIONS, never the observations.
 *
 * `find` takes the FIRST observation per handle: one credit answers one handle. The
 * identity-dedupe then keeps a handle declared TWICE on one row posting ONCE, while the SAME
 * object still posts to every OTHER row naming it (@SCN-LDG-024) — which is what makes the
 * downstream identity-dedupe in `staticObservationTally` both necessary and correct.
 *
 * PENDING, and a documented asymmetry (preserved, not normalised — 3F-2202). This walks EVERY
 * `@lint` obligation INCLUDING a pending one, because posting is not classifying: a credit posts
 * whatever its obligation later reconciles to, or fails to. `staticCheckEvidenceObligationsOf` — which
 * `postingOf` consults for the undemanded/suspense arm — EXCLUDES pending obligations. The two
 * therefore disagree in principle. In practice they cannot: a `@lintpending` obligation carries NO
 * `staticGuard` payload (the guard does not exist yet, `journal.ts`), so the `staticGuard ===
 * undefined` skip below drops it before the disagreement can be observed. Reproduced here exactly
 * as the fold had it; if a hand-built obligation ever carries both `pending` and a `staticGuard`,
 * this is the seam that decides it, and the decision is then owed a ruling against canon.
 */
export function staticGuardCreditsPostingTo(
  scenario: Scenario,
  observations: readonly EvidenceObservation[]
): GuardEvidenceObservation[] {
  const posted: GuardEvidenceObservation[] = [];
  for (const obligation of scenario.evidenceObligations) {
    if (obligation.qualityCheck !== "lint" || obligation.staticGuard === undefined) continue;
    const handle = obligation.staticGuard;
    const observed = observations.find(
      (o): o is GuardEvidenceObservation => o.qualityCheck === "lint" && o.staticGuard === handle
    );
    if (observed !== undefined && !posted.includes(observed)) posted.push(observed);
  }
  return posted;
}
