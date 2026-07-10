@PDX
Feature: a deferred-scenario-declaring-no-obligations fixture target

  A FIXTURE feature (NOT under features/) standing in for a spec whose scenario carries a
  recognised community deferral tag (a bare `@wip` — drive-slice's convention for an authored
  scenario still awaiting its evidence: `@wip` + `@SCN`, NO evidence tag) and so declares ZERO
  evidence obligations. It is fed to the pure parse→reconcile→renderMarkdown pipeline by the
  @SCN-PND-022 @integration step so INTERPRETATION 2 — a deferred scenario declaring no
  obligations synthesises ONE scenario-scope Pending Item, balanced NOT both-missing — is
  exercised through the real pipeline WITHOUT planting a real bare-`@wip` scenario in the scanned
  features/ corpus (fixture policy, evidence-manifesto §11B).

  A bare `@wip` scenario declares no evidence obligations. Before Interpretation 2 it reconciled
  as BOTH-MISSING (out-of-balance) — the degenerate zero-rows-on-both-sides row. Now the recognised
  deferral tag synthesises one scenario-scope Pending Item (a `qualityCheck`-less IOU), so the
  scenario is deferred (pending), verdict balanced, and renders a check-less `⏳ pending` marker —
  NOT both-missing, NOT an em-dash.

  This file lives under tests/fixtures/ (NOT features/), so neither the feature-code registry lint
  nor the scenario↔sub-issue gate sees @PDX / @SCN-PDX-NNN — they scan features/*.feature only.
  cucumber.js runs features/** only, so it is never executed as a scenario; it is read as a string
  via readFileSync. Its own @SCN ids are per-file (they never collide with the sibling
  community-tags @SCN-PDW-NNN / only-pending-balanced @SCN-PDB-NNN / render-pending @SCN-PDL-NNN).

  Rule: a deferred scenario declaring no obligations is a Pending Item, not both-missing

    @wip @SCN-PDX-001
    Scenario: a bare @wip scenario declaring no evidence obligations
      Given a fixture step
