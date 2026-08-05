@PDZ
Feature: an unrecognised-tag negative-boundary fixture target

  A FIXTURE feature (NOT under features/) standing in for a spec whose scenario carries an
  UNRECOGNISED tag (`@foo` — a tag absent from the recognised deferral set: neither a
  DEFAULT_DEFERRAL_TAGS community tag nor a `<qc>pending` obligation-scope tag) ALONGSIDE a
  named `@unit` obligation. It is fed to the pure parse→reconcile pipeline by the @SCN-PND-020
  `@integration` step (which hand-builds the passing unit observation keyed to this scenario's @SCN
  id) so the NEGATIVE BOUNDARY to @SCN-PND-016 is exercised through the real parser + reconciler
  WITHOUT planting a real community-tagged scenario in the scanned features/ corpus (fixture
  policy, evidence-manifesto §11B).

  Where the @PDW sibling (community-tags.feature) proves the SCENARIO-SCOPE deferral (@SCN-PND-016 —
  a RECOGNISED community tag defers EVERY obligation), this pins the negative boundary: an
  UNRECOGNISED `@foo` tag is given NO special meaning, so it defers NOTHING. The bare `@unit`
  obligation stays un-deferred (no pending flag) and reconciles `satisfied` against a passing unit
  observation — a genuine reconciling-side balance — and the scenario raises NO Pending Item. The
  scenario-scope machinery is gated on membership of the recognised set, never on any tag that
  merely looks like a deferral; everything else passes through untouched (the slice-1 lexicon
  principle at scenario-scope).

  This file lives under tests/fixtures/ (NOT features/), so neither the feature-code registry lint
  nor the scenario↔sub-issue gate sees @PDZ / @SCN-PDZ-NNN — they scan features/*.feature only.
  cucumber.js runs features/** only, so it is never executed as a scenario; it is read as a string
  via readFileSync. Its own @SCN ids are per-file (they never collide with the sibling
  community-tags @SCN-PDW-NNN / obligation-scope @SCN-PDO-NNN / compose-scope @SCN-PDP-NNN and the rest).

  Rule: an unrecognised tag is given no special meaning — it defers nothing

    @foo @unit @SCN-PDZ-001
    Scenario: a scenario carrying an unrecognised @foo tag alongside a named unit obligation
      Given a fixture step
