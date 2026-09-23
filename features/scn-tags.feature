@STG
Feature: The @SCN scheme polices itself — the rules a target runs from the package it installed

  The @SCN scheme is the mechanism the whole tool turns on, and every rule policing it used to
  live under tests/checks/ — not in either package's published files, unreachable from another
  repository by construction. So a target got the codes and inherited none of the policing.
  These Rules are what a target now runs from the package it installed: `spec-controller tags`,
  over its own corpus, resolving its own manifest. Exit 0 clean, 1 findings, 2 a corpus that
  cannot be read.

  AND THE FILE NOW HOLDS `balance`'S ACCOUNT-NUMBER RULES TOO (3F-3609). An @SCN is the account
  number the ledger is keyed by, so a code two scenarios carry is a fault of the books, and the
  command a target already runs reports it on the rows. The Rule at the foot of this file is
  `balance`'s; the `tags` Rules above it leave with the command.

  WHAT THE LEDGER ALREADY SAYS DOES NOT SHIP, and that is what decides which Rules are here.
  Measured rather than reasoned about: a tier-less unparked @SCN scenario reconciles both-missing
  and is named by id in the report's own by-feature cut. So the tier-tag FLOOR this file was once
  named for was a second detector for a fault the thing a consumer already runs reports first, and
  it leaves with its scenario (3F-3308). What is left are the faults no cut of a reconciliation
  names at all — a tag outside the grammar, two files carrying one header code, an id coded for
  another file.

  A TIER TAG IS STILL GRAMMAR, WHICH IS THE HALF THAT STAYED. The tier tags are recognised
  words — @unit, @integration, @e2e, @performance and their pending variants —
  and what left with the floor is the OBLIGATION to carry one. Bare @lint was admitted here too,
  for as long as an adopter's corpus still wrote it; it left at 3F-3606 and now reds (@SCN-STG-012). The rest of the grammar is
  DERIVED, never restated: the @SCN id, the header code the file itself carries, a member of
  the target's resolved deferral set, and the one word that names the fitness axis.

  AND THE PRIVATE CHECK IS GONE (3F-3309, 3F-3312). The parked-scenario Rule that stood below
  drove `lint:scn-tags` over the floor's parking exemption, which is why the floor's code
  outlived the floor's own scenario by one sub-issue; it left with that Rule, and the check
  itself — script, CI step and both modules, 620 lines under tests/checks/ — left once no
  scenario drove it. Every Rule here runs the shipped command, which is the whole of what a
  target gets: there is no second copy left for this repository to run instead.

  Rule: a tag outside the recognised grammar reds the corpus check

    THE TYPO THAT READS AS A COMMUNITY TAG. The tier floor that used to stand above
    this Rule asked one question — does the scenario NAME a tier? — and a mistyped
    tier tag was invisible to it: `@untit` is not a tier, so it contributed nothing,
    and the scenario was satisfied by the `@unit` beside it — or, when the typo IS the
    only tier-ish tag, slipped the floor entirely and raised no Evidence Obligation at all.
    Nothing else catches it either: the vocabulary audit sees the token and asks
    the wrong question of it (is this word retired?), and in prose mode an unknown
    word does not flag, so the typo is silently green (3F-2313 posed this and
    deliberately left it).

    AND THE LEDGER DOES NOT CATCH IT EITHER, which is the measurement that put this
    rule in the shipped command rather than leaving it here (3F-3302). `@untit`
    ALONE reconciles both-missing — that half a reconciliation does cover. Planted
    beside a real tier, `@unit @untit @SCN-TGT-001`, the only reconciling item is
    the absent unit Evidence Observation: the typo contributes nothing and is named
    nowhere. A typo beside a real tier is exactly the shape this Rule was written
    about, and it is silent.

    Whether a tag is legitimate is a GRAMMAR question about a closed set, and the
    set is already written down elsewhere. So the recognised grammar is DERIVED,
    never restated: the @SCN id, the header code the file itself carries, a tier
    tag, a member of the resolved deferral set, or a word naming a check. Anything
    else is a tag that means nothing here, and it reds.

    THE HEADER CODE IS PART OF THE GRAMMAR, and it had to be said out loud once the
    rule started walking the real AST (3F-3302). A `@TGT` on the `Feature:` line is
    inherited by every scenario beneath it exactly as cucumber inherits it, so a
    rule that did not recognise it would red every scenario in every coded file in
    the corpus — measured, 253 of them across 28 codes. The old string scan never
    met this because it read a scenario's own tag block and nothing above it.

    NAMING WHAT WAS PROBABLY MEANT IS A COURTESY, NOT THE VERDICT. When the
    unrecognised tag is close to a tier the message says so; when it is not, it
    reds all the same. A guess that steers the fix is worth having; a guess that
    decides the outcome would make the gate only as good as its edit distance.

    AND THE RETIRED CHECK NAME IS OUTSIDE THE GRAMMAR TOO (3F-3614). Bare `@lint` was
    admitted as a recognised word for as long as an adopter's corpus wrote it — a reader
    does not contract a shape somebody still writes. The quality check it once named is
    `fitness` now and the word raises nothing anywhere, so what a corpus carrying it got
    was silence: a scenario that looks like it names something, owing nothing, named by no
    report. The operator's ruling of 2026-09-20 ends the carve-out with the rest of the
    backward compatibility, and the word is served by the rule above rather than by a clause
    of its own — a tag that means nothing here, said in the one message there is for that.

    ONE LITERAL LEAVES, NOT THE SET, and the fixture says so rather than the commit message.
    The tier set is what recognises `@unit`, so a change that took the set out instead of the
    word would red every tiered scenario in every corpus — and would exit 1 over this fixture
    just the same. So the fixture carries a tiered scenario beside the offending one and the
    arm reads the FINDING: the retired word named, the tiered control unnamed, one finding and
    no more.

    @integration @SCN-STG-002
    Scenario: an unrecognised tag reds the shipped command, naming it and the tier it resembles
      Given a target whose @SCN scenario carries a mistyped tier tag
      When the target runs the shipped corpus check
      Then it fails, naming the unrecognised tag and the tier it resembles

    @integration @SCN-STG-012
    Scenario: a bare @lint tag reds the shipped command, the retired check name being grammar nowhere
      Given a target whose @SCN scenario carries a bare @lint tag
      When the target runs the shipped corpus check
      Then it fails, naming the unrecognised tag

  Rule: a recognised community deferral tag is grammar, not a typo

    THE CARVE-OUT THAT KEEPS THE TEETH OFF THE PRODUCT'S OWN POLICY. Reding every
    tag outside the tier set would red `@skip` — a tag spec-controller itself
    recognises, honours as a deferral signal, and lets a target extend by config.
    A check that condemns what the product accepts is not stricter, it is wrong.

    So the recognised set is the resolved deferral set, and it arrives the way the
    ingest edge gets it — `resolveDeferralTags(packageJson, DEFAULT_DEFERRAL_TAGS)`,
    the same resolver, over the same manifest. That is what makes "derived, not
    restated" true rather than aspirational: there is no second list here to fall
    behind the first.

    AND THE HALVES OF THAT SET COME FROM TWO PLACES, WHICH IS THE POINT OF IT
    (3F-3303). The community starter half is the APPLICATION layer's — an evolvable
    list of strings that is product policy, handed in as a parameter — and the
    target's own `specController.deferralTags` extends it, never replaces it. The
    rule itself names no community tag at all and recognises nothing it is not
    handed, which is the difference between owning a policy and hard-coding
    someone else's. Where the resolution happens moved with the rule: the CLI used
    to resolve the set and pass the answer, and now it passes the target's manifest
    and the starter set, because the rule that reds over a word should be reading
    the same config the engine beside it reads.

    RECOGNISING A TAG IS ALSO PARKING IT, AND BOTH READINGS ARE NOW THE SHIPPED PACKAGE'S
    (3F-2655, 3F-3309). One resolved set answers two questions: here it says the word means
    something, and in the reconciliation (@SCN-PND-016) it says the scenario is out of scope
    until it is unparked. The two readings were once split across a package boundary —
    this arm read the resolved set while the private check's tier floor asked a hard-coded
    `wip` — so a `@skip` scenario was recognised as a legitimate deferral and then failed for
    the deferral it had legitimately named. The floor is gone (3F-3308) and its code with it;
    what the fault leaves behind is the discipline of one set, read twice, and no second list
    for either reading to fall behind.

    WHAT DOES NOT BLEED IS THE TYPO ARM, and that is the boundary the two questions keep.
    A parked scenario's tags are still read for well-formedness, because parking defers what
    a scenario OWES and what SHAPE it must have, never whether its tags are spelled right.
    And this set is precisely what lets this arm recognise the parking tag, so excusing the
    arm on a parked scenario would hide `@wip @untit` — a check whose teeth come off by
    writing one more tag. The shipped command has no parking clause in its grammar walk at
    all, and that absence is the discipline rather than an oversight.

    @integration @SCN-STG-003
    Scenario: a recognised deferral tag is grammar, not an unrecognised tag
      Given a target whose tiered @SCN scenario also carries a recognised community deferral tag
      When the target runs the shipped corpus check
      Then it passes

  Rule: a group-prefixed quality-check tag is outside the grammar

    THE FLAT SET, AND WHAT THE GRAMMAR HAS TO ADMIT. A fitness check is named by a BARE tag —
    complexity, typecheck, vocab — a flat peer of the behavioural tiers rather than a member of
    some group. There is no behavioural=unit, so there is no fitness=complexity (canon 2026-08-07,
    the bare-tags Correction). The scheme's own words are four tier tags and their pending variants,
    and a fitness scenario carries none of them: once the technique leaves the tag,
    a fitness scenario carries its bare check and nothing else. So a word that NAMES A CHECK is
    grammar too (@SCN-STG-005), or the shipped command reds every one of the ten fitness scenarios
    in features/fitness-checks.feature for carrying a tag that means nothing here — measured, ten
    findings, exit 1, over this repository's own corpus on the commit before that clause landed.

    THE TAG IS THE DISCRIMINATOR, NOT THE SHAPE (3F-3126), AND THE SHIPPED COMMAND INHERITS THAT
    RATHER THAN RE-DECIDING IT. A fitness scenario is a whole-system property held against a
    threshold, and its axis tag is the whole of that claim; whether the row was given steps
    says only how it was written. This preamble used to say the opposite — STEPLESS IS THE
    DISCRIMINATOR FOR THIS FLOOR, NOT THE TAG, on the reading that letting a STEPPED row ride a
    bare check tag would re-admit name-match's own fault in a shorter spelling. That reading is
    retired, not merely restated: steplessness was always a CORRELATE of having nothing to
    exemplify, never the thing itself, and 3F-3097 exists to convert fitness checks to real step
    definitions — so a rule keyed on the correlate reds the first conversion for a shape that is
    exactly what it asked the author to write. Here the retirement is structural rather than
    remembered: the grammar walk reads a scenario's TAGS and never its steps, so there is no
    shape for a clause to key on and the two shapes are one case rather than two that agree.

    SO THE GRAMMAR AND THE OBLIGATION RULE ASK ONE QUESTION OF ONE WORD, and now from one
    assembly inside one package. Both read the fitness axis word, spelled once, and neither
    respells it — so the word this command calls legitimate is exactly the word the engine
    beside it raises obligations from. What used to ask this question was a floor at a private
    CLI that assembled its own copy, and the two disagreeing about the set is what cost a slice
    (3F-3126); the interim record that stood here — DELIBERATELY THE STRICTER OF THE TWO until then (3F-3115) — retires with it.
    There is no second assembly left to disagree.

    ONE WORD, NEITHER INFERRED NOR REGISTERED. The only word that names the fitness axis is the
    model's axis tag, below. No registry and no set of check tags says which other words are
    checks, because a check is its @fitness scenario, told apart from every other by its @SCN
    (3F-3525). Inferring a check from shape instead would admit any word at all on a scenario that
    looked fitness-shaped, and a typo would then read as legitimate grammar while raising no
    obligation — precisely the silent slip this Rule exists to close.

    AND THE NEGATIVE HALF, WHERE THE HIERARCHY WOULD COME BACK — now the SHIPPED command's
    (3F-3304). A tag that spells its group into itself — fitness=complexity — resembles no tier, so
    the near-miss courtesy has nothing to offer it, and an author told only that the tag means
    nothing here is left to work out which half of it was the mistake. Their intent survives the
    mistake intact: the group is the part that has to go, and what is left is the tag they wanted.
    So it reds, and the message names that bare tag.

    TWO SHAPES, ONE VERDICT, TWO MESSAGES. A near-miss gets the guess; a group-prefixed tag gets
    the reading. Both red, and neither diagnosis is ever the verdict — the tag means nothing here
    whether or not the command can say what was meant, which is what keeps a check from being only
    as good as its edit distance.

    NO LIST OF GROUP NAMES, because there is nothing to list. Any tag carrying a value has spelled
    a group into a tag, whatever the group is called, and the value is the bare tag it should have
    been. A set of permitted group words would be a second place to remember that the group lives
    in the model — and it would green the first group name nobody thought of.

    SO THE RETIRED lint=<handle> FORM REACHES THIS ARM, AND IS SERVED BY THE SAME RULE. It raises
    no Evidence Obligation (@SCN-LNT-007), so admitting it as a tier would let a scenario look
    tiered while owing nothing — the silent slip this Rule exists to close, re-opened by the one
    shape a reader would most expect to be excused. Dropped of its group it names what is left,
    exactly as any other group-prefixed tag does, and that it reds at all is the point. The private
    check this rule replaced carved the form out as a tier for as long as the form was live; the
    shipped one has no carve-out to remember to remove.

    AND THE ONE SOURCE LEFT IS NEITHER OF THOSE (3F-3138). A CONVERTED check carries one word
    for the whole axis — the fitness tag — and its configured row carries its @SCN and its command. So
    there is nothing for a registry to name and never will be: a converted check is not
    discovered as a runnable script handle at all — it is a scenario that ran, carrying its own
    tag line. The route a registry once read handles through is retired whole (3F-3395, the
    SCN-LNT-017 sub-issue — the last registry-`scn` scenario), and the measured tags once
    admitted beside the axis word left with the target's thresholds (3F-3516). The axis tag is
    admitted ONCE, at the one place inside core that assembles the set, so no second reader can
    come to disagree about it the way the floor and the obligation rule did over steplessness.

    THE AXIS WORD IS NOT THE TARGET'S TO GRANT. What a check is ABOUT is its scenario's title, the
    target's to write, and which axis a scenario is ON is the model's, exactly as `unit` is. A target that
    has converted nothing does not get to spell the axis differently, for the reason nobody spells
    `@unit` differently, so the word is admitted whatever the manifest holds. It arrives as
    FITNESS_AXIS_TAG — the one spelling of it (@SCN-LNT-020's and the obligation rule's own) — and
    is never re-written here, because a second literal would be a second answer travelling under
    the first's name. What that costs is nothing a target can feel: no other tag's reading changes,
    and a corpus carrying the word with nothing running it is already reported, by name, one
    paragraph down.

    AND A CONVERTED SCENARIO NO CI STEP CITES IS ADMITTED HERE, deliberately. Such a
    scenario has said which axis it is on and then said nothing about what it asserts, and that IS
    a corpus fault — but it is @SCN-LNT-020's, which names it by id and leaves the reader the one
    remedy there is, which is to cite its @SCN from the step that runs the check; the run reds on
    it regardless, through the degenerate both-missing item. Redding it here too would report half
    of one fault in a second place with the wrong remedy attached — "this word means nothing
    here", said to an author whose scenario names the one axis the model has — which is the
    wrong-message failure @SCN-STG-002 split the kinds to avoid. One fault, one place.

    @integration @SCN-STG-004
    Scenario: a group-prefixed check tag reds, naming the bare tag it should have been
      Given a target whose scenario carries a group-prefixed check tag
      When the target runs the shipped corpus check
      Then it fails, naming the bare tag the group-prefixed one should have been

    @integration @SCN-STG-005
    Scenario: a word that names a check is grammar only as the converted axis tag
      Given a target whose scenario carries a bare check tag
      When the target runs the shipped corpus check
      Then it fails, naming the tag that means nothing there
      When it runs over a target whose converted scenarios carry the fitness axis tag, one named by a configured row and one named by none
      Then it passes
      When it runs over that same target with no fitness rows configured at all
      Then it passes

  Rule: one feature code names one feature file

    THE FAULT THE LEDGER CANNOT SEE. A feature file's `@<FFF>` header is what the
    report's by-feature cut groups on, and nothing anywhere holds two files to two
    codes. Measured over a target whose `one.feature` and `two.feature` both carry
    `@TGT`: the reconciliation runs clean through and prints ONE by-feature row,
    `two (TGT)`, claiming a scenario that lives in `one`. Not a red, not a warning — a
    report cell that says something false, in the section a reader goes to first.

    IT IS THE CORPUS-NATIVE FORM OF A REGISTRY RULE, WHICH IS WHY IT SHIPS. The
    hand-kept allocation table that used to answer this question is a second list to
    drift, in a repository a consumer has never seen; canon says the `.feature` corpus
    IS the registry. So the rule asks the corpus about itself — two files, one code —
    and a target runs it from the package it installed.

    THE CODE ARRIVES; IT IS NEVER RE-DERIVED. The header is read by exactly one thing,
    at the ingest edge, and that is the same reading the by-feature cut groups on. A
    second reading inside the rule would be free to disagree with the report about the
    very field this Rule is about, and the check could then pass over a corpus the
    report mis-attributes.

    @integration @SCN-STG-010
    Scenario: two feature files carrying one header code red the shipped command, naming both files and the code
      Given a target whose two feature files carry the same header code
      When the target runs the shipped corpus check
      Then it fails, naming the code and both files that carry it
      When it runs over that same target with one of the two codes changed
      Then it passes

  Rule: a scenario's code names the file it is written in

    THE OTHER HALF OF THE PAIR, AND THE SAME REPORT CELL. The Rule above holds one code to
    one file; this one holds a file's scenarios to the code that file carries. Measured over
    a target whose `@TGT`-headed file holds `@SCN-ZZZ-001`: the reconciliation's by-feature
    cut prints a row for a feature `ZZZ` that no file in the corpus names, and the
    feature-code lint over the same tree reports `OK — every feature code a header names is
    unique and registered`. Silent in both readers, which is the whole reason it ships.

    IT IS THE CORPUS-NATIVE FORM OF A REGISTRY RULE. A hand-kept table of allocations bound
    a code to a file by writing the pair down a second time, in a repository a consumer has
    never seen. What that table was really enforcing — this code belongs to this file — the
    corpus can state about itself, which is what canon means by the `.feature` corpus BEING
    the registry.

    THE CODE ARRIVES AND THE GRAMMAR IS READ ONCE. The file's header comes from the ingest
    edge, which is the same reading the by-feature cut groups on; the `<FFF>` comes off the
    id through the one helper that owns that grammar. A second reading of either would be
    free to disagree with the report about the very fields this Rule compares, and the check
    could then pass clean over the corpus the report mis-attributes.

    AN UNCODED FILE RAISES NOTHING HERE, deliberately rather than by omission. A file
    carrying no header code while its scenarios carry `@SCN` ids has nothing for an id to
    disagree WITH — there is no code for one to be foreign to. Whether that should red is a
    policy question about gradual adoption, and it is not this Rule's to settle.

    @integration @SCN-STG-011
    Scenario: an @SCN whose feature part is not its file's header code reds, naming the file, the id, and the code the file carries
      Given a target whose feature file holds a scenario coded for another feature
      When the target runs the shipped corpus check
      Then it fails, naming the file, the offending id, and the code that file carries
      When it runs over that same target with the id re-coded to its own file
      Then it passes

  Rule: an @SCN is one account number, and two scenarios carrying it make that account unreconcilable

    THE ACCOUNT IS KEYED BY THE CODE, SO TWO SCENARIOS CARRYING ONE CODE ARE ONE ACCOUNT. A phantom
    account already exists for a cited code with no scenario behind it; a code carried twice is the
    mirror, two scenarios behind one account. No credit citing that code can be attributed to either
    of them, so nothing the account says can be trusted, and every quality check on it reads
    `duplicate-scn-code`. Each is a reconciling item, so the account is out of balance by the
    ordinary rule: no new verdict, no precedence. It is not `broken` — the proofs ran; what fails is
    the attribution.

    Until now `balance` refused such a corpus as unreadable (exit 2), and one bad code blanked the
    whole report. Reported on its account instead, it reds the run and leaves every other account
    reconciling exactly as before.

    @unit @integration @SCN-STG-013
    Scenario: Two scenarios in one file sharing an @SCN are one account, reading duplicate-scn-code at every quality check
      Given a feature file whose two scenarios carry one @SCN, each naming a unit check, the second also deferring an integration check
      When the ledger reconciles that corpus into accounts
      Then the corpus holds one account for that code
      And every quality check on it, the deferred integration check included, reads duplicate-scn-code
      And that account carries no Pending Item
      And that account is out of balance
      When the two scenarios name no quality check at all
      Then the one account carries a single duplicate-scn-code sub-row, never both-missing

    @unit @integration @SCN-STG-014
    Scenario: Two scenarios in different files sharing an @SCN are one account, reading duplicate-scn-code at every quality check
      Given a corpus of two feature files, each holding a scenario that carries the same @SCN and names a unit check
      When the ledger reconciles that corpus into accounts
      Then the corpus holds one account for that code
      And every quality check on it reads duplicate-scn-code
      And that account is out of balance

    @unit @integration @SCN-STG-015
    Scenario: Scenarios sharing a code but naming disjoint quality checks still never balance
      Given two scenarios sharing one @SCN, one naming a unit check and the other an integration check, each with passing evidence at its own check
      When the ledger reconciles that corpus into accounts
      Then the corpus holds one account for that code
      And that account carries both the unit and the integration check, each reading duplicate-scn-code
      And that account is out of balance

    @unit @integration @SCN-STG-016
    Scenario: Every credit citing a duplicated code posts to its one account, none dropped, none doubled, none attributed by position
      Given two scenarios sharing one @SCN and three credits citing it, one passing, one failing, and one at a check neither names
      When the ledger reconciles that corpus into accounts
      Then each of the three credits posts to that one account exactly once
      And no other account carries any of them
      And none of them satisfies a quality check on that account

    @unit @integration @SCN-STG-018
    Scenario: A duplicated code is exit 1 with the rest of the report complete, never a refused corpus
      Given a target whose corpus carries one @SCN on two scenarios beside a scenario of its own, every scenario cited by passing evidence
      When the target runs balance over it
      Then the run fails as out of balance, not as an input it cannot read
      And the report reconciles the scenario of its own exactly as it does in the same corpus without the duplicate
      And nothing says the corpus was refused

    @unit @integration @SCN-STG-017
    Scenario: The report states that the corpus holds more scenarios than accounts, and names the scenarios sharing each code
      Given a target whose corpus carries one @SCN on two scenarios in two feature files, beside a scenario of its own
      When the target runs balance over it
      Then the report states that the corpus holds three scenarios in two accounts
      And it names the shared code with the file and the name of each scenario carrying it
      And the report saved as JSON re-renders the same statement
