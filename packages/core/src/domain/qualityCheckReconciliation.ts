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
  RuntimeEvidenceObservation,
} from "./journal.js";

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
  { obligation: "Exists" | "None"; observation: "Exists" | "None" }
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
    throw new Error(
      `QualityCheckReconciliation invariant (@SCN-LDG-030): outcome "${fields.outcome}" requires the ` +
        `evidence obligation (debit) side to be ${profile.obligation}, but it was ` +
        `${fields.evidenceObligation !== undefined ? "Exists" : "None"}.`,
    );
  }
  // The CREDIT-side check: the observation is carried IFF canon says it Exists for this outcome.
  if ((fields.evidenceObservation !== undefined) !== (profile.observation === "Exists")) {
    throw new Error(
      `QualityCheckReconciliation invariant (@SCN-LDG-030): outcome "${fields.outcome}" requires the ` +
        `evidence observation (credit) side to be ${profile.observation}, but it was ` +
        `${fields.evidenceObservation !== undefined ? "Exists" : "None"}.`,
    );
  }
  return fields as QualityCheckReconciliation;
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
    // The lint (static-check) evidence obligation — matched by static check handle among the static check
    // evidence observations. Three mappings on the static check evidence observation:
    //   - wired into CI over the real source → satisfied.
    //   - exists (a package.json script) but NOT wired → THE WATERMELON:
    //     green on the surface, red within — a static check that guards nothing.
    //   - absent (no package.json script) → missing: a required
    //     ledger entry never recorded, GENUINELY DIFFERENT from the watermelon.
    const guard = req.staticCheck!; // present by construction for a lint evidence obligation.
    const obs = evidenceObservations.find(
      (o): o is GuardEvidenceObservation => o.qualityCheck === "lint" && o.staticCheck === guard
    );
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
      staticCheck: guard,
      outcome,
      evidenceObligation: req,
      ...(obs?.exists ? { evidenceObservation: obs } : {}),
    });
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
  postedCredits: readonly RuntimeEvidenceObservation[],
  evidenceObligationPairs: ReadonlySet<string>
): QualityCheckReconciliation[] {
  return postedCredits
    .filter((o) => !evidenceObligationPairs.has(`${scnId} ${o.qualityCheck}`))
    .map((o) =>
      makeQualityCheckReconciliation({
        qualityCheck: o.qualityCheck,
        outcome: "no-evidence-obligation" as const,
        // The CREDIT side (@SCN-LDG-027): the citing observation this item reconciles.
        evidenceObservation: o,
        ...(o.locator !== undefined ? { locator: o.locator } : {}),
      })
    );
}

/**
 * The items on a PHANTOM row (@SCN-LDG-006) — one `cites-unknown-scenario` per credit citing an
 * `@SCN` no scenario carries, in citation order. CREDIT-ONLY: a phantom row is minted BY a credit,
 * so nothing can ever have been named of it, and no obligation is in scope.
 *
 * The locator rides through (ruling Q5) — it is the reader's where-to-fix, and a phantom item has
 * no obligation to point at instead.
 */
export function citesUnknownScenarioReconciliationsOf(
  credits: readonly RuntimeEvidenceObservation[]
): QualityCheckReconciliation[] {
  return credits.map((o) =>
    makeQualityCheckReconciliation({
      qualityCheck: o.qualityCheck,
      outcome: "cites-unknown-scenario",
      evidenceObservation: o,
      ...(o.locator !== undefined ? { locator: o.locator } : {}),
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
  noEvidenceObligationGuards: readonly GuardEvidenceObservation[]
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
        staticCheck: o.staticCheck,
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
