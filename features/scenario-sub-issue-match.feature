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

  Rule: a fork-sourced external PR is exempt from the gate

    The community-contribution CARVE-OUT. A fork-sourced (external) PR — one
    whose head repo differs from the base repo — is EXEMPT: even a
    behaviour-bearing @SCN change carrying no 3F ticket handle is skipped
    silently and exits 0, so the methodology dogfoods on internal PRs without
    auto-rejecting outside contributors. Fork status — read from the GitHub PR
    event payload (head.repo.full_name != base.repo.full_name) — is the ONLY
    exemption signal; handle-absence is NEVER exempting (that is precisely the
    violation the gate exists to catch, and a no-handle INTERNAL PR still reds —
    see SSM-002). The decision stays hermetic: given isExternalPr the pure
    decision returns no violation; only the live CLI reads the payload.

    @unit @integration @SCN-SSM-003
    Scenario: a fork-sourced external PR is exempt from the gate
      Given a fork-PR fixture whose head repo differs from the base repo, adding a behaviour-bearing @SCN code with no 3F ticket handle
      When the scenario sub-issue gate runs over the fork-PR fixture
      Then the gate is exempt and exits 0 with no violation

  Rule: the cite check reads the checked-out test files, not the diff

    The guard conflates two questions. WHICH @SCN codes changed is a question
    about the DIFF — unchanged. Whether a changed @SCN is CITED is a question
    about the TEST FILE AS IT NOW STANDS, and reading it from the diff mistakes
    "the cite line wasn't in this hunk" for "the cite is absent". A rename-shaped
    change is exactly that shape: the src rename churns the `it`-body while its
    cite, on the enclosing describe/it, stays a CONTEXT line — so the
    diff-only scan reads a cited scenario as uncited and reds a valid PR (lived:
    3F-1725, the @SCN-API-001 rename; it erred safe but cost a CI cycle and would
    fire on every future rename). The fix keeps the guard hermetic: the cite scan
    reads the CHECKED-OUT content of the changed test files — still the local
    tree, still no Linear call. The diff remains the CHANGE-DETECTOR; only the
    cite check moves to live file state.

    @unit @integration @SCN-SSM-004
    Scenario: a rename inside a cited it-body, its @SCN cite line unchanged, passes the gate
      Given a PR whose src rename edits the body of a test whose @SCN cite line is left unchanged, on a branch carrying a 3F ticket handle
      When the scenario sub-issue gate runs over the rename-shaped fixture PR
      Then the gate passes and exits 0, having read the @SCN as cited

  Rule: a changed test block carries its own cite — a sibling's cite does not vouch for it

    SSM-004 moved the cite scan from the diff to live file state — correct, but it
    coarsened the question to FILE level: "does this changed test FILE cite some
    scenario?" rather than "does the CHANGED TEST cite one?". So new behaviour, proven
    by a new UNCITED test block, slipped through whenever some OTHER untouched test in
    the same file happened to carry a cite. That is a false negative in the gate whose
    entire job is to catch exactly that (the 3F-805 leak).

    A cite is attributed to the BLOCK it annotates, and a changed block must carry one
    of its own — inherited from an enclosing describe, or on the block itself. A cite on
    a SIBLING test does not vouch for it.

    Inheritance is deliberate: this codebase cites on the describe (148 of them) and the
    its beneath inherit it, so a test inside a cited describe IS claiming that scenario —
    the convention working, not a hole. The rename fix (SSM-004) survives intact: a
    churned it-body is a TOUCHED block whose cite, unchanged line and all, is still bound
    to it.

    @unit @integration @SCN-SSM-005
    Scenario: a new uncited test block in a file that cites elsewhere reds the gate
      Given a PR adding new src behaviour proven by a new UNCITED test block, in a test file whose other, untouched tests carry @SCN cites, on a branch carrying a 3F ticket handle
      When the scenario sub-issue gate runs over the sibling-cited fixture PR
      Then the gate reds, naming the uncited test block

  Rule: the scn-subissues static check's own CI run reconciles on spec-controller's Ledger

    THE COBBLER'S SHOES, THE LAST PAIR. lint:scn-subissues runs in spec-controller's own
    CI over its own source and exists as a package.json script, so the running-static-check
    observer emits its run into the evidence stream on every reconcile. The other side was
    missing: no scenario NAMED it. A run nothing names has no Evidence Obligation to settle
    against, so it folded onto the suspense scenario as an uncited static check — an
    instance, on the tool's own books, of exactly the class uncited-static-checks.feature
    exists to name. A gate that is not reconciled on its own Ledger is honour, not
    mechanism.

    The @lint=lint:scn-subissues tag below is what closes it. The tag raises the Evidence
    Obligation the CI run settles, so the run is credited to THIS scenario instead of the
    suspense row — the @SCN-CPX-003 / @SCN-VOC-011 / @SCN-NCR-001 precedent, where observed
    AND declared is the balanced state. The `lint:` prefix is load-bearing on the other
    side of the same pairing: runningStaticChecks observes a CI script only when its name
    carries an observed prefix, so a name outside that set would run in CI while being
    invisible to spec-controller's own ledger.

    WHAT THIS ASSERTS THAT SSM-001..005 DO NOT. The siblings above pin the gate's DECISION
    over fixtures — what it passes and what it reds. This one pins the check's own
    RECONCILIATION over the real tree, and asserts it FIRES rather than merely exists: the
    script being present in package.json is only half the observation, and a check that
    exists but that no CI step invokes is the WATERMELON, not a green. So both halves are
    asserted — exists AND enforced over real source — and then that the reconcile posts
    that run to this scenario, leaving no static check uncited on the suspense row.

    @unit @integration @lint=lint:scn-subissues @SCN-SSM-006
    Scenario: the scenario sub-issue check's own CI run is credited to the scenario declaring it
      Given the scn-subissues static check, wired over spec-controller's own source
      When spec-controller's own tree is reconciled
      Then the check's run is credited to the scenario that declares it
      And no static check run is left uncited on the suspense scenario
