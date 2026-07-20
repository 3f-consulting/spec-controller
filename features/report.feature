@RPT
Feature: The report renders the ledger as sectioned facts

  Slice 1 of "The report generates itself". The report's FACTS move into the renderer so the
  tool generates them — no hand-authored narrative wrapping the output.

  The foundation this feature lays: run provenance is a sibling RunContext
  ({ target, inputs, runStart, sourceSha }) threaded CLI→renderers, the
  Ledger model staying pure; and src/render/markdown.ts becomes a SECTIONED
  renderer — an ordered list of section-emitters [title, provenance, scenarioTable,
  verdict, warnings] each over (balance, ctx). The existing table / verdict /
  warnings stay byte-green (a Scenario-CRUD Read; the @LDG / @WRN scenarios are the
  regression guard). The only new bytes are the provenance section.

  Facts only — no interpretation, editorial, or cross-run comparison (project
  design §5).

  Rule: the markdown report opens with a run-provenance header

    The headline behaviour (foundation-bearing). The markdown report no
    longer opens straight into the per-scenario table: it opens with a "## Run
    provenance" section stating the target repo, the input paths/flags actually
    used, the run-start timestamp in UTC, the target's source SHA (a null SHA
    rendered as an explicit "unknown (non-git target)"), and the TOOL's own SHA and
    version — which spec-controller produced the run (3F-1916), a null tool SHA
    rendered "unknown (not a git checkout)" with the version still shown. The @integration arm drives
    the REAL CLI pipeline (runReconcile → writeOutputs with a ctx) and asserts the
    PERSISTED spec-reconciliation.md carries the header — the cross-component ctx-threading
    is the critical-path wiring.

    The "Target repo:" fact is sourced from --target VERBATIM — no resolution,
    defaulting to "unknown-target" on omit, parallel to sourceSha's "unknown"
    (Fork A; the facts artefact is self-describing, run.yaml optional in
    CI). The prior basename(dirname(--features)) resolution — and its degenerate "."
    — are gone: the target is now the operator's --target value or the explicit
    default, never a guess. The target-sourcing @integration arm runs the REAL CLI
    binary as a subprocess and reads the persisted "Target repo:" line back, so a CLI
    that guessed the target (or omitted the line) REDS.

    @unit @integration @SCN-RPT-001
    Scenario: the markdown report opens with a Run provenance header whose Target repo is the --target value verbatim, defaulting to unknown-target
      Given a reconciliation run targeting "an-adopters-repository" with the input "--features ../an-adopters-repository/features" at the UTC instant "2026-06-27T08:17:53.000Z" and source SHA "905a987c0ffeeba110000000000000000deadbeef"
      When the run writes its markdown artifact
      Then the persisted spec-reconciliation.md opens with a Run provenance header stating the target, the input, the UTC timestamp, the source SHA, the tool SHA, and the tool version
      When the real CLI writes a markdown report with --target "chosen-target-name"
      Then the persisted report's Run provenance outcomes "Target repo: chosen-target-name" verbatim
      When the real CLI writes a markdown report with no --target flag
      Then the persisted report's Run provenance outcomes "Target repo: unknown-target"

  Rule: the JSON report carries a provenance object

    The machine-readable surface (@SCN-RPT-002). The JSON report grows a
    top-level `provenance` object carrying the same non-derivable run facts as the
    markdown header — target, source SHA, the TOOL's own SHA and version (which
    spec-controller produced the run — 3F-1916), the UTC run timestamp, and the input
    paths/flags actually used — while the reconciliation body (scenarios, warnings)
    is unchanged: the serialised shape becomes { provenance, scenarios, warnings }.
    Provenance is not derivable from the Ledger, so it is persisted on the
    JSON surface (project design §1, §3 — persist a fact on JSON iff it is not
    derivable from the balance; the derived human views stay off JSON). The
    integration arm drives the REAL CLI pipeline (runReconcile → writeOutputs
    with a ctx) and asserts the PERSISTED spec-reconciliation.json parses to an object
    whose provenance round-trips — the machine artifact is a consumed contract
    surface.

    @unit @integration @SCN-RPT-002
    Scenario: the JSON report carries a provenance object stating target, source SHA, tool SHA, tool version, UTC timestamp, and inputs, with the reconciliation body intact
      Given a reconciliation run targeting "an-adopters-repository" with the input "--features ../an-adopters-repository/features" at the UTC instant "2026-06-27T08:17:53.000Z" and source SHA "905a987c0ffeeba110000000000000000deadbeef"
      When the run writes its JSON artifact
      Then the persisted spec-reconciliation.json parses to an object whose runProvenance outcomes the target, source SHA, tool SHA, tool version, UTC timestamp, and input, with the evidenceReconciliation body intact

  Rule: an explicit source SHA wins, and a non-git target resolves to unknown

    The resolution rule (@SCN-RPT-003). The source SHA on the report's
    provenance is resolved by resolveSourceSha (landed in RPT-001): an explicit
    non-empty source SHA — the operator-supplied override flag — wins over any git
    read, so an auditor reconciling a zip export, a detached-HEAD checkout, or a tree
    with no .git can still outcome a complete provenance. When no override is given and
    the target is not a git repository, the git read cannot answer and the source SHA
    resolves to a recorded null ("unknown") rather than crashing the run (project
    design §4). A pure resolution rule, so it is proven in isolation by Vitest — the
    flag→ctx→rendered-header thread is already proven by RPT-001's integration arm, so
    this scenario carries no integration arm of its own (substitution-is-degradation:
    the moved-to layer here, isolation, uniquely proves the override + non-git
    fallback over a controlled non-git temp directory).

    @unit @SCN-RPT-003
    Scenario: an explicit source SHA overrides the git read, and a non-git target with no override resolves to unknown
      Given a target directory that is itself a git repository and an explicit source SHA override
      When the source SHA is resolved
      Then the explicit override is returned verbatim, not the git HEAD of that directory
      And resolving over a non-git target directory with no override returns a recorded unknown

  Rule: the markdown report renders the evidence reconciliation as a subjects-rows table with balanced and out-of-balance columns

    The evidence reconciliation (@SCN-RPT-004; reshaped to subjects-rows,
    superseding the Axis-Count shape). Under "## Summary views", a
    "### Evidence reconciliation" section renders ONE table whose SUBJECTS are rows — Scenario and
    Evidence obligation — each with its own Total, and balanced / out-of-balance as COLUMNS
    (both subjects report into the same binary, so the "Axis"/"Verdict"/"outcome" words
    retire). The Evidence-evidence obligation out-of-balance is decomposed in place into its
    reconciling-item causes: three nested ("↳") rows in canonical order — missing,
    failing, and the watermelon watermelon —
    populating the out-of-balance column only, always shown (a zero cause is itself a fact).
    The missing row carries the bare-level split as its Detail (a runtime
    evidence obligation by its bare level, a static one as "lint" — the label-=-tag lock),
    canonical order (lint first), counting evidence obligations not scenarios. The scenario and
    evidence-obligation out-of-balance counts diverge on purpose — SCN-PST-035's two missing
    arms are why 43 out-of-balance scenarios become 44 out-of-balance evidence obligations — and the
    table presents that as a granularity fact, the nested causes reconciling to the
    evidence-obligation out-of-balance. No bold. A pure derive over
    balance.scenarios[].evidenceObligations[] — markdown-only (project design §3), proven in
    isolation by Vitest.

    The subject row is the SCENARIO RECONCILIATION (3F-1726) — the manifesto's collection, all
    three row kinds (declared, phantom, suspense) — not "Scenario", which names only the
    declared thing. The table is a pure presentation of summary.scenarioReconciliations, whose
    totals count EVERY row (@SCN-RMD-001, 3F-1724; phantom / suspense reconciliations are
    always out-of-balance), so on a run whose only out-of-balance row is the suspense
    reconciliation the table renders N+1 | N | 1 — never N | N | 0. The subject's
    out-of-balance column therefore agrees with isBalanced and with the exit code, the three
    views that disagreed in an adopter's repository 17-36-50Z run.

    @unit @SCN-RPT-004
    Scenario: the markdown report renders the evidence reconciliation as subjects-rows with balanced and out-of-balance columns
      Given a reconciliation balance whose scenarios carry a double missing arm, so the out-of-balance scenario and evidence obligation counts diverge
      When the markdown report is rendered
      Then it carries a "### Evidence reconciliation" section with a "Subject | Total | Balanced | Out-of-balance | Detail" table — a Scenario Reconciliation row and an Evidence obligation row each with its own total, the evidence-obligation out-of-balance decomposed into nested missing (with its bare-level split), failing, and watermelon rows that reconcile to it
      And a balance of N declared balanced scenarios plus one suspense reconciliation renders the Scenario Reconciliation row as N+1 total, N balanced, 1 out-of-balance — the suspense reconciliation counted, so the table cannot read a pass on a run isBalanced fails

  Rule: the markdown report surfaces the lint evidence obligations as their own section

    The by-kind view (@SCN-RPT-005; re-cut under Summary views with a total
    line by the reformat; labelled by the @lint TAG, not the kind).
    The lint (@lint) evidence obligations sit mixed in with runtime items in the
    per-scenario ledger. This section lifts them out: under "## Summary views", a
    "### Lint evidence obligations" section opens with a total line ("N of M lint
    evidence obligations reconcile balanced.") then a table listing each kind === "static"
    evidence obligation with its scenario, static guard handle, and reconciliation outcome — so the lint
    axis (incl. any 🍉 watermelon) reads on its own. The label is the tag word "lint" (the
    internal kind "static" is never rendered). Omitted entirely (total line and
    all) when no scenario declares a lint evidence obligation. A pure derive over
    balance.scenarios[].evidenceObligations[] filtered on kind === "static" —
    markdown-only (project design §3), proven in isolation by Vitest.

    @unit @SCN-RPT-005
    Scenario: the markdown report lists the lint evidence obligations as their own section
      Given a reconciliation balance whose scenarios declare lint (@lint) evidence obligations spanning balanced and the watermelon, alongside runtime evidence obligations
      When the markdown report is rendered
      Then it carries a "### Lint evidence obligations" section with a total line and a table listing each lint evidence obligation's scenario, static guard handle, and reconciliation outcome — including the 🍉 watermelon — and excluding the runtime evidence obligations

  Rule: the markdown report groups out-of-balance scenarios by feature

    The by-feature view (@SCN-RPT-006; re-cut under Summary views with a total
    line and rendered as a TABLE by the reformat; the FFF prefix enriched to the
    full feature name). The per-scenario ledger lists every scenario in document
    order; it does not show which FEATURES carry the discrepancies. Under "## Summary
    views", a "### Out-of-balance by feature" section opens with a total line ("The N of M
    out-of-balance scenarios, grouped by feature:") then a "Feature | Count | Out-of-balance
    ids" table grouping the verdict === "out-of-balance" scenarios under the <FFF> parsed
    from each scnId (SCN-<FFF>-<NNN>), one row per feature with a per-feature count,
    so a reader sees the discrepancy CONCENTRATION by feature. The Feature cell reads
    "<full-name> (<FFF>)" — the full name is the feature file's filename slug, looked up via
    a target-derived code→slug map (readFeatureNames over discoverFeatures, the 5th sibling
    renderer arg, markdown-only). An UNCODED id (an @SCN-XYZ-* whose XYZ no file declares)
    falls back to the bare FFF (the map misses) — as does the no-map back-compat path.
    Balanced scenarios are excluded (this is the discrepancy view). The scnId → <FFF> parse
    REUSES the shared featureCodeOf helper rather than a fresh regex. Omitted entirely when
    no scenario is out of balance. A pure derive over balance.scenarios + the markdown-only
    label lookup. The @unit arm proves the render (full name + uncoded fallback) in
    isolation; the @integration arm drives the REAL readFeatureNames→map→disk plumbing over
    a fixture feature dir (a coded + an uncoded feature) to the persisted markdown.

    @unit @integration @SCN-RPT-006
    Scenario: the by-feature cut names each out-of-balance feature in full, falling back to the bare code when uncoded
      Given a target feature directory whose features declare codes alongside an uncoded one
      When the run writes its artifacts with the feature-name map
      Then the persisted spec-reconciliation.md by-feature cut names the coded feature in full and falls back to the bare code for the uncoded id

  Rule: the declared corpus census survives the Declared-corpus section's dissolution

    The corpus census (@SCN-RPT-007; the standalone "## Declared corpus"
    section DISSOLVED by the reformat, Q1a). The report no longer carries a
    dedicated "## Declared corpus" section. The declared count is NOT lost: it is
    recoverable as the ledger scenario-count ("- N Scenario Reconciliation(s): …") PLUS
    the "## Warnings" count — every declared scenario surfaces on exactly one axis (a
    balance verdict in the ledger or a no-evidence-declared warning). A pure markdown-only
    derive over the balance (project design §3), proven in isolation by Vitest. RPT-008's
    excluded-occurrence bullet relocates into the ledger summary.

    @unit @SCN-RPT-007
    Scenario: the declared corpus census is recoverable from the ledger summary and warnings
      Given a reconciliation balance carrying declared scenarios alongside no-evidence-declared warnings
      When the markdown report is rendered
      Then it carries no standalone "## Declared corpus" section, and the declared census is recoverable as the ledger scenario-count plus the warnings count

  Rule: the report outcomes the excluded non-tag @SCN occurrences on both surfaces

    The corpus is reconciled against every raw mention (@SCN-RPT-008,
    slice 5). The report outcomes "N @SCN ids seen in non-tag context, excluded" — the
    delta between raw @SCN-FFF-NNN occurrences in the source (prose, comments, step
    text) and the ids actually read as declared scenarios — on BOTH surfaces (the
    markdown ledger-summary bullet, relocated there by the reformat, + a JSON
    evidenceObligations object). NEW corpus metadata, NOT
    derivable from Ledger, so it lands on both surfaces (project design §1, §3 —
    the same non-derivable rule that put provenance on both surfaces). The producer is
    a new countScnOccurrences(source) in scenarios.ts (parseScenarios unchanged); the
    datum is a EvidenceObligations sibling (src/declared/corpus.ts) threaded CLI→renderers
    exactly like RunContext (an optional third renderer argument). The @integration arm
    drives the REAL CLI pipeline (runReconcile → readEvidenceObligations → writeOutputs
    with a corpus) over spec-controller's own corpus and asserts BOTH persisted artifacts
    carry the excluded fact and AGREE on the number — the scenarios.ts→corpus→both-
    renderers→disk wiring is critical-path, NOT covered by RPT-001's ctx thread.

    @unit @integration @SCN-RPT-008
    Scenario: the report outcomes the excluded non-tag @SCN occurrences on both surfaces
      Given a reconciliation run whose source mentions @SCN ids in non-tag context beyond the declared scenarios
      When the run writes its markdown and JSON artifacts
      Then the persisted spec-reconciliation.md outcomes "N @SCN ids seen in non-tag context, excluded" and the persisted spec-reconciliation.json carries the same excluded count on a evidenceObligations object

  Rule: the report renders summary-first, ledger-last

    The reformat (@SCN-RPT-009, surfaced by the acceptance dogfood).
    The report opens with "# Evidence Reconciliation" (renamed from "# Ledger", via the
    interim "# Spec reconciliation" — the report IS the reconciliation; "Ledger" names only
    the INPUT in canon, so the reconciled OUTPUT is never titled "Ledger"), keeps
    "## Run provenance" first, then groups the derived cuts under "## Summary views"
    (### Run verdict → ### Evidence reconciliation → ### Test volume → ### Static guards →
    ### Lint evidence obligations → ### Out-of-balance by feature), and moves the per-scenario
    "## Scenario Reconciliations" table to the END with its
    summary lines on top (the verdict tally and the relocated excluded-occurrence bullet),
    "## Warnings" last. So the digestible summary leads and the 500-row ledger trails, and
    the cuts read as cuts OF the ledger, not a separate ledger. A pure layout reorg
    over existing data — no new derivation, the JSON surface unchanged (markdown-only).
    The RPT-004/005/006/007 scenarios are updated in the same change. Every reconciling
    item is labelled by its TAG (the bare level for runtime — unit / integration / … —
    and "lint" for the static kind), never the internal kind axis. Proven in
    isolation by Vitest (the markdown integration thread is already proven by RPT-001).

    @unit @SCN-RPT-009
    Scenario: the markdown report renders summary-first with the scenario reconciliations last
      Given a reconciliation balance spanning balanced and out-of-balance scenarios, a lint evidence obligation, and a no-evidence-declared warning
      When the markdown report is rendered
      Then it opens with "# Evidence Reconciliation" and "## Run provenance", groups the derived cuts under "## Summary views", and renders the "## Scenario Reconciliations" table last with its summary lines on top

  Rule: the report reconciles the test evidence observation — raw = attributed + suspense

    The evidence observation-reconciliation spine (@SCN-RPT-010). The report's evidence obligation
    (demand) side has a Headline tally; its evidence observation side had nothing — the evidence observations
    the pipeline builds were consumed by reconcile() and thrown away. This retains the
    observed test evidence observation as a RuntimeEvidenceObservationKindCounts datum, counted by kind against the @SCN
    anchor in ONE shared pass — attributed-to-declared (per-(scnId, level) counts),
    phantom-id (an @SCN no scenario declares), and unattributed evidence observation (no @SCN)
    — with raw per-level totals and file locators. Under "## Summary views", a
    "### Test volume" cut renders the balancing identity ("N evidence observations = M attributed +
    G phantom + K suspense", a derived view) then a by-level evidence observation table (all four levels,
    e2e/performance zeros shown — a fixed tally that always lists every level). The identity holds
    BY CONSTRUCTION: one pass counts each evidence observation into exactly one kind while
    summing the raw total, so the three terms can't drift. The non-derivable atoms
    (rawByRuntimeQualityCheck, attributed, phantom, unattributed evidence observation) persist on JSON (project design §3); the
    identity line stays markdown-only. The @integration arm drives the REAL file-read
    pipeline (readEvidenceObservations over fixture Vitest/Cucumber reports → writeOutputs → both
    persisted surfaces) and asserts the JSON atoms balance by construction — the
    readEvidenceObservations→countRuntimeEvidenceObservationKinds→both-renderers→disk wiring, not just an in-memory aggregate.
    Foundational: later scenarios consume the aggregate.

    @unit @integration @SCN-RPT-010
    Scenario: the report renders the Test volume cut and the evidence observation identity balances by construction
      Given a reconciliation run over a target whose Vitest and Cucumber reports span attributed, phantom-id, and unattributed evidence observations
      When the run writes its artifacts with the evidence observation reconciliation
      Then the persisted spec-reconciliation.md renders the Test volume cut with the balancing identity and spec-reconciliation.json carries evidence-observation atoms that balance by construction

  Rule: the per-scenario ledger shows the evidence backing each evidence obligation

    Per-scenario evidence columns (@SCN-RPT-011), consuming the evidence observation
    aggregate. The ledger row gains corpus-driven columns between Scenario and Verdict —
    Lint first, then the runtime levels present in demand or evidence observation (Unit, Integration,
    e2e, Performance; e2e/performance only when a run has them). Each cell is a four-way
    demand×evidence observation encoding: `N` (demanded, N evidence observations attributed — backing present,
    pass OR fail), `∅` (demanded, none — missing), `(N)` (NOT demanded but N
    present — evidence observations at a quality-check the scenario never demanded), `—` (neither).
    The cell counts BACKING, not quality — a failing evidence obligation shows its
    count, its failing-ness staying in the Verdict + Reconciling-items columns.
    The Lint cell reads the static evidence obligation outcomes (lint isn't a counted evidence observation):
    the count of guards present (balanced or the watermelon — the script exists; its
    inadequacy is the 🍉 in Reconciling-items); no `(N)` for lint. A fixed cell key
    (notation, not data — so facts-only) renders immediately before the table. Markdown-only
    — the attributed atoms are already on JSON. The "count is backing, not
    quality — never rank by it" discipline is a documented rule, NOT rendered.

    The `(N)` cell has TWO production shapes, and the cell must read demand off the ACTIVE
    obligations to render both. (1) PENDING + ATTRIBUTED: `evidenceObligationPairs` is built over
    ALL obligations INCLUDING pending, but the rows reconcile over the active ones only — so an
    evidence observation citing a pending pair is not undemanded, posts NO row at that
    quality-check, and IS attributed → not demanded, count > 0 → `(N)`. (2) UNDEMANDED
    (@SCN-LDG-008): the reconciler posts a credit-side row ON the real scenario, outcome
    `undemanded`, and the census keeps that observation OUT of `attributed` (it counts into
    `undemandedCount`) — so the cell reads its count off the undemanded rows themselves. An
    `undemanded` row is NOT a demand: reading it as one rendered `∅` (missing), which contradicts
    the row's own Reconciling-items column and points at the OPPOSITE remedy — "write the test",
    when the truth is "fix the attribution". The not-demanded branch therefore counts BOTH terms
    (attributed PLUS undemanded rows at that quality-check); they are mutually exclusive per
    (scenario, quality-check), so the sum is safe, and dropping either silently regresses one
    shape to `—`. Proven in isolation by Vitest over a RECONCILER-TRUE fixture (the balance is
    produced by `reconcile()` over a scenario + observation corpus, never hand-written, so a
    fixture can no longer pin a shape the pipeline cannot emit — evidence-manifesto §11A), and
    through a REAL reconcile + render over a fixture target — the cell-rendering class
    (@SCN-RPT-017 / @SCN-RPT-018) needs both layers.

    @unit @integration @SCN-RPT-011
    Scenario: the ledger row shows corpus-driven evidence columns with the four-way cell encoding
      Given a reconciliation over a corpus spanning every cell case — a satisfied obligation, a missing one, an undemanded observation citing a scenario that never demanded that quality-check, a pending obligation with observations citing it at that pair, and a column absent for the scenario
      When the ledger is rendered
      Then each scenario row carries one cell per corpus column (Lint first, then the runtime levels present) with the four-way encoding — the count, ∅, (N), or —
      And the scenario whose only state at a quality-check is undemanded renders (N) there, not ∅
      And the scenario whose obligation at a quality-check is pending, with observations citing it at that pair, renders (N) there — because the credit is now undemanded, not attributed
      And the fixed cell key renders immediately before the ledger table

  Rule: Warnings flags the unattributed evidence observation tests with their file locators

    Anchor audit — unattributed evidence observation tests (@SCN-RPT-012), consuming the
    evidence observation aggregate's `suspense` array (already a term in the evidence observation identity, with
    the test-file locators retained). `## Warnings` gains a second sub-part listing the
    unattributed evidence observation-test count + per-file locators (grouped by file, per-file counts, sorted
    — so the per-file counts reconcile to the total). It renders `N test(s) carry no @SCN
    anchor:` then `- <count> in \`<file>\`` bullets. The section now renders when EITHER
    no-evidence-declared warnings OR unattributed evidence observation tests are present; the no-evidence
    sub-part is byte-unchanged and renders first. Facts-only — count + locator, no
    interpretation; the count links the reader to the Test volume cut's `unattributed evidence observation`
    term. Markdown-only (the atoms are already on JSON). Proven in isolation
    by Vitest over a evidence observation fixture with multi-file unattributed evidence observations. Completes the
    evidence observation identity's visible accounting (raw = attributed + suspense, now with
    where-to-look); the phantom evidence observation-id case remains.

    @unit @SCN-RPT-012
    Scenario: Warnings lists the unattributed evidence observation tests with per-file locators
      Given a evidence observation aggregate carrying unattributed evidence observations (no @SCN anchor) across more than one test file
      When the markdown report is rendered
      Then the "## Warnings" section lists the unattributed evidence observation-test count and the per-file locators with per-file counts, sorted, and renders whether or not any no-evidence-declared warnings are present

  # Rule: Warnings flags the phantom evidence observation-id tests — RETIRED (@SCN-LDG-006).
  # The phantom-id anchor audit (was @SCN-RPT-013) is superseded by the bidirectional
  # reconciler: a credit citing an undeclared @SCN now surfaces as a PHANTOM-scenario
  # reconciliation row in the Ledger (outcome cites-unknown-scenario, carrying its id +
  # locator), not a Warnings sub-part — so the phantom detail lives in exactly one place (no
  # double-report). The behaviour is proven by @SCN-LDG-006 (features/ledger.feature); the
  # phantom COUNT survives in the Test volume balance-check identity.

  Rule: Warnings flags the untagged scenarios with their feature locators

    Anchor audit — untagged scenarios (@SCN-RPT-014), the declared-side
    counterpart to the evidence observation anomalies. `parseScenarios` only emits
    scenarios WITH an @SCN; a new `parseUntaggedScenarios` counts Gherkin scenario
    headers (Scenario / Scenario Outline / Scenario Template / Example — NOT the
    Examples: data table) and subtracts those whose preceding tag block carries an @SCN
    — the 514-headers-vs-512-tags gap. `## Warnings` gains a fourth sub-part listing the
    untagged-scenario count + `feature-file : scenario` locators (sorted). The datum lives
    on EvidenceObligations.untaggedScenarios (declared-side census, like excludedOccurrences) and
    — a NEW non-derivable datum — persists on the JSON evidenceObligations object beside
    excludedOccurrences (project design §3). The section gate now fires on no-evidence OR
    unattributed evidence observation OR phantom OR untagged; the earlier sub-parts are byte-unchanged. Facts-only
    — count + locator. The @integration arm drives the REAL parse over a fixture feature
    dir (tagged + untagged) → both persisted surfaces, proving the header-parse + file-pairing.

    @unit @integration @SCN-RPT-014
    Scenario: Warnings lists the untagged scenarios with their feature locators
      Given a target feature directory mixing @SCN-tagged and untagged scenarios
      When the run writes its artifacts with the declared corpus
      Then the persisted spec-reconciliation.md lists the untagged scenarios with feature locators and spec-reconciliation.json carries them on evidenceObligations

  Rule: Warnings flags the prose-only @SCN codes — mentioned but never tagged

    Anchor audit — prose-only codes (@SCN-RPT-015), the fifth and final
    `## Warnings` sub-part, completing the @SCN anchor census. A new cross-corpus
    `proseOnlyCodes` classifies every @SCN occurrence as a tag or a prose mention, then
    returns `proseCodes − tagCodes` — the codes mentioned in non-tag context (prose,
    comments, step text) that are NEVER an @SCN tag ANYWHERE across the corpus. The
    cross-file union is load-bearing: a code tagged in one file but prosed in another is
    NOT dangling. This is the ~10 unique DANGLING references, distinct from the census's
    "167 @SCN occurrences" line (which counts every non-tag occurrence, not the unique
    untagged difference) — so it reads as a refinement, not a contradiction. `## Warnings`
    gains a fifth sub-part listing the prose-only-code count + bare `- SCN-FOO-001` codes
    (sorted). The datum lives on EvidenceObligations.proseOnlyCodes and — a NEW non-derivable
    declared-side datum — persists on the JSON evidenceObligations object beside
    excludedOccurrences / untaggedScenarios (project design §3). The section gate now fires
    on no-evidence OR unattributed evidence observation OR phantom OR untagged OR prose-only; the earlier sub-parts
    are byte-unchanged and render first. Facts-only — bare codes, no interpretation. The
    integration arm drives the REAL cross-corpus parse over a fixture feature dir (a tagged
    code also prosed, plus a dangling prose-only code) → both persisted surfaces, proving the
    tag-vs-prose classification on real files.

    @unit @integration @SCN-RPT-015
    Scenario: Warnings lists the prose-only @SCN codes mentioned but never tagged
      Given a target feature directory mentioning an @SCN code only in prose
      When the run writes its artifacts with the declared corpus over that directory
      Then the persisted spec-reconciliation.md lists the prose-only code and spec-reconciliation.json carries it on evidenceObligations

  Rule: a cross-repo reconcile relativises paths against the target repo root, not the run cwd

    The portability fix. The portable-path design (provenance inputs /
    evidence-observation locators) relativized both surfaces against
    process.cwd() — the TOOL's own repo (spec-controller). That assumed a self-reconcile
    (cwd = target). Reconciling a DIFFERENT repo — the primary use case — the
    target's absolute paths are NOT under cwd, so relativizeToRoot took its
    "absolute-not-under-root" branch and kept them verbatim: the ledger leaked 356
    absolute /Users/… paths across provenance.inputs and the phantom evidence-observation
    and suspense evidence-observation locators. A stored report is more sensitive than
    code and public-bound, so leaking the local FS layout defeats the portability thesis.

    The fix derives the root from the TARGET, not the run cwd: a new resolveTargetRoot
    reads the git top-level of dirname(--features) when the target is a git repo, else
    dirname(--features) itself, else process.cwd() for a self-reconcile with no --features.
    That single derived root is threaded to BOTH the provenance-input relativisation
    (run/runContext.ts) and the evidence-observation locator relativisation
    (evidenceObservations.ts) at the CLI edge, so output is portable regardless of where
    the tool is invoked.

    The unit arm proves resolveTargetRoot derives the target repo root from --features,
    independent of the run cwd. The integration arm drives the REAL CLI, run from a cwd
    that is NOT the target repo, over a target whose Vitest / Cucumber reports carry
    ABSOLUTE test-file locators: it persists a markdown + JSON report carrying ZERO of the
    target's absolute paths — the evidence-observation locators collapse to repo-relative
    and the input paths record relative to the target root. RED on the current
    cwd-stripping (the target's paths leak verbatim); GREEN once the root is derived from
    the target.

    @unit @integration @SCN-RPT-016
    Scenario: a cross-repo reconcile run from a foreign cwd yields zero absolute paths on both surfaces
      Given a target repo outside the run cwd whose Vitest and Cucumber reports carry absolute test-file locators under that repo
      When the real CLI reconciles it from a foreign cwd and persists the markdown and JSON reports
      Then the persisted spec-reconciliation.md and spec-reconciliation.json carry none of the target's absolute paths — the evidence-observation locators are repo-relative and the input paths record relative to the target root

  Rule: the report's evidence-observation views level a runtime observation by the cited scenario's tag

    The FULL-UNIFY view fix (@SCN-RPT-017, 3F-1452). @SCN-LDG-011 / 3F-1434 made the
    RECONCILER level a runtime observation by the cited scenario's declared tier tag, so a
    cucumber run of an @e2e scenario discharges an e2e obligation. But the report's
    evidence-observation views — Test volume `rawByRuntimeQualityCheck`, `attributed`, and the
    per-scenario E2e cell — were fed by a SECOND, independent derivation: the census
    (`countRuntimeEvidenceObservationKinds`) did its OWN raw-report walk and stamped the single
    caller-declared quality-check (cucumber ⇒ integration), so an @e2e-via-cucumber observation
    surfaced as `e2e: 0` in the views while the reconciler correctly reported the e2e obligation
    satisfied — the report contradicting itself.

    The fix removes the second derivation: the census becomes a PROJECTION of the one observation
    set the reconciler consumes. `countRuntimeEvidenceObservationKinds` tallies the already-parsed
    `EvidenceObservation[]` (tag-derived, per-tier), classifying each by `(scnId, qualityCheck)`
    into raw / attributed / undemanded / phantom / suspense exactly as before — only the SOURCE of
    the level changes (the parsed set, not the hardcode). The CLI parses the runtime observations
    ONCE and feeds the same set to both `reconcile` and the census. The renderer is untouched — it
    reads `attributed` + `rawByRuntimeQualityCheck` from the census, so the three views fix
    together. The identity (`Σ raw = attributed + undemanded + phantom + suspense`) holds by
    construction over the projected set (the parsed set retains null-scnId → suspense and
    unknown-scnId → phantom observations WITH levels).

    The unit arm proves the census, projecting a parsed set that contains an @e2e-via-cucumber
    observation, counts it under e2e (not integration) with `attributed` carrying `(scnId, e2e)`.
    The integration arm drives the REAL reconcile + render over a fixture whose cucumber report has
    a passing @e2e scenario with no vitest evidence: the rendered Test volume counts it under e2e,
    and the scenario's E2e cell renders a count, not ∅. RED on the census's own raw-report walk
    (which hardcodes integration); GREEN once the census projects the tag-derived parsed set.

    @unit @integration @SCN-RPT-017
    Scenario: an @e2e-via-cucumber observation is counted at e2e across the report views
      Given a target whose cucumber report has a passing @e2e scenario with no vitest evidence
      When the reconciliation report is rendered for that @e2e-via-cucumber target
      Then Test volume counts the observation under e2e, not integration
      And the scenario appears in attributed at e2e
      And the scenario's E2e cell renders a count, not ∅

    # The MULTI-TAG view mirror (@SCN-RPT-018, 3F-1452). The view-side mirror of the reconciler's
    # @SCN-LDG-014: a scenario declaring @integration @e2e proven by a SINGLE passing cucumber
    # observation is counted in BOTH tiers across the views — because parseCucumber emits one
    # observation per declared non-unit tier (the per-tier emission, @SCN-LDG-014), and the census is
    # now a PROJECTION of that parsed set (@SCN-RPT-017), so the two observations (integration + e2e)
    # for the one scenario are tallied independently with NO multi-tag-specific census logic. Test
    # volume counts the scenario's single cucumber pass under integration AND under e2e; the scenario
    # declares both obligations (its tier tags), so both the Integration and E2e cells read their
    # attributed count and render it — neither collapses to ∅. Per-tier counting is INHERITED from the
    # parsed set, not re-implemented; this scenario pins that the multi-tier credit survives the
    # census projection into the views (the second tier is not lost).
    @unit @integration @SCN-RPT-018
    Scenario: an @integration @e2e-via-cucumber observation is counted in both tiers across the views
      Given a target whose cucumber report has a single passing @integration @e2e scenario tagged SCN-TGT-102
      When the reconciliation report is rendered for that @integration @e2e-via-cucumber target
      Then Test volume counts the single observation under both integration and e2e
      And SCN-TGT-102's Integration and E2e cells each render a count, not ∅

  Rule: the evidence-obligation out-of-balance decomposes into a flat list of the nine leaf outcomes, with no group-side subtotal rows

    The obligation-summary decomposition (@SCN-RPT-019, 3F-1453; extended 3F-1649). The Evidence
    reconciliation's evidence-obligation out-of-balance row decomposes into a FLAT list of the
    nine out-of-balance leaf outcomes — missing, failing, watermelon,
    no-scn-code, cites-unknown-scenario, cites-no-scenario, undemanded, broken, both-missing — each a counted
    "↳ <outcome>" row whose Out-of-balance counts SUM to the evidence-obligation out-of-balance
    total. The former debit/credit/neither grouping is removed entirely: no "↳ debit-side",
    "↳ credit-side", or "↳ neither-side" subtotal row is rendered. The grouping construct
    double-counted — each group emitted a subtotal row AND its leaf rows at the same indent, so
    a naive column-sum doubled (170 vs 85). Removing the grouping leaves the leaves reconciling
    to the total exactly once. The existing @SCN-RPT-004 leaf-presence guard stays green (the
    leaves still render). A pure derive over the report's materialised
    summary.evidenceObligations.byOutcome — markdown-only, proven in isolation by Vitest.

    The leaf list is HAND-MAINTAINED (a readonly Outcome[], not a type-forced Record), so it can
    fall behind the Outcome union silently — broken (@SCN-LDG-017) joined the union, tallied in
    the JSON via byOutcome.broken, and would have been omitted from this table with a clean
    compile. So the decomposition also carries an EXHAUSTIVENESS guard: every Outcome member
    except satisfied (the balanced outcome) renders a leaf row — derived from the union itself,
    never a hand-transcribed list, so a future member cannot join the union without reaching the
    table. It WORKED: `no-scn-code` (@SCN-LDG-021, 3F-1774) could not be added to the union without
    this decomposition acknowledging it — the compiler refused the type-forced Record until it did.
    The ninth leaf therefore reached the table in the same commit as the outcome, by construction.

    @unit @SCN-RPT-019
    Scenario: the obligation summary lists the nine leaf outcomes summing to the out-of-balance total, with no group rows
      Given a reconciliation balance whose out-of-balance obligations span debit, credit, and neither outcomes
      When the markdown report is rendered
      Then the Evidence obligation out-of-balance decomposes into exactly the nine leaf outcome rows
      And the leaf rows cover every Outcome member except satisfied
      And their counts sum to the evidence-obligation out-of-balance total
      And no debit-side / credit-side / neither-side group row is present
      And the leaf rows render in the canon order — missing, failing, watermelon, no-scn-code, cites-unknown-scenario, cites-no-scenario, undemanded, broken, both-missing — debit block, credit block, neither

  Rule: the markdown renders each outcome's canon description in place of the bare handle

    The outcome gloss (@SCN-RPT-020, 3F-1626). A reconciling-item outcome handle
    (missing, cites-no-scenario, undemanded, both-missing, …) is meaningless to a human
    reading the report in a CI log. So the markdown renders each outcome's full CANON
    DESCRIPTION in place of the handle, EVERYWHERE an outcome surfaces to a reader: the
    Evidence-reconciliation summary's "↳" decomposition rows (Subject cell), the per-scenario
    reconciling-items list, and the lint-obligation table's Outcome column. "↳ missing"
    becomes "↳ Evidence Observation is missing"; "unit ∅ missing" becomes "unit ∅ Evidence
    Observation is missing"; "🍉 watermelon" becomes "🍉 Evidence Observation is passing but
    fabricated". The handle is GONE from the markdown; the glyph is retained. The descriptions
    are SINGLE-SOURCED from OUTCOME_DESCRIPTION (model.ts, next to the Outcome type), so the
    render cannot drift from the outcome it names — the drift class the census and the views
    were burned by. Markdown ONLY: the JSON keeps the bare handle (the machine axis; a
    programmatic consumer uses it). The Detail column is unchanged. A pure derive over the
    report model, proven in isolation by Vitest.

    @unit @SCN-RPT-020
    Scenario: the markdown renders each outcome's canon description, not the bare handle
      Given a reconciliation balance whose scenarios span the runtime, lint, credit, and neither-side outcomes
      When the markdown report is rendered
      Then the summary decomposition rows, the per-scenario reconciling items, and the lint table each render the outcome's canon description, single-sourced from OUTCOME_DESCRIPTION
      And the bare outcome handle appears nowhere in the markdown

  Rule: the canon gloss for every outcome is the manifesto's Outcome text, verbatim

    The single owner of the outcome gloss text (3F-1832). OUTCOME_DESCRIPTION is what the renderer shows
    in place of the bare handle everywhere an outcome surfaces to a reader, so its text IS the report's
    gloss. This pins every handle to the manifesto Outcome column, verbatim, keyed by the type-forced
    Outcome union so a new outcome cannot ship without its canon gloss — replacing the scattered
    gloss-text landmarks that drifted from canon and each other. (The run-integrity stamp and verdict
    line are governed by the manifesto's Unsound entry and stay reader-agnostic — RPT-021 / RPT-022 —
    not this Rule's concern. RPT-020 owns render-single-sourcing; this owns value-equals-canon.)

    @unit @SCN-RPT-025
    Scenario Outline: the <handle> outcome glosses as the manifesto's canon text
      Then the outcome "<handle>" glosses as "<canon text>"

      Examples:
        | handle                 | canon text                                                                                                               |
        | satisfied              | Evidence Observation satisfies its Evidence Obligation                                                                    |
        | missing                | Evidence Observation is missing                                                                                          |
        | failing                | Evidence Observation is failing                                                                                          |
        | watermelon             | Evidence Observation is passing but fabricated                                                                            |
        | no-scn-code            | Evidence Obligation has no @SCN code for an Evidence Observation to link to                                               |
        | cites-unknown-scenario | Evidence Observation cites an unknown Scenario                                                                            |
        | cites-no-scenario      | Evidence Observation cites no Scenario                                                                                    |
        | undemanded             | Evidence Observation cites a Scenario that did not demand it                                                              |
        | broken                 | Evidence Observation ATTEMPT errored before it could cite a Scenario (the proving suite failed to collect; behaviour never exercised) |
        | both-missing           | Evidence Obligation and Evidence Observation are both missing — the Scenario is untagged and uncited                     |

  Rule: the report surfaces broken evidence as a harness failure, and stamps the run unsound

    The customer-visible payoff of the broken reconciling item (@SCN-RPT-021, 3F-1642; generalised
    over cucumber by 3F-1654). A "missing" row tells the reader to WRITE A TEST. When the proof
    already exists and simply NEVER RAN — a vitest suite that failed to collect, a cucumber step
    two step definitions both match — that instruction is wrong, and the report is the only place
    the reader will ever see it. So the markdown does three things a "missing" row cannot.

    It NAMES the broken evidence — the locator the runner gave it, a test file or a feature file —
    and PRINTS what broke, so the reader knows what and where. The message is printed VERBATIM in
    the run-integrity section (a fenced block — a vitest collection message is multi-line and would
    destroy a table cell); the suspense row's "broken" reconciling item carries the same locator
    plus the message's headline line, so the row is legible without leaving the table.

    The renderer needs NO per-reader branch — it renders what the item CARRIES. Where the runner
    gives its own words (vitest's collection error) the message IS those words, passed through
    unchanged; where the runner gives none (cucumber emits no error_message for an ambiguous step)
    the reader synthesised the diagnosis upstream. Either way the renderer names WHAT failed and
    WHERE, in one shape — and it never miscalls one kind of break as the other.

    It STAMPS the run "unsound" — the render headline word, and the only place that word appears
    (the predicate is hasBrokenEvidence: predicate-name ≠ headline-word, per isBalanced vs
    "balanced"). The stamp is what tells the reader that every "missing" outcome BELOW it is
    suspect: an unexercised behaviour reconciles missing whether its proof is absent or merely
    broken, so a "missing" row in an unsound run cannot be read as "write the test".

    The gloss is REMEDY-NEUTRAL: what broke is equally a missing dependency, a syntax error, a bad
    import, a top-level throw, or two step definitions colliding, so the report names the fact and
    prints the message it was given — it never prescribes a cure. The one remedy it does give is
    the one that always holds: fix the harness and regenerate.

    Omit-when-empty (the Pending Items tally precedent): a run carrying no broken evidence
    renders BYTE-IDENTICAL to the pre-slice output — a sound run gains no stray empty section.
    Markdown ONLY — a machine consumer reads soundness as summary.byOutcome.broken > 0, already
    type-forced into the JSON, so no new JSON field is owed. A pure derive over the report model,
    proven in isolation by Vitest.

    @unit @SCN-RPT-021
    Scenario: the markdown names the broken evidence and its error, and stamps the run unsound
      Given a balance whose suspense row carries a broken credit for a collection-failed vitest suite
      And a balance whose suspense row carries a broken credit for an ambiguous cucumber step
      When the markdown report is rendered
      Then each report is stamped unsound, above the summary views
      And each names its own broken evidence — the file or the feature — and neither miscalls the other's failure a collection failure
      And it prints the runner's error verbatim where the runner gives one, and states the diagnosis itself where it does not
      And it sends the reader to fix the harness and regenerate, prescribing no cure for the error itself
      And the suspense row's broken item carries the same locator, distinguishing a broken proof from an absent one
      And a balance carrying no broken credit renders byte-identically to the pre-slice output

  Rule: the summary opens with the run's verdict

    The tally now fails on its own (@SCN-RMD-001, 3F-1724 — every Scenario Reconciliation is
    counted, so a suspense row makes the totals read out-of-balance), but a reader still has to
    READ it. The verdict is the bottom line, so the summary says it OUTRIGHT — one line that IS
    the outcome, coherent with the "## Run integrity: unsound" stamp (@SCN-RPT-021) and the
    Pending Items line. A run that exits non-zero can then never render a headline that reads
    as a pass: the summary's FIRST words are the failure.

    The verdict is read off the WHOLE-RUN predicates — hasBrokenEvidence, isBalanced,
    hasPendingItems — never re-scanned by the renderer, and in the CLI's own dominance order
    (broken → out-of-balance → pending, cli-balance/cli.ts). Asking the same predicates in the
    same order is what stops the headline drifting from the exit code it names.

    UNSOUND maps to exit 4, OUT-OF-BALANCE to exit 1, BALANCED to exit 0 — determinate from
    the reconciliation alone. Exit 3 is NOT: it fires only under --strict, a CLI-edge flag the
    core cannot see, so a balanced run carrying Pending Items names exit 3 CONDITIONALLY
    ("exit 3 under --strict") and never asserts it. Unlike the unsound stamp, this section is
    ALWAYS present — a balanced run needs its verdict line too. The agreement with the real
    process exit code is @SCN-CLI-013's arm, not this one's.

    @unit @SCN-RPT-022
    Scenario: the summary opens with the run verdict and the exit code it maps to
      Given a reconciliation whose verdict is broken, out-of-balance, or balanced
      When the markdown report is rendered
      Then the summary opens with a verdict line naming the outcome and the exit code it maps to
      And a run carrying broken evidence reads UNSOUND and exit 4, pre-empting the balance verdict
      And the UNSOUND gloss is reader-agnostic — a proof that never ran, not a vitest suite that failed to collect
      And an out-of-balance run reads OUT-OF-BALANCE and exit 1, never as a pass
      And a balanced run reads BALANCED and exit 0
      And a balanced run carrying Pending Items notes exit 3 under --strict, conditionally and unasserted

  Rule: a proof that never ran is attributed to no scenario, even when it cites one

    The census's second lie, and the reason the fold is not a no-op. A `broken` observation
    can carry a REAL `scnId` — an ambiguous cucumber step (@SCN-LDG-019) cites its @SCN and
    still never runs. The census counted it `attributed`; the reconciler posts it to suspense.
    Canon settles it: a proof that never ran cannot discharge or fail an obligation, so it
    attributes to nothing.

    The count moves — `attributed` down, `suspense` up — and this scenario NAMES that move,
    because nothing else can. The exhaustion identity is INVARIANT under a misclassification
    between its own terms: it catches a credit VANISHING, never a credit in the wrong bucket.
    It is a completeness check, and it has been misread as a correctness check. This is the
    correctness check.

    The census is now a FOLD over the Ledger: it walks the posted credits and reads each
    credit's kind off the ROW it posted to, so the reconciler is the ONE classifier. The fold
    keeps the RUNTIME scoping — a `lint` credit posts to every account demanding it, so a
    naive walk would double-count the static axis the census must not see at all.

    @unit @integration @SCN-RPT-023
    Scenario: a broken observation citing a real scenario counts as suspense, not attributed to that scenario
      Given a corpus whose cucumber run reports an ambiguous step for a scenario that cites a declared @SCN at a demanded quality-check
      When the run reconciles and the report is rendered
      Then the broken observation is not counted among that scenario's attributed evidence
      And it is counted once on the suspense scenario, and the Test volume identity still balances

  Rule: the reconciliation collection renders as "Scenario Reconciliation(s)", never "scenario(s)", on every surface that names it

    The vocabulary rule for the reconciled OUTPUT collection (canon: Scenario Reconciliation;
    "scenarios" is a Rejected alias — it holds Scenario Reconciliations, not scenarios). The report
    names the collection on two rendered surfaces and both must read the same word: the Subject
    CELL of the reconciliation-collection row, and the headline verdict tally under
    "## Scenario Reconciliations". The tally counts EVERY row — declared, phantom and suspense
    (@SCN-RMD-001, 3F-1724) — so it names Scenario Reconciliations, not scenarios. A term owned on
    one surface but not the other is exactly how the tally drifted to "scenario(s)" while the
    Subject cell and the field names stayed right (3F-1833). Asserts the rendered CELL VALUE and
    the tally STRING, never their section headings — the heading is a separate concern.

    @unit @SCN-RPT-024
    Scenario: the reconciliation collection is named "Scenario Reconciliation(s)" on every surface, never "scenario(s)"
      Given a reconciliation balance carrying declared, phantom and suspense reconciliation rows
      When the markdown report is rendered
      Then the reconciliation-collection Subject cell reads "Scenario Reconciliation"
      And the headline verdict tally reads "N Scenario Reconciliation(s): X balanced, Y out-of-balance", never "N scenario(s):"

  Rule: the tool identity is the tool's own checkout, and a non-git install resolves the SHA to null

    Which spec-controller produced a run (@SCN-RPT-026, 3F-1916). resolveToolIdentity
    answers "which tool is this?" from the tool's OWN install, never the target: the git
    SHA is read `git -C <the tool's own dir>` (derived from import.meta.url), NEVER cwd —
    at run time cwd is the target repo, so a cwd read would re-record the target's SHA, the
    exact bug this closes. Run from the checkout, the tool SHA is the spec-controller repo
    HEAD; installed as a package with no .git, the git read cannot answer and the SHA
    resolves to a recorded null — while the version, read from the tool's own package.json,
    is STILL present, so a run stays attributable by version even with no SHA. A pure
    resolution rule proven in isolation by Vitest — the resolver → ctx → rendered-surface
    thread is already proven by RPT-001/RPT-002's integration arms (mirrors RPT-003).

    @unit @SCN-RPT-026
    Scenario: resolveToolIdentity reads the tool's own repo HEAD, and falls back to a null SHA with the version still present when the tool is not a git checkout
      Given the tool resolves its own identity from its own directory
      Then the tool SHA is the spec-controller checkout HEAD, and the version is present, when run from the repo
      And the tool SHA is null but the tool version is still present when the tool is not a git checkout
