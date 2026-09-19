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
 * ONE CLAUSE, OVER BOTH AXES (3F-2590). THE CREDIT CITES. A test carries `@SCN-XXX`; a fitness
 * check's run carries the `@SCN` of the fitness scenario that raises its obligation. So
 * one credit names one scenario and posts to EXACTLY ONE row, and a credit posting to no real
 * scenario is PHANTOM (its `@SCN` matches no scenario) or SUSPENSE (it cites nothing).
 *
 * THE BY-NAME ROUTE IS GONE, and with it the exception it forced. `fitness` used to be the axis where
 * the DEBIT cited: a scenario carried `@lint=<static-check>`, the run cited nothing, and it was
 * matched BY NAME to EVERY row whose obligation named it. That is why the invariant had to be
 * written "every evidence observation posts to AT LEAST ONE account, never to none" — not *exactly*
 * one, which was the runtime property over-generalised. With both axes citing, EXACTLY ONE is true
 * universally, and it is the stronger claim: "at least one" is silent about a double-post, and a
 * double-post is a second copy of the same fact. `Posting` is total over the `EvidenceObservation`
 * union by construction: every variant yields a destination.
 *
 * POSTING IS NOT CLASSIFYING. This rule decides WHERE an entry lands, never what it reconciles TO.
 * A credit posts to its row whatever outcome it later earns — or none at all. The outcome rules
 * are the sibling concepts' (`qualityCheckReconciliation`, `scenarioReconciliation`).
 */

import type {
  Scenario,
  EvidenceObservation,
  RuntimeEvidenceObservation,
  FitnessEvidenceObservation,
} from "./journal.js";
// The union's OWN predicate over the `fitness` quality-check — asked rather than a hand-written shape
// test, so this rule classes an observation exactly as the reconciler does.
// A value import, hence its own statement beside the type-only one above.
import { isFitnessObservation } from "./journal.js";

/**
 * WHERE an entry lands — the posting destination, one variant per route canon names.
 *
 * EVERY `kind` NAMES A ROW, and matches `ScenarioKind` exactly, because each IS the row kind the
 * entry posts to. A fourth member used to sit here — a SET of rows resolved by name — and it was
 * the one destination that was not a row at all. It went with the by-name route (3F-2590), so the
 * type is now exactly the row kinds, on both axes.
 *
 * Named for the ROW, never `Account`: `account` is RETIRED vocabulary (the container re-term —
 * Evidence / Scenario / Quality-Check Reconciliation replaced trial-balance / account /
 * sub-account), kept only as the bookkeeping ROOT of the metaphor in canon's glossary.
 */
export type Posting =
  /** BY CITATION → the row of the one real scenario this credit's `@SCN` names. */
  | { kind: "scenario"; scnId: string }
  /** BY CITATION → an INVENTED row: the credit's `@SCN` is one no scenario carries. */
  | { kind: "phantom-scenario"; scnId: string }
  /**
   * → the SUSPENSE row: the entry names no row at all. `posted` carries WHICH of the three
   * routes brought it here — they are genuinely different facts with different remedies, and the
   * suspense row's items distinguish them (`broken` vs `cites-no-scenario`):
   *   - `broken`                   — a proof that NEVER RAN, so it names no test and cites
   *                                  nothing, WHATEVER `scnId` / `status` it structurally carries.
   *   - `cites-nothing`            — a runtime credit that RAN and carried no `@SCN`.
   *   - `no-evidence-obligation-static-check`  — a static check that ran with no `@fitness` naming it.
   */
  | { kind: "suspense-scenario"; posted: "broken" | "cites-nothing" | "no-evidence-obligation-static-check" };

/** The destinations a RUNTIME credit can reach — it is citation-routed, so never by name. */
export type RuntimePosting =
  | { kind: "scenario"; scnId: string }
  | { kind: "phantom-scenario"; scnId: string }
  | { kind: "suspense-scenario"; posted: "broken" | "cites-nothing" };

/**
 * The destinations a STATIC-CHECK credit can reach — the citation-routed ones when the observer
 * stamped an `@SCN` on it (@SCN-LNT-001), and suspense when the check named nobody or never ran.
 * Structurally `RuntimePosting`'s shape now that the by-name member is gone (3F-2590): one posting
 * rule over both axes. The two types stay APART because their SUSPENSE reasons still differ — a
 * runtime credit reaches suspense `broken` or `cites-nothing`, a fitness credit `broken` or
 * because no obligation names its check — and collapsing them would let a caller be handed a
 * reason its axis cannot produce. `cites-nothing` is the one this axis has never had: a converted
 * credit that cites nothing is a check nobody named, which is a different fault with a different
 * remedy.
 *
 * `broken` ARRIVES HERE AT @SCN-LNT-026 AND IS NOT A NEW CONCEPT, only a newly reachable one. The
 * outcome has meant a proof that never ran since @SCN-LDG-017; what changed is that the static
 * axis can now say it, because the CI run's own step record says whether the check ran and the
 * reader had been declining to look.
 */
export type StaticCheckPosting =
  | { kind: "scenario"; scnId: string }
  | { kind: "phantom-scenario"; scnId: string }
  | { kind: "suspense-scenario"; posted: "broken" | "no-evidence-obligation-static-check" };

/**
 * WHERE does this evidence observation post? THE posting rule, in one place.
 *
 * `scenarioIds` is the OBLIGATION side — which scenarios exist — already the model's own rule,
 * built once by the caller and passed rather than re-derived here, so the rule stays a pure
 * decision over prepared inputs and cannot disagree with the census that shares it. A second set
 * (the named static-check handles) stood beside it for the by-name route and went with it.
 *
 * ORDER IS LOAD-BEARING — the arms are checked exactly as canon fail-safes them, and ON BOTH
 * BRANCHES since @SCN-LNT-026, which is the point of saying it once here:
 *   1. `broken` FIRST, on the FLAG, never on `scnId` / `status` (@SCN-LDG-017). A proof that never
 *      ran cannot discharge or fail an obligation, so it must never be citation-routed — not to a
 *      real row, not to a phantom one. It structurally MAY carry an `scnId` and a `status`; both
 *      are ignored here. Checking `broken` after either would misfile it.
 *   2. an uncited credit (`scnId === null`, or absent on the static axis) → suspense, never phantom.
 *   3. a cited credit whose `@SCN` no scenario carries → phantom.
 *   4. otherwise → that scenario's row.
 *
 * The two branches differ only in what step 2's suspense reason is CALLED, because the two axes
 * reach it for different reasons: a runtime credit that ran and cited nothing, a static check no
 * obligation names. Steps 1, 3 and 4 are the same rule read twice.
 *
 * The overloads keep the two axes' destinations apart at the type level, so a caller that has
 * already narrowed the union cannot be handed a destination its axis can never reach.
 */
export function postingOf(
  observation: RuntimeEvidenceObservation,
  scenarioIds: ReadonlySet<string>
): RuntimePosting;
export function postingOf(
  observation: FitnessEvidenceObservation,
  scenarioIds: ReadonlySet<string>
): StaticCheckPosting;
export function postingOf(
  observation: EvidenceObservation,
  scenarioIds: ReadonlySet<string>
): Posting;
export function postingOf(
  observation: EvidenceObservation,
  scenarioIds: ReadonlySet<string>
): Posting {
  if (observation.qualityCheck === "fitness") {
    // THE FAIL-SAFE FIRST (@SCN-LNT-026), which is the runtime arm's own arrangement one branch
    // down and carries its reason unchanged: broken is taken on the FLAG, before `scnId` is ever
    // consulted, so a proof that never ran can never be citation-routed — not to a real row, not
    // to a phantom one — and so can neither discharge nor fail the obligation it cites. The
    // observation MAY carry an `scnId` and the check that ran, and does; both are ignored here.
    //
    // Asked through the union's own predicate, so this rule and the reconciler class a static-check
    // observation the same way.
    if (isFitnessObservation(observation) && observation.broken === true) {
      return { kind: "suspense-scenario", posted: "broken" };
    }
    // THE CITATION ROUTE (@SCN-LNT-001) — the run carries the `@SCN` of the fitness scenario that
    // raises its obligation, so it posts by citation like every other credit: exactly one row,
    // real or invented. This is deliberately the SAME rule the runtime arm applies below, not a
    // static-axis variant of it — a whole-system property belongs to the one scenario that
    // holds it, and the moment the static axis is allowed its own posting rule is the moment the
    // smear can be reintroduced under a different name.
    if (observation.scnId !== undefined) {
      return scenarioIds.has(observation.scnId)
        ? { kind: "scenario", scnId: observation.scnId }
        : { kind: "phantom-scenario", scnId: observation.scnId };
    }
    // The seam reached no `@SCN` — the handle is unregistered, or no fitness scenario carries its
    // check — so the run cites nothing and posts to SUSPENSE, the static analogue of an uncited
    // runtime credit. There is no by-name fallback to try: a check nobody named is meant to
    // surface, and matching it to rows by handle is exactly the smear this route replaced.
    return { kind: "suspense-scenario", posted: "no-evidence-obligation-static-check" };
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
