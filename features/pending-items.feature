@PND
Feature: A pending evidence obligation raises a Pending Item

  A `<quality-check>pending` tag (evidence-manifesto §11B) raises an evidence
  obligation that is owed but deliberately deferred to a later slice. This slice is
  the PARSE only: it recognises the tag and derives a pending obligation. What a
  pending obligation *does* on the ledger — the one-sided Pending Item — is slice 2.

  Seam: parse/scenarios.ts derives EvidenceObligation[] from a scenario's tags. A
  `<qc>pending` tag over a RECOGNISED quality-check derives `{ qualityCheck: <qc>, pending: true }`
  — the obligation gains a `pending?: boolean` flag (absent = a normal obligation).
  `@fitnesspending` derives `{ qualityCheck: "fitness", pending: true }` with NO check payload
  (one-sided; the check does not exist yet). The `pending` suffix is significant: a SEPARATE
  recognition from the bare tier tag, so `@integrationpending` is not `@integration`. We give
  special meaning ONLY to our recognised lexicon (the five `<qc>pending`); anything outside it
  — an unknown `<x>pending`, or bare `@pending` — is ignored silently, exactly like any
  unrecognised tag. We do not police the developer's tags.

  Fixture policy: exercised over planted feature-strings under tests/fixtures/ fed to the
  pure parser — never a real `@<qc>pending` scenario in the scanned features/ corpus.

  Rule: A `<quality-check>pending` tag parses as a pending evidence obligation

    @unit @integration @SCN-PND-001
    Scenario Outline: <tag> raises a pending <quality-check> obligation
      Given a planted fixture scenario tagged "<tag>"
      When the parser derives its evidence obligations
      Then it raises a pending "<quality-check>" obligation

      Examples:
        | tag                 | quality-check |
        | @fitnesspending     | fitness       |
        | @unitpending        | unit          |
        | @integrationpending | integration   |
        | @e2epending         | e2e           |
        | @performancepending | performance   |

    @unit @integration @SCN-PND-002
    Scenario: `@integrationpending` is not read as `@integration` — the suffix is significant
      Given the planted suffix-significance fixture — a bare `@integration` scenario alongside an `@integrationpending` one
      When the parser derives each scenario's evidence obligations
      Then the bare `@integration` scenario raises a plain "integration" obligation and no pending one
      And the `@integrationpending` scenario raises a pending "integration" obligation and no plain one

    @unit @integration @SCN-PND-003
    Scenario: an unrecognised `<x>pending` (no such quality-check) is passed through, ignored like any unrecognised tag
      Given the planted unknown-pending fixture — an `@foopending` scenario and a plain unknown `@foo` scenario
      When the parser derives each unknown scenario's evidence obligations
      Then every scenario raises no evidence obligation — the unknown `<x>pending` is ignored exactly like the plain unknown tag

  Rule: The pending result of an obligation

    @unit @integration @SCN-PND-004
    Scenario Outline: <quality-check> — obligation raised pending → Pending Item (owed IOU)
      Given a planted fixture scenario raising a pending "<quality-check>" obligation
      When the reconciler reconciles it against no observation
      Then the scenario raises exactly one Pending Item for "<quality-check>"
      And the scenario posts no both-missing reconciling item — nothing is reconciled

      Examples:
        | quality-check |
        | fitness       |
        | unit          |
        | integration   |
        | e2e           |
        | performance   |

  Rule: A Pending Item is one-sided and never affects the verdict or the run

    @unit @integration @SCN-PND-005
    Scenario: the pending tag's existence alone raises the Pending Item — no observation is sought
      Given a planted fixture scenario raising a pending "integration" obligation, with a matching integration observation citing it
      When the reconciler reconciles the fixture against that matching observation
      Then the scenario raises exactly one Pending Item for "integration"
      And the matching observation IS flagged no-evidence-obligation — a pending obligation names nothing, so nothing is attributed to it
      And the scenario's row is out of balance and the run exits 1

    @unit @integration @SCN-PND-006
    Scenario: a Pending Item is not a Reconciling Item (it is not an error)
      Given a planted fixture scenario raising a pending "integration" obligation alongside a genuinely missing "unit" obligation
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
      Given a planted fixture scenario raising `@unit @integrationpending`, with a passing unit observation citing it
      When the reconciler reconciles the composition fixture against that passing unit observation
      Then the unit obligation reconciles satisfied — a genuine reconciling-side balance
      And the deferred integration obligation is the scenario's one Pending Item, partitioned off
      And the scenario has verdict balanced and names no reconciling item — the pending and non-pending obligations coexist without interference

  Rule: The Pending Item surfaces — visible and tallied, distinct from a Reconciling Item

    @unit @integration @SCN-PND-010
    Scenario: the Pending Item shows on its Quality Check Reconciliation, labelled distinct from a Reconciling Item
      Given a planted render fixture — a balanced-with-pending scenario and one mixing a genuinely-missing unit error with a deferred integration obligation
      When the report is rendered from the reconciled fixture
      Then the balanced scenario's row shows its deferred integration obligation as a Pending Item, labelled distinct from a reconciling item
      And the mixed scenario's row shows the missing unit error and the deferred integration Pending Item as separate, distinctly-labelled categories
      And no Pending Item is rendered as a reconciling item — the deferred integration check never appears as a missing or failing error

    @unit @integration @SCN-PND-011
    Scenario: the Evidence Reconciliation Summary tallies Pending Items separately from balanced and out-of-balance
      Given a planted summary-tally fixture — scenarios carrying Pending Items alongside a genuinely-missing error, spanning balanced and out-of-balance
      When the report is assembled and rendered from the reconciled fixture
      Then the materialised summary tallies the Pending Items, a count apart from the scenario balanced and out-of-balance counts
      And the tally counts Pending Items, not scenarios carrying them — one deferred obligation is one Pending Item
      And the rendered Evidence reconciliation shows the Pending Items tally, never an out-of-balance leaf at any count

    @unit @integration @SCN-PND-012
    Scenario: a balanced scenario carrying a Pending Item is visibly distinguished from a clean-balanced one
      Given a planted balanced-contrast fixture — a clean-balanced scenario alongside a balanced-with-pending one, both verdict balanced
      When the report is rendered from the reconciled balanced-contrast fixture, the clean-balanced scenario's unit observation supplied
      Then the clean-balanced scenario's balanced row shows the em-dash placeholder — nothing outstanding
      And the balanced-with-pending scenario's balanced row shows the ⏳ pending label instead — owed work, never an error
      And the two balanced rows read differently at a glance — the pending row is not the clean-balanced em-dash

  Rule: An observation status maps to an existing outcome — pending is never inferred from status

    @unit @integration @SCN-PND-013
    Scenario Outline: a <result> cucumber observation for a non-deferred obligation → <outcome>
      Given a planted integration evidence obligation and a cucumber report whose step status is "<result>"
      When the cucumber reader parses the report and the reconciler reconciles the obligation
      Then the integration evidence obligation reconciles "<outcome>"

      Examples:
        | result    | outcome   |
        | passed    | satisfied |
        | failed    | failing   |
        | undefined | missing   |
        | pending   | missing   |
        | skipped   | missing   |
        | ambiguous | missing   |

    @unit @integration @SCN-PND-014
    Scenario: an undefined step with no pending flag is reported out-of-balance (missing), not excused as pending
      Given a planted integration evidence obligation carrying no pending flag, and a cucumber report whose step is undefined
      When the cucumber reader drops the undefined step and the reconciler reconciles the obligation
      Then the scenario verdict is out-of-balance, its integration obligation a missing reconciling item
      And the scenario raises no Pending Item — the undefined step is not excused as pending

    @unit @integration @SCN-PND-015
    Scenario Outline: a vitest <result> observation for a non-deferred obligation → <outcome>
      Given a planted unit evidence obligation and a vitest report whose assertion status is "<result>"
      When the vitest reader parses the report and the reconciler reconciles the obligation
      Then the unit evidence obligation reconciles "<outcome>"

      Examples:
        | result  | outcome   |
        | passed  | satisfied |
        | failed  | failing   |
        | skipped | missing   |
        | todo    | missing   |

  Rule: A recognised deferral tag raises a Pending Item, overriding the observation-derived outcome

    @unit @integration @SCN-PND-016
    Scenario Outline: a recognised community tag <tag> defers every obligation on its scenario (scenario-scope)
      Given a planted fixture scenario carrying the community tag "<tag>" alongside a `@unit` and an `@integration` obligation
      When the parser derives the scenario's evidence obligations and the reconciler reconciles it against no observation
      Then both the unit and integration evidence obligations are deferred — pending, overriding their observation-derived outcome
      And the scenario raises two Pending Items and has verdict balanced — no reconciling item

      Examples:
        | tag      |
        | @wip     |
        | @ignore  |
        | @skip    |
        | @todo    |
        | @pending |

    @unit @integration @SCN-PND-017
    Scenario: `@integrationpending` defers only the integration obligation (obligation-scope) — a passing unit observation still reconciles
      Given a planted fixture scenario carrying `@unit @integrationpending` and NO community deferral tag, with a passing unit observation citing it
      When the parser derives the scenario's evidence obligations and the reconciler reconciles it against that passing unit observation
      Then only the integration obligation is deferred pending — the bare unit obligation is not, so the `@integrationpending` scope is the single check
      And the unit obligation reconciles satisfied and the deferred integration one is the scenario's single Pending Item — verdict balanced, no reconciling item

    @unit @integration @SCN-PND-018
    Scenario: `@wip` and `@integrationpending` compose — both obligations pending, one from each source
      Given a planted fixture scenario carrying `@wip` over a bare `@unit` and an obligation-scope `@integrationpending`
      When the parser derives the composition scenario's evidence obligations and the reconciler reconciles it against no observation
      Then the unit obligation is deferred by the scenario-scope `@wip` and the integration obligation by the obligation-scope `@integrationpending` — both pending, one from each source
      And the scenario raises two Pending Items and has verdict balanced — no reconciling item, the two deferral sources composing without interference

    @unit @integration @SCN-PND-019
    Scenario: a community deferral tag raises the Pending Item whether its scenario is filtered out (absent from the report) or reports a pending status
      Given a planted fixture — a `@skip @integration` scenario filtered out of the run, and a `@wip @integration` scenario reporting a cucumber pending status
      When the parser derives each scenario's obligations and the reconciler reconciles each against its observation side — the filtered-out one against no observation, the pending-status one against the reader's dropped output
      Then the filtered-out scenario's integration obligation is a Pending Item, not a missing reconciling item — the deferral overrides the absent observation
      And the pending-status scenario's integration obligation is a Pending Item, not a missing reconciling item — the deferral overrides the dropped observation
      And each scenario has verdict balanced and names no reconciling item — the pending flag governs regardless of the observation side

    @unit @integration @SCN-PND-020
    Scenario: an unrecognised tag is not treated as pending — the obligation reconciles on its observation
      Given a planted fixture scenario carrying an unrecognised `@foo` tag alongside a `@unit` evidence obligation, with a passing unit observation citing it
      When the parser derives the unrecognised-tag scenario's evidence obligations and the reconciler reconciles it against that passing unit observation
      Then the unit obligation is not deferred — the unrecognised tag carries no special meaning, so it has no pending flag
      And the unit obligation reconciles satisfied and the scenario raises no Pending Item — verdict balanced, no reconciling item

    @unit @integration @SCN-PND-021
    Scenario: the recognised deferral-tag set is configuration — a project-configured tag defers like the built-in set
      Given a planted target repo whose package.json configures the deferral tag "@deferred", alongside a feature carrying a `@deferred @integration` scenario and a built-in `@wip @integration` one
      When the balance reconciler ingests the target — reading specController.deferralTags from its package.json and threading the extended set through the parser
      Then the project-configured `@deferred` scenario's integration obligation is a Pending Item — deferred like a built-in, verdict balanced, no reconciling item
      And the built-in `@wip` scenario still defers its integration obligation as a Pending Item — config extends the recognised set, never replaces it

    @unit @integration @SCN-PND-022
    Scenario: a deferred scenario raising no obligations is a Pending Item, not both-missing
      Given a planted fixture scenario carrying a bare `@wip` deferral tag and raising no evidence obligations
      When the parser derives its obligations and the reconciler and renderer run the full pipeline over it
      Then the scenario synthesises one scenario-scope Pending Item and has verdict balanced — not the both-missing out-of-balance row
      And the rendered row shows a check-less `⏳ pending` marker — scenario-scope, naming no specific quality-check
