@STG
Feature: The tier-tag floor — every scenario names an evidence tier

  spec-controller reconciles on evidence tiers but did not require its OWN scenarios to
  name one — a tier-less scenario yields no evidence obligation and slips silently. This
  guard closes that (the cobbler's shoes): every scenario under features/ carrying an @SCN
  must name at least one tier tag, UNLESS it is PARKED — carrying one of the deferral tags
  the target itself configures (@SCN-STG-008). scnTags parity with an adopter's repository's
  guard:scn-tags. The guard is itself cited — it converted as @SCN-FIT-008 (3F-3165), so the
  scenario that carries it is authored in features/fitness-checks.feature beside the
  specController.fitnessChecks row naming `pnpm lint:scn-tags`, and the fitness pass running that
  command is what posts its credit. It used to be a stepless scenario at the foot of THIS file
  carrying a bare `@traceability` tag, settled by a CI step that had to be discovered and joined
  back to it. Either way spec-controller's own ledger reconciles it, which was always the point.

  What counts as a tier (load-bearing): @unit / @integration / @e2e / @performance, their
  pending variants (@unitpending / @integrationpending / etc. — a <tier>pending names the
  tier, deferred), AND @lint=<guard> — spec-controller names lint as @lint=<guard>, not
  bare @lint, so the guard accepts the =<guard> form. A bare-@lint-only match would
  false-flag every guard scenario (including this one) and red the real tree. Exempt: a
  PARKED scenario — one carrying any tag in the target's RESOLVED deferral set, which is the
  community starter set extended by the target's own config, so @wip still parks and so does
  whatever else the target configures (@SCN-STG-008). The guard itself names no community tag.

  Rule: a tier-less non-@wip @SCN scenario reds the scn-tags guard

    The lint:scn-tags guard fails (non-zero, naming each offender) if any scenario under
    features/ carries an @SCN but names no evidence tier and is not @wip, and passes over
    a tree where every @SCN scenario names a tier (or is @wip). @SCN-STG-001 itself
    carries @unit @integration, satisfying the floor it enforces.

    @integration @SCN-STG-001
    Scenario: the scn-tags guard flags a tier-less non-@wip scenario, exempts @wip, and passes a tiered tree
      Given the scn-tags guard
      When it runs over a features tree with a tier-less non-@wip scenario
      Then it fails, naming the offending scenario
      When it runs over a fully tiered tree where every @SCN scenario names a tier or is @wip
      Then it passes

  Rule: a tag outside the recognised grammar reds the tier-tag static check

    THE TYPO THAT READS AS A COMMUNITY TAG. The floor above asks one question —
    does the scenario NAME a tier? A mistyped tier tag is invisible to it:
    `@untit` is not a tier, so it contributes nothing, and the scenario is
    satisfied by the `@unit` beside it — or, when the typo IS the only tier-ish
    tag, slips the floor entirely and raises no Evidence Obligation at all.
    Nothing else catches it either: the vocabulary audit sees the token and asks
    the wrong question of it (is this word retired?), and in prose mode an unknown
    word does not flag, so the typo is silently green (3F-2313 posed this and
    deliberately left it).

    Whether a tag is legitimate is a GRAMMAR question about a closed set, and the
    set is already written down twice over — the tier tags this check owns, and
    the recognised community deferral tags the product itself honours. So the
    recognised grammar is DERIVED, never restated: the @SCN id, a tier tag, or a
    member of the resolved deferral set. Anything else is a tag that means nothing
    here, and it reds.

    NAMING WHAT WAS PROBABLY MEANT IS A COURTESY, NOT THE VERDICT. When the
    unrecognised tag is close to a tier the message says so; when it is not, it
    reds all the same. A guess that steers the fix is worth having; a guess that
    decides the outcome would make the gate only as good as its edit distance.

    @integration @SCN-STG-002
    Scenario: an unrecognised tag reds the check, naming it and the tier it resembles
      Given the scn-tags static check
      When it runs over a features tree whose @SCN scenario carries a mistyped tier tag
      Then it fails, naming the unrecognised tag and the tier it resembles

  Rule: a recognised community deferral tag is grammar, not a typo

    THE CARVE-OUT THAT KEEPS THE TEETH OFF THE PRODUCT'S OWN POLICY. Reding every
    tag outside the tier set would red `@skip` — a tag spec-controller itself
    recognises, honours as a deferral signal, and lets a target extend by config.
    A check that condemns what the product accepts is not stricter, it is wrong.

    So the recognised set is the resolved deferral set, and it arrives the way the
    ingest edge gets it: resolved at the CLI from the target's package.json and
    handed to the check. That is what makes "derived, not restated" true rather
    than aspirational — there is no second list here to fall behind the first.

    RECOGNISING A TAG IS ALSO PARKING IT (@SCN-STG-008, 3F-2655). This Rule once ended
    "recognising a tag is not excusing the floor — a `@skip` scenario naming no tier still
    reds, and `@wip` remains the only exemption", and that sentence was the defect rather
    than the discipline: the resolved set arrived here, answered the grammar question, and
    the floor below then asked a hard-coded `wip` instead. So a `@skip` scenario was
    recognised as a legitimate deferral and failed for the deferral it had legitimately
    named. One set, read twice — recognised as grammar, honoured as a skip.

    WHAT DOES NOT BLEED IS THE TYPO ARM, and that is the boundary the two questions keep.
    A parked scenario's tags are still read for well-formedness, because parking defers what
    a scenario OWES and what SHAPE it must have, never whether its tags are spelled right.
    And this set is precisely what lets this arm recognise the parking tag, so excusing the
    arm on a parked scenario would hide `@wip @untit` — a gate whose teeth come off by
    writing one more tag.

    @integration @SCN-STG-003
    Scenario: a recognised community deferral tag is not an unrecognised tag
      Given the scn-tags static check
      When it runs over a features tree whose tiered @SCN scenario also carries a recognised community deferral tag
      Then it passes

  Rule: a parked scenario is out of the tier floor's scope, and the parking set is the target's

    THE TAG THE GUARD DOES NOT OWN. `@wip` is a Cucumber convention, not spec-controller
    vocabulary, and a guard that bakes it in governs by a word it has no authority over: a
    project parking with `@skip` gets its deliberate deferral read as a fault, and one
    parking with `@parked` cannot be governed at all without renaming its corpus first.

    THE SET WAS ALREADY ARRIVING. The CLI has resolved the target's deferral set since the
    grammar Rule above (@SCN-STG-002) and handed it to this check, which read it for the
    GRAMMAR question and then asked the floor about a hard-coded `wip`. The config surface
    was not missing; it was half-consulted. One set, read once, answers both questions.

    PARKING IS A SKIP-SIGNAL, NOT A TIER (operator ruling, 3F-2655). A parked scenario is
    not asserting anything about evidence — it is out of scope until it is unparked, and the
    floor has nothing to say about it in the meantime.

    AND THE GUARD KEEPS NO DEFAULT OF ITS OWN. The set is INJECTED, defaulting to NONE, the
    way the check-tag set is and for the same reason: which words park is the target's
    answer, not this module's. The community default lives where the rest of the product's
    policy lives — the starter set in the application layer — so a target configuring
    nothing still parks with `@wip`, and this module still names no community tag at all.
    That is the difference between owning a policy and hard-coding someone else's.

    @integration @SCN-STG-008
    Scenario: the tier floor skips a parked scenario, and the parking set is the target's own
      Given the scn-tags static check
      When it runs over a target whose tier-less scenario carries a parking tag the target itself configured
      Then it passes
      When it runs over that same target with the parking tag removed
      Then it fails, naming the scenario that named no tier
      When it runs over a target configuring no parking tags whose tier-less scenario carries @wip
      Then it passes

  Rule: a group-prefixed quality-check tag is outside the grammar

    THE FLAT SET, AND WHAT THE FLOOR HAD TO LEARN TO ACCEPT IT. A fitness check is named by a
    BARE tag — complexity, typecheck, vocab — a flat peer of the behavioural tiers rather than a
    member of some group. There is no behavioural=unit, so there is no fitness=complexity (canon
    2026-08-07, the bare-tags Correction). The floor above knows four tier tags, their pending
    variants and the lint=<handle> form, and a fitness scenario carries none of them: once the
    technique leaves the tag, a stepless fitness scenario carries its bare check and nothing else.
    It must satisfy the floor on that alone, or every one of the twelve scenarios in
    features/fitness-checks.feature reds this check.

    THE REGISTERED TAG IS THE DISCRIMINATOR FOR THIS FLOOR, NOT THE SHAPE (3F-3126). A fitness
    scenario is a whole-system characteristic held against a threshold, and the bare check tag is
    the whole of that claim; whether the row was given steps says only how it was written. This
    preamble used to say the opposite — STEPLESS IS THE DISCRIMINATOR FOR THIS FLOOR, NOT THE TAG,
    on the reading that letting a STEPPED row ride a bare check tag would re-admit name-match's own
    fault in a shorter spelling. That reading is retired, not merely restated: steplessness was
    always a CORRELATE of having nothing to exemplify, never the thing itself, and 3F-3097 exists
    to convert fitness checks to real step definitions — so a floor keyed on the correlate reds the
    first conversion for a shape that is exactly what it asked the author to write.

    SO THE FLOOR AND THE OBLIGATION RULE ASK ONE QUESTION OF ONE SET, which is what the last
    paragraph of this preamble already required of them. Both read the union of the target's
    registered check tags and its measured ones, off its own manifest, and neither adds a condition
    of its own — so the floor admits exactly the scenarios the obligation rule raises against. The
    interim record that stood here is retired by that: it said this floor was DELIBERATELY THE
    STRICTER OF THE TWO until 3F-3126 (3F-3115), and that the surviving disagreement ran the other
    way and was fail-loud. There is no disagreement left to be loud about.

    REGISTERED, NOT INFERRED. Which bare tags name a check is the registry's answer, injected the
    way the deferral set is. Inferring it from shape instead would let a typo on a stepless
    scenario satisfy the floor while raising no obligation — precisely the silent slip this check
    exists to close.

    AND THE NEGATIVE HALF, WHERE THE HIERARCHY WOULD COME BACK. A tag that spells its group into
    itself — fitness=complexity — resembles no tier, so the near-miss courtesy has nothing to say
    about it and the author is told only that the tag means nothing here. Their intent is fully
    legible all the same: the group is the part that has to go, and what is left is the tag they
    wanted. So it reds, and the message names that bare tag.

    NO LIST OF GROUP NAMES, because there is nothing to list. A tag carrying a value whose key is
    not the lint=<handle> form this tree still writes has spelled a group into a tag, whatever the
    group is called, and the value is the bare tag it should have been. A set of permitted group
    words would be a second place to remember that the group lives in the model — and it would
    green the first group name nobody thought of.

    AND THE REGISTRY IS NOT THE ONLY PLACE A CHECK IS NAMED (@SCN-STG-009). A MEASURED check
    produces a number and is held against an authored ceiling; nothing invokes it, so it has no
    runnable script handle and can never appear in the registry at all. Where it IS named is the
    debit side — the target's thresholds. The obligation rule already reads both and raises
    against the union, so a floor reading the registry alone reds a stepless `@ci-run-time`
    scenario for naming no tier on the very tag its own obligation was raised from.

    SO THE TWO SETS ARE READ TOGETHER, at the one edge that resolves both. The floor must admit
    precisely what the obligation rule raises against: admit less and an author is refused the
    shape the engine asks them to write, admit more and a scenario is tier-named while owing
    nothing — the silent hole this floor exists to close, reopened from the other side.

    AND THERE IS A THIRD SOURCE NOW, WHICH IS NEITHER OF THOSE TWO (3F-3138). A CONVERTED check
    carries one word for the whole axis — the fitness tag — and its CHARACTERISTIC moves to a
    configured row. So there is nothing for a registry to name and never will be: `checkRegistry`
    answers "which check is this runnable script handle", and a converted check is not discovered
    as a handle at all — it is a scenario that ran, carrying its own tag line. The floor admits
    the axis tag the way it admits a registered one, and the set BOTH this floor and the one-check
    rule read is widened once, at the one edge that assembles it, so the two cannot come to
    disagree about it the way they did over steplessness.

    THE AXIS WORD IS NOT THE TARGET'S TO GRANT, and that is the one place this route differs from
    the registered one. Which words name a CHECK is the target's answer — complexity, typecheck,
    mutation — and which axis a scenario is ON is the model's, exactly as `unit` is. A target that
    has converted nothing does not get to spell the axis differently, for the reason nobody spells
    `@unit` differently, so the word is admitted whatever the manifest holds. What that costs is
    nothing a target can feel: no other tag's reading changes, and a corpus carrying the word
    without the rows is already reported, by name, one paragraph down.

    AND A CONVERTED SCENARIO NO CONFIGURED ROW NAMES SATISFIES THIS FLOOR, deliberately. Such a
    scenario has said which axis it is on and then said nothing about what it asserts, and that IS
    a corpus fault — but it is @SCN-LNT-020's, which names it by id and leaves the reader the one
    remedy there is, which is to write the row; the run reds on it regardless, through the
    degenerate both-missing item. A floor redding it too would report half of one fault in a
    second place with the wrong remedy attached — "name a tier", said to an author whose scenario
    names its axis — which is the wrong-message failure @SCN-STG-002 split the three kinds to
    avoid. One fault, one place.

    @integration @SCN-STG-004
    Scenario: a @fitness=<check> tag reds the tier-tag check, naming the bare tag it should have been
      Given the scn-tags static check
      When it runs over a target whose scenario carries a group-prefixed check tag
      Then it fails, naming the bare tag the group-prefixed one should have been

    @integration @SCN-STG-005
    Scenario: a fitness scenario satisfies the tier floor by the word naming its check — a registered bare tag, or the converted axis tag
      Given the scn-tags static check
      When it runs over a target whose stepless scenario carries only its registered bare check tag
      Then it passes
      When it runs over a target whose stepped scenario carries that same bare check tag and no tier
      Then it passes
      When it runs over that same stepped target with nothing registering its check tag
      Then it fails, naming the scenario that named no tier
      When it runs over a target whose converted scenarios carry the fitness axis tag, one named by a configured row and one named by none
      Then it passes
      When it runs over that same target with no fitness rows configured at all
      Then it passes

    @integration @SCN-STG-009
    Scenario: a stepless scenario tagged with a MEASURED check satisfies the tier floor
      Given the scn-tags static check
      When it runs over a target whose stepless scenarios carry a measured check tag and a registered one
      Then it passes
      When it runs over that same target with no thresholds configured
      Then it fails, naming the scenario that named no tier

  Rule: a fitness scenario carries ONE check, and a second reds the tier-tag check

    ONE CHECK PER FITNESS SCENARIO is canon (`fitness-functions.md`), and until now it
    was only ever enforced from the CREDIT side: @SCN-LNT-008 says one run is not evidence for
    two scenarios, and leaves the runner-up's obligation reading missing. That arm reds the
    corpus fault where two scenarios reach one check. It has nothing to say about the fault
    running the other way — one scenario reaching two checks — because from the credit's point
    of view nothing is wrong there at all: two runs, two credits, both citing honestly.

    SO THIS ENFORCES IT FROM THE CORPUS SIDE, at the point of authorship. `mechanism-over-honour`:
    the model was made SOUND over the collision (@SCN-LNT-012 — each credit answers its own
    check), and this makes the collision UNCONSTRUCTIBLE from a feature file. They are
    complementary and neither replaces the other. The model still has to be sound, because a
    REGISTRY mapping two handles onto one check reaches the same collision without any corpus
    fault for this check to see; and this still has to red, because the author who wrote two
    tags on one scenario meant two scenarios, and the cheapest moment to tell them is while
    they are looking at the file.

    WHAT WENT WRONG WITHOUT IT, MEASURED. `fitnessCitations` maps each bare tag to the scenario
    carrying it, so two tags on one stepless scenario point both checks at the same @SCN. Before
    the @SCN-LNT-012 fix that turned a genuine `typecheck` watermelon `satisfied` off
    `lint:complexity`'s credit and the row read `balanced` — a false green in the tool whose
    subject is false greens.

    THE RULE IS ABOUT REGISTERED CHECK TAGS, AND THE TAG IS WHAT NAMES THE AXIS — steps or none
    (3F-3126). It first shipped asking only about a STEPLESS scenario, defended like this: a
    stepped scenario riding two check tags has a different fault — it names no tier — so telling
    it "two checks" would send the author to delete a tag when what they owe is a tier. That
    defence was downstream of the tier floor, and true only while the floor reds a stepped
    check-tagged row as tier-less. Steps are a fact about how a row is written; the registered
    tag is the claim about which axis it is on, and 3F-3115 already moved the obligation rule
    onto the tag alone. A scenario carrying two check tags meant two scenarios however it was
    written. A behavioural scenario carrying @unit @integration names two TIERS and is owed
    evidence on each — untouched, because neither tag names a check. One carrying its single
    check tag beside its @SCN is the normal fitness shape — untouched. The message names BOTH
    tags, because the author has to choose which scenario keeps which check and a message naming
    one of them has already chosen for them.

    AND THE FLOOR HAS NOW MOVED WITH IT (3F-3133). This paragraph used to read THE FLOOR HAS NOT
    MOVED YET, and named the intermediate that was true of: for one commit a stepped check-tagged
    row with no tier redded TWICE — tier-less from the floor, two checks from here — because the
    tier floor (@SCN-STG-005) had not yet stopped reading steplessness. It has now, so that record
    is retired. What the order bought is still worth saying: the reverse would have admitted that
    row silently for one commit, and a hole that lasts one commit is still a hole.

    ASKED OF UNPARKED SCENARIOS ONLY, like the floor rather than like the grammar question
    (operator ruling, 3F-2655). This Rule first shipped saying the opposite — that a parking tag
    defers what a scenario OWES and so has nothing to say about its SHAPE. The ruling is that
    parking is a SKIP-SIGNAL: a parked scenario is out of scope, and out of scope is not a place
    where some questions still get asked. Both readings agree the split is the same edit whenever
    it happens; they disagree about whether an author who has already said "not yet" should be
    made to do it now, and canon says no.

    THE SKIP IS NOT AN ERASURE, and the fourth pair below is what makes that a fact rather than a
    promise: unpark the scenario and the same two tags red again, unchanged. What parking buys is
    time, never a permanent exemption, and a rule that could be switched off for good by one tag
    would be worth having only until someone noticed.

    WHAT THE SKIP DOES NOT REACH IS THE GRAMMAR ARM one Rule up. A parked scenario's tags are
    still read for well-formedness, because the deferral set is exactly what lets that arm
    recognise the parking tag — so excusing it would make `@wip @untit` invisible.

    @integration @SCN-STG-007
    Scenario: two bare check tags on one UNPARKED scenario red the tier-tag check, naming both — steps or none
      Given the scn-tags static check
      When it runs over a target whose stepless scenario carries two registered bare check tags
      Then it fails, naming the scenario and BOTH check tags
      When it runs over that same target with one of the two check tags removed
      Then it passes
      When it runs over that same target with both check tags kept and the scenario parked
      Then it passes
      When it runs over that same target with the parking tag taken off again
      Then it fails, naming the scenario and BOTH check tags
      When it runs over a target whose STEPPED scenario carries two registered bare check tags
      Then it fails, naming the scenario and BOTH check tags
