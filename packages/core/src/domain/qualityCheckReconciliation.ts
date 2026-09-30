/**
 * THE QUALITY CHECK RECONCILIATION — one reconciling item in the accounting frame: the
 * per-evidence-obligation line explaining why obligation and observation disagree. This module
 * co-locates the concept's type with its OWN behaviour — the outcome vocabulary, the canon
 * descriptions, and `reconcileEvidenceObligation`, the pure derivation that computes a single
 * obligation's outcome from the observed evidence (module, not class; the rule lives WITH the
 * concept, not in the reconcile orchestration that folds it).
 */

import type {
  QualityCheck,
  EvidenceObligation,
  EvidenceObservation,
  FitnessEvidenceObservation,
  RuntimeEvidenceObservation,
} from "./journal.js";
import {
  isFitnessObservation,
  evidenceObligationPairKey,
} from "./journal.js";
import { QualityCheckFaultCode } from "./qualityCheckFault.js";
import { QualityCheckReconciliationFault } from "./qualityCheckReconciliationFault.js";
import type { Outcome, SidePresence } from "./outcome.js";

export type { Outcome, SidePresence } from "./outcome.js";

/**
 * The canon description for each reconciling-item Outcome — the human-readable gloss a
 * markdown reader needs (the bare handle means nothing in a CI log). SINGLE SOURCE: the
 * markdown renderer renders this description in place of the handle EVERYWHERE an outcome
 * surfaces to a reader — the Evidence-reconciliation summary's `↳` decomposition rows, the
 * per-scenario reconciling-items list, and the fitness-obligation table's Outcome column. The
 * JSON keeps the bare handle (the machine axis; a programmatic consumer uses it).
 *
 * Keyed by EVERY `Outcome` (a `Record<Outcome, …>`), so a new outcome cannot be added to the
 * union without a description here — the description can never silently diverge from the
 * outcome it names (the drift class this project has been burned by: the census, the views).
 * These phrasings ARE the original canon — later abbreviated to the handles, and restored here.
 * `satisfied` (the balanced outcome, excluded from the out-of-balance decomposition)
 * carries one for totality's sake.
 *
 * ⚠ KEY ORDER IS LOAD-BEARING. `OUT_OF_BALANCE_OUTCOMES` is DERIVED from these keys,
 * and the renderer walks that list to emit the decomposition rows — so this map's key order IS
 * the report's row order (`missing` first: the headline cause, the one carrying the bare-level
 * split as Detail). Reordering these keys is a REPORT CHANGE, not a cosmetic tidy. The order
 * follows canon, grouped by reconciling-item shape: a DEBIT block (missing, failing, watermelon,
 * no-scn-code), a CREDIT block (cites-unknown-scenario, cites-no-scenario, no-evidence-obligation), then
 * NEITHER (broken, both-missing). A render test pins this SEQUENCE against the rendered `↳`
 * rows, so a reorder reds — the exhaustiveness guard alone proved MEMBERSHIP, not
 * order, and used not to catch one (which is how the order drifted before it was pinned).
 */
export const OUTCOME_DESCRIPTION: Record<Outcome, string> = {
  satisfied: "Evidence Observation satisfies its Evidence Obligation",
  missing: "Evidence Observation is missing",
  failing: "Evidence Observation is failing",
  watermelon: "Evidence Observation is passing but fabricated",
  // The DEBIT TWIN of `cites-no-scenario`: same missing LINK, opposite side — the
  // scenario is real and ORDINARY, but carries no @SCN for an observation to link to.
  "no-scn-code": "Evidence Obligation has no @SCN code for an Evidence Observation to link to",
  // CANON VERBATIM, backticks stripped — double-entry-manifesto.md's Outcome table.
  "duplicate-scn-code": "Evidence Obligation's @SCN code is carried by another Scenario",
  "cites-unknown-scenario": "Evidence Observation cites an unknown Scenario",
  "cites-no-scenario": "Evidence Observation cites no Scenario",
  // CANON VERBATIM — double-entry-manifesto.md:42, the Outcome column. The gloss is the outcome
  // SENTENCE, canon's checkably-true half where the handle is only a label, so it states the
  // credit-side fact rather than echoing the handle's root. The HANDLE was renamed
  // to match it — the old one was the last survivor of a word canon has
  // retired — moving the emitted `byOutcome` key and every ledger scenario that reads it.
  "no-evidence-obligation": "Evidence Observation cites a Scenario with no matching Evidence Obligation",
  // GENERIC over its producers: `broken` has two instances
  // — a vitest suite that failed to COLLECT, and a cucumber step two or more step definitions
  // match, which therefore never ran. An ambiguous step is neither a "suite" nor a "collection
  // error", so the gloss names what BOTH have in common: the proof exists and did not run.
  // REMEDY-NEUTRAL by design: what broke is equally a missing dependency, a syntax error, a bad
  // import, a top-level throw, or two colliding step definitions — the gloss names the FACT, not a
  // guessed cure. Contrast `missing`, whose remedy is "write the test": conflating the two is
  // exactly the false-`missing` this outcome retires.
  broken:
    "Evidence Observation ATTEMPT errored before it could cite a Scenario (the proving suite failed to collect; behaviour never exercised)",
  "both-missing":
    "Evidence Obligation and Evidence Observation are both missing — the Scenario is untagged and uncited",
};

/**
 * The out-of-balance reconciling-item outcomes, in report reading order — every `Outcome`
 * except `satisfied` (the BALANCED outcome, not part of the OUT-of-balance decomposition).
 * The renderer walks this to emit the summary's `↳` leaf rows, each reconciling
 * to the out-of-balance total exactly once (a FLAT list: the old debit/credit/neither grouping
 * emitted a `↳ <group>-side` subtotal AND its leaves at the same indent, so a naive column-sum
 * double-counted — the live 170 vs 85).
 *
 * DERIVED from the type-forced `OUTCOME_DESCRIPTION`, never hand-listed. It was a
 * hand-maintained `readonly Outcome[]` in the renderer, which accepted a missing union member
 * SILENTLY: `broken` joined the union, tallied into `byOutcome`, compiled clean,
 * and would have been omitted from the table. Deriving the keys makes that omission IMPOSSIBLE
 * rather than merely CAUGHT — a new `Outcome` cannot compile without a description, and the
 * moment it has one it renders a leaf row with no change to the renderer.
 *
 * Lives in the model, not the renderer: which outcomes are out-of-balance is the model's rule,
 * not a presentation choice (`entity-owns-its-behaviour`). The render test remains as the
 * end-to-end backstop — it renders real markdown and reads the rows back, deriving its
 * expectation from its OWN type-forced record (`double-entry`, not a re-read of this source).
 */
export const OUT_OF_BALANCE_OUTCOMES: readonly Outcome[] = (
  Object.keys(OUTCOME_DESCRIPTION) as Outcome[]
).filter((outcome) => outcome !== "satisfied");

/**
 * THE NOMINAL BRAND — a module-private `unique symbol` phantom field.
 * `QualityCheckReconciliation` is `QualityCheckReconciliationFields` PLUS a required field of this
 * symbol's type, so no object literal typechecks as a `QualityCheckReconciliation` OUTSIDE this
 * module — only `makeQualityCheckReconciliation` (which casts) can mint one. The brand symbol has
 * no runtime presence; the field is a Symbol key, so `JSON.stringify` skips it (never
 * serialised) and `.toEqual` sees no runtime key (value-literal comparisons stay green). The brand
 * restricts CONSTRUCTION only — consumers only READ QCRs, so no read site changes.
 */
declare const qualityCheckReconciliationBrand: unique symbol;

/**
 * A single evidenceObligation's reconciliation outcome — a reconciling item. A SINGLE
 * flat shape mirroring EvidenceObligation: keyed on `qualityCheck`, with
 * `staticCheck` present IFF `qualityCheck === 'fitness'` (the static-check reconciling item).
 *
 * The un-branded FIELDS (module-internal). The exported `QualityCheckReconciliation` type is this
 * intersected with the nominal brand; `makeQualityCheckReconciliation` takes these fields and mints
 * the branded value.
 */
interface QualityCheckReconciliationFields {
  /**
   * The flat quality-check this reconciling item is about. ABSENT only for the degenerate
   * `both-missing` item — the neither-side shape, blank on both sides: it names no
   * quality-check because it is neither a debit evidence obligation nor a credit evidence observation. Present on
   * every other outcome (debit and credit alike).
   */
  qualityCheck?: QualityCheck;
  /** The `staticCheck` handle — present IFF `qualityCheck === 'fitness'`. */
  staticCheck?: string;
  outcome: Outcome;
  /**
   * The DEBIT side of the two-sided reconciling item: the evidence obligation
   * this item reconciles, carried on the reconciliation itself rather than joined from a
   * separate scenario-level array at print time. Present IFF the obligation Exists — every
   * debit-bearing outcome (`satisfied` / `missing` / `failing` / `watermelon`), AND `no-scn-code`,
   * which carries a SYNTHESIZED scenario-scope obligation (an empty `{}`, no `qualityCheck` /
   * `staticCheck`): canon (`double-entry-manifesto.md` line 39) marks `no-scn-code` Obligation
   * Exists, Observation None — the debit twin of `cites-no-scenario`. ABSENT on the
   * credit-only outcomes (`cites-unknown-scenario` / `cites-no-scenario` / `no-evidence-obligation`) and the
   * neither-side outcomes (`broken` / `both-missing`), where no obligation is in scope.
   * `JSON.stringify` omits it when undefined, so a byte-identical golden is preserved everywhere the
   * obligation is absent.
   */
  evidenceObligation?: EvidenceObligation;
  /**
   * The CREDIT side of the two-sided reconciling item: the evidence observation
   * this item reconciles, carried on the reconciliation itself rather than joined from a
   * separate scenario-level array at print time. Present IFF the observation Exists — every
   * observation-bearing outcome: the two-sided debit outcomes (`satisfied` / `failing` /
   * `watermelon`) whose match `reconcileEvidenceObligation` found, AND the credit-only outcomes
   * (`cites-unknown-scenario` / `cites-no-scenario` / `no-evidence-obligation`) the fold produces from a
   * citing observation. ABSENT on `missing` (obligation Exists, observation None) and the
   * neither-side outcomes (`no-scn-code` / `broken` / `both-missing`), where no observation is in
   * scope. For a fitness `missing` the absent static check is FOUND as the negative fact
   * `{exists:false}` — an ABSENCE, not an observation — so it is NOT carried here:
   * only a REAL observation (`exists:true`) is the credit side. `JSON.stringify` omits it when
   * undefined, so a byte-identical golden is preserved everywhere the observation is absent.
   */
  evidenceObservation?: EvidenceObservation;
  /**
   * The where-to-fix for a CREDIT-side reconciling item (ruling Q5) — the
   * evidence-observation locator (the test-file path the citing credit came from),
   * carried so it survives the detail-arrays-into-rows move. Present only on a
   * credit-side Quality Check Reconciliation (e.g. `cites-unknown-scenario` on a
   * phantom scenario); a debit-side evidence obligation carries none.
   */
  locator?: string;
  /**
   * The WHAT-BROKE payload of a `broken` credit-side reconciling item — the
   * collection error the runner reported, carried alongside the `locator` (the file to fix).
   * Present only on a `broken` item; every other outcome carries none.
   */
  message?: string;
}

/**
 * A single evidenceObligation's reconciliation outcome — the branded reconciling item. The fields
 * intersected with the nominal brand: mintable ONLY by
 * `makeQualityCheckReconciliation`, so every QCR in the system has passed the (outcome,
 * side-presence) consistency check. The barrel (`index.ts`) re-exports this TYPE via
 * `model.ts`; the phantom field adds no exported SYMBOL, so the symbol NAMES on the public v1
 * surface are unchanged — but constructibility is deliberately NARROWED: QCRs are engine-minted,
 * and the type is exported for READING the reconciliation the engine produced, not for external
 * CONSTRUCTION (the smart constructor is unexported). That narrowed contract is stated executably
 * by the type-level guard in `index.test.ts`, not merely asserted here.
 */
export type QualityCheckReconciliation = QualityCheckReconciliationFields & {
  readonly [qualityCheckReconciliationBrand]: typeof qualityCheckReconciliationBrand;
};

/**
 * THE CANON OUTCOME-SIDE PROFILE — the (outcome → side-presence) table
 * transcribed from canon (`double-entry-manifesto.md` lines 35-44), keyed by EVERY `Outcome` (a
 * `Record<Outcome, …>`), so a new outcome cannot join the union without STATING its side
 * profile here — the type-forced totality that makes this map the SINGLE SOURCE the invariant is
 * checked against (mirroring `OUTCOME_DESCRIPTION`).
 *
 * `obligation`/`observation` are `"Exists" | "None"` — whether a canon-correct reconciling item
 * of that outcome CARRIES the debit (evidence obligation) and the credit (evidence observation)
 * side respectively. NOT a naive function of side-presence: `missing` and `no-scn-code` share
 * (Exists, None); the three credit outcomes (`cites-unknown-scenario` / `cites-no-scenario` /
 * `no-evidence-obligation`) share (None, Exists). So the invariant `makeQualityCheckReconciliation` enforces
 * is (outcome, side-presence) CONSISTENCY against this row, never a derivation of outcome FROM the
 * sides.
 */
export const OUTCOME_SIDE_PROFILE: Record<
  Outcome,
  { obligation: SidePresence; observation: SidePresence }
> = {
  satisfied: { obligation: "Exists", observation: "Exists" },
  missing: { obligation: "Exists", observation: "None" },
  failing: { obligation: "Exists", observation: "Exists" },
  watermelon: { obligation: "Exists", observation: "Exists" },
  "no-scn-code": { obligation: "Exists", observation: "None" },
  // Canon's Observation column reads "Any": that is the ACCOUNT's posted credits, which ride on the
  // row's `evidenceObservations`. The item reconciles no one credit (none can be attributed), so it
  // carries none.
  "duplicate-scn-code": { obligation: "Exists", observation: "None" },
  "cites-unknown-scenario": { obligation: "None", observation: "Exists" },
  "cites-no-scenario": { obligation: "None", observation: "Exists" },
  "no-evidence-obligation": { obligation: "None", observation: "Exists" },
  broken: { obligation: "None", observation: "None" },
  "both-missing": { obligation: "None", observation: "None" },
};

/**
 * THE SMART CONSTRUCTOR — the ONLY way to mint a
 * `QualityCheckReconciliation`. It takes `outcome` as GIVEN (a consistency check, NOT a
 * derivation — `missing`/`no-scn-code` share a profile, so the outcome cannot be recovered from
 * side-presence alone), looks up the canon row in `OUTCOME_SIDE_PROFILE`, and THROWS if the
 * carried sides disagree with it: a divergent (outcome, side-presence) pair — the watermelon class
 * this tool exists to catch, in its own output — is UNCONSTRUCTIBLE.
 *
 * Returns `fields` UNCHANGED (cast to the branded type): the producer's own key order is preserved
 * verbatim, so every unchanged row stays byte-identical (no object is reconstructed).
 */
export function makeQualityCheckReconciliation(
  fields: QualityCheckReconciliationFields
): QualityCheckReconciliation {
  const profile = OUTCOME_SIDE_PROFILE[fields.outcome];
  // The DEBIT-side check: the obligation is carried IFF canon says it Exists for this outcome.
  if ((fields.evidenceObligation !== undefined) !== (profile.obligation === "Exists")) {
    throw new QualityCheckReconciliationFault({
      code: QualityCheckFaultCode.ObligationSideDivergesFromCanon,
      outcome: fields.outcome,
      required: profile.obligation,
      // The ternary STAYS in code: it is parameter logic, not prose, so mutation
      // still reaches it — and now an assertion does too, which is what kills it.
      actual: fields.evidenceObligation !== undefined ? "Exists" : "None",
    });
  }
  // The CREDIT-side check: the observation is carried IFF canon says it Exists for this outcome.
  if ((fields.evidenceObservation !== undefined) !== (profile.observation === "Exists")) {
    throw new QualityCheckReconciliationFault({
      code: QualityCheckFaultCode.ObservationSideDivergesFromCanon,
      outcome: fields.outcome,
      required: profile.observation,
      actual: fields.evidenceObservation !== undefined ? "Exists" : "None",
    });
  }
  return fields as QualityCheckReconciliation;
}

/**
 * The where-to-fix a credit carries, for the credit-side items that now see BOTH axes.
 *
 * A static-check observation has no `locator` and never will: it is read from a target's CI
 * config and manifest, not from a test file, so there is no file to send the reader to beyond the
 * check's own handle — which the item already carries. Reading the field off the union rather
 * than off `RuntimeEvidenceObservation` is what let those items widen to the static axis at all
 * (since a citing static credit can now post to a real or a phantom row).
 */
function locatorOf(observation: EvidenceObservation): string | undefined {
  return observation.qualityCheck === "fitness" ? undefined : observation.locator;
}

/**
 * The outcomes a single credit can carry, WORST FIRST — the order the several credits
 * answering one obligation are read in.
 *
 * `failing` OUTRANKS `watermelon` because one credit's own ladder already asks the check's verdict
 * before its wiring: a severed credit that failed reads `failing`. Reading several by
 * the same order keeps one ladder for one credit and for many, so a failed credit never reads one
 * way alone and another beside a severed sibling. EITHER outranks `satisfied`, because a credit
 * reading otherwise is not vouched for by a sibling that passed.
 *
 * `missing` IS NOT HERE. It is not an outcome a credit carries: canon gives it no Observation, and
 * the `{exists:false}` record is an absence that carries nothing. Where any real credit
 * answers, the observation side Exists, so an absence never outranks one and is never named.
 */
const CREDIT_PRECEDENCE: readonly CreditOutcome[] = ["failing", "watermelon", "satisfied"];

/** An outcome a single credit can carry — every one in the precedence, and nothing else. */
type CreditOutcome = "failing" | "watermelon" | "satisfied";

/** An obligation's reading over every credit answering it: the outcome, and the credit named. */
interface Answer<T> {
  outcome: Outcome;
  credit?: T;
}

/**
 * THE ONE RULE FOR SEVERAL CREDITS, on every arm: each credit is read on its own, the
 * obligation reads the worst of those readings, and the item names the first credit carrying it.
 *
 * A runner emits one credit per test and a check can be run more than once, so one obligation is
 * routinely answered by several credits. None of them vouches for a sibling: a failed test is failing
 * whatever passed beside it, and a severed run is a watermelon whatever wired run of the same
 * check sits beside it. "First failed, else first" was this rule's first half, written
 * for the one arm that had a failure to find; it read the watermelon off whichever credit sorted first.
 *
 * The OUTCOME does not depend on the order the credits arrive in — it is the worst any of them
 * carries. The order decides only WHICH of the credits carrying it is named, and `reconcile` fixes
 * that order as evidence order, so the name is deterministic too. When no credit
 * carries an outcome in the precedence, nothing answered, and the obligation reads `missing`.
 */
function answerOf<T>(matches: readonly T[], outcomeOf: (credit: T) => CreditOutcome | undefined): Answer<T> {
  for (const outcome of CREDIT_PRECEDENCE) {
    const credit = matches.find((match) => outcomeOf(match) === outcome);
    if (credit) return { outcome, credit };
  }
  return { outcome: "missing" };
}

/**
 * The static-check observations answering THIS scenario's `fitness` obligation — ONE ROUTE, the
 * citation, on both of its terms.
 *
 * THE CREDIT CITES, and it is the same rule the runtime arm applies: an observation citing this
 * scenario's `@SCN` answers its obligation. That is what lets a FITNESS obligation reconcile at
 * all — its `staticCheck` is the BARE CHECK TAG the scenario carries (`traceability`), while the
 * run knows only the runnable handle (`lint:feature-codes`), so nothing matches by name and
 * nothing ever could. The citation is the seam that already crossed between them.
 *
 * THE CITATION IS THE WHOLE ADDRESS. One `@fitness` scenario is one check, so a row
 * raises at most one fitness obligation and the `@SCN` alone says which obligation a credit
 * answers — exactly as a runtime credit's `(scnId, quality-check)` does. The check word that
 * once told two fitness obligations on one row apart (a `checkTag` comparison) left
 * with the characteristic; several credits citing one row all answer its one obligation, and
 * `answerOf` reads the worst of them.
 *
 * NAME-MATCH IS GONE FROM HERE TOO. A by-handle fallback stood second, taken only for a
 * run that cited NOTHING. The by-name route was retired and removed `posting.ts`'s arm, but
 * never touched this file, so this half outlived the retirement it was written to announce — and
 * it was LIVE, not dead code. It compared an uncited observation's RUNNABLE handle against the
 * obligation's BARE tag, which differ for every prefixed check (`lint:feature-codes` vs
 * `traceability`) and are the SAME WORD for a prefix-less one (`typecheck`). On that check an
 * uncited credit both posted to suspense AND answered this obligation: the row read `satisfied` on
 * evidence that cited nothing, and one observation became the credit side of two items on two rows
 * — the exactly-one-posting claim broken by the reconciler rather than by the posting rule.
 *
 * SO A RUN THAT CITES NOTHING NOW ANSWERS NOTHING. It posts to SUSPENSE (`postingOf`), where a
 * check nobody named is meant to surface, and the obligation naming that check reads `missing` —
 * an honest pair, both halves loud. Pinned by plant, not by the absence of a symbol:
 * `uncitedFitnessCredit.test.ts`.
 *
 * NO WORD IS COMPARED AT ALL. The observation's `staticCheck` is the runnable handle, and comparing
 * it with anything the obligation carries was the deleted by-name arm; the `checkTag` comparison
 * that replaced it left with the characteristic too. The citation is the one term.
 *
 * Lives beside `reconcileEvidenceObligation` rather than inside it: which observation answers an
 * obligation is one idea with a name, and the outcome mapping that follows it is another.
 */
function fitnessCreditsCiting(
  scnId: string,
  evidenceObservations: readonly EvidenceObservation[]
): FitnessEvidenceObservation[] {
  // EVERY MATCH IS KEPT, NOT THE FIRST: `answerOf` reads them all, so a
  // failed or severed credit beside a wired one that passed is what the obligation reads, wherever
  // it sorts.
  return evidenceObservations.filter(
    (o): o is FitnessEvidenceObservation =>
      isFitnessObservation(o) &&
      // THE FAIL-SAFE, THE SAME ONE THE RUNTIME MATCH BELOW KEEPS. A proof that
      // never ran can neither discharge an obligation nor fail it, so a broken credit is excluded
      // from the match entirely and its obligation reconciles `missing` by absence — while the
      // credit itself posts to suspense, where the reader is told what broke. The exclusion is
      // STRUCTURAL rather than incidental: this observation carries its `scnId`, exactly as
      // cucumber's broken observation carries the `@SCN` its scenario cited, so nothing but this
      // clause keeps it out.
      o.broken !== true &&
      o.scnId === scnId
  );
}

/**
 * What ONE static-check credit carries on its own — the ladder `answerOf` ranks several by — or
 * `undefined` for an absence, which carries nothing: alone, its obligation reads
 * `missing` because nothing answered it, not because the record carried a `missing` of its own.
 *
 * THE CHECK'S OWN VERDICT FIRST, WHERE THE OBSERVATION CARRIED ONE, and the order is
 * the rule rather than a convenience. `exists` and `enforcedOverRealSource` say a check is there and
 * is wired, which is exactly what a check that ran and found violations also is — so asked in the
 * other order the wiring facts would answer `satisfied` over a red and the verdict would never be
 * reached. It is the same arrangement `broken` takes one function up, for the same reason: the fact
 * that reds is the one asked about first.
 *   - wired into CI over the real source → satisfied.
 *   - exists (a package.json script) but NOT wired → THE WATERMELON: green on the surface, red
 *     within — a static check that guards nothing.
 *   - absent (no package.json script) → missing: a required ledger entry never recorded, GENUINELY
 *     DIFFERENT from the watermelon.
 */
function staticOutcomeOf(credit: FitnessEvidenceObservation): CreditOutcome | undefined {
  if (credit.status === "failed") return "failing";
  if (credit.enforcedOverRealSource) return "satisfied";
  return credit.exists ? "watermelon" : undefined;
}

/**
 * Reconcile one STATIC-CHECK fitness obligation — the read-over-the-source arm, the fitness
 * axis's one route since its measured twin left. Every credit answering it is read by
 * `staticOutcomeOf`, and the obligation reads the worst of them (`answerOf`).
 *
 * NAMED FOR WHAT IT HOLDS. Every surviving fitness obligation carries the BARE CHECK TAG its
 * stepless scenario spells (`complexity`), never the runnable handle that invokes it
 * (`lint:complexity`) — the retired `@lint=<handle>` form raises nothing. The old
 * name `guard` read as the handle and was the tag, which is exactly the confusion that let an
 * observation's handle be compared against it.
 */
function reconcileStaticObligation(
  scnId: string,
  req: EvidenceObligation,
  evidenceObservations: EvidenceObservation[]
): QualityCheckReconciliation {
  const { outcome, credit } = answerOf(
    fitnessCreditsCiting(scnId, evidenceObservations),
    staticOutcomeOf
  );
  // The CREDIT side: the credit carrying the outcome, when one does. A
  // guard absent from both package.json and CI is FOUND as the negative fact `{exists:false}` — an
  // ABSENCE, not an observed piece of evidence — and it carries no outcome at all, so it is never the
  // credit named: `missing` carries NOTHING on the credit side (Obligation Exists,
  // Observation None; double-entry-manifesto line 36), uniform with the runtime `missing` path.
  return makeQualityCheckReconciliation({
    qualityCheck: "fitness",
    outcome,
    evidenceObligation: req,
    ...(credit ? { evidenceObservation: credit } : {}),
  });
}

/** What ONE runtime credit reads on its own: present+pass → satisfied; present+fail → failing. */
function runtimeOutcomeOf(credit: RuntimeEvidenceObservation): CreditOutcome {
  return credit.status === "passed" ? "satisfied" : "failing";
}

/**
 * Reconcile one evidence obligation against the observed evidence, keyed on the
 * flat `qualityCheck`. `qualityCheck === "fitness"` is the watermelon
 * discriminator: it routes to the STATIC-check mapping;
 * every other value routes to the RUNTIME-result mapping.
 */
export function reconcileEvidenceObligation(
  scnId: string,
  req: EvidenceObligation,
  evidenceObservations: EvidenceObservation[]
): QualityCheckReconciliation {
  if (req.qualityCheck === "fitness") {
    return reconcileStaticObligation(scnId, req, evidenceObservations);
  }

  // A runtime evidence obligation — matched by (scnId, quality-check) among the runtime
  // evidence observations (a static check evidence observation carries qualityCheck "fitness" and no scnId, so it
  // never matches here). present+pass → satisfied; present+fail → failing;
  // absent → missing (a required ledger entry never recorded).
  //
  // THE FAIL-SAFE (operator-mandated): `broken` is checked BEFORE `status`. A
  // broken observation — one whose PROOF NEVER RAN — is excluded from the match entirely, so it
  // can NEVER reconcile as `satisfied` or `failing`: a proof that never ran can neither discharge
  // an obligation nor fail it. The obligation then finds no match and reconciles `missing` —
  // honest at its own resolution (no evidence citing it arrived); the broken evidence itself
  // posts to the SUSPENSE row below, where the reader is sent to fix the harness. The exclusion
  // is structural rather than incidental: `broken` rides an OPTIONAL
  // FLAG on RuntimeEvidenceObservation, so a broken credit CAN carry an scnId and a status — the
  // guard is what makes the fail-safe hold whatever it carries.
  //
  // EVERY MATCH IS KEPT, NOT THE FIRST, and `answerOf` reads them: a failed test
  // beside a passing one citing the same scenario is `failing`, wherever its file sorts.
  const { outcome, credit } = answerOf(evidenceObservations.filter(
    (o): o is RuntimeEvidenceObservation =>
      // TWO SURVIVING MUTANTS LIVE ON THIS CLAUSE, KEPT DELIBERATELY. Stryker has no
      // equivalence detection, so a mutant no test can kill is indistinguishable from one nobody
      // has written yet. The argument is recorded here because a reader meeting this line has no
      // other way to recover that the clause is redundant ON PURPOSE.
      //
      // `ConditionalExpression` (this clause → `true`) is redundant FOR ANY INPUT WHATSOEVER.
      // The arm is reached only when `req.qualityCheck !== "fitness"` (the fitness fork above
      // returns first), and `o.qualityCheck === req.qualityCheck` two lines down entails
      // `o.qualityCheck !== "fitness"` for every `o` that survives the chain. The redundancy is
      // LOGICAL, not type-based — no input, however constructed, separates mutant from original.
      //
      // `StringLiteral` (`"fitness"` → `""`) rests on a NARROWER argument, and the difference is the
      // point. Mutated, the clause reads `o.qualityCheck !== ""`. On the `"fitness"` side the logical
      // argument above still covers it — a `"fitness"` observation can never satisfy the third clause
      // below the fitness fork. The `""` side IS separable: an evidence obligation and a credit
      // both carrying `""` reconcile `satisfied` here and `missing` under the mutant. But that
      // input is out of domain — no member of `QualityCheck` spells `""`, and nothing in this
      // package emits it (every producer is a literal, a closed alternation, or a lookup hit), so
      // it is reachable only by casting PAST the parameter type. The line is drawn exactly there: a
      // shape admitted by width subtyping WITH NO CAST is a real published-surface input and kills
      // (it killed `locatorOf`, and `fitnessCheckTagOf` with it); an out-of-domain value for a
      // typed field is not one, and pinning behaviour for it would assert a case no reader of this
      // model can reach.
      //
      // Kept because it is load-bearing for the compiler — delete it and `pnpm typecheck` reds
      // with `TS2339: Property 'broken' does not exist on type 'EvidenceObservation'`, the `"fitness"`
      // observations never having been narrowed away — and because it states the fail-safe above
      // at the point the reader meets it.
      o.qualityCheck !== "fitness" &&
      o.broken !== true &&
      o.qualityCheck === req.qualityCheck &&
      o.scnId === scnId
  ), runtimeOutcomeOf);
  // The CREDIT side: the credit carrying the outcome, present for the two-sided
  // outcomes `satisfied` / `failing` and absent for `missing` — the conditional spread keeps
  // `missing` observation-free (obligation Exists, observation None).
  return makeQualityCheckReconciliation({
    qualityCheck: req.qualityCheck,
    outcome,
    evidenceObligation: req,
    ...(credit ? { evidenceObservation: credit } : {}),
  });
}

// ---------------------------------------------------------------------------
// THE CREDIT-SIDE AND DEGENERATE ITEM RULES — co-located here beside
// `reconcileEvidenceObligation` because they answer the same question it does: what outcome does
// an entry reconcile to, and which sides does that item carry? `reconcileEvidenceObligation`
// answers it for a DEBIT matched against the observed evidence; these answer it for the entries
// that match no obligation at all (the credit-side outcomes) and for the two degenerate rows
// (no-scn-code, both-missing).
//
// They were inline `.map()` bodies in the `reconcile` fold. Posting-destination left earlier;
// this is the sibling class — WHAT an entry reconciles to, as opposed to WHERE it lands. Both are
// domain rules, so neither belongs in the orchestration. `reconcile` keeps the walk and builds the
// rows; the outcomes are asked for.
// ---------------------------------------------------------------------------

/**
 * What a FITNESS credit calls the check that ran — its bare tag where it has one, else the runnable
 * handle that invoked it. `undefined` for a runtime credit, which names a test file instead.
 *
 * The bare tag is preferred because a reconciling item's `staticCheck` holds the bare tag on the
 * debit side, so a reader comparing "the row names complexity" against "a credit for typecheck
 * arrived" is comparing like with like. The handle is a fallback rather than a second choice of
 * vocabulary: a credit with no tag cites nothing and posts to suspense, so it should not reach a
 * real row at all — but if one ever does, naming its handle beats naming nothing.
 */
function fitnessCheckNameOf(observation: EvidenceObservation): string | undefined {
  return isFitnessObservation(observation)
    ? observation.staticCheck
    : undefined;
}

/**
 * The NO-EVIDENCE-OBLIGATION items on a real scenario's row — one per credit citing THIS
 * scenario at a quality-check it never named. The credit posts to a real row against NO
 * evidence obligation, so the item is CREDIT-ONLY (no obligation is in scope).
 *
 * The pair-check is what distinguishes no-evidence-obligation from a matched credit: a credit at a NAMED
 * `(scnId, quality-check)` pair reconciles satisfied/failing via `reconcileEvidenceObligation` and
 * is NOT re-listed here. `evidenceObligationPairs` is the journal's rule (`evidenceObligationPairsOf`),
 * built once and shared — which is what makes a credit citing a PENDING pair land here rather than
 * nowhere (a pending obligation names nothing, so such a credit is no-evidence-obligation exactly
 * as when nothing was raised at all, and the run that used to read balanced over it now fails).
 */
export function noEvidenceObligationReconciliationsOf(
  scnId: string,
  postedCredits: readonly EvidenceObservation[],
  evidenceObligationPairs: ReadonlySet<string>
): QualityCheckReconciliation[] {
  return postedCredits
    .filter(
      (o) =>
        // THE `(scnId, quality-check)` PAIR, on both axes alike: a row raises at most one
        // fitness obligation, so a fitness credit citing it at `fitness` is answered or it is not.
        // Composed by the model's own `evidenceObligationPairKey`, the same spelling the set is
        // built with: a key built one way and read another is a bug in a new spelling.
        !evidenceObligationPairs.has(evidenceObligationPairKey(scnId, o.qualityCheck))
    )
    .map((o) =>
      makeQualityCheckReconciliation({
        qualityCheck: o.qualityCheck,
        outcome: "no-evidence-obligation" as const,
        // THE CHECK THAT RAN — a fitness credit's whole where-to-fix, since it has no
        // test file to be sent to. Without it the item reads "lint: no evidence obligation" and a
        // reader learns only that SOME check arrived uninvited, on a row that may name several.
        // Preferring the BARE TAG over the runnable handle is what lets it be read against the row's
        // own obligations, which are named by the bare tag — like compared with like. The handle is
        // the fallback for a credit that carries no tag, so the item still names something.
        ...(fitnessCheckNameOf(o) !== undefined ? { staticCheck: fitnessCheckNameOf(o) } : {}),
        // The CREDIT side: the citing observation this item reconciles.
        evidenceObservation: o,
        ...(locatorOf(o) !== undefined ? { locator: locatorOf(o) } : {}),
      })
    );
}

/**
 * The items on a PHANTOM row — one `cites-unknown-scenario` per credit citing an
 * `@SCN` no scenario carries, in citation order. CREDIT-ONLY: a phantom row is minted BY a credit,
 * so nothing can ever have been named of it, and no obligation is in scope.
 *
 * THE WHERE-TO-FIX IS THE WHOLE OF WHAT THIS ITEM CAN OFFER, which is why both halves ride through
 * (ruling Q5): a phantom item has no obligation to point a reader at instead. A runtime credit
 * carries its locator (the test file that cited); a FITNESS credit carries the CHECK THAT RAN —
 * it is read from a target's config, not from a test file, so it has no locator and the handle is
 * all there is. That half became reachable when the fitness axis started citing;
 * the suspense arm below already carried it, and the two unmatched-credit destinations must not
 * tell a reader different amounts about the same class of fault.
 */
export function citesUnknownScenarioReconciliationsOf(
  credits: readonly EvidenceObservation[]
): QualityCheckReconciliation[] {
  return credits.map((o) =>
    makeQualityCheckReconciliation({
      qualityCheck: o.qualityCheck,
      // THE CHECK THAT RAN is the fitness credit's whole where-to-fix — it has no test file to be
      // sent to. For a static run that is its runnable handle.
      ...(isFitnessObservation(o) ? { staticCheck: o.staticCheck } : {}),
      outcome: "cites-unknown-scenario",
      evidenceObservation: o,
      ...(locatorOf(o) !== undefined ? { locator: locatorOf(o) } : {}),
    })
  );
}

/**
 * The items on the SUSPENSE row — every entry that names no scenario at all,
 * in the ONE order canon fixes.
 *
 * THE ORDER IS THE RULE, not an accident of assembly. `broken` comes FIRST because a broken run's
 * other suspense items are downstream noise: the reader must be sent to the harness before being
 * asked to read anything the harness failed to produce.
 *
 * THE SPLIT is why `broken` and `cites-no-scenario` are separate arms rather than
 * one map over "everything uncited". Both land here because they name no scenario, but they are
 * distinguished by errored-vs-completed and their remedies differ: a `cites-no-scenario` test RAN
 * and forgot its citation (add the `@SCN`); a `broken` suite never ran at all (fix the harness).
 * Folding the second into the first would hide a collection failure behind the wrong cure.
 *
 * The three arms carry different payloads, each for a stated reason:
 *   - `broken` carries its WHERE-to-fix (locator) and its WHAT-broke (the runner's message), and
 *     NO `evidenceObservation` — a proof that never ran is not an observed piece of evidence.
 *   - an uncited runtime credit carries the observation it reconciles, plus its locator.
 *   - a no-evidence-obligation static check carries its handle and its observation; it has no locator (a
 *     static check is read from config, not from a test file).
 *
 * THE BROKEN STREAM TAKES EITHER AXIS, AND THE ARM NEEDED NO BRANCH FOR IT.
 * A converted static check that did not run carries the same two payload halves under the same
 * two names, so the map reads what the observation holds exactly as it does for a vitest suite
 * that failed to collect. What differs is only the `qualityCheck` the item then carries — `fitness`
 * rather than a runtime tier — which is read off the observation and not decided here.
 */
export function suspenseReconciliationsOf(
  brokenEvidence: readonly (RuntimeEvidenceObservation | FitnessEvidenceObservation)[],
  uncited: readonly RuntimeEvidenceObservation[],
  noEvidenceObligationStaticChecks: readonly FitnessEvidenceObservation[]
): QualityCheckReconciliation[] {
  return [
    ...brokenEvidence.map((o) =>
      makeQualityCheckReconciliation({
        qualityCheck: o.qualityCheck,
        outcome: "broken" as const,
        ...(o.locator !== undefined ? { locator: o.locator } : {}),
        ...(o.message !== undefined ? { message: o.message } : {}),
      })
    ),
    ...uncited.map((o) =>
      makeQualityCheckReconciliation({
        qualityCheck: o.qualityCheck,
        outcome: "cites-no-scenario" as const,
        evidenceObservation: o,
        ...(o.locator !== undefined ? { locator: o.locator } : {}),
      })
    ),
    ...noEvidenceObligationStaticChecks.map((o) =>
      makeQualityCheckReconciliation({
        qualityCheck: "fitness" as const,
        // The check that ran: a static run knows its runnable handle.
        staticCheck: o.staticCheck,
        outcome: "cites-no-scenario" as const,
        evidenceObservation: o,
      })
    ),
  ];
}

/**
 * The item on an UNTAGGED scenario's row — the DEBIT twin of `cites-no-scenario`
 * (same missing link, opposite side; suspense stays credit-only).
 *
 * A scenario carrying no `@SCN` is REAL and ORDINARY — cucumber runs it — but its obligation has no
 * CODE for an observation to link to, so it could reconcile NOTHING: not satisfied, not failing,
 * not even `missing`, because an obligation never RAISED cannot be ABSENT. Without this item it
 * contributed nothing to the verdict and the run went green over work nothing proves.
 *
 * It carries NO `qualityCheck`: with no code, no observation can link at ANY tier, so the missing
 * link is SCENARIO-scope, not tier-scope (the shape `both-missing` also uses). The synthesised
 * scenario-scope obligation — an empty `{}` — lives ONLY on this item; the row's own
 * `evidenceObligations` stays empty (canon citation: double-entry-manifesto line 39, Obligation
 * Exists / Observation None).
 */
export function noScnCodeReconciliations(): QualityCheckReconciliation[] {
  return [makeQualityCheckReconciliation({ outcome: "no-scn-code", evidenceObligation: {} })];
}

/**
 * The items on an account whose `@SCN` code more than one scenario carries.
 *
 * EVERY QUALITY CHECK THE SHARERS NAME, EACH READING `duplicate-scn-code` — deferred ones included.
 * Two scenarios behind one code means no credit citing it can be attributed to either, and a
 * pending declaration is no more attributable than a credit, so every sub-account is tainted for the
 * same reason. One item per distinct quality check, in the order the sharers first name them, each
 * carrying the first obligation that named it.
 *
 * WITH NONE NAMED AT ALL, ONE ITEM, never `both-missing`: "every quality check" has no members, and
 * the account is still unreconcilable. It carries the scenario-scope `{}` obligation `no-scn-code`
 * also uses, because canon's row for this outcome says the obligation Exists.
 */
export function duplicateScnCodeReconciliationsOf(
  obligations: readonly EvidenceObligation[]
): QualityCheckReconciliation[] {
  const firstNaming = new Map<QualityCheck, EvidenceObligation>();
  for (const obligation of obligations) {
    if (obligation.qualityCheck !== undefined && !firstNaming.has(obligation.qualityCheck)) {
      firstNaming.set(obligation.qualityCheck, obligation);
    }
  }
  if (firstNaming.size === 0) {
    return [makeQualityCheckReconciliation({ outcome: "duplicate-scn-code", evidenceObligation: {} })];
  }
  return [...firstNaming].map(([qualityCheck, evidenceObligation]) =>
    makeQualityCheckReconciliation({ qualityCheck, outcome: "duplicate-scn-code", evidenceObligation })
  );
}

/**
 * The degenerate BOTH-MISSING item — the NEITHER-side outcome, blank on both sides:
 * no `qualityCheck` (it is neither a debit obligation nor a credit observation), no carried entry.
 * A scenario that reconciled to zero rows on BOTH sides posts exactly one of these, and is
 * out-of-balance through it.
 *
 * Construction lives here with the item; the rule for WHEN a row carries it instead of its sub-rows
 * is the ROW's, and lives on `scenarioReconciliation` (`qualityCheckReconciliationsOf`).
 */
export function bothMissingReconciliation(): QualityCheckReconciliation {
  return makeQualityCheckReconciliation({ outcome: "both-missing" });
}

