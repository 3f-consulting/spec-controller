@LNT
Feature: Reconcile every fitness function as a @fitness scenario citing its own @SCN

  The FITNESS axis. Alongside the behavioural quality-checks (the unit / integration / e2e /
  performance tests, each an EXAMPLE), a scenario RAISES one Evidence
  Obligation: a whole-system property held against a threshold. In this repository the scenario
  carries `@fitness` and a freshly minted code; its TITLE says what the check is about, and the
  command that settles it is the one its own CI step runs, stating that code as its `id:`. One
  such scenario is one check: nothing classifies it further.

  A @fitness SCENARIO IS AN EVIDENCE OBLIGATION RATHER THAN A TEST, AND NOTHING RUNS IT. What keeps
  it off the runners is its TAG, and because Cucumber does not select it, it carries a title and
  tags and no Given/When/Then. What its title may not do is GRADE THE RUN: "the check passes"
  would have one row raise the obligation and answer it — BOTH SIDES OF THE ENTRY,
  which is the one thing double entry cannot allow. A property a scenario was written to hold is
  one it holds because the scenario says so, never because somebody gave it a runnable example.

  ONE POSTING RULE, over both axes, and the Evidence Observation's citation is ONE HOP. The check's step in the
  CI config carries its scenario's @SCN as the step's `id:`; the run's own record says what that
  step did; `balance` reads the citation straight off it. Nothing is matched back by name and
  nothing is resolved through a second artefact, so there is no fitness-function-axis posting rule left to
  be special.

  NO OTHER KEY OR TAG NAMES A CHECK. A target that carries `specController.checkRegistry`, or
  tags its scenarios with a bare check word, names no check by it. The registry is read like
  any key the specController block does not read: it settles nothing, and the report names it under
  `## Configuration not read` in the words it uses for any such key. A bare check word raises no Evidence Obligation, because no set of
  registered check tags is read. A check is its `@fitness` scenario, and nothing
  else names it.

  WHY THE CODE IS @LNT. A feature code, once allocated, is stable: it survives a rename of its
  file and is never reused, so the file is named for what it reconciles and the code is the one it
  was allocated under. A bare `@lint` tag is not grammar: no word a tool does not read is a corpus
  fault at all — it is a consumer's own tag.

  A fitness obligation reconciles as evidence only when the check actually holds over the
  REAL source: its command must be a `run:` step in the CI config over the real tree — not
  green merely over fixtures. The watermelon is what a check that exists but is not wired
  into CI reconciles to; it slots into the verdict model like any other non-balanced
  reconciling item.

  WHY NO SCENARIO IN THE RULE SETS BELOW RAISES A CHECK OBLIGATION OF ITS OWN. Every
  scenario below is about FIXTURE checks, which must never exist as real scripts, because
  these scenarios exist to prove spec-controller DETECTS an absent or unwired check. A tag
  naming one would raise an obligation this repository could never settle, so it would
  reconcile out-of-balance permanently, and correctly, given what the tag said. Nothing ever
  reads a handle from a tag here: the handles are constants in the unit tests that prove these
  scenarios. Their @unit obligations are untouched and still reconcile — the distinction from a
  deferral tag, which would take every obligation these scenarios name dark to silence one row
  each. lint:feature-codes is one of those fixture handles: a name no script in this repository
  answers to, and none may, for the same reason.

  WHICH TREE A SCENARIO IS ABOUT IS THE GHERKIN'S TO SAY. A scenario names its
  subject in its own text — a PLANTED tree or THE REPOSITORY — and the evidence that answers it
  takes that subject rather than picking one for itself.

  Rule: a `@lint=<check>` tag raises no Evidence Obligation — the retired form is inert

    A `@lint=<handle>` TAG NAMES A TECHNIQUE, NOT A CHECK. It spells a runnable script handle —
    `@lint=lint:complexity` — and a check is named by a @fitness scenario and nothing else. What
    this Rule holds is only that the spelling raises nothing on every path a reader might be
    tempted to re-route it through.

    @unit @SCN-LNT-007
    Scenario: a @lint=<check> tag raises no Evidence Obligation — the retired form is inert

      THE RETIRED FORM IS INERT, WHICH IS A STRONGER CLAIM THAN "NOBODY WRITES IT". This
      repository carries no @lint=<handle> tag; that is a fact about today's tree, and a fact about
      a tree is not a mechanism. What settles the form is the READER:
      no tag arm turns @lint=<handle> into an obligation, so the form names nothing however it is
      spelled and wherever it reappears.

      RAISING NOTHING IS THE POINT, AND IT IS NOT THE SAME AS RAISING SOMETHING UNSETTLEABLE. A
      transitional reader that kept deriving the obligation would leave every re-grown @lint= tag
      raising an Evidence Obligation for a check the citation seam can never answer — one run cites one @SCN, and this form
      supplies none — so the row would read missing for ever and the corpus would look wrong when
      only the tag was. Raising nothing leaves no permanent red on the books.

      NOTHING IS CONFIGURED HERE, AND THAT IS WHAT THE CLAIM IS ABOUT. No set of registered
      check tags and no manifest list is read: the only route that raises a fitness obligation is
      the @fitness tag itself. So what this fixture shows is that the `@lint=` spelling does not
      put a scenario ON that axis — it is not a tag the reader translates, on any path, and there
      is nowhere else for it to be re-routed through.

  Rule: a fitness function's run posts ONE Evidence Observation, citing its scenario's @SCN

    THE EVIDENCE OBSERVATION SIDE OF THE ONE POSTING RULE. The run arrives carrying an @SCN — its
    CI step's `id:` — and the ordinary citation route does the rest. There is no fitness-function-axis
    posting rule left to be special: the same route that lands a unit test's Evidence Observation on its
    scenario lands a fitness function's.

    EXACTLY ONE ROW IS THE WHOLE POINT. A whole-system property belongs to no behavioural example
    — complexity is a property of the codebase, and a violation points at a file, not at a
    scenario that spells the script's name. One run is one Evidence Observation and cites one
    scenario, so no second scenario can claim the same run.

    THE SCENARIO BELOW RAISES NO CHECK OBLIGATION. The Evidence Obligation for this repository's
    own checks is raised by its own `@fitness` scenarios, in features/fitness-functions.feature;
    what is proven here is the posting rule itself, over fixture data.

    @unit @SCN-LNT-004
    Scenario: a scenario raising Evidence Obligations for both a unit test and a fitness function reports each independently
      TWO AXES ON ONE ROW, ANSWERED SEPARATELY. A scenario can raise an Evidence Obligation on the behavioural axis
      and on the fitness axis at once, and each obligation is discharged only by an Evidence Observation of its own
      quality-check: a green unit test never answers the fitness obligation, and a fitness run never
      answers the unit one. Both readings are taken off this ONE row, independently — one may
      reconcile while the other does not, and neither is absorbed by the other.

      ONE POSTING RULE MAKES THIS SHARP. BOTH Evidence Observations cite the SAME @SCN and post to the SAME row, which is precisely the arrangement in
      which a reconciler answering an obligation by the row it sits on, rather than by the check it names,
      would collapse the two.

      THE FITNESS OBLIGATION COMES FROM THE @fitness TAG, the unit obligation from the tier tag —
      two readers, one scenario. Nothing here cites the scenario on the fitness axis, so that obligation
      reconciles missing exactly as any obligation with no matching observation does;
      what this scenario holds is not which outcome the fitness axis lands on but that it lands on
      one independently of the unit axis beside it.

      THE SHAPE RULE IS NOT THIS SCENARIO'S. The fixture below carries a tier tag and a fitness
      tag together because a TWO-AXIS scenario is what this reads. What is settled here is only
      that the reconciler answers each obligation a scenario raises on its own axis.

  Rule: a fitness Evidence Observation matching no Evidence Obligation lands in suspense or on a phantom row

    BOTH UNMATCHED SIDES STAY VISIBLE. An obligation nothing answers reads missing above; an Evidence Observation
    nothing obliges is its mirror, and it must be just as loud. An Evidence Observation carrying
    an @SCN is routed by that @SCN, so it can name a row that is not there.

    THE TWO DESTINATIONS ARE DIFFERENT FACTS, and telling them apart is the whole value of the rule.
    An Evidence Observation citing NOTHING never looked, and lands in suspense — the tool's own uncited-check
    axis, whose remedy is to give the check's step its scenario's code and write that scenario. An Evidence Observation
    citing an @SCN the corpus does not carry LOOKED AND MISSED, so it mints the row it named and
    lands there; its remedy is to fix the citation. Folding either into the other sends a reader to
    the wrong cure.

    @unit @SCN-LNT-009
    Scenario: a fitness Evidence Observation citing an @SCN no scenario carries posts to a phantom row, named by the @SCN its step stated
      A CITATION CAN BE WRONG, AND THAT IS THE POINT. Because the Evidence Observation cites, the
      fitness axis has every destination a behavioural Evidence Observation has, this one included,
      through the SAME posting rule rather than a fitness clause that re-states it.

      THE TWO DOCUMENTS CAN DISAGREE, which is what makes this a real fault rather than a
      hypothetical. Nothing asks the corpus anything at the citation seam: the step's id: is the
      citation, so a step can state an @SCN no scenario carries — mistyped on the
      step, mistyped on the scenario, or the scenario renumbered, retired, or living in a feature
      file this run does not reconcile. The pipeline and the corpus are two documents one consumer
      authors separately, and nothing keeps them in step. It is the same disagreement a behavioural
      Evidence Observation can carry between a test file's @SCN and the corpus, reached
      through a CI step's own id: instead.

      IT IS ALSO WHERE A CODE NO SCENARIO CARRIES IS HEARD. The citation is resolved against the
      corpus, never against a manifest list, so such a step does not fall to suspense as if the
      consumer had annotated nothing; the looked-and-missed case reads as one.

      THE EVIDENCE OBSERVATION IS NEVER DROPPED. Dropping it is the one outcome the double entry forbids: every
      Evidence Observation posts somewhere, never nowhere. So the row is INVENTED, the Evidence Observation posts
      there carrying the check that ran, and the row is out-of-balance — nobody raised it, so nothing
      about it can balance. Naming the check is what makes the row actionable: without it a reader
      learns only that some run cited a scenario that is gone.

  Rule: a @fitness scenario is one check: its quality check is fitness, and its obligation is raised by its tag and keyed by its own @SCN

    ONE @fitness SCENARIO IS ONE CHECK: the tag is the Evidence Obligation for a quality
    check. Its quality check is fitness, exactly as unit is for a @unit
    scenario: the obligation is raised by THE TAG and keyed by the scenario's own @SCN, and the
    Evidence Observation is the CI step whose id: is that @SCN. What a check is ABOUT is the scenario's title.

    NOTHING ELSE NAMES IT. An adopter writes the scenario and puts its @SCN on the CI step, and
    that is the whole of naming it: no manifest list stands between the tag and the obligation.

    NO CHARACTERISTIC WORD KEYS IT. One scenario is one check, so its @SCN already says
    everything a word such as complexity or mutation could.

    WHY THE CORPUS IS NEEDED AT ALL, when the pipeline already runs the check. A linter reports
    findings only, so its silence is ambiguous between nothing-wrong and nothing-looked. The corpus
    is where a check's scenario is written, and the scenario is what raises the obligation a run
    answers. Reading the pipeline alone would put this axis back to single entry.

    @unit @SCN-LNT-018
    Scenario: a @fitness scenario raises exactly one fitness Evidence Obligation keyed by its own @SCN, from its tag alone, and two @fitness scenarios raise two

      KEYED BY THE @SCN, SO TWO CHECKS CANNOT MERGE. Each check is its own scenario and raises its own
      obligation, and a run's step answers only the one whose @SCN it carries. A word keying the
      obligation would merge every check that shares it.

      RAISED ONCE, HOWEVER MANY TIMES THE AXIS TAG REACHES THE SCENARIO. A scenario's effective tags
      are its own plus its Rule's and its Feature's, so the axis tag can arrive twice; two
      obligations for one check would leave the second missing for ever, since one run is one Evidence Observation
      and can cite one @SCN.

    @unit @SCN-LNT-020
    Scenario: a @fitness scenario no CI step cites reconciles missing, its row is out of balance, and the run fails

      THE SAME SENTENCE A @unit SCENARIO WITH NO TEST GETS.
      The obligation is raised by the tag, so it exists whether or not anything runs the
      check. With no Evidence Observation citing its @SCN it reconciles missing, its row is out of
      balance, and the run fails — no new outcome is minted and none is needed.

      BOTH SIDES OF THE DISAGREEMENT ARE ROWS. Every obligation and every observation is a
      reconciliation row, for every quality check. A missing obligation says WHO on the row itself, under the
      scenario's own @SCN, which is where a reader already looks for it; a second sentence
      elsewhere naming the same scenario would be the same fault printed twice, with two remedies
      attached.

  Rule: a check that did not run is broken evidence rather than an absent one

    `broken` IS THE WORD FOR IT. It means a proof that never ran:
    it posts to the suspense row carrying its where-to-fix and
    its what-broke and NO Evidence Observation, so the Evidence Obligation it cites reconciles
    `missing` by absence, and it stamps the run unsound. The verdict is the point rather than a side
    effect — a run that disagrees with itself is one thing, and a run over checks that did not run
    is another. A `missing` row alone would also have sent the reader the wrong remedy, write the
    check rather than fix your hook.

    @unit @SCN-LNT-026
    Scenario: a check step's outcome answers its scenario's obligation only where it says what the check did, and every other reading is broken evidence rather than an Evidence Observation

      THE READINGS THAT ANSWER ARE THE ONES THAT SAY WHAT THE CHECK DID, and there are two. A step
      that succeeded ran and found nothing; a step that failed ran and found something. Each of
      those is a fact about a check, and every other reading is a fact about a pipeline.

      THERE IS NO THIRD, AND A ROW CANNOT BUY ONE. A command that examines nothing still RUNS and
      still ENDS, so its step reads success or failure and is never skipped. A step is skipped when
      a condition is false, when the job is cancelled, or when somebody moves it — none of which is
      a check finding anything.

      THE FAILED STEP'S EVIDENCE OBSERVATION CARRIES WHAT IT FOUND. A CI step's exit code reaches
      this ledger nowhere, so the failed step's Evidence Observation carries what it found and its row reds
      rather than balancing beside the row whose check passed.

      THE DEFAULT IS `broken`, NOT THE EVIDENCE OBSERVATION, so the arms are written the other way up from the
      obvious one. A status this reader cannot vouch for is a check whose running it cannot vouch
      for, so a skip no row asked for and a status nobody anticipated red rather than answer. That is
      the safe direction on an axis whose whole subject is a green that means nothing.

      AND `broken` IS THE RIGHT RED RATHER THAN THE LOUDEST ONE. It carries no Evidence Observation,
      so the row's Evidence Obligation reconciles missing by absence and the run is stamped unsound —
      a run over checks that did not run is a different thing from a run that disagrees with itself,
      and a bare missing row would send the reader to write a check that is already written.

      ALL FOUR READINGS ARE TAKEN FROM ONE RECORD, WHICH IS WHY THEY ARE ONE SCENARIO. Split across
      four, the set could agree by accident: a reader answering every obligation and a reader answering
      nothing would each need a second run to catch, when the whole claim is that ONE record draws
      the line between them.

  Rule: a pipeline nobody has annotated is reported as every check it runs, each citing no scenario

    THIS IS THE STATE A CONSUMER STARTS IN, AND REACHING IT COSTS THEM NOTHING. They have written
    no @fitness scenario, configured no row and touched no step; their pipeline runs the checks it
    always ran. What can still be said about it — here is every check you run, and not one of them
    answers anything you have specified — is the first useful sentence this axis says to anybody,
    and it is a report rather than the absence of one.

    SO IT IS HELD AS A CLAIM RATHER THAN LEFT AS A CONSEQUENCE OF ONE. The behaviour falls out of a
    citation that reaches nothing, which is exactly why nothing else watches it: every narrowing
    that would silence an uncited check — dropping the Evidence Observation that cites no row, refusing a handle
    no row names — leaves every other reading on this axis green. The report a prospect sees before
    they have adopted anything is the one no other arm is standing over.

    AND KEEPING THE PLUMBING OFF THE BOOKS IS THE OTHER HALF OF THE SAME CLAIM. A pipeline checks
    out a tree, sets up a toolchain, installs dependencies and builds, and none of those is a
    quality check; a report banking them as checks would drown the sentence it exists to say. WHAT
    DISCRIMINATES IS THE CONSUMER'S OWN LIST, and nothing else does: the set of names a check
    might be given belongs to the consumer, and a heuristic guessing at it would make a pipeline
    named some other way invisible. So its tests' target says which of its steps are not checks,
    in one line each, and those steps are ACCOUNTED as excluded rather than reported nowhere. Off
    the books, and not silent.

    @unit @SCN-LNT-029
    Scenario: a check step citing no @SCN posts to suspense, which is the unannotated consumer's whole report

      THE LEDGER IS READ WHOLE, BECAUSE WHAT THIS WATCHES FOR IS A CARDINALITY. An arm that looked
      one uncited check up and found it in suspense would go on passing over a reader that had
      quietly stopped raising the other two, and over one that had started raising the install step
      beside them. Every row and every item on it is asserted, so an Evidence Observation that stopped being
      raised is as visible here as one that arrived wrong.

      THE HANDLE IS WHAT LANDS IN SUSPENSE, AND THAT IS WHAT MAKES THE REPORT ACTIONABLE. A check
      citing no scenario has no code to be named by, so what the row carries is the script that
      ran — the one term the consumer can look up in their own manifest, and the one an annotation
      would replace.

      THE TARGET HAS NO CORPUS AT ALL, WHICH IS THE HONEST SHAPE OF THIS STATE RATHER THAN A
      SHORTCUT. A consumer on their first run has specified nothing, so there is no scenario for an
      Evidence Observation to have landed on by accident and no row for the suspense one to be mistaken for. It
      also makes the whole report one row, which is what the claim says it is.

  Rule: a running check's citation is the @SCN its own CI step states, and nothing resolves it

    THE STEP SUPPLIES THE CODE AND NOTHING ANSWERS FOR IT, WHICH IS WHY IT IS NOT TAKEN OFF THE
    SCRIPT'S NAME. A CI step can state which scenario its check answers and nothing else: an id is
    a code, and reading a check's identity off the handle that ran would be matching by name,
    which this axis never does. So the code is read from the step and that is the whole of it
    — no manifest list is read to check it against, and a code no scenario
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

    @unit @SCN-LNT-031
    Scenario: a check step's id: is the citation it supplies, so an annotated pipeline is not read as unannotated

      BOTH CHECKS ARE READ FROM ONE TARGET BECAUSE THEY ARE ONE CLAIM. The two steps below run two
      scripts of one manifest, discovered by one prefix, and differ in exactly one thing — whether
      the step states the @SCN of the scenario it answers. Taken from two targets the pair could agree by
      accident: a reader citing nothing and a reader citing everything would each need a second run
      to catch, when the whole claim is that ONE run tells them apart.

      THE ANNOTATED HALF CROSSES A SEAM. The walk carries the step's code and the observer reads
      it, and a composition between them that dropped the code would report a fully annotated
      pipeline as a fully unannotated one. That is invisible from either
      end alone, which is why the assertion is over the reconciled ledger rather than over a reader.

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

    @unit @SCN-LNT-032
    Scenario: a check whose step or whose job carries continue-on-error reconciles as the watermelon, beside a sibling check whose red is the job's verdict

      THE CLAIM IS HELD HERE, NOT LEFT TO THE WALK THAT PRODUCES IT. Whether a check's red ends
      the job is read off both carriers, the step and the job, and a guard that only this
      repository's own tests consult protects no consumer. The published reader must not
      certify as satisfied what this product itself calls the watermelon: green on
      the surface, red within.

      THE WORD ALREADY EXISTS AND THE RECONCILER ALREADY HAS A PLACE FOR IT. `watermelon` is
      defined as a check that exists but is not wired into CI over the real source, and a severed
      step is wired-but-unenforcing — the second half of that sentence exactly. Nothing in the
      outcome ladder moves to accommodate it: the observation arrives exists-and-unenforced and
      falls to the word already there.
      What a workflow file cannot say is what the check FOUND, so the rival reading — your job hid
      this check's red — is a claim no document on this route can support.

      THREE CHECKS FROM ONE TARGET, AND THAT IS THE CLAIM RATHER THAN THE CONVENIENCE. The three
      run under one manifest, are discovered by one prefix and differ in exactly one thing: where
      the severance is written, or whether it is written at all. Taken from three targets they
      could agree by accident — a reader that flags everything and a reader that flags nothing each
      need a second run to catch, when the whole claim is that ONE run tells them apart.

    @unit @SCN-LNT-033
    Scenario: the fitness-function census counts a check whose red its job survives as a check that ran, on both of its counts

      THE SENTENCE SAYS RUN, SO THE NUMBER COUNTS WHAT RAN. A check behind continue-on-error runs: it is invoked, it analyses the
      source, it reds, and its job carries on. Leaving it out because it enforces nothing would
      print one check fewer than had run, directly above a watermelon row for a check that
      plainly had. Whether a check ENFORCES is already said where it can be said about
      that one check — its own row reads the watermelon, by the rule above. The census is the other
      reading: a report of what ran, with no debit side. Folding enforcement into it as well would
      say the same thing twice, and the second time wrongly.

      THE TWO COUNTS ARE STILL ONE SENTENCE, AND WHAT A READER TAKES FROM IT IS THE NUMBER NEITHER
      OF THEM PRINTS. The census says how many fitness functions run and how many of those nothing
      names; subtract and you have the checks that run AND are named. Move one count's membership
      rule and leave the other's, and that figure is wrong: a severed check nobody cites counted as
      running and not as uncited would appear as a named check nobody named. So both counts take
      the one rule — the check is there and its Evidence Observation is not broken evidence — and a missing or
      broken check stays out of both, because neither of those ran.

  Rule: a check step's outcome in the CI run's record is the fitness Evidence Observation

    THE RECORD IS A SECOND DOCUMENT AND A SECOND QUESTION, which is why it is read by a reader of
    its own rather than folded into the one above it. The workflow FILE says a check is wired in
    and which row its step cites; the RUN's record says what that step did on this run. One is a
    fact about a repository and the other a fact about an afternoon, and a reader handed only the
    first can say a check is wired and nothing at all about whether it held.

    ONE OBLIGATION, ONE EVIDENCE OBSERVATION. A row's Evidence Observation is its own step's outcome in the record — the check
    ran, in the consumer's own checkout, and here is what it found.

    THE VERDICT HAS TO TRAVEL. A CI step's exit code reaches nothing here: what crosses is a
    status field. So a reader that collapsed passed and failed would be green over every check that
    ran and found something, which is this axis's own headline fault arriving by the front door.

    @unit @SCN-LNT-021
    Scenario: a check step the run's record says succeeded answers the obligation of the scenario whose @SCN it carries

      THE EVIDENCE OBSERVATION ARRIVES ALREADY CITING, so there is nothing left to resolve. The step's `id:` IS
      the code of the row that step answers, read off what was observed. No check registry is
      consulted and no corpus lookup stands behind it.

      AND THE TWO FACTS SUCH AN EVIDENCE OBSERVATION CARRIES ARE OBSERVED RATHER THAN INFERRED. On the discovered
      route the check EXISTS because a manifest holds a script by that name, and it ran over the real
      tree because a workflow step invokes that script — a file MENTIONING a name, twice. Here the
      record says the step ran, and it ran in the consumer's own checkout over that checkout's own
      tree. Both are facts about the run itself, which is strictly stronger than a file naming a
      command.

      EACH ROW IS ANSWERED BY ITS OWN STEP, WHICH IS WHY TWO ROWS ARE READ FROM ONE RECORD. A reader
      posting one entry's Evidence Observation to every configured row, and a reader crossing the two, both leave
      every row balanced and say so with the same verdict — so what discriminates is the @SCN
      each row's Evidence Observation cites, asserted per row rather than counted.

      AND THE STEPS THAT ARE NOT CHECKS ARE SILENT. The record also holds the step that wrote it, and
      no configured row answers that id, so nothing anywhere on the ledger is about it. A pipeline
      checks out a tree and sets up a toolchain too, and a report naming those would drown the
      sentence it exists to say.

    @unit @SCN-LNT-028
    Scenario: a check step that failed posts a failing observation, out of balance whatever the job concluded

      IT IS `failing` AND NOT `broken`, AND THE TWO ARE OPPOSITES RATHER THAN NEIGHBOURS. `broken`
      is the never-ran case: the attempt errored before it could cite, so the item carries NO
      Evidence Observation and the run is stamped unsound. A step that failed is the other end of
      that — it ran, it completed, and it reported what it found — so reading it as broken would
      throw away the one thing the check actually said. `missing` is wrong for the same reason from
      the other side: it says no evidence, and there is evidence.

      NOR IS THE WORD INVENTED FOR THIS AXIS. Present-and-passing reconciles satisfied and
      present-and-failing reconciles failing, on every behavioural axis: a failed unit test posts
      `failing`. The fitness axis reads a check's own verdict the same way.

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

    @unit @SCN-LNT-030
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
      the job was told, this same arm reports the row with no Evidence Observation at all — which is precisely the
      green a swallowed red buys.

      ONE FIELD IS READ AND THE OTHER IS READ NOWHERE. The laundered result is carried on the
      record's type because it is in the document, and consulted by nothing. A reader comparing the
      two would be a disagreement detector, and there is nothing here to detect: the step said what
      it did, and the job's retelling adds no fact this ledger needs.

      NOTHING HERE FENCES `continue-on-error`. This repository's own ladder still refuses it, because
      a gate whose red its job swallows is a gate in name only. A consumer who reaches for it
      deliberately is a different party asking a different question, and what this axis owes them is
      an honest ledger rather than a refusal.

  Rule: a fitness obligation answered by several Evidence Observations reads the worst outcome any of them carries, and names an Evidence Observation carrying it

    The behavioural axis's rule, on this axis too: each Evidence Observation is read on its own,
    and the obligation reads the worst of those readings — failing over watermelon over satisfied —
    whatever sorts first. No Evidence Observation vouches for a sibling: a failed Evidence Observation is
    failing whatever passed beside it, and a severed run is a watermelon whatever wired run of the
    same check sits beside it. The item names the first Evidence Observation carrying that outcome
    in evidence order. No reader in this product delivers two Evidence Observations for one row and check —
    the run's record holds one entry per step code, and a row is keyed by its code — so the
    published engine is where a consumer composing their own evidence meets it.

    @unit @SCN-LNT-036
    Scenario: a failed fitness Evidence Observation beside a passing one for the same check reads failing, and the ledger is out of balance

    @unit @SCN-LNT-037
    Scenario: a watermelon fitness Evidence Observation beside a wired one for the same check reads watermelon, and the ledger is out of balance, whichever one's locator sorts first

    @unit @SCN-LNT-038
    Scenario: a failed fitness Evidence Observation beside a watermelon one for the same check reads failing, carrying the failed Evidence Observation, whichever one's locator sorts first
