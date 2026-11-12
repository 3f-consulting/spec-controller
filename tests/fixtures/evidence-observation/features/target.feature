@TGT
Feature: a evidence observation-reconciliation fixture target

  A fixture target whose Vitest report the tests reconcile. It names two scenarios, so the
  report can carry a result for a named scenario, a result citing a claim code no scenario here
  names, and a result citing no claim.

  It lives under tests/fixtures/, not features/, so this repository's own checks never read its
  feature code or its claim codes.

  Rule: the fixture target names scenarios at two levels

    @unit @CLM-TGT-001
    Scenario: the target names a unit-level scenario
      Given the target repo's source

    @integration @CLM-TGT-002
    Scenario: the target names an integration-level scenario
      Given the target repo's source
