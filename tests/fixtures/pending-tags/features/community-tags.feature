@PDW
Feature: a community-deferral-tag fixture target

  A FIXTURE feature (NOT under features/) standing in for a spec whose scenarios each carry a
  recognised community deferral tag (@wip / @ignore / @skip / @todo / @pending — the established
  Cucumber conventions) ALONGSIDE a declared `@unit` and `@integration` obligation. It is fed to
  the pure parse→reconcile pipeline by the @SCN-PND-016 @integration step so the SCENARIO-SCOPE
  deferral is exercised through the real parser + reconciler WITHOUT planting a real community-
  tagged scenario in the scanned features/ corpus (fixture policy, evidence-manifesto §11B).

  Each scenario declares BOTH a `@unit` and an `@integration` obligation and carries exactly one
  community deferral tag, so a scenario-scope deferral must mark BOTH obligations pending → two
  Pending Items, verdict balanced (the Pending Item is verdict-neutral). One scenario per
  recognised tag (the five DEFAULT_DEFERRAL_TAGS starter set), so every recognised tag is proven.

  This file lives under tests/fixtures/ (NOT features/), so neither the feature-code registry
  lint nor the scenario↔sub-issue gate sees @PDW / @SCN-PDW-NNN — they scan features/*.feature
  only. cucumber.js runs features/** only, so it is never executed as a scenario; it is read as a
  string via readFileSync. Its own @SCN ids are per-file (they never collide with the sibling
  target.feature @SCN-PDG-NNN / suffix-significance @SCN-PDS-NNN / unknown-pending @SCN-PDU-NNN /
  the reconcile/render siblings @SCN-PDM/PDE/PDB/PDR/PDC/PDL/PDT/PDD-NNN).

  Rule: a recognised community tag defers every obligation on its scenario

    @wip @unit @integration @SCN-PDW-001
    Scenario: a @wip scenario declaring a unit and an integration obligation
      Given a fixture step

    @ignore @unit @integration @SCN-PDW-002
    Scenario: an @ignore scenario declaring a unit and an integration obligation
      Given a fixture step

    @skip @unit @integration @SCN-PDW-003
    Scenario: a @skip scenario declaring a unit and an integration obligation
      Given a fixture step

    @todo @unit @integration @SCN-PDW-004
    Scenario: a @todo scenario declaring a unit and an integration obligation
      Given a fixture step

    @pending @unit @integration @SCN-PDW-005
    Scenario: a @pending scenario declaring a unit and an integration obligation
      Given a fixture step
