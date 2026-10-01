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

    @unit @SCN-PND-001
    Scenario Outline: <tag> raises a pending <quality-check> obligation

      Examples:
        | tag                 | quality-check |
        | @fitnesspending     | fitness       |
        | @unitpending        | unit          |
        | @integrationpending | integration   |
        | @e2epending         | e2e           |
        | @performancepending | performance   |

    @unit @SCN-PND-002
    Scenario: `@integrationpending` is not read as `@integration` — the suffix is significant

    @unit @SCN-PND-003
    Scenario: an unrecognised `<x>pending` (no such quality-check) is passed through, ignored like any unrecognised tag

  Rule: The pending result of an obligation

    @unit @SCN-PND-004
    Scenario Outline: <quality-check> — obligation raised pending → Pending Item (owed IOU)

      Examples:
        | quality-check |
        | fitness       |
        | unit          |
        | integration   |
        | e2e           |
        | performance   |

  Rule: A Pending Item is one-sided and never affects the verdict or the run

    @unit @SCN-PND-005
    Scenario: the pending tag's existence alone raises the Pending Item — no observation is sought

    @unit @SCN-PND-006
    Scenario: a Pending Item is not a Reconciling Item (it is not an error)

    @unit @SCN-PND-007
    Scenario: a scenario whose only exception is a Pending Item has verdict balanced

    @unit @SCN-PND-008
    Scenario: an Evidence Reconciliation whose only exceptions are Pending Items does not fail

    @unit @SCN-PND-009
    Scenario: `@unit @integrationpending` with a passing unit observation → verdict balanced, one Pending Item

  Rule: The Pending Item surfaces — visible and tallied, distinct from a Reconciling Item

    @unit @SCN-PND-010
    Scenario: the Pending Item shows on its Quality Check Reconciliation, labelled distinct from a Reconciling Item

    @unit @SCN-PND-011
    Scenario: the Evidence Reconciliation Summary tallies Pending Items separately from balanced and out-of-balance

    @unit @SCN-PND-012
    Scenario: a balanced scenario carrying a Pending Item is visibly distinguished from a clean-balanced one

  Rule: An observation status maps to an existing outcome — pending is never inferred from status

    @unit @SCN-PND-013
    Scenario Outline: a <result> cucumber observation for a non-deferred obligation → <outcome>

      Examples:
        | result    | outcome   |
        | passed    | satisfied |
        | failed    | failing   |
        | undefined | missing   |
        | pending   | missing   |
        | skipped   | missing   |
        | ambiguous | missing   |

    @unit @SCN-PND-014
    Scenario: an undefined step with no pending flag is reported out-of-balance (missing), not excused as pending

    @unit @SCN-PND-015
    Scenario Outline: a vitest <result> observation for a non-deferred obligation → <outcome>

      Examples:
        | result  | outcome   |
        | passed  | satisfied |
        | failed  | failing   |
        | skipped | missing   |
        | todo    | missing   |

  Rule: A recognised deferral tag raises a Pending Item, overriding the observation-derived outcome

    @unit @SCN-PND-016
    Scenario Outline: a recognised community tag <tag> defers every obligation on its scenario (scenario-scope)

      Examples:
        | tag      |
        | @wip     |
        | @ignore  |
        | @skip    |
        | @todo    |
        | @pending |

    @unit @SCN-PND-017
    Scenario: `@integrationpending` defers only the integration obligation (obligation-scope) — a passing unit observation still reconciles

    @unit @SCN-PND-018
    Scenario: `@wip` and `@integrationpending` compose — both obligations pending, one from each source

    @unit @SCN-PND-019
    Scenario: a community deferral tag raises the Pending Item whether its scenario is filtered out (absent from the report) or reports a pending status

    @unit @SCN-PND-020
    Scenario: an unrecognised tag is not treated as pending — the obligation reconciles on its observation

    @unit @SCN-PND-021
    Scenario: the recognised deferral-tag set is configuration — a project-configured tag defers like the built-in set

    @unit @SCN-PND-022
    Scenario: a deferred scenario raising no obligations is a Pending Item, not both-missing
