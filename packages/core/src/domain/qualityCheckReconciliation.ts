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
  GuardEvidenceObservation,
  FitnessEvidenceObservation,
  MeasuredEvidenceObservation,
  RuntimeEvidenceObservation,
} from "./journal.js";
import {
  isMeasuredObservation,
  isStaticCheckObservation,
  evidenceObligationPairKey,
} from "./journal.js";
import { QualityCheckFaultCode } from "./qualityCheckFault.js";
import { QualityCheckReconciliationFault } from "./qualityCheckReconciliationFault.js";

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
  // the reconciling item on a PHANTOM scenario (@SCN-LDG-006).
  | "cites-no-scenario" // a credit citing NO @SCN at all — the reconciling item on the
  // SUSPENSE scenario (@SCN-LDG-007). Aggregates uncited runtime credits AND the
  // uncited static-check (a `lint` credit no evidence obligation names, ruling Q4).
  | "broken" // a credit whose PROOF NEVER RAN — the harness broke before the behaviour was
  // exercised, so it cites no @SCN and can be attributed to no scenario. READER-AGNOSTIC: a
  // vitest suite that failed to collect (@SCN-LDG-017) OR a cucumber step matched by two or
  // more definitions (@SCN-LDG-019). A SIBLING of `cites-no-scenario` (both land in suspense
  // because they name no scenario), distinguished by broken-vs-completed. The scenario whose
  // proof was in that harness still reads `missing` (honest at its own resolution), but the RUN
  // now carries the fault — so the reader is sent to fix the harness, not to write a test that
  // already exists.
  | "no-evidence-obligation" // a credit citing a REAL scenario at a quality-check that scenario
  // NEVER NAMED (@SCN-LDG-008) — the GENERAL case (it applies whether or not the
  // scenario carries other evidence obligations). A credit-side reconciling item ON THE REAL scenario's
  // row (carrying the evidence observation locator, ruling Q5): the credit posts to a real account,
  // but against no evidence obligation. Fixes the latent `attributed` mis-count — a stray credit at a
  // quality-check the scenario never named is no longer silently counted as reconciliation-matched-attributed.
  // NEITHER-SIDE (the bidirectional reconciler's final outcome):
  | "no-scn-code" // a DEBIT outcome (@SCN-LDG-021): a real scenario carrying no @SCN,
  // so its Evidence Obligation has NO CODE for an Evidence Observation to link to. The scenario is
  // ORDINARY — not phantom, not suspense; it exists and cucumber runs it — but its own Scenario
  // Reconciliation is out-of-balance, because the obligation is UNLINKABLE. The DEBIT TWIN of
  // `cites-no-scenario` (same missing link, opposite side); suspense stays credit-only. UNCODED
  // work: it can never reconcile satisfied, failing, or even `missing` — an obligation never
  // RAISED cannot be ABSENT — so without this it was invisible to the verdict entirely.
  | "both-missing"; // a scenario that reconciles to ZERO rows on BOTH sides (no
  // evidence obligation AND no citing evidence observation) — the ONE degenerate Quality Check Reconciliation it
  // posts, blank on both sides (label: "Evidence Obligation and Evidence Observation are both
  // missing — the Scenario is untagged and uncited"). Detected by the reconciler emitting NOTHING either way (NOT a
  // hard evidenceObligations.length === 0 map — a zero-evidence obligation scenario cited by a stray
  // credit is `no-evidence-obligation`, @SCN-LDG-010). Retires the zero-evidence-scenario warning (@SCN-WRN-001
  // Update): the zero-evidence scenario is now this out-of-balance row, never a separate axis.
  // The verdict stays two-valued (out-of-balance VIA this reconciling item, never a third verdict).

/**
 * The canon description for each reconciling-item Outcome — the human-readable gloss a
 * markdown reader needs (the bare handle means nothing in a CI log). SINGLE SOURCE: the
 * markdown renderer renders this description in place of the handle EVERYWHERE an outcome
 * surfaces to a reader — the Evidence-reconciliation summary's `↳` decomposition rows, the
 * per-scenario reconciling-items list, and the lint-obligation table's Outcome column. The
 * JSON keeps the bare handle (the machine axis; a programmatic consumer uses it).
 *
 * Keyed by EVERY `Outcome` (a `Record<Outcome, …>`), so a new outcome cannot be added to the
 * union without a description here — the description can never silently diverge from the
 * outcome it names (the drift class this project has been burned by: the census, the views).
 * These phrasings ARE the original canon — later abbreviated to the handles; 3F-1626 restores
 * them. `satisfied` (the balanced outcome, excluded from the out-of-balance decomposition)
 * carries one for totality's sake.
 *
 * ⚠ KEY ORDER IS LOAD-BEARING (3F-1806). `OUT_OF_BALANCE_OUTCOMES` is DERIVED from these keys,
 * and the renderer walks that list to emit the decomposition rows — so this map's key order IS
 * the report's row order (`missing` first: the headline cause, the one carrying the bare-level
 * split as Detail). Reordering these keys is a REPORT CHANGE, not a cosmetic tidy. The order
 * follows canon, grouped by reconciling-item shape: a DEBIT block (missing, failing, watermelon,
 * no-scn-code), a CREDIT block (cites-unknown-scenario, cites-no-scenario, no-evidence-obligation), then
 * NEITHER (broken, both-missing). @SCN-RPT-019 now pins this SEQUENCE against the rendered `↳`
 * rows (3F-1926), so a reorder reds — the exhaustiveness guard alone proved MEMBERSHIP, not
 * order, and used not to catch one (which is how the order drifted before it was pinned).
 */
export const OUTCOME_DESCRIPTION: Record<Outcome, string> = {
  satisfied: "Evidence Observation satisfies its Evidence Obligation",
  missing: "Evidence Observation is missing",
  failing: "Evidence Observation is failing",
  watermelon: "Evidence Observation is passing but fabricated",
  // The DEBIT TWIN of `cites-no-scenario` (@SCN-LDG-021): same missing LINK, opposite side — the
  // scenario is real and ORDINARY, but carries no @SCN for an observation to link to.
  "no-scn-code": "Evidence Obligation has no @SCN code for an Evidence Observation to link to",
  "cites-unknown-scenario": "Evidence Observation cites an unknown Scenario",
  "cites-no-scenario": "Evidence Observation cites no Scenario",
  // CANON VERBATIM — double-entry-manifesto.md:42, the Outcome column. The gloss is the outcome
  // SENTENCE, canon's checkably-true half where the handle is only a label, so it states the
  // credit-side fact rather than echoing the handle's root. 3F-2308 landed the sentence; 3F-2300
  // then renamed the HANDLE to match it — the old one was the last survivor of a word canon has
  // retired — moving the emitted `byOutcome` key and every @SCN-LDG scenario that reads it.
  "no-evidence-obligation": "Evidence Observation cites a Scenario with no matching Evidence Obligation",
  // GENERIC over its producers (@SCN-LDG-017 + @SCN-LDG-019, 3F-1654): `broken` has two instances
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
 * The renderer walks this to emit the summary's `↳` leaf rows (@SCN-RPT-019), each reconciling
 * to the out-of-balance total exactly once (a FLAT list: the old debit/credit/neither grouping
 * emitted a `↳ <group>-side` subtotal AND its leaves at the same indent, so a naive column-sum
 * double-counted — the live 170 vs 85).
 *
 * DERIVED from the type-forced `OUTCOME_DESCRIPTION`, never hand-listed (3F-1806). It was a
 * hand-maintained `readonly Outcome[]` in the renderer, which accepted a missing union member
 * SILENTLY: `broken` (@SCN-LDG-017) joined the union, tallied into `byOutcome`, compiled clean,
 * and would have been omitted from the table. Deriving the keys makes that omission IMPOSSIBLE
 * rather than merely CAUGHT — a new `Outcome` cannot compile without a description, and the
 * moment it has one it renders a leaf row with no change to the renderer.
 *
 * Lives in the model, not the renderer: which outcomes are out-of-balance is the model's rule,
 * not a presentation choice (`entity-owns-its-behaviour`). The @SCN-RPT-019 guard remains as the
 * end-to-end backstop — it renders real markdown and reads the rows back, deriving its
 * expectation from its OWN type-forced record (`double-entry`, not a re-read of this source).
 */
export const OUT_OF_BALANCE_OUTCOMES: readonly Outcome[] = (
  Object.keys(OUTCOME_DESCRIPTION) as Outcome[]
).filter((outcome) => outcome !== "satisfied");

/**
 * THE NOMINAL BRAND (@SCN-LDG-030, 3F-2016) — a module-private `unique symbol` phantom field.
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
 * `guard` present IFF `qualityCheck === 'lint'` (the static-check reconciling item).
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
  /** The `staticCheck` handle — present IFF `qualityCheck === 'lint'`. */
  staticCheck?: string;
  outcome: Outcome;
  /**
   * The DEBIT side of the two-sided reconciling item (@SCN-LDG-026): the evidence obligation
   * this item reconciles, carried on the reconciliation itself rather than joined from a
   * separate scenario-level array at print time. Present IFF the obligation Exists — every
   * debit-bearing outcome (`satisfied` / `missing` / `failing` / `watermelon`), AND `no-scn-code`,
   * which carries a SYNTHESIZED scenario-scope obligation (an empty `{}`, no `qualityCheck` /
   * `staticCheck`): canon (`double-entry-manifesto.md` line 39) marks `no-scn-code` Obligation
   * Exists, Observation None — the debit twin of `cites-no-scenario` (@SCN-LDG-029). ABSENT on the
   * credit-only outcomes (`cites-unknown-scenario` / `cites-no-scenario` / `no-evidence-obligation`) and the
   * neither-side outcomes (`broken` / `both-missing`), where no obligation is in scope.
   * `JSON.stringify` omits it when undefined, so a byte-identical golden is preserved everywhere the
   * obligation is absent.
   */
  evidenceObligation?: EvidenceObligation;
  /**
   * The CREDIT side of the two-sided reconciling item (@SCN-LDG-027): the evidence observation
   * this item reconciles, carried on the reconciliation itself rather than joined from a
   * separate scenario-level array at print time. Present IFF the observation Exists — every
   * observation-bearing outcome: the two-sided debit outcomes (`satisfied` / `failing` /
   * `watermelon`) whose match `reconcileEvidenceObligation` found, AND the credit-only outcomes
   * (`cites-unknown-scenario` / `cites-no-scenario` / `no-evidence-obligation`) the fold produces from a
   * citing observation. ABSENT on `missing` (obligation Exists, observation None) and the
   * neither-side outcomes (`no-scn-code` / `broken` / `both-missing`), where no observation is in
   * scope. For a lint `missing` the absent static check is FOUND as the negative fact
   * `{exists:false}` — an ABSENCE, not an observation (@SCN-LDG-028) — so it is NOT carried here:
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
   * The WHAT-BROKE payload of a `broken` credit-side reconciling item (@SCN-LDG-017) — the
   * collection error the runner reported, carried alongside the `locator` (the file to fix).
   * Present only on a `broken` item; every other outcome carries none.
   */
  message?: string;
}

/**
 * A single evidenceObligation's reconciliation outcome — the branded reconciling item. The fields
 * intersected with the nominal brand (@SCN-LDG-030): mintable ONLY by
 * `makeQualityCheckReconciliation`, so every QCR in the system has passed the (outcome,
 * side-presence) consistency check. The barrel (`index.ts`, @SCN-API-001) re-exports this TYPE via
 * `model.ts`; the phantom field adds no exported SYMBOL, so the symbol NAMES on the frozen v1
 * surface are unchanged — but constructibility is deliberately NARROWED: QCRs are engine-minted,
 * and the type is exported for READING the reconciliation the engine produced, not for external
 * CONSTRUCTION (the smart constructor is unexported). That narrowed contract is stated executably
 * by the type-level guard in `index.test.ts` (@SCN-API-002, 3F-2040), not merely asserted here.
 */
export type QualityCheckReconciliation = QualityCheckReconciliationFields & {
  readonly [qualityCheckReconciliationBrand]: typeof qualityCheckReconciliationBrand;
};

/**
 * Whether a canon-correct reconciling item CARRIES a given side — the value both halves of the
 * invariant are stated in: what the canon row required, and what the fields actually carried.
 *
 * Named rather than restated inline so the fault that reports a divergence (`qualityCheckFault.ts`)
 * is typed in the reconciliation's own vocabulary instead of re-spelling the two literals a third
 * and fourth time.
 */
export type SidePresence = "Exists" | "None";

/**
 * THE CANON OUTCOME-SIDE PROFILE (@SCN-LDG-030, 3F-2016) — the (outcome → side-presence) table
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
  "cites-unknown-scenario": { obligation: "None", observation: "Exists" },
  "cites-no-scenario": { obligation: "None", observation: "Exists" },
  "no-evidence-obligation": { obligation: "None", observation: "Exists" },
  broken: { obligation: "None", observation: "None" },
  "both-missing": { obligation: "None", observation: "None" },
};

/**
 * THE SMART CONSTRUCTOR (@SCN-LDG-030, 3F-2016) — the ONLY way to mint a
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
      // The ternary STAYS in code (@SCN-MSG-001): it is parameter logic, not prose, so mutation
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
 * (@SCN-LNT-001, since a citing static credit can now post to a real or a phantom row).
 */
function locatorOf(observation: EvidenceObservation): string | undefined {
  return observation.qualityCheck === "lint" ? undefined : observation.locator;
}

/**
 * The static-check observation answering THIS scenario's `lint` obligation — ONE ROUTE, the
 * citation, on both of its terms (@SCN-LNT-001).
 *
 * THE CREDIT CITES, and it is the same rule the runtime arm applies: an observation citing this
 * scenario's `@SCN` answers its obligation. That is what lets a FITNESS obligation reconcile at
 * all — its `staticCheck` is the BARE CHECK TAG the scenario carries (`feature-codes`), while the
 * run knows only the runnable handle (`lint:feature-codes`), so nothing matches by name and
 * nothing ever could. The citation is the seam that already crossed between them.
 *
 * AND THE CITATION IS NOT AN ADDRESS ON ITS OWN (@SCN-LNT-012). The `@SCN` says which ROW the
 * credit belongs to; it does not say which of that row's obligations it ANSWERS. A stepless
 * scenario may carry more than one bare check tag, so a row can raise two fitness obligations and
 * be cited by two runs — and matching on the `@SCN` alone hands the first credit found to both,
 * silently absorbing the second. Measured: a genuine `typecheck` watermelon read `satisfied` off
 * `lint:complexity`'s credit, and the row read `balanced`. So the observation's own BARE CHECK TAG
 * is compared too, and it is the observation's `checkTag` — NOT its `staticCheck`. `staticCheck` is
 * the runnable handle, a different vocabulary from the obligation's bare tag, and comparing those
 * two is name-match in a new spelling: it agrees only where the words coincide, which is
 * `typecheck`, the one unprefixed check. `checkTag` is what the seam resolved, so the comparison is
 * like with like.
 *
 * NAME-MATCH IS GONE FROM HERE TOO (3F-2625). A by-handle fallback stood second, taken only for a
 * run that cited NOTHING. 3F-2590 retired the by-name route and removed `posting.ts`'s arm, but
 * never touched this file, so this half outlived the retirement it was written to announce — and
 * it was LIVE, not dead code. It compared an uncited observation's RUNNABLE handle against the
 * obligation's BARE tag, which differ for every prefixed check (`lint:feature-codes` vs
 * `feature-codes`) and are the SAME WORD for a prefix-less one (`typecheck`). On that check an
 * uncited credit both posted to suspense AND answered this obligation: the row read `satisfied` on
 * evidence that cited nothing, and one observation became the credit side of two items on two rows
 * — the exactly-one-posting claim broken by the reconciler rather than by the posting rule.
 *
 * SO A RUN THAT CITES NOTHING NOW ANSWERS NOTHING. It posts to SUSPENSE (`postingOf`), where a
 * check nobody named is meant to surface, and the obligation naming that check reads `missing` —
 * an honest pair, both halves loud. Pinned by plant, not by the absence of a symbol:
 * `uncitedFitnessCredit.test.ts`, @SCN-USG-001.
 *
 * ONE WORD IS PASSED, NOT TWO, and it is the BARE CHECK TAG. Every surviving `lint` obligation
 * names one: the fitness rule raises it from the tag its stepless scenario carries, and the retired
 * `@lint=<handle>` form raises nothing at all (@SCN-LNT-007). The obligation's word is now matched
 * ONLY against the observation's own `checkTag` — never against its `staticCheck`, which is the
 * runnable handle and a different vocabulary. That comparison was the deleted arm's, and it is what
 * made the arm name-match.
 *
 * Lives beside `reconcileEvidenceObligation` rather than inside it: which observation answers an
 * obligation is one idea with a name, and the outcome mapping that follows it is another.
 */
function staticCheckObservationFor(
  scnId: string,
  checkTag: string,
  evidenceObservations: readonly EvidenceObservation[]
): GuardEvidenceObservation | undefined {
  // `isStaticCheckObservation`, not a bare `qualityCheck === "lint"` (@SCN-CIP-003). Since the
  // measured member joined the union that test no longer narrows to this interface, so a
  // MEASUREMENT with a matching @SCN and check tag would satisfy the runtime check and be CAST to a
  // shape it does not have. The outcome it produced was accidentally right — `exists` and
  // `enforcedOverRealSource` read `undefined`, so the row fell through to `missing` — and it was
  // right by coincidence of falsiness rather than because anything decided it.
  return evidenceObservations.find(
    (o): o is GuardEvidenceObservation =>
      isStaticCheckObservation(o) && o.scnId === scnId && o.checkTag === checkTag
  );
}

/**
 * Reconcile one STATIC-CHECK fitness obligation — the read-over-the-source arm, unchanged in
 * substance and extracted so it sits beside its measured twin (@SCN-CIP-004) rather than inline in
 * the fork. Three mappings on the static check evidence observation:
 *   - wired into CI over the real source → satisfied.
 *   - exists (a package.json script) but NOT wired → THE WATERMELON: green on the surface, red
 *     within — a static check that guards nothing.
 *   - absent (no package.json script) → missing: a required ledger entry never recorded, GENUINELY
 *     DIFFERENT from the watermelon.
 *
 * NAMED FOR WHAT IT HOLDS. Every surviving fitness obligation carries the BARE CHECK TAG its
 * stepless scenario spells (`complexity`), never the runnable handle that invokes it
 * (`lint:complexity`) — the retired `@lint=<handle>` form raises nothing (@SCN-LNT-007). The old
 * name `guard` read as the handle and was the tag, which is exactly the confusion that let an
 * observation's handle be compared against it.
 */
function reconcileStaticObligation(
  scnId: string,
  req: EvidenceObligation,
  evidenceObservations: EvidenceObservation[]
): QualityCheckReconciliation {
  const checkTag = req.staticCheck!; // present by construction for a fitness evidence obligation.
  const obs = staticCheckObservationFor(scnId, checkTag, evidenceObservations);
  let outcome: Outcome;
  if (obs && obs.enforcedOverRealSource) {
    outcome = "satisfied";
  } else if (obs?.exists) {
    outcome = "watermelon";
  } else {
    outcome = "missing";
  }
  // The CREDIT side (@SCN-LDG-027/@SCN-LDG-028): the matched static-check observation, carried
  // ONLY when it is a REAL observation — `exists:true` (the two-sided `satisfied` / `watermelon`).
  // A guard absent from both package.json and CI is FOUND as the negative fact
  // `{exists:false}` — an ABSENCE, not an observed piece of evidence — so `missing` carries
  // NOTHING on the credit side (Obligation Exists, Observation None; double-entry-manifesto line
  // 36), uniform with the runtime `missing` path. `obs?.exists` (not `obs`) is the discriminator:
  // `find` locating the absent-guard record must not be mistaken for an observation existing.
  return makeQualityCheckReconciliation({
    qualityCheck: "lint",
    staticCheck: checkTag,
    outcome,
    evidenceObligation: req,
    ...(obs?.exists ? { evidenceObservation: obs } : {}),
  });
}

/**
 * The MEASUREMENT answering THIS scenario's measured obligation (@SCN-CIP-004) — matched on BOTH
 * terms, exactly as the static twin above is.
 *
 * THE @SCN PICKS THE ROW; THE CHECK TAG PICKS THE OBLIGATION. Neither is unique on its own. A
 * stepless scenario may carry more than one measured check, so two measurements can honestly cite
 * one @SCN (@SCN-LNT-012's shape on this axis); and canon's own arrangement for `ci-run-time` is
 * two scenarios sharing ONE check with ceilings of their own (@SCN-CIP-007), so the tag alone would
 * credit one suite's row with the other suite's wall-clock. Both faults are silent — each produces
 * a report that looks like a report about the row it sits on.
 *
 * NO CITATION IS RESOLVED HERE, because none has to be. A measurement arrives carrying its @SCN:
 * canon puts the check-to-scenario mapping in the runner that measures, so the two-hop seam the
 * static axis needs is simply not on this path.
 */
function measuredObservationFor(
  scnId: string,
  checkTag: string,
  evidenceObservations: readonly EvidenceObservation[]
): MeasuredEvidenceObservation | undefined {
  return evidenceObservations.find(
    (o): o is MeasuredEvidenceObservation =>
      isMeasuredObservation(o) && o.scnId === scnId && o.checkTag === checkTag
  );
}

/**
 * Reconcile one MEASURED fitness obligation (@SCN-CIP-004) — the comparison arm.
 *
 * THE ORDER OF THE THREE TESTS IS THE MECHANISM, not a style. The ceiling is checked FIRST, on the
 * debit alone, before any measurement is sought: an obligation nobody authored a ceiling for cannot
 * be settled by any number, and taken later the comparison would be `measured <= undefined` —
 * which JavaScript answers false to — so the row would read `failing` and send a reader to optimise
 * a suite whose real problem is that nobody wrote its bar (@SCN-CIP-002).
 *
 * THEN ABSENCE, THEN THE COMPARISON. No measurement at all is `missing`: the debit stands alone,
 * which is canon's (Obligation Exists, Observation None). It is deliberately NOT the watermelon —
 * "exists but is not wired" is a fact READ from a manifest and a workflow, and a measured check is
 * read from nowhere; when the step does not run there is no artefact and nothing to observe. What
 * must never come out of this arm is a BALANCED row, which is what a suite nobody timed would look
 * like if absence were silent.
 *
 * AT THE BAR IS NOT PAST IT, IN EITHER DIRECTION (@SCN-MUT-004). A ceiling a measurement sits
 * exactly on has not been exceeded, and a floor a measurement sits exactly on has been met.
 *
 * THE COMPARISON IS READ OFF THE DEBIT, NEVER OFF THE CHECK TAG. Which side of its bar satisfies is
 * half of what the bar says, so it is authored in the same manifest entry as the number and arrives
 * on the obligation beside it. An engine that instead knew `mutation` to be a floor would be
 * holding a roster of what a bare tag MEANS — the name-matching @SCN-LNT-005 puts in the target's
 * hands — and would overrule a target that had authored something else rather than letting it be
 * wrong out loud. Absent is at-most, so every obligation raised before this direction existed
 * reaches exactly the answer it reached before.
 *
 * NO NEW OUTCOME. `satisfied` and `failing` are both (Exists, Exists) in the canon side-profile and
 * `missing` is (Exists, None), so the smart constructor's invariant holds unchanged and the union
 * stays at canon's ten. The wrapper's own trigger-and-gate band — over the engineering anchor but
 * inside the variance margin — is the WRAPPER's printed report and never reaches here; on the
 * ledger it would be an eleventh outcome.
 */
function reconcileMeasuredObligation(
  scnId: string,
  req: EvidenceObligation,
  evidenceObservations: EvidenceObservation[]
): QualityCheckReconciliation {
  const checkTag = req.staticCheck!; // present by construction for a fitness obligation.
  const base = { qualityCheck: "lint" as const, staticCheck: checkTag, evidenceObligation: req };
  if (req.threshold === undefined) {
    return makeQualityCheckReconciliation({ ...base, outcome: "missing" });
  }
  const observation = measuredObservationFor(scnId, checkTag, evidenceObservations);
  if (observation === undefined) {
    return makeQualityCheckReconciliation({ ...base, outcome: "missing" });
  }
  return makeQualityCheckReconciliation({
    ...base,
    outcome: (
      req.atLeast === true
        ? observation.measured >= req.threshold
        : observation.measured <= req.threshold
    )
      ? "satisfied"
      : "failing",
    evidenceObservation: observation,
  });
}

/**
 * Reconcile one evidence obligation against the observed evidence, keyed on the
 * flat `qualityCheck`. `qualityCheck === "lint"` is the watermelon
 * discriminator: it routes to the STATIC-check mapping;
 * every other value routes to the RUNTIME-result mapping.
 */
export function reconcileEvidenceObligation(
  scnId: string,
  req: EvidenceObligation,
  evidenceObservations: EvidenceObservation[]
): QualityCheckReconciliation {
  if (req.qualityCheck === "lint") {
    // THE FITNESS FORK (@SCN-CIP-004), taken on the obligation's own `measured` marker and never on
    // the presence of a ceiling. A measured check is assessed by RUNNING the suite, so it is
    // reconciled by comparing numbers; the static route reads facts about the TREE and would report
    // a measured check as a script nobody wrote — the wrong cure, loudly delivered.
    return req.measured === true
      ? reconcileMeasuredObligation(scnId, req, evidenceObservations)
      : reconcileStaticObligation(scnId, req, evidenceObservations);
  }

  // A runtime evidence obligation — matched by (scnId, quality-check) among the runtime
  // evidence observations (a static check evidence observation carries qualityCheck "lint" and no scnId, so it
  // never matches here). present+pass → satisfied; present+fail → failing;
  // absent → missing (a required ledger entry never recorded).
  //
  // THE FAIL-SAFE (@SCN-LDG-017, operator-mandated): `broken` is checked BEFORE `status`. A
  // broken observation — one whose PROOF NEVER RAN — is excluded from the match entirely, so it
  // can NEVER reconcile as `satisfied` or `failing`: a proof that never ran can neither discharge
  // an obligation nor fail it. The obligation then finds no match and reconciles `missing` —
  // honest at its own resolution (no evidence citing it arrived); the broken evidence itself
  // posts to the SUSPENSE row below, where the reader is sent to fix the harness. The exclusion
  // is structural rather than incidental: `broken` rides an OPTIONAL
  // FLAG on RuntimeEvidenceObservation, so a broken credit CAN carry an scnId and a status — the
  // guard is what makes the fail-safe hold whatever it carries.
  const match = evidenceObservations.find(
    (o): o is RuntimeEvidenceObservation =>
      // TWO SURVIVING MUTANTS LIVE ON THIS CLAUSE, KEPT DELIBERATELY (3F-2237). Stryker has no
      // equivalence detection, so a mutant no test can kill is indistinguishable from one nobody
      // has written yet. The argument is recorded here because a reader meeting this line has no
      // other way to recover that the clause is redundant ON PURPOSE.
      //
      // `ConditionalExpression` (this clause → `true`) is redundant FOR ANY INPUT WHATSOEVER.
      // The arm is reached only when `req.qualityCheck !== "lint"` (the fitness fork above
      // returns first), and `o.qualityCheck === req.qualityCheck` two lines down entails
      // `o.qualityCheck !== "lint"` for every `o` that survives the chain. The redundancy is
      // LOGICAL, not type-based — no input, however constructed, separates mutant from original.
      //
      // `StringLiteral` (`"lint"` → `""`) rests on a NARROWER argument, and the difference is the
      // point. Mutated, the clause reads `o.qualityCheck !== ""`. On the `"lint"` side the logical
      // argument above still covers it — a `"lint"` observation can never satisfy the third clause
      // below the fitness fork. The `""` side IS separable: an evidence obligation and a credit
      // both carrying `""` reconcile `satisfied` here and `missing` under the mutant. But that
      // input is out of domain — no member of `QualityCheck` spells `""`, and nothing in this
      // package emits it (every producer is a literal, a closed alternation, or a lookup hit), so
      // it is reachable only by casting PAST the parameter type. 3F-2879 drew exactly that line: a
      // shape admitted by width subtyping WITH NO CAST is a real published-surface input and kills
      // (it killed `locatorOf`, and `fitnessCheckTagOf` with it); an out-of-domain value for a
      // typed field is not one, and pinning behaviour for it would assert a case no reader of this
      // model can reach.
      //
      // Kept because it is load-bearing for the compiler — delete it and `pnpm typecheck` reds
      // with `TS2339: Property 'broken' does not exist on type 'EvidenceObservation'`, the `"lint"`
      // observations never having been narrowed away — and because it states the fail-safe above
      // at the point the reader meets it.
      o.qualityCheck !== "lint" &&
      o.broken !== true &&
      o.qualityCheck === req.qualityCheck &&
      o.scnId === scnId
  );
  let outcome: Outcome;
  if (!match) {
    outcome = "missing";
  } else if (match.status === "passed") {
    outcome = "satisfied";
  } else {
    outcome = "failing";
  }
  // The CREDIT side (@SCN-LDG-027): the matched runtime observation, present for the two-sided
  // outcomes `satisfied` / `failing` and absent for `missing` — the conditional spread keeps
  // `missing` observation-free (obligation Exists, observation None).
  return makeQualityCheckReconciliation({
    qualityCheck: req.qualityCheck,
    outcome,
    evidenceObligation: req,
    ...(match ? { evidenceObservation: match } : {}),
  });
}

// ---------------------------------------------------------------------------
// THE CREDIT-SIDE AND DEGENERATE ITEM RULES (3F-2204) — co-located here beside
// `reconcileEvidenceObligation` because they answer the same question it does: what outcome does
// an entry reconcile to, and which sides does that item carry? `reconcileEvidenceObligation`
// answers it for a DEBIT matched against the observed evidence; these answer it for the entries
// that match no obligation at all (the credit-side outcomes) and for the two degenerate rows
// (no-scn-code, both-missing).
//
// They were inline `.map()` bodies in the `reconcile` fold. Posting-destination left in 3F-2202;
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
  return isStaticCheckObservation(observation)
    ? (observation.checkTag ?? observation.staticCheck)
    : fitnessCheckTagOf(observation);
}

/**
 * A fitness credit's BARE CHECK TAG, or `undefined` — the term the pair key compares.
 *
 * Deliberately NO handle fallback, unlike `fitnessCheckNameOf` above. The key is matched against an
 * obligation's `staticCheck`, which since the bare-tag unification always holds the BARE tag; a
 * handle substituted here would compare `lint:typecheck` against `typecheck` and miss — name-match
 * in a new spelling. A credit with no tag keys distinctly from every tagged one, which is what
 * stops it matching by having nothing to compare.
 */
function fitnessCheckTagOf(observation: EvidenceObservation): string | undefined {
  return isMeasuredObservation(observation) || isStaticCheckObservation(observation)
    ? observation.checkTag
    : undefined;
}

/**
 * The NO-EVIDENCE-OBLIGATION items on a real scenario's row (@SCN-LDG-008) — one per credit citing THIS
 * scenario at a quality-check it never named. The credit posts to a real row against NO
 * evidence obligation, so the item is CREDIT-ONLY (no obligation is in scope).
 *
 * The pair-check is what distinguishes no-evidence-obligation from a matched credit: a credit at a NAMED
 * `(scnId, quality-check)` pair reconciles satisfied/failing via `reconcileEvidenceObligation` and
 * is NOT re-listed here. `evidenceObligationPairs` is the journal's rule (`evidenceObligationPairsOf`),
 * built once and shared — which is what makes a credit citing a PENDING pair land here rather than
 * nowhere (3F-1858: a pending obligation names nothing, so such a credit is no-evidence-obligation exactly
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
        // THE CREDIT'S OWN CHECK TAG, not the axis (@SCN-LNT-013). Keyed on `lint` alone, a row's
        // obligation for one check answered a credit for any other — so a credit the debit match had
        // already, correctly, refused by tag was ALSO excluded here and reconciled to nothing.
        // Composed by the model's own `evidenceObligationPairKey`, the same spelling the set is
        // built with: a key built one way and read another is the same bug in a new spelling.
        !evidenceObligationPairs.has(
          evidenceObligationPairKey(scnId, o.qualityCheck, fitnessCheckTagOf(o))
        )
    )
    .map((o) =>
      makeQualityCheckReconciliation({
        qualityCheck: o.qualityCheck,
        outcome: "no-evidence-obligation" as const,
        // THE CHECK THAT RAN (@SCN-LNT-013) — a fitness credit's whole where-to-fix, since it has no
        // test file to be sent to. Without it the item reads "lint: no evidence obligation" and a
        // reader learns only that SOME check arrived uninvited, on a row that may name several.
        // Preferring the BARE TAG over the runnable handle is what lets it be read against the row's
        // own obligations, which are named by the bare tag — like compared with like. The handle is
        // the fallback for a credit that carries no tag, so the item still names something.
        ...(fitnessCheckNameOf(o) !== undefined ? { staticCheck: fitnessCheckNameOf(o) } : {}),
        // The CREDIT side (@SCN-LDG-027): the citing observation this item reconciles.
        evidenceObservation: o,
        ...(locatorOf(o) !== undefined ? { locator: locatorOf(o) } : {}),
      })
    );
}

/**
 * The items on a PHANTOM row (@SCN-LDG-006) — one `cites-unknown-scenario` per credit citing an
 * `@SCN` no scenario carries, in citation order. CREDIT-ONLY: a phantom row is minted BY a credit,
 * so nothing can ever have been named of it, and no obligation is in scope.
 *
 * THE WHERE-TO-FIX IS THE WHOLE OF WHAT THIS ITEM CAN OFFER, which is why both halves ride through
 * (ruling Q5): a phantom item has no obligation to point a reader at instead. A runtime credit
 * carries its locator (the test file that cited); a FITNESS credit carries the CHECK THAT RAN —
 * it is read from a target's config, not from a test file, so it has no locator and the handle is
 * all there is. That half became reachable when the fitness axis started citing (@SCN-LNT-009);
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
      // sent to. For a static run that is its runnable handle; for a MEASUREMENT it is the bare
      // check tag, which is the only name a measurement has (@SCN-CIP-003). Both land in
      // `staticCheck`, which on a reconciling item already holds the BARE tag for every obligation
      // the fitness rule raises.
      ...(isMeasuredObservation(o)
        ? { staticCheck: o.checkTag }
        : isStaticCheckObservation(o)
          ? { staticCheck: o.staticCheck }
          : {}),
      outcome: "cites-unknown-scenario",
      evidenceObservation: o,
      ...(locatorOf(o) !== undefined ? { locator: locatorOf(o) } : {}),
    })
  );
}

/**
 * The items on the SUSPENSE row (@SCN-LDG-007) — every entry that names no scenario at all,
 * in the ONE order canon fixes.
 *
 * THE ORDER IS THE RULE, not an accident of assembly. `broken` comes FIRST because a broken run's
 * other suspense items are downstream noise: the reader must be sent to the harness before being
 * asked to read anything the harness failed to produce.
 *
 * THE SPLIT (@SCN-LDG-017) is why `broken` and `cites-no-scenario` are separate arms rather than
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
 *     guard is read from config, not from a test file).
 */
export function suspenseReconciliationsOf(
  brokenEvidence: readonly RuntimeEvidenceObservation[],
  uncited: readonly RuntimeEvidenceObservation[],
  noEvidenceObligationGuards: readonly FitnessEvidenceObservation[]
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
    ...noEvidenceObligationGuards.map((o) =>
      makeQualityCheckReconciliation({
        qualityCheck: "lint" as const,
        // The check that ran, in whichever vocabulary the credit has one: a static run knows its
        // runnable handle, a measurement knows only its bare check tag (@SCN-CIP-003). A
        // measurement cannot in fact reach suspense — its runner stamps the citation — so this arm
        // is typed for what the posting rule may hand it, not for a case today's producers emit.
        staticCheck: isMeasuredObservation(o) ? o.checkTag : o.staticCheck,
        outcome: "cites-no-scenario" as const,
        evidenceObservation: o,
      })
    ),
  ];
}

/**
 * The item on an UNTAGGED scenario's row (@SCN-LDG-021) — the DEBIT twin of `cites-no-scenario`
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
 * The degenerate BOTH-MISSING item (@SCN-LDG-009) — the NEITHER-side outcome, blank on both sides:
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
