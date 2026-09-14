/**
 * The JOURNAL — the debit/credit input concepts of the reconciliation domain, co-located
 * as one module (module, not class). These are the raw entries a run RAISES (evidence
 * obligations, and the scenarios that raise them) and OBSERVES (evidence observations, runtime
 * and static), keyed by one flat `qualityCheck` per evidence obligation — the two-axis
 * `(kind, level)` grid collapsed to a single mutually-exclusive coordinate.
 *
 * `@lint` is one quality-check VALUE, not a second axis; `qualityCheck === "lint"` is the
 * watermelon discriminator (replacing the retired `kind === "static"`). The runtime
 * quality-checks (@unit/@integration/@e2e/@performance) reconcile against emitted test
 * results; the `lint` quality-check reconciles a static check over the source artifact.
 *
 * The reconciled OUTCOMES these entries produce live in the sibling concept modules
 * (`qualityCheckReconciliation`, `scenarioReconciliation`, `ledger`), which import this one.
 */

/**
 * The flat quality-check — the single evidence coordinate. One
 * mutually-exclusive value per evidence obligation: `lint` (a static check over the
 * source) or a runtime test level (`unit`/`integration`/`e2e`/`performance`).
 * Retires the two-axis `Kind` × `Level` grid.
 */
export type QualityCheck = "lint" | "unit" | "integration" | "e2e" | "performance";

/**
 * The runtime quality-checks — the flat coordinate MINUS `lint`, i.e. the value-set the
 * retired `Level` type named. Types the runtime-only surfaces (the observed readers' stamped
 * quality-check, the test-volume `rawByRuntimeQualityCheck` keying) without re-admitting
 * the two-axis grid.
 */
export type RuntimeQualityCheck = Exclude<QualityCheck, "lint">;

/**
 * One evidence obligation a scenario raises — a SINGLE flat shape keyed on
 * `qualityCheck` (no `kind`/`level` discriminated union):
 *   - `@unit`/`@integration`/… → `{ qualityCheck: <level> }`.
 *   - a `@fitness` scenario, via its `specController.fitnessChecks` row
 *                              → `{ qualityCheck: 'lint', staticCheck: <the row's characteristic> }`.
 *   - a registered bare check tag (e.g. `@complexity`)
 *                              → `{ qualityCheck: 'lint', staticCheck: <the tag> }`.
 * `staticCheck` is present IFF `qualityCheck === 'lint'` (the characteristic the check is about);
 * a runtime evidence obligation carries no `staticCheck`. The `@lint=<handle>` rider that once
 * raised this went with the by-name route (3F-2590) and raises nothing now (@SCN-LNT-007).
 *
 * `qualityCheck` is OPTIONAL (@SCN-PND-022) — `undefined` = SCENARIO-SCOPE: the
 * synthesised whole-scenario deferral a recognised deferral tag raises on a scenario
 * raising ZERO obligations (a bare `@wip` — no evidence tag). It is always
 * `{ pending: true }` with no `qualityCheck` (nor `staticCheck`): it owes no specific check,
 * so the reconcile partition routes it to ONE `qualityCheck`-less Pending Item rather
 * than a both-missing row. Every ordinary (tag-derived) obligation carries a
 * `qualityCheck`; only the synthesised scenario-scope pending omits it.
 */
export interface EvidenceObligation {
  qualityCheck?: QualityCheck;
  /** The `staticCheck` handle — present IFF `qualityCheck === 'lint'`. */
  staticCheck?: string;
  /**
   * The obligation is owed but deliberately DEFERRED to a later slice — a
   * `<quality-check>pending` tag (evidence-manifesto §11B). ABSENT (undefined) on a
   * normal obligation; `true` on a pending one. A pending obligation is one-sided:
   * `@lintpending` derives `{ qualityCheck: 'lint', pending: true }` with NO `staticCheck` payload
   * (the static check doesn't exist yet). PARSE only — what a pending obligation DOES on the ledger
   * (the one-sided Pending Item) is a later slice.
   */
  pending?: boolean;
  /**
   * The check is a MEASURED fitness function (@SCN-CIP-001) — assessed by RUNNING the suite and
   * measuring it rather than by reading the source, so its evidence is a NUMBER and its
   * reconciliation is a comparison. ABSENT on every other obligation; `true` on a measured one.
   *
   * IT IS THE ROUTING MARKER, and it is separate from `threshold` on purpose. The reconciler takes
   * the measured arm on THIS flag, never on the presence of a ceiling — `measured: true` with NO
   * `threshold` is the legal, loud shape of an obligation whose ceiling nobody authored, and it
   * must reach the arm that says so (@SCN-CIP-002) rather than fall through to the static route and
   * be reported as a check nobody wrote.
   */
  measured?: true;
  /**
   * The CEILING this measured obligation is held to — present when the target's manifest authored
   * one for this `(scnId, staticCheck)` pair, absent when it did not.
   *
   * A `threshold` is a ceiling — a bar stayed under, never an allowance drawn down (canon, the
   * 2026-08-02 retirement): the reconciliation is
   * `measured <= threshold`. The DEBIT carries it, never the credit — a run supplying both the
   * number and the bar it was judged against would be grading its own homework, and the ledger
   * would transcribe a verdict rather than reconcile one.
   */
  threshold?: number;
  /**
   * The bar above is a FLOOR — `measured >= threshold`. ABSENT on an ordinary ceiling obligation,
   * which is every one this repository has authored (@SCN-MUT-001).
   *
   * SPARSE, AND SEPARATE FROM `threshold` FOR THE REASON `measured` IS. A `threshold` of `{ value,
   * comparison }` would restructure every measured row on the wire — including the two live
   * `ci-run-time` ones — for a fact that is false of most of them; with the flag, a bare-number
   * entry serialises exactly as it did before the comparison existed. And `atLeast: true` with NO
   * `threshold` is the legal, loud shape of a floor whose bar nobody authored: the flag says which
   * way the bar reads, the bar is what the arm then reports.
   *
   * THE DIRECTION IS THE TARGET's TO AUTHOR, not the engine's to know. A mutation score is a floor
   * in every repository there is, but an engine that read the direction off the tag would be
   * holding a roster of what a bare tag MEANS — the name-matching @SCN-LNT-005 puts in the target's
   * hands. A target authoring a mutation ceiling is wrong out loud rather than quietly overruled.
   */
  atLeast?: true;
}

/** A scenario — its @SCN id, and the evidence obligations its evidence tags raise. */
export interface Scenario {
  /** The bare scenario id, e.g. `SCN-LDG-001` (no leading @). */
  scnId: string;
  evidenceObligations: EvidenceObligation[];
}

/**
 * The NAMED `(scnId, quality-check)` pairs — the ONE rule for what a scenario names, keyed
 * `"<scnId> <qualityCheck>"`. A credit citing a scenario is reconciliation-matched only
 * when its pair is in this set; otherwise it is `no-evidence-obligation` (a real scenario, at a quality-check
 * it never named).
 *
 * A `pending` obligation is EXCLUDED — it names nothing. Canon, Pending Item: a
 * `<quality-check>pending` tag raises **no Evidence Obligation**, so an Evidence Observation
 * citing that scenario at a pending quality-check is `no-evidence-obligation` — exactly as when
 * nothing was raised at all. Nothing is named, so nothing can be attributed to it. (This also drops the
 * scenario-scope pending obligation, which carries no `qualityCheck` at all — it names no
 * specific check, so it never belonged in a pair set keyed by one.)
 *
 * ONE COPY, BY CONSTRUCTION (3F-1858). This loop existed TWICE, character-identical — in
 * `reconcile` and in the observation census — each building the set over ALL obligations
 * INCLUDING pending. They agreed by copy-paste, not by construction: either could have grown a
 * filter alone and nothing would have redded. That is exactly what the pending divergence was —
 * the pair-check excluded the credit from `no-evidence-obligation` while the pending partition excluded it
 * from the debit side, so it posted NOWHERE and the run read balanced, exit 0, over a fault canon
 * says must fail (@SCN-PND-005).
 *
 * Lives in the model, not in either caller: what a scenario NAMES is the model's rule, not a
 * reconciler's or a census's private business (`entity-owns-its-behaviour`) — the same reason
 * `OUT_OF_BALANCE_OUTCOMES` lives here rather than in the renderer that walks it.
 *
 * A runtime credit's quality-check is a `RuntimeQualityCheck`, so a `lint` obligation
 * never matches one — as intended; the two axes key differently, see below.
 *
 * THE FITNESS KEY CARRIES ITS CHECK TAG (@SCN-LNT-013), and the asymmetry with the runtime key is
 * the design rather than an inconsistency. A runtime credit's `qualityCheck` IS its discriminating
 * term — an obligation at `unit` is answered by a credit at `unit`, and there is nothing finer to
 * key on. On the fitness axis the axis word is `lint` for EVERY check, so the axis alone cannot
 * discriminate: keyed on it, a row's obligation for one check answers a credit for any other.
 *
 * WHICH IS EXACTLY THE FAULT THIS CLOSES. `@SCN-LNT-012` made the debit MATCH compare check tags —
 * the `@SCN` picks the row, the tag picks the obligation — so a credit whose tag no obligation on
 * its row names matches nothing, correctly. This set stayed keyed on the axis, so the credit it
 * newly failed to match was also excluded from the credit-side items that should have caught it,
 * and it reconciled to NOTHING: filtered out of the debit by its tag and out of the credit side by
 * its axis. Measured over a genuine watermelon, the run read balanced, exit 0.
 *
 * BUILT AND READ TOGETHER. `noEvidenceObligationReconciliationsOf` composes the same key from the
 * CREDIT's own `checkTag`. A key built one way and read another is this same bug in a new spelling,
 * so the two are one change and are described in both places.
 */
export function evidenceObligationPairsOf(scenarios: readonly Scenario[]): Set<string> {
  const pairs = new Set<string>();
  for (const scenario of scenarios) {
    for (const obligation of scenario.evidenceObligations) {
      if (obligation.pending === true) continue; // names nothing — see above.
      pairs.add(evidenceObligationPairKey(scenario.scnId, obligation.qualityCheck, obligation.staticCheck));
    }
  }
  return pairs;
}

/**
 * THE ONE SPELLING of a `(scenario, what-it-names)` key — shared by the set above and by the
 * credit-side lookup, so the two cannot drift.
 *
 * `checkTag` is the FITNESS discriminator (the obligation's `staticCheck`, the credit's `checkTag`)
 * and is ignored on the runtime axis, where the quality-check already discriminates. A fitness
 * entry with NO tag keys distinctly from every tagged one rather than collapsing onto a bare
 * `"<scn> lint"` that a tagged obligation could answer — an uncited credit never reaches a real
 * row (`citationOfCitedRow` resolves the `@SCN` and the tag together or neither), and if one ever
 * did, it must not match by having nothing to compare.
 */
export function evidenceObligationPairKey(
  scnId: string,
  qualityCheck: QualityCheck | undefined,
  checkTag: string | undefined
): string {
  return qualityCheck === "lint"
    ? `${scnId} lint ${checkTag}`
    : `${scnId} ${qualityCheck}`;
}

/**
 * THE PENDING PARTITION, debit half (@SCN-PND-004, 3F-2204) — the evidence obligations a scenario
 * actually NAMES: every non-pending one, in document order. These are the obligations that
 * reconcile; the complement becomes one-sided Pending Items (`pendingItemsOf`, below).
 *
 * A pending obligation is EXCLUDED for the SAME reason, and by the same canon clause, as in
 * `evidenceObligationPairsOf`: a `<quality-check>pending` tag raises
 * NO Evidence Obligation, so it names nothing. This completes that family — the three now state
 * one rule over three keyings (the whole obligations, the `(scnId, quality-check)` pairs, the
 * static-check handles) instead of two stating it and a third restating it inline in the fold.
 *
 * Lives here rather than in the reconciler: what a scenario NAMES is the model's rule, not the
 * reconciler's private business (`entity-owns-its-behaviour`).
 *
 * Takes the OBLIGATIONS rather than a `Scenario` (3F-2203) so the one rule serves both sides of the
 * pipeline: `reconcile` passes the obligations a scenario raises, and the renderer passes a Ledger
 * row's POSTED DEBITS (`ScenarioReconciliation.evidenceObligations`) to answer "does this row
 * name this quality-check?" for the grid. The renderer previously re-encoded the `!pending`
 * clause itself — the same rule in a second home, agreeing by copy.
 */
export function evidenceObligationsOf(
  evidenceObligations: readonly EvidenceObligation[]
): EvidenceObligation[] {
  return evidenceObligations.filter((obligation) => !obligation.pending);
}

/**
 * THE PENDING PARTITION, deferred half (@SCN-PND-004, 3F-2204) — the one-sided Pending Items a
 * scenario's deferred obligations raise, one per `<quality-check>pending` obligation, in document
 * order. The exact complement of `evidenceObligationsOf`: together they partition the
 * scenario's obligations, so nothing is dropped and nothing is counted twice.
 *
 * A Pending Item carries ONLY the quality-check owed — `undefined` for the scenario-scope deferral
 * (@SCN-PND-022, a bare `@wip` raising no obligations), which owes no specific check. It is
 * partitioned off BEFORE the observation match, so it never becomes a Quality Check Reconciliation
 * and never a reconciling item: "one-sided — nothing is reconciled".
 */
export function pendingItemsOf(scenario: Scenario): PendingItem[] {
  return scenario.evidenceObligations
    .filter((obligation) => obligation.pending)
    .map((obligation) => ({ qualityCheck: obligation.qualityCheck }));
}

/** The pass/fail status an observed test result carries. */
export type EvidenceStatus = "passed" | "failed";

/**
 * One observed RUNTIME evidence result, normalised from a runner's output. The
 * quality-check is supplied by the CALLER, not inferred: the caller states the quality-check a
 * source yields and the reader stamps it — the core makes no source→quality-check assumption (the
 * JS-ecosystem default is set at the CLI edge: vitest⇒unit, cucumber⇒integration). A runtime
 * evidence observation never carries `lint`.
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
 * One observed STATIC-check fact, read from the CI config + package.json by the
 * two static-check observers. NOT a result-JSON fact: the watermelon is an
 * ABSENCE of wiring no emitted test result can carry, so this is read from the
 * *config* of the real tree.
 */
export interface GuardEvidenceObservation {
  /** A static check evidence observation is the `lint` quality-check (the watermelon discriminator). */
  qualityCheck: "lint";
  /**
   * WHAT THE CHECK IS CALLED — the runnable npm-script handle on the DISCOVERED route
   * (`lint:complexity`), and the CHARACTERISTIC itself on the converted one (@SCN-LNT-021), because
   * a converted check has no handle: it is not invoked by name, it is a scenario that ran.
   *
   * It is the where-to-fix an unmatched credit carries, never what the reconciler matches on —
   * that is `checkTag` below, and the difference between the two is stated there at length.
   */
  staticCheck: string;
  /**
   * The `@SCN` this run CITES — the fitness scenario whose bare check tag the citation seam
   * resolved this handle to (`parse/fitnessCitations`), stamped by the observer.
   *
   * ABSENT when the seam reached none: no configured row names it, or its CI step states no
   * code. That absence is now the WHOLE routing decision, no flag needed — a citing credit posts
   * to the one row it names, and a credit that cites nothing posts to suspense and answers no
   * obligation at all (3F-2590 removed the by-name posting arm; 3F-2625 the by-handle half that
   * outlived it in `qualityCheckReconciliation`). Optional rather than `string | null` (the runtime
   * twin's shape) so every existing construction site and every JSON golden is untouched: an
   * observation that cites nothing serialises exactly as it did.
   */
  scnId?: string;
  /**
   * The BARE CHECK TAG this run IS (`complexity`) — the observation's own characteristic, resolved
   * by the same citation seam that stamped `scnId` and stamped with it.
   *
   * WHAT THE LEDGER RECONCILES ON, which is why the observation carries it. `staticCheck` above is
   * the RUNNABLE HANDLE (`lint:complexity`) — where-to-fix, the command a reader has to invoke —
   * while an Evidence Obligation names the bare tag its stepless scenario carries. Those are two
   * vocabularies by design, and matching one against the other is name-match wearing a new coat: it
   * agrees only where the spellings coincide, which is `typecheck`, the one unprefixed check. The
   * bare tag is what makes the comparison compare like with like.
   *
   * WITHOUT IT, THE `@SCN` HAS TO CARRY THE MATCH ALONE, and it cannot: a stepless scenario may
   * carry more than one bare check tag, so two runs can honestly cite the same `@SCN` and the first
   * one found answers both obligations (@SCN-LNT-012). Measured before this field existed — a
   * genuine `typecheck` watermelon read `satisfied` off `lint:complexity`'s credit and the row read
   * `balanced`.
   *
   * PRESENT EXACTLY WHEN `scnId` IS, never on its own: the seam resolves both terms or neither
   * (`parse/fitnessCitations` → `citationOfCitedRow`), so an uncited observation carries no citation
   * keys at all and its JSON is byte-identical to what it was. Optional for the same reason `scnId`
   * is — this interface is on the frozen v1 barrel, and a required field would break external
   * construction of a publicly exported type.
   */
  checkTag?: string;
  /**
   * The static check EXISTS — and the route the observer took to that fact is now one of two
   * (@SCN-LNT-021).
   *
   * INFERRED on the DISCOVERED route: a `package.json` `scripts` entry by that name is present, so
   * something by that name could be invoked. OBSERVED on the CONVERTED route: the check's scenario
   * step appears in the CI run's own record of what each of its steps did, which says it RAN — a
   * stronger fact than a manifest holding a name, and one no manifest read can reach.
   *
   * The field means the same thing either way, which is why it is one field: this check is not
   * absent from the target. What differs is the strength of what stands behind it, and the
   * converted route's is the stronger of the two — which is why `--ci` and its twin below
   * eventually retire for converted checks (3F-3139).
   */
  exists: boolean;
  /**
   * The static check ran OVER THE REAL TREE rather than over a fixture — and, as with `exists`
   * above, by one of two routes (@SCN-LNT-021).
   *
   * INFERRED on the DISCOVERED route: the check appears as a step of the target's CI — a `run:` one
   * or a `uses:` one (@SCN-USG-013) — the v1 (COARSE) signal, which verifies the check IS a CI step
   * and NOT that it reads real source vs fixtures, the residual gap a later
   * evidenceObservation-based check closes. OBSERVED on the
   * CONVERTED route: the step ran inside the target's own pipeline, over the target's own checkout,
   * so a step the run's record names ran over that tree — and the coarseness the workflow read
   * carries is simply not on this path.
   *
   * NEITHER ROUTE READS THE CHECK'S OWN VERDICT, on this field or any other. Whether the check
   * FOUND anything is the runner's exit code's answer; whether it RAN is this one's. Two questions,
   * two mechanisms, and a converted check keeps that split exactly.
   */
  enforcedOverRealSource: boolean;
  /**
   * THE CHECK'S OWN VERDICT, where the stream that observed it carried one (@SCN-LNT-028) — the
   * same field, spelled the same way, as its runtime sibling's above.
   *
   * IT IS ABSENT ON EVERY ROUTE THAT READS A CONFIG, and that absence is the honest value rather
   * than an omission. `exists` and `enforcedOverRealSource` are read from a manifest and a
   * workflow, which say a check is there and is wired; neither document knows what the check
   * FOUND. So those routes assert nothing here and reconcile exactly as they always have.
   *
   * WHAT MADE IT NECESSARY WAS THE THIRD THING GOING AWAY. While a runner ran the checks, a check
   * that found violations reddened the run through the runner's exit code, so a reader could
   * honestly answer "did it run" and leave the verdict to somebody else. A CI step's exit code
   * reaches this ledger nowhere: what crosses is a status field, so the verdict now has to travel
   * on the observation or not at all — and a reader that went on collapsing passed and failed
   * would be green over every check that ran and found something.
   *
   * `failed` REACHES `failing`, WHICH IS THE WORD EVERY OTHER AXIS ALREADY USES. Present-and-
   * passing reconciles satisfied and present-and-failing reconciles failing, and a failed unit
   * test has posted `failing` since the ledger had two sides. It is emphatically NOT `broken`:
   * that is the never-ran case, it carries no observation at all, and it stamps the run unsound —
   * so reading a check that ran and found violations as broken would discard what the check said.
   */
  status?: EvidenceStatus;
  /**
   * THE CHECK NEVER RAN (@SCN-LNT-026) — the static twin of the flag its runtime sibling has
   * carried since @SCN-LDG-017, and the same fact under the same name: a proof that never
   * materialised. ABSENT on an ordinary observation; `true` on broken evidence.
   *
   * `true` RATHER THAN `boolean`, which is the runtime twin's shape and its reason: `false` would
   * be an expressible value meaning exactly what absence already means, and the reconciler's
   * fail-safes test the flag rather than its negation. There is no state for the second spelling
   * to name.
   *
   * WHAT REACHES IT ON THIS AXIS, AND IT IS NOW TWO DOCUMENTS RATHER THAN ONE (@SCN-LNT-026). A
   * converted check's credit says what the check DID, and the document saying so is the CI run's
   * own step record — so an entry carrying no reading that says what the check did is a check whose
   * running nothing can vouch for, and so is a configured row the record holds no entry for at all
   * (@SCN-LNT-027). THERE IS NO EXCEPTION: no row can excuse a skip (3F-3252), because a command
   * that examines nothing still runs and still ends, so a skip never means that and a declaration
   * saying it did could only be read for whether it was named.
   *
   * THE SAME FAIL-SAFE, IN THE SAME TWO PLACES. `postingOf` takes `broken` on the FLAG before
   * `scnId` is consulted, so a broken credit is never citation-routed; `staticCheckObservationFor`
   * excludes it from the obligation match, so it can neither discharge nor fail the obligation it
   * cites. Both hold WHATEVER the observation structurally carries — and it does carry its `scnId`
   * and `checkTag`, exactly as cucumber's broken observation carries the `@SCN` its scenario cited.
   *
   * `exists` AND `enforcedOverRealSource` READ `false` ON ONE, AND THAT IS NOT A NEGATIVE CLAIM
   * DRESSED UP. Both are OBSERVED facts on the converted route — the scenario appearing in the
   * report says the check ran, over the target's own tree — and neither was observed here. So the
   * honest values are the ones that assert nothing, and they are also the ones that keep the
   * roll-up right: a check that did not run is not a running static check.
   */
  broken?: true;
  /**
   * WHAT the report said, and why that is not a credit — the WHAT-BROKE half of a `broken`
   * observation's payload, in the voice its cucumber twin already uses (`ambiguousMessage`): it
   * names the subject, states the diagnosis, and prescribes NO cure.
   *
   * IT IS THE WHOLE OF THE REPORT'S ANSWER, so it is written as one. The broken item carries no
   * `evidenceObservation` — a proof that never ran is not an observed piece of evidence — so this
   * sentence is all a reader gets under `## Run integrity`. Present on a `broken` observation;
   * absent on an ordinary one.
   */
  message?: string;
  /**
   * WHERE the reader is sent — the report's own feature `uri` for the scenario that did not run,
   * the where-to-fix half beside `message`.
   *
   * A DISCOVERED static check has no locator and says so (`qualityCheckReconciliation` states it):
   * it is read from a config, not from a file that ran. A CONVERTED one is a scenario in a corpus,
   * so the corpus is a real place to send a reader, and the renderer already prints it.
   */
  locator?: string;
}

/**
 * One observed MEASUREMENT — the evidence of a MEASURED fitness check (@SCN-CIP-003), emitted by
 * the timing wrapper that ran the suite rather than read from a config or a result file.
 *
 * A THIRD MEMBER RATHER THAN A FLAG ON ITS SIBLING, and the reason is what the sibling MEANS.
 * `GuardEvidenceObservation` is one observed STATIC-check fact, read from the CI config and the
 * manifest; its two facts are `exists` and `enforcedOverRealSource`. A measurement has neither —
 * nothing looked at a manifest, nothing looked at a workflow — so reusing that interface would
 * mean setting two fields `true` to satisfy a type, asserting facts nobody observed. That is
 * fabricated evidence, in the tool built to refuse it. (`broken` took the opposite trade-off for a
 * reason that does not hold here: it rides a runtime observation whose other fields are all
 * genuinely present.)
 *
 * IT ARRIVES ALREADY CITING, which is why `scnId` and `checkTag` are REQUIRED here and optional on
 * the static twin. A static check's run is a script handle, and its `@SCN` has to be resolved for
 * it over two hops — a resolution that can reach nothing. A measurement has no handle: the thing
 * that measures a suite is the wrapper around the step, and canon puts the check-to-scenario
 * mapping in that runner. A row that cites nothing is therefore not an uncited credit but an
 * unreadable row, and the reader drops it.
 *
 * BOTH TERMS, NOT THE `@SCN` ALONE (@SCN-LNT-012). The `@SCN` says which ROW the credit posts to;
 * the `checkTag` says which of that row's obligations it ANSWERS. A stepless scenario may carry
 * more than one measured check, so two measurements can honestly cite one scenario.
 */
export interface MeasuredEvidenceObservation {
  /** A measured fitness check rides the `lint` quality-check, as every fitness check does. */
  qualityCheck: "lint";
  /** The `@SCN` this measurement CITES — the row it posts to. */
  scnId: string;
  /** The BARE CHECK TAG this measurement IS (`ci-run-time`) — which obligation it answers. */
  checkTag: string;
  /** The measurement itself, in the check's own unit. Held against the obligation's `threshold`. */
  measured: number;
}

/**
 * The FITNESS observations — the `lint` quality-check's half of the union, in its two shapes.
 *
 * Named because `qualityCheck === "lint"` no longer narrows to one interface, and a reader that
 * needs "a fitness credit, either kind" should say so rather than re-spell the union.
 */
export type FitnessEvidenceObservation = GuardEvidenceObservation | MeasuredEvidenceObservation;

/**
 * Is this observation a MEASUREMENT? The sub-discriminator among the `lint` quality-check's two
 * shapes.
 *
 * Keyed on `measured` rather than on a kind field, because the field IS the difference: a static
 * observation carries facts about the tree, a measured one carries a number. Adding a tag field
 * would put the same distinction in two places, free to disagree.
 */
export function isMeasuredObservation(
  observation: EvidenceObservation
): observation is MeasuredEvidenceObservation {
  return observation.qualityCheck === "lint" && "measured" in observation;
}

/**
 * Is this observation a STATIC-CHECK fact? The complement of `isMeasuredObservation` within the
 * `lint` quality-check, and the predicate every reader that wants a static check's OWN fields — its
 * runnable
 * handle, its `exists`, its `enforcedOverRealSource` — should ask.
 *
 * It exists so those readers state which of the two they mean instead of inheriting an answer from
 * `qualityCheck === "lint"`, which stopped being a single interface when the measured member joined
 * (@SCN-CIP-003).
 */
export function isStaticCheckObservation(
  observation: EvidenceObservation
): observation is GuardEvidenceObservation {
  return observation.qualityCheck === "lint" && !("measured" in observation);
}

/**
 * One observed evidence fact — a DISCRIMINATED UNION on `qualityCheck === "lint"`:
 * a runtime test result (keyed by scnId + its runtime quality-check), a
 * static-check evidenceObservation (`qualityCheck: "lint"`, keyed by `staticCheck`), or a
 * MEASUREMENT (`qualityCheck: "lint"`, carrying a number — @SCN-CIP-003). The
 * reconciler matches each evidence obligation against evidence observations of the
 * same quality-check.
 *
 * `qualityCheck === "lint"` now narrows to `FitnessEvidenceObservation`, not to
 * `GuardEvidenceObservation` alone; `isMeasuredObservation` tells the two apart. That widening is
 * deliberately type-forced: every site that reads a static observation's own fields off a
 * lint-narrowed value had to state which of the two it meant, rather than inherit an answer.
 */
export type EvidenceObservation =
  | RuntimeEvidenceObservation
  | GuardEvidenceObservation
  | MeasuredEvidenceObservation;

/**
 * A PENDING ITEM — the one-sided ledger entry a deliberately-DEFERRED evidence
 * obligation raises. A `<quality-check>pending` tag (evidence-manifesto §11B) records
 * an obligation owed but deferred to a later slice; on the ledger it is NOT a Reconciling
 * Item — nothing is reconciled (no observation is sought, none is matched), so it never
 * becomes a `QualityCheckReconciliation` and never enters `evidenceObligations` /
 * `reconcilingItems`. It records only WHICH quality-check is owed-but-deferred: an IOU on
 * the report, verdict-neutral and run-neutral. One Pending Item per `<qc>pending`
 * obligation the scenario carries.
 *
 * `qualityCheck` is OPTIONAL (@SCN-PND-022) — `undefined` = SCENARIO-SCOPE: the whole
 * scenario is deferred (a bare `@wip` raising no obligations) and owes NO specific
 * check. An obligation-scope Pending Item (a `<qc>pending` tag) names its owed
 * `qualityCheck`; a scenario-scope one names none. Kept ONE `PendingItem` type — the
 * `undefined` `qualityCheck` is the scenario-scope discriminator, not a parallel flag.
 */
export interface PendingItem {
  /** The flat quality-check this deferred obligation is owed at; ABSENT for a scenario-scope Pending Item. */
  qualityCheck?: QualityCheck;
}
