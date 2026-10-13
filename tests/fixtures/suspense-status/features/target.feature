@SST
Feature: a fixture target whose tests cite no scenario, one failing and one passing

  A fixture standing in for a target that has adopted nothing: its one scenario is
  proven, and its other tests cite no scenario, so they post to the suspense row. They
  ran in two files: one file holds a test that failed and a test that passed, and the
  other a single test that passed.

  Rule: the fixture target names one satisfied unit-level scenario

    @unit @SCN-SST-001
    Scenario: the target names a satisfied unit-level scenario
      Given the target repo's source
