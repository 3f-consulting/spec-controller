@RMD
Feature: The reconciliation is one whole-document report model, serialised to spec-reconciliation.json

  The reconciliation is ONE whole-document report model — the ordered sections of the
  document as data — and the machine file is that model serialised glue-free:
  the JSON file is the assembled model handed straight to the serialiser, with no per-key hand-assembly.
  Its top-level keys, in document order, are runProvenance, summary and ledger, then
  scenarioCodeErrors, scenarioCodePopulation, evidenceObligations and metadata. There is no
  `warnings` key: a zero-evidence scenario is a both-missing row on the ledger, not a separate
  axis. The machine file is spec-reconciliation.json, the machine form of the WHOLE document
  beside spec-reconciliation.md, and the markdown renderer reads the same assembled model, so
  the JSON key names live in the assembler and nowhere else.

  Rule: the reconciliation publishes as one glue-free whole-document report model

    The foundation. One report model, assembled from the reconciliation and the facts of the
    run, is serialised glue-free as spec-reconciliation.json. The report opens with
    runProvenance (the run facts), then the materialised summary (the totals the markdown's
    trial-balance table shows), then the ledger, then the remaining sections. There is no
    `warnings` key: a zero-evidence scenario is a both-missing row on the ledger. Its unit tests
    hold the assembly and the glue-free serialisation in isolation.

    And its summary totals count EVERY Scenario Reconciliation. The Evidence
    Reconciliation is all Scenario Reconciliations assembled, and the summary is its
    totals (the maintainers' private notes). Three row kinds — real, phantom,
    suspense — and phantom / suspense reconciliations are ALWAYS out-of-balance, so they
    count into the total and into out-of-balance; `phantom` / `suspense` survive as
    sub-counts, a BREAKDOWN of the total rather than a bucket outside it (real =
    total − phantom − suspense). Tallying real rows only would let a run whose suspense row is
    out of balance, and so exits 1, show a tally reading 0 out-of-balance: a headline that reads
    as a pass. Counting every row keeps the tally and the exit code in agreement.

    @unit @SCN-RMD-001
    Scenario: the reconciliation publishes as spec-reconciliation.json, one glue-free serialisation of a single whole-document report model whose summary totals count every Scenario Reconciliation

  Rule: the ledger is the detail beside the summary's totals

    The document IS the Evidence Reconciliation, so a root
    key named for the Evidence Reconciliation would be the layer naming itself inside itself — and the grid
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

    The runtime evidence-observation counting is a FOLD the Ledger owns.
    The raw per-quality-check totals are materialised on summary.rawByRuntimeQualityCheck, and
    the persisted JSON carries NO separate evidence-observations section: every credit is
    already posted on the ledger, a phantom credit on its phantom-scenario row and an uncited one
    on the suspense-scenario row, each with its file locator. The markdown's Test volume cut and
    its identity line read the same summary folds. The balancing identity Σ
    rawByRuntimeQualityCheck = attributed + cites-unknown-scenario + cites-no-scenario holds by
    construction on the persisted file. Its unit tests hold the assembled totals in isolation.

    @unit @SCN-RMD-003
    Scenario: the runtime-observation totals re-home onto summary and the balancing identity holds on the persisted file

  Rule: the fitness-function census is summary counts, no standalone section

    The fitness-function-axis manifesto on the JSON surface. The fitness-function census is
    summary.fitnessFunctions COUNTS alone — a pure counter over the fitness observations, symmetric
    with the runtime testVolume counter. There is no standalone member-list section, because
    each check's detail lives on the rows: a cited check on its fitness scenario's own row, an
    uncited one as a cites-no-scenario credit on the suspense row, so nothing is reported twice.
    The persisted summary carries runningFitnessFunctionCount and uncitedFitnessFunctionCount; the cited
    count is implicit, running − uncited. A pure derive over the model, held in isolation by
    Vitest.

    @unit @SCN-RMD-004
    Scenario: the fitness-function census is summary counts with no standalone section

  Rule: the summary materialises the three report totals a JSON consumer reads

    The whole document is one report model, so the numbers the markdown prints are model data,
    not renderer arithmetic. The Test-volume totals, the fitness-function totals and the fitness
    tally are materialised on report.summary, where a JSON consumer reads them and the markdown
    reads them too. The test-volume identity line is a reconciliation fact (a balance check,
    Σ = Σ) that belongs in the model, not asserted by the renderer:

      Test volume — Σ rawByRuntimeQualityCheck = onScenario + onPhantomScenario + onSuspenseScenario.

    The fitness-function census carries runningFitnessFunctionCount and uncitedFitnessFunctionCount; the
    cited count is implicit, running − uncited. The fitness tally is the fitness-only evidence
    obligation cut (satisfied of total), under summary.fitness: the outcome breakdown under
    summary.evidenceObligations is kind-agnostic and cannot give the fitness-only total, so it is
    materialised explicitly. Its unit tests hold the summary's folds and the assembled summary
    in isolation.

    @unit @SCN-RMD-005
    Scenario: the summary materialises the test-volume, fitness-function, and fitness totals with the test-volume balance identity and the fitness-function shape holding on the persisted file

  Rule: the report model carries the feature titles, published on the JSON and sourced by the markdown

    The by-feature cut names each feature in full ("slug (FFF)") from the feature titles carried
    on the report model. They sit under a small top-level `metadata` object
    (report.metadata.featureNames) — presentation *metadata* (names), kept apart from the
    reconciliation records (summary and ledger). The assembly takes the code→slug source
    and stores it under metadata.featureNames as a plain object, only when it is non-empty, and
    metadata is the LAST document key. The published JSON carries the titles there, which is what
    lets it round-trip, and the markdown renderer reads them off metadata.featureNames with no
    external map. Its unit tests hold that the assembly carries the titles under metadata, that the
    glue-free JSON serialises them there, and that the model-sourced by-feature cut names features
    in full; and the CLI publishes the titles it reads off the feature files under metadata in
    spec-reconciliation.json, keyed by feature code.

    @unit @SCN-RMD-006
    Scenario: the published spec-reconciliation.json carries the feature titles under metadata, keyed by feature code

  Rule: the markdown regenerates from a saved spec-reconciliation.json alone

    The load-bearing proof that the JSON IS the model. A seam reads a saved
    spec-reconciliation.json, parses it back into the report model, and renders the human markdown
    through the markdown renderer — no run context, no live inputs, the JSON alone: the package's
    exported render-from-JSON function, and the CLI's "--render-from-json <path>" mode, which reads the
    file, prints the regenerated markdown to stdout, and exits before any reconcile, on the code
    the saved verdict names. Drift-equality is the acceptance: the markdown regenerated from the
    saved JSON EQUALS the markdown rendered directly from the same run, the by-feature titles
    included. Its unit tests hold the parse→render drift-equality over a corpus spanning
    the whole document (the three-way test-volume line, the materialised summary totals, and a coded
    out-of-balance feature, so the by-feature title path has teeth), and the CLI, run over a
    fixture whose by-feature cut names a coded feature, reconciles, saves the JSON, and regenerates
    from it the markdown it rendered directly, exiting the code the saved run exited.

    @unit @SCN-RMD-007
    Scenario: the markdown regenerates from a saved spec-reconciliation.json byte-identical to the direct render, and exits the code its saved verdict names

  Rule: each evidence sub-row is keyed by one flat quality-check coordinate

    The evidence coordinate is ONE flat quality-check ∈ {fitness, unit, integration, e2e,
    performance}: fitness is one quality-check value, not a second axis. So each sub-row of
    ledger.scenarioReconciliations[].qualityCheckReconciliations[] and reconcilingItems[] is keyed
    by qualityCheck alone, and the summary's missing split, missingByQualityCheck under
    summary.evidenceObligations, is keyed by the same flat quality-check. One reconcile function
    serves every quality check, and the fitness value is what tells a watermelon apart. Canon
    names the quality check fitness, and lint is a rejected alias (double-entry-manifesto,
    Quality Check). The markdown labels each item by its tag word, which IS the quality-check
    value, so the round-trip holds. Its unit tests hold the reconcile → assemble shape in
    isolation.

    @unit @SCN-RMD-008
    Scenario: each reconciled evidence sub-row carries a single quality-check coordinate, not a (kind, level) grid

  Rule: a row reads its evidence in one order, whatever order the runner reported it in

    A runner decides the order its report lists files in, and vitest's changes between two runs
    over one unchanged tree. So the books read the evidence in an order the evidence itself
    fixes: quality check in tier order with fitness last, then location, then the scenario cited,
    then everything else the credit says. A row's posted credits, and the credit a reconciliation
    names (the first FAILED credit in evidence order or, where none failed, the first), are then
    a function of what was observed, never of the order it arrived in.

    @unit @SCN-RMD-009
    Scenario: two runs whose runner listed its files in different orders write the same report, each row's evidence in quality-check order then by location
