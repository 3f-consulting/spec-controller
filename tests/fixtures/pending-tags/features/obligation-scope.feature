@PDO
Feature: an obligation-scope-vs-scenario-scope contrast fixture target

  A FIXTURE feature (NOT under features/) standing in for a spec whose scenario declares BOTH a
  bare `@unit` obligation AND an obligation-scope-deferred `@integrationpending` one, and carries
  NO recognised community deferral tag. It is fed to the pure parse→reconcile pipeline by the
  `@SCN-PND-017` @integration step (which hand-builds the passing unit observation keyed to this
  scenario's @SCN id) so the SCOPE CONTRAST to @SCN-PND-016 is exercised through the real parser +
  reconciler WITHOUT planting a real `@<qc>pending` scenario in the scanned features/ corpus
  (fixture policy, evidence-manifesto §11B).

  Where the @PDW sibling (community-tags.feature) proves the SCENARIO-SCOPE deferral (@SCN-PND-016 —
  a community tag defers EVERY obligation), this pins the OBLIGATION-SCOPE contrast: a
  `@integrationpending` tag defers ONLY the integration obligation, leaving the bare `@unit` one
  un-deferred. So the bare `@unit` obligation reconciles `satisfied` against a passing unit
  observation (a genuine reconciling-side balance), while the `@integrationpending` one partitions
  off to exactly one one-sided Pending Item — verdict balanced, no reconciling item. Absent any
  community tag, the scenario-scope machinery must NOT over-reach into the bare unit obligation.

  This file lives under tests/fixtures/ (NOT features/), so neither the feature-code registry lint
  nor the scenario↔sub-issue gate sees @PDO / @SCN-PDO-NNN — they scan features/*.feature only.
  cucumber.js runs features/** only, so it is never executed as a scenario; it is read as a string
  via readFileSync. Its own @SCN ids are per-file (they never collide with the sibling
  community-tags @SCN-PDW-NNN / composition @SCN-PDC-NNN / target.feature @SCN-PDG-NNN and the rest).

  Rule: an `@<qc>pending` tag defers only its own obligation, not the whole scenario

    @unit @integrationpending @SCN-PDO-001
    Scenario: a scenario carrying a passing unit obligation alongside an obligation-scope-deferred integration one, no community tag
      Given a fixture step
