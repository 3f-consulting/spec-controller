@MUT
Feature: Reconcile the mutation score against its threshold — the measured axis reads a bar in either direction

  THE SECOND MEASURED CHECK, AND THE ONE THE FIRST COULD NOT HOLD. @ci-run-time built the whole
  measured seam — an Evidence Obligation carrying a number, a measurement read into a citing
  Evidence Observation, a reconciliation between the two — and built it one way round. A suite's
  wall-clock is satisfied by staying UNDER its threshold, so the comparison was written
  `measured <= threshold` and the word threshold was read as ceiling throughout. A mutation score
  is the same shape and the opposite comparison: 92.52 against a bar of 91.87 is a suite with
  teeth, and the same two numbers read as a ceiling would red it. ci-run-time.feature parked that
  argument here in as many words — "A FLOOR-SHAPED CHECK IS NOT IN SCOPE ... that is 3F-2509's to
  argue" — and this is the argument.

  THE COMPARISON IS THE DEBIT'S, FOR THE REASON THE THRESHOLD IS. A measurement is only ever a
  number; the bar it is held against is authored on the obligation side, so the runner cannot grade
  its own homework. The direction that number is read in is half of that bar — "91.87" says nothing
  until somebody says which side of it passes — so it is authored in the same place, in the same
  entry, and cannot disagree with the number it qualifies. Split across two artefacts it would be
  one more pair of things keyed by the same word that agree until the day one of them is edited.

  A BARE NUMBER STILL MEANS AT-MOST, WHICH IS NOT BACKWARD COMPATIBILITY FOR ITS OWN SAKE. Two
  ci-run-time ceilings are live in this repository's own manifest and a third form of the same
  entry would have to be written into both to keep them saying what they already say. Read at-most
  by default, the object form is an EXTENSION — a manifest says which way it reads only where the
  answer is not the ordinary one — and the two live rows are untouched by construction rather than
  by a sweep somebody has to get right.

  WHY THE ENGINE HAS NO OPINION ABOUT WHICH CHECKS ARE FLOORS. A mutation score is a floor in every
  repository there is, and a tool that knew that could read the direction off the tag and ask the
  manifest for nothing. It would also be name-matching — the engine holding a roster of what a
  bare tag MEANS, which is exactly what @SCN-LNT-005 puts in the target's hands and what 3F-2511
  spent an increment removing. Canon names a published fitness registry as the eventual home for a
  characteristic's own properties, and that registry does not exist yet; when it does, a per-check
  default can sit above this entry and the entry becomes the override. Until then the target says
  what its bar means, and a target authoring a mutation ceiling is wrong out loud rather than
  quietly overruled.

  THE NUMBER IS DERIVED FROM THE MUTANTS, NEVER READ FROM THE RUNNER'S VERDICT. Stryker's report
  carries the mutant statuses AND a thresholds block of its own, and reading the second one would
  be transcribing a verdict the ledger exists to reconcile — the runner grading its own homework,
  one artefact further out. So the producer reads the statuses, counts the kills they imply, and
  hands the ledger a number with no opinion attached. The runner's own break threshold is retired
  in the same move: two bars for one characteristic is a green build depending on two arbiters
  agreeing, and the ledger's is the one with the @SCN.

  THE CADENCE IS THE PART @ci-run-time NEVER HAD TO ANSWER. A timed suite is measured by the run
  that is reconciling it, so the measurement is always this run's. A mutation sweep costs 8-12
  minutes against a 2-minute ladder, so it is not this run's — it is last night's, and a
  reconciliation that read last night's number as though it were this push's would be reporting a
  measurement about a tree that is not the one being judged. What makes that honest is an expiry
  rather than a promise: a measurement is posted only while it is young enough to still be about
  this code, and one that has aged out is not posted at all. The row then reads missing, which is
  the true sentence — no measurement arrived — and is the same reading a nightly that stopped
  running produces, which is the point. A pipeline nobody runs cannot go quiet.

  AND THE EXPIRY IS THE PRODUCER'S, NOT THE RECONCILER'S. The reconciler compares a number to a
  bar; asking it what time it is would put a clock inside the one part of this system that is pure,
  to reach a reading it already has a word for. Dropping a stale row at the edge is the stance every
  reader at that edge already takes with a malformed one, and it costs the ledger no eleventh
  outcome.

  Rule: a measured obligation carries the comparison its threshold is read with

    WHAT THE DEBIT HOLDS NOW. The obligation already carries the number; it gains the side of that
    number which satisfies it. Both halves come from one manifest entry, so an obligation can never
    hold a bar whose direction was authored somewhere else and has since moved.

    @unit @integration @SCN-MUT-001
    Scenario: a threshold authored as a bare number raises an obligation read at-most, unchanged
      Given the target's manifest authors 91.87 as a bare-number threshold for "mutation" on "SCN-MSD-001"
      And a stepless scenario "SCN-MSD-001" in the corpus carries the bare check "mutation"
      When the corpus is read against that manifest
      Then the Evidence Obligation raised for "mutation" holds the bar 91.87
      And that Evidence Obligation names no comparison of its own, so its bar is read at-most
      And it holds nothing a measured Evidence Obligation did not already hold

    @unit @integration @SCN-MUT-002
    Scenario: a threshold authored as an at-least bar raises an obligation read the other way
      Given the target's manifest authors 91.87 as an at-least threshold for "mutation" on "SCN-MSD-001"
      And a stepless scenario "SCN-MSD-001" in the corpus carries the bare check "mutation"
      When the corpus is read against that manifest
      Then the Evidence Obligation raised for "mutation" holds the bar 91.87
      And that Evidence Obligation names the at-least comparison, so its bar is read as a floor

    @unit @integration @SCN-MUT-003
    Scenario: a threshold entry naming no comparison it recognises raises an obligation with no bar at all, rather than a defaulted one
      Given the target's manifest authors a threshold for "mutation" on "SCN-MSD-001" naming a comparison this reads as neither at-least nor at-most
      And a stepless scenario "SCN-MSD-001" in the corpus carries the bare check "mutation"
      When the corpus is read against that manifest
      Then an Evidence Obligation is still raised for "mutation", measured as any other measured check is
      And that Evidence Obligation holds no bar at all, rather than one the engine picked a direction for

  Rule: a measurement reconciles against its threshold in the direction its obligation names

    THE AT-MOST ARM IS ALREADY PINNED (@SCN-CIP-004 / @SCN-CIP-005) and is not re-asserted here.
    What is new is the other arm and the fact that the two do not share a comparison: a fixture
    built so that one number would reconcile satisfied under one direction and failing under the
    other is the only shape of this that cannot pass while the engine ignores what the debit said.

    @unit @integration @SCN-MUT-004
    Scenario: a measurement at or above its at-least bar reconciles satisfied
      Given the target's manifest authors 91.87 as an at-least threshold for "mutation" on "SCN-MSD-001"
      And a stepless scenario "SCN-MSD-001" in the corpus carries the bare check "mutation"
      And the run measured 92.52 for "mutation" on "SCN-MSD-001"
      When the corpus and that measurement are reconciled
      Then the row "SCN-MSD-001" reconciles satisfied on the bare check "mutation"
      And the row is balanced
      And a measurement sitting exactly on that bar reconciles satisfied too

    @unit @integration @SCN-MUT-005
    Scenario: a measurement below its at-least bar reconciles failing, carrying the measurement and the bar
      Given the target's manifest authors 91.87 as an at-least threshold for "mutation" on "SCN-MSD-001"
      And a stepless scenario "SCN-MSD-001" in the corpus carries the bare check "mutation"
      And the run measured 91.4 for "mutation" on "SCN-MSD-001"
      When the corpus and that measurement are reconciled
      Then the row "SCN-MSD-001" reconciles failing on the bare check "mutation"
      And that reconciling item carries both the measurement and the bar
      And the row "SCN-MSD-001" is out-of-balance

  Rule: a measured reconciling item renders which side of its bar it had to be on

    A NUMBER AND A BAR ARE NOT ACTIONABLE WITHOUT THE COMPARISON BETWEEN THEM. "91.4 against 91.87"
    reads as a comfortable pass to anybody who has met this axis as a ceiling, and as a red to
    anybody who has met it as a floor. The page carries the same three terms the obligation does.

    @unit @integration @SCN-MUT-006
    Scenario: a failing at-least row renders in the markdown and the JSON, naming the bar as a minimum rather than a maximum
      Given the target's manifest authors 91.87 as an at-least threshold for "mutation" on "SCN-MSD-001"
      And a stepless scenario "SCN-MSD-001" in the corpus carries the bare check "mutation"
      And the run measured 91.4 for "mutation" on "SCN-MSD-001"
      When the corpus and that measurement are reconciled and rendered
      Then the row "SCN-MSD-001" names the check "mutation" with its measurement 91.4 held against a bar of at least 91.87
      And that row does not read its bar as a maximum
      And the JSON carries that bar with the comparison the obligation named, on the row's own entries

  Rule: a mutation run posts the kills its mutants imply, as a whole number of mutants

    THE PRODUCER, BUILT THE WAY THE TIMING WRAPPER WAS. It is told which scenario and which check
    it is measuring, so the measurement arrives already citing; it posts beside whatever the run's
    other producers left rather than over it; and the artefact it writes is asserted by reading it
    back through the real reader, because a producer and a reader agreeing by inspection agree
    until one of them is edited.

    THE UNIT CHANGES AND THE PRODUCER DOES NOT MOVE. It still reads the mutant statuses and still
    refuses the report's own thresholds block; what it posts is now the DETECTED COUNT rather than
    that count as a percentage of the valid ones. A percentage is two facts divided into one, and
    the division is exactly what makes the ledger's row red when new mutable code arrives carrying
    survivors. The kills alone carry only the fact the bar is about.

    @unit @integration @SCN-MUT-007
    Scenario: the number posted is the detected mutants themselves, derived from the statuses and not read from the report's own thresholds block
      Given a mutation run citing the scenario "SCN-MSD-001" on the check "mutation"
      And its mutants came back 7 killed and 2 timed out against 2 survived and 1 never covered
      And beside them 1 errored, 1 failed to compile and 2 were ignored, none of which the metric counts as valid
      And the report also carries a thresholds block of its own, naming numbers those mutants do not imply
      When that run posts the kills it measured
      Then the measurement it posted is read back as exactly one Evidence Observation citing "SCN-MSD-001" on the check "mutation"
      And it carries 9, the detected mutants themselves
      And it carries neither number the report's own thresholds block names
      And it carries neither 75 nor any other reading of those mutants as a percentage

    @unit @integration @SCN-MUT-008
    Scenario Outline: a mutation run that produced no readable report posts no measurement, rather than a count of zero
      Given a mutation run citing the scenario "SCN-MSD-001" on the check "mutation"
      And another producer of that same run has already posted a measurement of its own
      And the sweep leaves "<report>" and ends "<ending>"
      When that mutation run has finished sweeping
      Then that mutation run posts no measurement of its own, rather than a count of zero
      And the measurement the other producer posted is still there to be read
      And that mutation run ends exactly as its sweep ended, rather than as a fault of its own

      Examples:
        | report                               | ending     |
        | no mutation report at all            | cleanly    |
        | no mutation report at all            | in failure |
        | a mutation report with nothing in it | cleanly    |
        | a mutation report nothing can parse  | cleanly    |

  Rule: a measured bar may name a mutation gate instead of a number, and is read as that gate's kill floor

    THE BAR STOPS BEING TYPED. A number in a manifest is a number somebody has to re-derive after
    every sweep that moves it, and the one this repository carried went 7.7 points stale inside four
    days. The direction stays exactly where it is — `atLeast` — and the VALUE becomes a reference to
    the gate whose record already holds the two counts, so the ledger's bar and the ratchet's floor
    are one figure read twice rather than two figures kept in step by hand.

    AND IT RESOLVES AT THE APP EDGE, WHICH IS THE WHOLE OF WHY THE ENGINE IS UNTOUCHED. The
    substitution happens beside the three resolvers that already read the target's manifest; what
    reaches the threshold registry is the number it has always taken.

    A BAR THAT LIVES IN A SECOND FILE HAS FOUR WAYS TO GO MISSING THAT A TYPED NUMBER NEVER HAD, and
    each has a lenient reading that hands back a green nobody earned. The gate name may be mistyped,
    so a record that reads perfectly is asked for a gate it never held. The file may not be there at
    all — a fresh clone, a moved file, a .gitignore that swallowed it — and read as "no gates to
    enforce" the characteristic silently leaves the books. Its text may be nothing a record can be
    read out of. And the gate's own counts may be ones the reader refuses: a gate that measured
    nothing, more kills than mutants, a fractional count, an allowance wider than the kills it is
    spent from or one nobody justified.

    ALL FOUR ARE ONE FAULT — the manifest names a bar this cannot source — SO THEY GET ONE ANSWER.
    An edge that answered three of them is an edge nobody can describe, and the fourth is then the
    one that greens for as long as it survives. It is also the stance the three sibling resolvers
    beside this one already take: a config they cannot read resolves EMPTY rather than throwing,
    because a refusal that escapes the edge is a run that produces no verdict at all, which is loud
    nowhere.

    AND THE ANSWER IS NO BAR WITH THE CHECK STILL MEASURED, which is `barOf`'s own stance for an
    entry it cannot read. The key survives with nothing beside it, so the complaint arrives from the
    arm that exists for a measured obligation whose bar nobody authored (@SCN-CIP-002) rather than
    from the tag grammar, about a check nobody wrote. What must never come out of here is a NUMBER:
    a bar the edge picked is a bar nobody authored being enforced as though somebody had.

    @unit @integration @SCN-MUT-012
    Scenario: a bar naming a mutation gate holds the obligation to that gate's recorded kills less the allowance the record states
      Given the target's record banks the gate "domain" at 701 kills over 704 mutants, with an allowance of 2
      And the target's manifest authors an at-least threshold for "mutation" on "SCN-MSD-001" naming that gate rather than a number
      And a stepless scenario "SCN-MSD-001" in the corpus carries the bare check "mutation"
      When the corpus is read against that manifest
      Then the Evidence Obligation raised for "mutation" holds the bar 699, the recorded kills less that allowance
      And that Evidence Obligation names the at-least comparison, so its bar is read as a floor
      And it holds nothing a measured Evidence Obligation raised from a bare number did not already hold
      And a run measuring 699 kills over a population of any size reconciles satisfied on that row

    @unit @SCN-MUT-013
    Scenario Outline: a bar naming a gate the record cannot supply raises the obligation with no bar at all, rather than one the edge picked a number for
      Given a stepless scenario "SCN-MSD-001" in the corpus carries the bare check "mutation"
      And the target's manifest authors an at-least threshold for "mutation" on "SCN-MSD-001" naming the gate "domain"
      And the target's record "<record>"
      When the corpus is read against that manifest
      Then an Evidence Obligation is still raised for "mutation", measured as any other measured check is
      And that Evidence Obligation holds no bar at all, rather than one the edge picked a number for
      And the row reports a measured obligation whose bar nobody authored, rather than reconciling satisfied

      Examples:
        | record                                         |
        | holds no gate of that name                     |
        | is not there to be read                        |
        | holds text nothing can read as a record        |
        | holds the gate with counts it refuses as a bar |

  Rule: spec-controller's own mutation gate is wired to one record, so its two readers cannot disagree

    THE HONOUR-ARTEFACT LINK, MADE MECHANICAL. Two readers now consult this repository's record: the
    ledger, for the bar it holds SCN-MUT-011 to, and the nightly's ratchet, for the verdict it ends
    on. They agree because they read the same gate of the same file — and nothing but this scenario
    stops a rename on one side from quietly making them two gates that agree until somebody edits
    one. The report path is in the same knot: the ratchet reads a file the sweep writes, and a sweep
    that moved its output would leave the gate reconciling a report nobody produces.

    FOUR ARTEFACTS STATE THAT ONE WORD, AND THE FOURTH IS THE ONE NOTHING WOULD CATCH. The producer
    reads its report through a reader that takes a gate name, so it carries a spelling of its own —
    and that spelling is unobservable today: the reader copies it into the measurement, the producer
    takes only the counts back out, and a refusal names the path rather than the gate. A spelling
    nothing reads is a spelling nothing can catch drifting, and the day something does read it the
    disagreement is already there. So it is held to the same word rather than exempted for being
    quiet.

    AND IT IS READ OFF THE REAL ARTEFACTS. Every Rule above decides over planted data, which is what
    lets those scenarios show a rule going wrong. This one is a claim about THIS repository's wiring,
    so a planted copy of that wiring would be a scenario about nothing.

    @unit @SCN-MUT-014
    Scenario: the gate the nightly reconciles, the gate the manifest sources its bar from and the gate this repository's record holds are one name, and the report the ratchet reads is the one the sweep writes
      Given this repository's record, its manifest, and the workflow that sweeps its domain core
      When the terms each of them states are read back
      Then the gate the manifest sources SCN-MUT-011's bar from is a gate the record holds
      And the gate the nightly asks the ratchet to reconcile is that same gate
      And the gate the producer stamps onto the measurement it reads is that same gate
      And the report path the nightly hands the ratchet is the one this repository's sweep writes
      And the record states that gate's allowance and, being zero, states no reason for it

  Rule: spec-controller's own mutation kills are on the books

    THE CHECK, TURNED ON ITS AUTHOR — the shape ci-run-time.feature, scn-tags.feature and
    self-reconciliation.feature already take, and the reason this axis was filed at all. Every Rule
    above is the engine and the producer deciding over planted data; this one is the characteristic
    held over this repository's own domain core, which is the claim each push actually makes. Until
    this line existed `pnpm mutation` reconciled nowhere: not uncited but INVISIBLE, because the
    ledger observes a script by its name and a measured check has no script name to observe, so the
    report read "0 uncited" over a tree that ran a sweep with real teeth and never mentioned it. A
    gate nobody's books carry is the hiding place ci-run-time.feature named.

    A THRESHOLD HAS NOTHING TO EXEMPLIFY, so this scenario carries no steps — its observation is
    the measured run itself, which is the point of the axis rather than a gap in it. And the bare
    check tag below is ALONE on its line. A tier tag beside it would raise a second obligation,
    owed by a suite, that nothing here settles; the row would then be out-of-balance forever for
    naming evidence it never meant to claim.

    THE BAR IS THE RECORD'S AND IT READS UPWARD. `specController.thresholds` no longer holds a
    number at all: it names the `domain` gate, and `quality-thresholds.yml` states what that gate
    last banked. A number in a manifest is a number somebody has to re-derive after every sweep that
    moves it, and the one this repository carried went 7.7 points stale inside four days. Two bars
    for one characteristic is a green build depending on two arbiters agreeing — and this is now one
    bar, read by both.

    AND THE KILLS SETTLING IT ARE LAST NIGHT'S, WHICH IS WRITTEN DOWN RATHER THAN GLOSSED OVER. The
    sweep costs 8-12 minutes against a 2-minute ladder, so it runs on a schedule and leaves what it
    measured behind as an artefact; this push borrows that artefact while the run which produced it
    is still young enough for its number to be about this code. Past that window nothing is placed,
    the row reads missing, and the ladder reds — the same reading a schedule that quietly stopped
    running produces.

    @mutation @SCN-MUT-011
    Scenario: this repository's domain core kills at least the mutants its record banks
