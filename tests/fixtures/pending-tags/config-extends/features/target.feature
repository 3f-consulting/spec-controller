@CFG
Feature: a planted target repo configuring an extra deferral tag

  A FIXTURE target repo read cross-repo by spec-controller via --features + --package-json
  (@SCN-PND-021). Its package.json configures `specController.deferralTags: ["deferred"]`, so
  the project tag `@deferred` must defer like a built-in. The built-in `@wip` still defers
  alongside it — config EXTENDS the recognised set, never replaces it.

  This file lives under tests/fixtures/ (NOT features/), so neither the feature-code registry
  lint nor the scenario↔sub-issue gate sees @CFG / @SCN-CFG-001 — they scan features/*.feature
  only.

  Rule: a configured deferral tag defers like a built-in

    @deferred @integration @SCN-CFG-001
    Scenario: a project-configured deferral tag defers its obligation
      Given the target repo's domain behaviour
      When the configured @deferred scenario is reconciled
      Then its integration obligation is deferred as a Pending Item

    @wip @integration @SCN-CFG-002
    Scenario: a built-in deferral tag still defers under configuration
      Given the target repo's domain behaviour
      When the built-in @wip scenario is reconciled
      Then its integration obligation is deferred as a Pending Item
