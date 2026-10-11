@PDP
Feature: a scenario-scope-and-obligation-scope composition fixture target

  A FIXTURE feature (NOT under features/) standing in for a spec whose scenario carries BOTH a
  recognised community deferral tag (`@wip`, scenario-scope) AND an obligation-scope-deferred
  `@integrationpending`, ALONGSIDE a bare `@unit` obligation. It is fed to the pure parse→reconcile
  pipeline by the @SCN-PND-018 @integration step so the COMPOSITION of the two deferral sources is
  exercised through the real parser + reconciler WITHOUT planting a real community-tagged or
  `@<qc>pending` scenario in the scanned features/ corpus (fixture policy, evidence-manifesto §11B).

  The composition: the bare `@unit` obligation is deferred by the SCENARIO-SCOPE source (`@wip`
  reaches every obligation); the `@integration` obligation is deferred by the OBLIGATION-SCOPE
  source (`@integrationpending`), and is ALSO covered by the scenario-scope `@wip` — the two
  sources overlap on it without interference (the post-pass mark is idempotent on an
  already-pending obligation). So BOTH obligations are pending → two Pending Items, one raised from
  each source, verdict balanced, no reconciling item. Where the @PDW sibling
  (community-tags.feature) proves scenario-scope alone and the @PDO sibling (obligation-scope.feature)
  proves obligation-scope alone, this pins that the two COMPOSE — neither source suppresses the other.

  This file lives under tests/fixtures/ (NOT features/), so neither the feature-code registry lint
  nor the scenario↔sub-issue gate sees @PDP / @SCN-PDP-NNN — they scan features/*.feature only.
  cucumber.js runs features/** only, so it is never executed as a scenario; it is read as a string
  via readFileSync. Its own @SCN ids are per-file (they never collide with the sibling
  community-tags @SCN-PDW-NNN / obligation-scope @SCN-PDO-NNN / composition @SCN-PDC-NNN and the rest).

  Rule: a scenario-scope `@wip` and an obligation-scope `@integrationpending` compose — both obligations pending

    @wip @unit @integrationpending @SCN-PDP-001
    Scenario: a scenario carrying @wip (scenario-scope) over a bare @unit and an obligation-scope @integrationpending
      Given a fixture step
