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
 *   - `@lint=<guard>`           → `{ qualityCheck: 'lint', guard }`.
 * `guard` is present IFF `qualityCheck === 'lint'` (the guard handle a `@lint=<guard>`
 * tag names); a runtime evidence obligation carries no guard.
 *
 * `qualityCheck` is OPTIONAL (@SCN-PND-022) — `undefined` = SCENARIO-SCOPE: the
 * synthesised whole-scenario deferral a recognised deferral tag raises on a scenario
 * declaring ZERO obligations (a bare `@wip` — no evidence tag). It is always
 * `{ pending: true }` with no `qualityCheck` (nor `guard`): it owes no specific check,
 * so the reconcile partition routes it to ONE `qualityCheck`-less Pending Item rather
 * than a both-missing row. Every ordinary (tag-derived) obligation carries a
 * `qualityCheck`; only the synthesised scenario-scope pending omits it.
 */
export interface EvidenceObligation {
  qualityCheck?: QualityCheck;
  /** The guard handle — present IFF `qualityCheck === 'lint'`. */
  guard?: string;
  /**
   * The obligation is owed but deliberately DEFERRED to a later slice — a
   * `<quality-check>pending` tag (evidence-manifesto §11B). ABSENT (undefined) on a
   * normal obligation; `true` on a pending one. A pending obligation is one-sided:
   * `@lintpending` derives `{ qualityCheck: 'lint', pending: true }` with NO guard payload
   * (the guard doesn't exist yet). PARSE only — what a pending obligation DOES on the ledger
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
   * The proving suite FAILED TO COLLECT (@SCN-LDG-017) — it errored before it named a test, so
   * it cites no @SCN and can be attributed to NO scenario. ABSENT (undefined) on an ordinary
   * observation; `true` on a collection failure. The optional-flag shape, mirroring
   * `EvidenceObligation.pending?: true` (chosen over a third variant in the `EvidenceObservation`
   * union, which would touch every `qualityCheck === "lint"` narrowing site).
   *
   * FAIL-SAFE: the reconciler checks `broken` BEFORE `status`. A broken observation NEVER
   * reconciles as `failing` or `satisfied` — a suite that never ran cannot discharge (or fail) an
   * obligation. It posts ONE `broken` reconciling item on the SUSPENSE row, whatever `scnId` /
   * `status` it structurally carries.
   *
   * BOUNDARY: a runtime throw INSIDE a named `it` is attributable (vitest reports it with a name
   * and `status: failed`) and lands as `failing`, as before. `broken` is specifically the
   * CITATION-LESS collection failure.
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
  /** A guard evidence observation is the `lint` quality-check (the watermelon discriminator). */
  qualityCheck: "lint";
  /** The guard handle — the npm-script name a `@lint=<guard>` tag names. */
  guard: string;
  /** The guard's script/CLI is present (a `package.json` `scripts` entry). */
  exists: boolean;
  /**
   * The guard's command appears as a CI `run:` step over the real tree — the v1
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
  | "missing" // required, but no matching result/guard observed
  // CREDIT-SIDE (the bidirectional reconciler): an evidence observation
  // (credit) reconciling against no evidence obligation. The credit-side union grows
  // final-named across the LDG-006/007/008 sub-issues; LDG-006 lands the first:
  | "cites-unknown-scenario" // a credit citing an @SCN no declared scenario matches —
  // the reconciling item on a PHANTOM scenario (@SCN-LDG-006).
  | "cites-no-scenario" // a credit citing NO @SCN at all — the reconciling item on the
  // SUSPENSE scenario (@SCN-LDG-007). Aggregates uncited runtime credits AND the
  // unattributed static-guard (a `lint` credit no evidence obligation declares, ruling Q4).
  | "broken" // a credit whose proving SUITE FAILED TO COLLECT (@SCN-LDG-017) — it errored before
  // naming a test, so it cites no @SCN and can be attributed to no scenario. A SIBLING of
  // `cites-no-scenario` (both land in suspense because they name no scenario), distinguished by
  // errored-vs-completed. The scenario whose proof lived in that file still reads `missing`
  // (honest at its own resolution), but the RUN now carries the collection failure — so the
  // reader is sent to fix the harness, not to write a test that already exists.
  | "undemanded" // a credit citing a REAL declared scenario at a quality-check that scenario
  // NEVER declared (@SCN-LDG-008) — the GENERAL case (it applies whether or not the
  // scenario carries other evidence obligations). A credit-side reconciling item ON THE REAL scenario's
  // row (carrying the evidence observation locator, ruling Q5): the credit posts to a real account, but
  // against no evidence obligation. Fixes the latent `attributed` mis-count — a stray credit at an
  // undeclared quality-check is no longer silently counted as reconciliation-matched-attributed.
  // NEITHER-SIDE (the bidirectional reconciler's final outcome):
  | "both-missing"; // a declared scenario that reconciles to ZERO rows on BOTH sides (no
  // evidence obligation AND no citing evidence observation) — the ONE degenerate Quality Check Reconciliation it
  // posts, blank on both sides (label: "Evidence Observation and Evidence Obligation are both
  // missing for the Scenario."). Detected by the reconciler emitting NOTHING either way (NOT a
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
 */
export const OUTCOME_DESCRIPTION: Record<Outcome, string> = {
  satisfied: "Evidence Observation is present and passing",
  failing: "Evidence Observation is failing",
  watermelon: "Evidence Observation is passing but fabricated",
  missing: "Evidence Observation is missing",
  "cites-unknown-scenario": "Evidence Observation cites an unknown Scenario",
  "cites-no-scenario": "Evidence Observation cites no Scenario",
  // GENERIC over its producers (@SCN-LDG-017 + @SCN-LDG-019, 3F-1654): `broken` has two instances
  // — a vitest suite that failed to COLLECT, and a cucumber step two or more step definitions
  // match, which therefore never ran. An ambiguous step is neither a "suite" nor a "collection
  // error", so the gloss names what BOTH have in common: the proof exists and did not run.
  // REMEDY-NEUTRAL by design: what broke is equally a missing dependency, a syntax error, a bad
  // import, a top-level throw, or two colliding step definitions — the gloss names the FACT, not a
  // guessed cure. Contrast `missing`, whose remedy is "write the test": conflating the two is
  // exactly the false-`missing` this outcome retires.
  broken: "The proof never ran — the behaviour was never exercised",
  undemanded: "Evidence Observation cites a Scenario that did not demand it",
  "both-missing": "Evidence Observation and Evidence Obligation are both missing for the Scenario",
};

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
  /** The guard handle — present IFF `qualityCheck === 'lint'`. */
  guard?: string;
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
   * The scenario-kind this row is about. OPTIONAL for back-compat with
   * hand-built fixtures — ABSENCE ≡ `scenario` (the declared kind), the reserved
   * default. `reconcile` always sets it explicitly (`scenario` on a declared row,
   * `phantom-scenario` on a cited-but-undeclared row).
   */
  kind?: ScenarioKind;
  /**
   * The binary scenario verdict: `balanced` iff EVERY required quality-check
   * balances; otherwise `out-of-balance`.
   */
  verdict: ScenarioVerdict;
  /** Every evidenceObligation's reconciliation outcome (the full per-quality-check breakdown). */
  evidenceObligations: QualityCheckReconciliation[];
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
   * pending-awareness. OPTIONAL for back-compat with hand-built fixtures — ABSENCE ≡ `[]`
   * (no pending items), the same reserved-default convention as `kind`. `reconcile`
   * always sets it explicitly (`[]` when the scenario declared no pending obligation).
   */
  pendingItems: PendingItem[];
}

/**
 * The trial balance — all scenario balances assembled, the per-scenario reconciliation
 * ("the per-scenario reconciliation is the trial
 * balance, not the ledger"). Renamed from `Ledger`.
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
export interface EvidenceReconciliation {
  scenarioReconciliations: ScenarioReconciliation[];
}
