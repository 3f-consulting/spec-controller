@SST
Feature: a fixture target whose tests cite no scenario, one failing and one passing

  A fixture standing in for a target that has adopted nothing: its one scenario is
  proven, and its two other tests cite no scenario, so both post to the suspense row.
  One of them failed and one passed, and the report must not show them alike.

  Rule: the fixture target names one satisfied unit-level scenario

    @unit @SCN-SST-001
    Scenario: the target names a satisfied unit-level scenario
      Given the target repo's source
