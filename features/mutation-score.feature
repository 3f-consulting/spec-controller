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
    ledger, for the bar it holds SCN-FIT-002 to, and the nightly's ratchet, for the verdict it ends
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
      Then the gate the manifest sources SCN-FIT-002's bar from is a gate the record holds
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

    THIS CHECK IS CONVERTED, AND IT IS THE SECOND OF 3F-3138's TWO WORKED EXAMPLES — the MEASURED
    one. It carried `@mutation` and no steps: the tag answered two questions at once, and a
    threshold had nothing to exemplify, so the measured run itself was the whole observation. Now
    the tag names only the AXIS and the characteristic has moved into a configured row of
    `specController.fitnessChecks`. The sentence its scenario carries is not an example of a
    threshold; it is the pass running the row's command and posting what it printed, which is the
    evidence this scenario always rested on, said out loud in the report rather than arriving from
    a wrapper nothing enumerated.

    ITS SCENARIO IS NO LONGER WRITTEN HERE — IT IS GENERATED (3F-3164). What sat under this Rule is
    now EMITTED from its row into `features/fitness-checks.feature`, along with every other
    configured row, so the corpus half of a converted check is authored nowhere: the row is the
    whole of what anybody writes. This Rule keeps its argument and no longer keeps a scenario.

    IT WAS THE LAST CODE MINTED AND THE ONLY ONE THAT NEEDED A MECHANISM TO CROSS (3F-3168). Every
    other converted check renamed freely, because both sides of its citation move in one commit.
    This one does not: its code is stamped into the SWEEP RECORD by a producer that runs on a
    different cadence, on a different branch. `pnpm mutation` writes `{ scnId, checkTag, measured }`
    nightly on the gated branch; this push's `pnpm mutation:score` reads that row back by both
    terms. Renaming the scenario renames the key on the READING side only — the newest record when
    SCN-FIT-002 was minted had been written by the previous night's code and still said
    SCN-MUT-011 — so the two would have been desynchronised for exactly as long as it takes a sweep
    to run on the renamed tree, and the ledger would have read `missing` for a check that ran. The
    reader therefore learned to answer a row from a measurement stamped with the code that row
    supersedes (@SCN-MUT-019), the row states `--supersedes SCN-MUT-011` on its command line, and
    the flag comes off once a nightly has stamped the new code (3F-3174). A transition that has no
    end is a resting state wearing a transition's name.

    AND THE AXIS TAG IS STILL ALONE ON ITS LINE. A tier tag beside it would raise a second Evidence
    Obligation, owed by a suite, that nothing here settles; the row would then be out-of-balance
    forever for naming evidence it never meant to claim.

    THE BAR IS THE RECORD'S AND IT READS UPWARD. The row names the `domain` gate rather than a
    figure, and `quality-thresholds.yml` states what that gate last banked. A number in a manifest
    is a number somebody has to re-derive after every sweep that moves it, and the one this
    repository carried went 7.7 points stale inside four days. Two bars for one characteristic is a
    green build depending on two arbiters agreeing — and this is now one bar, read by both. It also
    lives in exactly one KEY: `specController.thresholds` holds nothing for this scenario at all,
    because the row is where a converted check says everything it says about itself.

    AND THE KILLS SETTLING IT ARE LAST NIGHT'S, WHICH IS WRITTEN DOWN RATHER THAN GLOSSED OVER. The
    sweep costs 8-12 minutes against a 2-minute ladder, so it runs on a schedule and leaves what it
    measured behind as a SWEEP RECORD; this push borrows that record while the run which produced
    it is still young enough for its number to be about this code, and the row's command prints the
    number the record holds. Past that window nothing is placed, the command has nothing to print,
    the scenario fails and the row reads missing — the same reading a schedule that quietly stopped
    running produces, now said in two places rather than one.

    THE RECORD IS NOT THE CREDIT STREAM, AND KEEPING THEM APART IS WHAT THE CONVERSION FORCED. A
    borrowed number is not a credit this run produced; under conversion the fitness pass posts the
    credit, so a borrowed row sitting in `runs/self-balance/measurements.json` would be a second
    credit for one Evidence Obligation. The sweep writes `runs/mutation/measurements.json`, the
    borrow places it there, and the one credit crosses into the run's own stream by being measured
    by this scenario.

  Rule: the measurement a push borrows is the newest sweep's, whatever verdict that sweep reached

    THE RUN THAT FOUND THE FAULT WAS THE ONE RUN NOTHING BORROWED FROM (3F-2947). The nightly ends
    on the ratchet's verdict, so a night that loses a kill concludes `failure` — and the borrow asked
    for the newest SUCCESSFUL run, which is every night but that one. Inside the freshness window it
    therefore reached back to the last GREEN nightly, placed ITS number, and SCN-FIT-002 reconciled
    satisfied: for up to thirty-six hours the ladder went green over a regression the sweep had
    already detected and already said out loud, in the one window where the gate this axis exists
    for was blind to the only fault it is for. Past that window it placed nothing and the row read
    `missing` — the sentence for a sweep that LAPSED — which is a different fault, on a different
    night, sent to a different place. The two readings furthest apart collapsed onto one word and
    the more actionable of them was the one that got lost.

    THE ARTEFACT IS THE EVIDENCE; THE CONCLUSION IS ABOUT THE GATE. A run's conclusion answers
    whether the nightly's own verdict passed, and that is not what the ledger is asking — it is
    asking what this tree's domain core killed. Two questions, one of them the ledger's, so the
    borrow stops reading the answer to the other. It selects on COMPLETION rather than on
    conclusion: a sweep still running has nothing to hand over yet, and a sweep that finished has,
    whatever the verdict that followed it said.

    AND SELECTING THAT RUN IS HALF A CLAIM, WHICH IS WHY THE ORDER IS THE OTHER HALF. The regression's
    number only crosses the boundary because the sweep leaves it behind BEFORE the ratchet step reds
    the run — move the verdict ahead of the upload and the night that found the fault uploads nothing,
    the row reads `missing`, and the fail-open closes into the mislabelled red this Rule also removes,
    with every selection assertion still green. The workflow already defends that placement in prose,
    and defends it for the OPERATOR'S REPORT; the ledger's measurement now depends on it too, so it is
    held here rather than in a comment.

    AND THE BORROW IS STILL NOT AN ARBITER, which is the part this leaves exactly as it was. Every
    branch of it places nothing, says why on stderr, and exits 0; the verdict on a low number is the
    ledger's, reached by the same comparison as every other verdict on this axis (@SCN-MUT-005).
    What moves is WHICH run's number crosses the boundary, never who judges it once it has.

    AND "EVERY BRANCH" WAS NEVER THE WHOLE STEP (3F-2960). The paragraph above was true of the
    branches and false of the stretch between them. GitHub invokes a bare `run:` as `bash -e {0}`
    and this step names no `shell:`, so errexit arrives from the SHELL; `set -uo pipefail` sets
    nounset and pipefail and does not clear it. What guarded the branches was `if !` — a command in
    an `if` condition is exempt from errexit — never the comment above them, which said the step ran
    without `-e` and was wrong for as long as it had existed. Every command outside an `if` condition
    could therefore red the one step this Rule exists to keep out of the verdict: a `cp` onto a full
    disk would have redded the ladder as though the CODE had lost a kill.

    AND THE FIX COUNTS NOTHING, WHICH IS THE WHOLE ARGUMENT FOR IT. Three attentive readings of this
    one script produced three different lists of the commands that could red it — six, then nine,
    then nine with one rationale that did not carry. None was careless, and a fourth pass would not
    be proof the list had closed; it would be a fourth reading. So guarding each command where it
    stands was ruled out on CORRECTNESS rather than on size: a guarantee resting on a hand-derived
    enumeration rests on the one artefact that moved under all three. Telling the shell out loud to
    clear what it inherited, and ending the script on `exit 0`, is correct over every command in it
    whether or not anybody enumerated them, and over the one a later edit adds. Two lines, two
    routes: the first stops a failure MID-SCRIPT from killing the step, the second stops the render
    at the END of it from being reported as the step's verdict, because a script's status is its
    last command's even with errexit cleared.

    AND ONE RED ROUTE IS LEFT STANDING ON PURPOSE, WHICH IS WHY THE CLAIM BELOW IS NOT EVERY PATH.
    `set -u` is kept: an unbound expansion exits 127 whatever errexit says, so nounset is a route by
    which this step can still red. That red says THIS SCRIPT IS BROKEN rather than YOUR CODE LOST A
    KILL — a different sentence, sent to a different place, and the one you want. Dropping `-u` to
    close it would buy `cp "" runs/mutation/measurements.json`: a silent wrong placement, which
    is the fail-open shape this whole Rule exists to remove. So the claim below is about the
    failures the borrow meets IN DOING ITS JOB, and it holds the exception as a term it asserts
    rather than leaving it an unstated residual — which is how the sentence it replaces went false.
    That sentence pinned only that the script holds no `set -e`: true of the defect and of the fix
    alike, which is how a wrong comment acquired a green tick.

    @unit @SCN-MUT-015
    Scenario: the night that found a regression is the night whose measurement crosses — the push borrows the nightly's newest completed run, and the sweep leaves that measurement behind before the verdict that reds the run
      Given the workflow every push runs and the workflow that sweeps this repository's domain core
      When the terms each of them states about the measurement crossing between them are read back
      Then the push borrows from the newest run of the sweep that has finished, whatever verdict followed it
      And it asks for no verdict at all, so the night that found a regression is a night it can borrow from
      And the sweep leaves that measurement behind before the step whose verdict reds the run
      And no failure the borrow meets in doing its job reds the step — its branches say why and exit 0, the shell it runs under is told to clear the errexit it arrives with, its last act is exit 0 rather than the render whose status would otherwise become the step's, and nounset is kept on so the one red route left says the script is broken rather than that the code lost a kill

    @unit @SCN-MUT-016
    Scenario: the measurement upload is conditioned on the sweep and the report upload is not, and this repository's runner sets no break threshold, so the sweep's own exit code answers about the sweep rather than about the score
      A CRASHED SWEEP IS WHAT THE OLD FILTER WAS ACCIDENTALLY FENCING, AND THE FENCE IS KEPT ON
      PURPOSE (3F-2901). Selecting on completion hands a failed run's artefact to the ledger, and a
      sweep that DIED is a run whose number is partial, or is a previous run's — a fault in the harness
      wearing the face of a fault in the code. What tells those apart is already in this repository and
      was never written down: `stryker.config.json` sets no `break` threshold, so the sweep cannot exit
      non-zero over the SCORE, only over ITSELF; and the step that uploads the measurement carries no
      `if:`, so it does not run at all when the sweep before it failed. A crash therefore leaves its
      run with no measurement to download, the borrow places nothing, and the row reads `missing` — no
      measurement arrived, which is the true sentence, and the one this repository already reserves for
      a number that never came.

      THE REPORT UPLOAD BESIDE IT CARRIES `if: always()` AND MUST, which is the asymmetry a tidying
      edit collapses. An operator opening the report of the run that died is precisely what that upload
      is for; a ledger reading the NUMBER of the run that died is precisely what this one must never
      serve. Two uploads, two conditions, and the reason each holds the one it holds.

      AND WHAT IS ASSERTED BELOW IS THE WIRING, NOT THE CONSEQUENCE. This scenario opens this
      repository's own workflow and runner config and reads three terms back off them; the crashed
      night reading as `missing` is what those three terms IMPLY, one inference further on, and a
      scenario claiming it would be claiming more than it observes. The implication is the paragraph
      above's to carry. What the scenario holds is the three facts it can actually see, each of which
      a single tidying edit could take away.

      Given the workflow that sweeps this repository's domain core, and the configuration the runner it invokes reads
      When the terms they state about what a sweep that died leaves behind are read back
      Then the step that leaves the measurement behind states no condition of its own, so a sweep that failed leaves no measurement behind at all
      And the step that uploads the operator's report states the condition that runs it whatever the sweep did, so the run that died is still a run an operator can open
      And the runner is given no score it may break the run over, so the sweep's own exit code answers about the sweep rather than about the score

  Rule: the measurement a push borrows was taken on the branch this ladder gates, whatever branch a hand-dispatch reached for

    THE SELECTION IS A CHAIN OF PROXIES, AND THIS IS THE ONE THAT WAS MISSING (3F-2955). What the
    ledger is asking is whether the number it settles SCN-FIT-002 with was measured about the tree
    it is judging, and no run says so outright — so the borrow narrows on the facts that stand in
    for it: the right workflow, a run that FINISHED (@SCN-MUT-015), a number still inside the 36h
    window. It never narrowed on the LINE. `mutation.yml` enables `workflow_dispatch`, so a sweep
    hand-dispatched on a feature branch entered that list and, being newest, won it — and its
    number was placed and reconciled main's row. Measured on this repository on 2026-08-30: four
    dispatches on a feature branch sat newer than that day's nightly for ten hours, each inside the
    window, none distinguishable downstream from the nightly they displaced.

    AND IT FAILS OPEN, WHICH IS WHY IT IS THIS AXIS'S FAULT RATHER THAN AN UNTIDINESS. A branch
    that ADDS tests sweeps to a higher kill count. Borrowed onto main that number reconciles
    `satisfied` over a main whose own kills had fallen — a regression masked by a measurement about
    a different line, which is the fault @SCN-MUT-015 closes arriving by the other road. The two
    are one defect wearing two faces: a number crossing this boundary that is not about the tree
    being judged.

    THE TERM IS THE BRANCH AND DELIBERATELY NOT THE EVENT, WHICH IS A RULING AND NOT A PREFERENCE.
    Filtering on `--event schedule` excludes the same feature-branch dispatches and is the wrong
    instrument three times over. It MANUFACTURES FALSE NEGATIVES: a hand-dispatch ON the gated
    branch measures that branch's tree and is wanted — the re-run after an infra blip, a fresh
    number after a large merge — and refusing it forces `missing`, which is the mislabelled red the
    sibling scenario above spent a whole slice removing, walked back in through the fix for its
    sibling. Its COUPLING IS INVISIBLE AND NOT OURS: it reaches the right answer only because GitHub
    resolves cron against the default branch, so a second schedule, a `repository_dispatch`, or a
    change in how GitHub resolves that ref silently selects a different set with nothing redding,
    because it still works. And it NAMES THE WRONG SUBJECT: the branch is a fact about the artefact,
    about which tree was mutated, where the event is a fact about provenance, about who asked.
    Reading a credit off its provenance rather than off what it is evidence OF is the class of
    opinion this codebase has spent increments removing. So the selection narrows on the branch,
    states no event, and the scenario asserts that ABSENCE — for the reason the scenario above it
    asserts the report upload's `if: always()`: a term nobody wrote down is the term a later
    tidy-up adds for symmetry.

    THE BRANCH BUYS THE LINE, NOT THE TREE, AND THE SCENARIO BELOW CLAIMS ONLY THE FIRST. `main` at
    03:17 and `main` at 14:00 are different trees; ten commits can land between the sweep and the
    push, and the 36h window is the only thing bounding that drift. This closes the different-LINE
    hole and leaves the different-COMMIT one exactly where it was. The tighter instrument is known
    and is not built here: take the newest completed run on this branch whose head commit is an
    ancestor of this push's HEAD, which refuses a measurement taken on a `main` since rewritten
    under it. It reaches the run object rather than the payload — the fact 3F-2841 already ruled
    belongs to the run — and it carries a new failure mode to fence, since `actions/checkout`
    clones shallow and an ancestry test that cannot reach the base owes a branch that places
    nothing and exits 0 like every other. A later, tighter instrument rather than a competing one.

    ACCEPTED COST, STATED. A `pull_request` build reconciles SCN-FIT-002 against the GATED branch's
    nightly rather than against its own tree, because nothing sweeps a feature branch. Narrowing on
    the branch under test instead would make the claim honest and red EVERY pull request — there is
    no sweep to find — so the cost is taken deliberately: a pull request's mutation row is a
    statement about the line it is merging into, not about itself. That is why the clause below
    stops at which branch the run was taken on and does not go on to say the number is about the
    tree this build is judging, which is true of a push and false of a pull request.

    AND THE BORROW IS STILL NOT AN ARBITER. Nothing here adds a path that reds: the narrowed
    selection either finds a run or finds none, and finding none is the branch that already places
    nothing, says why on stderr, and exits 0. What moves is WHICH run's number crosses the
    boundary, never who judges it once it has.

    @unit @SCN-MUT-017
    Scenario: the number that settles this repository's row was measured on the branch this ladder gates — a hand-dispatch on a feature branch is not a run this selection can reach
      Given the workflow every push runs and the workflow that sweeps this repository's domain core
      When the terms the push states about which of that sweep's runs it selects are read back
      Then the push borrows only from runs of the sweep taken on the branch it names
      And the branch it names is the one branch this ladder itself gates on push
      And it narrows on that branch rather than on the event, so a hand-dispatch on that branch is a run it can borrow from and one on a feature branch is not

  Rule: the borrow says only what it did — the one sentence claiming a placement stands inside the path that made it

    THE ONE PATH THAT SAID SOMETHING FALSE (3F-2962). Every branch of this step places nothing and
    says why on stderr; the stretch after the last of them places the file and then asserts the
    placement as fact. Under the cleared errexit (@SCN-MUT-015, 3F-2960) a failing `mkdir` or `cp`
    no longer stops the script, so that sentence runs anyway — "borrow: placed mutation-measurement
    from run 33379199321 of mutation.yml, measured 27000s ago, inside the 129600s window:" — the
    `jq` beneath it fails against a file that is not there, and the terminal `exit 0` reports
    success. SCN-FIT-002 then reads `missing`, and `missing` is the sentence this repository
    reserves for a sweep that LAPSED. A mechanical fault wearing a cadence fault's face, with the
    log actively pointing the reader at mutation.yml's schedule — the conflation @SCN-MUT-015
    removed one level up, arriving again one level down.

    NEWLY REACHABLE, NOT NEWLY WRITTEN, AND THE TRADE THAT MADE IT SO WAS RIGHT. Before errexit was
    cleared this path redded — loud, and the wrong shape, which is what 3F-2960 fixed: the ledger is
    the single arbiter and it reds honestly on `missing`. What the trade did not carry across was
    the SENTENCE. Clearing errexit is a guarantee about whether the step REDS, and it says nothing
    about whether what the step SAYS is true; the two were being held by one mechanism, and only one
    of them survived the fix.

    AND THIS IS NOT THE ENUMERATION THAT WAS RULED OUT. @SCN-MUT-015 barred a hand-derived list of
    fallible commands standing as the not-redding guarantee, because three attentive readings of
    this script produced three different lists. `set +e` and the terminal `exit 0` still supply that
    guarantee, over every command here and over the one a later edit adds; nothing below touches
    them. What is added asks a different question and needs no list. This step writes TWO things to
    stdout — the claim, and the `jq` that renders what was placed beneath it — and exactly one of
    them is an `echo`. The claim is found as that unredirected `echo`: an identification that names
    no command and excludes none, where excluding the render BY NAME would have been a list of one.
    It is guarded because it is the claim, not because anybody enumerated what could fail before it.

    AND WHAT IS HELD IS THE GUARD'S IDENTITY, NOT MERELY ADJACENCY — THE DIFFERENCE BETWEEN THE
    PROXY AND THE PURPOSE. That nothing executable stands between the claim and a closed guard is a
    proxy, and a sound one; it is not the sentence this Rule is cited for. Insert an unrelated
    guarded branch between the placement and the claim and adjacency still holds while the claim has
    stopped standing inside the path of the thing it claims — true today, and no longer true for the
    reason it is quoted. So the guard immediately above the claim is identified by what its CONDITION
    DOES: it performs the placement, naming the path the ledger later reads. Still one command, still
    one claim, still no enumeration — and a command added in that gap reds this scenario whatever it
    is, whether or not anybody thought it could fail. @SCN-MUT-015's fourth arm cannot see any of
    this: it holds that every non-terminal `exit` is a branch's and says why on stderr first, which a
    new branch satisfies by construction and which the defect never violated. The proxy/purpose slip
    is written down here rather than left implied because on this axis it is the recurring one — the
    proxy keeps being right and the prose keeps spending it.

    AND THE WORDING IS NOT ASSERTED. The stderr sentence tells a placement this runner could not make
    apart from a sweep that has stopped running, because a reader who meets `missing` needs to know
    which of the two they are looking at. That is the sentence's job, and it is written down here
    rather than pinned in the arm, for the reason @SCN-LDG-030 gives: an arm that pins wording reds
    on an improvement to it.

    AND THE RENDER BENEATH THE CLAIM IS LEFT EXACTLY AS IT IS. The `jq` reports what was placed,
    reached only after the placement succeeded and the shape check passed. A failure there is the
    runner's, it reports itself on stderr, and it asserts nothing. Guarding it would be symmetry
    rather than a reason.

    AND THE BORROW IS STILL NOT AN ARBITER. The added branch places nothing, says why on stderr, and
    exits 0, like every branch above it. `set +e` stays first, `set -u` stays on, `exit 0` stays
    last. What moves is what the step SAYS on one path, never whether it reds on any.

    @unit @SCN-MUT-018
    Scenario: a placement this runner could not make says so on stderr — the one sentence claiming a measurement was placed stands inside the path that placed it
      Given the workflow every push runs
      When the sentences its borrow step prints about what it placed are read back
      Then it writes exactly one echo of its own to stdout, and that is the sentence claiming a measurement was placed
      And that sentence stands immediately inside the path of the guard whose condition performs the placement, so nothing runs between the placing and the claiming
      And a placement that guard could not make says why on stderr, places nothing, and exits 0 like every branch above it

  Rule: a measurement stamped with a superseded @SCN answers the row that supersedes it, for exactly as long as the producer has not caught up

    THE ONE ROW A MINT CANNOT REACH, AND THE REASON IS A SCHEDULE RATHER THAN A COUPLING. Every
    other converted row's `@SCN` renames inside one tree: the corpus, the manifest and the citing
    surfaces move in one commit and nothing outside the commit has an opinion. A MEASURED row's
    number is stamped with its `@SCN` by whatever produced it, and this one's producer is a nightly
    sweep on the gated branch. Rename the row and the newest record any build can reach was written
    by the code being replaced, so the two are keyed apart until a sweep has run on the renamed
    tree. There is no atomic version of that: rename and the tree reds until a schedule fires, wait
    for the schedule and the rename was not atomic.

    SO THE ROW STATES WHICH CODE ITS MEASUREMENT MAY STILL ARRIVE UNDER, AND A ROW THAT STATES
    NOTHING KEEPS THE ONE-CODE READING. This is `notExaminedExit`'s shape and it is that shape for
    the same reason: what a producer stamps is a fact about the producer, so the row the producer
    answers is where it is written down. Opt-in, per row, never inferred — a row silent on the point
    accepts only its own code, which is what every row had before any row could ask, so nothing
    already written changes meaning by standing still.

    AND IT IS TWO CODES FOR ONE ROW, NEVER A LOOSER RULE ABOUT RECORDS. A superseded code is
    answered because the record PREDATES the rename, and never because the record is old — those
    are different facts and only the first is a reason. This widens WHICH CODE COUNTS and leaves
    WHICH RECORD COUNTS exactly where it was: a measurement carries no clock of its own, and the
    window that keeps a lapsed sweep's number out is applied against the producing run's own clock
    where the record is placed, before any code in it is read. A reader that had taken the age into
    its own hands here would be the swallowed guarantee this Rule exists to keep unreachable.

    IT IS A CONTRACT WITH AN END, AND THE END IS ONE SWEEP AWAY. The producer moves to the new code
    in the same change; the first nightly after it stamps the new code, and from then on the
    superseded code answers nothing because no record carries it. The statement on the row is what
    a later reader removes, and it is written where they will find it.

    @unit @integration @SCN-MUT-019
    Scenario Outline: a measurement stamped with a superseded code answers the row that supersedes it, and a row stating no superseded code keeps the one-code reading
      Given a sweep record holding one measurement, stamped with the scenario "<stamped>" on the check "mutation"
      And a row measuring "mutation" on the scenario "SCN-FIT-002", which <supersession>
      When that row's check is asked for its measurement
      Then it <answer>
      And what keeps a lapsed sweep's number out is untouched: the measurement carries no clock of its own, and the window is applied against the producing run's own clock where the record is placed, before any code in it is read

      Examples:
        | stamped     | supersession                            | answer                                         |
        | SCN-MUT-011 | states that it supersedes "SCN-MUT-011" | answers with the number that measurement holds |
        | SCN-MUT-011 | states no superseded code               | refuses, naming the row it could not find      |
        | SCN-FIT-002 | states that it supersedes "SCN-MUT-011" | answers with the number that measurement holds |
        | SCN-LNT-001 | states that it supersedes "SCN-MUT-011" | refuses, naming the row it could not find      |
