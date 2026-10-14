@USG
Feature: Detect uncited fitness-functions — a CI check no scenario cites

  The fitness-function axis's UNCITED detection — the mirror of the
  behavioural axis's cites-no-scenario evidence observations. A check that runs in CI which nothing
  cites is an unposted evidence observation, and the axis sees it because its whole input is the running-check
  observer below, not the checks an obligation names.

  The running-check observer emits every check a CI step runs into the reconcile stream, so the
  ONE reconcile engine sees the complete fitness-function stream: a check a scenario cites posts to
  that scenario's row; one no scenario cites — the citation seam reaches no @SCN for it —
  cites no scenario, so reconcile folds it to the suspense row (an UNCITED fitness-function). The
  report's fitness-function census is a pure count over the stream, runningFitnessFunctionCount and
  uncitedFitnessFunctionCount; the cited count is implicit, running − uncited. It is the fitness-function-axis
  mirror of the behavioural count under Test volume. The report surfaces the counts under
  "### Fitness functions", mirroring "### Test volume"; the guard member detail lives in the rows.

  WHICH STEPS ARE FITNESS FUNCTIONS, AND WHY IT IS NOT A NAMING QUESTION. Membership is every CI
  step left once declared runners, the reconciler, GitHub's own plumbing actions and declared non-checks are taken out — never a property of its name, and never whether it reads
  source or executes code: a step that runs a mutation verdict or a temp-directory check is a
  fitness function as much as a lint is. No naming heuristic decides it,
  neither a lint:/guard: prefix nor the target's own specController.staticChecks:
  membership is decided by subtraction, and a run: step of the workflows --ci names is a
  candidate fitness function unless it runs a behavioural runner the manifest names, is the
  reconciler, only uses one of GitHub's own plumbing actions, or is a step the manifest names a
  non-check. checkout is GitHub's plumbing and leaves by construction; install is a step like
  any other and leaves by the manifest's own list; test and cucumber are the behavioural axis's
  observed evidence and leave by the first door, which is what the manifest's runners block says.

  `tsc --noEmit` is static analysis on any reading, and it is not deferred: a deferral recorded
  only in a feature preamble is one nobody reads again. A public-api scenario names typecheck, so
  it is on the books rather than in a sentence.

  `pnpm mutation` is a self-measuring threshold check — the pipeline measuring its own test
  strength — whose verdict belongs on an axis this tool has not built, a sibling of the one
  that @ci-run-time names.

  THE ZERO OVER SPEC-CONTROLLER'S OWN TREE IS A ZERO OVER A POPULATED SET. A zero over an empty
  set would say the discoverable set was EMPTY rather than that a populated set had been checked
  and come back clean. Those two readings are the fault this product exists to separate: collapsed
  onto one number, they are a capability exercised by nothing, reporting green.

  EVERY run: STEP OF ci.yml IS A CANDIDATE, so the denominator is this repository's whole
  pipeline: every check it runs is discovered, each carrying the code of the scenario it answers
  on its own step, and nought uncited. specController.staticChecks settles nothing: a manifest
  carrying the key has it named on the report as any key the specController block does not read
  is named.

  What is NOT vacuous over this tree is the number beside it. The "fitness function(s) run" figure counts
  the running fitness evidence observations this pipeline's own candidate steps post, so it is answered by those steps
  and only the uncited count is answered by discovery. Reading both as products of the same mechanism
  is the misreading this paragraph forecloses.

  THE FIGURES THEMSELVES ARE NOT WRITTEN HERE, BECAUSE A FIGURE HERE GOES STALE UNNOTICED.
  Nothing reconciles a number in a preamble against the tree it describes, so it can be wrong
  without redding anything. A number in this prose is a second reading of something nothing keeps
  it in step with, so none is written.

  Unit tests hold the reading, the counting and the render section in isolation. The scenarios
  here that keep a Cucumber layer also drive the real file reads (ci.yml + package.json +
  features) over a fixture target and assert the rendered report surface.

  Rule: a CI check no scenario cites is reported as an uncited fitness function

    A CHECK IS UNCITED WHEN ITS STEP NAMES NO SCENARIO. A check's CI step cites the scenario it
    answers by carrying that scenario's @SCN as its `id:`, and the evidence observation carries the citation
    from there; a step that carries none reaches no scenario at all, and its check is uncited.
    The reader-visible landing is cites-no-scenario on the suspense row, surfaced under
    "### Fitness functions", because what this axis reports is a check nobody has taken
    responsibility for.

    THE EVIDENCE OBSERVATION IS NEVER DROPPED, which is the clause worth saying out loud on the Evidence Observation side.
    Every Evidence Observation posts somewhere, so a check the seam cannot place is not quietly
    left out of the count: it is banked on the suspense row carrying the handle that ran, and the
    run reds. The failure this forecloses is the comfortable one — a check nobody owns becoming a
    check nobody can see, with a balanced report to say so.

    UNCITED IS NOT MISCITED. A step that carries no `id:` cited nothing and lands on the suspense
    row; a step whose `id:` names a code no scenario carries looked and missed, and posts to a
    phantom row under that code. The cures differ — give the step its scenario's code, or fix the
    code it gives — so the two are told apart by where the evidence observation lands, never guessed at. This
    Rule is the first: its tests' target runs two checks, and the only difference between the
    cited one and the uncited one is whether the step carries a scenario's code.

    @unit @SCN-USG-001
    Scenario: a CI check no scenario cites is reported as an uncited fitness function

  Rule: a check a scenario cites is attributed, not an uncited fitness function

    THE POSITIVE TWIN, AND WHY THE PAIR IS NOT ONE SCENARIO SAID TWICE. The rule above is
    satisfied on its own by a reader that places NOTHING and calls every running check uncited;
    this one is its control. Over the SAME target, the check whose step carries a scenario's code
    has to reach that scenario's row and fold into the running volume rather than the uncited
    count. Between its two checks exactly one fact differs — whether the step carries a code —
    so nothing but the citation can move either verdict.

    ATTRIBUTED MEANS POSTED. lint:foo's step carries the stepless scenario's code as its
    `id:`, so the run's evidence observation cites that scenario and lands on its row. Nothing matches the
    handle that ran back to a tag, and nothing resolves the citation through a second artefact.

    WHICH IS WHY THE ASSERTION READS THE ATTRIBUTED ROW, not merely the absence of an uncited one.
    Absence is the weaker claim and several wrong readers produce it: one that posts the evidence observation to
    a scenario the corpus never wrote reports no uncited check either, and so does one that drops
    the evidence observation on the floor. The reconciler's own never-dropped clause is what makes that
    distinguishable — every observation lands somewhere — so this scenario names where.

    @integration @SCN-USG-002
    Scenario: a check a scenario cites is attributed, not an uncited fitness function
      Given a target whose CI runs the lint:foo and lint:bar checks
      And only lint:foo is cited by a scenario
      When the reconciliation report is rendered for the target
      Then lint:foo is attributed to the scenario citing it, not reported uncited

  Rule: a step invoking a runner the manifest names is not a candidate fitness function

    THE MANIFEST DRAWS THE EXCLUSION. What takes a pipeline step
    out of this axis is the target saying which commands run its behavioural suites: its
    manifest names one runner per tier, and a step invoking that runner — reached through the
    manifest script the step runs — is that tier's runner rather than a gate.
    This target names vitest for unit and cucumber-js for integration, and its test and
    cucumber scripts run exactly those, so both steps are recognised where CI invokes them.

    THE FAULT IS DOUBLE-COUNTING, NOT A WRONG NUMBER. pnpm test and pnpm cucumber ARE evidence:
    they are how a corpus's behavioural scenarios get their observations at all. A reader that
    derived them here would post one run twice — once as the behavioural evidence it is, and
    once as a fitness function nobody wrote a threshold for — and the tree would be reported
    running more gates than it has, with the invented ones redding as uncited for no fault of
    the tree's.

    WHICH IS WHY THE TALLY IS WHAT THIS SCENARIO ASSERTS FIRST. A behavioural step wrongly taken
    for a check cites nothing, so it falls to the suspense row and names itself there — but that
    row can only be read for by a reader who already knows which handle to look for, and a
    recognition rule can fail over a step nobody predicted. The count moves whichever step it
    was, so the count is asserted first and the suspense reading is what tells a reader which
    step inflated it.

    @unit @SCN-USG-003
    Scenario: test and cucumber CI steps are not candidate fitness functions, because the manifest names their runners

  Rule: a CI check whose script name matches no convention of the tool's is reported as an uncited fitness function

    NO PREFIX FINDS ANYTHING, BECAUSE THERE IS NO PREFIX SET TO FIND WITH. The set of names a
    quality check might be given belongs to the consumer and is unbounded, and any list of prefixes
    is a sample of it. So membership is decided by subtraction: a step of the pipeline is a
    candidate fitness function UNLESS it invokes a runner the manifest names, is the reconciler, or
    is a step the consumer named a non-check. The script below is called domain-purity, which
    matches no convention this tool recognises, and it is found because nothing takes it out.

    THE UNCITED VERDICT IS WHAT THIS SCENARIO IS ABOUT, and it is reachable because the check is
    discovered at all. A prefix rule would leave this exact target silent: its check running,
    citing nothing, and producing no row, no count and no red — a clean board over a gate nobody
    owned.

    THE CITED HALF IS WHAT MAKES IT MEAN SOMETHING, and it is the twin one Rule along.
    A reader that reported every step as uncited would satisfy this scenario while
    being useless; only a sibling target whose identically-unprefixed check IS attributed tells the
    two apart.

    DISCOVERED, AND STILL UNCITED — the shape that separates discovery from citation. The check is
    found because nothing takes it out, and it is uncited because its step carries no `id:`, so
    its run reaches no scenario. One fact holds this verdict, and it is the fact the cited twin
    flips: the same check, with its step carrying a scenario's code.

    THE LANDING IS READ ON THE ROW, not anywhere in the report. Posting to suspense is a claim
    about WHERE the evidence observation went, and a whole-report search cannot tell the suspense row from any
    other row that happens to mention the handle — the reading already scoped for the
    lint:-prefixed case. An unprefixed check lands exactly where a prefixed one lands, so this
    scenario asserts it in the same terms rather than settling for the absence of an attribution.

    @unit @SCN-USG-004
    Scenario: an uncited check whose script name carries no prefix of ours is an uncited fitness function

  Rule: a fitness function is observed wherever in the workflows it runs

    BOTH observers read a target's CI from ONE source, so that source is every workflow. Read
    from one file, a check enforced from a sibling workflow — a nightly sweep, a security scan,
    an ordinary split of a pipeline — would read as not enforced, and the two axes would fail it
    in OPPOSITE directions: a CITED one accused of being a watermelon it is not, an UNCITED one
    leaving the books entirely.

    THE FIRST IS A FALSE ACCUSATION, which is why it leads. An omission under-reports;
    an invention tells a consultant their client's real, running gate is fabricated. The
    reconciler's word for a cited-but-unenforced check is watermelon, and a check running
    in nightly.yml would earn it for no reason but where it was written down.

    WHAT MAKES THE CHECK CITED IS ITS STEP; WHICH WORKFLOWS ARE READ IS THIS RULE. lint:nightly's
    step in nightly.yml carries the stepless scenario's code as its `id:`, so its run
    cites that scenario and lands on its row. The citation is settled where the step is; this
    Rule is about whether the step is read at all.

    THE SATISFIED ROW IS WHAT THE ASSERTION READS, and the absent watermelon is its second
    half rather than the whole of it. Absence is the weaker claim and several wrong readers
    produce it: one that never resolves the citation leaves the obligation unsettled and
    raises no watermelon either, and one that resolves it to a scenario the corpus never
    wrote banks the evidence observation on a phantom row and raises none either. Naming the row the evidence observation
    lands on is what tells those apart from the verdict this scenario is about.

    TWO FACTS HOLD THIS VERDICT, AND THE SIBLING WORKFLOW IS ONLY ONE OF THEM. The step has to
    carry the scenario's code for the run to reach a scenario at all, and the check has to be
    invoked in a workflow the reader actually opens for a run to exist against the obligation.
    Reading ci.yml alone leaves the citation untouched and takes the run away, and the target is
    then scored a watermelon — a real, running gate called fabricated.
    That is the fault this Rule refuses.

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
    uncited anywhere. The two scenarios fail apart: narrowing the workflow walk reds both, but
    dropping an unplaceable evidence observation reds only this one, and taking every check for an attributed
    one reds only this one too.

    DISCOVERED, AND STILL UNCITED, on the terms this feature file's other uncited scenarios hold.
    lint:sweep's step carries no `id:`, so its run reaches no scenario. One fact holds this
    verdict, and it is the fact the cited twin flips: the same check, with its step carrying a
    scenario's code.

    The plural stops at SOURCES. The reader of CI commands takes strings of CI config so a
    second ecosystem can supply its own; the walk from a directory to those strings is the
    ingest edge's, which knows where GitHub keeps workflows and nothing more.

    @unit @integration @SCN-USG-006
    Scenario: a cited fitness function enforced from a sibling workflow is satisfied, with no watermelon raised against it
      Given a target whose ci.yml runs no fitness function and whose nightly.yml runs lint:nightly
      And a scenario cites lint:nightly
      When the reconciliation report is rendered over the target's workflow directory
      Then lint:nightly reconciles satisfied, with no watermelon raised against it

    @unit @SCN-USG-007
    Scenario: an uncited fitness function running in a sibling workflow is reported uncited

  Rule: an explicitly supplied CI file narrows observation to that file

    NAMING ONE FILE OBSERVES ONE FILE. The whole workflow directory is read by default, and a
    caller who names one file has narrowed that scope deliberately. A narrowing nobody tests is
    a promise.

    Every other scenario here asserts what IS found, so a change making an explicit
    input sweep its parent directory too would leave all of them green while silently
    widening a caller's deliberate scope — the direction that produces a surprise red on
    a client's tree. This is the scenario that reds instead.

    THE MANIFEST IS NOT A SOURCE OF RUNS. A script CI does not run is not a gate, and counting it
    would red every repository for owning a helper it never runs, so a run is observed only from
    the CI files read. Naming one of them is therefore the whole of the narrowing.

    @integration @SCN-USG-008
    Scenario: an explicitly supplied CI file narrows observation to that file alone
      Given a target whose nightly.yml runs lint:sweep and whose ci.yml does not
      When the reconciliation report is rendered for that target's ci.yml alone
      Then lint:sweep is not counted among the running fitness functions

  Rule: a CI check whose script name matches no convention of the tool's, that a scenario cites, is attributed

    THE CONTROL THAT MAKES THE RULE ABOVE MEAN SOMETHING. The rule above is satisfied on its own by
    a reader that places nothing and calls every script it finds uncited; this is what stops that.
    Both targets run the same domain-purity script, a name matching no convention of ours, so the
    ONE fact left between them is whether the step cites a scenario, and that fact alone moves
    the verdict off the suspense row and onto a scenario's.

    WHICH IS WHY THE NAME CANNOT BE WHAT DECIDES, and the pair is what proves it rather than
    asserts it. The two targets run the same script, so any reader answering from the handle's
    spelling answers the same way for both — and the two verdicts differ. Whatever places this
    evidence observation on the scenario is reading the citation; a name is the thing these two targets share.

    THE ASSERTION READS THE ATTRIBUTED ROW, not the absence of an uncited one — the reading
    already given to its own cited twin. Absence is the weaker claim and several
    wrong readers produce it: one that drops the evidence observation on the floor reports no uncited check
    either, and so does one that posts it to a scenario the corpus never wrote.

    BOTH REACH THIS AXIS THROUGH DISCOVERY, which reads every step of the pipeline that is not a
    runner the manifest names, the reconciler, or a step the consumer named a non-check. What
    parts them is the step's citation alone: the cited one's evidence observation carries its scenario's code,
    and the uncited one's carries none.

    SO NARROWING DISCOVERY IS THE PLANT: name this target's own step a non-check and the twin's
    verdict is what goes, while this one is attributed exactly as before. The handle carries no
    prefix at all and is attributed anyway.

    @unit @SCN-USG-005
    Scenario: a cited check whose script name carries no prefix of ours is attributed, not an uncited fitness function

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
    vitest.json inside its --vitest argument. Excluding a fitness function as a runner is the one
    direction this axis cannot tolerate, because it is silent — and it happens on the first real
    pipeline a substring rule is pointed at. The sibling scenario one Rule along is welded to that
    line; this one is why the hop exists at all.

    A STEP INVOKES A SCRIPT BY THE PRODUCT'S OWN EXACT PACKAGE-MANAGER TEST, the same reading a
    fitness function's enforcement is already taken through, so two readers cannot come to disagree
    about what pnpm test invokes. The script's body is then read for the runner as a whole token,
    and a script invoking another script is followed to a depth of three under a visited set: a
    deeper chain is a shape no pipeline measured has, and an unbounded walk over a
    manifest the consumer wrote is an input this tool does not control.

    THIS RECOGNITION IS BOTH THE READER AND THE VERDICT. A step recognised as a runner is NAMED
    on the report rather than left silent, and what keeps a runner step off the fitness-function axis is
    this rule and nothing else. Both readings go through one comparison, so the report and the
    books cannot disagree about which step ran a runner.

    @unit @SCN-USG-011
    Scenario: a step running `pnpm test` is the unit runner when the manifest's `test` script runs vitest

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

    THE CHECK STEP HERE IS AN ORDINARY ONE, deliberately. The reconciler's own step is excluded
    too, but BY CONSTRUCTION and not by this rule — sharing one fixture would leave
    two different exclusions free to answer for each other, and a green would say which of them
    was doing the work.

    @unit @SCN-USG-012
    Scenario: a check step naming a runner in a path or an argument is a candidate, never excluded as the runner

  Rule: a runner whose output another command reads is a tool of a check, and the step is a candidate

    THE RUNNER IS THE COMMAND HERE, AND THE STEP IS STILL A CHECK. A gate can run the declared
    runner itself, in a dry run or a listing, and hand what it prints to a filter that passes the
    verdict. The runner's name is then a whole token of the step's command, so the token rule
    alone would take the step for the suite and drop the gate from the books with nothing said.

    WHAT TELLS THEM APART IS WHO READS THE RUNNER'S OUTPUT. A suite step's output is read by
    nobody in the step: the reconciler reads its report later. A gate's output is the next
    command's input. So a runner is recognised only in the last stage of a pipeline, in the step's
    own command and in any manifest script it follows. Measured over every pipeline
    surveyed, no suite step pipes its runner onward, and both gates of this shape do.

    CUTTING A COMMAND TO ITS LAST STAGE CAN ONLY REMOVE A RUNNER MATCH, NEVER ADD ONE, so every
    misreading lands on the side a consumer can see: a step reported as a check is one line of
    notChecks, and a check reported as the runner is a gate deleted from the report.

    A READER BLIND TO RUNNERS WOULD PASS HERE TOO, and is caught beside it. One that recognised no
    runner at all would put the check on the books as well; the scenario that recognises the unit
    runner from a `pnpm test` step is what shows the reading discriminates rather than going blind.

    @unit @SCN-USG-029
    Scenario: a check step piping a declared runner's output into another command is a candidate, never excluded as the runner

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

    WHAT THIS DOES NOT ANSWER, kept out on purpose. A key that is not one of the four tiers
    is its own scenario. A target carrying no runner block at all is another,
    and its report is untouched here — this section speaks only for a target that
    has said something. A tier NAMED whose runner no step runs stays the open question the
    recognition section already deferred; naming a tier is not saying it has none.

    @unit @SCN-USG-016
    Scenario: a null runner reports the tier as having none, and an absent key reports it as unnamed

  Rule: the runner block is keyed by the four tiers and no other

    A CLOSED SET WITH NOTHING FORCING ITS CLOSURE IS A HOLE. The runner block is keyed by tier
    and the tiers are four — unit, integration, e2e, performance — which is exactly what makes
    membership by subtraction possible: the small thing is named because it is enumerable, and the open one
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
    they think, with no line anywhere to correct it from — a check vanishing silently, reached
    from the configuration side rather than the pipeline side.

    SO THE RUN IS NOT ABORTED OVER IT, AND THAT IS THE SAME FAIL-SAFE DIRECTION AS THE REST. An
    unrecognised key is a fact about the manifest, surfaced on the report where the consumer can
    read it and fix it in one line. Throwing would cost a run its whole verdict over one typo in
    a block that changes no verdict at all — the stance every resolver in this family already
    takes about data that came from outside.

    THE KEY EXCLUDES NOTHING, WHICH IS THE HALF THAT NEEDS A CHECK BESIDE IT. An absence proves
    little on its own: a reader recognising nothing anywhere satisfies it. So its tests' target
    runs a real check whose script the bogus key names, and that check has to reach the books as
    an uncited fitness function — the presence that makes the absence mean something.

    @unit @SCN-USG-019
    Scenario: a runners key that is not one of the four tiers is reported, never silently honoured

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

    @unit @SCN-USG-025
    Scenario Outline: a specController entry of a kind its reader does not take is named on the report with the kind it is and the kind that is read, and every other entry takes effect as without it

    @unit @SCN-USG-028
    Scenario Outline: a key the specController block does not read, a retired one included, is named on the report as unknown in the same words as any other, and the run is not refused over it

    @unit @SCN-USG-026
    Scenario Outline: a specController block whose every entry is a kind its reader takes names nothing as the wrong kind

    @unit @SCN-USG-027
    Scenario: a saved run re-rendered names the same specController entries its live report named

  Rule: a step the manifest names a non-check is excluded, and the report says so

    THE THIRD EXCLUSION, AND THE ONLY ONE THAT IS THE CONSUMER'S OWN LIST. Not everything that
    is not a behavioural runner is a fitness function — a checkout, a corepack enable, a dependency
    install, a deploy — and a rule calling those checks fills a consumer's first report with
    noise. So the consumer gets to say which steps are not checks, about their own pipeline,
    once. It is a list of THEIR steps, never a list of check names of ours, and that is what
    keeps it from being a naming rule wearing a new hat.

    AN ENTRY IS FULLY QUALIFIED AND MATCHED EXACTLY — the workflow file, the job it is written
    under, and the step's own name, which is the string GitHub itself shows in a run log. Typecheck
    is a check in this repository's ci.yml and plumbing in its release.yml, so a bare-name entry
    would take out both, and the second of those is a check deleted from the report with nothing
    said. The walk carries job identity for exactly this.

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
    exclusion from the blindness. Both checks are discovered because they are steps, and the
    fixture's plumbing is named a non-check beside them for the same reason.

    @unit @SCN-USG-015
    Scenario: a step named in `notChecks` is not a candidate, and is reported as excluded rather than dropped

  Rule: the reconciler is not one of the reconciled rows

    THE SECOND EXCLUSION, AND THE ONLY ONE NOBODY WRITES. A consumer's pipeline runs the
    reconciliation itself, and the run that computes the books cannot be a row in them: the step
    that runs balance is the reconciler, not a check it reconciles. The step-record dump goes with
    it, because that record is the reconciler's own input — written before balance reads it, which
    is what makes it the input rather than an observation about it.

    A CITATION ON EITHER IS UNSATISFIABLE, and that is the whole of why this is by construction
    rather than a judgement. The dump is written BEFORE the reconciliation reads it, so no record
    of this run can ever carry the balance step's own outcome, and no scenario can ever be shown
    to have been answered by it. An Evidence Obligation nothing could ever satisfy is not a check a consumer has
    failed to cite; it is not a check.

    AND A CONFIGURED ANSWER WOULD LOOK IDENTICAL, WHICH IS WHY THE FIXTURE SAYS NOTHING. A pair of
    notChecks entries produces exactly this report — no balance row, no dump row — over exactly
    this pipeline. The two answers part company at the consumer who never wrote the entries, and
    under the configured one their very first run reports their own reconciler as an uncited
    fitness function on their books. So its tests' target carries no such list at all, and the report
    it produces must name nothing as excluded: an exclusion section appearing here would say the
    consumer's own configuration did the work, and there is no configuration to do it.

    WHAT RECOGNISES THEM IS NOT A NAME. The reconciling step is the one running this tool's own
    reconciling invocation — through a manifest script alias like any other command, by whole
    shell tokens like the runner rule beside it, and adjacent, so the same tool run for another
    purpose stays a candidate. The dump is the step carrying GitHub's own step-record expression,
    which is the only way that record can be produced. Neither reads a step's title, and neither
    is a list: one is our own invocation, one is GitHub's own grammar.

    BOTH STEPS ARE DISCOVERED BEFORE THIS RULE TAKES THEM OUT, which is what gives the scenario its
    teeth: they are found because they are steps. A fixture whose reconciler the reader could not see at all would leave this
    scenario green on its first run over a reader that had never looked at the step, which asserts
    nothing.

    THE SWEEP CHECK IS THE CONTROL. A reader that discovered nothing at all satisfies "neither
    reaches the books" while being blind, so an ordinary check of the same pipeline — same job,
    named by nothing — has to stay on them.

    @unit @SCN-USG-014
    Scenario: the balance step and its step-record dump are not candidates, and no configuration says so

  Rule: a step is a candidate whatever form it takes

    AN ACTION CAN BE A QUALITY CHECK, AND THE COMMON ONES ARE. CodeQL's analyse step and a
    dependency review are actions rather than commands, so a reader discarding every uses: step
    drops real checks — and drops them without a word, which is the exact fault membership by
    subtraction exists to end: a discard at the walk is an outcome no disposition names.

    EXCLUDING ACTIONS WHOLESALE WOULD BE A NAMING RULE AGAIN, ONE LAYER ALONG. A structural rule
    about where a check may LIVE is the same guess as a rule about what one may be CALLED. Nothing about a step's form says
    whether it is a check. What says so is what the target named a runner, what the reconciler is,
    what the consumer said is not one, and the closed list of GitHub's own plumbing actions the
    Rule below names — the same four facts, asked of the same steps. The last is a list of
    actions that move things, never a rule about where a check may live.

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

    @unit @SCN-USG-013
    Scenario: a `uses:` step is a candidate fitness function, reported by the action it uses

  Rule: a step whose only work is one of GitHub's own plumbing actions is not a check

    THE FOURTH EXCLUSION, AND THE ONLY ONE THIS TOOL KEEPS A LIST FOR. Checking out the code,
    setting up a language, caching and moving artifacts between jobs are in nearly every workflow
    GitHub runs, and none of them judges anything: they move code, tools and files so that a check
    can run. Reported as fitness functions, they fill an unannotated pipeline's first report with
    steps nobody would call a check, and the consumer's own list is the wrong place to fix a fact
    that holds for every pipeline.

    IT IS A CLOSED LIST OF PLUMBING, NEVER A LIST OF CHECKS: actions/checkout, actions/setup-*,
    actions/cache, actions/upload-artifact and actions/download-artifact. A list of what is not a
    check grows only by a decision recorded with its reason, never by inference.

    THE MATCH IS ON THE ACTION, NEVER ON THE LINE THAT PINS IT. A step is read as an owner and a
    repository off its uses: value. The ref after the at sign, whether a tag, a branch or a pinned
    SHA, names a version of the same action, and a sub-path such as actions/cache/restore is a part
    of it, so none of them changes the answer. A rule matching the whole uses: line would let the
    first consumer who pins a SHA, as hardening guides tell them to, put their checkout back on
    the books.

    THE COMMAND CHECK BESIDE THEM IS THE CONTROL. A reader that discovered nothing satisfies
    "every plumbing step is absent" by being blind, so an ordinary run: check in the same job has
    to stay on the books.

    @unit @SCN-USG-030
    Scenario: a step that only uses one of GitHub's plumbing actions is not a candidate fitness function, whatever ref pins it

    NOTHING OUTSIDE THE LIST LEAVES WITH IT. The list names repositories, never the owner they
    sit under: actions/dependency-review-action is GitHub's own and is a check, so a rule over the
    actions owner would take a check off the books. Another owner's checkout, a repository whose
    name only begins with checkout, a local action and a docker:// image are each a step the
    consumer chose to run, and each stays a candidate. The checkout beside them is the control:
    a reader that put everything back on the books satisfies "the near-misses stay" by never
    excluding anything.

    @unit @SCN-USG-031
    Scenario: an action outside the closed list stays a candidate — dependency review, another owner's look-alike and a local action

    THE CONSUMER'S WORD COMES FIRST. A manifest written before this list existed names its
    checkout a non-check, and that entry still does what it says: the step is excluded and named,
    and the entry is not stale, because it matched a step. Were plumbing to take the step first,
    every annotated manifest's report would change under it and its entries would read as stale
    for naming steps that are still there. A second checkout no entry names is the control: it is
    counted as plumbing beside the excluded one, so the precedence is seen to choose, not to blind.

    @unit @SCN-USG-032
    Scenario: a plumbing step the manifest names a non-check is excluded as the manifest says, and its entry is not stale

  Rule: a manifest naming no runners makes every step a candidate

    THIS IS THE STATE THE PRODUCT IS FOR. A consumer who installs it and does nothing else gets a
    report of every check their pipeline ran, listed, with no naming convention to learn first.
    The shape that makes it true is subtraction: nothing was named, so nothing is taken out.

    A MANIFEST THAT HAS SAID NOTHING IS SUPPORTED, NOT INCOMPLETE. There is no error, no warning,
    and nothing anywhere asking the consumer to configure something before the tool will answer
    them. A first run that scolded its reader for the absence of a block would be a naming rule
    wearing a different sentence — you must tell us about your pipeline in our terms before we
    will read it — when the tool reads what is there and reports it.

    THE TARGET'S OWN TEST SUITE IS A CANDIDATE, AND ASSERTING THAT IS THE POINT. With no runner
    named, pnpm test is a step like every other step and lands on the books as one. It is a false
    POSITIVE, it is the direction this axis chose deliberately, it is visible in the report, and it
    is one line of the consumer's own configuration to correct. Quietly exempting it
    would take a rule about what a test step is CALLED or what it LOOKS like — a runner list of
    ours — which is the drift membership by subtraction exists to remove, reinstated at the one step where
    it would look most reasonable.

    EVERY STEP THAT IS NOT THE RECONCILER OR GITHUB'S PLUMBING, strictly. The reconciler and its
    step-record dump come out by construction and hold over a manifest saying nothing, and so does a
    step whose only work is one of GitHub's own plumbing actions — checking out, setting up a
    language, caching, moving artifacts — so "every step" is never literally every step of every
    pipeline. This target's pipeline runs no reconciler at all, and its one plumbing step is its
    checkout, which is what keeps the claim here to exactly one thing: the steps that reach the books
    are the steps that are there less the checkout every workflow carries, and the other exclusions
    have nothing to be confused with.

    THE FIRST RUN STILL REDS, AND THAT IS NOT SOFTENED HERE. A candidate citing nothing posts to
    suspense, so a consumer who has configured nothing is out of balance on their first run. That is
    the state as it stands, and it is asserted rather than worked around. --exit-zero moves the
    exit status of that run and never the report this Rule pins.

    THE EXACT SET IS THE CONTROL, not a count. A reader that discovered nothing satisfies no part of
    this; a reader that dropped uses: steps, or one that guessed at a default runner for a block the
    consumer never wrote, reports a proper subset of the same pipeline and reds on the set rather
    than on a total that could be reached two ways.

    @unit @SCN-USG-017
    Scenario: a target with no runners block reports every step of its pipeline but GitHub's plumbing as a candidate

  Rule: the report names the scope it read

    WHAT THE TOOL SAYS WHEN IT IS POINTED SOMEWHERE THAT YIELDS AN IMPLAUSIBLE ANSWER — pointed at a release workflow it would post that pipeline's publish step
    as a quality check, and pointed at one job of several it would miss the checks in the others
    without a word. The answer is that the tool makes NO judgement about plausibility and states
    its scope instead. A trigger-based or name-based rule for "this looks like a release workflow"
    is exactly the judgement this axis puts out of scope — any judgement about whether a discovered
    step ought to be a check — and it would be a list of ours, which is the drift membership by
    subtraction exists to remove.

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

    @unit @SCN-USG-020
    Scenario: the report names the workflows, the jobs and the step count discovery ranged over

  Rule: every step the reader saw is accounted for

    THIS AXIS'S FIRST NON-NEGOTIABLE IS A CLAIM ABOUT CODE, AND PROSE CANNOT HOLD IT. Nothing seen
    is dropped: a step that reaches this reader leaves it as a candidate fitness function, as one of
    the runners the target named, as the reconciler, as a step the consumer called a non-check, or
    as one of GitHub's own plumbing actions. There is no sixth outcome. Five exhaustive
    dispositions is not a sentence any reader can check by reading, and the fault it forecloses is
    the exact one this whole axis exists to end — a step seen and quietly discarded. So the
    exhaustiveness is asserted as an identity over the report's own numbers: candidates plus
    runners plus the reconciler plus the excluded plus GitHub's plumbing equals the steps read.

    PLUMBING IS COUNTED, NOT NAMED. Every workflow carries several checkouts and setups, so a list
    of them would bury the report in steps nobody needs to read. But a plumbing step leaves
    discovery by a rule the tool applies rather than one the consumer wrote, and a door nobody
    watches is where a step goes missing; the count is what keeps that door inside the identity.

    IT ASKS WHAT WOULD STOP BEING COUNTED, NOT WHAT WOULD FAIL, and that is why it is here rather
    than left to the scenarios beside it. Every other scenario on this axis watches a step arrive
    somewhere — on the books, in the runner cut, in the reconciler's two lines, in the excluded
    list. A removal-shaped fault raises nothing for any of them to miss: a filter that drops a step
    on a branch nobody enumerated posts no row, names no step and reds no assertion, because the
    thing it did was to not happen. Only a cardinality instrument sees an absence like that, and a
    cardinality instrument is what this is.

    THE SUM IS THE CODE'S, NOT THE TEST'S. A scenario that read the five figures off the report and
    added them up itself would be measuring its own arithmetic — it would agree with itself over any
    five numbers the report happened to print, including five printed by a reader that had lost a
    step. So the report states BOTH totals: how many steps this run read, and how many of them it
    accounted for. The scenario reads the pair.

    FIVE FIGURES NOBODY CAN SWAP, which is the fixture's job. Its pipeline is built so that the five
    dispositions carry five different counts — four candidates, one runner, two reconciler steps,
    three the manifest calls non-checks, five of GitHub's plumbing actions no entry names — so a
    reader that attributed a step to the wrong disposition reds on the figures even where the total
    would have survived the mistake. A pipeline where two dispositions read alike would let that
    error through in silence. One plumbing step the manifest does name stays among the non-checks,
    because the consumer's word comes first.

    A REPORT SAVED BEFORE PLUMBING WAS COUNTED STILL RENDERS. Its accounting has no plumbing
    figure, and it re-renders that cell as nought, which is true of the run that wrote it: that run
    counted every plumbing step among the other four.

    AND BOTH FORMS OF STEP ARE AMONG THEM. One of the candidates is an action rather than a command,
    because a `run:`-only reading is the historical shape of exactly this fault and
    the identity is what would have caught it as a shortfall rather than as nothing at all.

    @unit @SCN-USG-018
    Scenario: candidates, runners, the reconciler, the excluded and GitHub's plumbing sum to the steps read
