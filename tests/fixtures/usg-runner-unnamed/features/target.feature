@TRN
Feature: a fixture target naming its unit runner, read for what it says about the others

  ONE OF A PAIR, AND THE PAIR IS THE POINT. This corpus, the workflow beside it and the
  manifest's scripts are BYTE-IDENTICAL across tests/fixtures/usg-runner-none and
  tests/fixtures/usg-runner-unnamed; the only difference between the two targets is that one
  manifest carries "performance": null and the other carries no performance key at all. A
  control is only a control if it is otherwise the same, so the difference between the two
  reports can be attributed to the one place the two targets differ. The arm asserts that
  identity rather than trusting it.

  The unit tier is named in both, and is here so each report carries a recognition as well as
  the account of what the target did not name — a target saying nothing at all is a different
  scenario (SCN-USG-017).

  Rule: a rule with no static-check tag

    @unit @SCN-TRN-001
    Scenario: the target source is exercised
      Given the target source
