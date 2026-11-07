@PST
Feature: a fixture target whose tests cite a scenario no feature carries, one failing and one passing

  A fixture standing in for a target whose tests cite a scenario its features have dropped:
  its one scenario is proven, and its two other tests cite CLM-PST-901, which no feature
  carries, so both post to that phantom claim's row. One of them failed and one passed, and the
  report must not show them alike.

  Rule: the fixture target names one satisfied unit-level scenario

    @unit @CLM-PST-001
    Scenario: the target names a satisfied unit-level scenario
      Given the target repo's source
