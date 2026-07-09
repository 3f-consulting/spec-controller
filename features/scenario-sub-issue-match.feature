@SSM
Feature: The scenario sub-issue gate binds behaviour to a tracked work-unit

  spec-controller's own delivery must hold the discipline it sells: every
  behaviour-bearing change ships with an @SCN-cited test on a tracked work-item,
  or CI reds. The gate is hermetic — it verifies entirely inside CI from the
  diff's @SCN cite + the PR's own ticket handle, with no live Linear call
  (doc/decisions.md → the ported scenario↔sub-issue CI gate; parent 3F-1137).

  This feature is spec-controller's OWN light coverage of the ported gate
  (from an earlier internal tool, itself ported from an adopter's repository 3F-834) — a scenario proving the
  decision's teeth, NOT a wholesale port of the source gate-test corpus. The
  gate's enforcement over real source is proven additionally by CI itself: the
  PR-only lint:scn-subissues step runs the gate over this very PR.

  The decision is hermetic — its ticket-handle and fork-status inputs are
  injected booleans, so @unit/@integration prove the decision against fakes; the
  live CLI reads them from CI metadata (GITHUB_HEAD_REF + [3F-NNN] commit
  prefixes; the fork read arrives with @SCN-SSM-003).

  Rule: a behaviour-bearing change on a ticketed internal PR passes the gate

    @unit @integration @SCN-SSM-001
    Scenario: an added scenario code on an internal PR carrying a ticket handle passes
      Given an added scenario code on an internal PR that carries a ticket handle
      When the scenario sub-issue gate decides
      Then the gate passes

  Rule: a behaviour-bearing change on an internal PR with no ticket handle reds the gate

    The dogfooding TEETH. Internal work (a branch in the repo, non-fork) must
    bind its scenario to a tracked work-unit: a behaviour-bearing @SCN change on
    an internal PR that carries no 3F ticket handle is REJECTED — the gate reds
    and names the unbound code. Fork status is the only exemption; handle-absence
    on an internal PR is precisely the violation the gate exists to catch.

    @unit @integration @SCN-SSM-002
    Scenario: an added scenario code on an internal PR with no ticket handle is rejected
      Given a PR that adds a behaviour-bearing @SCN code, from a branch in the repo, carrying no 3F ticket handle
      When the scenario sub-issue gate runs over the fixture PR
      Then the gate reds with a violation naming the unbound code
