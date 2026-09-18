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
  bare tag MEANS, which is the target's own configuration to keep and what 3F-2511
  spent an increment removing. Canon names a published fitness registry as the eventual home for a
  characteristic's own properties, and that registry does not exist yet; when it does, a per-check
  default can sit above this entry and the entry becomes the override. Until then the target says
  what its bar means, and a target authoring a mutation ceiling is wrong out loud rather than
  quietly overruled.

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

  Rule: spec-controller's own mutation kills are on the books

    THE CHECK, TURNED ON ITS AUTHOR — the shape ci-run-time.feature and scn-tags.feature already
    take, and the reason this axis was filed at all. Every Rule
    above is the engine deciding over planted data; this one is the characteristic
    held over this repository's own domain core, which is the claim each push actually makes. Until
    this line existed `pnpm mutation` reconciled nowhere: not uncited but INVISIBLE, because the
    ledger observes a script by its name and a measured check has no script name to observe, so the
    report read "0 uncited" over a tree that ran a sweep with real teeth and never mentioned it. A
    gate nobody's books carry is the hiding place ci-run-time.feature named.

    THIS CHECK IS CONVERTED, AND IT WAS THE SECOND OF 3F-3138's TWO WORKED EXAMPLES — the MEASURED
    one. It carried `@mutation` and no steps: the tag answered two questions at once, and a
    threshold had nothing to exemplify, so the measured run itself was the whole observation. Now
    the tag names only the AXIS and the characteristic has moved into a configured row of
    `specController.fitnessChecks`. It is no longer measured on the push (3F-3483): its evidence is
    the outcome of the step the run's own record enumerates, which reads the nightly sweep's
    verdict, so the row is a step-outcome row like the others and names no number of its own.

    ITS SCENARIO IS NO LONGER WRITTEN HERE — IT LIVES IN `features/fitness-checks.feature` (3F-3164,
    authored there rather than emitted since 3F-3244). What sat under this Rule now sits beside every
    other converted check's scenario, one file for the whole axis, each one written beside the row
    that names it. This Rule keeps its argument and no longer keeps a scenario.

    IT WAS THE LAST CODE MINTED AND THE ONLY ONE THAT NEEDED A MECHANISM TO CROSS (3F-3168), AND
    THE PUSH NO LONGER READS ANYTHING A CODE IS STAMPED INTO (3F-3483). Every other converted check
    renamed freely, because both sides of its citation move in one commit. This one did not while
    the push read a number: the code was stamped into the sweep's record by a producer that ran on
    a different cadence, on a different branch, so a rename moved only the READING side, and the
    reader had to learn to answer a row from a record stamped with the code it superseded
    (3F-3174). The push now reads a workflow run's conclusion, and a conclusion carries no code,
    so nothing the sweep leaves behind can fall out of step with a rename, and that reader has left
    with the placement that fed it (3F-3504).

    AND THE AXIS TAG IS STILL ALONE ON ITS LINE. A tier tag beside it would raise a second Evidence
    Obligation, owed by a suite, that nothing here settles; the row would then be out-of-balance
    forever for naming evidence it never meant to claim.

    THE BAR IS A CONVENTIONAL PERCENTAGE, STATED ONCE, IN STRYKER'S OWN CONFIG, AND IT STANDS STILL
    (3F-3334, 3F-3337, 3F-3483). The row used to name the `domain` gate of `quality-thresholds.yml`
    rather than a figure, and that file stated what the gate last banked. Both are gone: a bar whose
    freshness depended on somebody re-deriving it after every sweep is a bar maintained by memory,
    and the one this repository carried went 7.7 points stale inside four days before a banked
    record replaced it and then went blind by 113 kills. What stands now is the 95
    `stryker.config.mjs` states as the threshold its sweep breaks on, a number nobody has to
    re-bank, and the one place it is written. The row carries no `atLeast` and
    `specController.thresholds` holds nothing for this scenario: the push does not compare a number,
    it reads whether the sweep that did cleared its own bar.

    AND THE KILLS SETTLING IT ARE LAST NIGHT'S, WHICH IS WRITTEN DOWN RATHER THAN GLOSSED OVER. The
    sweep costs 8-12 minutes against a 2-minute ladder, so it runs on a schedule on the gated
    branch, and this push reads the verdict of the newest sweep started there inside the last 26
    hours: young enough for its kills to be about this code. Past that window there is no sweep to
    read, the step fails and the row reads failing — the same reading a sweep that crashed, or that
    scored below its bar, produces. Three causes share one reading, and the nightly's own run is
    where they are told apart.

    THE CREDIT IS THE STEP'S OWN OUTCOME, SO THERE IS ONE STREAM AND NOTHING TO KEEP APART. While the
    push read a number, the sweep's placed record and the row's own credit were two streams that
    had to be kept apart, or one Evidence Obligation would have been credited twice. A step outcome
    is recorded once, in the run's own step record, and the sweep's report stays in the nightly
    run that produced it.
