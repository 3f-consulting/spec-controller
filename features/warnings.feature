@WRN
Feature: A scenario raising no evidence obligations is no-quality-check

  A scenario with ZERO evidence-obligation tags (none of unit, integration,
  e2e, performance or fitness), cited by NO evidence observation, reconciles to zero rows on BOTH
  sides — no Evidence Obligation was raised and nothing was observed. The bidirectional reconciler
  posts it as ONE degenerate Quality Check Reconciliation, outcome
  `no-quality-check` (label: "Executable claim asks for no quality check: it carries a claim code
  and no kind-of-check tag, and nothing cites it"), verdict `out-of-balance`.

  The report has no separate warnings section and no warnings key: a scenario with no
  evidence is a no-quality-check out-of-balance row in the ledger, reached via its reconciling
  item, NOT a warning excluded from the tally. The verdict stays two-valued (a no-quality-check scenario is
  out-of-balance via its reconciling item, never a third verdict).

  Rule: a scenario raising no evidence obligations is a no-quality-check out-of-balance row

    @unit @CLM-WRN-001
    Scenario: a scenario raising no evidence obligations is reported as a no-quality-check reconciliation, out of balance
