@USG
Feature: Detect uncited static-checks — a CI check no fitness scenario cites

  The static-check axis's UNCITED detection — the mirror of the
  runtime axis's cites-no-scenario evidence observations. The axis was obligation→observation only
  (checkStaticEvidenceObligations observes each check an obligation names), structurally blind to
  the reverse: a check that runs in CI which nothing cites — an unposted credit.

  The running-check observer emits every running CI check (the lint:* scripts a CI run: step
  invokes — runningStaticChecks) into the reconcile stream, so the ONE reconcile engine sees the
  complete static stream: a check a fitness scenario cites posts to that scenario's row; one no
  fitness scenario cites — the citation seam reaches no @SCN for it — cites no scenario, so
  reconcile folds it to the suspense row (an UNCITED static-check). The report's static census is a pure counter
  over the stream (countStaticEvidenceObservationKinds → StaticEvidenceObservationKindCounts
  { runningStaticCheckCount, uncitedStaticCheckCount }; the named count is implicit, running −
  uncited, and the completeness invariant is asserted inside the counter), the static-axis
  mirror of RuntimeEvidenceObservationKindCounts. The report surfaces the counts under
  "### Static checks", mirroring "### Test volume"; the guard member detail lives in the rows.

  WHICH SCRIPTS ARE STATIC CHECKS, AND WHY IT IS NOT A NAMING QUESTION (3F-2495). Membership is
  a PROPERTY of the check — does it analyse source without executing it and red the build on a
  violation — never a property of its name. The lint:/guard: prefixes and the target's own
  specController.staticChecks are two ways of DISCOVERING checks with that property; neither
  defines one. install/checkout are not scripts at all; test/cucumber are the runtime axis's
  observed evidence and are never double-counted here.

  This line used to end "tsc deferred", and that deferral outlived its reason: `tsc --noEmit`
  is static analysis on any reading, spec-controller ran it in CI throughout, and the report
  said 11 checks run over a tree running twelve. A deferral recorded only in a feature preamble
  is one nobody reads again — the arrangement scripts/verify.sh already carries two scars from.
  The scenario @SCN-API-002 now names typecheck, so it is on the books rather than in a
  sentence. (That line must not START with the @-token: Gherkin reads a leading @ as a tag
  line and reds with "A tag may not contain whitespace" — which is exactly what it did here.)

  `pnpm mutation` is still absent, and that is neither an oversight nor an exemption: it is a
  self-measuring threshold check — the pipeline measuring its own test strength — which belongs
  on an axis this tool has not built yet (3F-2509, the sibling of an adopter's repository's @ci-run-time). Ruling
  it "out of scope" is the dodge that feature file was written to reject.

  THIS AXIS NOW READS ZERO OVER SPEC-CONTROLLER'S OWN TREE, AND A READER MUST BE ABLE TO TELL
  WHICH ZERO IT IS (3F-3168, time-boxed to 3F-3161). The 3F-3139 migration moved every fitness
  command out of .github/workflows/ci.yml and onto a specController.fitnessChecks row, so this
  repository has no lint:/guard: script that a CI run: step invokes. runningStaticChecks
  therefore observes NOTHING here, and the uncited count is 0 because the discoverable set is
  EMPTY — not because a populated set was checked and came back clean.

  Those two readings are the fault this product exists to separate, and here they collapse onto
  one number: a capability exercised by nothing, reporting green. 3F-3074 recorded exactly this
  shape as a fault when a consumer's tree produced it. It is stated here rather than left for a
  reader to infer, and it is TIME-BOXED: the residual closes at 3F-3161, when the reader stops
  supporting script discovery at all — a breaking change sequenced after the consumer still
  routing credits through it has migrated. If that migration stalls, the residual is re-raised
  rather than left to age into folklore.

  What is NOT vacuous over this tree is the number beside it. "11 static check(s) run" counts the
  running lint credits the CONVERTED rows post — eleven of the fourteen rows, the other three
  being measured and so not static checks at all — so the running count is answered by the
  fitness pass and only the uncited count is answered by discovery. Reading both as products of
  the same mechanism is the misreading this paragraph forecloses.

  The unit arm proves runningStaticChecks + countStaticEvidenceObservationKinds + the render section
  in isolation; the integration arm drives the real file reads (ci.yml + package.json + features)
  over a fixture target and asserts the rendered report surface.

  Rule: a CI check no fitness scenario cites is reported as an uncited static check

    WHAT MAKES A CHECK UNCITED HAS MOVED; WHERE IT LANDS HAS NOT. Under name-match a check was
    cited by a scenario spelling its runnable handle in an @lint= tag, so this axis's whole
    detection was a lookup miss against that one spelling — and a check whose technique had no
    way to spell itself that way was uncited by construction. Under the one posting rule the
    CREDIT cites: a run resolves to an @SCN through the target's registry and then through its
    corpus, and a check is uncited when that seam reaches no scenario at all. The reader-visible
    landing is unchanged — cites-no-scenario on the suspense row, surfaced under
    "### Static checks" — because what this axis has always reported is a check nobody has
    taken responsibility for, and only the test of responsibility has changed.

    THE CREDIT IS NEVER DROPPED, which is the clause worth saying out loud on the credit side.
    Every Evidence Observation posts somewhere, so a check the seam cannot place is not quietly
    left out of the count: it is banked on the suspense row carrying the handle that ran, and the
    run reds. The failure this forecloses is the comfortable one — a check nobody owns becoming a
    check nobody can see, with a balanced report to say so.

    THE TWO WAYS THE SEAM REACHES NOTHING ARE ONE FACT HERE. A handle nothing registers, and a
    registered check no stepless fitness scenario carries, are different faults with different
    cures — register the handle, or write the check's fitness scenario — but at this seam they
    are the same non-answer, and the suspense row is where an uncited check is separated from a
    miscited one (@SCN-LNT-009) rather than guessed at from a lookup miss. The target below holds
    the SECOND, because it is the one only the new rule can produce: both its checks are
    registered, so the only difference between the cited one and the uncited one is whether a
    stepless fitness scenario carries the tag.

    @unit @integration @SCN-USG-001
    Scenario: a CI check no fitness scenario cites is reported as an uncited static check
      Given a target whose CI runs the lint:foo and lint:bar checks
      And only lint:foo is cited by a fitness scenario
      When the reconciliation report is rendered for the target
      Then the Static checks section reports lint:bar as an uncited static check

  Rule: a check a fitness scenario cites is attributed, not an uncited static check

    THE POSITIVE TWIN, AND WHY THE PAIR IS NOT ONE SCENARIO SAID TWICE. The rule above is
    satisfied on its own by a reader that places NOTHING and calls every running check uncited;
    this one is its control. Over the SAME target, the check a scenario does carry has to reach
    that scenario's row and fold into the running volume rather than the uncited count. Between
    the two targets exactly one fact differs — which of the two registered handles a stepless
    fitness scenario carries — so nothing but the citation can move either verdict.

    ATTRIBUTED NOW MEANS POSTED, NOT MATCHED. Under name-match a credit found its row by spelling
    the scenario's runnable handle back at it, and being attributed was a lookup hit on one
    string. Under the one posting rule the run resolves lint:foo through the target's registry to
    the bare check foo, and through its corpus to the scenario carrying that tag; the row it lands
    on is SCN-TGT-001 and the check it lands under is foo — the BARE tag, not the handle that ran.
    Those two spellings never match, so the retired rule cannot post this row at all.

    WHICH IS WHY THE ASSERTION READS THE ATTRIBUTED ROW, not merely the absence of an uncited one.
    Absence is the weaker claim and several wrong readers produce it: one that posts the credit to
    a scenario the corpus never wrote reports no uncited check either, and so does one that drops
    the credit on the floor. The reconciler's own never-dropped clause is what makes that
    distinguishable — every observation lands somewhere — so this scenario names where.

    @integration @SCN-USG-002
    Scenario: a check a fitness scenario cites is attributed, not an uncited static check
      Given a target whose CI runs the lint:foo and lint:bar checks
      And only lint:foo is cited by a fitness scenario
      When the reconciliation report is rendered for the target
      Then lint:foo is attributed to the scenario citing it, not reported uncited

  Rule: the runtime axis's own CI steps are not derived as fitness checks

    THE EXCLUSION SURVIVES THE RULE CHANGE; WHAT DRAWS IT HAS MOVED. A script reached this axis
    two ways under name-match: a lint:/guard: prefix — or the target's own configured check
    list — found it as a running check, or a scenario spelled its runnable handle in an @lint=
    tag and obliged it. Under the one posting rule that second door is the target's REGISTRY: a
    handle is obliged when the registry maps it to a bare check tag some stepless fitness
    scenario carries. test and cucumber pass through neither door — they carry no check prefix,
    this target configures neither, and its registry names lint:foo and lint:bar and nothing
    else.

    THE FAULT IS DOUBLE-COUNTING, NOT A WRONG NUMBER. pnpm test and pnpm cucumber ARE evidence:
    they are how a corpus's behavioural scenarios get their observations at all. A reader that
    derived them here would post one run twice — once as the behavioural evidence it is, and
    once as a fitness check nobody wrote a threshold for — and the tree would be reported
    running more gates than it has, with the invented ones redding as uncited for no fault of
    the tree's.

    THE TWO DOORS FAIL DIFFERENTLY, AND ONLY THE TALLY SEES BOTH. A step found by a widened
    prefix or configuration cites nothing, so it falls to the suspense row and names itself
    there. One admitted through the registry door is ATTRIBUTED instead — it never reaches
    suspense, and it raises no obligation of its own, so it never reaches the attributed cut
    either; the whole of what the report says about it is the running count moving by one. The
    count is therefore what this scenario asserts first, and the suspense reading is what tells
    a reader which check inflated it.

    @unit @integration @SCN-USG-003
    Scenario: test and cucumber CI steps are not derived as fitness checks
      Given a target whose CI runs the lint:foo and lint:bar checks
      And its CI also runs the test and cucumber suites
      And only lint:foo is cited by a fitness scenario
      When the reconciliation report is rendered for the target
      Then only lint:foo and lint:bar are counted as fitness checks, not test or cucumber

  Rule: a guard:-prefixed CI script no fitness scenario cites is reported as an uncited static check

    THE PREFIX FINDS IT, AND FINDING HAS NOT MOVED. Discovery reads a target's scripts through
    the prefix set and the target's own configured check list, and guard: has sat in that set
    beside lint: since 3F-2495 ruled membership a property of the check rather than of its name.
    What HAS moved is the test the verdict turns on. Under name-match a check was cited by a
    scenario spelling its runnable handle back at it, so this script was uncited because no tag
    anywhere said guard:domain-purity. Under the one posting rule the run resolves through the
    target's registry to a bare check tag, and through its corpus to whatever stepless fitness
    scenario carries that tag — and this target's corpus carries none.

    WHICH IS WHY THE SPELLING lint IS NOT WHAT ANY OF THIS RESTS ON, and why the pair is worth
    keeping now that bare @lint is one style-lint check among many rather than the name of the
    axis. A reader that had quietly made "cited" mean "some tag mentions lint" would still green
    the lint:-prefixed twin and fail here, on a prefix the tool has recognised all along.

    REGISTERED, AND STILL UNCITED — the shape that separates the prefix from the citation. This
    target's registry maps guard:domain-purity to the bare check domain-purity, so the seam CAN
    reach a tag for the handle; what nothing in its corpus does is carry that tag. Leaving the
    handle out of the registry would report the same uncited check for a second reason — a
    handle nothing registers reaches nothing either — and the target would then go on passing
    under a reader that took every registered handle for an attributed one. One fact holds this
    verdict, and it is the fact the cited twin flips.

    THE LANDING IS READ ON THE ROW, not anywhere in the report. Posting to suspense is a claim
    about WHERE the credit went, and a whole-report search cannot tell the suspense row from any
    other row that happens to mention the handle — the reading @SCN-USG-001 already scopes for
    the lint:-prefixed case. A prefix-discovered check lands exactly where its lint:-prefixed
    twin lands, so this scenario asserts it in the same terms rather than settling for the
    absence of an attribution.

    @unit @integration @SCN-USG-004
    Scenario: an uncited guard:-prefixed script running in CI is an uncited static check
      Given a target whose CI runs the guard:domain-purity script
      And no fitness scenario cites guard:domain-purity
      When the reconciliation report is rendered for the target
      Then the Static checks section reports guard:domain-purity as an uncited static check

  Rule: a static check is observed wherever in the workflows it runs

    BOTH observers read a target's CI from ONE source. A check enforced from a sibling
    workflow — a nightly sweep, a security scan, an ordinary split of a pipeline — is
    therefore read as not enforced, and the two axes then fail it in OPPOSITE directions:
    a CITED one is accused of being a watermelon it is not, an UNCITED one leaves the
    books entirely.

    THE FIRST IS A FALSE ACCUSATION, which is why it leads. An omission under-reports;
    an invention tells a consultant their client's real, running gate is fabricated. The
    reconciler's word for a cited-but-unenforced check is watermelon, and a check running
    in nightly.yml earns it today for no reason but where it was written down.

    WHAT MAKES THE CHECK CITED HAS MOVED; WHICH WORKFLOWS ARE READ HAS NOT. Under name-match
    this target's scenario earned its verdict by spelling the runnable handle back at the
    tool in a tag, so satisfied was a lookup hit on the one string lint:nightly. Under the
    one posting rule the run resolves lint:nightly through the target's registry to the bare
    check nightly, and through its corpus to the stepless fitness scenario carrying that tag:
    the row it lands on is SCN-TGS-001 and the check it lands under is nightly — the BARE
    tag, not the handle that ran. Those two spellings never meet, so the retired rule cannot
    settle this obligation at all.

    THE SATISFIED ROW IS WHAT THE ASSERTION READS, and the absent watermelon is its second
    half rather than the whole of it. Absence is the weaker claim and several wrong readers
    produce it: one that never resolves the citation leaves the obligation unsettled and
    raises no watermelon either, and one that resolves it to a scenario the corpus never
    wrote banks the credit on a phantom row and raises none either. Naming the row the credit
    lands on, under the bare tag it lands under, is what tells those apart from the verdict
    this scenario is about.

    TWO FACTS HOLD THIS VERDICT, AND THE SIBLING WORKFLOW IS ONLY ONE OF THEM. The handle has
    to be registered and its bare tag carried for the seam to reach a scenario at all, and the
    check has to be invoked in a workflow the reader actually opens for a run to exist against
    the obligation. Reading ci.yml alone leaves both citation facts untouched and takes the run
    away, and the target is then scored a watermelon — a real, running gate called fabricated.
    That is the fault this Rule refuses, and it is untouched by what cited now means.

    THE OTHER DIRECTION IS THE OMISSION, AND ITS COST IS QUIETER. A check nothing cites is
    already a check nobody has taken responsibility for; running it from a sibling workflow
    must not also make it invisible. Read ci.yml alone and the run simply is not there — no
    suspense row, no count, no red — so the tree reports a clean board over a gate nobody
    owns. Since 3F-2306 the uncited verdict reds a build, which turns that omission into
    something worse than a blind spot: moving a check into nightly.yml becomes a way to make
    a red go away without fixing anything.

    THE TWIN ABOVE CANNOT SEE THIS, WHICH IS WHY THE PAIR IS TWO SCENARIOS. A reader that
    opens every workflow and attributes every check it finds settles the cited obligation and
    greens the satisfied row, and it reports nothing uncited here because it reports nothing
    uncited anywhere. The two arms fail apart: narrowing the workflow walk reds both, but
    dropping an unplaceable credit reds only this one, and taking every registered handle for
    an attributed one reds only this one too.

    REGISTERED, AND STILL UNCITED, on the terms this feature file's other uncited arms hold.
    The target below maps lint:sweep to the bare check sweep in its own registry, so the seam
    CAN resolve a tag for the handle; what nothing in its corpus does is carry that tag. Leave
    the handle out of the registry and the same uncited check is reported for a second reason —
    a handle nothing registers reaches nothing either — and the target goes on passing under a
    reader that never asked whether anything CARRIED the check. One fact holds this verdict,
    and it is the fact the cited twin flips.

    The plural stops at SOURCES. ciRunCommands takes strings of CI config so a second
    ecosystem can supply its own; the walk from a directory to those strings is the
    ingest edge's, which already knows where GitHub keeps workflows and after this knows
    exactly the same amount.

    @unit @integration @SCN-USG-006
    Scenario: a cited fitness check enforced from a sibling workflow is satisfied, with no watermelon raised against it
      Given a target whose ci.yml runs no static check and whose nightly.yml runs lint:nightly
      And a fitness scenario cites lint:nightly
      When the reconciliation report is rendered over the target's workflow directory
      Then lint:nightly reconciles satisfied, with no watermelon raised against it

    @unit @integration @SCN-USG-007
    Scenario: an uncited fitness check running in a sibling workflow is reported uncited
      Given a target whose nightly.yml runs lint:sweep and whose ci.yml does not
      And no fitness scenario cites lint:sweep
      When the reconciliation report is rendered over the target's workflow directory
      Then the Static checks section reports lint:sweep as an uncited static check

  Rule: an explicitly supplied CI file narrows observation to that file

    THE ANSWER TO WIDENING THE DEFAULT. Reading the whole workflow directory by default
    changes what an existing target's report says without its author asking for it, and
    the answer given was that the narrowing survives: name one file and you observe one
    file. An answer nobody tests is a promise.

    Every other scenario here asserts what IS found, so a change making an explicit
    input sweep its parent directory too would leave all of them green while silently
    widening a caller's deliberate scope — the direction that produces a surprise red on
    a client's tree. This is the arm that reds instead.

    THERE ARE NOW TWO WAYS TO WIDEN IT, AND ONLY ONE OF THEM IS A DIRECTORY WALK. Under
    the one posting rule a handle also reaches this axis from the TARGET'S MANIFEST: its
    registry maps a runnable handle to a bare check tag, and a handle whose tag some
    stepless fitness scenario carries is asked about whether or not the file the caller
    named invokes it. That door never reads CI at all, so a reader that took a registry
    entry for an observation would put back exactly the check the narrowing excluded —
    and would do it from an input with nothing to say about which file was named.

    THE MANIFEST IS NOT THE SOURCE HERE EITHER, on the terms the configured-check list
    further down this file already answers to: a script CI does not run is not a gate.
    The registry is a second manifest input and takes the same terms — it can change how
    a run is READ, never produce one.

    WHICH IS WHY THIS TARGET'S REGISTRY ENTRY IS LOAD-BEARING FOR THIS ARM, and not only
    for the sibling it shares the fixture with. The target maps lint:sweep to the bare
    check sweep, so the manifest door stands open over the very handle the narrowing
    excludes; measured by plant, opening that door reds this scenario exactly as sweeping
    the parent directory does. Read the entry as inert and remove it, and the arm goes on
    passing while guarding one door of two.

    @integration @SCN-USG-008
    Scenario: an explicitly supplied CI file narrows observation to that file alone
      Given a target whose nightly.yml runs lint:sweep and whose ci.yml does not
      When the reconciliation report is rendered for that target's ci.yml alone
      Then lint:sweep is not counted among the running static checks

  Rule: a guard:-prefixed CI script a fitness scenario cites is attributed, not uncited

    THE CONTROL THAT MAKES THE RULE ABOVE MEAN SOMETHING. @SCN-USG-004 is satisfied on its own by
    a reader that places nothing and calls every guard:-prefixed script it finds uncited; this is
    what stops that. Both targets run the same guard:domain-purity script and both registries map
    it to the same bare check domain-purity, so the ONE fact left between them is whether a
    stepless fitness scenario carries that tag — and that fact alone moves the verdict off the
    suspense row and onto a scenario's.

    CITED NOW MEANS CARRIED, NOT SPELLED. Under name-match this target earned its attribution by
    spelling the runnable handle back at the tool in a tag, and being attributed was a lookup hit
    on one string. Under the one posting rule the run resolves guard:domain-purity through the
    target's registry to the bare check domain-purity, and through its corpus to the scenario
    carrying that tag: the row it lands on is SCN-TGD-001 and the check it lands under is
    domain-purity — the BARE tag, not the handle that ran. Those two spellings never meet, so the
    retired rule cannot post this row at all.

    WHICH IS WHY THE ASSERTION READS THE ATTRIBUTED ROW, not the absence of an uncited one — the
    reading @SCN-USG-002 already gives its own lint:-prefixed twin. Absence is the weaker claim and
    several wrong readers produce it: one that drops the credit on the floor reports no uncited
    check either, and so does one that posts it to a scenario the corpus never wrote.

    THE PAIR IS NOT SYMMETRIC, AND THIS ARM IS NOT THE PREFIX SET'S READER. Its twin reaches this
    axis through DISCOVERY, where the prefix set is what finds a script at all. This target reaches
    it through the other door: a handle whose bare check some scenario carries is answered by the
    obligation-side observer, which has never consulted the prefix set, and is filtered out of the
    running-check stream precisely so that one run is not observed twice. So narrowing the prefix
    set reds the twin and leaves this arm green, and the pair's value is not a symmetry it does not
    have. What this arm holds instead is that the seam is BLIND to the prefix — an opaque handle
    resolves through the registry whatever it is called, so a reader that had quietly made the
    resolution lint:-only would attribute nothing here.

    @unit @integration @SCN-USG-005
    Scenario: a cited guard:-prefixed script is attributed, not an uncited static check
      Given a target whose CI runs the guard:domain-purity script it cites
      And a fitness scenario cites guard:domain-purity
      When the reconciliation report is rendered for the target
      Then guard:domain-purity is attributed to the scenario citing it, not reported uncited

  Rule: a target can configure a script a static check, and the tool observes it on that axis

    THE PREFIX SET IS A DISCOVERY HEURISTIC, NOT A DEFINITION (3F-2495). Static-axis
    membership is a property of the check — does it analyse source without executing it —
    and `tsc --noEmit` has that property whatever its script is called. A check with the
    property and no recognised prefix is a FALSE NEGATIVE, not an exclusion.

    THE GAP IS ONLY IN THE DISCOVERY DIRECTION, which is narrower than it first looks. The
    obligation-side observer has never consulted the prefix set, so a non-prefixed check the
    corpus reaches has always reconciled on its scenario's own row — under name-match by a
    scenario spelling @lint=typecheck back at the tool, and under the one posting rule by a
    stepless fitness scenario carrying the bare check tag this target's registry resolves the
    handle to. What has never worked either way is finding a non-prefixed check NOBODY took
    responsibility for — which is the one worth finding, and the one this feature file exists
    to surface.

    RENAMING IS NOT THE REMEDY. A client's scripts are not ours to rename, so the tool has
    to be able to be TOLD. The configuration extends the discovery input; it never replaces
    the prefixes, and it buys no exemption — a configured check is uncited, and reds, on
    exactly the terms every other check is.

    THE MANIFEST IS STILL NOT THE SOURCE, and the registry is held to the same terms. A
    configured script CI does not run is not a gate, and would red every repository for owning
    a helper; a registry entry is likewise a claim about how a run is READ, never one that a
    run happened. So the two manifest keys are two answers to two questions — WHICH scripts
    are checks here, and WHAT bare tag names this one — rather than one answer written twice.

    WHAT MAKES A CONFIGURED CHECK UNCITED HAS MOVED; DISCOVERING IT HAS NOT. Discovery still
    keys on the prefix set plus this target's own configured check list, and that half is
    exactly what 3F-2495 settled. What the one posting rule changes is the test the verdict
    turns on: the run resolves typecheck through the target's registry to a bare check tag,
    and through its corpus to whatever stepless fitness scenario carries that tag — and this
    target's corpus carries none, so the seam reaches no @SCN and the credit cites no scenario.

    REGISTERED, AND STILL UNCITED, on the terms this feature file's other uncited arms hold.
    The target below maps typecheck to the bare check typecheck in its own registry, so the
    seam CAN resolve a tag for the handle; what nothing in its corpus does is carry that tag.
    Leaving the handle out of the registry would report the same uncited check for a second
    reason — a handle nothing registers reaches nothing either — and the target would then go
    on passing under a reader that took every registered handle for an attributed one. One
    fact holds this verdict, and it is the fact the cited twin flips.

    THE CONFIGURATION BUYS NO EXEMPTION, which is the first of two things the second scenario
    holds. Both targets configure the same script, run it in the same CI, and register the same
    handle to the same bare check; the ONE fact between them is whether a stepless fitness
    scenario carries that tag. So nothing but the citation can move either verdict, and widening
    discovery cannot be built as a privileged class — found, counted, and never asked for its
    attribution.

    THE SECOND IS THE DOUBLE-COUNT, AND ONLY THE CITED TARGET CAN REACH IT. Both doors onto this
    axis stand open over that target's handle: DISCOVERY finds typecheck because the manifest
    configures it, and the REGISTRY reaches it because a scenario carries the tag it resolves to.
    Over the uncited target the two doors AGREE — neither reaches a scenario, so the worst a lost
    de-duplication costs there is one verdict said twice. Here they disagree about where the
    credit lands: the obligation-side reader carries the citation and posts to the scenario's row,
    while the running-check reader carries none, and a run nobody's citation placed still has to
    land somewhere — so the same run reaches the books twice. MEASURED: remove the ingest edge's
    no-double-observe filter and this target reports two static checks run over a tree running one.

    THE COUNT IS WHAT SURFACES IT, which is why the scenario asserts the count and not only the
    row. Reconciliation is per-OBLIGATION, so one obligation settled by either credit still reads
    satisfied and the attributed row goes on saying exactly what it said before. A reader checking
    only that the check was attributed and not reported uncited therefore greens a report claiming
    a gate the target does not have — an invention, and this axis's own worst failure.

    ONE RUN, ONE CREDIT, WHATEVER THE CHECK IS CALLED. A bare tag CAN equal the handle it is
    registered for — typecheck resolves to typecheck, the ordinary case for a script whose name
    already reads as its check — and this target is that collision. So the seam excludes a CITING
    run by asking whether it cited, never what it is called: keyed on the handle instead, it would
    take the citing run for the non-citing one and post it a second time to the row it had already
    reached. That second posting is read on the row's own credits rather than in the count, which
    cannot tell one observation posted twice from one posted once.

    Both scenarios are needed because each is the other's control. Alone, the first is
    satisfied by any change that reports every configured check uncited whether or not
    anything cites it; alone, the second is satisfied by a tool that never reports
    anything uncited at all.

    @unit @integration @SCN-USG-009
    Scenario: a configured fitness check no scenario cites is reported uncited, not invisible
      Given a target that configures typecheck a static check and runs it in CI
      And no fitness scenario cites typecheck
      When the reconciliation report is rendered for the target
      Then the Static checks section reports typecheck as an uncited static check

    @unit @integration @SCN-USG-010
    Scenario: a configured fitness check a scenario cites is attributed, not double-counted
      Given a target that configures typecheck a static check and cites it
      And a fitness scenario cites typecheck
      When the reconciliation report is rendered for the target
      Then typecheck is attributed to the scenario citing it, counted once and not reported uncited
