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
  once allocated, is stable forever: it survives a rename and is never reused — a rule this
  repository now keeps by hand and nothing enforces, the registry table that reserved each
  retired code having left with `lint:feature-codes` at 3F-3313. The name it was allocated
  under — the retired `@lint=<handle>` form, where a scenario named a runnable script and the
  run was matched back to it BY NAME — is the thing this feature retired, so the FILE took
  the right name (3F-2592) and the code stayed put. `@lint` itself survives here as ONE bare
  check among many: the style-lint one, a flat peer of `@complexity` and `@typecheck`
  (@SCN-LNT-010).

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
  (3F-2351). AND lint:feature-codes IS NOW ONE OF THOSE FIXTURE HANDLES (3F-3313). It was this
  repository's own check, and what it owed was raised where it belonged — its row of
  specController.fitnessChecks, under the code SCN-FIT-007 in features/fitness-checks.feature
  (3F-3165), which sat stepless at the foot of this file until then under a code of this
  feature's own. The rules it carried ship from `spec-controller tags` now, so the row, the
  script and the scenario left together and the handle survives here as a step-definition
  constant: a name no script in this repository answers to, and none may again, for exactly
  the reason the three above must never exist.

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
      only the tag was. Nothing raised is a corpus fault the tag check catches (`spec-controller
      tags` reds an unrecognised tag once its lint= clause goes), not a permanent red on the
      books.

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

  Rule: a check that did not run is broken evidence rather than an absent one

    `broken` IS CANON'S OWN WORD FOR IT AND NOTHING HERE IS NEW. It has meant a proof that never ran
    since @SCN-LDG-017 and @SCN-LDG-019: it posts to the suspense row carrying its where-to-fix and
    its what-broke and NO Evidence Observation, so the Evidence Obligation it cites reconciles
    `missing` by absence, and it stamps the run unsound. The verdict is the point rather than a side
    effect — a run that disagrees with itself is one thing, and a run over checks that did not run
    is another. A `missing` row alone would also have sent the reader the wrong remedy, write the
    check rather than fix your hook, which is the misdirection @SCN-LDG-019 named when it stopped
    dropping ambiguous steps as inconclusive.

    @unit @integration @SCN-LNT-027
    Scenario: a configured row whose step the CI run's record it was handed never carried is broken evidence, and a run handed no record at all is unchanged

      THE ROWS ARE THE SIDE THE RECORD CANNOT ERASE, AND THAT IS THE WHOLE OF THIS RULE'S REACH.
      A row is read from the target's manifest and its enumeration from the run's own record, so
      emptying either leaves the other standing. Every other reading on this axis loses its own
      subject the moment the corpus goes — the Evidence Obligations travel with the scenarios and
      the credits travel with the steps that ran, both sides cancel, and a run over nothing
      balances at zero.

      BOTH READINGS ARE TAKEN FROM ONE TARGET BECAUSE THEY ARE ONE CLAIM. Handed a record that
      omits a row, the run is unsound; handed no record at all, it reconciles exactly as it did
      before. Split across two fixtures the pair could agree by accident, and one default is all
      that separates them: a reader taking no record for a record carrying nothing would call
      every configured row broken on the first target whose pipeline dumps none.

      A RECORD HANDED OVER CARRYING NOTHING AND NO RECORD AT ALL ARE DIFFERENT FACTS. The first is
      a run that happened and named not one of these steps. The second is a target whose pipeline
      writes no record, or a run nobody recorded — and calling that target's set-up broken over a
      file it has no reason to own is the fault the self-reconciliation gate already refuses one
      level up.

      EVERY CONFIGURED ROW IS IN SCOPE, MEASURED AND STATIC ALIKE. A measured row's CREDIT is its
      number (@SCN-LNT-022) and its ENUMERATION is its own step in the record, the step whose
      command wrote that number down (@SCN-LNT-024). So a number arriving for a row the run
      recorded no step for is a number from a route that enumerates nothing, which is the reading
      this axis exists to refuse.

      Given a target's configured rows name a static fitness check for each of two scenarios, and its corpus carries only the first
      When that target's evidence is reconciled with a CI run record carrying a step for that first row alone
      Then the row the record carried no step for is broken evidence naming it, and the run is unsound
      And the same target reconciled with no CI run record at all raises nothing broken — the scenario its corpus carries reconciles missing, and the run is merely out of balance

    @unit @integration @SCN-LNT-026
    Scenario: a check step's outcome credits its row only where it says what the check did, and every other reading is broken evidence rather than a credit

      THE READINGS THAT CREDIT ARE THE ONES THAT SAY WHAT THE CHECK DID, and there are two. A step
      that succeeded ran and found nothing; a step that failed ran and found something. Each of
      those is a fact about a check, and every other reading is a fact about a pipeline.

      THERE IS NO THIRD, AND A ROW CANNOT BUY ONE. A row could once ask to be credited for a skip by
      naming the ending its command says it examined nothing with — but a command that examines
      nothing still RUNS and still ENDS, so its step reads success or failure and is never skipped.
      A step is skipped when a condition went false, when the job was cancelled, or when somebody
      moved it. The declaration could only be read for whether it was named, never checked against
      anything, so it forgave every skip: `if: false` beside it read satisfied for ever. The field
      is gone rather than guarded (3F-3252).

      THE SECOND OF THEM STOPPED BEING A BARE CREDIT WHEN THE THIRD THING CARRYING THE VERDICT WENT.
      While a pass ran the checks, a check that found violations reddened the run through the
      runner's exit code and its credit only had to say the check ran — so passed and failed were
      honestly ONE answer, and this scenario's own text used to say so. A CI step's exit code reaches
      this ledger nowhere, so the failed step's credit carries what it found and its row reds
      (@SCN-LNT-028) rather than balancing beside the row whose check passed.

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

      Given a target's configured rows name a static fitness check for each of the four scenarios its corpus carries
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

    AND THE SILENCE IS THE OTHER HALF OF THE SAME CLAIM. A pipeline checks out a tree, sets up a
    toolchain, installs dependencies and builds, and none of those is a quality check. A report
    naming them would drown the sentence it exists to say, so what discriminates is the check
    heuristic — the scripts a manifest holds under a guard prefix or names as static checks — and a
    step that heuristic does not reach is reported nowhere at all.

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
      Then every check the pipeline ran is on the one suspense row citing no scenario, and the steps that are not checks are reported nowhere at all

  Rule: a running check's citation is the code its own CI step carries, resolved against the configured row that code names

    THE ROW SUPPLIES THE CHARACTERISTIC AND THE STEP SUPPLIES THE CODE, WHICH IS WHY NEITHER HALF
    IS TAKEN OFF THE SCRIPT'S NAME. A CI step can state which row its check answers and nothing
    else: an id is a code, never a characteristic, and reading a characteristic off the handle that
    ran would be the name-match this axis retired, in a new spelling. So the code is read from the
    step and the characteristic from the row that code names — two facts from two places — and a
    code no configured row answers reaches neither.

    A STEP CARRYING NO CODE STILL CITES NOTHING, and that is the state above this one rather than a
    gap in it. A consumer who has annotated nothing runs checks that post to suspense and answer no
    Evidence Obligation, which is the first useful sentence this axis says to a pipeline nobody has
    specified. This rule is what a consumer's annotation BUYS; it does not narrow what the
    unannotated pipeline reports.

    @unit @integration @SCN-LNT-031
    Scenario: a check step whose id: names a configured row supplies that row's citation, so an annotated pipeline is not read as unannotated

      BOTH CHECKS ARE READ FROM ONE TARGET BECAUSE THEY ARE ONE CLAIM. The two steps below run two
      scripts of one manifest, discovered by one prefix, and differ in exactly one thing — whether
      the step states the code of the row it runs. Taken from two targets the pair could agree by
      accident: a reader citing nothing and a reader citing everything would each need a second run
      to catch, when the whole claim is that ONE run tells them apart.

      THE ANNOTATED HALF IS THE ONE THAT WAS UNREACHABLE. The walk carries the step's code and the
      observer reads it, and between them stood a composition that passed no seam at all — so every
      discovered check on the live path cited nothing however carefully its step was annotated, and
      a fully annotated pipeline reported as a fully unannotated one. That is invisible from either
      end alone, which is why the assertion is over the reconciled ledger rather than over a reader.

      Given a target whose CI runs a check for each of the two static rows its manifest configures
      And only the first check's step states the code of the row it runs
      When that target's evidence is reconciled from its manifest, its corpus and its workflow
      Then the first check's run credits the row its step names and that row balances, and the second run cites no scenario

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
      than left to the walk that produces it. `abortsJob` has been read off both carriers correctly
      since 3F-3042, and every consumer it ever reached was under `tests/` — this repository's own
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
    Scenario: the static-check census counts only the checks the job's verdict depends on, on both of its counts

      THE TWO COUNTS ARE ONE SENTENCE, AND WHAT A READER TAKES FROM IT IS THE NUMBER NEITHER OF
      THEM PRINTS. The census says how many static checks run and how many of those nothing names;
      subtract and you have the checks that run AND are named, which is the figure a consumer reads
      to learn how much of their pipeline is a gate somebody owns. Move one count's membership rule
      and leave the other's, and that figure is wrong — undercounted here, and below nil on a
      pipeline carrying more severed uncited checks than enforced ones.

      SO THE RULE ABOVE IS NOT FINISHED AT THE ROW. Reading the severance on the named side alone
      repairs one number by breaking another: a severed check nobody cites leaves the running count
      and stays in the uncited one, and the subtraction then reports fewer named checks than the
      report's own rows carry. Both counts are folded from the same posted credits, so both take
      the same membership rule or the fold contradicts itself.

      AND IT IS A CONSISTENCY THE CENSUS ALREADY KEEPS, rather than a new one. The running count has
      always excluded the unwired watermelon — a check that exists and enforces nothing is not
      protection, so it is not counted as protection. A check whose red its job swallows is that
      same claim reached through a different document, and counting it inflates the one line a
      consumer reads for how much protection they have.

      Given a target running two static checks no scenario cites, one of them behind continue-on-error
      When that target's census is taken from its manifest, its corpus and its workflow
      Then the census reports one static check run and one uncited static check, so the named count it implies is nil

  Rule: a check step's outcome in the CI run's record is the fitness credit

    THE RECORD IS A SECOND DOCUMENT AND A SECOND QUESTION, which is why it is read by a reader of
    its own rather than folded into the one above it. The workflow FILE says a check is wired in
    and which row its step cites; the RUN's record says what that step did on this run. One is a
    fact about a repository and the other a fact about an afternoon, and a reader handed only the
    first can say a check is wired and nothing at all about whether it held.

    ONE OBLIGATION, ONE CREDIT, AND THE ROW'S SHAPE DECIDES WHETHER THIS READER RAISES IT. A
    static row's credit is its own step's outcome in the record — the check ran, in the consumer's
    own checkout, and here is what it found. A measured row's credit is its NUMBER, and this reader
    raises no second credit beside it: two credits answering one Evidence Obligation is the double
    count this Rule exists to foreclose.

    THE VERDICT NOW HAS TO TRAVEL, BECAUSE THE THIRD THING CARRYING IT HAS GONE. While a pass ran
    the checks, a check that found violations reddened the run through the runner's exit code and
    its enumeration still said the check ran — so passed and failed were honestly one answer to the
    one question that reader asked. A CI step's exit code reaches nothing here: what crosses is a
    status field. So a reader that went on collapsing the two would be green over every check that
    ran and found something, which is this axis's own headline fault arriving by the front door.

    @unit @integration @SCN-LNT-021
    Scenario: a static check's step the run's record says succeeded credits its own row, citing its own @SCN

      THE CREDIT ARRIVES ALREADY CITING, so there is nothing left to resolve. The step's `id:` IS
      the code of the row that step answers, and the row keyed by that code carries the
      characteristic — two terms from two places, both read off what was observed. No check registry
      is consulted and no corpus lookup stands behind it: the two hops a DISCOVERED check needs are
      the two this route does not have.

      AND THE TWO FACTS SUCH A CREDIT CARRIES ARE OBSERVED RATHER THAN INFERRED. On the discovered
      route the check EXISTS because a manifest holds a script by that name, and it ran over the real
      tree because a workflow step invokes that script — a file MENTIONING a name, twice. Here the
      record says the step ran, and it ran in the consumer's own checkout over that checkout's own
      tree. Both are facts about the run itself, which is strictly stronger than a file naming a
      command.

      EACH ROW IS CREDITED BY ITS OWN STEP, WHICH IS WHY TWO ROWS ARE READ FROM ONE RECORD. A reader
      posting one entry's credit to every configured row, and a reader crossing the two, both leave
      every row balanced and say so with the same verdict — so what discriminates is the
      characteristic each row was credited FOR, asserted per row rather than counted.

      AND THE STEPS THAT ARE NOT CHECKS ARE SILENT. The record also holds the step that wrote it, and
      no configured row answers that id, so nothing anywhere on the ledger is about it. A pipeline
      checks out a tree and sets up a toolchain too, and a report naming those would drown the
      sentence it exists to say.

      Given a target whose configured rows name a static fitness check for each of the two scenarios its corpus carries, and no check registry naming either
      And its CI run's record says both of those checks' steps succeeded, beside the step that wrote the record
      When that target's evidence is reconciled with the record its own CI run wrote
      Then each row is credited for the characteristic its own row names, both Evidence Obligations read satisfied, and the run balances

    @unit @integration @SCN-LNT-022
    Scenario: a measured check's step in the CI run's record raises no credit, because its number is the credit

      ONE OBLIGATION, ONE CREDIT, AND THE ROW'S SHAPE SAYS WHICH STREAM CARRIES IT. A measured
      converted check raises one Evidence Obligation and its evidence is a NUMBER, read from the
      measurement artefact by the reader that already exists. A credit raised beside that number
      would be a second credit answering one Evidence Obligation, and it would answer nothing: the
      comparison arm reads measurements only, so the extra credit lands on the row naming a
      characteristic nothing on that row can settle it against, and takes the run out of balance.

      SO THIS READER SKIPS AN ENTRY WHOSE CONFIGURED ROW CARRIES A BAR, and it asks that question
      through the same predicate the obligation side asks it through. The two readings then agree by
      construction rather than by diligence: one fact, one spelling, or this is the shape where a
      debit and a credit grow separate opinions of whether a row is measured — and the row whose bar
      nothing could read is exactly where they would first differ.

      AND A STEP'S OUTCOME COULD NOT HAVE CARRIED THE NUMBER ANYWAY, which is why this seam is a
      split rather than a suppression. What crosses the record is a status — the step ran and found
      nothing, or the step ran and found something. A measured row is owed a value, and no status
      spells one; a reader crediting such a row off an outcome would be answering "how much" with
      "it ran", which is this axis's own headline fault wearing a number's clothes.

      NO SECOND CREDIT ROUTE IS INVENTED HERE. The ledger has carried two fitness observation shapes
      since @SCN-CIP-003 — a static fact about the tree, and a measurement — and this only says
      which of the two a converted row uses. What is new is that the choice is readable from one
      place rather than reached separately by each side that makes it.

      AND NOTHING IS LOST WITH THE ENTRY THIS READER PASSES OVER, which is the half that reads wrong
      unless the sentence is finished. The whole of what a measured row's step outcome could say is
      that the command ran; the number says that and the value both, because a number cannot arrive
      from a step that never ran. Two questions and two mechanisms, exactly as on the static route —
      only here one answer settles both.

      Given a target's configured rows name a static fitness check for one of its two scenarios and a measured one, holding a floor, for the other
      And its CI run's record says both of those checks' steps succeeded, and its measurement artefact holds a number for the measured one
      When that target's evidence is reconciled with the record its own CI run wrote and with what it measured
      Then the static scenario's row is credited off the record and the measured one's row off its number alone, each row carrying one credit and both balanced

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
      take is a claim of its own with its own scenario (3F-3264). Settling both from one fixture
      would let a reader that took the wrong field pass this arm on the strength of the right word,
      and a reader that posted the wrong word pass that one on the strength of the right field.
      This scenario settles the WORD, over a step whose failure nothing laundered.

      WHAT MAKES "WHATEVER THE JOB CONCLUDED" AN ASSERTION AND NOT A FLOURISH. No job-level verdict
      is in the record or reaches the ledger, and the record handed over here ends on a step that
      succeeded — so a reader summarising the run rather than reading the row's own step has a green
      to reach for. The row reds off its own step alone.

      Given a target whose configured row names a static fitness check for the scenario its corpus carries
      And its CI run's record says that check's step failed, on a record whose remaining step succeeded
      When that target's evidence is reconciled with what its CI run recorded
      Then that row's Evidence Obligation reads failing, carrying the observation of the step that failed it, and the run is out of balance rather than unsound

    @unit @integration @SCN-LNT-030
    Scenario: the reader takes the step's outcome, so a red the job swallowed still reds its row

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
      `@SCN-LNT-028` holds its two results in agreement, so a reader taking either one passes there;
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

      Given a target whose configured row names a static fitness check for the scenario its corpus carries, and whose CI lets that check's step red without failing the job
      And its CI run's record says that step failed, while the job it sat in was told it succeeded
      When that target's evidence is reconciled with the record that run wrote about itself
      Then that row's Evidence Obligation reads failing off what the step did, and nothing is read off what the job was told

  Rule: a measured row's credit is the number its own command wrote into the run's record

    THE NUMBER ARRIVES IN A RECORD, WHICH IS THE ONE THING A STEP'S ENDING COULD NEVER CARRY. A
    measured row's command writes its measurement into the run's own record, and every measured row
    of that run writes into the same one. No named artefact path and no second I/O contract in the
    row — the row stays the three things a check says about itself plus a bar, and a tool that
    writes nowhere gets a wrapper, which is what every measured producer already is.

    AND NOTHING THIS PRODUCT SHIPS RUNS THAT COMMAND. The consumer's pipeline runs it, as it ran it
    before any of this was configured, and the record is the whole of what crosses. A pass that
    spawned the row's command to take a number off what it printed would be this product executing
    the thing it exists to observe, and would make the credit depend on a runner nobody's pipeline
    has — which is the arrangement this Rule replaces rather than a shape it could be written in.

    THE BAR STAYS OUTSIDE EITHER WAY: one bar per characteristic, held by the ledger, never by
    whatever produced the number.

    @integration @SCN-LNT-024
    Scenario: a measured row's command writes its number into the run's record, and the credit is read straight out of that record

      THE NUMBER IS THE EVIDENCE AND THE COMMAND IS WHAT WRITES IT DOWN, which is the whole of the
      producing half. Nothing reads a stream, classifies what a command said, or decides on its
      behalf whether it measured anything: a row that was measured has a number in the record and a
      row that was not has none. The reading side then has one question to ask and one place to ask
      it, and the two terms of the citation are in the record already because whatever produced the
      number knew what it was measuring.

      IT WRITES BESIDE WHAT THE RUN HAS ALREADY MEASURED, NEVER OVER IT. A run has as many
      measurements as it has measured rows and they all answer through one record, so a producer
      reads what is there and adds its own row keyed by both terms of its address. Writing over the
      record would leave only the last row, and every earlier bar would reconcile as a check that
      never ran.

      A COMMAND THAT WROTE NO USABLE NUMBER CREDITS NOTHING, AND THE ROW SAYS SO LOUDLY. Nothing
      written and something written that no reader could take as a number are one answer here — the
      command did not honour the contract — and the row is then credited by nothing rather than by a
      number nobody measured. Both halves are said because either alone is the quiet failure: a row
      credited from an unreadable record would be evidence invented at the reader, and a run that
      passed having recorded nothing would leave that row reading missing with nothing red anywhere.

      THE BAR NEVER ENTERS HERE, AND THAT IS THE SAME RULE THE PRODUCERS ALREADY KEEP. One bar per
      characteristic, held by the ledger, never by whatever produced the number — a producer that
      compared its own number would be grading its own homework, and the ledger would then
      transcribe a verdict rather than reconcile one. So a measured row is answered whenever its
      command wrote a number, and whether that number clears its bar is the ledger's sentence.

      AND THE RECONCILIATION IS HANDED NO RUNNER'S REPORT AT ALL, which is what makes the claim
      legible rather than merely true. The record and the target's own corpus and manifest are the
      only things this run is given, so a credit reaching any of these four rows can only have come
      out of what the commands wrote — there is no second stream for one to arrive by, and a route
      that had quietly kept posting on the rows' behalf would have nowhere to post from.

      Given a target's configured rows name a measured fitness check for each of four of its scenarios, and an earlier step of this run has already written one of those numbers into the run's record
      And of the three commands still to run, the first writes its number into that record, the second writes nothing at all, and the third writes a row nothing could read as a number
      When each of those commands runs as its own step of that run, and that target's evidence is then reconciled with what the run measured
      Then the number written earlier still stands beside the one the first command wrote, each crediting its own row for the characteristic that row names, and the other two rows are credited by nothing
