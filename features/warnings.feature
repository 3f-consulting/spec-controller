@WRN
Feature: A scenario raising no evidence obligations is both-missing

  A scenario with ZERO evidence-obligation tags (none of unit, integration,
  e2e, performance or fitness), cited by NO evidence observation, reconciles to zero rows on BOTH
  sides — nothing was required and nothing was observed. The bidirectional reconciler
  posts it as ONE degenerate Quality Check Reconciliation, outcome
  `both-missing` (label: "Evidence Obligation and Evidence Observation are both missing —
  the Scenario is untagged and uncited"), verdict `out-of-balance`.

  This SUPERSEDES the earlier zero-evidence warning: the separate
  authoring-quality axis is retired. The `warnings` section, the `warnings` JSON key, and
  the `ScenarioWarning` type dissolve entirely — the zero-evidence scenario's home is now
  a both-missing out-of-balance row in the ledger, reached via its reconciling item, NOT a
  warning excluded from the tally. The verdict stays two-valued (a both-missing scenario is
  out-of-balance via its reconciling item, never a third verdict).

  Rule: a scenario raising no evidence obligations is a both-missing out-of-balance row

    @unit @SCN-WRN-001
    Scenario: a scenario raising no evidence obligations is reported as a both-missing reconciliation, out of balance
