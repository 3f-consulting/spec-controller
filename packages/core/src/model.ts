/**
 * The reconciliation data model — the ledger over declared-vs-observed evidence,
 * keyed by one flat `qualityCheck` per evidence obligation (the two-axis
 * `(kind, level)` grid collapsed to a single mutually-exclusive coordinate).
 *
 * `@lint` is one quality-check VALUE, not a second axis; `qualityCheck === "lint"` is the
 * watermelon discriminator (replacing the retired `kind === "static"`). The runtime
 * quality-checks (@unit/@integration/@e2e/@performance) reconcile against emitted test
 * results; the `lint` quality-check reconciles a static guard over the source artifact.
 *
 * The verdict model separates the scenario VERDICT (its own binary type) from the
 * per-evidenceObligation reconciling-item outcome LDG-001 collapsed (`ScenarioOutcome`).
 */

/**
 * The flat quality-check — the single evidence coordinate. One
 * mutually-exclusive value per evidence obligation: `lint` (a static guard over the
 * source) or a runtime test level (`unit`/`integration`/`e2e`/`performance`).
 * Retires the two-axis `Kind` × `Level` grid.
 */
export type QualityCheck = "lint" | "unit" | "integration" | "e2e" | "performance";

/**
 * The runtime quality-checks — the flat coordinate MINUS `lint`, i.e. the value-set the
 * retired `Level` type named. Types the runtime-only surfaces (the observed readers'
 * declared quality-check, the test-volume `rawByRuntimeQualityCheck` keying) without re-admitting
 * the two-axis grid.
 */
export type RuntimeQualityCheck = Exclude<QualityCheck, "lint">;

/**
 * One evidence obligation a scenario declares — a SINGLE flat shape keyed on
 * `qualityCheck` (no `kind`/`level` discriminated union):
 *   - `@unit`/`@integration`/… → `{ qualityCheck: <level> }`.
 *   - `@lint=<guard>`           → `{ qualityCheck: 'lint', staticGuard }`.
 * `staticGuard` is present IFF `qualityCheck === 'lint'` (the static guard handle a `@lint=<guard>`
 * tag names); a runtime evidence obligation carries no `staticGuard`.
 *
 * `qualityCheck` is OPTIONAL (@SCN-PND-022) — `undefined` = SCENARIO-SCOPE: the
 * synthesised whole-scenario deferral a recognised deferral tag raises on a scenario
 * declaring ZERO obligations (a bare `@wip` — no evidence tag). It is always
 * `{ pending: true }` with no `qualityCheck` (nor `staticGuard`): it owes no specific check,
 * so the reconcile partition routes it to ONE `qualityCheck`-less Pending Item rather
 * than a both-missing row. Every ordinary (tag-derived) obligation carries a
 * `qualityCheck`; only the synthesised scenario-scope pending omits it.
 */
export interface EvidenceObligation {
  qualityCheck?: QualityCheck;
  /** The `staticGuard` handle — present IFF `qualityCheck === 'lint'`. */
  staticGuard?: string;
  /**
   * The obligation is owed but deliberately DEFERRED to a later slice — a
   * `<quality-check>pending` tag (evidence-manifesto §11B). ABSENT (undefined) on a
   * normal obligation; `true` on a pending one. A pending obligation is one-sided:
   * `@lintpending` derives `{ qualityCheck: 'lint', pending: true }` with NO `staticGuard` payload
   * (the static guard doesn't exist yet). PARSE only — what a pending obligation DOES on the ledger
   * (the one-sided Pending Item) is a later slice.
   */
  pending?: boolean;
}

/** A scenario's declared evidence obligations, read from its @SCN tags. */
export interface Scenario {
  /** The bare scenario id, e.g. `SCN-LDG-001` (no leading @). */
  scnId: string;
  /** The quality-check evidence obligations the scenario's evidence tags declare. */
  evidenceObligations: EvidenceObligation[];
}

/**
 * The DEMANDED `(scnId, quality-check)` pairs — the ONE rule for what a scenario demands, keyed
 * `"<scnId> <qualityCheck>"`. A credit citing a declared scenario is reconciliation-matched only
 * when its pair is in this set; otherwise it is `undemanded` (a real scenario, at a quality-check
 * it never declared).
 *
 * A `pending` obligation is EXCLUDED — it demands nothing. Canon, Pending Item: a
 * `<quality-check>pending` tag raises **no Evidence Obligation**, so "an Evidence Observation
 * citing that scenario at a pending quality-check is `undemanded` — exactly as when nothing was
 * declared at all". Nothing is demanded, so nothing can be attributed to it. (This also drops the
 * scenario-scope pending obligation, which carries no `qualityCheck` at all — it demands no
 * specific check, so it never belonged in a pair set keyed by one.)
 *
 * ONE COPY, BY CONSTRUCTION (3F-1858). This loop existed TWICE, character-identical — in
 * `reconcile` and in the observation census — each building the set over ALL obligations
 * INCLUDING pending. They agreed by copy-paste, not by construction: either could have grown a
 * filter alone and nothing would have redded. That is exactly what the pending divergence was —
 * the pair-check excluded the credit from `undemanded` while the pending partition excluded it
 * from the debit side, so it posted NOWHERE and the run read balanced, exit 0, over a fault canon
 * says must fail (@SCN-PND-005).
 *
 * Lives in the model, not in either caller: what a scenario DEMANDS is the model's rule, not a
 * reconciler's or a census's private business (`entity-owns-its-behaviour`) — the same reason
 * `OUT_OF_BALANCE_OUTCOMES` lives here rather than in the renderer that walks it.
 *
 * A runtime credit's quality-check is a `RuntimeQualityCheck`, so a declared `lint` obligation
 * never matches one — as intended; the static axis is matched by guard handle, not by pair.
 */
export function evidenceObligationPairsOf(scenarios: readonly Scenario[]): Set<string> {
  const pairs = new Set<string>();
  for (const scenario of scenarios) {
    for (const obligation of scenario.evidenceObligations) {
      if (obligation.pending === true) continue; // demands nothing — see above.
      pairs.add(`${scenario.scnId} ${obligation.qualityCheck}`);
    }
  }
  return pairs;
}

/** The pass/fail status an observed test result carries. */
export type EvidenceStatus = "passed" | "failed";

/**
 * One observed RUNTIME evidence result, normalised from a runner's output. The
 * quality-check is a DECLARED property of the ingestion input: the caller
 * declares the quality-check a source yields and the reader stamps it — the core makes
 * no source→quality-check assumption (the JS-ecosystem default is declared at the CLI
 * edge: vitest⇒unit, cucumber⇒integration). A runtime evidence observation never carries `lint`.
 */
export interface RuntimeEvidenceObservation {
  qualityCheck: RuntimeQualityCheck;
  /**
   * The bare scenario id the result attests, e.g. `SCN-LDG-001`, or `null` when the
   * result carries NO `@SCN` anchor at all (@SCN-LDG-007). A null-scnId credit
   * cites no scenario — it posts to the SUSPENSE scenario (the reconciler aggregates every
   * such credit into one `suspense-scenario` row, outcome `cites-no-scenario`). The observed
   * parsers now EMIT these (they were previously dropped); the reconciler consumes them.
   */
  scnId: string | null;
  status: EvidenceStatus;
  /**
   * The test-file locator this credit came from (Vitest `testResults[].name` /
   * Cucumber feature `uri`), carried so the bidirectional reconciler can stamp the
   * where-to-fix onto a CREDIT-side reconciling item (ruling Q5 — e.g. a
   * `cites-unknown-scenario` on a phantom scenario). Optional: hand-built evidence observations
   * (and the earlier readers) omit it.
   */
  locator?: string;
  /**
   * The PROOF NEVER RAN — the harness failed before it could exercise the behaviour, so the
   * observation cites no @SCN and can be attributed to NO scenario. ABSENT (undefined) on an
   * ordinary observation; `true` on broken evidence. The optional-flag shape, mirroring
   * `EvidenceObligation.pending?: true` (chosen over a third variant in the `EvidenceObservation`
   * union, which would touch every `qualityCheck === "lint"` narrowing site).
   *
   * READER-AGNOSTIC. `broken` has two producers and belongs to neither: a vitest suite that
   * failed to COLLECT (@SCN-LDG-017), and a cucumber step matched by two or more step
   * definitions (@SCN-LDG-019). What they share is the fact this flag names — a proof that
   * never ran — so the vocabulary here must not privilege either instance.
   *
   * FAIL-SAFE: the reconciler checks `broken` BEFORE `status`. A broken observation NEVER
   * reconciles as `failing` or `satisfied` — a proof that never ran cannot discharge (or fail)
   * an obligation. It posts ONE `broken` reconciling item on the SUSPENSE row, whatever `scnId` /
   * `status` it structurally carries.
   *
   * BOUNDARY: a runtime throw INSIDE a named `it` is attributable (vitest reports it with a name
   * and `status: failed`) and lands as `failing`, as before. `broken` is specifically the
   * CITATION-LESS case — the harness broke before the behaviour was ever exercised.
   */
  broken?: true;
  /**
   * The collection error the runner reported (Vitest `testResults[].message`) — the WHAT-BROKE
   * half of a `broken` observation's where-to-fix payload, alongside the file `locator`. Present
   * on a `broken` observation; absent on an ordinary one.
   */
  message?: string;
}

/**
 * One observed STATIC-guard fact, read from the CI config + package.json by the
 * `ingest/guard` seam. NOT a result-JSON fact: the watermelon is an
 * ABSENCE of wiring no emitted test result can carry, so this is read from the
 * *config* of the real tree.
 */
export interface GuardEvidenceObservation {
  /** A static guard evidence observation is the `lint` quality-check (the watermelon discriminator). */
  qualityCheck: "lint";
  /** The `staticGuard` handle — the npm-script name a `@lint=<guard>` tag names. */
  staticGuard: string;
  /** The static guard's script/CLI is present (a `package.json` `scripts` entry). */
  exists: boolean;
  /**
   * The static guard's command appears as a CI `run:` step over the real tree — the v1
   * (COARSE) "enforced over real source" signal (v1 verifies the command IS a CI
   * step, NOT that it reads real source vs fixtures — the residual gap a later
   * evidenceObservation-based check closes).
   */
  enforcedOverRealSource: boolean;
}

/**
 * One observed evidence fact — a DISCRIMINATED UNION on `qualityCheck === "lint"`:
 * a runtime test result (keyed by scnId + its runtime quality-check) or a
 * static-guard evidenceObservation (`qualityCheck: "lint"`, keyed by guard). The
 * reconciler matches each declared evidenceObligation against evidenceObservations of the
 * same quality-check.
 */
export type EvidenceObservation = RuntimeEvidenceObservation | GuardEvidenceObservation;

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
 * A single evidenceObligation's reconciliation outcome — a reconciling item. A SINGLE
 * flat shape mirroring EvidenceObligation: keyed on `qualityCheck`, with
 * `guard` present IFF `qualityCheck === 'lint'` (the static-guard reconciling item).
 */
export interface QualityCheckReconciliation {
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
 * A PENDING ITEM — the one-sided ledger entry a deliberately-DEFERRED evidence
 * obligation raises. A `<quality-check>pending` tag (evidence-manifesto §11B) declares
 * an obligation owed but deferred to a later slice; on the ledger it is NOT a Reconciling
 * Item — nothing is reconciled (no observation is sought, none is matched), so it never
 * becomes a `QualityCheckReconciliation` and never enters `evidenceObligations` /
 * `reconcilingItems`. It records only WHICH quality-check is owed-but-deferred: an IOU on
 * the report, verdict-neutral and run-neutral. One Pending Item per `<qc>pending`
 * obligation the scenario declared.
 *
 * `qualityCheck` is OPTIONAL (@SCN-PND-022) — `undefined` = SCENARIO-SCOPE: the whole
 * scenario is deferred (a bare `@wip` declaring no obligations) and owes NO specific
 * check. An obligation-scope Pending Item (a `<qc>pending` tag) names its owed
 * `qualityCheck`; a scenario-scope one names none. Kept ONE `PendingItem` type — the
 * `undefined` `qualityCheck` is the scenario-scope discriminator, not a parallel flag.
 */
export interface PendingItem {
  /** The flat quality-check this deferred obligation is owed at; ABSENT for a scenario-scope Pending Item. */
  qualityCheck?: QualityCheck;
}

/**
 * The scenario-kind discriminator — which KIND of scenario a Scenario
 * Reconciliation row is *about* (Account ≠ Scenario):
 *   - `scenario`          — a real, DECLARED scenario (the ordinary row).
 *   - `phantom-scenario`  — a cited-but-UNDECLARED scenario id: an evidence observation
 *                            cites an `@SCN` no feature declares (outcome
 *                            `cites-unknown-scenario`; @SCN-LDG-006).
 *   - `suspense-scenario` — the placeholder for credits citing NO scenario (outcome
 *                            `cites-no-scenario`; arrives with LDG-007).
 * The enum carries all three now; LDG-006 PRODUCES only `scenario` + `phantom-scenario`.
 * Reserve `scenario`/`scenarios` for the declared kind — the collection is the
 * `scenarioReconciliations`, never `scenarios`.
 */
export type ScenarioKind = "scenario" | "phantom-scenario" | "suspense-scenario";

/** A scenario's reconciliation outcome — its per-evidenceObligation outcomes + the verdict. */
export interface ScenarioReconciliation {
  scnId: string;
  /**
   * The scenario-kind this row is about — `scenario` on a declared row, `phantom-scenario` on a
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
