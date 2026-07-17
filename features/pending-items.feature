@PND
Feature: A pending evidence obligation raises a Pending Item

  A `<quality-check>pending` tag (evidence-manifesto §11B) declares an evidence
  obligation that is owed but deliberately deferred to a later slice. This slice is
  the PARSE only: it recognises the tag and derives a pending obligation. What a
  pending obligation *does* on the ledger — the one-sided Pending Item — is slice 2.

  Seam: parse/scenarios.ts derives EvidenceObligation[] from a scenario's tags. A
  `<qc>pending` tag over a RECOGNISED quality-check derives `{ qualityCheck: <qc>, pending: true }`
  — the obligation gains a `pending?: boolean` flag (absent = a normal obligation).
  `@lintpending` derives `{ qualityCheck: "lint", pending: true }` with NO guard payload
  (one-sided; the guard doesn't exist yet). The `pending` suffix is significant: a SEPARATE
  recognition from the bare tier tag, so `@integrationpending` is not `@integration`. We give
  special meaning ONLY to our recognised lexicon (the five `<qc>pending`); anything outside it
  — an unknown `<x>pending`, or bare `@pending` — is ignored silently, exactly like any
  unrecognised tag. We do not police the developer's tags.

  Fixture policy: exercised over planted feature-strings under tests/fixtures/ fed to the
  pure parser — never a real `@<qc>pending` scenario in the scanned features/ corpus.

  Rule: A `<quality-check>pending` tag parses as a pending evidence obligation

    @unit @integration @SCN-PND-001
    Scenario Outline: <tag> declares a pending <quality-check> obligation
      Given a planted fixture scenario tagged "<tag>"
      When the parser derives its evidence obligations
      Then it declares a pending "<quality-check>" obligation

      Examples:
        | tag                 | quality-check |
        | @lintpending        | lint          |
        | @unitpending        | unit          |
        | @integrationpending | integration   |
        | @e2epending         | e2e           |
        | @performancepending | performance   |

    @unit @integration @SCN-PND-002
    Scenario: `@integrationpending` is not read as `@integration` — the suffix is significant
      Given the planted suffix-significance fixture — a bare `@integration` scenario alongside an `@integrationpending` one
      When the parser derives each scenario's evidence obligations
      Then the bare `@integration` scenario declares a plain "integration" obligation and no pending one
      And the `@integrationpending` scenario declares a pending "integration" obligation and no plain one

    @unit @integration @SCN-PND-003
    Scenario: an unrecognised `<x>pending` (no such quality-check) is passed through, ignored like any unrecognised tag
      Given the planted unknown-pending fixture — an `@foopending` scenario and a plain unknown `@foo` scenario
      When the parser derives each unknown scenario's evidence obligations
      Then every scenario declares no evidence obligation — the unknown `<x>pending` is ignored exactly like the plain unknown tag

  # The met→balanced and neither→missing results are the established @LDG baselines
  # (@SCN-LDG-001 satisfied→balanced; @SCN-LDG-003 absent→missing). This Rule adds the third:
  # the pending result — a deliberately-deferred obligation reconciles as a one-sided
  # Pending Item (owed IOU), never a Reconciling Item.
  Rule: The pending result of an obligation

    @unit @integration @SCN-PND-004
    Scenario Outline: <quality-check> — obligation declared pending → Pending Item (owed IOU)
      Given a planted fixture scenario declaring a pending "<quality-check>" obligation
      When the reconciler reconciles it against no observation
      Then the scenario raises exactly one Pending Item for "<quality-check>"
      And the scenario posts no both-missing reconciling item — nothing is reconciled

      Examples:
        | quality-check |
        | lint          |
        | unit          |
        | integration   |
        | e2e           |
        | performance   |

  # A Pending Item is one-sided: the pending TAG's existence alone raises it — no observation
  # is sought. Even when a matching observation exists for the pending obligation's check, the
  # pending declaration governs and the obligation never reconciles against it (never `satisfied`).
  #
  # A PENDING OBLIGATION DEMANDS NOTHING (3F-1858, correcting this Rule). Canon, Pending Item:
  # a `pending` tag raises NO Evidence Obligation, so "an Evidence Observation citing that
  # scenario at a pending quality-check is `undemanded` — exactly as when nothing was declared
  # at all". This narrative used to assert the opposite — "the pending pair stays DEMANDED" —
  # and that left the citing credit posting to NO ACCOUNT AT ALL: the pair-check excluded it
  # from `undemanded`, and the pending partition excluded it from the debit side. Zero rows,
  # verdict balanced, exit 0 — a run canon says must FAIL, passing.
  #
  # THE RULE ITSELF STILL HOLDS, and the distinction is exactly the point: the PENDING ITEM is
  # verdict-neutral and run-neutral — it is never a reconciling item and flips nothing. The row
  # below goes out of balance because of the CREDIT, which is an ordinary `undemanded`
  # reconciling item. Two different things on one row. (@SCN-PND-006..008 pin the neutrality
  # over a pending obligation NO observation cites; they stay green.)
  Rule: A Pending Item is one-sided and never affects the verdict or the run

    @unit @integration @SCN-PND-005
    Scenario: the pending tag's existence alone raises the Pending Item — no observation is sought
      Given a planted fixture scenario declaring a pending "integration" obligation, with a matching integration observation citing it
      When the reconciler reconciles the fixture against that matching observation
      Then the scenario raises exactly one Pending Item for "integration"
      And the matching observation IS flagged undemanded — a pending obligation demands nothing, so nothing is attributed to it
      And the scenario's row is out of balance and the run exits 1

    @unit @integration @SCN-PND-006
    Scenario: a Pending Item is not a Reconciling Item (it is not an error)
      Given a planted fixture scenario declaring a pending "integration" obligation alongside a genuinely missing "unit" obligation
      When the reconciler reconciles the mixed fixture against no observation
      Then the missing "unit" obligation is the scenario's only reconciling item — its one error
      And the pending "integration" check names no reconciling item and no evidence-obligation outcome — the Pending Item is a structurally distinct category, never counted as an error

    @unit @integration @SCN-PND-007
    Scenario: a scenario whose only exception is a Pending Item has verdict balanced
      Given a planted fixture — one scenario whose sole obligation is pending, and one carrying a passing unit obligation alongside a pending integration one
      When the reconciler reconciles the fixture, the passing unit observation supplied
      Then both scenarios have verdict balanced — the Pending Item is verdict-neutral
      And neither scenario names any reconciling item

    @unit @integration @SCN-PND-008
    Scenario: an Evidence Reconciliation whose only exceptions are Pending Items does not fail
      Given a planted fixture whose scenarios' only exceptions are Pending Items — two only-pending scenarios and one carrying a passing unit obligation alongside a deferred integration one
      When the reconciler reconciles the whole fixture, the passing unit observation supplied
      Then the whole Evidence Reconciliation is balanced — isBalanced is true, the run does not fail
      And the run genuinely carries Pending Items, yet no row names a reconciling item

    @unit @integration @SCN-PND-009
    Scenario: `@unit @integrationpending` with a passing unit observation → verdict balanced, one Pending Item
      Given a planted fixture scenario declaring `@unit @integrationpending`, with a passing unit observation citing it
      When the reconciler reconciles the composition fixture against that passing unit observation
      Then the unit obligation reconciles satisfied — a genuine reconciling-side balance
      And the deferred integration obligation is the scenario's one Pending Item, partitioned off
      And the scenario has verdict balanced and names no reconciling item — the pending and non-pending obligations coexist without interference

  # The Pending Item now SURFACES on the rendered report — the first render sub-issue. A
  # scenario's Pending Item(s) show on its rendered Scenario Reconciliation row with a label
  # VISIBLY DISTINCT from a reconciling item (the missing/failing/etc. errors), never mixed
  # into the reconciling-item list. The label carries its own ⏳ pending marker — reading as
  # neither balanced-clean (—) nor an error (a reconciling item's ✗/∅/🍉 outcome). The SUMMARY
  # tally is the next sub-issue (@SCN-PND-011); this one is the per-scenario label.
  Rule: The Pending Item surfaces — visible and tallied, distinct from a Reconciling Item

    @unit @integration @SCN-PND-010
    Scenario: the Pending Item shows on its Quality Check Reconciliation, labelled distinct from a Reconciling Item
      Given a planted render fixture — a balanced-with-pending scenario and one mixing a genuinely-missing unit error with a deferred integration obligation
      When the report is rendered from the reconciled fixture
      Then the balanced scenario's row shows its deferred integration obligation as a Pending Item, labelled distinct from a reconciling item
      And the mixed scenario's row shows the missing unit error and the deferred integration Pending Item as separate, distinctly-labelled categories
      And no Pending Item is rendered as a reconciling item — the deferred integration check never appears as a missing or failing error

    # The Summary now TALLIES Pending Items — the second surface sub-issue. The Evidence
    # Reconciliation Summary carries a Pending Items count SEPARATE from the scenario balanced
    # and out-of-balance counts, materialised on report.summary and rendered in the
    # `### Evidence reconciliation` view. It counts Pending ITEMS (one per deferred obligation),
    # not scenarios-carrying-pending — mirroring the out-of-balance decomposition, which counts
    # obligations, not scenarios. Hard constraint (3F-1453 line, endorsed; re-endorsed at eight
    # leaves, 3F-1649; the count is nine as of 3F-1774 — the constraint is categorical, not
    # arithmetic): the Pending tally is NEVER an out-of-balance leaf of its own, at any leaf count
    # — a Pending Item is deferred, not out-of-balance, so it is tallied apart, never a row under
    # the out-of-balance decomposition.
    @unit @integration @SCN-PND-011
    Scenario: the Evidence Reconciliation Summary tallies Pending Items separately from balanced and out-of-balance
      Given a planted summary-tally fixture — scenarios carrying Pending Items alongside a genuinely-missing error, spanning balanced and out-of-balance
      When the report is assembled and rendered from the reconciled fixture
      Then the materialised summary tallies the Pending Items, a count apart from the scenario balanced and out-of-balance counts
      And the tally counts Pending Items, not scenarios carrying them — one deferred obligation is one Pending Item
      And the rendered Evidence reconciliation shows the Pending Items tally, never an out-of-balance leaf at any count

    # The reviewer-legibility close-out: two BALANCED rows read differently at a glance. @SCN-PND-010
    # pinned the pending-vs-ERROR contrast (on an out-of-balance/mixed row); this pins the
    # same-verdict contrast — a clean-balanced row (its empty reconciling items rendered as the
    # em-dash `—`, nothing outstanding) beside a balanced-with-pending row (its deferred obligation
    # rendered as the `⏳ pending: <check>` label, owed work). Both read `✓ balanced`, yet their
    # exceptions cells differ, so the reviewer tells "balanced, nothing outstanding" from "balanced,
    # with owed/deferred work" without the Pending Item ever reading as an error.
    @unit @integration @SCN-PND-012
    Scenario: a balanced scenario carrying a Pending Item is visibly distinguished from a clean-balanced one
      Given a planted balanced-contrast fixture — a clean-balanced scenario alongside a balanced-with-pending one, both verdict balanced
      When the report is rendered from the reconciled balanced-contrast fixture, the clean-balanced scenario's unit observation supplied
      Then the clean-balanced scenario's balanced row shows the em-dash placeholder — nothing outstanding
      And the balanced-with-pending scenario's balanced row shows the ⏳ pending label instead — owed work, never an error
      And the two balanced rows read differently at a glance — the pending row is not the clean-balanced em-dash

  # Pending is NEVER inferred from an observation's STATUS — a stub that ran but proved nothing
  # is missing, not pending. This pins the READER's three-way classification (the seam being
  # refactored, distinct from @LDG which tests the reconciler over hand-built observations). The
  # cucumber reader classifies THREE-WAY: any failing step → a `failed` observation (failing);
  # all steps passed → a `passed` observation (satisfied); otherwise INCONCLUSIVE
  # (undefined/pending/skipped/ambiguous, none failed) → the reader emits NOTHING, so the declared
  # obligation finds no observation and reconciles missing BY ABSENCE. `EvidenceStatus` stays
  # binary (passed/failed) — the drop realises inconclusive→missing with no new status and no
  # reconciler change. `ambiguous` is deliberately not failing: no valid pass, so the declared
  # obligation reconciles missing.
  #
  # AMBIGUOUS IS NO LONGER MERELY DROPPED (@SCN-LDG-019, superseding the earlier "never its own
  # category" reading of this Rule). An ambiguous step — two step definitions matching one step —
  # is a BROKEN HARNESS: the proof exists and cannot execute. The reader now ALSO emits a `broken`
  # observation for it, which posts to the suspense row and stamps the run unsound. The row below
  # (`| ambiguous | missing |`) STILL HOLDS and is unchanged — a bystander, not an Update: the
  # reconciler's fail-safe excludes a broken observation from the obligation match whatever it
  # carries, so the declared obligation still reconciles missing BY ABSENCE. What changed is where
  # the reader is sent — to the colliding step definitions, not to a test file that already exists.
  # The other inconclusive statuses (`undefined` / `pending` / `skipped`) keep dropping, silently.
  Rule: An observation status maps to an existing outcome — pending is never inferred from status

    @unit @integration @SCN-PND-013
    Scenario Outline: a <result> cucumber observation for a non-deferred obligation → <outcome>
      Given a planted declared integration obligation and a cucumber report whose step status is "<result>"
      When the cucumber reader parses the report and the reconciler reconciles the declared obligation
      Then the declared integration obligation reconciles "<outcome>"

      Examples:
        | result    | outcome   |
        | passed    | satisfied |
        | failed    | failing   |
        | undefined | missing   |
        | pending   | missing   |
        | skipped   | missing   |
        | ambiguous | missing   |

    # The anti-leniency corollary of PND-013, at the VERDICT level: PND-013 pinned the reader's
    # per-status outcome; this pins what an undefined step DOES to a scenario that declared an
    # obligation but NO `<qc>pending`. Cucumber's own leniency would silently excuse an undefined
    # step (the hole this tool must not have); here the dropped observation leaves the declared
    # `@integration` obligation MISSING, so the scenario verdict is out-of-balance — a real gap,
    # never a Pending Item. A Pending Item requires a `<qc>pending` DECLARATION (slice 1/4); it is
    # never inferred from an inconclusive run's status. This is the observation-side assertion that
    # makes "pending is a declaration, never inferred from status" bite.
    @unit @integration @SCN-PND-014
    Scenario: an undeclared undefined step is reported out-of-balance (missing), not excused as pending
      Given a planted declared integration obligation carrying no pending declaration, and a cucumber report whose step is undefined
      When the cucumber reader drops the undefined step and the reconciler reconciles the declared obligation
      Then the scenario verdict is out-of-balance, its integration obligation a missing reconciling item
      And the scenario raises no Pending Item — the undefined step is not excused as pending

    # The uniformity scenario: inconclusive→missing is reader-AGNOSTIC, so the vitest reader
    # classifies THREE-WAY exactly as the cucumber reader (PND-013) does — over vitest's own status
    # vocabulary. A `passed` assertion → a `passed` observation (satisfied); a `failed` assertion →
    # a `failed` observation (failing); an inconclusive vitest status (`skipped`/`todo`, and any
    # status ∉ {passed, failed}) → the reader emits NOTHING, so the declared obligation finds no
    # observation and reconciles missing BY ABSENCE. A dedicated scenario (not a PND-013 row)
    # because the readers have DISTINCT status vocabularies; the same reader-agnostic Rule houses
    # both. Cucumber-only would leave a skipped unit test read as a FAILURE — the exact per-reader
    # inconsistency this uniformity scenario exists to catch. A skipped/todo unit test is a gap.
    @unit @integration @SCN-PND-015
    Scenario Outline: a vitest <result> observation for a non-deferred obligation → <outcome>
      Given a planted declared unit obligation and a vitest report whose assertion status is "<result>"
      When the vitest reader parses the report and the reconciler reconciles the declared obligation
      Then the declared unit obligation reconciles "<outcome>"

      Examples:
        | result  | outcome   |
        | passed  | satisfied |
        | failed  | failing   |
        | skipped | missing   |
        | todo    | missing   |

  # Slice 4 — SCENARIO-SCOPE community deferral (foundation). A recognised community
  # deferral tag — @wip / @ignore / @skip / @todo / @pending, the established Cucumber
  # conventions — on a scenario defers EVERY obligation the scenario declares: each becomes
  # a Pending Item, overriding the observation-derived outcome (slice 3). It reuses the
  # slice-1/2 pending machinery (the `pending` flag → the reconcile partition → Pending
  # Item), so a `@wip @unit @integration` scenario carries TWO Pending Items and verdict
  # balanced. The recognised set is the single-sourced starter constant DEFAULT_DEFERRAL_TAGS
  # (bare names; the `@` is tag-line syntax); parseScenarios takes the set as a defaulted
  # param, so config-EXTENSION is @SCN-PND-021's job, not this one. This sub-issue covers
  # scenarios WITH declared obligations; the zero-obligation bare-`@wip` case (a synthesised
  # scenario-level Pending Item) is @SCN-PND-022.
  Rule: A recognised deferral tag raises a Pending Item, overriding the observation-derived outcome

    @unit @integration @SCN-PND-016
    Scenario Outline: a recognised community tag <tag> defers every obligation on its scenario (scenario-scope)
      Given a planted fixture scenario carrying the community tag "<tag>" alongside a `@unit` and an `@integration` obligation
      When the parser derives the scenario's evidence obligations and the reconciler reconciles it against no observation
      Then both the declared unit and integration obligations are deferred — pending, overriding their observation-derived outcome
      And the scenario raises two Pending Items and has verdict balanced — no reconciling item

      Examples:
        | tag      |
        | @wip     |
        | @ignore  |
        | @skip    |
        | @todo    |
        | @pending |

    # The SCOPE CONTRAST to @SCN-PND-016. A `<qc>pending` tag — the slice-1 obligation-scope
    # deferral — defers ONLY its own obligation, NOT the whole scenario: a `@unit @integrationpending`
    # scenario (carrying NO community tag) defers the integration obligation alone, leaving the bare
    # `@unit` one un-deferred, so a passing unit observation still reconciles it satisfied — a normal
    # balance — while the deferred integration one is the scenario's single Pending Item. Where a
    # RECOGNISED community tag (@SCN-PND-016) is scenario-scope — it defers EVERY obligation — the
    # `<qc>pending` suffix is obligation-scope: one tag, one deferred check. This pins the distinction
    # so the scenario-scope machinery never over-reaches into a bare tier obligation.
    @unit @integration @SCN-PND-017
    Scenario: `@integrationpending` defers only the integration obligation (obligation-scope) — a passing unit observation still reconciles
      Given a planted fixture scenario carrying `@unit @integrationpending` and NO community deferral tag, with a passing unit observation citing it
      When the parser derives the scenario's evidence obligations and the reconciler reconciles it against that passing unit observation
      Then only the integration obligation is deferred pending — the bare unit obligation is not, so the `@integrationpending` scope is the single check
      And the unit obligation reconciles satisfied and the deferred integration one is the scenario's single Pending Item — verdict balanced, no reconciling item

    # The COMPOSITION of the two deferral sources — scenario-scope (@SCN-PND-016) and obligation-scope
    # (@SCN-PND-017) — pinned to coexist without interference. A scenario carrying `@wip` (scenario-scope)
    # over a bare `@unit` and an `@integrationpending` (obligation-scope): the unit obligation is deferred
    # by `@wip` alone (scenario-scope reaches it — there is no `@unitpending`), the integration obligation
    # is deferred by `@integrationpending` AND overlappingly by `@wip` (the two sources coincide on it,
    # the scenario-scope post-pass mark idempotent on the already-pending obligation). So BOTH obligations
    # are Pending Items — one owed from each source — verdict balanced, no reconciling item. Neither source
    # suppresses the other: obligation-scope does not narrow the scenario-scope deferral, and scenario-scope
    # does not swallow the obligation-scope Pending Item into a merged one.
    @unit @integration @SCN-PND-018
    Scenario: `@wip` and `@integrationpending` compose — both obligations pending, one from each source
      Given a planted fixture scenario carrying `@wip` over a bare `@unit` and an obligation-scope `@integrationpending`
      When the parser derives the composition scenario's evidence obligations and the reconciler reconciles it against no observation
      Then the unit obligation is deferred by the scenario-scope `@wip` and the integration obligation by the obligation-scope `@integrationpending` — both pending, one from each source
      And the scenario raises two Pending Items and has verdict balanced — no reconciling item, the two deferral sources composing without interference

    # The DECLARATION-OVERRIDES-OBSERVATION close-out of the slice-4 Rule: the recognised
    # deferral tag raises the Pending Item REGARDLESS of the observation side (slice 3 — the
    # declaration overrides the observation-derived outcome). The pending flag is set at PARSE,
    # before any observation match, so the obligation partitions to a Pending Item whatever the
    # observed side would otherwise derive. Pinned over the two sides that would ELSE reconcile
    # `missing`: a `@skip` scenario FILTERED OUT of the run (no observation at all → missing by
    # absence) and a `@wip` scenario REPORTING A PENDING STATUS (a cucumber `pending`-status step
    # the reader drops → again missing by absence). Both are instead Pending Items — never a
    # missing reconciling item — so the declaration is proven to govern from either observation
    # side, not merely against no observation (@SCN-PND-016's angle).
    @unit @integration @SCN-PND-019
    Scenario: a community deferral tag raises the Pending Item whether its scenario is filtered out (absent from the report) or reports a pending status
      Given a planted fixture — a `@skip @integration` scenario filtered out of the run, and a `@wip @integration` scenario reporting a cucumber pending status
      When the parser derives each scenario's obligations and the reconciler reconciles each against its observation side — the filtered-out one against no observation, the pending-status one against the reader's dropped output
      Then the filtered-out scenario's integration obligation is a Pending Item, not a missing reconciling item — the deferral overrides the absent observation
      And the pending-status scenario's integration obligation is a Pending Item, not a missing reconciling item — the deferral overrides the dropped observation
      And each scenario has verdict balanced and names no reconciling item — the declaration governs regardless of the observation side

    # The NEGATIVE BOUNDARY of the slice-4 Rule: a tag NOT in the recognised deferral set — an
    # unregistered project tag like `@foo` — is given NO special meaning and does NOT defer. The
    # scenario-scope deferral is gated on membership of the recognised set (the DEFAULT_DEFERRAL_TAGS
    # starter tags, or a project's configured extension @SCN-PND-021), never on any tag that merely
    # LOOKS like a deferral. So a scenario carrying `@foo` alongside a declared `@unit` obligation
    # reconciles that obligation ON ITS OBSERVATION (satisfied / failing / missing per slice 3) — here
    # a passing unit observation reconciles it satisfied — and raises NO Pending Item. This is the
    # slice-1 lexicon principle at scenario-scope: special meaning only for the recognised set;
    # everything else passes through untouched, exactly like the obligation-scope `<x>pending`
    # passthrough (@SCN-PND-003).
    @unit @integration @SCN-PND-020
    Scenario: an unrecognised tag is not treated as pending — the obligation reconciles on its observation
      Given a planted fixture scenario carrying an unrecognised `@foo` tag alongside a declared `@unit` obligation, with a passing unit observation citing it
      When the parser derives the unrecognised-tag scenario's evidence obligations and the reconciler reconciles it against that passing unit observation
      Then the unit obligation is not deferred — the unrecognised tag carries no special meaning, so it has no pending flag
      And the unit obligation reconciles satisfied and the scenario raises no Pending Item — verdict balanced, no reconciling item

    # The CONFIG-EXTENSION close-out of the slice-4 Rule: the recognised deferral-tag set is
    # CONFIGURATION. The impure CLI/ingest edge reads a project's `package.json`
    # `specController.deferralTags: string[]` (establishing the `specController` config namespace)
    # and passes DEFAULT_DEFERRAL_TAGS ∪ configured into parseScenarios (the defaulted `deferralTags`
    # param, @SCN-PND-016). A project-configured tag (e.g. `@deferred`) then defers every obligation
    # on its scenario exactly like a built-in — a Pending Item, verdict balanced. Config EXTENDS,
    # never replaces: the built-in `@wip` still defers alongside the configured tag (a project cannot
    # un-recognise `@wip`). The core stays PURE — the set is injected at the edge; the disk read of
    # `specController.deferralTags` is the impure edge's concern (the `--package-json` precedent). The
    # @unit arm proves the config read/union in isolation (a package.json object → the unioned set)
    # and the `--help` documentation (the field + the starter set single-sourced from
    # DEFAULT_DEFERRAL_TAGS, the 3F-1405 completeness discipline); this @integration arm proves a
    # configured tag defers through the full ingest→parse→reconcile pipeline over a PLANTED target
    # repo (a package.json + a feature-string). Never a real configured deferral tag in the scanned
    # features/ corpus (fixture policy, evidence-manifesto §11B).
    @unit @integration @SCN-PND-021
    Scenario: the recognised deferral-tag set is configuration — a project-configured tag defers like the built-in set
      Given a planted target repo whose package.json configures the deferral tag "@deferred", alongside a feature declaring a `@deferred @integration` scenario and a built-in `@wip @integration` one
      When the balance reconciler ingests the target — reading specController.deferralTags from its package.json and threading the extended set through the parser
      Then the project-configured `@deferred` scenario's integration obligation is a Pending Item — deferred like a built-in, verdict balanced, no reconciling item
      And the built-in `@wip` scenario still defers its integration obligation as a Pending Item — config extends the recognised set, never replaces it

    # INTERPRETATION 2 — the bare-`@wip` close-out of the slice-4 Rule. A scenario carrying a
    # recognised deferral tag (a bare `@wip` — drive-slice's convention for an authored scenario
    # awaiting its evidence: `@wip` + `@SCN`, NO evidence tag) declares ZERO evidence obligations.
    # Before this, it reconciled as BOTH-MISSING (out-of-balance) — the degenerate zero-rows-on-
    # both-sides row. Now the deferral tag synthesises ONE scenario-scope Pending Item (a
    # `qualityCheck`-less IOU — the whole scenario is deferred, owing no specific check), so the
    # scenario is deferred (pending), verdict balanced, NOT both-missing. The model change:
    # `PendingItem.qualityCheck` (and the `EvidenceObligation.qualityCheck` that feeds it) becomes
    # optional — `undefined` = scenario-scope. The render (slice 2's `⏳ pending: <check>`) handles
    # the check-less item → a bare `⏳ pending` marker; the Summary tally counts it like any Pending
    # Item. The @unit arm proves the parse synthesis + the reconcile partition in isolation; this
    # @integration arm proves the full parse→reconcile→render pipeline over a PLANTED bare-`@wip`
    # feature-string. Never a real bare-`@wip` scenario in the scanned features/ corpus (fixture
    # policy, evidence-manifesto §11B).
    @unit @integration @SCN-PND-022
    Scenario: a deferred scenario declaring no obligations is a Pending Item, not both-missing
      Given a planted fixture scenario carrying a bare `@wip` deferral tag and declaring no evidence obligations
      When the parser derives its obligations and the reconciler and renderer run the full pipeline over it
      Then the scenario synthesises one scenario-scope Pending Item and has verdict balanced — not the both-missing out-of-balance row
      And the rendered row shows a check-less `⏳ pending` marker — scenario-scope, naming no specific quality-check
