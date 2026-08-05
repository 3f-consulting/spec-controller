@PDU
Feature: an unknown-pending fixture target

  A FIXTURE feature (NOT under features/) standing in for a spec whose scenarios carry
  tags OUTSIDE the recognised `<quality-check>pending` lexicon: an unknown `@foopending`
  (foo is no quality-check) and a plain unknown `@foo`. It is fed to the pure `parseScenarios`
  by the @SCN-PND-003 @integration step so the passthrough is exercised through the real parser
  WITHOUT planting a real `@<x>pending` scenario in the scanned features/ corpus (fixture policy,
  evidence-manifesto §11B).

  (Bare `@pending` was formerly a third witness here — but it is INSIDE the recognised community
  deferral lexicon (a DEFAULT_DEFERRAL_TAG), not an unknown tag: a bare `@pending` scenario
  naming zero obligations synthesises a scenario-scope Pending Item (@SCN-PND-022), so it no
  longer belongs in this "outside the lexicon" set. Its obligation-scope absence is proven by the
  `pendingQualityCheck("pending")` helper unit test; its synthesis by the @SCN-PND-022 arms.)

  This file lives under tests/fixtures/ (NOT features/), so neither the feature-code
  registry lint nor the scenario↔sub-issue gate sees @PDU / @SCN-PDU-NNN — they scan
  features/*.feature only. cucumber.js runs features/** only, so it is never executed as a
  scenario; it is read as a string via readFileSync. Its own @SCN ids are per-file (they
  never collide with the sibling target.feature @SCN-PDG-NNN / suffix-significance.feature
  @SCN-PDS-NNN).

  Rule: a tag outside the recognised lexicon derives no evidence obligation

    @foopending @SCN-PDU-001
    Scenario: an unknown <x>pending tag (foo is no quality-check)
      Given a fixture step

    @foo @SCN-PDU-003
    Scenario: a plain unknown tag (the reference passthrough behaviour)
      Given a fixture step
