@LNT
Feature: Reconcile every fitness function as a stepless fitness scenario citing its own @SCN

  The FITNESS axis. Alongside the behavioural quality-checks (the unit / integration /
  e2e / performance tests, each an EXAMPLE with steps), a STEPLESS scenario tagged with a
  REGISTERED bare check raises one fitness Evidence Obligation for that check — a
  whole-system characteristic held against a threshold, which has nothing to exemplify and
  so carries no steps.

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
  belongs: the stepless fitness scenario at the foot of this file.

  Rule: a stepless fitness scenario tagged with its bare check raises one fitness Evidence Obligation

    THE DEBIT SIDE OF THE ONE POSTING RULE. Under name-match the DEBIT cited: a scenario
    carried @lint=<handle> and the run was matched back to it by name, so an obligation could
    only be raised by naming a runnable script. That put one TECHNIQUE in front of a whole
    class of fitness functions — which is why complexity, typecheck and vocab all had to spell
    themselves lint:something to be seen at all. A bare check tag drops the technique — a bare
    tag @complexity is a flat peer of @unit exactly as @unit is a flat peer of @integration.
    There is no @behavioural=unit, so there is no @fitness=complexity (canon 2026-08-07, the
    bare-tags Correction).

    STEPLESS IS THE DISCRIMINATOR, AND IT IS LOAD-BEARING. A behavioural scenario is an
    EXAMPLE, so it carries steps; a fitness scenario is a whole-system characteristic held
    against a threshold and has nothing to exemplify, so it carries none. Reading a bare check
    tag off a STEPPED scenario would raise a fitness obligation on a behavioural row — which is
    name-match's own fault, a whole-system characteristic smeared across examples it was never
    about, reintroduced through a shorter tag. The tier floor's own reading of the shape belongs
    to @SCN-STG-005; what is settled here is only that the obligation follows it.

    A TAG IS A CHECK ONLY WHEN THE REGISTRY SAYS SO — the same registry the citation seam's
    first hop reads. Treating every unrecognised bare tag as a check would raise an obligation
    for @smoke, and a corpus cannot be asked to keep its own vocabulary straight by convention.
    The registry arrives as data, so a target that registers nothing raises no fitness
    obligations at all and the reading is inert until something supplies one.

    ONE OBLIGATION, NOT ONE PER MENTION. A scenario's effective tags are its own plus
    everything it inherits from its Rule and its Feature (@SCN-LDG-020), so one check can reach
    one scenario twice. It owes that check once.

    @unit @integration @SCN-LNT-006
    Scenario: a stepless scenario tagged with a bare fitness check raises one Evidence Obligation for that check
      Given "complexity" is a registered fitness check
      And a stepless scenario tagged with the bare fitness check "complexity"
      When the scenario corpus is read
      Then the scenario raises exactly one Evidence Obligation, naming the fitness check "complexity"

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
    Scenario: a fitness check wired into CI over the real source posts one observation citing its scenario and reconciles satisfied
      Given "lint:feature-codes" is registered as the fitness check "feature-codes"
      And a stepless fitness scenario carries the bare check "feature-codes"
      And a second scenario would have claimed the same run under name-match
      When the fitness checks wired into CI over the real source are observed and reconciled
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
      being hidden by the row holding some. That is the forcing function toward one fitness scenario per
      check: two scenarios cannot share one check without one of them reading missing.

      Given "lint:feature-codes" is registered as the fitness check "feature-codes"
      And a stepless fitness scenario carries the bare check "feature-codes"
      And a second stepless fitness scenario carries the same bare check "feature-codes"
      When the fitness checks wired into CI over the real source are observed and reconciled
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

      THE SHAPE RULE IS NOT THIS SCENARIO'S. Whether a stepped behavioural scenario may carry a
      fitness tag is @SCN-STG-005's question; the fixture below is stepless, because that is the
      shape a fitness obligation is raised from at all (@SCN-LNT-006). What is settled here is only
      that the reconciler answers each obligation a row raises on its own axis.

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
      When the fitness checks wired into CI over the real source are observed and reconciled
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

      Given a fitness scenario "SCN-FIT-001" raises the check "complexity" and no other
      And a run of the check "typecheck" cites "SCN-FIT-001"
      When that corpus and those runs are reconciled
      Then the row "SCN-FIT-001" holds a no-evidence-obligation item naming the check "typecheck"
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

      Given a fitness scenario "SCN-FIT-001" raises the check "complexity" and no other
      And the "complexity" run cites "SCN-FIT-001" and is wired into CI over the real source
      And a run of the check "typecheck" cites "SCN-FIT-001" but CI does not run it
      When that corpus and those runs are reconciled
      Then the row "SCN-FIT-001" is out-of-balance over the stray credit alone
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

    @unit @integration @SCN-LNT-010
    Scenario: a stepless scenario tagged bare @lint raises the style-lint Evidence Obligation
      Given "lint" is a registered fitness check alongside "complexity" and "typecheck"
      And a stepless scenario tagged with the bare fitness check "lint"
      When the scenario corpus is read
      Then the scenario raises exactly one Evidence Obligation, naming the fitness check "lint"

  Rule: this repository's own feature-code registry holds

    THE ONE CHECK THIS FILE OWNS, AND WHY IT LANDS HERE RATHER THAN IN A FILE OF ITS OWN.
    lint:feature-codes has no feature file of its own — it is the check that keeps the
    `@<FFF>` header codes unique and registered, machinery every other feature file depends
    on and none is about. The corpus already homed its obligation here, on @SCN-LNT-001's
    tag line, for the length of the retired tag form; @SCN-LNT-011 keeps that home and gives
    it the shape the one posting rule asks for. It is append-only allocation in this file,
    not a claim that the check is part of the fitness-reconciliation model.

    IT CARRIES NO STEPS, so it raises exactly one Evidence Obligation — the fitness one its
    bare `@feature-codes` tag names — and the CI run of lint:feature-codes settles it,
    resolved through this repository's own registry and then through this corpus.

    @feature-codes @SCN-LNT-011
    Scenario: every feature-code header in this corpus is unique and registered
