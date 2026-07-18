@WRN
Feature: A scenario declaring no evidence obligations is both-missing

  A declared scenario with ZERO evidence-obligation tags (none of unit, integration,
  e2e, performance or lint), cited by NO evidence observation, reconciles to zero rows on BOTH
  sides — nothing was required and nothing was observed. The bidirectional reconciler
  posts it as ONE degenerate Quality Check Reconciliation, outcome
  `both-missing` (label: "Evidence Obligation and Evidence Observation are both missing —
  the Scenario is untagged and uncited"), verdict `out-of-balance`.

  This SUPERSEDES the earlier `no-evidence-declared` warning: the separate
  authoring-quality axis is retired. The `warnings` section, the `warnings` JSON key, and
  the `ScenarioWarning` type dissolve entirely — the zero-evidence scenario's home is now
  a both-missing out-of-balance row in the ledger, reached via its reconciling item, NOT a
  warning excluded from the tally. The verdict stays two-valued (a both-missing scenario is
  out-of-balance via its reconciling item, never a third verdict).

  Rule: a scenario declaring no evidence obligations is a both-missing out-of-balance row

    @unit @integration @SCN-WRN-001
    Scenario: a scenario declaring no evidence obligations is reported as a both-missing reconciliation, out of balance
      Given a declared scenario "SCN-WRN-001" with no evidence-obligation tags
      When the reconciler runs over the declared scenarios
      Then the ledger reports "SCN-WRN-001" as a both-missing reconciliation, out of balance
      And the report carries no warnings section
