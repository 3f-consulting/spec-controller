/**
 * THE QUALITY CHECK RECONCILIATION — one reconciling item in the accounting frame: the
 * per-evidence-obligation line explaining why declared and observed disagree. This module
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
 * why declared and observed disagree). The rationalisation: the
 * per-evidenceObligation axis is the OUTCOME — `satisfied` (its `balanced` retired,
 * `balanced` being the scenario VERDICT's word), and the watermelon reads plainly
 * as `watermelon`.
 */
export type Outcome =
  | "satisfied" // required, present, and passing
  | "failing" // required, present, but failing (runtime)
  | "watermelon" // a static guard that exists but is NOT wired into CI over the
  // real source — green on the surface, red within; a "broken"-class
  // outcome unique to the static kind.
  | "missing" // required, but no matching result/static guard observed
  // CREDIT-SIDE (the bidirectional reconciler): an evidence observation
  // (credit) reconciling against no evidence obligation. The credit-side union grows
  // final-named across the LDG-006/007/008 sub-issues; LDG-006 lands the first:
  | "cites-unknown-scenario" // a credit citing an @SCN no declared scenario matches —
  // the reconciling item on a PHANTOM scenario (@SCN-LDG-006).
  | "cites-no-scenario" // a credit citing NO @SCN at all — the reconciling item on the
  // SUSPENSE scenario (@SCN-LDG-007). Aggregates uncited runtime credits AND the
  // unattributed static-guard (a `lint` credit no evidence obligation declares, ruling Q4).
  | "broken" // a credit whose PROOF NEVER RAN — the harness broke before the behaviour was
  // exercised, so it cites no @SCN and can be attributed to no scenario. READER-AGNOSTIC: a
  // vitest suite that failed to collect (@SCN-LDG-017) OR a cucumber step matched by two or
  // more definitions (@SCN-LDG-019). A SIBLING of `cites-no-scenario` (both land in suspense
  // because they name no scenario), distinguished by broken-vs-completed. The scenario whose
  // proof was in that harness still reads `missing` (honest at its own resolution), but the RUN
  // now carries the fault — so the reader is sent to fix the harness, not to write a test that
  // already exists.
  | "undemanded" // a credit citing a REAL declared scenario at a quality-check that scenario
  // NEVER declared (@SCN-LDG-008) — the GENERAL case (it applies whether or not the
  // scenario carries other evidence obligations). A credit-side reconciling item ON THE REAL scenario's
  // row (carrying the evidence observation locator, ruling Q5): the credit posts to a real account, but
  // against no evidence obligation. Fixes the latent `attributed` mis-count — a stray credit at an
  // undeclared quality-check is no longer silently counted as reconciliation-matched-attributed.
  // NEITHER-SIDE (the bidirectional reconciler's final outcome):
  | "no-scn-code" // a DEBIT outcome (@SCN-LDG-021): a real, declared scenario carrying no @SCN,
  // so its Evidence Obligation has NO CODE for an Evidence Observation to link to. The scenario is
  // ORDINARY — not phantom, not suspense; it exists and cucumber runs it — but its own Scenario
  // Reconciliation is out-of-balance, because the obligation is UNLINKABLE. The DEBIT TWIN of
  // `cites-no-scenario` (same missing link, opposite side); suspense stays credit-only. Undeclarable
  // work: it can never reconcile satisfied, failing, or even `missing` — an obligation never
  // DECLARED cannot be ABSENT — so without this it was invisible to the verdict entirely.
  | "both-missing"; // a declared scenario that reconciles to ZERO rows on BOTH sides (no
  // evidence obligation AND no citing evidence observation) — the ONE degenerate Quality Check Reconciliation it
  // posts, blank on both sides (label: "Evidence Obligation and Evidence Observation are both
  // missing — the Scenario is untagged and uncited"). Detected by the reconciler emitting NOTHING either way (NOT a
  // hard evidenceObligations.length === 0 map — a zero-evidence obligation scenario cited by a stray
  // credit is `undemanded`, @SCN-LDG-010). Retires the no-evidence-declared warning (@SCN-WRN-001
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
 * no-scn-code), a CREDIT block (cites-unknown-scenario, cites-no-scenario, undemanded), then
 * NEITHER (broken, both-missing). @SCN-RPT-019 now pins this SEQUENCE against the rendered `↳`
 * rows (3F-1926), so a reorder reds — the exhaustiveness guard alone proved MEMBERSHIP, not
 * order, and used not to catch one (which is how the order drifted before it was pinned).
 */
export const OUTCOME_DESCRIPTION: Record<Outcome, string> = {
  satisfied: "Evidence Observation satisfies its Evidence Obligation",
  missing: "Evidence Observation is missing",
  failing: "Evidence Observation is failing",
  watermelon: "Evidence Observation is passing but fabricated",
  // The DEBIT TWIN of `cites-no-scenario` (@SCN-LDG-021): same missing LINK, opposite side. The
  // scenario is real and ORDINARY — it exists and cucumber runs it — but it carries no @SCN, so its
  // obligation has no code an observation could link to. Undeclarable work: it can never reconcile
  // satisfied, failing, or even `missing`, so without this outcome it was invisible to the verdict.
  "no-scn-code": "Evidence Obligation has no @SCN code for an Evidence Observation to link to",
  "cites-unknown-scenario": "Evidence Observation cites an unknown Scenario",
  "cites-no-scenario": "Evidence Observation cites no Scenario",
  undemanded: "Evidence Observation cites a Scenario that did not demand it",
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
 * module — only `makeQualityCheckReconciliation` (which casts) can mint one. `declare const`: the
 * symbol has no runtime presence; the field is a Symbol key, so `JSON.stringify` skips it (never
 * serialised) and `.toEqual` sees no runtime key (value-literal comparisons stay green). The brand
 * restricts CONSTRUCTION only — consumers only READ QCRs, so no read site changes.
 */
declare const qualityCheckReconciliationBrand: unique symbol;

/**
 * A single evidenceObligation's reconciliation outcome — a reconciling item. A SINGLE
 * flat shape mirroring EvidenceObligation: keyed on `qualityCheck`, with
 * `guard` present IFF `qualityCheck === 'lint'` (the static-guard reconciling item).
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
  /** The `staticGuard` handle — present IFF `qualityCheck === 'lint'`. */
  staticGuard?: string;
  outcome: Outcome;
  /**
   * The DEBIT side of the two-sided reconciling item (@SCN-LDG-026): the evidence obligation
   * this item reconciles, carried on the reconciliation itself rather than joined from a
   * separate scenario-level array at print time. Present IFF the obligation Exists — every
   * debit-bearing outcome (`satisfied` / `missing` / `failing` / `watermelon`), AND `no-scn-code`,
   * which carries a SYNTHESIZED scenario-scope obligation (an empty `{}`, no `qualityCheck` /
   * `staticGuard`): canon (`double-entry-manifesto.md` line 39) marks `no-scn-code` Obligation
   * Exists, Observation None — the debit twin of `cites-no-scenario` (@SCN-LDG-029). ABSENT on the
   * credit-only outcomes (`cites-unknown-scenario` / `cites-no-scenario` / `undemanded`) and the
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
   * (`cites-unknown-scenario` / `cites-no-scenario` / `undemanded`) the fold produces from a
   * citing observation. ABSENT on `missing` (obligation Exists, observation None) and the
   * neither-side outcomes (`no-scn-code` / `broken` / `both-missing`), where no observation is in
   * scope. For a lint `missing` the absent static guard is FOUND as the negative fact
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
 * `Record<Outcome, …>`), so a new outcome cannot join the union without declaring its side
 * profile here — the type-forced totality that makes this map the SINGLE SOURCE the invariant is
 * checked against (mirroring `OUTCOME_DESCRIPTION`).
 *
 * `obligation`/`observation` are `"Exists" | "None"` — whether a canon-correct reconciling item
 * of that outcome CARRIES the debit (evidence obligation) and the credit (evidence observation)
 * side respectively. NOT a naive function of side-presence: `missing` and `no-scn-code` share
 * (Exists, None); the three credit outcomes (`cites-unknown-scenario` / `cites-no-scenario` /
 * `undemanded`) share (None, Exists). So the invariant `makeQualityCheckReconciliation` enforces
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
  undemanded: { obligation: "None", observation: "Exists" },
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
 * Reconcile one declared evidenceObligation against the observed evidence, keyed on the
 * flat `qualityCheck`. `qualityCheck === "lint"` is the watermelon
 * discriminator: it routes to the STATIC-guard mapping;
 * every other value routes to the RUNTIME-result mapping.
 */
export function reconcileEvidenceObligation(
  scnId: string,
  req: EvidenceObligation,
  evidenceObservations: EvidenceObservation[]
): QualityCheckReconciliation {
  if (req.qualityCheck === "lint") {
    // The lint (static-guard) evidence obligation — matched by static guard handle among the static guard
    // evidence observations. Three mappings on the static guard evidence observation:
    //   - wired into CI over the real source → satisfied.
    //   - exists (a package.json script) but NOT wired → THE WATERMELON:
    //     green on the surface, red within — a static guard that guards nothing.
    //   - absent (no package.json script) → missing: a required
    //     ledger entry never recorded, GENUINELY DIFFERENT from the watermelon.
    const guard = req.staticGuard!; // present by construction for a lint evidence obligation.
    const obs = evidenceObservations.find(
      (o): o is GuardEvidenceObservation => o.qualityCheck === "lint" && o.staticGuard === guard
    );
    let outcome: Outcome;
    if (obs && obs.enforcedOverRealSource) {
      outcome = "satisfied";
    } else if (obs?.exists) {
      outcome = "watermelon";
    } else {
      outcome = "missing";
    }
    // The CREDIT side (@SCN-LDG-027/@SCN-LDG-028): the matched static-guard observation, carried
    // ONLY when it is a REAL observation — `exists:true` (the two-sided `satisfied` / `watermelon`).
    // A guard absent from both package.json and CI is FOUND as the negative fact
    // `{exists:false}` — an ABSENCE, not an observed piece of evidence — so `missing` carries
    // NOTHING on the credit side (Obligation Exists, Observation None; double-entry-manifesto line
    // 36), uniform with the runtime `missing` path. `obs?.exists` (not `obs`) is the discriminator:
    // `find` locating the absent-guard record must not be mistaken for an observation existing.
    return makeQualityCheckReconciliation({
      qualityCheck: "lint",
      staticGuard: guard,
      outcome,
      evidenceObligation: req,
      ...(obs?.exists ? { evidenceObservation: obs } : {}),
    });
  }

  // A runtime evidence obligation — matched by (scnId, quality-check) among the runtime
  // evidence observations (a static guard evidence observation carries qualityCheck "lint" and no scnId, so it
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
