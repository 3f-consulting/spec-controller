@EXT
Feature: an externally-specified target repo's lint scenario

  A FIXTURE feature standing in for ANOTHER repo read cross-repo by
  spec-controller via --features. It declares a @lint=<guard> static evidence obligation whose
  guard exists in the external package.json but is NOT wired into the external CI —
  the historical watermelon shape (@SCN-LNT-005, the --package-json seam).

  This file lives under tests/fixtures/ (NOT features/), so neither the feature-code
  registry lint nor the scenario↔sub-issue gate sees @EXT / @SCN-EXT-001 — they scan
  features/*.feature only.

  Rule: the external repo declares a guard over its real source

    @lint=lint:vocab-check @SCN-EXT-001
    Scenario: the external repo declares a vocabulary-check guard
      Given the external repo's domain source
      When the vocabulary-check guard is declared
      Then it is reconciled against the external repo's CI wiring
