@LNT
Feature: Reconcile every fitness function as a fitness scenario citing its own @SCN

  The FITNESS axis. Alongside the behavioural quality-checks (the unit / integration /
  e2e / performance tests, each an EXAMPLE with steps), a scenario tagged with a REGISTERED
  bare check raises one fitness Evidence Obligation for that check — a whole-system
  characteristic held against a threshold. THE TAG SAYS WHICH AXIS A SCENARIO IS ON, and the
  STEPS SAY NOTHING ABOUT IT (3F-3115): a characteristic a scenario was written to hold is one
  it holds whether or not somebody has since given it a runnable example.

  MOST FITNESS SCENARIOS CARRY NO STEPS, AND THAT IS A CONSEQUENCE RATHER THAN THE RULE. A
  whole-system characteristic usually has nothing to exemplify, so it usually carries none —
  every fitness scenario in this file is stepless for that reason, and none of them is stepless
  in order to be READ as one.

  ONE POSTING RULE, over both axes. The credit CITES: a fitness check's run arrives
  carrying the @SCN of the scenario that raises its obligation, resolved in two hops —
  script handle to bare check tag through the target's registry, bare check tag to the
  scenario through the corpus — and the ordinary citation route does the rest. There is no
  static-axis posting rule left to be special.

  WHAT THE FILE IS CALLED, AND WHY THE CODE IS NOT. The feature code is @LNT because a code,
  once allocated, is stable forever: it survives a rename and is never reused
  (`featureCodes.ts`). The name it was allocated under — the retired `@lint=<handle>` form,
  where a scenario named a runnable script and the run was matched back to it BY NAME — is
  the thing this feature retired, so the FILE took the right name (3F-2592) and the code
  stayed put. `@lint` itself survives here as ONE bare check among many: the style-lint one,
  a flat peer of `@complexity` and `@typecheck` (@SCN-LNT-010).

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
  package.json / ci.yml fixtures. @SCN-LDG-028 tests the identical shape through the
  fixture check ldg028-absent-guard and reconciles balanced. Their @unit and @integration
  obligations are untouched and still reconcile — the distinction from a deferral tag,
  which would have taken every obligation these scenarios name dark to silence one row each
  (3F-2351). What spec-controller's OWN lint:feature-codes check owes is raised where it
  belongs: its row of specController.fitnessChecks, whose scenario carries the
  code SCN-FIT-007 in features/fitness-checks.feature (3F-3165). It sat stepless at the foot
  of this file until then, under a code of this feature's own.

  WHICH TREE A FITNESS SCENARIO IS ABOUT IS THE GHERKIN'S TO SAY, AND THE STEP DEFINITION'S TO
  OBEY (ruled 2026-09-04). A fitness scenario names its subject in its own text — a PLANTED tree
  or THE REPOSITORY — and its step definition takes that subject rather than picking one for
  itself. @SCN-ANM-001 holds the check against planted trees and @SCN-FIT-009 holds this
  repository against the check; what tells them apart is a sentence a reviewer reads anyway, not
  a path buried in a step definition. A step definition that runs its check over a fixture while
  its scenario says the repository is then wrong IN THE DIFF, against that sentence.

  IT IS A CONVENTION WRITTEN DOWN, NOT A STATIC CHECK BUILT, and the asymmetry is the reason. A
  check that exists but no CI step runs lives in the GAP BETWEEN TWO FILES — nobody meets it by
  reading, so it needs a mechanism and has one. A step definition pointed at the wrong tree lives
  in one readable line, in a diff, in review: not invisible, just wrong the way any wrong line is
  wrong. What would enforce it is a static analysis of TEST code — itself a check that can be
  wrong, held by nothing.

  Rule: a scenario tagged with its bare check raises one fitness Evidence Obligation, steps or none

    THE DEBIT SIDE OF THE ONE POSTING RULE. Under name-match the DEBIT cited: a scenario
    carried @lint=<handle> and the run was matched back to it by name, so an obligation could
    only be raised by naming a runnable script. That put one TECHNIQUE in front of a whole
    class of fitness functions — which is why complexity, typecheck and vocab all had to spell
    themselves lint:something to be seen at all. A bare check tag drops the technique — a bare
    tag @complexity is a flat peer of @unit exactly as @unit is a flat peer of @integration.
    There is no @behavioural=unit, so there is no @fitness=complexity (canon 2026-08-07, the
    bare-tags Correction).

    THE REGISTERED CHECK TAG IS THE DISCRIMINATOR, AND THE STEPS ARE NOT (ruled 2026-09-04,
    3F-3115). A scenario carrying a registered bare check is a fitness scenario and owes that
    check; a scenario carrying a tier tag is behavioural and owes its tier. Steps say how a
    scenario is written, not which axis it sits on — so a fitness scenario handed a runnable
    example keeps the characteristic it was written to hold, instead of SWAPPING AXES the moment
    it grows one.

    STEPLESSNESS WAS A PROXY FOR THIS RULE, AND IT READ THE WRONG SIGNAL. Having nothing to
    exemplify is why a fitness scenario usually carries no steps: a CORRELATE of being
    non-behavioural, never the thing itself. The CREDIT side never read it — a stepped scenario
    carrying a registered check has always been a citation carrier — so the debit alone stopped
    short, and such a row produced an orphaned credit with nothing to post to (3F-3092). What
    goes here is one condition; the two sides then read the same signal, and no compensating rule
    is added anywhere.

    WHETHER ONE SCENARIO MAY CARRY BOTH KINDS OF TAG IS STILL NOT SETTLED HERE. A row carrying a
    tier tag and a check tag together is a corpus defect, and reading the corpus's shape belongs
    to @SCN-STG-005 exactly as it did before. What is settled here is only which signal the
    OBLIGATION follows.

    A TAG IS A CHECK ONLY WHEN THE REGISTRY SAYS SO — the same registry the citation seam's
    first hop reads. Treating every unrecognised bare tag as a check would raise an obligation
    for @smoke, and a corpus cannot be asked to keep its own vocabulary straight by convention.
    The registry arrives as data, so a target that registers nothing raises no fitness
    obligations at all and the reading is inert until something supplies one.

    ONE OBLIGATION, NOT ONE PER MENTION. A scenario's effective tags are its own plus
    everything it inherits from its Rule and its Feature (@SCN-LDG-020), so one check can reach
    one scenario twice. It owes that check once.

    @unit @integration @SCN-LNT-006
    Scenario: a scenario tagged with a bare fitness check raises one Evidence Obligation for that check, steps or none
      Given "complexity" is a registered fitness check
      And a stepless scenario tagged with the bare fitness check "complexity"
      And a STEPPED scenario tagged with the same bare fitness check "complexity"
      When the scenario corpus is read
      Then each of those scenarios raises exactly one Evidence Obligation, naming the fitness check "complexity"

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
      only the tag was. Nothing raised is a corpus fault the tier floor catches (lint:scn-tags reds
      an unrecognised tag once its lint= clause goes), not a permanent red on the books.

      THE HANDLE IS REGISTERED HERE ON PURPOSE. If the retired form were quietly re-routed through
      the registry — read the handle, look up its check, raise THAT obligation — the corpus would go
      on reconciling and nobody would learn the form had been retired. So the fixture registers
      exactly the handle the tag names, and still expects nothing: the debit no longer cites, on any
      path.

      Given "lint:feature-codes" is registered as the fitness check "feature-codes"
      And a scenario tagged with the retired @lint= form naming the runnable handle "lint:feature-codes"
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
    it, which is how a whole-system characteristic came to be smeared across behavioural
    examples it was never about — complexity is a property of the codebase, and a violation
    points at a file, not at the scenario that happened to spell the script's name. One run is
    one credit and cites one scenario, so a second scenario that would have claimed the same
    run under name-match now claims nothing.

    THIS SCENARIO RAISES NO CHECK OBLIGATION, AND THAT IS THE CORRECTED SHAPE. It once
    carried lint:feature-codes in the retired tag form, because that was the only way the
    corpus could name spec-controller's own check at all — so the repository's obligation and
    this scenario's subject matter shared one tag line, and the row that proved the POSTING
    RULE also stood as the row the real run posted to. 3F-2589 separated them: what the real
    check owes is raised by the stepless fitness scenario at the foot of this file, and what
    is proven here is the rule itself, over fixture data.

    @unit @integration @SCN-LNT-001
    Scenario: a fitness check wired into CI posts one observation citing its scenario and reconciles satisfied
      Given "lint:feature-codes" is registered as the fitness check "feature-codes"
      And a stepless fitness scenario carries the bare check "feature-codes"
      And a second scenario would have claimed the same run under name-match
      When the fitness checks wired into CI are observed and reconciled
      Then the run's observation posts to exactly one row — the fitness scenario's own
      And that fitness scenario reconciles satisfied

    @unit @integration @SCN-LNT-002
    Scenario: a fitness scenario naming a check that exists but is unwired reconciles as the watermelon
      The slice's headline outcome, and the one clause of the acceptance that changes nothing: a
      check that exists and is unwired is still green on the surface and red within. What changes is
      which reader carries it. The running-check observer cannot — it observes what CI RUNS, by
      construction, and a check that runs nowhere is exactly what it filters out — so the
      exists-but-unwired fact still arrives from the OBLIGATION side, and now arrives CITING, over
      the same two hops.

      Exercised over a PLANTED fixture: spec-controller cannot keep a permanent real watermelon
      in-repo, so the planted script is never a real one here, and the bar is that the detector
      CATCHES it over that fixture rather than that the outcome is asserted.

      Given "lint:planted-watermelon" is registered as the fitness check "planted-watermelon"
      And a stepless fitness scenario carries the bare check "planted-watermelon"
      And a planted package.json defines the script "lint:planted-watermelon" but the planted CI config does not run it
      When the registered fitness checks are observed and reconciled
      Then that fitness scenario reconciles as the watermelon, naming the check "planted-watermelon"

    @unit @integration @SCN-LNT-003
    Scenario: a fitness scenario naming a check that does not exist reconciles missing
      The UNMATCHED DEBIT, and the second outcome acceptance clause 3 preserves verbatim: a check a
      fitness scenario names and nothing implements is a required ledger entry never recorded. It
      stays GENUINELY DIFFERENT from the watermelon above — absence and unenforced presence are two
      distinct problems the verdict model refuses to rank away — and under the one posting rule the
      two arms differ by exactly one fact, whether the planted package.json defines the script.

      A CHECK IS NAMEABLE ONLY BECAUSE SOMETHING REGISTERED IT, so "does not exist" is about the
      SCRIPT, never the tag. An unregistered bare tag raises no obligation at all (@SCN-LNT-006) and
      so has nothing to reconcile; what a reader meets here is the check something registered and
      nobody ever wrote.

      The seam reaches this row and finds nothing to credit it with. The absent check is FOUND as
      the negative fact exists:false, which is an ABSENCE rather than an observed piece of evidence
      (@SCN-LDG-028), so the reconciling item carries its obligation and no observation — Obligation
      Exists, Observation None.

      Given "lint:absent-check" is registered as the fitness check "absent-check"
      And a stepless fitness scenario carries the bare check "absent-check"
      And the planted package.json defines no script "lint:absent-check" and the planted CI config does not run it
      When the registered fitness checks are observed and reconciled
      Then that fitness scenario reconciles missing, naming the check "absent-check"

    @unit @integration @SCN-LNT-008
    Scenario: a check named by two fitness scenarios satisfies one and leaves the other missing — one run is no longer evidence for both
      WHAT THE ONE POSTING RULE COSTS, stated where a reader meets it. Under name-match a run posted to
      EVERY row naming it, so a second scenario claiming the same check cost nothing: the smear absorbed
      the corpus fault and no report ever said so. One run is one credit and one credit carries one @SCN,
      so it discharges ONE obligation. The runner-up's obligation is left with no observation, and reads
      missing.

      MISSING FOR THE RUNNER-UP IS THE INTENDED OUTCOME, not a gap to design around. A shared credit, a
      dedupe, or a both-satisfied path would each have to invent a rule for which scenario the run MEANT,
      when the honest answer is that the corpus has not said. Which scenario wins is fixed by the corpus
      itself — first in corpus order — so the fault surfaces on the row holding no evidence rather than
      being hidden by the row holding some. That is the loud failure mode which makes the string form
      safe (@SCN-LNT-015): an entry naming only a characteristic still resolves first-in-corpus, so a
      characteristic that grows a second check without gaining a discriminator surfaces here rather
      than quietly crediting the wrong row.

      Given "lint:feature-codes" is registered as the fitness check "feature-codes"
      And a stepless fitness scenario carries the bare check "feature-codes"
      And a second stepless fitness scenario carries the same bare check "feature-codes"
      When the fitness checks wired into CI are observed and reconciled
      Then the first fitness scenario reconciles satisfied, holding the run's one credit
      And the second fitness scenario reconciles missing, naming the check "feature-codes"

    @unit @integration @SCN-LNT-012
    Scenario: two fitness credits citing one @SCN each answer their OWN check — the second is never silently absorbed
      THE MIRROR OF THE SCENARIO ABOVE, and the fault runs the other way. @SCN-LNT-008 is two
      scenarios reaching one check; this is one scenario reaching two. The citation is the same seam
      in both, and it is deliberately NOT unique on either side: a bare check tag names one scenario
      (the corpus hop keeps first-in-corpus-order), but a scenario may carry more than one bare
      check, so two runs can honestly cite the same @SCN. That is a legal corpus, not a fault — the
      row simply owes two fitness obligations and is owed two credits.

      A CITATION IS NOT AN ADDRESS ON ITS OWN. Answering an obligation by @SCN alone is enough only
      while a row owes ONE thing per axis, and the fitness axis is the axis where that stopped being
      true. Two obligations, two credits, one @SCN: matching on the @SCN finds whichever credit
      comes first and hands it to BOTH obligations, so the second credit answers nothing and
      vanishes — the never-dropped clause broken, and broken silently.

      THE OBSERVATION MUST CARRY WHAT THE LEDGER RECONCILES ON. An obligation names the BARE CHECK
      TAG its stepless scenario carries (`typecheck`); a run knows the RUNNABLE HANDLE that invoked
      it (`lint:complexity`). Comparing those two words is name-match wearing a new coat — it agrees
      only where the spellings happen to coincide, which is the single unprefixed check. So the
      credit is stamped with its own bare tag at the moment the citation is resolved, and the match
      compares like with like: @SCN to @SCN, check to check.

      THE COST OF GETTING THIS WRONG IS A FALSE GREEN IN THE TOOL ITSELF, which is why the fixture
      below is built so the two credits disagree about their outcome. One check is wired and one is
      not, so a reader that hands the wired credit to both obligations turns a genuine watermelon
      `satisfied` and the row `balanced` — the exact report this tool exists to refuse, produced by
      the tool.

      Given "lint:complexity" and "typecheck" are registered as the fitness checks "complexity" and "typecheck"
      And a stepless fitness scenario carries both bare checks "complexity" and "typecheck"
      And the planted package.json defines both scripts while the planted CI config runs only "lint:complexity"
      When the registered fitness checks are observed and reconciled
      Then the "typecheck" obligation reconciles as the watermelon, credited by the typecheck run's own observation
      And the "complexity" obligation reconciles satisfied, credited by the complexity run's own observation

    @unit @integration @SCN-LNT-004
    Scenario: a scenario requiring both a unit test and a fitness check reports each independently
      TWO AXES ON ONE ROW, ANSWERED SEPARATELY. A scenario can owe evidence on the behavioural axis
      and on the fitness axis at once, and each obligation is discharged only by a credit of its own
      quality-check: a green unit test never answers the fitness obligation, and a fitness run never
      answers the unit one. What holds this row out of balance is the fitness watermelon alone,
      while the behavioural axis balances — one verdict built from both readings, never one reading
      standing in for the other.

      ONE POSTING RULE MAKES THIS SHARPER, NOT WEAKER. Under name-match the two credits arrived by
      different routes — the unit credit cited its @SCN, the fitness credit was matched by handle —
      so keeping them apart was a property of the routes rather than a rule anyone wrote. Now BOTH
      credits cite the SAME @SCN and post to the SAME row, which is precisely the arrangement in
      which a reconciler answering an obligation by the row it sits on, rather than by what it owes,
      would collapse the two.

      THE FITNESS OBLIGATION NAMES THE BARE TAG while its credit names the RUNNABLE HANDLE, so the
      citation is the only thing that can join them. A reader falling back to matching by name
      leaves that obligation missing and sends its credit to suspense — a different report from the
      one below, and one this scenario catches.

      THE SHAPE RULE IS NOT THIS SCENARIO'S. Whether one scenario may carry a tier tag and a
      fitness tag together is @SCN-STG-005's question; the fixture below carries both because it
      is the only shape a TWO-AXIS row can be read from at all, and it is stepless because that is
      what a fitness scenario ordinarily is — not because the obligation rule reads the shape,
      which it no longer does (@SCN-LNT-006). What is settled here is only that the reconciler
      answers each obligation a row raises on its own axis.

      Given "lint:unwired-check" is registered as the fitness check "unwired-check"
      And a stepless scenario carries the bare check "unwired-check" and also requires a unit test
      And the unit test for that scenario passes
      And a planted package.json defines the script "lint:unwired-check" but the planted CI config does not run it
      When the registered fitness checks and the unit result are observed and reconciled
      Then the scenario's fitness obligation reconciles as the watermelon, naming the check "unwired-check"
      And its unit obligation reconciles satisfied, omitted from the reconciling items

    @unit @integration @SCN-LNT-005
    Scenario: a fitness check read from an external package.json but absent from the external CI is the watermelon
      THE CROSS-REPO SEAM. spec-controller reconciles a TARGET tree, which is usually not its own, so
      a check's existence is read from that target's package.json and its wiring from that target's
      CI. The outcome is the watermelon exactly as it is over the local tree above — this arm holds
      that every input the outcome rests on came from the target rather than from the tool.

      THE REGISTRY IS AN INPUT LIKE THE OTHERS, and it has to move with them. A bare check tag means
      what the TARGET says it means, so the handle-to-tag mapping belongs in the target's own
      configuration beside its scripts and its CI. Resolved from spec-controller's instead, a target
      registering nothing would raise no obligation at all, and one registering the same word for a
      different script would credit the wrong row. The corpus hop compounds it: the scenario carrying
      the check is the TARGET's, so a citation resolved against spec-controller's own features would
      answer for a corpus this run never read. This is the one arm that can tell those apart, because
      it is the only one where the two corpora differ.

      THE NEGATIVE IS WHAT GIVES THIS TEETH. The check below is absent from spec-controller's own
      package.json, so a reader falling back to the tool's own manifest finds no script, reports the
      check as one nobody wrote, and the row reads missing rather than the watermelon. Present
      somewhere and enforced nowhere is precisely the fact that has to survive the boundary.

      Given an external target whose package.json registers "lint:vocab-check" as the fitness check "vocab-check"
      And that target's corpus carries a stepless fitness scenario tagged with the bare check "vocab-check"
      And that target's package.json defines the script "lint:vocab-check" while its CI config does not run it
      And spec-controller's own package.json defines no such script and registers no such check
      When the reconciler runs against that external target
      Then that target's fitness scenario "SCN-EXT-001" reconciles as the watermelon, naming the check "vocab-check"

  Rule: a fitness credit matching no Evidence Obligation lands in suspense or on a phantom row

    BOTH UNMATCHED SIDES STAY VISIBLE. An obligation nothing credits reads missing above; a credit
    nothing obliges is its mirror, and it must be just as loud. Under name-match the fitness axis had
    only ONE unmatched destination — a run cited nothing, so it was either matched by handle or it
    was not — and a run that named a row nobody wrote was not a shape the axis could produce.
    Citation-routing produces it: a credit carrying an @SCN is routed by that @SCN, so it can name a
    row that is not there.

    THE TWO DESTINATIONS ARE DIFFERENT FACTS, and telling them apart is the whole value of the rule.
    A credit citing NOTHING never looked, and lands in suspense — the tool's own uncited-check
    axis (@SCN-USG-001), whose remedy is to register the check and write its fitness scenario. A credit
    citing an @SCN the corpus does not carry LOOKED AND MISSED, so it mints the row it named and
    lands there; its remedy is to fix the citation. Folding either into the other sends a reader to
    the wrong cure.

    @unit @integration @SCN-LNT-009
    Scenario: a fitness credit citing an @SCN no scenario carries posts to a phantom row
      NEWLY REACHABLE, and that is the point. While a fitness check's run cited nothing, this arm was
      structurally unreachable on the fitness axis — there was no citation to be wrong. Once the
      credit cites, the fitness axis inherits every destination a runtime credit has, this one
      included, and inherits it through the SAME posting rule rather than a fitness clause that
      re-states it.

      THE TWO READS CAN DISAGREE, which is what makes this a real fault rather than a hypothetical.
      The @SCN is stamped onto the run when the check is OBSERVED; the row it names is looked for in
      the corpus as the corpus reads when the ledger is built. A fitness scenario renumbered,
      retired, or living in a feature file this run does not reconcile leaves the credit naming a row
      nobody wrote — the same disagreement a runtime credit has always been able to carry between a
      test file's @SCN and the corpus, now reachable on this axis too.

      THE CREDIT IS NEVER DROPPED. Dropping it is the one outcome the double entry forbids: every
      Evidence Observation posts somewhere, never nowhere. So the row is INVENTED, the credit posts
      there carrying the check that ran, and the row is out-of-balance — nobody raised it, so nothing
      about it can balance. Naming the check is what makes the row actionable: without it a reader
      learns only that some run cited a scenario that is gone.

      Given "lint:feature-codes" is registered as the fitness check "feature-codes"
      And a stepless fitness scenario carries the bare check "feature-codes"
      And that fitness scenario is renumbered after the run cites it
      When the fitness checks wired into CI are observed and reconciled
      Then the run's credit posts to a phantom row for the @SCN it cited, naming the check "lint:feature-codes"
      And no scenario's row holds that credit

  Rule: a fitness credit citing a real row at a check that row never named is no-evidence-obligation

    THE SAME OUTCOME THE RUNTIME AXIS ALREADY PRODUCES, reached on a second axis. @SCN-LDG-008
    settled what happens when a credit cites a REAL scenario at a quality-check that scenario never
    named: it posts to that row against no obligation, and the row carries one credit-only
    no-evidence-obligation item per such credit. Nothing about that rule is fitness-specific — what
    was fitness-specific was that the fitness axis could not REACH it.

    IT IS NOT THE UNMATCHED-CREDIT RULE ABOVE, and the distinction is the whole reason this sits in
    its own Rule. Suspense and the phantom row are where a credit goes when it reaches NO real row —
    it cited nothing, or it cited an @SCN the corpus does not carry. This credit reached a real row.
    The row exists, the citation is right, and the only thing wrong is that the check is not one
    that row owes. Filing it as a third destination of "the credit found nowhere to land" would
    describe a credit that landed.

    WHY IT WAS UNREACHABLE UNTIL @SCN-LNT-012. While a fitness credit was matched to its obligation
    by the AXIS alone, any lint obligation answered any lint credit, so a credit landing on a real
    row always matched something and this shape could not occur. Making the match compare CHECK TAGS
    — the @SCN picks the row, the tag picks the obligation — created a credit that reaches a real
    row and matches nothing on it. That was half a correction: the credit-side catch was still keyed
    on the AXIS, so the credit it newly failed to match, it also newly failed to catch, and the
    credit reconciled to nothing at all. Measured over a genuine watermelon, the run read balanced.

    @unit @integration @SCN-LNT-013
    Scenario: a fitness credit citing a real row that does not name its check posts there as no-evidence-obligation

      THE CREDIT REACHED A ROW AND ANSWERED NOTHING ON IT, so it surfaces as the credit-only item
      that fact already has a name for. Every Evidence Observation posts somewhere and never
      nowhere.

      THE ROW'S OWN OBLIGATION IS UNTOUCHED BY IT, which is the half that keeps the two facts apart.
      The scenario still owes the check it named and still reads whatever its own run says; the
      stray credit is a second, independent item beside it. A reader who saw one row could not tell
      which of the two things went wrong.

      Given a fitness scenario "SCN-AAA-001" raises the check "complexity" and no other
      And a run of the check "typecheck" cites "SCN-AAA-001"
      When that corpus and those runs are reconciled
      Then the row "SCN-AAA-001" holds a no-evidence-obligation item naming the check "typecheck"
      And the row's own "complexity" obligation reconciles beside it, untouched

    @unit @integration @SCN-LNT-014
    Scenario: a balanced row cannot absorb a stray fitness credit — the run that read green over a watermelon reds

      THE FAULT AT ITS MOST DANGEROUS, and the reason this is a slice rather than a tidy-up. When
      the row's OWN obligation is satisfied, an absorbed credit leaves nothing behind at all: no
      reconciling item, a balanced row, a balanced run, exit 0. Measured before the fix, over a
      credit carrying a genuine watermelon — a check that exists and CI does not run — the tool
      reported the tree as balanced. That is precisely the report this tool exists to refuse,
      produced by the tool.

      THE VERDICT IS THE ASSERTION, not the item. @SCN-LNT-013 pins that the credit becomes an item;
      what is pinned here is that the item reaches the ROLL-UP — a row otherwise entirely clean is
      made out-of-balance by a credit it never asked for, and the run's exit code follows. Asserting
      the item alone would leave the green build unexplained, which is why the whole-run reading is
      asserted and not only the row's.

      Given a fitness scenario "SCN-AAA-001" raises the check "complexity" and no other
      And the "complexity" run cites "SCN-AAA-001" and is wired into CI over the real source
      And a run of the check "typecheck" cites "SCN-AAA-001" but CI does not run it
      When that corpus and those runs are reconciled
      Then the row "SCN-AAA-001" is out-of-balance over the stray credit alone
      And the whole run reads out-of-balance

  Rule: @lint is one bare style-lint check among many, never the catch-all

    THE DEMOTION. Every other bare check tag arrived new — @complexity, @typecheck and @vocab had no
    prior meaning to lose. @lint did: it was the name of the whole class. A check was a "lint"
    whether it counted cyclomatic complexity, compiled the types or read the corpus for retired
    words, and spelling yourself lint:something was the only way to be seen at all. Naming a class
    of fitness functions after ONE technique is the fault the 2026-08-07 unification retired, so
    what is left for @lint is the technique itself — analysis of the source's style, a flat peer
    of @complexity and @typecheck, owed exactly the way they are owed and reconciled by exactly
    the same rule.

    A PEER IS PROVED BY ITS COMPANY, which is why the registry here carries three checks and not
    one. A catch-all and a peer are indistinguishable in a corpus that knows a single check: both
    raise one obligation, and both look right. Register three and the two readings part — a peer
    owes the check its own tag names, a catch-all owes all of them. Nothing about the demotion is
    visible until the corpus can tell those apart.

    THREE THINGS SHARE THIS ONE WORD, and only the first is demoted here. The retired @lint=<handle>
    form still parses and still raises its obligation until @SCN-LNT-007 makes it inert. The model's
    own quality-check member `lint` — the axis every fitness obligation is filed under, twin of
    `unit` and `integration` — is spelled the same and is a different thing, untouched by the
    unification. A reader who collapses any two of the three will conclude this scenario proves
    something it does not.

    AN EXEMPTION FOR THIS ONE TAG WOULD BE TEMPTING IN EITHER DIRECTION, which is why the peer
    reading is now held over BOTH SHAPES. Since 3F-3115 a registered bare check owes its check from
    the row that carries it, steps or none (@SCN-LNT-006), and @lint is the tag a reader is likeliest
    to special-case: carving it OUT of the rule because of what it used to name, or handing it a
    built-in standing the registry never gave it. The scenario below reads one corpus over a stepless
    row and a stepped one, so the company that tells a peer from a catch-all is read on both.

    @unit @integration @SCN-LNT-010
    Scenario: a scenario tagged bare @lint raises the style-lint Evidence Obligation, steps or none
      Given "lint" is a registered fitness check alongside "complexity" and "typecheck"
      And a stepless scenario tagged with the bare fitness check "lint"
      And a STEPPED scenario tagged with the same bare fitness check "lint"
      When the scenario corpus is read
      Then each of those scenarios raises exactly one Evidence Obligation, naming the fitness check "lint"

  Rule: a registry entry may name the fitness scenario its check credits

    WHY THE CORPUS HOP CANNOT ANSWER THIS ALONE. Hop 2 keys on the bare tag, and canon now
    asks one tag to name several scenarios — several checks of one characteristic, told
    apart by @SCN (fitness-functions.md → Static checks). A tag that names three scenarios
    identifies none of them, so first-in-corpus stops being an ordering convention and starts
    being a wrong answer: two of the three reconcile missing while their checks run green,
    which is the attribution fault the one posting rule exists to remove.

    THE MAPPING MOVES TO THE RUNNER, WHICH IS WHERE CANON ALREADY PUT IT — "the
    check-to-scenario mapping held by the runner, as @ci-run-time's is". The measured axis
    stamps its @SCN onto the measurement at the command line (--scn SCN-FIT-012); a static
    check emits no artefact to stamp, so its runner-side mapping is the registry, and the
    registry is where the @SCN goes. Not a second roster of the OBLIGATION: the scenario still
    raises the debit and still carries the threshold. The registry only says which row this
    handle's credit belongs to — the one fact the handle alone can no longer supply.

    THE STRING FORM IS UNCHANGED, and that is the compatibility this Rule is careful about. An
    entry naming only a characteristic resolves exactly as it does today, so @SCN-LNT-008 stays
    true and stays green: a characteristic with one check needs no ceremony, and one that grows
    a second check without gaining discriminators fails LOUD — the runner-up still reads missing
    — rather than quietly crediting the wrong row.

    TWO ARTEFACTS KEYED BY THE SAME WORD AGREE UNTIL ONE IS EDITED, which is the fault the
    threshold map already meets (@SCN-CIP-002) and answers the same way: an @SCN the corpus
    does not carry with that characteristic is not smoothed over into a near-match. The
    citation is ALL OR NOTHING, as it already is for an unregistered handle — the run cites
    nothing, posts to suspense, and the scenario it was meant for reads missing. Both halves
    go loud, because a renumbered scenario must not be able to green a row by resembling one.

    @unit @integration @SCN-LNT-015
    Scenario: a check whose registry entry names its fitness scenario credits that scenario, not the first one carrying its characteristic
      TWO CHECKS OF ONE CHARACTERISTIC — the shape the collapse produces, and the shape
      first-in-corpus gets wrong. Both handles are wired and both run, and each entry names the
      row its own run belongs to, so each credit reaches its own scenario and both reconcile
      satisfied. Read through the corpus hop alone the second run cites the FIRST scenario: one
      row holds two credits, the other holds none and reads missing while its check ran green
      (@SCN-LNT-008). The registry entry is what tells them apart.

      THE FIXTURE IS THE COLLAPSE'S OWN SHAPE, at fixture @SCN ids no feature file carries.
      Two handles of the characteristic `vocab` are what this fixture names, drawn from the
      four that characteristic holds in this tree's own registry, and they are genuinely wired
      CI steps over the real source — so what is observed here is a real static check's run,
      not a planted one. THE CHARACTERISTIC IS PICKED FOR HAVING HANDLES TO SPARE rather than
      for its subject: this arm reads the checked-out tree, so it needs a characteristic that
      tree still wires more than once, and every conversion takes one of those away (3F-3153).

      Given these registry entries name the fitness scenario each check credits
        | script                  | check | scenario    |
        | lint:blocked-vocabulary | vocab | SCN-AAA-001 |
        | lint:adopted-vocabulary | vocab | SCN-AAA-002 |
      And a stepless fitness scenario carries the bare check "vocab"
      And a second stepless fitness scenario carries the same bare check "vocab"
      When the fitness checks wired into CI are observed and reconciled
      Then each fitness scenario reconciles satisfied, credited by the run its own registry entry names

    @unit @integration @SCN-LNT-016
    Scenario: a registry entry naming an @SCN no scenario carries cites nothing, and the scenario it was meant for reads missing
      TWO ARTEFACTS KEYED BY THE SAME WORD, and one of them has been edited. A renumbered
      scenario, a retired one, an id typed against a code that never existed — all three reach
      this seam as the same fact: the entry is well-formed, its check runs green, and the row it
      names is not among the scenarios carrying its characteristic. The threshold map already
      meets this fault on the measured axis and answers it the same way (@SCN-CIP-002).

      THE CITATION IS ALL OR NOTHING, and both halves go loud. The run cites nothing, so its
      credit posts to suspense; the scenario that was meant to receive it finds nothing to
      discharge its obligation and reads missing. The cheap wrong reading is the one this
      refuses — degrade to the corpus hop, credit whichever row it reached first, and green a
      row nobody named. That is a watermelon manufactured by the ENGINE rather than by the
      target, and silence is the outcome that must not be reachable.

      Given these registry entries name the fitness scenario each check credits
        | script                  | check | scenario    |
        | lint:blocked-vocabulary | vocab | SCN-AAA-001 |
        | lint:adopted-vocabulary | vocab | SCN-AAA-003 |
      And a stepless fitness scenario carries the bare check "vocab"
      And a second stepless fitness scenario carries the same bare check "vocab"
      When the fitness checks wired into CI are observed and reconciled
      Then the run of "lint:adopted-vocabulary" cites no scenario and its credit posts to suspense
      And the second fitness scenario reconciles missing, naming the check "vocab"

    @unit @integration @SCN-LNT-017
    Scenario: a registry entry naming a scenario that carries a different characteristic cites nothing — a near-match is never a match
      THE ROW THIS ENTRY NAMES IS REAL, and it still answers nothing. It is a stepless fitness
      scenario the corpus carries, cited by its own check and reconciling green — but it carries
      a DIFFERENT bare characteristic than the entry does. The @SCN alone was never the join: one
      row may carry two bare checks and owe two obligations (@SCN-LNT-012), which is exactly why
      a credit is keyed by the PAIR. An entry whose pair the corpus does not hold has not named a
      row this check can settle.

      HALF A MATCH IS THE ONE A LOOKUP IS TEMPTED TO SMOOTH OVER, because the id resolves. A
      reading that tested EXISTENCE rather than MEMBERSHIP would green a row that owes this
      check nothing, while the row that does owe it reads missing and its own run sits in
      suspense — the same silent wrong credit @SCN-LNT-016 refuses, reached by a different route.

      TWO FAULTS, TWO REMEDIES, WHICH IS WHY THIS IS NOT AN ARM OF @SCN-LNT-016. That author
      fixes the id; this one fixes the row it points at — the entry was aimed at the wrong
      scenario, or the scenario it named was renumbered onto another characteristic. One code
      path, and an author meeting either needs to be told which of the two they are looking at.

      Given these registry entries name the fitness scenario each check credits
        | script                  | check        | scenario    |
        | lint:blocked-vocabulary | vocab        | SCN-AAA-001 |
        | lint:adopted-vocabulary | vocab        | SCN-AAA-003 |
        | lint:feature-codes      | traceability | SCN-AAA-003 |
      And a stepless fitness scenario carries the bare check "vocab"
      And a second stepless fitness scenario carries the same bare check "vocab"
      And a third stepless fitness scenario carries a different bare check "traceability"
      When the fitness checks wired into CI are observed and reconciled
      Then the run of "lint:adopted-vocabulary" cites no scenario and its credit posts to suspense
      And the second fitness scenario reconciles missing, naming the check "vocab"
      And the third fitness scenario reconciles satisfied for "traceability" alone, absorbing no credit meant for another characteristic

  Rule: a converted check names its characteristic in data, and the tag names only the axis

    THE COLLAPSE, WALKED THROUGH TWO CHECKS (3F-3138, the walking skeleton of 3F-3139). A
    fitness scenario has carried a bare characteristic tag — `@complexity`, `@mutation` — and
    that one token answered two questions at once: HOW is this claim proved, and WHAT is it
    about. The tier tags answer only the first (`@unit` says nothing about the subject), and
    nobody mints `@unit-parser`; fitness has been the exception and the exception was never
    argued for. So the tag collapses to `@fitness` — one word for the whole axis, because post
    conversion every fitness check runs under cucumber and posts through one report — and the
    CHARACTERISTIC moves into a configured row, where it stays a first-class word the roll-up
    still groups by.

    THE ROW IS THE WHOLE OF WHAT A CHECK SAYS ABOUT ITSELF, AND IT IS THREE FIELDS: the `@SCN`
    it is about, the characteristic it asserts, and the command that returns a violation. A
    fourth appears only where the bar lives outside the command. Nothing else is needed,
    because the command carries its own scope — `eslint src/` states which tree in the same
    string.

    WHY THE CORPUS IS STILL NEEDED WHEN THE ROW ALREADY CARRIES ALL THREE. A linter reports
    findings only, so its silence is ambiguous between nothing-wrong and nothing-looked.
    Cucumber reports every scenario it ran, pass or fail — that enumeration is the thing the
    fitness axis has never had, and the corpus is how a check acquires it. Reading the rows
    alone and skipping the corpus would put this axis back to single entry.

    @unit @integration @SCN-LNT-018
    Scenario: a @fitness scenario raises its Evidence Obligation for the characteristic its configured row names

      THE OBLIGATION IS THE SAME ONE A BARE CHECK TAG RAISES, and that is what keeps every reader
      downstream untouched — the pair key, the reconciler's static arm, the roll-up. What changed is
      only where the word came from: the tag says which axis the scenario is on, the configured row
      says which characteristic it is about.

      OWED ONCE, HOWEVER MANY TIMES THE AXIS TAG REACHES THE ROW. A scenario's effective tags are
      its own plus its Rule's and its Feature's, so the axis tag can arrive twice; two obligations
      for one characteristic would leave the second missing for ever, since one run is one credit
      and can cite one @SCN.

      Given a configured row names the scenario "SCN-AAA-001" as the fitness check "complexity"
      And that scenario carries the bare fitness axis tag and no characteristic tag
      And the axis tag reaches it a second time, hoisted onto its Rule
      When the scenario corpus is read
      Then that scenario raises exactly one Evidence Obligation, naming the fitness check "complexity"

    @unit @integration @SCN-LNT-019
    Scenario: a configured row carrying a bar raises a measured Evidence Obligation holding it, and a row carrying none raises a static one

      THE ROW'S SHAPE SAYS WHICH KIND OF CHECK IT IS — no type field, no second tag, and no roster
      of measured characteristics anybody has to keep in step with the rows. A row carrying a bar is
      measured and a row carrying none is static, which is the discrimination the threshold registry
      has always made: a check with no entry there is already the static case, so this needs no new
      concept and adds none.

      THE BAR IS SPREAD WHOLE, NEVER ITS NUMBER PICKED OUT (@SCN-MUT-001). A floor row names
      `atLeast` and a ceiling row names `atMost`, and the direction is the TARGET's to author rather
      than the engine's to infer from the characteristic — a mutation score is a floor in every
      repository there is, and an engine reading the direction off the word would be holding the
      roster @SCN-LNT-005 puts in the target's hands.

      MEASURED IS SET WHETHER OR NOT A BAR COULD BE READ, exactly as the threshold route sets it.
      The flag is what routes the obligation to the comparison arm, and a bar nobody wrote is what
      that arm then reports (@SCN-CIP-002); marking a row measured only where a readable bar was
      found would send an un-authored one down the static route, to be reported as a check nobody
      wrote — the wrong cure for the actual fault.

      Given a target configures these fitness rows, and only the bar each names differs
        | scenario    | check      | at least |
        | SCN-AAA-002 | mutation   | 90       |
        | SCN-AAA-003 | coverage   | ninety   |
        | SCN-AAA-001 | complexity |          |
      And each of those scenarios carries the bare fitness axis tag and no characteristic tag
      When the scenario corpus is read
      Then the three raise, in turn, a measured Evidence Obligation holding that floor whole, a measured one holding no bar, and a plain static one

    @unit @integration @SCN-LNT-020
    Scenario: a @fitness scenario no configured row names raises no Evidence Obligation and is reported as unconfigured

      IT CANNOT RAISE ONE, AND REACHING FOR A NEAR CHARACTERISTIC IS THE FAULT RATHER THAN THE
      CURE. A scenario carrying the bare axis tag whose @SCN no configured row names has said
      which axis it is on and then said nothing about what it asserts. There is no characteristic
      to raise an Evidence Obligation for, and the nearest word in the portfolio roster is a
      courtesy that roster already refuses.

      SILENCE IS THE WRONG ANSWER TOO, so it reds — on the outcome canon already carries for this
      shape rather than on a new one. The scenario is real, no Evidence Obligation was raised and
      no Evidence Observation cites it, so its row reconciles to nothing on either side and is out
      of balance through the one degenerate reconciling item. A converted check's scenario carries
      the axis tag and its @SCN and nothing else, so that row is empty on both sides by
      construction.

      AND THE REPORT NAMES IT, because the degenerate item cannot say WHY: its own sentence is
      about a scenario carrying no @SCN, and this one carries one. The naming rides with the other
      corpus-shape faults the census already reports — count and locator, facts only — so the
      reader is sent to the one remedy, which is to write the row.

      Given a target's corpus carries two scenarios on the fitness axis and its configured rows name only the first
      When that target's evidence is reconciled
      Then the second raises no Evidence Obligation, its row is out of balance, and the report names it as a fitness scenario no configured row names

  Rule: a converted check credits the scenario that raised it, and the credit needs no registry hop

    THE TWO-HOP SEAM IS WHAT CONVERSION RETIRES. An unconverted static check is discovered as
    a script handle, and a handle does not know what it is FOR — hence `checkRegistry`, and
    hence the corpus lookup behind it. A converted check is not discovered at all: it is a
    scenario that ran, carrying its own `@SCN` on its own tag line. The citation is read off
    the row rather than resolved onto it.

    ONE OBLIGATION, ONE CREDIT, AND THE ROW'S SHAPE DECIDES WHICH STREAM CARRIES IT. A static
    row's credit is the fitness pass reporting the scenario — the check existed and it ran over
    the real tree, both facts directly observed rather than inferred from a manifest and a
    workflow. A measured row's credit is its NUMBER, and the fitness report raises no second
    credit beside it: two credits answering one obligation is the double count this rule exists
    to foreclose.

    @unit @integration @SCN-LNT-021
    Scenario: a static converted check's scenario in the fitness report credits its own row, citing its own @SCN

      THE CREDIT ARRIVES ALREADY CITING, so there is nothing left to resolve. The scenario carries its
      own @SCN on its own tag line and the configured row keyed by that @SCN carries the characteristic,
      so both terms of the credit are read off what the pass reported. No check registry is consulted
      and no corpus lookup stands behind it — the two hops an unconverted check needs are the two this
      route does not have.

      AND THE TWO FACTS SUCH A CREDIT CARRIES ARE OBSERVED HERE RATHER THAN INFERRED. On the
      unconverted route the check EXISTS because a manifest holds a script by that name, and it ran
      over the real tree because a workflow step invokes that script. Here the scenario appearing in
      the fitness pass's report says the check ran, and the pass runs in the target's own root, so it
      ran over that root's tree. Both are read from the run itself, which is strictly stronger than a
      file mentioning a name.

      THE CREDIT IS ABOUT THE WIRING AND THE EXIT CODE IS ABOUT THE FINDINGS. A scenario present in the
      report credits its row whether it passed or failed, because a static check's ledger row has never
      carried the check's own verdict: a check finding violations reds the run through the runner's exit
      code, and the ledger says the check ran. Two questions, two mechanisms — and a reading that
      credited only the scenarios that passed would answer the second question twice and the first not
      at all.

      Given a target's configured rows name a static fitness check for each of the two scenarios its corpus carries
      And its fitness pass reported both, the first having found nothing and the second a violation
      When that target's evidence is reconciled with what its fitness pass reported
      Then each scenario's own row is credited for the characteristic its row names, no check registry naming either, and both rows balance

    @unit @integration @SCN-LNT-022
    Scenario: a measured converted check's scenario in the fitness report raises no credit, because its number is the credit

      ONE OBLIGATION, ONE CREDIT, AND THE ROW'S SHAPE SAYS WHICH STREAM CARRIES IT. A measured
      converted check raises one Evidence Obligation and its evidence is a NUMBER, read from the
      measurement artefact by the reader that already exists. A credit raised beside that number
      would be a second credit answering one Evidence Obligation, and it would answer nothing: the
      comparison arm reads measurements only, so the extra credit lands on the row naming a
      characteristic nothing on that row can settle it against, and takes the run out of balance.

      SO THE REPORT READING SKIPS A SCENARIO WHOSE CONFIGURED ROW CARRIES A BAR, and it asks that
      question through the same predicate the obligation side asks it through. The two readings
      then agree by construction rather than by diligence: one fact, one spelling, or this is the
      shape where a debit and a credit grow separate opinions of whether a row is measured — and
      the row whose bar nothing could read is exactly where they would first differ.

      NO SECOND CREDIT ROUTE IS INVENTED HERE. The ledger has carried two fitness observation
      shapes since @SCN-CIP-003 — a static fact about the tree, and a measurement — and this only
      says which of the two a converted row uses. What is new is that the choice is readable from
      one place rather than reached separately by each side that makes it.

      AND THE ENUMERATION IS NOT LOST, which is the half of this that reads wrong unless the
      sentence is finished. The measured scenario still appears in the fitness pass's report, and
      that appearance is still what says the check ran; what it no longer does is post a credit
      beside the number. Two questions and two mechanisms, exactly as on the static route — only
      here the second is answered by a value rather than by an exit code.

      Given a target's configured rows name a static fitness check for one of its two scenarios and a measured one, holding a floor, for the other
      And its fitness pass reported both scenarios, and its measurement artefact holds a number for the measured one
      When that target's evidence is reconciled with what its fitness pass reported and with what it measured
      Then the static scenario's row is credited off the report and the measured one's row off its number alone, each row carrying one credit and both balanced

  Rule: the fitness pass runs the command its configured row names

    THE STEP DEFINITION RUNS THE COMMAND. Always, and there is no read-an-artefact second
    shape in the model: what a target puts BEHIND the command is the target's business, and
    the pass does the same thing either way. A target that types a sweep there gets the sweep
    inside its fitness pass, which is exactly what it asked for.

    THE EXIT CODE ANSWERS ONE QUESTION AND THE SCENARIO ANSWERS THE OTHER. `did the check run`
    is answered by the scenario appearing in the report; `did it find anything` is answered by
    the exit code. Two questions, two mechanisms — which is why a command exiting 0 having
    examined nothing cannot pass as silence here.

    AND THE SECOND QUESTION HAS A THIRD ANSWER, WHICH THE ROW HAS TO ASK FOR (3F-3169, 3F-3170).
    A check says `nothing to report`, or `here is a violation`, or `I could not examine
    anything` — the third being what a check whose input exists only in CI has to be able to say
    on a laptop. The pass hears that third answer from a row that NAMES the code its command
    says it with, and from no other row: a row silent on the point keeps the two-answer reading,
    where every way of ending but a clean one is a check that broke and stays a failure. What a
    code MEANS is a property of the command rather than of the pass, so the pass reads it where
    the command is written down instead of fixing one code for every target at once.

    THE NUMBER ARRIVES ON STDOUT. A measured row's command prints its measurement and nothing
    else there; whatever it wants to say goes to stderr. No named artefact path, no second
    I/O contract in the row — a tool that prints other things gets a wrapper, which is what
    every measured producer in this repository already is. The BAR stays outside the command
    either way: one bar per characteristic, never the runner's own verdict.

    @integration @SCN-LNT-023
    Scenario: the fitness step definition runs its row's command, and hears a check that examined nothing only from a row naming the code that says so

      THE ROW'S COMMAND IS THE CHECK, AND RUNNING IT IS THE WHOLE OF WHAT THIS STEP DOES. The scenario
      carries the axis tag and its own @SCN; the row keyed by that @SCN carries the command; the step
      runs it in the target's own root and reads the exit code. Nothing else is consulted — no check
      registry, no corpus lookup, no artefact somebody else wrote — because the two terms this needs
      are the tag line the runner is already holding and the row that names it.

      THE THIRD ANSWER IS OPT-IN PER ROW AND NEVER INFERRED (3F-3170). A check can find nothing, it can
      find a violation it prints, or it can be unable to examine anything at all — which is the ordinary
      state of a check whose input only CI holds. The pass hears that third answer only from a row that
      NAMES the code its command says it with; a row silent on the point keeps the two-answer reading it
      has always had, which is both the safe default and what every target already gets. The third
      answer is still not a pass: a scenario that went green having examined nothing is the silence
      fault, in the repository that names it. So the pass reports it as neither passed nor failed — the
      scenario still appears, so its row is still credited as one that ran, and the pass's own verdict
      is unmoved.

      THE CODE IS THE ROW'S BECAUSE THE MEANING IS THE COMMAND'S (3F-3170). One code fixed for every
      target would be the pass telling a consumer's command what its own answers mean, and the first
      attempt at that took a code this product's own `balance` already spends on a pending-items verdict
      under `--strict` — so a consumer running `balance` behind a fitness row would have had a red
      silently reclassified as a check that examined nothing, in the product built to catch that. A
      rarer code is not the repair: the claim that a code will not collide is the claim that just
      failed, and the quiet ranges are spoken for as well. The row already carries the command, so it is
      where that command's own taxonomy belongs.

      AND IT IS ONE CODE PER ROW, NOT A RANGE. Exactly one way of ending means `I examined nothing` for
      a given command, and every other way that command can end is a check that broke and stays a
      failure. A range would hand the third answer to the broken check next door, which is the silence
      fault arriving through the door built to close it.

      THE @SCN COMES OFF THE TAG LINE, NEVER OFF THE SCENARIO'S NAME. A title is prose a person edits;
      recovering an identifier from one is the name-match posting @SCN-LNT-002 retired, and it would
      make renaming a scenario silently repoint its check. The runner reads the tags the pass hands it,
      which is the same document the credit reader reads and the same tag it reads there.

      THE FAILURE NAMES THE COMMAND AND QUOTES WHAT IT SAID. A fitness scenario that reds is a
      violation somebody has to go and fix, and a bare exit code sends them to work out which of a
      target's rows spoke before they can begin. So the message carries the command verbatim, the exit
      code it answered with, and what it printed — and where it printed nothing, says that too, because
      a silent non-zero exit is a fault report of its own.

      A SCENARIO NO CONFIGURED ROW NAMES FAILS HERE, AND THAT IS THIS SCENARIO'S OWN RULING. Such a
      scenario has said which axis it is on and then said nothing about what it asserts, so there is no
      command to run and nothing was examined. Passing it would put a scenario in the report that says
      the check ran when no check ran at all — the enumeration this axis exists to gain, telling the
      first lie it is capable of. The ledger says the same thing from the other side (@SCN-LNT-020
      raises no Evidence Obligation and reports the scenario as one no row names), and the two are
      deliberately not one mechanism: the run reds where the person is, and the reconciliation reds
      where the row is missing.

      ONE STEP DEFINITION, HOWEVER MANY CHECKS CONVERT. The step text names no characteristic and no
      command, so every converted static check in every target matches this one sentence and the count
      stays at one. The measured case adds exactly one more, because reading a number off stdout and
      posting it is a different assertion over different evidence — and that is the whole of the
      growth, whatever a target's manifest grows to.

      Given a target's configured rows name a command for five of the six fitness scenarios its corpus carries, and none for the sixth
      And every one of those rows but the fourth also names the code by which its command says it examined nothing
      And those commands are, in order, one that finds nothing, one that finds a violation it prints, one that says it examined nothing, another saying it examined nothing in exactly the same words, and one that is itself broken
      When each of the six scenarios runs under the fitness pass
      Then the first passes, the second fails naming the command that spoke and quoting what it printed, the third neither passes nor fails, the fourth fails although its command said what the third's said because its own row names no such code, the fifth fails because a check that broke is not one that examined nothing, and the sixth fails saying no configured row names it

    @integration @SCN-LNT-024
    Scenario: a measured row's command prints its number on stdout and the step definition posts it citing the scenario's own @SCN

      THE NUMBER IS THE EVIDENCE, WHICH IS WHY THIS IS A SECOND STEP DEFINITION AND NOT AN ARM OF THE
      FIRST. The static half runs a command and reads an exit code; this half runs a command and reads
      a NUMBER off what it printed, then posts that number as a measurement. Two assertions over two
      kinds of evidence — so two step definitions, and exactly two however many checks convert, because
      everything that varies between two measured checks is in the configured row.

      THE NUMBER ARRIVES ON THE COMMAND'S OWN OUTPUT AND IS THE WHOLE OF WHAT IT PRINTS THERE. Anything
      the command wants to say goes to its error stream instead. That contract was chosen over naming
      an artefact path in the row because it needs no fourth field and no file grammar: the row stays
      the three things a check says about itself plus a bar. A tool that prints other things gets a
      wrapper, which is what every measured producer in this repository already is, so the wrapper is a
      cost the target has already paid rather than one this model introduces.

      THE CREDIT CITES THE SCENARIO'S OWN @SCN AND THE CHARACTERISTIC ITS ROW NAMES. Both terms are
      already in hand — the tag line the pass is running, and the row keyed by it — so nothing is
      resolved, no registry is consulted, and the measurement arrives citing rather than being
      attributed afterwards. The characteristic is read through the SAME reading of the row the
      obligation side reads it through, so the debit and the credit name one word rather than two that
      have to agree.

      IT POSTS BESIDE WHAT THE RUN HAS ALREADY MEASURED, NEVER OVER IT. A run has as many measurements
      as it has measured checks and they all answer through one artefact, so this reads what is there
      and adds its own row keyed by both terms of its address. Writing over the artefact would leave
      only the last row and every earlier bar reconciling as a check that never ran.

      THE BAR NEVER ENTERS HERE, AND THAT IS THE SAME RULE THE WRAPPERS ALREADY KEEP. One bar per
      characteristic, held by the ledger, never by the runner that produced the number — a step
      definition that compared the number itself would be grading its own homework, and the ledger
      would then transcribe a verdict rather than reconcile one. So a measured scenario passes whenever
      its command yielded a number, and whether that number clears its bar is the ledger's sentence.

      A COMMAND THAT PRINTED NO USABLE NUMBER FAILS THE SCENARIO AND POSTS NOTHING. Both halves are
      said because either alone would be the quiet failure: a scenario that passed having posted
      nothing would leave its row reading missing with nothing red anywhere, and a row posted from
      unreadable output would be a number nobody measured. Nothing printed, prose printed, and a number
      the measurement reader would refuse are one answer here — the command did not honour the contract
      — and the row then reads missing for the loud reason rather than the silent one.

      Given a target's configured rows name a measured fitness check for each of three of its scenarios, and this run has already measured something else
      And the first of those commands prints a number, the second prints prose, and the third prints nothing at all
      When each of those three scenarios runs under the fitness pass
      Then the first posts its number citing its own @SCN and the characteristic its row names, beside the measurement already there, and the other two fail with nothing posted for either

    @integration @SCN-LNT-025
    Scenario: a row that spends the ending of a clean run, or of a run that found something, on "I examined nothing" is refused when the target's rows are read

      TWO ENDINGS ARE THE PROTOCOL'S OWN AND NO ROW MAY SPEND THEM ON THE THIRD ANSWER. A row naming
      the ending a clean run has would report a check that examined nothing on exactly the runs where
      that check worked, so a check that passed would stop being read as one that passed. A row naming
      the ending an ordinary violation has would turn every finding into a check that examined nothing
      — a red arriving as a non-failure, at whatever scale that check runs, on the one ending the whole
      of the tooling world agrees means `I found something`. Both are the silence fault this repository
      exists to name, arriving through its own configuration.

      AT THE READ, AND THAT IS THE WHOLE OF THIS SCENARIO. A refusal that waited until a command ended
      that way would fire only on the run that took the bad path — and for the row naming a violation's
      ending, the bad path IS the run where a real finding was made, which is exactly the run whose
      failure it would swallow. A validation that fires only when the bad path is taken is a validation
      that hides the bad path. So the row is refused when the target's rows are read, before anything
      has been run, and the refusal names the row it is about and the value that row carries: a message
      saying only that the configuration is wrong sends the reader hunting through thirteen rows.

      AND NOTHING ELSE IS REFUSED, INCLUDING THE ENDINGS THIS PRODUCT ITSELF SPENDS. `balance` answers
      one way for a usage fault and another for an unsound run, and a row naming either of those is
      still read as written. The field says what THAT command means by an ending, which is the row
      author's sentence to write rather than the runner's to have opinions about — the whole of the
      3F-3170 repair. The two refusals are refusals against the PROTOCOL'S OWN fixed points, a pass and
      a violation, and not against any tool's taxonomy; a later reader tidying them into a list of
      permitted endings would be reversing that ruling by accident.

      A REFUSED ROW HAS NOT BEEN RUN, AND THE PLANT SAYS SO RATHER THAN THE PROSE. Each of the four
      rows below names a command that leaves a trace behind it whenever it runs. Neither refused row
      leaves one, and the accepted row leaves its own — so the absence is read against a trace that is
      shown to arrive, rather than against a mechanism that might never have worked at all.

      Given four rows, each naming a command that leaves a trace behind it whenever it runs
      And the first names, as the ending by which its command says it examined nothing, the ending of a clean run; the second names the ending of a run that found something; the third names an ending that is neither; and the fourth names no ending at all
      When each of those rows is read on its own
      Then the first two are refused, each refusal naming the row it is about and the value that row carries, and neither command has left the trace it leaves whenever it runs
      And the third and fourth are read as written, and the third's command then runs and leaves that same trace

  Rule: a fitness credit says the check RAN, and a check that did not run is broken evidence rather than an absent one

    THE CREDIT IS ABOUT THE WIRING AND THE EXIT CODE IS ABOUT THE FINDINGS, AND BOTH HALVES STAY
    TRUE. What was wrong was reading `skipped` as a way of having run. A check that found violations
    reds the run through the runner's exit code and its row says the check ran; a check that never
    ran has no finding to carry and no exit code to carry it, so nothing anywhere in the chain
    disagrees with its credit. Cucumber exits 0 for a skipped scenario and a skipped scenario still
    appears in the report — so the credit posted, the row read satisfied, and the run was green over
    a check that examined nothing.

    TWO FACTS FROM TWO PLACES, WHICH IS WHY A HOOK CANNOT FORGE IT. The step status comes from the
    report; the ending a row names comes from the target's manifest. A hook, a tag filter or a lost
    `require` can make the report say `skipped`, and none of them can reach the manifest to make a
    row name an ending. So whether a skip is one the check asked for is settled by a checked-in
    sentence about that check, in the same file as its command.

    THE TWO KINDS OF ROW WERE NEVER EQUALLY EXPOSED, AND THE REASON IS STRUCTURAL RATHER THAN LUCK.
    A MEASURED row's credit is its NUMBER, written from inside the step body, so it needs an
    artefact the pass has to actively produce — and a step that never runs produces none. It fails
    closed with no help from anything. A STATIC row's credit is the scenario's APPEARANCE in the
    report, and a skipped scenario appears: one fact, and a skip supplies it for free. So one hook
    over the whole axis leaves every measured row missing and every static row satisfied. What this
    Rule does is give the static row its SECOND fact; the measured side needs no repair, for the
    same reason it already catches that hook by itself.

    `broken` IS CANON'S OWN WORD FOR IT AND NOTHING HERE IS NEW. It has meant a proof that never ran
    since @SCN-LDG-017 and @SCN-LDG-019: it posts to the suspense row carrying its where-to-fix and
    its what-broke and NO Evidence Observation, so the Evidence Obligation it cites reconciles
    `missing` by absence, and it stamps the run unsound. The verdict is the point rather than a side
    effect — a run that disagrees with itself is one thing, and a run over checks that did not run
    is another. A `missing` row alone would also have sent the reader the wrong remedy, write the
    check rather than fix your hook, which is the misdirection @SCN-LDG-019 named when it stopped
    dropping ambiguous steps as inconclusive.

    @unit @integration @SCN-LNT-026
    Scenario: a fitness scenario the pass reported as skipped credits its row only where that row names the ending its command says it examined nothing with — every other skip is broken evidence

      THE DISCRIMINATOR IS THE ASSERTION, WHICH IS WHY BOTH ARMS ARE READ FROM ONE REPORT. The two
      scenarios below are reported identically and their rows differ in exactly one thing — whether
      the row names an ending. Taken from two reports the pair could agree by accident: a reading
      that credited neither and a reading that credited both would each have to be caught by
      comparing two runs, when the whole claim is that one run tells them apart.

      THE DEFAULT IS `broken`, NOT THE CREDIT, so the arms are written the other way up from the
      obvious one. The credit is reached by the two readings that say the check ran — every step
      passed, or a step failed — and by the skip a row asked for; every other reading falls through.
      A status this reader cannot vouch for is a check whose running it cannot vouch for, so a
      status nobody anticipated reds rather than credits. That is the safe direction on an axis
      whose whole subject is a green that means nothing.

      THE ROW THAT NAMED ITS ENDING KEEPS TODAY'S READING, AND THAT IS NOT AN EXEMPTION CARVED FOR
      IT. The check said so about itself, in its own row, beside its own command, so its skip is the
      answer it asked to be able to give (@SCN-LNT-023) rather than something that happened to it.
      The residual is said rather than hidden: such a row can still be skipped by a hook and will
      still be credited, because the report cannot tell those two skips apart. It is bounded to the
      rows that asked.

      Given a target's configured rows name a static fitness check for each of the two scenarios its corpus carries, and only the first names the ending its command says it examined nothing with
      And its fitness pass reported both as skipped
      When that target's evidence is reconciled with what its fitness pass reported
      Then the first row is credited and balances, and the second is credited by nothing, its Evidence Obligation reads missing, and the run is unsound

    @unit @integration @SCN-LNT-027
    Scenario: a configured row whose scenario the fitness report it was handed never carried is broken evidence, and a run handed no report at all is unchanged

      THE ROWS ARE THE SIDE THE REPORT CANNOT ERASE, AND THAT IS THE WHOLE OF THIS RULE'S REACH.
      A row is read from the target's manifest and its enumeration from the pass's report, so
      emptying either leaves the other standing. Every other reading on this axis loses its own
      subject the moment the corpus goes — the Evidence Obligations travel with the scenarios and
      the credits travel with the pass, both sides cancel, and a run over nothing balances at zero.

      BOTH READINGS ARE TAKEN FROM ONE TARGET BECAUSE THEY ARE ONE CLAIM. Handed a report that
      omits a row, the run is unsound; handed no report at all, it reconciles exactly as it did
      before. Split across two fixtures the pair could agree by accident, which is how one `??`
      came to flatten the two facts into one and stay that way.

      A REPORT HANDED OVER CARRYING NOTHING AND NO REPORT AT ALL ARE DIFFERENT FACTS. The first is
      a pass that ran and did not carry this check. The second is a target that converted nothing,
      or a pass nobody ran — and calling that target's set-up broken over a file it has no reason
      to own is the fault the self-reconciliation gate already refuses one level up.

      EVERY CONFIGURED ROW IS IN SCOPE, MEASURED AND STATIC ALIKE. A measured row's CREDIT is its
      number (@SCN-LNT-022), and its ENUMERATION is still its scenario appearing in the report. So
      a number arriving for a row the pass never enumerated is a number from a route that
      enumerates nothing, which is the reading this axis exists to refuse.

      Given a target's configured rows name a static fitness check for each of two scenarios, and its corpus carries only the first
      When that target's evidence is reconciled with a fitness pass report carrying only that first scenario
      Then the row whose scenario the report never carried is broken evidence naming it, and the run is unsound
      And the same target reconciled with no fitness pass report at all raises nothing broken — the scenario its corpus carries reconciles missing, and the run is merely out of balance
