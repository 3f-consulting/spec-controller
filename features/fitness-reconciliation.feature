@LNT
Feature: Reconcile every fitness function as a fitness scenario citing its own @SCN

  The FITNESS axis. Alongside the behavioural quality-checks (the unit / integration / e2e /
  performance tests, each an EXAMPLE with steps), a fitness scenario DECLARES one Evidence
  Obligation: a whole-system property held against a threshold. In this repository the scenario
  carries `@fitness` and a freshly minted code; its TITLE says what the check is about, and the
  command that settles it is the one its own CI step runs, stating that code as its `id:`. One
  such scenario is one check: nothing classifies it further.

  A FITNESS SCENARIO IS A DECLARED OBLIGATION RATHER THAN A TEST, AND NOTHING RUNS IT. It is
  authored like every other scenario in this corpus, steps and all, and what keeps it off the
  runners is its TAG rather than its shape. What a step may not do is GRADE THE RUN: "Then the
  check passes" would have one row raise the obligation and answer it — BOTH SIDES OF THE ENTRY,
  which is the one thing double entry cannot allow. A property a scenario was written to hold is
  one it holds because the scenario says so, never because somebody gave it a runnable example.

  ONE POSTING RULE, over both axes, and the credit's citation is ONE HOP. The check's step in the
  CI config carries its scenario's @SCN as the step's `id:`; the run's own record says what that
  step did; `balance` reads the citation straight off it. Nothing is matched back by name and
  nothing is resolved through a second artefact, so there is no static-axis posting rule left to
  be special.

  THE RETIRED PATHS RAISE NOTHING. A target that still carries `specController.checkRegistry`, or
  tags its scenarios with a bare check word, has declared no check by it. The registry is read like
  any key the specController block does not read: it settles nothing, and the report names it under
  `## Configuration not read` in the words it uses for any such key, saying nothing of what it once
  did. A bare check word raises no Evidence Obligation, since no set of
  registered check tags is read any more. A check is its `@fitness` scenario, and nothing
  else declares it.

  WHAT THE FILE IS CALLED, AND WHY THE CODE IS NOT. The feature code is @LNT because a code, once
  allocated, is stable forever: it survives a rename and is never reused — a rule this repository
  now keeps by hand and nothing enforces, the registry table that reserved each retired code having
  left with the check that read it. The name it was allocated under — the retired `@lint=<handle>`
  form, where a scenario named a runnable script and the run was matched back to it BY NAME — is
  the thing this feature retired, so the FILE took the right name and the code stayed put. Bare
  `@lint` survived for a while as GRAMMAR alone — recognised, raising nothing, kept because an
  adopter's corpus still wrote it. It stopped being grammar when the wait
  ended with the compatibility position, and no word a tool does not read is a
  corpus fault at all — it is a consumer's own tag.

  A fitness obligation reconciles as evidence only when the check actually holds over the
  REAL source: its command must be a `run:` step in the CI config over the real tree — not
  green merely over fixtures. The watermelon is what a check that exists but is not wired
  into CI reconciles to; it slots into the verdict model like any other non-balanced
  reconciling item.

  WHY NO SCENARIO IN THE RULE SETS BELOW RAISES A CHECK OBLIGATION OF ITS OWN. Every
  scenario below names FIXTURE data — lint:planted-watermelon, lint:absent-check and
  lint:unwired-check must never exist as real scripts, because these scenarios exist to
  prove spec-controller DETECTS an absent or unwired check. A tag naming one would raise an
  obligation this repository could never settle, so it would reconcile out-of-balance
  permanently, and correctly, given what the tag said. Nothing ever reads a handle from a
  tag here: the handles are constants in the step definitions, fed through planted
  package.json / ci.yml fixtures. A ledger scenario tests the identical shape through the
  fixture check ldg028-absent-guard and reconciles balanced. Their @unit and @integration
  obligations are untouched and still reconcile — the distinction from a deferral tag,
  which would take every obligation these scenarios name dark to silence one row each.
  AND lint:feature-codes IS ONE OF THOSE FIXTURE HANDLES. It was this repository's own check once;
  the rules it carried are `balance`'s scenario code errors now, and the row, the script
  and the scenario left together. The handle survives here as a step-definition constant: a name no script
  in this repository answers to, and none may again, for exactly the reason the three above must
  never exist.

  WHICH TREE A FITNESS SCENARIO IS ABOUT IS THE GHERKIN'S TO SAY, AND THE STEP DEFINITION'S TO
  OBEY (ruled 2026-09-04). A fitness scenario names its subject in its own text — a PLANTED tree
  or THE REPOSITORY — and its step definition takes that subject rather than picking one for
  itself. A scenario that says THIS REPOSITORY is answered over this repository; what would tell
  a planted-tree scenario apart from it is a sentence a reviewer reads anyway, not a path buried
  in a step definition. A step definition that runs its check over a fixture while its scenario
  says the repository is then wrong IN THE DIFF, against that sentence.

  THE PLANTED SIDE HAS NO LIVE EXAMPLE TODAY, AND THE RULING HAS NOT MOVED. It is the reason
  no example is invented for it: what a fitness
  scenario is about is its own text's to say, whether or not a second scenario is standing beside
  it to contrast with.

  IT IS A CONVENTION WRITTEN DOWN, NOT A STATIC CHECK BUILT, and the asymmetry is the reason. A
  check that exists but no CI step runs lives in the GAP BETWEEN TWO FILES — nobody meets it by
  reading, so it needs a mechanism and has one. A step definition pointed at the wrong tree lives
  in one readable line, in a diff, in review: not invisible, just wrong the way any wrong line is
  wrong. What would enforce it is a static analysis of TEST code — itself a check that can be
  wrong, held by nothing.

  Rule: a `@lint=<check>` tag raises no Evidence Obligation — the retired form is inert

    THE RETIRED SPELLING NAMED A TECHNIQUE, NOT A CHECK. Under name-match, a scenario declared its
    fitness check by spelling a runnable script handle — `@lint=lint:complexity` — and the run was
    matched back to it by name. The bare-tags Correction (canon 2026-08-07) retired that spelling
    when the bare check tag took over, and a check is now declared by a @fitness scenario and
    nothing else. What this Rule holds is only that the retired spelling stays
    dead on every path a reader might be tempted to re-route it through.

    @unit @integration @SCN-LNT-007
    Scenario: a @lint=<check> tag raises no Evidence Obligation — the retired form is inert

      THE RETIRED FORM IS INERT, WHICH IS A STRONGER CLAIM THAN "NOBODY WRITES IT ANY MORE". The
      corpus sweep removed every @lint=<handle> tag this repository carried; that is a fact about
      today's tree, and a fact about a tree is not a mechanism. What settles the form is the READER:
      the tag arm that turned @lint=<handle> into an obligation is gone, so the form names nothing
      however it is spelled and wherever it reappears.

      RAISING NOTHING IS THE POINT, AND IT IS NOT THE SAME AS RAISING SOMETHING UNSETTLEABLE. A
      transitional reader that kept deriving the obligation would leave every re-grown @lint= tag
      owing a check the citation seam can never credit — one run cites one @SCN, and this form
      supplies none — so the row would read missing for ever and the corpus would look wrong when
      only the tag was. Nothing raised is a corpus fault the tag check catches (`spec-controller
      tags` reds an unrecognised tag once its lint= clause goes), not a permanent red on the
      books.

      NOTHING IS CONFIGURED HERE, AND THAT IS WHAT THE CLAIM IS NOW ABOUT. No set of registered
      check tags exists, and no manifest list either: the only route left that raises a
      fitness obligation is the @fitness tag itself. So what this fixture shows is that the retired
      spelling does not put a scenario ON that axis — it is not a tag the reader translates, on any
      path, and there is nowhere else left for it to be re-routed through.

      Given a scenario tagged with the retired @lint= form naming the runnable handle "lint:feature-codes"
      When the scenario corpus is read
      Then the scenario raises no Evidence Obligation at all — the retired form names nothing

  Rule: a fitness check's run posts ONE Evidence Observation, citing its scenario's @SCN

    THE CREDIT SIDE OF THE ONE POSTING RULE, and the first place the citation seam is
    consumed. Name-match worked because the DEBIT cited: a scenario named a runnable script
    and the run was matched back to it by name, so nothing ever had to know which scenario a
    check belonged to. Citation-routing inverts that. The run now arrives carrying an @SCN —
    resolved script handle to bare check tag through the registry, then bare check tag to the
    fitness scenario carrying it through the corpus — and the ordinary citation route does the
    rest. There is no static-axis posting rule left to be special: the same route that lands a
    unit test's credit on its scenario lands a fitness check's.

    EXACTLY ONE ROW IS THE WHOLE POINT. Under name-match one run posted to EVERY row naming
    it, which is how a whole-system property came to be smeared across behavioural
    examples it was never about — complexity is a property of the codebase, and a violation
    points at a file, not at the scenario that happened to spell the script's name. One run is
    one credit and cites one scenario, so a second scenario that would have claimed the same
    run under name-match now claims nothing.

    THIS SCENARIO RAISES NO CHECK OBLIGATION, AND THAT IS THE CORRECTED SHAPE. It once
    carried lint:feature-codes in the retired tag form, because that was the only way the
    corpus could name spec-controller's own check at all — so the repository's obligation and
    this scenario's subject matter shared one tag line, and the row that proved the POSTING
    RULE also stood as the row the real run posted to. They are separated now: what the real
    check owes is raised by this repository's own `@fitness` scenario for it, authored in
    features/fitness-checks.feature beside its row, and what is proven here is the rule itself,
    over fixture data.

    @unit @integration @SCN-LNT-004
    Scenario: a scenario requiring both a unit test and a fitness check reports each independently
      TWO AXES ON ONE ROW, ANSWERED SEPARATELY. A scenario can owe evidence on the behavioural axis
      and on the fitness axis at once, and each obligation is discharged only by a credit of its own
      quality-check: a green unit test never answers the fitness obligation, and a fitness run never
      answers the unit one. Both readings are taken off this ONE row, independently — one may
      reconcile while the other does not, and neither is absorbed by the other.

      ONE POSTING RULE MAKES THIS SHARPER, NOT WEAKER. Under name-match the two credits arrived by
      different routes — the unit credit cited its @SCN, the fitness credit was matched by handle —
      so keeping them apart was a property of the routes rather than a rule anyone wrote. Now BOTH
      credits cite the SAME @SCN and post to the SAME row, which is precisely the arrangement in
      which a reconciler answering an obligation by the row it sits on, rather than by what it owes,
      would collapse the two.

      THE FITNESS OBLIGATION COMES FROM THE @fitness TAG, the unit obligation from the tier tag —
      two readers, one scenario. Nothing here cites the scenario on the fitness axis, so that obligation
      reconciles missing exactly as any obligation with no matching observation does;
      what this scenario holds is not which outcome the fitness axis lands on but that it lands on
      one independently of the unit axis beside it.

      THE SHAPE RULE IS NOT THIS SCENARIO'S. Whether one scenario may carry a tier tag and a
      fitness tag together was a question for the retired `tags` command, which left with its
      rules; the fixture below carries both because a TWO-AXIS scenario is what this reads. What is settled here is only that the reconciler
      answers each obligation a scenario raises on its own axis.

      Given a @fitness scenario "SCN-AAA-001"
      And that scenario also carries the unit tier tag
      And the unit test for that scenario passes
      When the fitness check and the unit result are observed and reconciled
      Then the scenario's fitness obligation reconciles missing
      And its unit obligation reconciles satisfied, omitted from the reconciling items

  Rule: a fitness credit matching no Evidence Obligation lands in suspense or on a phantom row

    BOTH UNMATCHED SIDES STAY VISIBLE. An obligation nothing credits reads missing above; a credit
    nothing obliges is its mirror, and it must be just as loud. Under name-match the fitness axis had
    only ONE unmatched destination — a run cited nothing, so it was either matched by handle or it
    was not — and a run that named a row nobody wrote was not a shape the axis could produce.
    Citation-routing produces it: a credit carrying an @SCN is routed by that @SCN, so it can name a
    row that is not there.

    THE TWO DESTINATIONS ARE DIFFERENT FACTS, and telling them apart is the whole value of the rule.
    A credit citing NOTHING never looked, and lands in suspense — the tool's own uncited-check
    axis, whose remedy is to register the check and write its fitness scenario. A credit
    citing an @SCN the corpus does not carry LOOKED AND MISSED, so it mints the row it named and
    lands there; its remedy is to fix the citation. Folding either into the other sends a reader to
    the wrong cure.

    @unit @integration @SCN-LNT-009
    Scenario: a fitness credit citing an @SCN no scenario carries posts to a phantom row, named by the @SCN its step stated
      NEWLY REACHABLE, and that is the point. While a fitness check's run cited nothing, this arm was
      structurally unreachable on the fitness axis — there was no citation to be wrong. Once the
      credit cites, the fitness axis inherits every destination a runtime credit has, this one
      included, and inherits it through the SAME posting rule rather than a fitness clause that
      re-states it.

      THE TWO DOCUMENTS CAN DISAGREE, which is what makes this a real fault rather than a
      hypothetical. Nothing asks the corpus anything at the citation seam: the step's id: is the
      citation, so a step can state an @SCN no scenario carries — mistyped on the
      step, mistyped on the scenario, or the scenario renumbered, retired, or living in a feature
      file this run does not reconcile. The pipeline and the corpus are two documents one consumer
      authors separately, and nothing keeps them in step. It is the same disagreement a runtime
      credit has always been able to carry between a test file's @SCN and the corpus, reached
      through a CI step's own id: instead.

      IT IS ALSO WHERE A CODE NO MANIFEST ENTRY ANSWERED USED TO GO QUIET. While the citation was
      resolved against specController.fitnessChecks, such a step cited nothing and fell to
      suspense, which said a consumer had annotated nothing when in fact they had annotated
      something wrong. The list is retired and the looked-and-missed case now reads as
      one.

      THE CREDIT IS NEVER DROPPED. Dropping it is the one outcome the double entry forbids: every
      Evidence Observation posts somewhere, never nowhere. So the row is INVENTED, the credit posts
      there carrying the check that ran, and the row is out-of-balance — nobody raised it, so nothing
      about it can balance. Naming the check is what makes the row actionable: without it a reader
      learns only that some run cited a scenario that is gone.

      Given a @fitness scenario in the corpus carries a different @SCN entirely
      And a CI step names "lint:feature-codes" as answering "SCN-AAA-001"
      When the fitness check citing an @SCN is observed and reconciled
      Then the run's credit posts to a phantom row for the @SCN it cited, naming the check "lint:feature-codes"
      And no scenario's row holds that credit

  Rule: a @fitness scenario is one check: its quality check is fitness, and its obligation is raised by its tag and keyed by its own @SCN

    ONE @fitness SCENARIO IS ONE CHECK (canon fitness-evidence.md, "The tag is the quality
    check; nothing else declares it"). Its quality check is fitness, exactly as unit is for a @unit
    scenario: the obligation is raised by THE TAG and keyed by the scenario's own @SCN, and the
    credit is the CI step whose id: is that @SCN. What a check is ABOUT is the scenario's title.

    NOTHING ELSE DECLARES IT. A manifest list of fitness checks once stood between the
    tag and the obligation, and a scenario the list did not name raised nothing at all. The list is
    retired: an adopter writes the scenario and puts its @SCN on the CI step, and that is the whole
    declaration. Nothing reads more of a list entry than the scenario already carries.

    THE CHARACTERISTIC THAT ONCE KEYED IT IS RETIRED TOO. The tag collapsed to @fitness
    and the word it carried - complexity, mutation - moved onto the manifest entry, where it went on
    keying the obligation and the credit. Nothing needed it: one scenario is one check, so its @SCN
    already says everything a word could.

    WHY THE CORPUS IS NEEDED AT ALL, when the pipeline already runs the check. A linter reports
    findings only, so its silence is ambiguous between nothing-wrong and nothing-looked. The corpus
    is where a check's scenario is written, and the scenario is what raises the obligation a run
    answers. Reading the pipeline alone would put this axis back to single entry.

    @unit @integration @SCN-LNT-018
    Scenario: a @fitness scenario raises exactly one fitness Evidence Obligation keyed by its own @SCN, from its tag alone, and two @fitness scenarios raise two

      KEYED BY THE @SCN, SO TWO CHECKS CANNOT MERGE. Each check is its own scenario and owes its own
      obligation, and a run's step answers only the one whose @SCN it carries. This
      repository's own checks once shared four words between twelve of them, which is what a word
      keying the obligation would have merged.

      OWED ONCE, HOWEVER MANY TIMES THE AXIS TAG REACHES THE SCENARIO. A scenario's effective tags
      are its own plus its Rule's and its Feature's, so the axis tag can arrive twice; two
      obligations for one check would leave the second missing for ever, since one run is one credit
      and can cite one @SCN.

      Given two @fitness scenarios "SCN-AAA-001" and "SCN-AAA-002", and no manifest entry naming either
      And the axis tag reaches "SCN-AAA-001" a second time, hoisted onto its Rule
      When the scenario corpus is read
      Then each scenario raises exactly one Evidence Obligation, at the quality check "fitness", and nothing else

    @unit @integration @SCN-LNT-020
    Scenario: a @fitness scenario no CI step cites reconciles missing, its row is out of balance, and the run fails

      THE SAME SENTENCE A @unit SCENARIO WITH NO TEST GETS, and that is the whole of the change.
      The obligation is raised by the tag, so it exists whether or not anything runs the
      check. With no Evidence Observation citing its @SCN it reconciles missing, its row is out of
      balance, and the run fails — no new outcome is minted and none is needed.

      WHAT IT REPLACES WAS AN ASYMMETRY RATHER THAN A POLICY. While a manifest entry declared the
      check, a scenario no entry named raised NOTHING and the report said so in a census line,
      beside a degenerate both-missing row; an entry with no scenario raised a debit. One side of
      the same disagreement on the books and the other in prose. Canon requires both to be rows
      (fitness-functions.md, "Every obligation and every observation is a reconciliation row, for
      every quality check").

      AND THE CENSUS LINE GOES WITH IT. A missing obligation says WHO on the row itself, under the
      scenario's own @SCN, which is where a reader already looks for it; a second sentence
      elsewhere naming the same scenario would be the same fault printed twice, with two remedies
      attached.

      Given a target's corpus carries two scenarios on the fitness axis and only the first is cited by anything its CI ran
      When that target's evidence is reconciled
      Then the first reads satisfied, the second's fitness Evidence Obligation reads missing, its row is out of balance, and nothing on the report names it a second time

  Rule: a check that did not run is broken evidence rather than an absent one

    `broken` IS CANON'S OWN WORD FOR IT AND NOTHING HERE IS NEW. It means a proof that never ran:
    it posts to the suspense row carrying its where-to-fix and
    its what-broke and NO Evidence Observation, so the Evidence Obligation it cites reconciles
    `missing` by absence, and it stamps the run unsound. The verdict is the point rather than a side
    effect — a run that disagrees with itself is one thing, and a run over checks that did not run
    is another. A `missing` row alone would also have sent the reader the wrong remedy, write the
    check rather than fix your hook.

    @unit @integration @SCN-LNT-026
    Scenario: a check step's outcome credits its scenario only where it says what the check did, and every other reading is broken evidence rather than a credit

      THE READINGS THAT CREDIT ARE THE ONES THAT SAY WHAT THE CHECK DID, and there are two. A step
      that succeeded ran and found nothing; a step that failed ran and found something. Each of
      those is a fact about a check, and every other reading is a fact about a pipeline.

      THERE IS NO THIRD, AND A ROW CANNOT BUY ONE. A row could once ask to be credited for a skip by
      naming the ending its command says it examined nothing with — but a command that examines
      nothing still RUNS and still ENDS, so its step reads success or failure and is never skipped.
      A step is skipped when a condition went false, when the job was cancelled, or when somebody
      moved it. The declaration could only be read for whether it was named, never checked against
      anything, so it forgave every skip: `if: false` beside it read satisfied for ever. The field
      is gone rather than guarded.

      THE SECOND OF THEM STOPPED BEING A BARE CREDIT WHEN THE THIRD THING CARRYING THE VERDICT WENT.
      While a pass ran the checks, a check that found violations reddened the run through the
      runner's exit code and its credit only had to say the check ran — so passed and failed were
      honestly ONE answer, and this scenario's own text used to say so. A CI step's exit code reaches
      this ledger nowhere, so the failed step's credit carries what it found and its row reds
      rather than balancing beside the row whose check passed.

      THE DEFAULT IS `broken`, NOT THE CREDIT, so the arms are written the other way up from the
      obvious one. A status this reader cannot vouch for is a check whose running it cannot vouch
      for, so a skip no row asked for and a status nobody anticipated red rather than credit. That is
      the safe direction on an axis whose whole subject is a green that means nothing.

      AND `broken` IS THE RIGHT RED RATHER THAN THE LOUDEST ONE. It carries no Evidence Observation,
      so the row's Evidence Obligation reconciles missing by absence and the run is stamped unsound —
      a run over checks that did not run is a different thing from a run that disagrees with itself,
      and a bare missing row would send the reader to write a check that is already written.

      ALL FOUR READINGS ARE TAKEN FROM ONE RECORD, WHICH IS WHY THEY ARE ONE SCENARIO. Split across
      four, the set could agree by accident: a reader crediting everything and a reader crediting
      nothing would each need a second run to catch, when the whole claim is that ONE record draws
      the line between them.

      Given a target whose corpus carries four @fitness scenarios, each answered by a step of its CI
      And its CI run's record says the first check's step succeeded, the second's failed, the third's was skipped, and the fourth's carries a status nobody anticipated
      When that target's evidence is reconciled with the single record that run wrote about all four steps
      Then the first row balances on a credit saying its check found nothing, the second reads failing off what its check found, and neither of the last two is credited — each is broken evidence naming what the record said about it, and the run is unsound

  Rule: a pipeline nobody has annotated is reported as every check it runs, each citing no scenario

    THIS IS THE STATE A CONSUMER STARTS IN, AND REACHING IT COSTS THEM NOTHING. They have written
    no fitness scenario, configured no row and touched no step; their pipeline runs the checks it
    always ran. What can still be said about it — here is every check you run, and not one of them
    answers anything you have specified — is the first useful sentence this axis says to anybody,
    and it is a report rather than the absence of one.

    SO IT IS HELD AS A CLAIM RATHER THAN LEFT AS A CONSEQUENCE OF ONE. The behaviour falls out of a
    citation that reaches nothing, which is exactly why nothing was watching it: every narrowing
    that would silence an uncited check — dropping the credit that cites no row, refusing a handle
    no row names — leaves every other reading on this axis green. The report a prospect sees before
    they have adopted anything is the one no other arm is standing over.

    AND KEEPING THE PLUMBING OFF THE BOOKS IS THE OTHER HALF OF THE SAME CLAIM. A pipeline checks
    out a tree, sets up a toolchain, installs dependencies and builds, and none of those is a
    quality check; a report banking them as checks would drown the sentence it exists to say. WHAT
    DISCRIMINATES IS THE CONSUMER'S OWN LIST, and nothing else does: the tool held a
    check heuristic — the scripts a manifest carried under a guard prefix or named as static checks
    — and retired it, because the set of names a check might be given belongs to the consumer and
    guessing at it is what made a pipeline named some other way invisible. So the target below says
    which of its steps are not checks, in one line each, and those steps are ACCOUNTED as excluded
    rather than reported nowhere. Off the books, and not silent — the difference is the whole of
    what the inversion bought.

    @unit @integration @SCN-LNT-029
    Scenario: a check step citing no @SCN posts to suspense, which is the unannotated consumer's whole report

      THE LEDGER IS READ WHOLE, BECAUSE WHAT THIS WATCHES FOR IS A CARDINALITY. An arm that looked
      one uncited check up and found it in suspense would go on passing over a reader that had
      quietly stopped raising the other two, and over one that had started raising the install step
      beside them. Every row and every item on it is asserted, so a credit that stopped being
      raised is as visible here as one that arrived wrong.

      THE HANDLE IS WHAT LANDS IN SUSPENSE, AND THAT IS WHAT MAKES THE REPORT ACTIONABLE. A check
      citing no scenario has no code to be named by, so what the row carries is the script that
      ran — the one term the consumer can look up in their own manifest, and the one an annotation
      would replace.

      THE TARGET HAS NO CORPUS AT ALL, WHICH IS THE HONEST SHAPE OF THIS STATE RATHER THAN A
      SHORTCUT. A consumer on their first run has specified nothing, so there is no scenario for a
      credit to have landed on by accident and no row for the suspense one to be mistaken for. It
      also makes the whole report one row, which is what the claim says it is.

      Given a target whose CI runs every static check its manifest holds, and states the code of none of them
      And that CI also checks out its tree, sets up its toolchain, installs its dependencies and builds it
      When that target's evidence is reconciled from its manifest and its workflow
      Then every check the pipeline ran is on the one suspense row citing no scenario, and the steps the target named non-checks are off the books

  Rule: a running check's citation is the @SCN its own CI step states, and nothing resolves it

    THE STEP SUPPLIES THE CODE AND NOTHING ANSWERS FOR IT, WHICH IS WHY IT IS NOT TAKEN OFF THE
    SCRIPT'S NAME. A CI step can state which scenario its check answers and nothing else: an id is
    a code, and reading a check's identity off the handle that ran would be the name-match this
    axis retired, in a new spelling. So the code is read from the step and that is the whole of it
    — the manifest list it used to be checked against is retired, and a code no scenario
    carries posts to a phantom rather than falling silent.

    AN id: THAT IS NOT AN @SCN STILL CITES NOTHING, which is the one thing the reader does check.
    Consumers put an id on a step for their own reasons — a counter, a step another step's if:
    reads — and a rule taking every id would fill their report with phantom rows about their own
    plumbing.

    A STEP CARRYING NO CODE STILL CITES NOTHING, and that is the state above this one rather than a
    gap in it. A consumer who has annotated nothing runs checks that post to suspense and answer no
    Evidence Obligation, which is the first useful sentence this axis says to a pipeline nobody has
    specified. This rule is what a consumer's annotation BUYS; it does not narrow what the
    unannotated pipeline reports.

    @unit @integration @SCN-LNT-031
    Scenario: a check step's id: is the citation it supplies, so an annotated pipeline is not read as unannotated

      BOTH CHECKS ARE READ FROM ONE TARGET BECAUSE THEY ARE ONE CLAIM. The two steps below run two
      scripts of one manifest, discovered by one prefix, and differ in exactly one thing — whether
      the step states the @SCN of the scenario it answers. Taken from two targets the pair could agree by
      accident: a reader citing nothing and a reader citing everything would each need a second run
      to catch, when the whole claim is that ONE run tells them apart.

      THE ANNOTATED HALF IS THE ONE THAT WAS UNREACHABLE. The walk carries the step's code and the
      observer reads it, and between them stood a composition that passed no seam at all — so every
      discovered check on the live path cited nothing however carefully its step was annotated, and
      a fully annotated pipeline reported as a fully unannotated one. That is invisible from either
      end alone, which is why the assertion is over the reconciled ledger rather than over a reader.

      Given a target whose CI runs a check for each of the two @fitness scenarios its corpus carries
      And only the first check's step states the @SCN of the scenario it answers
      When that target's evidence is reconciled from its manifest, its corpus and its workflow
      Then the first check's run credits the scenario its step names and that scenario balances, and the second run cites no scenario

  Rule: a check the job's verdict does not depend on is not enforced over the real source, wherever the severance is written

    THE FIELD IS NAMED FOR ENFORCEMENT AND THAT IS THE WHOLE OF THE READING. A step whose red the
    job survives runs, reds, and leaves the pipeline green — so it enforces nothing over the real
    source however faithfully it analyses it. `continue-on-error` is the one attribute that
    falsifies what a green job otherwise proves, which is that every unconditional step ran and
    passed; a reader blind to it cannot tell a gate from a gate in name only.

    AND THE SEVERANCE IS WRITTEN IN TWO PLACES, WHICH IS ONE FACT RATHER THAN TWO. GitHub spells
    the key on a step and on a job, and either alone leaves the same check unenforced. So what the
    rule holds is the CONSEQUENCE — the job's verdict does not depend on this check — and not the
    spelling that produced it. Reading them as two behaviours would invite a reader that catches
    the near one and misses the far one, which is a watermelon detector with a watermelon in it.

    THE SAFE DIRECTION IS INHERITED, NOT RE-DECIDED. This walk already refuses to vouch for a step
    whose `continue-on-error` it cannot prove harmless — absent, `false` or the string `"false"`
    and nothing else — because an expression's value is decided by the run rather than by the
    document. That reading reports a check unenforced, which is flagged and visible, ahead of
    falsely enforced, which is hidden; and it points the same way here.

    @unit @integration @SCN-LNT-032
    Scenario: a check whose step or whose job carries continue-on-error reconciles as the watermelon, beside a sibling check whose red is the job's verdict

      THE ENGINE COMPUTED THIS FACT AND THREW IT AWAY, which is why the claim is held here rather
      than left to the walk that produces it. `abortsJob` has been read off both carriers correctly,
      and every consumer it ever reached was under `tests/` — this repository's own
      ladder, which never ships. So the guard that looked like the defence protected us and no
      consumer at all, while the published reader certified as satisfied precisely what this
      product itself calls the watermelon: green on the surface, red within.

      THE WORD WAS ALREADY ALLOCATED AND THE RECONCILER WAS ALREADY WAITING FOR IT. `watermelon` is
      defined as a check that exists but is not wired into CI over the real source, and a severed
      step is wired-but-unenforcing — the second half of that sentence exactly. Nothing in the
      outcome ladder moves to accommodate it: the observation arrives exists-and-unenforced and
      falls to the word already there, which is the strongest evidence the vocabulary was right.
      What a workflow file cannot say is what the check FOUND, so the rival reading — your job hid
      this check's red — is a claim no document on this route can support.

      THREE CHECKS FROM ONE TARGET, AND THAT IS THE CLAIM RATHER THAN THE CONVENIENCE. The three
      run under one manifest, are discovered by one prefix and differ in exactly one thing: where
      the severance is written, or whether it is written at all. Taken from three targets they
      could agree by accident — a reader that flags everything and a reader that flags nothing each
      need a second run to catch, when the whole claim is that ONE run tells them apart.

      Given a target whose corpus names three static checks its CI runs
      And the first check's step carries continue-on-error, the second's job carries it, and the third's red is the job's verdict
      When that target's evidence is reconciled from its manifest, its corpus and the two jobs of its workflow
      Then the first two rows read the watermelon and leave balanced, and the third reconciles satisfied

    @unit @integration @SCN-LNT-033
    Scenario: the static-check census counts a check whose red its job survives as a check that ran, on both of its counts

      THE SENTENCE SAYS RUN, SO THE NUMBER COUNTS WHAT RAN (change the
      count, not the word). A check behind continue-on-error runs: it is invoked, it analyses the
      source, it reds, and its job carries on. The census used to leave it out because it enforces
      nothing, and so printed one check fewer than had run, directly above a watermelon row for a
      check that plainly had. Whether a check ENFORCES is already said where it can be said about
      that one check — its own row reads the watermelon, by the rule above. The census is the other
      reading: a report of what ran, with no debit side. Folding enforcement into it as well said
      the same thing twice, and the second time it said it wrongly.

      THE TWO COUNTS ARE STILL ONE SENTENCE, AND WHAT A READER TAKES FROM IT IS THE NUMBER NEITHER
      OF THEM PRINTS. The census says how many static checks run and how many of those nothing
      names; subtract and you have the checks that run AND are named. Move one count's membership
      rule and leave the other's, and that figure is wrong: a severed check nobody cites counted as
      running and not as uncited would appear as a named check nobody named. So both counts take
      the one rule — the check is there and its credit is not broken evidence — and a missing or
      broken check stays out of both, because neither of those ran.

      Given a target running two static checks no scenario cites, one of them behind continue-on-error
      When that target's census is taken from its manifest, its corpus and its workflow
      Then the census reports two static checks run and two uncited static checks, so the named count it implies is nil

  Rule: a check step's outcome in the CI run's record is the fitness credit

    THE RECORD IS A SECOND DOCUMENT AND A SECOND QUESTION, which is why it is read by a reader of
    its own rather than folded into the one above it. The workflow FILE says a check is wired in
    and which row its step cites; the RUN's record says what that step did on this run. One is a
    fact about a repository and the other a fact about an afternoon, and a reader handed only the
    first can say a check is wired and nothing at all about whether it held.

    ONE OBLIGATION, ONE CREDIT. A row's credit is its own step's outcome in the record — the check
    ran, in the consumer's own checkout, and here is what it found.

    THE VERDICT NOW HAS TO TRAVEL, BECAUSE THE THIRD THING CARRYING IT HAS GONE. While a pass ran
    the checks, a check that found violations reddened the run through the runner's exit code and
    its enumeration still said the check ran — so passed and failed were honestly one answer to the
    one question that reader asked. A CI step's exit code reaches nothing here: what crosses is a
    status field. So a reader that went on collapsing the two would be green over every check that
    ran and found something, which is this axis's own headline fault arriving by the front door.

    @unit @integration @SCN-LNT-021
    Scenario: a check step the run's record says succeeded credits the scenario whose @SCN it carries

      THE CREDIT ARRIVES ALREADY CITING, so there is nothing left to resolve. The step's `id:` IS
      the code of the row that step answers, read off what was observed. No check registry is
      consulted and no corpus lookup stands behind it: the two hops a DISCOVERED check needs are
      the two this route does not have.

      AND THE TWO FACTS SUCH A CREDIT CARRIES ARE OBSERVED RATHER THAN INFERRED. On the discovered
      route the check EXISTS because a manifest holds a script by that name, and it ran over the real
      tree because a workflow step invokes that script — a file MENTIONING a name, twice. Here the
      record says the step ran, and it ran in the consumer's own checkout over that checkout's own
      tree. Both are facts about the run itself, which is strictly stronger than a file naming a
      command.

      EACH ROW IS CREDITED BY ITS OWN STEP, WHICH IS WHY TWO ROWS ARE READ FROM ONE RECORD. A reader
      posting one entry's credit to every configured row, and a reader crossing the two, both leave
      every row balanced and say so with the same verdict — so what discriminates is the @SCN
      each row's credit cites, asserted per row rather than counted.

      AND THE STEPS THAT ARE NOT CHECKS ARE SILENT. The record also holds the step that wrote it, and
      no configured row answers that id, so nothing anywhere on the ledger is about it. A pipeline
      checks out a tree and sets up a toolchain too, and a report naming those would drown the
      sentence it exists to say.

      Given a target whose corpus carries two @fitness scenarios, each with a CI step stating its @SCN
      And its CI run's record says both of those checks' steps succeeded, beside the step that wrote the record
      When that target's evidence is reconciled with the record its own CI run wrote
      Then each scenario is credited by the step citing its own @SCN, both Evidence Obligations read satisfied, and the run balances

    @unit @integration @SCN-LNT-028
    Scenario: a check step that failed posts a failing observation, out of balance whatever the job concluded

      IT IS `failing` AND NOT `broken`, AND THE TWO ARE OPPOSITES RATHER THAN NEIGHBOURS. `broken`
      is the never-ran case: the attempt errored before it could cite, so the item carries NO
      Evidence Observation and the run is stamped unsound. A step that failed is the other end of
      that — it ran, it completed, and it reported what it found — so reading it as broken would
      throw away the one thing the check actually said. `missing` is wrong for the same reason from
      the other side: it says no evidence, and there is evidence.

      NOR IS THE WORD INVENTED FOR THIS AXIS. Present-and-passing reconciles satisfied and
      present-and-failing reconciles failing, on every behavioural axis, since the ledger had two
      sides; a failed unit test posts `failing` today. What this Rule does is stop the fitness axis
      being the one place where a check's own verdict was somebody else's business.

      THE STEP'S TWO FIELDS ARE HELD IN AGREEMENT HERE, DELIBERATELY. A record can report a step
      that failed while reporting the job it sat in as green, and WHICH of those two a reader must
      take is a claim of its own with its own scenario. Settling both from one fixture
      would let a reader that took the wrong field pass this arm on the strength of the right word,
      and a reader that posted the wrong word pass that one on the strength of the right field.
      This scenario settles the WORD, over a step whose failure nothing laundered.

      WHAT MAKES "WHATEVER THE JOB CONCLUDED" AN ASSERTION AND NOT A FLOURISH. No job-level verdict
      is in the record or reaches the ledger, and the record handed over here ends on a step that
      succeeded — so a reader summarising the run rather than reading the row's own step has a green
      to reach for. The row reds off its own step alone.

      Given a target whose corpus carries one @fitness scenario, with a CI step stating its @SCN
      And its CI run's record says that check's step failed, on a record whose remaining step succeeded
      When that target's evidence is reconciled with what its CI run recorded
      Then that scenario's Evidence Obligation reads failing, carrying the observation of the step that failed it, and the run is out of balance rather than unsound

    @unit @integration @SCN-LNT-030
    Scenario: the reader takes the step's outcome, so a red the job swallowed still reds its scenario

      A STEP'S TWO RESULTS ARE NOT TWO OPINIONS OF ONE FACT. One is what the step did; the other is
      what the job was told afterwards, and `continue-on-error` is the one attribute that puts a
      value between them — the step runs, it reds, and the job is handed a success. So a reader
      taking the second is green over every check a consumer chose to let their pipeline survive:
      a one-line watermelon inside the product whose whole subject is watermelons.

      THE RECORD IS THE ONLY DOCUMENT THAT CARRIES WHAT THE STEP DID. A run's steps as the provider
      hands them back over its own interface carry the laundered result and no code at all, so a
      reader built on that interface could not see through the mask however carefully it was
      written. The dump this axis asks a consumer's pipeline for exists for exactly this: it is
      where the step's own result and the code it cites are written down together.

      THE FIXTURE IS WHAT EARNS THIS ARM, AND ITS SIBLING DECLINED IT ON PURPOSE. The failed step of
      the sibling holds its two results in agreement, so a reader taking either one passes there;
      here they disagree, and only the reader taking what the step did reds. Written against what
      the job was told, this same arm reports the row with no credit at all — which is precisely the
      green a swallowed red buys.

      ONE FIELD IS READ AND THE OTHER IS READ NOWHERE. The laundered result is carried on the
      record's type because it is in the document, and consulted by nothing. A reader comparing the
      two would be a disagreement detector, and there is nothing here to detect: the step said what
      it did, and the job's retelling adds no fact this ledger needs.

      NOTHING HERE FENCES `continue-on-error`. This repository's own ladder still refuses it, because
      a gate whose red its job swallows is a gate in name only. A consumer who reaches for it
      deliberately is a different party asking a different question, and what this axis owes them is
      an honest ledger rather than a refusal.

      Given a target whose corpus carries one @fitness scenario, with a CI step stating its @SCN, and whose CI lets that step red without failing the job
      And its CI run's record says that step failed, while the job it sat in was told it succeeded
      When that target's evidence is reconciled with the record that run wrote about itself
      Then that scenario's Evidence Obligation reads failing off what the step did, and nothing is read off what the job was told

  Rule: a fitness obligation answered by several credits reads the worst outcome any of them carries, and names a credit carrying it

    The behavioural axis's rule, on this axis too: each credit is read on its own,
    and the obligation reads the worst of those readings — failing over watermelon over satisfied —
    whatever sorts first. No credit vouches for a sibling: a failed credit is
    failing whatever passed beside it, and a severed run is a watermelon whatever wired run of the
    same check sits beside it. The item names the first credit carrying that outcome
    in evidence order. No reader in this product delivers two credits for one row and check today —
    the run's record holds one entry per step code, and a row is keyed by its code — so the
    published engine is where a consumer composing their own evidence meets it.

    @unit @integration @SCN-LNT-036
    Scenario: a failed fitness credit beside a passing one for the same check reads failing, and the ledger is out of balance
      Given a scenario naming one fitness check, and two credits for that check citing it, the one read first passing and the other failed
      When the published engine reconciles them
      Then the check's obligation reads failing, carrying the failed credit, and the ledger is out of balance

    @unit @integration @SCN-LNT-037
    Scenario: a watermelon fitness credit beside a wired one for the same check reads watermelon, and the ledger is out of balance, whichever one's locator sorts first
      Given a scenario naming one fitness check, and two credits for that check citing it, one wired and one severed, and the same two with their locators swapped so each sorts first
      When the published engine reconciles each pair
      Then the check's obligation reads watermelon, carrying the severed credit, and the ledger is out of balance, both ways round

    @unit @integration @SCN-LNT-038
    Scenario: a failed fitness credit beside a watermelon one for the same check reads failing, carrying the failed credit, whichever one's locator sorts first
      Given a scenario naming one fitness check, and two credits for that check citing it, one wired and failed and one severed, and the same two with their locators swapped so each sorts first
      When the published engine reconciles each pair
      Then the check's obligation reads failing, carrying the failed credit, and the ledger is out of balance, both ways round
