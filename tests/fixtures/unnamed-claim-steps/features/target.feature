@SSP
Feature: a fixture target whose CI runs two checks that cite no scenario

  A fixture standing in for a target that has adopted nothing: its one scenario is
  proven, and everything else it ran cites no scenario, so it posts to the unnamed claim's row.
  Its CI runs two checks, lint:bar and lint:foo, that no scenario cites, and one of its
  tests cites no scenario either, so the CI steps' entry is seen beside a file's entry.

  Rule: the fixture target names one satisfied unit-level scenario

    @unit @CLM-SSP-001
    Scenario: the target names a satisfied unit-level scenario
      Given the target repo's source
