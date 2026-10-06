@RMD
Feature: The reconciliation is one whole-document report model, serialised to spec-reconciliation.json

  Slice 1 of "[spec-controller] Outputs & vocabulary — one model, two renderings".
  There is no report model
  today: model.ts's Ledger is only the balance; provenance / corpus / evidence observation /
  guards are assembled in cli.ts main() and threaded to BOTH renderers, which
  diverge into two dialects of one document.

  This feature builds the ONE whole-document report model — the ordered sections of
  the document as data (runProvenance → summary → evidenceObligations →
  staticChecks → evidenceReconciliation → evidenceObservations) — and serialises the
  JSON glue-free FROM it (render/json.ts collapses to JSON.stringify(assembleReport)).
  (There is no `warnings` key — a zero-evidence scenario is a
  both-missing row in evidenceReconciliation, not a separate axis.)
  The machine file is renamed ledger.json → spec-reconciliation.json (it is the machine
  form of the WHOLE document, parity with spec-reconciliation.md). The markdown renderer
  is UNTOUCHED and stays byte-identical — the JSON-key renames (the manifesto-vocabulary
  revert) live in the ASSEMBLER, not in markdown.ts / evidence observation.ts internals.

  Rule: the reconciliation publishes as one glue-free whole-document report model

    The foundation. A single Report model + assembleReport(...)
    is built from the existing reconcile pieces, and render/json.ts serialises it
    glue-free (JSON.stringify(assembleReport(...))) — no per-key hand-assembly. The
    published machine artefact is spec-reconciliation.json. The report opens with
    runProvenance (the run facts), then a materialised summary (the totals the markdown's
    trial-balance table derives), then the evidence obligations, then the
    remaining sections. The retired `warnings` key is absent — a zero-evidence
    scenario is a both-missing row in evidenceReconciliation, not a separate axis. The @unit arm proves assembleReport + the glue-free
    serialisation in isolation.

    And its summary totals count EVERY Scenario Reconciliation. The Evidence
    Reconciliation is all Scenario Reconciliations assembled, and the summary is its
    totals (the maintainers' private notes). Three row kinds — real, phantom,
    suspense — and phantom / suspense reconciliations are ALWAYS out-of-balance, so they
    count into the total and into out-of-balance; `phantom` / `suspense` survive as
    sub-counts, a BREAKDOWN of the total rather than a bucket outside it (real =
    total − phantom − suspense). Tallying real rows only is what let isBalanced —
    which correctly walks the suspense row → exit 1 — disagree with a tally reading 0
    out-of-balance, so a failing run rendered a headline that read as a pass. The tally
    now fails on its own and AGREES with the exit code.

    @unit @SCN-RMD-001
    Scenario: the reconciliation publishes as spec-reconciliation.json, one glue-free serialisation of a single whole-document report model whose summary totals count every Scenario Reconciliation

  Rule: the ledger is the detail beside the summary's totals

    The document IS the Evidence Reconciliation, so a root
    key named `evidenceReconciliation` is the layer naming itself inside itself — and the grid
    it names is, by canon, the LEDGER. Root then reads as chain step 6 literally: "The summary
    has the totals and the ledger the detail."

    The key is not `scenarios` — a phantom / suspense is not a scenario — and it is `ledger`.

    Code identifiers and JSON keys are ONE vocabulary (manifesto line 3), so the model's
    `interface Ledger { scenarioReconciliations }` and the JSON `"ledger": { "scenarioReconciliations":
    [...] }` agree as objects — a Ledger that holds entries cannot serialise as a bare array
    of rows.

    @unit @SCN-RMD-002
    Scenario: the ledger serialises under the top-level key ledger, beside summary, carrying each account's posted entries

  Rule: the runtime evidence-observation counting folds onto the Ledger, no evidenceObservations section

    Retire the runtime evidence-observation CENSUS. The counting is now a
    FOLD the Ledger owns (runtimeObservationTally): the raw per-quality-check totals re-home onto
    summary.rawByRuntimeQualityCheck (a materialised headline), and the persisted JSON carries NO
    evidenceObservations section. The per-(scnId, quality-check) attributed[] did NOT re-home — it
    re-represented the posted credits the Ledger already carries (retire, don't relocate); the
    phantom credit surfaces on its phantom-scenario row and the uncited credits on the
    suspense-scenario row, each with its file locator, so every credit is visible ON THE LEDGER. The
    markdown stays byte-identical (both the Test volume cut and the identity line read the re-homed
    summary folds). The balancing identity Σ rawByRuntimeQualityCheck = attributed +
    cites-unknown-scenario + cites-no-scenario holds by construction on the persisted file. The unit arm proves the assembler in isolation.

    @unit @SCN-RMD-003
    Scenario: the runtime-observation totals re-home onto summary and the balancing identity holds on the persisted file

  Rule: the static-check census is summary counts, no standalone section

    The static-axis manifesto landing on the JSON surface. The static-check census is
    summary.staticChecks COUNTS alone — a pure counter over the guard observations
    (countStaticEvidenceObservationKinds), symmetric with the runtime testVolume counter. The
    standalone member-list section (was guards, then staticChecks) COLLAPSED: the guard member
    detail lives in the rows now (cited → the fitness scenario's own row; no-evidence-obligation → the
    suspense row's cites-no-scenario credit items), so there is no double-report on the JSON
    surface. The counts runningStaticCheckCount and uncitedStaticCheckCount are carried on the
    persisted summary; the named count is implicit, running − uncited. A pure
    derive over the model, proven in isolation by Vitest.

    @unit @SCN-RMD-004
    Scenario: the static-check census is summary counts with no standalone section

  Rule: the summary materialises the three report totals a JSON consumer reads

    Completing "the whole document as one report model" (operator
    ruling 2026-07-02 — MATERIALISE). Slice 1 (RMD-001) materialised most of the
    document, but three printed numbers were still renderer arithmetic, not model data: the
    Test-volume totals, the Static-check totals, and the fitness tally. This scenario materialises
    all three into report.summary so a JSON consumer reads them (slice 2 later reads rather than
    computes them, byte-identical). The test-volume identity line is a reconciliation fact (a
    balance check, Σ = Σ) that belongs in the model, not asserted by the renderer:

      Test volume — Σ rawByRuntimeQualityCheck = onScenario + onPhantomScenario + onSuspenseScenario.

    The static-check census carries runningStaticCheckCount and uncitedStaticCheckCount; the
    named count is implicit, running − uncited, and the completeness invariant is
    asserted inside the counter rather than on the surface. The fitness tally is the fitness-only
    evidence obligation cut (satisfied of total), under summary.fitness — summary.byOutcome is
    kind-agnostic and cannot provide the fitness-only total, so it is materialised explicitly. HELD (slice 5): the
    evidence obligation outcome field is untouched. Markdown is not migrated here (slice 2) and stays
    byte-identical. The @unit arm proves buildSummary / assembleReport in isolation.

    @unit @SCN-RMD-005
    Scenario: the summary materialises the test-volume, static-check, and fitness totals with the test-volume balance identity and the static-check shape holding on the persisted file

  Rule: the report model carries the feature titles, published on the JSON and sourced by the markdown

    The by-feature cut names each feature in full ("slug (FFF)") via the feature titles
    materialised onto the report model. They sit under a small
    top-level `metadata` object (report.metadata.featureNames) — presentation *metadata* (names),
    cleanly separated from the reconciliation records (summary / evidenceReconciliation /
    evidenceObservations / staticChecks), before the public contract freezes. assembleReport takes
    the code→slug source and stores it under metadata.featureNames as a plain object (only when
    non-empty; the metadata object is the LAST document key), the published JSON GAINS the titles
    nested there (the deliberate JSON-shape change that enables round-trip), and renderReport reads
    them off metadata.featureNames — needing no external map. The markdown stays byte-identical
    (same slugs, now model-sourced). Its unit arm proves assembleReport carries the titles under
    metadata, the glue-free JSON serialises them there, and the model-sourced by-feature cut names
    features in full byte-identically to the map-threaded render, and the CLI publishes the titles
    it reads off the feature files under metadata in spec-reconciliation.json, keyed by feature code.

    @unit @SCN-RMD-006
    Scenario: the published spec-reconciliation.json carries the feature titles under metadata, keyed by feature code

  Rule: the markdown regenerates from a saved spec-reconciliation.json alone

    The load-bearing proof that the JSON IS the model. A seam reads a banked spec-reconciliation.json,
    JSON.parses it back into a Report, and renders the human markdown via renderReport — no
    RunContext, no live inputs, the JSON alone: the exported renderReportFromJson(json) + the CLI
    "--render-from-json <path>" mode (reads the file, prints the regenerated markdown to stdout,
    exits before any reconcile, on the code the saved verdict names). Drift-equality is the acceptance: the markdown regenerated from
    the saved JSON EQUALS the markdown rendered directly from the same run — the by-feature titles
    included (why the feature-title model-completion is the enabling dependency).
    Its unit arm proves the parse→renderReport drift-equality over a corpus spanning the whole
    document (the three-way test-volume line, the materialised summary totals, and a coded
    out-of-balance feature, so the by-feature title path has teeth), and the CLI, run over a
    fixture whose by-feature cut names a coded feature, reconciles, saves the JSON, and regenerates
    from it the markdown it rendered directly, exiting the code the saved run exited.

    @unit @SCN-RMD-007
    Scenario: the markdown regenerates from a saved spec-reconciliation.json byte-identical to the direct render, and exits the code its saved verdict names

  Rule: each evidence sub-row is keyed by one flat quality-check coordinate

    Slice 1 of "[spec-controller] Reconciliation model — bidirectional reconciling items".
    The (kind, level) two-axis evidence coordinate collapses to ONE flat quality-check ∈
    {fitness, unit, integration, e2e, performance}: fitness is one quality-check value, not a
    second axis. So the JSON evidenceReconciliation[].qualityCheckReconciliations[] / reconcilingItems[] sub-row
    was { kind, level, outcome } (runtime) / { kind, guard, outcome } (static); it becomes
    { qualityCheck, outcome } (runtime) / { qualityCheck: "fitness", staticCheck, outcome } (fitness),
    and the summary's missing split is renamed to missingByQualityCheck
    (same { subject, count } values, keyed by the flat quality-check). Kind / Level retire; the
    two reconcile functions merge on the == fitness watermelon discriminator. Canon names
    the quality check fitness, and lint is a rejected alias (double-entry-manifesto, Quality Check). The markdown surface
    stays byte-identical (the renderer already labels each item by its tag word, which IS the
    quality-check value), so the round-trip still holds. HELD (slice 2):
    the outcome VALUES; (slice 4): the interim container terms (EvidenceReconciliation, trial balance).
    The @unit arm proves the reconcile → assemble shape in isolation.

    @unit @SCN-RMD-008
    Scenario: each reconciled evidence sub-row carries a single quality-check coordinate, not a (kind, level) grid

  Rule: a row reads its evidence in one order, whatever order the runner reported it in

    A runner decides the order its report lists files in, and vitest's changes between two runs
    over one unchanged tree. The ledger kept that order, so a row's posted credits moved,
    and so did the credit a reconciliation names — the first FAILED credit in evidence order, or,
    where none failed, the first. The books now read the evidence in an order the evidence itself
    fixes: quality check in tier order with fitness last, then location, then the scenario cited,
    then everything else the credit says. The report is then a function of what was observed,
    never of the order it arrived in.

    @unit @SCN-RMD-009
    Scenario: two runs whose runner listed its files in different orders write the same report, each row's evidence in quality-check order then by location
