@PND
Feature: A pending evidence obligation raises a Pending Item

  A `<quality-check-kind>pending` tag defers that kind of quality check's evidence obligation to later work.
  The scenario still raises the obligation, marked pending, and the ledger shows it as a one-sided
  Pending Item, tallied apart from the verdict, rather than as missing evidence. The suffix is read
  apart from the bare evidence tag, so `@integrationpending` is not `@integration`. Only the five
  `<quality-check-kind>pending` tags carry this meaning: an unknown `<x>pending` tag is ignored, like any
  tag the tool does not recognise. A deferral tag, one of the built-in five (`@wip`, `@ignore`,
  `@skip`, `@todo`, `@pending`) or one the project configures, defers every obligation on its
  scenario, as the Rules below state.

  Rule: A `<quality-check-kind>pending` tag parses as a pending evidence obligation

    @unit @CLM-PND-001
    Scenario Outline: <tag> raises a pending <quality-check-kind> obligation

      Examples:
        | tag                 | quality-check-kind |
        | @fitnesspending     | fitness            |
        | @unitpending        | unit               |
        | @integrationpending | integration        |
        | @e2epending         | e2e                |
        | @performancepending | performance        |

    @unit @CLM-PND-002
    Scenario: `@integrationpending` is not read as `@integration` — the suffix is significant

    @unit @CLM-PND-003
    Scenario: an unrecognised `<x>pending` (no such kind of quality check) is passed through, ignored like any unrecognised tag

  Rule: The pending result of an obligation

    @unit @CLM-PND-004
    Scenario Outline: <quality-check-kind> — obligation raised pending → Pending Item (a raised, deferred IOU)

      Examples:
        | quality-check-kind |
        | fitness            |
        | unit               |
        | integration        |
        | e2e                |
        | performance        |

  Rule: A Pending Item is one-sided: it never affects the verdict itself, and an evidence observation at its deferred kind of quality check is not-asked-for

    @unit @CLM-PND-005
    Scenario: a passing observation at a deferred kind of quality check is not-asked-for — the Pending Item stands and the row is out of balance until the deferral tag is removed

    @unit @CLM-PND-006
    Scenario: a Pending Item is not a Reconciling Item (it is not an error)

    @unit @CLM-PND-007
    Scenario: a scenario whose only exception is a Pending Item has verdict balanced

    @unit @CLM-PND-008
    Scenario: an Evidence Reconciliation whose only exceptions are Pending Items does not fail

    @unit @CLM-PND-009
    Scenario: `@unit @integrationpending` with a passing unit observation → verdict balanced, one Pending Item

  Rule: The Pending Item surfaces — visible and tallied, distinct from a Reconciling Item

    @unit @CLM-PND-011
    Scenario: the Evidence Reconciliation Summary tallies Pending Items separately from balanced and out-of-balance

  Rule: An observation status maps to an existing outcome — pending is never inferred from status

    @unit @CLM-PND-014
    Scenario: an undefined step with no pending flag is reported out-of-balance (missing), not excused as pending

  Rule: A recognised deferral tag raises a Pending Item in place of the missing outcome a skipped or pending run would give

    @unit @CLM-PND-016
    Scenario Outline: a recognised community tag <tag> defers every obligation on its scenario (scenario-scope)

      Examples:
        | tag      |
        | @wip     |
        | @ignore  |
        | @skip    |
        | @todo    |
        | @pending |

    @unit @CLM-PND-017
    Scenario: `@integrationpending` defers only the integration obligation (obligation-scope) — a passing unit observation still reconciles

    @unit @CLM-PND-018
    Scenario: `@wip` and `@integrationpending` compose — both obligations pending, one from each source

    @unit @CLM-PND-019
    Scenario: a community deferral tag raises the Pending Item whether its scenario is filtered out (absent from the report) or reports a pending status

    @unit @CLM-PND-020
    Scenario: an unrecognised tag is not treated as pending — the obligation reconciles on its observation

    @unit @CLM-PND-021
    Scenario: the recognised deferral-tag set is configuration — a project-configured tag defers like the built-in set

    @unit @CLM-PND-022
    Scenario: a deferred scenario raising no obligations is a Pending Item, not no-quality-check
