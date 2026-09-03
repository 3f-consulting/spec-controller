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

    The bare @traceability tag on the fitness scenario at the foot of this file is what
    closes it. The tag raises the Evidence Obligation the CI run settles, so the run is
    credited to THAT scenario instead of the suspense row — the precedent set by the
    scenarios @SCN-CPX-003, @SCN-VOC-011 and @SCN-NCR-001, where observed AND required is
    the balanced state. The `lint:` prefix is load-bearing on the other
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

    @unit @integration @SCN-SSM-006
    Scenario: the scenario sub-issue check's own CI run is credited to the scenario naming it
      Given the scn-subissues static check, wired over spec-controller's own source
      When spec-controller's own tree is reconciled
      Then the check's run is credited to the scenario that names it
      And no static check run is left uncited on the suspense scenario

  Rule: a describe whose title carries braces stays open over the its beneath it

    A PARSER FAULT WEARING THE COSTUME OF A VIOLATION. Block nesting is found by
    counting braces, and the count reads the whole line — including the braces
    inside the title string itself. The parser's own note says why that was
    thought safe: a block's opening line "nets +1" from its `() => {`. It does,
    until the title carries braces of its own. A template-literal title with an
    interpolation puts `{`, `}` on the line BEFORE the arrow's `{`, so the count
    returns to the enclosing depth and the block is closed on the very line it
    opened; a plain-quoted title naming an object shape does the same.

    Everything beneath then parses as a top-level block with an empty ancestor
    chain, so the describe's @SCN never reaches its `it`s and a properly cited
    test is reported as uncited. That is the gate's teeth pointed at a compliant
    author — the failure mode most likely to get a gate switched off. It is live
    in this tree today (a describe naming `{ storeRoot, target, runId }` over
    three `it`s), and masked only while a feature @SCN delta routes the decision
    down the other arm; under the self-reconciliation CI gate the false row reds
    a valid build.

    Braces inside a string are not block structure. The line is read as a lexer
    rather than counted as characters — a `{` or `}` inside a quoted string, a
    template literal, or a `${…}` interpolation nests nothing — so the describe
    stays open across its children and the its beneath inherit its cite.

    WHAT THIS ASSERTS THAT SSM-005 DOES NOT. SSM-005 pins that a cite INHERITS
    down an ancestor chain the parser found; this pins that the chain is found at
    all. The inheritance rule is worth nothing if the ancestor was never open.

    @unit @integration @SCN-SSM-007
    Scenario: an it beneath a brace-titled cited describe reads as cited
      Given a PR touching an it beneath a cited describe whose title literal carries braces, on a branch carrying a 3F ticket handle
      When the scenario sub-issue gate runs over the brace-titled fixture PR
      Then the gate passes and exits 0, the it having inherited the describe's cite

  Rule: the cite scan counts the bracketed token — a prose mention does not vouch for a block

    THE GATE'S HALF OF THE FALSE-CITATION CLASS. The cite scan matched
    `/@?(SCN-[A-Z0-9]+-\d+)/g` on any test-call line, so a block whose title merely
    NAMED a scenario id read as cited. The ledger's arm (SCN-LDG-032, SCN-LDG-033)
    is the same root pointing the other way: there a mention minted a phantom
    scenario and redded; here it vouches for a block nobody bound to anything, and
    NOTHING reds. A false green on the one check whose job is proving
    scenario-binds-test-and-code.

    It is the easier half to miss for exactly that reason. A phantom scenario
    announces itself in the next balance run; a block wrongly counted as cited
    announces nothing, and the leak it was built to catch — new behaviour shipped
    with no scenario behind it — ships green. The two arms are one rule and land
    together, over one shared matcher, because two copies of "what a citation looks
    like" is how these readers drifted apart to begin with.

    The bracket is canon's vitest form. A mention of a scenario id in a title —
    comparing against it, naming the fixture it came from, crediting the ruling it
    implements — is ordinary prose in this repository and stays free to write.

    @unit @integration @SCN-SSM-008
    Scenario: a changed test block whose title names a scenario id only in prose reds as uncited
      Given a PR whose new behaviour is proven by a test block naming a scenario id only in its title's prose, on a branch carrying a 3F ticket handle
      When the scenario sub-issue gate runs over the prose-titled fixture PR
      Then the gate reds, naming the block whose title only mentions a scenario id

  Rule: every behaviour-bearing scenario change in this repository is bound to a tracked work item

    THE OBLIGATION @SCN-SSM-006 USED TO CARRY, now held by the shape that fits it. SSM-006
    asserts the RECONCILIATION — that the check's run is credited and nothing is left uncited
    — over the real tree, which is a behaviour with steps and stays exactly as it was. What it
    also used to do, through the retired tag form, was raise spec-controller's own Evidence
    Obligation for the run. That is a whole-system characteristic of this repository rather
    than an example of anything, so it is stated as one below and the bare `@traceability`
    tag raises it there.

    THE CHECK IS PULL-REQUEST-ONLY, AND THAT DOES NOT WEAKEN THE ROW. Its CI step is guarded
    by `if: github.event_name == 'pull_request'`, because it judges a diff against a base that
    only a pull request supplies. The ledger reads the workflow, not the run's outcome — the
    step is present, so the check is observed as enforced over real source, exactly as it was
    under the retired form.

    @traceability @SCN-SSM-009
    Scenario: every behaviour-bearing scenario code changed on a pull request is bound to a ticketed one

  Rule: an updated scenario code is the code of a scenario whose text changed

    A PROXY REPORTED AS A PURPOSE. The updated-code detector accumulated per HUNK: it
    collected every @SCN code sitting on a CONTEXT line and, once any other line in that
    hunk changed, reported those codes as updated. The measurement is TRUE — those codes
    are in the hunk — and it answers a different question from the one the check asks.
    "Which tag lines fall inside this hunk" is a fact about the DIFF; "which scenario
    contains this change" is a fact about the CORPUS.

    THE LAST STEP OF A SCENARIO IS AN ORDINARY PLACE TO CHANGE, and it is exactly where
    the two answers come apart. Unified diff carries three lines of context, so an edit to
    a scenario's last step leaves that scenario's own tag line — five lines up, past its
    steps — OUTSIDE the window, while the FOLLOWING scenario's tag line, two lines below,
    sits inside it. The code reported is the neighbour's: measured on PR #239, where
    scenario @SCN-LAD-004 was edited and @SCN-LAD-005 was named. An edit to a scenario's
    FIRST step gets the right answer, which is the whole reason the fault stayed invisible.

    WIDENING THE CONTEXT IS RULED OUT, and not on cost. Every width is wrong for a scenario
    longer than it, and a wider window pulls in MORE neighbours' tag lines — so the setting
    that finally reaches the scenario above starts crediting the two below. No number makes
    hunk-locality mean scenario-membership, because hunk boundaries are a function of git's
    settings and of what else changed nearby.

    SO THE QUESTION IS PUT TO THE TWO FILES. Not "which scenario contains this line" —
    that keeps a position in the question, and a position can only come from the diff —
    but "which scenarios' text differs between the base and the head". Two sources in, a
    set of codes out: no line arithmetic, no hunk boundaries, no context width anyone has
    to defend. It is the @SCN-SSM-004 move (3F-1741) made once more on the arm that never
    received it, and the diff keeps the jobs it is genuinely good at — which files changed,
    which tag lines were added or removed.

    @unit @integration @SCN-SSM-010
    Scenario: a change to a scenario's last step names that scenario, not the next one
      Given a PR whose only Gherkin change edits the LAST step of a scenario that is immediately followed by another scenario's tag line
      When the scenario sub-issue gate runs over the last-step fixture PR
      Then the gate reports the edited scenario's code updated, and does not name the following scenario

    @unit @integration @SCN-SSM-011
    Scenario: a step removed from a scenario still names that scenario
      THIS ROW EXISTS BECAUSE IT IS THE CASE THE OBVIOUS FIX SILENTLY DROPS. The natural
      cure for the row above is positional: take the changed line numbers off the hunk
      header, take the scenario extents off the checked-out file, and attribute one to
      the other. That reading already exists in this tree as `changedLinesByFile`, and it
      was measured at the parent's Analysis: for a PURE LINE REMOVAL it returns nothing.
      A removed line holds no position in the new file, so there is nothing left to
      attribute, and the check would report NO updated code for a change that genuinely
      alters what a scenario asserts.

      THAT IS THE SAME FALSE GREEN, ONE DOOR ALONG — a mis-attribution traded for a
      silent miss. Removing a step is an ordinary edit to a scenario, not a boundary
      curiosity, so the trade is not even a narrow one. Comparing the two SOURCES has no
      such hole: a removed step makes the scenario's text differ exactly as a reworded
      one does, and neither answer consults a line number.

      So this row is the pin. It is what reds when a future refactor "simplifies" the
      source comparison back into a positional reading, and a reader who does not know
      that is exactly the reader who deletes it as a duplicate of the row above.

      Given a PR whose only Gherkin change REMOVES the last step of a scenario, adding no line in its place
      When the scenario sub-issue gate runs over the removed-step fixture PR
      Then the gate reports that scenario's code updated

    @unit @integration @SCN-SSM-012
    Scenario: deleting a scenario names it deleted and leaves its neighbours unnamed
      A DELETION IS WHERE THE OLD READING WAS WORST, not where it was mildest. Removing a
      whole scenario takes out a run of lines, and that run puts the PRECEDING scenario's
      trailing steps and the FOLLOWING scenario's tag line inside one hunk. The old
      detector held every code it saw on a context line, so it named BOTH neighbours
      updated: two scenarios accused, neither touched, on a pull request that changed
      nothing in either of them.

      THIS ROW ASSERTS TWO THINGS, AND DROPPING EITHER LOSES THE POINT. The deletion must
      still be reported — that answer comes off the REMOVED tag line, never off context,
      and it was measured sound before the reading changed. A row that only checked the
      neighbours were quiet would go green for a gate that had stopped noticing deletions
      altogether, which is a worse check than the one being replaced. So the deletion and
      the silence are pinned together.

      Given a PR whose only Gherkin change DELETES a whole scenario sitting between two untouched scenarios
      When the scenario sub-issue gate runs over the deleted-scenario fixture PR
      Then the gate reports the deleted scenario's code deleted, and reports neither neighbour updated

    @unit @integration @SCN-SSM-013
    Scenario: a change outside every scenario names no scenario, and the check says so
      A CORRECT ATTRIBUTION CAN NAME NOTHING. A Rule preamble, a Feature preamble, a
      comment sitting between two scenarios — these are ordinary places to edit, and they
      lie inside no scenario, so no @SCN code accounts for them. The old reading held no
      position on that; it held an accident. Reword a Rule preamble with a tag line two
      lines below it and the reading reported that neighbour; reword a Feature preamble
      with no tag line within three lines and it reported nothing. One class of edit, two
      answers, decided by whether a tag happened to fall inside the context window.

      SO THE FIRST CLAUSE IS SILENCE, UNIFORMLY — and the silence is exactly what makes
      the second clause load-bearing. An empty updated set now carries two meanings that
      are not the same fact: "no scenario contains this change" and "no feature file
      changed at all". Left indistinguishable, the honest answer reads as the inert one,
      which is this repository's own missing-versus-unreached confusion arriving in a
      third place. So the check STATES the fact — the feature file changed outside every
      scenario — while the inert message stays exactly as it was, for the case it means.

      IT IS A REPORT, NOT A VIOLATION. Nothing here reds the gate and nothing changes
      about what the gate does with the code sets it is handed. The whole of this row is
      silence in the code set plus the fact said out loud.

      Given a PR whose only Gherkin change rewords a Rule preamble two lines above a scenario's tag line
      When the scenario sub-issue gate runs over the preamble fixture PR
      Then the gate names no updated scenario code, and reports that the feature file changed outside every scenario
