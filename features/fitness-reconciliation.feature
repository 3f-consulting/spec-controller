@LNT
Feature: Reconcile every fitness function as a fitness scenario citing its own @SCN

  The FITNESS axis. Alongside the behavioural quality-checks (the unit / integration / e2e /
  performance tests, each an EXAMPLE with steps), a fitness scenario DECLARES one Evidence
  Obligation: a whole-system characteristic held against a threshold. In this repository the
  scenario carries `@fitness` and a freshly minted code, and which characteristic it is about and
  which bar it is held to are fields of its row in `specController.fitnessChecks`, read by the
  ledger.

  A FITNESS SCENARIO IS A DECLARED OBLIGATION RATHER THAN A TEST, AND NOTHING RUNS IT. It is
  authored like every other scenario in this corpus, steps and all, and what keeps it off the
  runners is its TAG rather than its shape. What a step may not do is GRADE THE RUN: "Then the
  check passes" would have one row raise the obligation and answer it — BOTH SIDES OF THE ENTRY,
  which is the one thing double entry cannot allow. A characteristic a scenario was written to hold
  is one it holds because the scenario says so, never because somebody gave it a runnable example.

  ONE POSTING RULE, over both axes, and the credit's citation is ONE HOP. The check's step in the
  CI config carries its row's @SCN as the step's `id:`; the run's own record says what that step
  did; `balance` reads the citation straight off it. Nothing is matched back by name and nothing is
  resolved through a second artefact, so there is no static-axis posting rule left to be special.

  THE COMPATIBILITY PATH, WHICH SEVERAL RULES BELOW ARE ABOUT. A target may instead register its
  checks under `specController.checkRegistry` and tag its scenarios with a BARE CHECK TAG, and the
  reader still honours it: a scenario carrying a registered bare check raises one fitness Evidence
  Obligation for that check. It is a SUPPORTED LEGACY READING rather than the current one — a real
  consumer reconciles through it today and stops when it migrates, at which point the reader's
  support for it goes in a MAJOR-version removal. Where a Rule below is about that reading, its own
  preamble says so.

  WHAT THE FILE IS CALLED, AND WHY THE CODE IS NOT. The feature code is @LNT because a code, once
  allocated, is stable forever: it survives a rename and is never reused — a rule this repository
  now keeps by hand and nothing enforces, the registry table that reserved each retired code having
  left with the check that read it. The name it was allocated under — the retired `@lint=<handle>`
  form, where a scenario named a runnable script and the run was matched back to it BY NAME — is
  the thing this feature retired, so the FILE took the right name and the code stayed put. `@lint`
  itself survives here as ONE bare check among many: the style-lint one, a flat peer of
  `@complexity` and `@typecheck`.

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
  which would take every obligation these scenarios name dark to silence one row each.
  AND lint:feature-codes IS ONE OF THOSE FIXTURE HANDLES. It was this repository's own check once;
  the rules it carried ship from `spec-controller tags` now, and the row, the script and the
  scenario left together. The handle survives here as a step-definition constant: a name no script
  in this repository answers to, and none may again, for exactly the reason the three above must
  never exist.

  WHICH TREE A FITNESS SCENARIO IS ABOUT IS THE GHERKIN'S TO SAY, AND THE STEP DEFINITION'S TO
  OBEY (ruled 2026-09-04). A fitness scenario names its subject in its own text — a PLANTED tree
  or THE REPOSITORY — and its step definition takes that subject rather than picking one for
  itself. @SCN-FIT-009 says THIS REPOSITORY and is answered over this repository; what would tell
  a planted-tree scenario apart from it is a sentence a reviewer reads anyway, not a path buried
  in a step definition. A step definition that runs its check over a fixture while its scenario
  says the repository is then wrong IN THE DIFF, against that sentence.

  THE PAIRING THIS PARAGRAPH USED TO DRAW HAS LOST ITS OTHER HALF, AND THE RULING HAS NOT MOVED.
  It read @SCN-ANM-001 (planted trees) against @SCN-FIT-009 (this repository); the first retired
  with its check at 3F-3288, so the planted side simply has no live example today. The rule is
  unchanged and is the reason the example is not replaced with an invented one: what a fitness
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
    when the registered bare check tag took over as the one way to declare a check; what this Rule
    holds is only that the retired spelling stays dead on every path a reader might be tempted to
    re-route it through, including one where the handle it names is itself a registered check's
    own script.

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

      THE FITNESS OBLIGATION COMES FROM THE ROW, the unit obligation from the tier tag — two
      readers, one scenario. Nothing here cites SCN-AAA-001 on the lint axis, so that obligation
      reconciles missing exactly as any obligation with no matching observation does (@SCN-LDG-028);
      what this scenario holds is not which outcome the fitness axis lands on but that it lands on
      one independently of the unit axis beside it.

      THE SHAPE RULE IS NOT THIS SCENARIO'S. Whether one scenario may carry a tier tag and a
      fitness tag together is @SCN-STG-005's question; the fixture below carries both because a
      TWO-AXIS row is what this reads. What is settled here is only that the reconciler answers
      each obligation a row raises on its own axis.

      Given a configured row names the scenario "SCN-AAA-001" as the fitness check "unwired-check"
      And that scenario also carries the unit tier tag
      And the unit test for that scenario passes
      When the configured fitness check and the unit result are observed and reconciled
      Then the scenario's fitness obligation reconciles missing, naming the check "unwired-check"
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

      THE TWO SOURCES CAN DISAGREE, which is what makes this a real fault rather than a
      hypothetical. A CI step's own code is checked against the configured rows alone — nothing
      asks the corpus anything at that seam — so a code that is a real row by that test can still
      name an @SCN no scenario carries: mistyped on the row, mistyped on the scenario, or the
      scenario renumbered, retired, or living in a feature file this run does not reconcile. The
      row and the corpus are two documents one consumer authors separately, and nothing keeps them
      in step — the same disagreement a runtime credit has always been able to carry between a
      test file's @SCN and the corpus, now reachable through a row's own code too.

      THE CREDIT IS NEVER DROPPED. Dropping it is the one outcome the double entry forbids: every
      Evidence Observation posts somewhere, never nowhere. So the row is INVENTED, the credit posts
      there carrying the check that ran, and the row is out-of-balance — nobody raised it, so nothing
      about it can balance. Naming the check is what makes the row actionable: without it a reader
      learns only that some run cited a scenario that is gone.

      Given a configured row names the scenario "SCN-AAA-001" as the fitness check "feature-codes"
      And a @fitness scenario in the corpus carries a different check entirely
      And a CI step names "lint:feature-codes" as answering the row "SCN-AAA-001"
      When the fitness check citing a configured row is observed and reconciled
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

    WHY IT WAS UNREACHABLE UNTIL THE MATCH COMPARED CHECK TAGS. While a fitness credit was matched to its obligation
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
    it is about, the characteristic it asserts, and the command that returns a violation.
    Nothing else is needed, because the command carries its own scope — `eslint src/` states
    which tree in the same string.

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

  Rule: a configured row the corpus carries no scenario for raises an Evidence Obligation nothing can observe

    THE MANIFEST IS A SIDE OF THE BOOKS TOO, AND UNTIL THIS RULE ONLY THE CORPUS WAS. Evidence
    Obligations travel with the scenarios, so a configured row the corpus carries no scenario for
    raised nothing whatever: it was not missing, not a phantom and not suspense, and a target
    carrying one reconciled BALANCED over a check it had declared and never specified.
    `double-entry-manifesto.md` names that shape in terms — a ledger catches a credit that never
    arrived and is blind to a debit that was never raised.

    IT IS @SCN-LNT-020'S MIRROR AND THE OTHER HALF OF ONE PUBLISHED SENTENCE. This product's own
    corpus promises both directions of the disagreement — a scenario whose code no row names
    reported as unconfigured, and a row whose scenario the corpus does not carry reported as an
    Evidence Obligation nothing observed. Only the first was ever performed.

    THE TWO DIRECTIONS EARN DIFFERENT RECORDS, AND THE ASYMMETRY IS THE FACTS' OWN RATHER THAN AN
    INCONSISTENCY. A `@fitness` scenario no row names has no characteristic, so there is nothing to
    put on the books and the census is where it is named. A row the corpus has no scenario for
    NAMES one, so there is a debit — which is why this direction is a ledger row and its mirror is
    a line of prose.

    @unit @integration @SCN-LNT-034
    Scenario: a configured row whose @SCN no scenario in the corpus carries raises an Evidence Obligation nothing observed

      THE DEBIT IS RAISED FROM THE ROW AND NO RUN INPUT DECIDES WHETHER IT EXISTS. The manifest and
      the corpus disagree whatever a run did, so the first reading is handed no CI run record at
      all — and the row is on the books anyway, out of balance on its own, at the characteristic the
      row names. Every other account of that target agrees, so the run fails for this row and for
      nothing else, which is the sharpest form the claim has.

      AND NO CREDIT CAN SETTLE IT, WHICH IS WHY THERE IS A SECOND READING. The row is not in the set
      the citation router posts against, so a run whose CI step states its code mints a PHANTOM row
      (@SCN-LNT-009) and the obligation stays missing beside it. The obvious implementation —
      synthesising a scenario for the row so the ordinary obligation path raises it — would put the
      row INTO that set, and a check declared, never specified, and cited by a run that executed
      something would then reconcile BALANCED. That is a worse false green than the one this Rule
      closes, and this arm is what holds it shut.

      BOTH READINGS ARE OF ONE TARGET, for @SCN-LNT-027's reason: split across two fixtures they
      could agree by accident about a manifest neither of them shares.

      Given a target's configured rows name a fitness check for two scenarios and its corpus carries a scenario for only the first
      When that target's evidence is reconciled with no CI run record at all
      Then the row the corpus carries no scenario for is on the books as an Evidence Obligation nothing observed, its row is out of balance, and the run fails
      And the same target reconciled with a CI step citing that row still does not balance it — the run's credit posts to a phantom row and the obligation stays missing

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

      Given a target's configured rows name a static fitness check for each of two scenarios, and its corpus carries only the first
      When that target's evidence is reconciled with a CI run record carrying a step for that first row alone
      Then the row the record carried no step for is broken evidence naming it, and the run is unsound
      And the same target reconciled with no CI run record at all raises nothing broken — the scenario its corpus carries reconciles missing, the row its corpus carries no scenario for is on the books as an Evidence Obligation nothing observed, and the run is merely out of balance

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

    AND KEEPING THE PLUMBING OFF THE BOOKS IS THE OTHER HALF OF THE SAME CLAIM. A pipeline checks
    out a tree, sets up a toolchain, installs dependencies and builds, and none of those is a
    quality check; a report banking them as checks would drown the sentence it exists to say. WHAT
    DISCRIMINATES IS THE CONSUMER'S OWN LIST, and since 3F-3343 nothing else does: the tool held a
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

    ONE OBLIGATION, ONE CREDIT. A row's credit is its own step's outcome in the record — the check
    ran, in the consumer's own checkout, and here is what it found.

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

  Rule: a configured row names no bar, and a bar a row still carries is named as a retired key

    A ROW IS ITS @SCN, ITS CHARACTERISTIC AND ITS COMMAND, and what answers it is its own step's
    outcome in the run's record. A number written on a row is a bar, and nothing reads a bar any
    more: the check's own exit code on its own step is the verdict (3F-3506).

    NAMED, NEVER DROPPED SILENTLY. A consumer who wrote a bar on a row while bars were read
    believes it still holds their check to that number. So the report names the bar, with the row
    it sits on, in the same retired-key account that names a retired top-level key
    (@SCN-USG-021, @SCN-USG-022) — one account, not a second mechanism. A bar naming a mutation
    gate is a value of atLeast, so the key it sits under is what names it.

    AND THE ROW IS CREDITED EXACTLY AS A ROW CARRYING NO BAR IS. Naming the bar changes nothing
    about what the row owes or what answers it; a reader that took the bar as grounds to drop the
    row, or to hold it out of balance, fails the second half of this scenario.

    @unit @integration @SCN-LNT-035
    Scenario: a configured row carrying atLeast or atMost is named on the report as carrying a retired key, and its step's outcome credits it as any row's is
      Given a target whose configured rows name a static fitness check for each of the two scenarios its corpus carries, one row carrying atMost and the other carrying an atLeast naming a mutation gate beside an atMost
      And its CI run's record says both of those checks' steps succeeded
      When that target's reconciliation report is rendered with the record its own CI run wrote
      Then the report names each bar a configured row carries as a retired key, with the row it sits on
      And each row is credited by its own step's outcome, both Evidence Obligations read satisfied, and the run balances
