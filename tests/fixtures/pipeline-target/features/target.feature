@PLT
Feature: a target whose pipeline runs its unit tests and a fitness check, two of whose scenarios share a code

  A FIXTURE feature standing in for another repository, read cross-repo by spec-controller via
  --features. Beside it sit that repository's CI workflow, the record of one run of it, its unit
  test report and a package.json naming its unit runner. Together they give the JSON report what
  the every-outcome corpus does not: a fitness Quality Check Reconciliation answered by a step
  record, a shared code's two claims, the summary's behavioural runners and its step accounting.

  This file lives under tests/fixtures/ (NOT features/), so this repository's own checks,
  which scan features/*.feature only, never see the PLT code.

  Rule: the target's behaviour

    @unit @SCN-PLT-001
    Scenario: a returning customer's basket is restored

    @unit @SCN-PLT-002
    Scenario: an empty basket cannot be checked out

    @unit @SCN-PLT-002
    Scenario: a basket over its limit cannot be checked out

  Rule: the tree stays inside its thresholds

    @fitness @SCN-PLT-003
    Scenario: the codebase carries no duplicated block above its threshold
