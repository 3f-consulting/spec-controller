@USG
Feature: Detect uncited static-checks — a CI check no fitness scenario cites

  The static-check axis's UNCITED detection — the mirror of the
  runtime axis's cites-no-scenario evidence observations. The axis was once obligation→observation
  only, reading each check an obligation NAMED, and was structurally blind to the reverse: a check
  that runs in CI which nothing cites — an unposted credit. That obligation-side reader is deleted,
  so the running-check observer below is now the whole of the axis's input.

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

  WHICH STEPS ARE STATIC CHECKS, AND WHY IT IS NOT A NAMING QUESTION. Membership is a PROPERTY of the check — does it analyse source without executing it
  and red the build on a violation — never a property of its name. No naming heuristic decides it,
  neither a lint:/guard: prefix nor the target's own specController.staticChecks:
  membership is decided by subtraction, and a run: step of the workflows --ci names is a
  candidate fitness check unless it runs a behavioural runner the manifest names, is the
  reconciler, or is a step the manifest names a non-check. install and checkout are steps like
  any other and leave by that third door; test and cucumber are the runtime axis's observed
  evidence and leave by the first, which is what the manifest's runners block says.

  `tsc --noEmit` is static analysis on any reading, and it is not deferred: a deferral recorded
  only in a feature preamble is one nobody reads again. A public-api scenario names typecheck, so
  it is on the books rather than in a sentence.

  `pnpm mutation` is still absent, and that is neither an oversight nor an exemption: it is a
  self-measuring threshold check — the pipeline measuring its own test strength — which belongs
  on an axis this tool has not built yet (the sibling of an adopter's repository's @ci-run-time). Ruling
  it "out of scope" is the dodge that feature file was written to reject.

  THE ZERO OVER SPEC-CONTROLLER'S OWN TREE IS A ZERO OVER A POPULATED SET. A zero over an empty
  set would say the discoverable set was EMPTY rather than that a populated set had been checked
  and come back clean. Those two readings are the fault this product exists to separate: collapsed
  onto one number, they are a capability exercised by nothing, reporting green.

  IT IS CLOSED BY THE INVERSION RATHER THAN BY A TICKET THAT WAS STILL OWED. Every run: step of
  ci.yml is a candidate now, so the denominator is this repository's whole pipeline: every check it
  runs is discovered, each carrying the code of the scenario it answers on its own step, and nought
  uncited. (The count that stood here is gone for the reason the paragraph below gives.)
  The residual that stood here is gone: specController.staticChecks settles nothing,
  and no account names it on the report as a retired key. A
  manifest carrying the key now settles nothing, and the report names it as it names any key the
  specController block does not read, with no word of what it once did. That engages no
  major version: at 0.x no compatibility commitment names one.

  What is NOT vacuous over this tree is the number beside it. The "static check(s) run" figure counts
  the running fitness credits this pipeline's own candidate steps post, so it is answered by those steps
  and only the uncited count is answered by discovery. Reading both as products of the same mechanism
  is the misreading this paragraph forecloses.

  THE FIGURES THEMSELVES ARE NOT WRITTEN HERE, BECAUSE A FIGURE HERE GOES STALE UNNOTICED.
  Nothing reconciles a number in a preamble against the tree it describes, so it can be wrong
  without redding anything. A number in this prose is a second reading of something nothing keeps
  it in step with, so none is written.

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
    miscited one rather than guessed at from a lookup miss. The target below holds
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
    on is that scenario's and the check it lands under is foo — the BARE tag, not the handle that ran.
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

  Rule: a step invoking a runner the manifest names is not a candidate fitness check

    THE EXCLUSION SURVIVES THE RULE CHANGE; WHAT DRAWS IT HAS MOVED. What takes a pipeline step
    out of this axis is the target saying which commands run its behavioural suites: its
    manifest names one runner per tier, and a step invoking that runner — reached through the
    manifest script the step runs — is that tier's runner rather than a gate.
    This target names vitest for unit and cucumber-js for integration, and its test and
    cucumber scripts run exactly those, so both steps are recognised where CI invokes them.

    THE FAULT IS DOUBLE-COUNTING, NOT A WRONG NUMBER. pnpm test and pnpm cucumber ARE evidence:
    they are how a corpus's behavioural scenarios get their observations at all. A reader that
    derived them here would post one run twice — once as the behavioural evidence it is, and
    once as a fitness check nobody wrote a threshold for — and the tree would be reported
    running more gates than it has, with the invented ones redding as uncited for no fault of
    the tree's.

    WHICH IS WHY THE TALLY IS WHAT THIS SCENARIO ASSERTS FIRST. A behavioural step wrongly taken
    for a check cites nothing, so it falls to the suspense row and names itself there — but that
    row can only be read for by a reader who already knows which handle to look for, and a
    recognition rule can fail over a step nobody predicted. The count moves whichever step it
    was, so the count is asserted first and the suspense reading is what tells a reader which
    step inflated it.

    @unit @integration @SCN-USG-003
    Scenario: test and cucumber CI steps are not candidate fitness checks, because the manifest names their runners
      Given a target whose CI runs the lint:foo and lint:bar checks
      And its CI also runs the test and cucumber suites
      And its manifest names the unit and integration runners those suites run
      And only lint:foo is cited by a fitness scenario
      When the reconciliation report is rendered for the target
      Then only lint:foo and lint:bar are counted as fitness checks, not test or cucumber

  Rule: a CI check whose script name matches no convention of the tool's is reported as an uncited static check

    NO PREFIX FINDS ANYTHING, BECAUSE THERE IS NO PREFIX SET TO FIND WITH. Discovery
    once read a target's scripts through an observed prefix set — lint: and guard: —
    and this scenario's script carried guard: so that it would be found. The set of names a quality
    check might be given belongs to the consumer and is unbounded; a list of two was a sample of it,
    and a longer list would have been a bigger sample. So the membership rule is inverted: a step of
    the pipeline is a candidate fitness check UNLESS it invokes a runner the manifest names, is the
    reconciler, or is a step the consumer named a non-check. The script below is called
    domain-purity, which matches no convention this tool has ever recognised, and it is found
    because nothing takes it out.

    WHICH IS THE HEADLINE OF THE INVERSION AND NOT A REFINEMENT OF THE OLD RULE. Under the prefix
    set this exact target was silent: its check ran, cited nothing, and produced no row, no count
    and no red — the consumer read a clean board over a gate nobody owned. The uncited verdict is
    what this scenario is about, and the reason it is now reachable is that the check is discovered
    at all.

    THE CITED HALF IS WHAT MAKES IT MEAN SOMETHING, and it is the twin one Rule along.
    A reader that reported every step as uncited would satisfy this scenario while
    being useless; only a sibling target whose identically-unprefixed check IS attributed tells the
    two apart.

    REGISTERED, AND STILL UNCITED — the shape that separates discovery from citation, unchanged by
    the switch. This target's registry maps domain-purity to the bare check domain-purity, so the
    seam CAN reach a tag for the handle; what nothing in its corpus does is carry that tag. Leaving
    the handle out of the registry would report the same uncited check for a second reason — a
    handle nothing registers reaches nothing either — and the target would then go on passing under
    a reader that took every registered handle for an attributed one. One fact holds this verdict,
    and it is the fact the cited twin flips.

    THE LANDING IS READ ON THE ROW, not anywhere in the report. Posting to suspense is a claim
    about WHERE the credit went, and a whole-report search cannot tell the suspense row from any
    other row that happens to mention the handle — the reading already scoped for the
    lint:-prefixed case. An unprefixed check lands exactly where a prefixed one lands, so this
    scenario asserts it in the same terms rather than settling for the absence of an attribution.

    @unit @integration @SCN-USG-004
    Scenario: an uncited check whose script name carries no prefix of ours is an uncited static check
      Given a target whose CI runs the domain-purity script, a name matching no convention of ours
      And no fitness scenario cites domain-purity
      When the reconciliation report is rendered for the target
      Then the Static checks section reports domain-purity as an uncited static check

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
    the row it lands on is that scenario's and the check it lands under is nightly — the BARE
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
    owns. The uncited verdict reds a build, which turns that omission into
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

    THE MANIFEST IS NOT THE SOURCE HERE EITHER: a script CI does not run is not a gate, and
    would red every repository for owning a helper it never runs. The registry is a second
    manifest input and takes the same terms — it can change how a run is READ, never produce
    one.

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

  Rule: a CI check whose script name matches no convention of the tool's, that a fitness scenario cites, is attributed

    THE CONTROL THAT MAKES THE RULE ABOVE MEAN SOMETHING. The rule above is satisfied on its own by
    a reader that places nothing and calls every script it finds uncited; this is what stops that.
    Both targets run the same domain-purity script, a name matching no convention of ours, and
    both registries map it to the same bare check domain-purity — so the ONE fact left between
    them is whether a stepless fitness scenario carries that tag, and that fact alone moves the
    verdict off the suspense row and onto a scenario's.

    WHICH IS WHY THE NAME CANNOT BE WHAT DECIDES, and the pair is what proves it rather than
    asserts it. The two targets run the same script under the same registry entry, so any reader
    answering from the handle's spelling answers the same way for both — and the two verdicts
    differ. Whatever places this credit on the fixture's scenario is reading the corpus, which is the one
    posting rule; the retired rule read a name, and a name is the thing these two targets share.

    THE ASSERTION READS THE ATTRIBUTED ROW, not the absence of an uncited one — the reading
    already given to its own cited twin. Absence is the weaker claim and several
    wrong readers produce it: one that drops the credit on the floor reports no uncited check
    either, and so does one that posts it to a scenario the corpus never wrote.

    THE PAIR IS NOT SYMMETRIC. The
    asymmetry was stated as a narrowing of the observed prefixes — cut them to lint: and the twin
    reds while this arm stays green — and there is no prefix set to narrow. The
    asymmetry survives, because it was never about the prefixes: the twin reaches this axis
    through DISCOVERY, which now reads every step of the pipeline that is not a runner the
    manifest names, the reconciler, or a step the consumer named a non-check. This target reaches
    it through the other door — a handle whose bare check some scenario carries is answered by the
    obligation-side observer, whatever discovery did — and is then filtered out of the
    running-check stream so that one run is not observed twice.

    SO NARROWING DISCOVERY IS WHAT PLAYS THE OLD PLANT'S PART, and it was run rather than reasoned:
    name this target's own step a non-check and the twin's verdict is what goes, while
    this one is attributed exactly as before. The conclusion is STRONGER than the argument it
    lost — the old plant showed the seam blind to WHICH prefix a handle carried, and this handle
    now carries none at all and is attributed anyway.

    @unit @integration @SCN-USG-005
    Scenario: a cited check whose script name carries no prefix of ours is attributed, not an uncited static check
      Given a target whose CI runs the domain-purity script under no convention of ours
      And a fitness scenario cites domain-purity
      When the reconciliation report is rendered for the target
      Then domain-purity is attributed to the scenario citing it, not reported uncited

  Rule: a runner named as a binary is recognised at the step that invokes it through a manifest script

    THE RUNNER'S NAME IS NOT IN THE WORKFLOW, which is why the manifest hop IS the rule rather
    than a refinement of one. Measured over 113 run: steps in five real pipelines, a whole-token
    match on the step's command alone recognises ZERO runners: every one of those pipelines
    invokes its runner through a package.json script alias — pnpm test, pnpm cucumber — and the
    binary's name appears in the workflow only inside a path. So a rule that resolves a step's
    command to the executable it actually runs cannot be built from the workflow at all, because
    the executable is not there.

    WHOLE SHELL TOKENS, NEVER A SUBSTRING. The substring form recognises 2 of those same 113 and
    both are false: one of them is the reconciler's own balance step, matched on the filename
    vitest.json inside its --vitest argument. Excluding a fitness check as a runner is the one
    direction this axis cannot tolerate, because it is silent — and it happens on the first real
    pipeline a substring rule is pointed at. The sibling scenario one Rule along is welded to that
    line; this one is why the hop exists at all.

    A STEP INVOKES A SCRIPT BY THE PRODUCT'S OWN EXACT PACKAGE-MANAGER TEST, the same reading a
    static check's enforcement is already taken through, so two readers cannot come to disagree
    about what pnpm test invokes. The script's body is then read for the runner as a whole token,
    and a script invoking another script is followed to a depth of three under a visited set: a
    deeper chain is a shape no pipeline in the portfolio has, and an unbounded walk over a
    manifest the consumer wrote is an input this tool does not control.

    NO VERDICT MOVED WHEN THIS LANDED, and that was deliberate: a runner sat outside the static
    axis because the prefix rule never reached it, so what this scenario bought at the time was the
    READER — a step recognised as a runner leaves it NAMED rather than silent, the first half of
    the no-fifth-outcome rule the inversion needed before it could land. SINCE THE INVERSION THIS
    RECOGNITION IS ALSO THE VERDICT: the prefix rule is gone, so what keeps a runner
    step off the static axis is this rule and nothing else. Both readings go through one
    comparison, so the report and the books cannot disagree about which step ran a runner.

    @unit @integration @SCN-USG-011
    Scenario: a step running `pnpm test` is the unit runner when the manifest's `test` script runs vitest
      Given a target that names vitest its unit runner and runs pnpm test in CI
      When the reconciliation report is rendered for the target
      Then the report names vitest the unit runner, recognised at the step that runs it

  Rule: a runner's name occurring anywhere but the command position leaves the step a candidate

    THIS IS THE RECOGNITION RULE'S TEETH, AND IT IS WELDED TO A MEASUREMENT. Over the same 113
    run: steps in five real pipelines, a substring reading of the rule recognises exactly two —
    and both are false. Each matched on a FILENAME: one on the vitest.json a step writes its
    evidence to, the other on that same filename inside the reconciler's own --vitest argument.
    Neither step runs vitest. Both would have vanished.

    A FALSE POSITIVE AND A FALSE EXCLUSION ARE NOT THE SAME MISTAKE, and the whole design rests on
    their being told apart. A step wrongly called a check is one line of the consumer's own
    configuration, written off a report that named the step. A step wrongly called a runner is a
    check DELETED from the report with nothing said — the silence this axis exists to end. So the
    asymmetry is built rather than asserted, and the whole of what builds it is that the
    comparison is over whole shell tokens: a path, a --flag, an output filename and an =-joined
    argument all carry the runner's name without being it.

    THE PLANT IS RECORDED, NOT ASSUMED. Swapping the token comparison for a substring one reds
    this scenario and the unit arms beside it; the swap was made, its red was read, and it was
    reverted. A guard whose teeth were reasoned about rather than watched is not a guard.

    THE CHECK STEP HERE IS AN ORDINARY ONE, deliberately. The reconciler's own step is excluded
    too, but BY CONSTRUCTION and not by this rule — sharing one fixture would leave
    two different exclusions free to answer for each other, and a green would say which of them
    was doing the work.

    @unit @integration @SCN-USG-012
    Scenario: a check step naming a runner in a path or an argument is a candidate, never excluded as the runner
      Given a target that names vitest its unit runner, runs its unit suite, and runs a check whose command writes a report named after that runner
      When the reconciliation report is rendered for the target
      Then the report names the unit suite step its runner and no other, and the check is on the books as an uncited static check

  Rule: a tier whose runner is null has no runner; a tier the block omits has not been told

    TWO FACTS THAT ARE OPPOSITE, AND THE CLAIM IS THE DISTINCTION. A null runner is something the
    target SAID — we have no performance suite — and an absent key is something it never said. A
    reader that folds one into the other loses a fact it was given, and it loses it in the one
    direction that cannot be recovered: silence and a stated absence look identical afterwards.

    IT IS READABLE ONLY IN THE REPORT, WHICH IS WHY THAT IS WHERE IT IS ASSERTED. Neither state
    excludes a step and neither recognises one, so every discovery verdict in this file is the same
    under both — a collapsed reader goes on passing every one of them. There is no comparison whose
    outcome moves, so there is nothing for a scenario about exclusion to catch. What moves is the
    resolver's RETURN VALUE and, through it, the sentence the report prints about that tier.

    AND THAT SENTENCE IS WHY THE NULL IS WORTH WRITING AT ALL. A tier the block omits is reported
    unnamed — the tool saying out loud that it has not been told, rather than quietly assuming the
    target has nothing there. Writing null is how a consumer answers that line, and a reader that
    dropped nulls would make the config inert: the same report either way, and no reason for anyone
    to write it. So the two halves are one claim rather than two, and asserting either alone is
    satisfied by a reader that prints one sentence for both, which is precisely the collapse.

    THE TWO TARGETS ARE ALIKE BUT FOR THE KEY. One manifest says performance is null, the other
    omits performance, and nothing else differs between them — same scripts, same workflow, same
    corpus. A pair differing in one place is what lets the difference in their reports be
    attributed to that place, and a control is only one if it is otherwise identical.

    WHAT THIS DOES NOT ANSWER, kept out on purpose. A key that is not one of the four canon tiers
    is its own scenario. A target carrying no runner block at all is another,
    and its report is untouched here — this section speaks only for a target that
    has said something. A tier NAMED whose runner no step runs stays the open question the
    recognition section already deferred; naming a tier is not saying it has none.

    @unit @integration @SCN-USG-016
    Scenario: a null runner reports the tier as having none, and an absent key reports it as unnamed
      Given a target that says it has no performance runner
      And a second target, alike but for saying nothing about performance
      When the reconciliation report is rendered for both targets
      Then the first target's report says it has no performance runner
      And the second target's report says its performance runner is unnamed

  Rule: the runner block is keyed by the four canon tiers and no other

    A CLOSED SET WITH NOTHING FORCING ITS CLOSURE IS A HOLE. The runner block is keyed by tier
    and the tiers are canon — unit, integration, e2e, performance — which is exactly what makes
    the inversion possible: the small thing is named because it is enumerable, and the open one
    is inferred. Every sibling scenario in this section exercises one of the four; not one of
    them can say what happens to a fifth, and a reader honouring any key at all passes all of
    them. So the closure is the claim here, and it is the only claim no sibling can reach.

    QUIETLY HONOURING IT IS THE SMUGGLING THE CLOSURE FORBIDS. A "lint": "eslint" entry in the
    runner block is a consumer taking their own checks out of discovery one key at a time, and
    it reinstates the silence this whole axis exists to remove — a check that vanishes from the
    report with a reason nobody can read. Naming a key a runner tier is not a way to exclude a
    check; the way to exclude a step is to say so where exclusions are said, and to be told
    about it in the report.

    SILENTLY IGNORING IT IS THE OTHER WRONG ANSWER, and it is the same class of fault as
    dropped-and-silent. The consumer wrote something. They believe it took effect. A reader that
    partitions the key out and says nothing leaves them holding a manifest that does not do what
    they think, with no line anywhere to correct it from — which is the fault of the prefix rule
    reached from the configuration side rather than the pipeline side.

    SO THE RUN IS NOT ABORTED OVER IT, AND THAT IS THE SAME FAIL-SAFE DIRECTION AS THE REST. An
    unrecognised key is a fact about the manifest, surfaced on the report where the consumer can
    read it and fix it in one line. Throwing would cost a run its whole verdict over one typo in
    a block that changes no verdict at all — the stance every resolver in this family already
    takes about data that came from outside.

    THE KEY EXCLUDES NOTHING, WHICH IS THE HALF THAT NEEDS A CHECK BESIDE IT. An absence proves
    little on its own: a reader recognising nothing anywhere satisfies it. So the target below
    runs a real check whose script the bogus key names, and that check has to reach the books as
    an uncited static check — the presence that makes the absence mean something.

    @unit @integration @SCN-USG-019
    Scenario: a runners key that is not one of the four tiers is reported, never silently honoured
      Given a target whose runner block names a key that is not one of the four tiers
      And that key names the command of a check its CI runs
      When the reconciliation report is rendered for the target
      Then the report names that key as one it does not recognise
      And the check is on the books as an uncited static check

  Rule: a specController entry the tool cannot use is named on the report, and the run is not refused over it

    THE SAME TWO WRONG ANSWERS AS AN UNRECOGNISED RUNNER KEY, REACHED BY THE VALUE RATHER THAN
    THE KEY. A notChecks written as one string instead of a list, a runner written as a number,
    a block written as anything but a block: each is something the consumer wrote and believes
    took effect. Every reader of the block takes a value of the wrong kind as absent, which is the
    safe direction for the books, and that is exactly why saying nothing is wrong: the report
    reads as if the consumer had written nothing, and there is no line anywhere to correct it
    from.

    SO THE RUN IS NOT ABORTED OVER IT, for the reason the runner block's own Rule gives. The block
    changes no verdict on its own, and costing a run its whole verdict over one mistyped value is
    the other wrong answer. The entry is read as absent, and the report says so, naming where it
    is, what kind it is, and what kind is read there.

    AND ONLY THAT ENTRY IS TAKEN AS ABSENT. A wrong value in one place is not a reason to discard
    what the consumer wrote correctly beside it, so the report is otherwise exactly the one the
    same target gives without that entry.

    A KEY THE BLOCK DOES NOT READ AT ALL IS THE SAME FACT ONE LEVEL UP. A misspelt key, or a
    retired one, is something the consumer wrote and believes took
    effect. It is named as a key the block does not read, in the same words whichever it is: a
    retired key gets no wording of its own, because telling a consumer what a retired key DID is
    the backward compatibility this tool does not offer. What it owes them is only that nothing
    they wrote disappears without a line.

    @unit @integration @SCN-USG-025
    Scenario Outline: a specController entry of a kind its reader does not take is named on the report with the kind it is and the kind that is read, and every other entry takes effect as without it
      Given a target whose specController configuration sets <entry> to <written>
      When the target's configuration is reconciled
      Then the report names <entry> as <written>, where <read> is read
      And the report is otherwise the one the same target gives without <entry>

      Examples:
        | entry                          | written   | read             |
        | specController                 | a string  | an object        |
        | specController.runners         | a list    | an object        |
        | specController.runners.unit    | a number  | a string or null |
        | specController.notChecks       | a string  | a list           |
        | specController.notChecks[1]    | an object | a string         |
        | specController.deferralTags    | an object | a list           |
        | specController.deferralTags[0] | null      | a string         |

    @unit @integration @SCN-USG-028
    Scenario Outline: a key the specController block does not read, a retired one included, is named on the report as unknown in the same words as any other, and the run is not refused over it
      Given a target whose specController configuration also carries the key <key>
      When the target's configuration is reconciled
      Then the report names <key> as a key the specController block does not read, in the words it uses for any such key
      And the report is otherwise the one the same target gives without the key <key>

      Examples:
        | key           |
        | notCheck      |
        | fitnessChecks |
        | zzz           |

    @unit @integration @SCN-USG-026
    Scenario Outline: a specController block whose every entry is a kind its reader takes names nothing as the wrong kind
      Given a target whose specController configuration gives <entry> the value <written>, a kind its reader takes
      When the target's configuration is reconciled
      Then the report names no specController entry as one it could not use

      Examples:
        | entry                       | written       |
        | specController.runners.e2e  | null          |
        | specController.notChecks    | an empty list |
        | specController.deferralTags | an empty list |
        | specController.runners.lint | a number      |

    @unit @integration @SCN-USG-027
    Scenario: a saved run re-rendered names the same specController entries its live report named
      Given a target whose specController configuration holds an entry of a kind its reader does not take and a key the block does not read
      When the target's configuration is reconciled and the saved run is re-rendered
      Then the re-rendered report names the same specController entries as the live report did

  Rule: a step the manifest names a non-check is excluded, and the report says so

    THE THIRD EXCLUSION, AND THE ONLY ONE THAT IS THE CONSUMER'S OWN LIST. Not everything that
    is not a behavioural runner is a fitness check — a checkout, a corepack enable, a dependency
    install, a deploy — and a rule calling those checks fills a consumer's first report with
    noise. So the consumer gets to say which steps are not checks, about their own pipeline,
    once. It is a list of THEIR steps, never a list of check names of ours, and that is what
    keeps it from being the prefix rule wearing a new hat.

    AN ENTRY IS FULLY QUALIFIED AND MATCHED EXACTLY — the workflow file, the job it is written
    under, and the step's own name, which is the string GitHub itself shows in a run log. Typecheck
    is a check in this repository's ci.yml and plumbing in its release.yml, so a bare-name entry
    would take out both, and the second of those is a check deleted from the report with nothing
    said. Job identity is what the widened walk was widened to carry, and this is what it is for.

    THERE IS NO WILDCARD FORM, ARGUED RATHER THAN OMITTED. A consumer wanting a whole workflow out
    narrows the CI input at the command line — a supported narrowing this file already pins one
    Rule along — so a second way to say the same thing buys a grammar to specify, to
    test and to explain. Exact-only can be widened later and breaks nobody; starting wide cannot
    be narrowed once somebody's manifest depends on it.

    THE REPORT NAMES EACH EXCLUDED STEP, AND THAT HALF IS NOT OPTIONAL. A step that reaches this
    reader leaves it as an observation, as a runner, as the reconciler, or as a step the consumer
    named a non-check, and none of those four is silent. An excluded step that simply vanished
    would be the very silence this whole axis exists to end, arriving in a new coat and with the
    consumer's own signature on it.

    AND AN ENTRY NAMING NO STEP IS ITSELF NAMED. A line matching nothing is a stale exclusion: the
    consumer renamed a step and the entry now hides nothing, or is about to hide the wrong thing
    the next time a step is renamed onto it. Either way it is a fact about their manifest that only
    this run can see, and dropping it is the same fault as dropping a step — something was written,
    it took no effect, and nothing anywhere says so.

    THE SIBLING CHECK IS THE CONTROL, and without it the claim is unfalsifiable. A reader that
    discovered no checks at all would satisfy "the excluded step's check is off the books" while
    being blind; only a second check still standing beside it, one no entry names, tells the
    exclusion from the blindness. Both checks carried a prefix the rule of the day already
    discovered, so the exclusion was readable before the membership filter inverted rather than
    only after it; under the inverted rule both are discovered because they are steps, and the
    fixture's plumbing is named a non-check beside them for the same reason.

    @unit @integration @SCN-USG-015
    Scenario: a step named in `notChecks` is not a candidate, and is reported as excluded rather than dropped
      Given a target that names one check step of its pipeline a non-check
      And a sibling check step no entry of its names
      And an entry that names no step its pipeline runs
      When the reconciliation report is rendered for the target
      Then the report names the excluded step, and its check is off the books while the sibling's is on them
      And the report names the entry that matched no step

  Rule: the reconciler is not one of the reconciled rows

    THE SECOND EXCLUSION, AND THE ONLY ONE NOBODY WRITES. A consumer's pipeline runs the
    reconciliation itself, and the run that computes the books cannot be a row in them: the step
    that runs balance is the reconciler, not a check it reconciles. The step-record dump goes with
    it, because that record is the reconciler's own input — written before balance reads it, which
    is what makes it the input rather than an observation about it.

    A CITATION ON EITHER IS UNSATISFIABLE, and that is the whole of why this is by construction
    rather than a judgement. The dump is written BEFORE the reconciliation reads it, so no record
    of this run can ever carry the balance step's own outcome, and no scenario can ever be shown
    to have been answered by it. A demand nothing could ever satisfy is not a check a consumer has
    failed to cite; it is not a check.

    AND A CONFIGURED ANSWER WOULD LOOK IDENTICAL, WHICH IS WHY THE FIXTURE SAYS NOTHING. A pair of
    notChecks entries produces exactly this report — no balance row, no dump row — over exactly
    this pipeline. The two answers part company at the consumer who never wrote the entries, and
    under the configured one their very first run reports their own reconciler as an uncited
    fitness check on their books. So the target below carries no such list at all, and the report
    it produces must name nothing as excluded: an exclusion section appearing here would say the
    consumer's own configuration did the work, and there is no configuration to do it.

    WHAT RECOGNISES THEM IS NOT A NAME. The reconciling step is the one running this tool's own
    reconciling invocation — through a manifest script alias like any other command, by whole
    shell tokens like the runner rule beside it, and adjacent, so the same tool run for another
    purpose stays a candidate. The dump is the step carrying GitHub's own step-record expression,
    which is the only way that record can be produced. Neither reads a step's title, and neither
    is a list: one is our own invocation, one is GitHub's own grammar.

    BOTH STEPS ARE DISCOVERED BEFORE THIS RULE TAKES THEM OUT, which is what gives the scenario its
    teeth. Each invoked its command through a lint:-prefixed script, so both were found under the
    prefix rule of the day and both posted to the suspense row — wrong, and red; under the inverted
    rule they are found because they are steps, which is the same fact reached by a
    wider route. A fixture whose reconciler the reader could not see at all would leave this
    scenario green on its first run over a reader that had never looked at the step, which asserts
    nothing.

    THE SWEEP CHECK IS THE CONTROL. A reader that discovered nothing at all satisfies "neither
    reaches the books" while being blind, so an ordinary check of the same pipeline — same job,
    named by nothing — has to stay on them.

    @unit @integration @SCN-USG-014
    Scenario: the balance step and its step-record dump are not candidates, and no configuration says so
      Given a target whose pipeline runs the reconciliation and dumps the step record it reads
      And a manifest that says nothing about either step
      And an ordinary check step of the same pipeline
      When the reconciliation report is rendered for the target
      Then the report accounts for both steps as the reconciler, and neither is on the books while the ordinary check is
      And the report names nothing the target excluded

  Rule: a step is a candidate whatever form it takes

    AN ACTION CAN BE A QUALITY CHECK, AND THE COMMON ONES ARE. CodeQL's analyse step and a
    dependency review are actions rather than commands, so a reader discarding every uses: step
    drops real checks — and drops them without a word, which is the exact fault the inverted
    membership rule exists to end. The discard cost nothing while nothing downstream wanted an
    action; under the inversion it is a fifth outcome smuggled in at the walk.

    EXCLUDING ACTIONS WHOLESALE WOULD BE THE PREFIX RULE AGAIN, ONE LAYER ALONG. A structural rule
    about where a check may LIVE is the same guess as a rule about what one may be CALLED, and it
    is a guess this tool has already been wrong about once. Nothing about a step's form says
    whether it is a check. What says so is what the target named a runner, what the reconciler is,
    and what the consumer said is not one — the same three facts, asked of the same steps.

    AND IT IS THE SHAPE A NON-NODE CONSUMER ARRIVES IN. A pipeline whose static analysis is CodeQL
    and whose dependency review is an action has no package.json script for either, so a run:-only
    reading hands that consumer an empty report, the one a Node-shaped limit would hand them by a
    different route.

    THE ACTION REFERENCE IS THE NAME, AND IT IS GITHUB'S RATHER THAN ONE INVENTED HERE — the
    step's name: where it has one, else the uses: value. A run: step is named by the script it
    invokes because that is the handle a consumer runs to reproduce the check; an action step
    invokes no script of theirs, so a handle read out of its shape would be a convention, and the
    honest answer is the string already in front of them in their own run log.

    WHAT AN ACTION DID IS NOT ASKED HERE, and the boundary is deliberate. The run record is the
    only thing that says what any step did, and its rules are untouched. This Rule is discovery
    and nothing else: the action ran in this pipeline, and nothing cites it.

    THE COMMAND CHECK BESIDE IT IS THE CONTROL, and without it the claim is unfalsifiable twice
    over. A reader discovering nothing at all satisfies "the action is uncited" by being blind,
    and a reader that gained the uses: half while losing the run: half satisfies it too — so an
    ordinary command check has to stay on the books in the same run.

    @unit @integration @SCN-USG-013
    Scenario: a `uses:` step is a candidate fitness check, reported by the action it uses
      Given a target whose pipeline runs a quality check as an action rather than a command
      And a check step of the same pipeline that runs a command
      When the reconciliation report is rendered for the target
      Then the report posts the action to the suspense row, named by the action reference it uses
      And the command check is on the books beside it

  Rule: a manifest naming no runners makes every step a candidate

    THIS IS THE STATE THE PRODUCT EXISTS FOR. The product promises the consumer who installs it
    and does nothing else a report of every check their pipeline ran, listed — and under the prefix
    rule that promise was conditional on a naming convention they had never heard of. Measured over
    the planted consumer at the head of this axis's analysis, a manifest carrying an empty
    specController block reported ONE static check run over a pipeline of eleven steps, and said
    nothing whatever about the other ten. This scenario is that promise made true, and the shape
    that makes it true is subtraction: nothing was named, so nothing is taken out.

    A MANIFEST THAT HAS SAID NOTHING IS SUPPORTED, NOT INCOMPLETE. There is no error, no warning,
    and nothing anywhere asking the consumer to configure something before the tool will answer
    them. A first run that scolded its reader for the absence of a block would be the prefix rule's
    demand wearing a different sentence — you must tell us about your pipeline in our terms before
    we will read it — and the whole argument of the inversion is that the tool reads what is there
    and reports it.

    THE TARGET'S OWN TEST SUITE IS A CANDIDATE, AND ASSERTING THAT IS THE POINT. With no runner
    named, pnpm test is a step like every other step and lands on the books as one. It is a false
    POSITIVE, it is the direction this axis chose deliberately, it is visible in the report, and it
    is one line of the consumer's own configuration to correct. Quietly exempting it
    would take a rule about what a test step is CALLED or what it LOOKS like — a runner list of
    ours — which is the drift the whole inversion exists to remove, reinstated at the one step where
    it would look most reasonable.

    EVERY STEP THAT IS NOT THE RECONCILER, strictly. The reconciler and its step-record dump come
    out by construction and hold over a manifest saying nothing, so "every step" is
    never literally every step of every pipeline. This target's pipeline runs no reconciler at all,
    which is what keeps the claim here to exactly one thing: the steps that reach the books are the
    steps that are there, and the other exclusion has nothing to be confused with.

    THE FIRST RUN STILL REDS, AND THAT IS NOT SOFTENED HERE. A candidate citing nothing posts to
    suspense, so a consumer who has configured nothing is out of balance on their first run. That is
    the state as it stands, and it is asserted rather than worked around. --exit-zero moves the
    exit status of that run and never the report this Rule pins.

    THE EXACT SET IS THE CONTROL, not a count. A reader that discovered nothing satisfies no part of
    this; a reader that dropped uses: steps, or one that guessed at a default runner for a block the
    consumer never wrote, reports a proper subset of the same pipeline and reds on the set rather
    than on a total that could be reached two ways.

    @unit @integration @SCN-USG-017
    Scenario: a target with no runners block reports every step of its pipeline as a candidate
      Given a target whose configuration names no runners and no non-checks
      And a pipeline of ordinary steps, the target's own test suite among them
      When the target's first reconciliation is rendered
      Then the report posts every step of that pipeline to the suspense row, the test suite among them
      And the report asks the target to configure nothing
      And the run does not balance

  Rule: the report names the scope it read

    THE AXIS'S OWN ANALYSIS ASKED WHAT THE TOOL SAYS WHEN IT IS POINTED SOMEWHERE THAT YIELDS AN
    IMPLAUSIBLE ANSWER — pointed at a release workflow it would post that pipeline's publish step
    as a quality check, and pointed at one job of several it would miss the checks in the others
    without a word. The answer is that the tool makes NO judgement about plausibility and states
    its scope instead. A trigger-based or name-based rule for "this looks like a release workflow"
    is exactly the judgement this axis puts out of scope — any judgement about whether a discovered
    step ought to be a check — and it would be a list of ours, which is the drift the whole
    inversion exists to remove.

    STATING THE SCOPE IS THE ANSWER, not a consolation for not having a better one. A consumer
    pointed at the wrong thing reads the file and the job and the counts, knows on sight, and
    corrects it by narrowing --ci or by naming the steps that are not checks.
    A wrong answer the report says out loud is one line of their own configuration;
    a wrong answer it keeps to itself is the silence this axis exists to end.

    AND IT IS THE ANSWER TO THE QUIETER HALF — THE JOB THE TOOL NEVER LOOKED AT. Discovery reports
    a bare count of what survived, and nothing anywhere said how many jobs that count came from: a
    consumer whose second job holds three checks reads exactly what a consumer with three checks in
    one job reads. Neither figure can be got from the other, so the provenance has to be stated,
    and stating it is what makes a scope that is too narrow visible without the tool guessing that
    it is.

    BOTH FIGURES PER JOB, because either alone is satisfiable by a reader that is wrong about the
    other. Steps read alone says what was in front of the tool and nothing about what it did with
    them; candidates alone is the count that is already on the report, re-cut. It is the pair, per
    job, that lets a consumer see a whole job pass through discovery contributing nothing and ask
    why.

    SORTED, so two runs over one tree cannot differ and a diff of two reports never turns on the
    order a directory happened to be handed back in — the same reason the source resolution sorts.

    NOT THE ACCOUNTING IDENTITY, which is its own Rule. That one asserts the
    dispositions sum to the steps read, so nothing the reader saw goes missing; this one asserts the
    provenance — which files and which jobs those steps came from. A reader satisfies either alone:
    a correct sum over a scope it never names, or a named scope whose numbers do not add up.

    TWO WORKFLOWS, AND A SECOND FILE WHOSE JOBS DO NOT STAND ALONE, ARE THE CONTROL. A reader
    reporting one row per workflow satisfies "names the workflows" while flattening the jobs;
    a reader naming only the job the checks are in satisfies "names
    the jobs" while hiding a job it ranged over for nothing. And the fixture's jobs are written in
    an order the sorted report has to change, so a reader emitting them as it met them reds rather
    than agreeing by coincidence.

    @unit @integration @SCN-USG-020
    Scenario: the report names the workflows, the jobs and the step count discovery ranged over
      Given a target whose pipeline is two workflows, the second of them running two jobs
      When the reconciliation report is rendered for the target
      Then the report names every workflow and every job it read, with the steps it read from each and how many of them became candidates
      And the scope it names reads in one settled order

  Rule: every step the reader saw is accounted for

    THIS AXIS'S FIRST NON-NEGOTIABLE IS A CLAIM ABOUT CODE, AND PROSE CANNOT HOLD IT. Nothing seen
    is dropped: a step that reaches this reader leaves it as a candidate fitness check, as one of
    the runners the target named, as the reconciler, or as a step the consumer called a non-check.
    There is no fifth outcome. Four exhaustive dispositions is not a sentence any reader can check
    by reading, and the fault it forecloses is the exact one this whole axis exists to end — a step
    seen and quietly discarded. So the exhaustiveness is asserted as an identity over the report's
    own numbers: candidates plus runners plus the reconciler plus the excluded equals the steps read.

    IT ASKS WHAT WOULD STOP BEING COUNTED, NOT WHAT WOULD FAIL, and that is why it is here rather
    than left to the scenarios beside it. Every other scenario on this axis watches a step arrive
    somewhere — on the books, in the runner cut, in the reconciler's two lines, in the excluded
    list. A removal-shaped fault raises nothing for any of them to miss: a filter that drops a step
    on a branch nobody enumerated posts no row, names no step and reds no assertion, because the
    thing it did was to not happen. Only a cardinality instrument sees an absence like that, and a
    cardinality instrument is what this is.

    THE SUM IS THE CODE'S, NOT THE TEST'S. A scenario that read the four figures off the report and
    added them up itself would be measuring its own arithmetic — it would agree with itself over any
    four numbers the report happened to print, including four printed by a reader that had lost a
    step. So the report states BOTH totals: how many steps this run read, and how many of them it
    accounted for. The scenario reads the pair.

    FOUR FIGURES NOBODY CAN SWAP, which is the fixture's job. Its pipeline is built so that the four
    dispositions carry four different counts — four candidates, one runner, two reconciler steps,
    three the manifest calls non-checks — so a reader that attributed a step to the wrong
    disposition reds on the figures even where the total would have survived the mistake. A pipeline
    where two dispositions read alike would let that error through in silence.

    AND BOTH FORMS OF STEP ARE AMONG THEM. One of the candidates is an action rather than a command,
    because a `run:`-only reading is the historical shape of exactly this fault and
    the identity is what would have caught it as a shortfall rather than as nothing at all.

    @unit @integration @SCN-USG-018
    Scenario: candidates, runners, the reconciler and the excluded sum to the steps read
      Given a target whose pipeline holds every disposition this reader has — checks, the runner its manifest names, the reconciliation itself, and steps it calls non-checks
      When the reconciliation report is rendered for the target
      Then the report states how many steps it read and how many of them it accounted for, and the two agree
      And each disposition carries the count that pipeline gives it
