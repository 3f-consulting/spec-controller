@RMD
Feature: The reconciliation is one whole-document report model, serialised to spec-reconciliation.json

  Slice 1 of "[spec-controller] Outputs & vocabulary — one model, two renderings".
  There is no report model
  today: model.ts's Ledger is only the balance; provenance / corpus / evidence observation /
  guards are assembled in cli.ts main() and threaded to BOTH renderers, which
  diverge into two dialects of one document.

  This feature builds the ONE whole-document report model — the ordered sections of
  the document as data (runProvenance → summary → evidenceObligations →
  staticGuards → evidenceReconciliation → evidenceObservations) — and serialises the
  JSON glue-free FROM it (render/json.ts collapses to JSON.stringify(assembleReport)).
  (The `warnings` key was RETIRED entirely — a zero-evidence scenario is a
  both-missing row in evidenceReconciliation, not a separate axis.)
  The machine file is renamed ledger.json → spec-reconciliation.json (it is the machine
  form of the WHOLE document, parity with spec-reconciliation.md). The markdown renderer
  is UNTOUCHED and stays byte-identical — the JSON-key renames (the manifesto-vocabulary
  revert) live in the ASSEMBLER, not in markdown.ts / evidence observation.ts internals.

  Rule: the reconciliation publishes as one glue-free whole-document report model

    The foundation (@SCN-RMD-001). A single Report model + assembleReport(...)
    is built from the existing reconcile pieces, and render/json.ts serialises it
    glue-free (JSON.stringify(assembleReport(...))) — no per-key hand-assembly. The
    published machine artefact is spec-reconciliation.json. The report opens with
    runProvenance (the run facts), then a materialised summary (the totals the markdown's
    trial-balance table derives), then the declared evidence obligations, then the
    remaining sections. The retired `warnings` key is absent — a zero-evidence
    scenario is a both-missing row in evidenceReconciliation, not a separate axis. The @integration
    arm drives the REAL kept-run scaffold — which names
    the artefact via the renamed RECONCILIATION_JSON constant — and reads the persisted
    spec-reconciliation.json back, so a run still writing ledger.json (or a JSON missing
    the assembled sections) REDS. The @unit arm proves assembleReport + the glue-free
    serialisation in isolation.

    And its summary totals count EVERY Scenario Reconciliation (3F-1724). The Evidence
    Reconciliation is all Scenario Reconciliations assembled, and the summary is its
    totals (the maintainers' private notes). Three row kinds — declared, phantom,
    suspense — and phantom / suspense reconciliations are ALWAYS out-of-balance, so they
    count into the total and into out-of-balance; `phantom` / `suspense` survive as
    sub-counts, a BREAKDOWN of the total rather than a bucket outside it (declared =
    total − phantom − suspense). Tallying declared rows only is what let isBalanced —
    which correctly walks the suspense row → exit 1 — disagree with a tally reading 0
    out-of-balance, so a failing run rendered a headline that read as a pass. The tally
    now fails on its own and AGREES with the exit code.

    @unit @integration @SCN-RMD-001
    Scenario: the reconciliation publishes as spec-reconciliation.json, one glue-free serialisation of a single whole-document report model whose summary totals count every Scenario Reconciliation
      Given a kept run over a target corpus under an injected store root
      When the kept run persists its machine artefact
      Then the persisted artefact is named spec-reconciliation.json
      And it parses to one object carrying runProvenance, summary, and evidenceObligations as top-level sections in document order
      And its summary totals count every Scenario Reconciliation, so the tally reads out-of-balance and agrees with the run's exit code

  Rule: the ledger is the detail beside the summary's totals

    The 3F-1138 error ONE LAYER DOWN. The document IS the Evidence Reconciliation, so a root
    key named `evidenceReconciliation` is the layer naming itself inside itself — and the grid
    it names is, by canon, the LEDGER. Root then reads as chain step 6 literally: "The summary
    has the totals and the ledger the detail."

    Supersedes this scenario's own earlier framing. @SCN-RMD-002 was the 3F-1138 revert ("the
    per-scenario reconciliation is the trial balance, not the ledger") and asserted the key
    `evidenceReconciliation`, not `scenarios`. The "not scenarios" half HOLDS and is kept
    verbatim — a phantom / suspense is not a scenario. The key itself is corrected to `ledger`:
    an Update to canon, not a break routed around.

    Code identifiers and JSON keys are ONE vocabulary (manifesto line 3), so the model's
    `interface Ledger { scenarioReconciliations }` and the JSON `"ledger": { "scenarioReconciliations":
    [...] }` agree as objects — a Ledger that holds entries cannot serialise as a bare array
    of rows.

    @unit @SCN-RMD-002
    Scenario: the ledger serialises under the top-level key ledger, beside summary, carrying each account's posted entries
      Given a reconciliation whose accounts carry posted entries and their quality check reconciliations
      When the report is serialised to JSON
      Then the grid of Scenario Reconciliations is carried under the top-level key ledger, beside summary — never under evidenceReconciliation, and never scenarios
      And each account carries its posted evidence obligations and evidence observations alongside its reconciling items
      And each quality check reconciliation keeps its outcome field with the reconciliation-outcome literals unchanged

  Rule: the runtime evidence-observation counting folds onto the Ledger, no evidenceObservations section

    Retire the runtime evidence-observation CENSUS (@SCN-RMD-003, 3F-2103). The counting is now a
    FOLD the Ledger owns (runtimeObservationTally): the raw per-quality-check totals re-home onto
    summary.rawByRuntimeQualityCheck (a materialised headline), and the persisted JSON carries NO
    evidenceObservations section. The per-(scnId, quality-check) attributed[] did NOT re-home — it
    re-represented the posted credits the Ledger already carries (retire, don't relocate); the
    phantom credit surfaces on its phantom-scenario row and the uncited credits on the
    suspense-scenario row, each with its file locator, so every credit is visible ON THE LEDGER. The
    markdown stays byte-identical (both the Test volume cut and the identity line read the re-homed
    summary folds). The balancing identity Σ rawByRuntimeQualityCheck = attributed +
    cites-unknown-scenario + cites-no-scenario holds by construction on the persisted file. The unit
    arm proves the assembler in isolation; the integration arm drives the REAL file-read pipeline
    over a fixture spanning attributed, phantom-id, and cites-no-scenario evidence observations.

    @unit @integration @SCN-RMD-003
    Scenario: the runtime-observation totals re-home onto summary and the balancing identity holds on the persisted file
      Given a reconciliation run whose observed evidence spans attributed, phantom-id, and cites-no-scenario evidence observations
      When the run persists spec-reconciliation.json
      Then the phantom and suspense credits surface on their ledger rows and there is no evidenceObservations section
      And the sum of summary rawByRuntimeQualityCheck equals the attributed total plus the cites-unknown-scenario and cites-no-scenario counts

  Rule: the static-guard census is summary counts, no standalone section

    The static-axis manifesto landing on the JSON surface (@SCN-RMD-004). The static-guard census is
    summary.staticGuards COUNTS alone — a pure counter over the guard observations
    (countStaticEvidenceObservationKinds), symmetric with the runtime testVolume counter. The
    standalone member-list section (was guards, then staticGuards) COLLAPSED: the guard member
    detail lives in the rows now (named → each scenario's @lint sub-row; undemanded → the
    suspense row's cites-no-scenario credit items), so there is no double-report on the JSON
    surface. The counts runningStaticCheckCount and uncitedStaticCheckCount are carried on the
    persisted summary; the named count is implicit, running − uncited. A pure
    derive over the model, proven in isolation by Vitest.

    @unit @SCN-RMD-004
    Scenario: the static-guard census is summary counts with no standalone section
      Given a reconciliation run whose derived running-guard set includes a guard no @lint scenario declares
      When the report is serialised to JSON
      Then the static-guard census carries no standalone staticGuards (or guards) section
      And the static-guard counts are carried under summary.staticGuards as runningStaticCheckCount and uncitedStaticCheckCount

  Rule: the summary materialises the three report totals a JSON consumer reads

    Completing "the whole document as one report model" (@SCN-RMD-005;
    operator ruling 2026-07-02 — MATERIALISE). Slice 1 (RMD-001) materialised most of the
    document, but three printed numbers were still renderer arithmetic, not model data: the
    Test-volume totals, the Static-guard totals, and the Lint tally. This scenario materialises
    all three into report.summary so a JSON consumer reads them (slice 2 later reads rather than
    computes them, byte-identical). The test-volume identity line is a reconciliation fact (a
    balance check, Σ = Σ) that belongs in the model, not asserted by the renderer:

      Test volume — Σ rawByRuntimeQualityCheck = onScenario + onPhantomScenario + onSuspenseScenario.

    The static-guard census carries runningStaticCheckCount and uncitedStaticCheckCount; the
    named count is implicit, running − uncited, and the completeness invariant is
    asserted inside the counter rather than on the surface. The Lint tally is the static-only
    evidence obligation cut (satisfied of total) — summary.byOutcome is kind-agnostic and cannot
    provide the static-only lint total, so it is materialised explicitly. HELD (slice 5): the
    evidence obligation outcome field is untouched. Markdown is not migrated here (slice 2) and stays
    byte-identical. The @unit arm proves buildSummary / assembleReport in isolation; the @integration
    arm drives the REAL CLI over a fixture spanning attributed / phantom evidence observation /
    cites-no-scenario evidence observations AND a CI guard no @lint declares, then reads the persisted
    spec-reconciliation.json and proves the test-volume Σ = Σ identity plus the static-guard shape on
    the file.

    @unit @integration @SCN-RMD-005
    Scenario: the summary materialises the test-volume, static-guard, and lint totals with the test-volume balance identity and the static-guard shape holding on the persisted file
      Given a reconciliation run whose evidence spans attributed, phantom-id, and cites-no-scenario evidence observations and whose CI runs a guard no @lint declares
      When the reconciliation run persists spec-reconciliation.json
      Then the summary carries the test-volume totals, the static-guard totals, and the lint tally
      And the test-volume identity Σ rawByRuntimeQualityCheck = onScenario + onPhantomScenario + onSuspenseScenario holds on the persisted summary
      And the persisted static-guard summary carries runningStaticCheckCount and uncitedStaticCheckCount with named implicit

  Rule: the report model carries the feature titles, published on the JSON and sourced by the markdown

    The by-feature cut names each feature in full ("slug (FFF)") via the feature titles
    materialised onto the report model. Originally they sat under a top-level
    `featureNames` key, a sibling of the reconciliation records; a later change MOVES them under a small
    top-level `metadata` object (report.metadata.featureNames) — presentation *metadata* (names),
    cleanly separated from the reconciliation records (summary / evidenceReconciliation /
    evidenceObservations / staticGuards), before the public contract freezes. assembleReport takes
    the code→slug source and stores it under metadata.featureNames as a plain object (only when
    non-empty; the metadata object is the LAST document key), the published JSON GAINS the titles
    nested there (the deliberate JSON-shape change that enables round-trip), and renderReport reads
    them off metadata.featureNames — needing no external map. The markdown stays byte-identical
    (same slugs, now model-sourced). Its unit arm proves assembleReport carries the titles under
    metadata, the glue-free JSON serialises them there, and the model-sourced by-feature cut names
    features in full byte-identically to the map-threaded render; the integration arm drives the
    REAL CLI and reads the persisted spec-reconciliation.json carrying the titles under metadata,
    keyed by feature code.

    @unit @integration @SCN-RMD-006
    Scenario: the published spec-reconciliation.json carries the feature titles under metadata, keyed by feature code
      Given a reconciliation over a target corpus whose feature files declare their feature codes
      When the coded-corpus reconciliation run persists its machine artefacts
      Then the persisted spec-reconciliation.json carries the feature titles keyed by feature code
      And the persisted spec-reconciliation.md names each out-of-balance feature in full, sourced from the model

  Rule: the markdown regenerates from a saved spec-reconciliation.json alone

    The load-bearing proof that the JSON IS the model (@SCN-RMD-007). A seam reads a banked spec-reconciliation.json,
    JSON.parses it back into a Report, and renders the human markdown via renderReport — no
    RunContext, no live inputs, the JSON alone: the exported renderReportFromJson(json) + the CLI
    "--render-from-json <path>" mode (reads the file, prints the regenerated markdown to stdout,
    exits before any reconcile). Drift-equality is the acceptance: the markdown regenerated from
    the saved JSON EQUALS the markdown rendered directly from the same run — the by-feature titles
    included (why the feature-title model-completion, @SCN-RMD-006, is the enabling dependency).
    Its unit arm proves the parse→renderReport drift-equality over a corpus spanning the whole
    document (the three-way test-volume line, the materialised summary totals, and a coded
    out-of-balance feature, so the by-feature title path has teeth); its integration arm drives
    the REAL CLI end-to-end over a fixture whose by-feature cut names a coded feature — reconcile,
    persist the JSON, regenerate from it, byte-identical to the direct render.

    @unit @integration @SCN-RMD-007
    Scenario: the markdown regenerates from a saved spec-reconciliation.json byte-identical to the direct render
      Given a reconciliation run persisted as spec-reconciliation.json alongside its direct markdown render
      When the markdown is regenerated from the saved spec-reconciliation.json alone
      Then the regenerated markdown equals the directly rendered markdown
      And the regenerated markdown names the coded out-of-balance feature in full

  Rule: each evidence sub-row is keyed by one flat quality-check coordinate

    Slice 1 of "[spec-controller] Reconciliation model — bidirectional reconciling items".
    The (kind, level) two-axis evidence coordinate collapses to ONE flat quality-check ∈
    {lint, unit, integration, e2e, performance}: @lint is one quality-check value, not a
    second axis. So the JSON evidenceReconciliation[].qualityCheckReconciliations[] / reconcilingItems[] sub-row
    was { kind, level, outcome } (runtime) / { kind, guard, outcome } (static); it becomes
    { qualityCheck, outcome } (runtime) / { qualityCheck: "lint", guard, outcome } (static),
    and the summary's missing split is renamed to missingByQualityCheck
    (same { subject, count } values, keyed by the flat quality-check). Kind / Level retire; the
    two reconcile functions merge on the == lint watermelon discriminator. The markdown surface
    stays byte-identical (the renderer already labels each item by its tag word, which IS the
    quality-check value), so the @SCN-RMD-007 round-trip still holds. HELD (slice 2):
    the outcome VALUES; (slice 4): the interim container terms (EvidenceReconciliation, trial balance).
    The @unit arm proves the reconcile → assemble shape in isolation; the @integration arm drives
    the REAL CLI over a corpus declaring BOTH a runtime and a lint evidence obligation, persists
    spec-reconciliation.json, and asserts the flat coordinate (and the ABSENCE of kind / level)
    on the persisted file.

    @unit @integration @SCN-RMD-008
    Scenario: each reconciled evidence sub-row carries a single quality-check coordinate, not a (kind, level) grid
      Given a reconciliation whose scenarios declare runtime and lint evidence obligations
      When the report is serialised to spec-reconciliation.json
      Then each evidence sub-row is keyed by one quality-check field with no kind or level
      And a lint sub-row carries its quality-check "lint" alongside its guard
      And the summary's missing split is carried under missingByQualityCheck keyed by quality-check
