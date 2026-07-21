/**
 * The JOURNAL — the debit/credit input concepts of the reconciliation domain, co-located
 * as one module (module, not class). These are the raw entries a run declares (evidence
 * obligations, the scenarios that declare them) and observes (evidence observations, runtime
 * and static), keyed by one flat `qualityCheck` per evidence obligation — the two-axis
 * `(kind, level)` grid collapsed to a single mutually-exclusive coordinate.
 *
 * `@lint` is one quality-check VALUE, not a second axis; `qualityCheck === "lint"` is the
 * watermelon discriminator (replacing the retired `kind === "static"`). The runtime
 * quality-checks (@unit/@integration/@e2e/@performance) reconcile against emitted test
 * results; the `lint` quality-check reconciles a static guard over the source artifact.
 *
 * The reconciled OUTCOMES these entries produce live in the sibling concept modules
 * (`qualityCheckReconciliation`, `scenarioReconciliation`, `ledger`), which import this one.
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
