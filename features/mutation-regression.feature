@MRG
Feature: Red the push that lost a kill — the runner's own per-mutant record, read against this run's report

  A MUTATION SCORE IS ONE NUMBER, AND ONE NUMBER CANNOT SAY WHAT WENT MISSING. The fault this
  repository exists to catch is a suite that has stopped noticing something it used to notice —
  the test removed to make a red go away, the assertion widened until it holds for anything. Held
  against a bar, that fault is three orders of magnitude too small to see: a suite killing 807 of
  836 mutants loses one kill and still scores 96.4%, which clears every conventional bar there is.
  A bar is a floor for a suite that has collapsed. It is not the detector.

  THE DETECTOR IS PER-MUTANT, AND ITS RECORD IS THE RUNNER'S OWN. A mutation run leaves behind a
  report naming every mutant it made — the file it was made in, where in that file, what the code
  was changed to, and what happened when the suite met it. A report of that shape from an earlier
  run, read against this run's report of the same shape, answers the question a score cannot: not
  "is the number lower" but "which mutant was caught before and is not caught now". Nothing in
  that record is typed by a person, banked by a command, or kept fresh by anybody remembering —
  it is the by-product of a run that already happens, and the mechanism is what makes it so.

  THE COMPARISON IS PURE, AND IT IS ALL THIS FEATURE IS ABOUT. What lives here is the reading of
  two reports against each other and the verdict that follows. Where the record comes from, how a
  run is launched, and what a process does with the verdict are the surrounding machinery's, and
  a comparator that reached for any of them would be a comparator nothing could put a second
  pair of reports in front of.

  Rule: a mutant the record detected and this run does not is a lost kill, and the run ends on it

    DETECTED IS TWO STATUSES AND EVERYTHING ELSE IS NOT. A mutant is detected when it was killed
    or when it timed out: in both the suite noticed, once by an assertion firing and once by the
    code never coming back. Every other status a run can reach is a mutant the suite did not
    notice, whatever the reason — nothing covered it, nothing failed on it, it faulted, it would
    not build, or the run was told to skip it. The kills are the thing being conserved, so the
    question asked of this run is only ever whether the kill is still there.

    WHICH IS WHY THE LOSS IS NOT SPELLED "SURVIVED". The obvious reading — a kill is lost when the
    mutant survives — was measured wrong in this very repository. Removing the one test that
    covered a killed mutant returned it as never-covered, not as survived: the coverage left with
    the assertion, and a comparison reading only survivors would have watched the fault it exists
    for go straight past. So the undetected side is every status that is not one of the two, and
    the row that proves it is the one the plant actually produced.

    THE NAME IS FOR SOMEBODY WHO DID NOT WRITE THE TEST. A lost kill is reported by the file the
    mutant was made in, the line it was made at, and the mutator that made it — which is enough
    to open the file and see the change — together with both statuses, the one the record held and
    the one it came back as. A count on its own sends its reader to a report of 836 entries to
    find out which one moved.

    AND A KILL STILL BEING MADE IS NOT A LOSS, which is the assertion that stops every one above
    it being satisfied by a comparison that answers "lost" to everything. Each example below holds
    a second mutant the record detected and this run detects too, and it is never named.

    @unit @integration @SCN-MRG-001
    Scenario Outline: a mutant the record detected that this run does not is a lost kill, named by its file, its line and its mutator — whichever undetected status it came back as
      EVERY ROW IS THE SAME LOSS ARRIVING UNDER A DIFFERENT WORD, and each one is green under a
      comparison that spells the undetected side as a list rather than as the complement of the
      kills. The measured plant returned the second row, so it is the row that is not hypothetical:
      the covering test was removed, the mutant came back never-covered, and the kill was gone. The
      last row is the same argument on the other side of the comparison — a timeout is a kill, so a
      mutant that used to time out and now survives has lost one, and a reader watching only for
      killed-to-survived never sees it.

      Given a recorded sweep in which one mutant was <recorded as> and a second mutant beside it was killed
      And this run comes back with that first mutant <came back as>, and the second still killed
      When this run is read against that recorded sweep
      Then the first mutant is the one kill this run has lost
      And the lost kill names the file the mutant was made in, the line it was made at, and the mutator that made it
      And the lost kill names both statuses — the one the record held, and the one it came back as
      And the second mutant is named nowhere, because this run detects it still

      Examples: every kill a record can hold, against every status that is not one
        | recorded as | came back as  | what this row separates                                                          |
        | killed      | survived      | the plain case — an assertion that used to fire has stopped firing               |
        | killed      | never-covered | the covering test left with the kill, which is the shape the measured plant took |
        | killed      | faulted       | the mutant now errors where it used to be caught, and nothing asserted anything  |
        | killed      | uncompilable  | the mutant no longer builds, so the suite was never put to the question at all   |
        | killed      | skipped       | a mutant the run was told to pass over is a mutant nothing caught                |
        | timed out   | survived      | a timeout is a kill, so a timeout that stops timing out is a kill lost           |

    @unit @SCN-MRG-002
    Scenario: a mutant the record did not detect that this run kills is a gain, and it passes with nobody asked to bank it
      A SUITE THAT HAS GOT BETTER IS NOT A SUITE THAT HAS BROKEN, and the mechanism this one
      replaces could not tell those two apart. Its record was a pair of numbers and its recorder was
      up-only: a tree measuring better than its record was refused until somebody typed the new
      numbers in, and a tree whose mutant population had grown was refused outright, because more
      mutants with their kills intact reads as a falling score. So the commonest move a change makes
      — more code, more mutants, the kills still being made — arrived as a red telling its reader to
      go and bank the improvement.

      PER MUTANT THERE IS NOTHING TO BANK. A mutant the record did not detect and this run kills has
      moved in the only direction anybody wanted, and the next run's record is this run's report,
      written by the runner because it runs. Nothing is typed, nothing is refused, and no command
      exists to record it — which is the whole of what the banking step is replaced by.

      WHICH IS WHY THE GAIN IS CLASSIFIED RATHER THAN MERELY TOLERATED. A comparison that reds on an
      improvement and one that never looked at an improvement are the same build from outside: both
      say nothing about the mutant that got better. So the gain is named on its own side of the
      verdict, by the file, the line and the mutator a loss is named by, and the run still ends
      clean.

      Given a recorded sweep in which one mutant survived, a second mutant beside it was killed, and a third also survived
      And this run comes back with that first mutant killed, the second still killed, and the third never-covered
      When this run is read against that recorded sweep
      Then this run has lost no kill, so nothing is asked of anybody
      And the first mutant is the one kill this run has gained
      And the gain names the file the mutant was made in, the line it was made at, and the mutator that made it
      And the gain names both statuses — the one the record held, and the one it came back as
      And the second mutant is a gain nowhere, because the record detected it already
      And the third mutant is a gain nowhere either, because a mutant moving between two statuses the suite noticed nothing by has gained no kill

    @unit @SCN-MRG-003
    Scenario: a mutant this run holds that the record does not is new code's, and is neither a loss nor a gain
      THE POPULATION GROWS ON NEARLY EVERY CHANGE, AND THAT USED TO BE THE RED. The mechanism this
      one replaces held two totals, and a tree carrying more mutants with its kills intact scores
      lower than the same tree carrying fewer — so the commonest thing a change does arrived as a
      falling number its recorder refused to accept. The argument that a score moves for two
      unrelated reasons and one number cannot separate them is a true argument, and it is an
      argument about a total. Per mutant there is nothing to separate: this run holds a mutant the
      record has no entry for, so the record detected nothing by it, lost nothing by it, and was
      never put to the question about it at all.

      AND IT SETTLES NOTHING HERE EVEN WHEN IT SURVIVES. A mutant nothing kills, in code nothing
      covers yet, is a fact about coverage — answered by the sweep's own score against its floor,
      which is the instrument that reads a whole population. Read as a loss instead, every push
      adding a line ahead of its test would end on a regression it did not cause, and a gate that
      reds on ordinary work is a gate people learn to route around.

      THE TWO WRONG ANSWERS EACH NAME SOMETHING, WHICH IS WHY THE NEW MUTANTS STAND NEXT TO OLD
      ONES. A comparison joining on the file and the mutator alone pairs each new mutant with the
      recorded mutant beside it and reports the pairing — a lost kill for the one, a gain for the
      other. A comparison reading "detected now, and not detected in the record" pairs nothing and
      still calls the new kill a gain. Neither is caught by asking whether nothing was named, so
      the sweep below carries a real lost kill and a real gain that must both still be named: a
      comparison that has gone quiet fails here as plainly as one that answers to everything.

      Given a recorded sweep in which one mutant was killed and a second mutant beside it survived
      And that same sweep held a third mutant killed and a fourth mutant surviving
      And this run comes back with the first still killed, the second still surviving, the third now surviving and the fourth now killed
      And this run holds two mutants besides, neither of which the recorded sweep has any entry for — one surviving, in the file and by the mutator of that first recorded kill, and one killed, in the file and by the mutator of that second recorded survivor
      When this run is read against that recorded sweep
      Then the third mutant is the one kill this run has lost
      And the fourth mutant is the one kill this run has gained
      And the surviving mutant the record has no entry for is no lost kill, because a kill the record never made is a kill this run cannot have lost
      And the killed mutant the record has no entry for is no gain, because a mutant the record was never put to the question about has improved on nothing

  Rule: what the comparison could not see, it counts and says

    A MUTANT CARRIES NO NAME FROM ONE RUN TO THE NEXT, so the two sides are joined on what both of
    them say about it — the file it was made in, the mutator that made it, what the code was
    replaced with, and the span it occupies. That join is exact because anything looser pairs
    mutants that are not the same mutant and reports the pairing as a movement neither of them
    made. Exact is the right answer, and it leaves a residual: a push that edits a source file
    moves every mutant below the edit, so the record's entries for that file match nothing this
    run names.

    THOSE ENTRIES ARE NOT LOST KILLS. The kill each one describes may still be being made six
    lines further down by the same test that always made it, or the code it was made in may be
    gone altogether — and neither of those is a suite that has stopped noticing something. Read as
    losses they red every push that edits a file, which is very nearly every push, and a gate that
    reds on ordinary work is a gate people learn to route around.

    AND THEY ARE NOT NOTHING, WHICH IS THE HALF A SILENT DROP GETS WRONG. A comparison that could
    see 41 of a record's 836 mutants and a comparison that could see all 836 both end on "no kill
    was lost", and the first of those sentences is worth almost nothing. What separates them is not
    what FAILED but what stopped being COUNTED — so the number compared and the number compared by
    nothing are both stated, and a reader can tell an answer about a whole record from an answer
    about a corner of one.

    @unit @SCN-MRG-004
    Scenario: mutants the record holds that this run's report does not name are reported as uncompared, with their number, rather than read as lost kills
      THE ENTRIES THIS RUN DOES NOT NAME ARE THE ONES A LOOSER JOIN WOULD PAIR UP, and that is what
      makes them worth planting rather than merely absent. Each sits in the file and under the
      mutator of a mutant this run does name, differing only in where it is — so a comparison
      joining on the file and the mutator alone finds a partner for every one of them, reports the
      pairings as movements, and counts nothing as uncompared at all. A comparison that drops them
      in silence also counts nothing as uncompared. The two are told apart by which of the other
      numbers moved: the silent one still reports one lost kill, the loose one reports four.

      AND THE NUMBER IS READ AGAINST A SECOND RUN WHERE IT MUST MOVE. Three of five is a number a
      comparison could arrive at by returning a constant, so the same record is read again against
      a run that names every entry it holds, where the uncompared must fall to none and the
      compared must rise to all five.

      Given a recorded sweep of five mutants, of which this run's report names two — a kill this run still makes, and a kill this run no longer makes
      And each of the three the record holds that this run does not name is in the file and by the mutator of a mutant this run does name, at a line further down
      When this run is read against that recorded sweep
      Then the comparison says it compared two mutants and that three were compared by nothing
      And every mutant the record held was either compared or counted as uncompared, and no mutant was both
      And none of the three is among this run's lost kills, because a run that never named a mutant has been put to no question about it
      And the one compared kill this run no longer makes is still the whole of what this run has lost
      And the comparison says all three numbers in one sentence, so an answer about a corner of the record cannot be read as an answer about the whole of it
      And that same record, read against a run that names every entry it holds, counts five compared and none uncompared

  Rule: no record is not "no regression"

    A RUN THAT FOUND NO RECORD HAS NOT OBSERVED THAT NO KILL WAS LOST. It has observed nothing,
    and those are two different sentences that must never be allowed to wear one word. The
    comparison above answers "which kill went missing" by reading one report against another; put
    in front of a record that is not there, that same machinery has nothing to read and nothing to
    say — and the shape of the fault is that "nothing to say" arrives looking exactly like "nothing
    went wrong". A gate green because it found no regression and a gate green because it found no
    record are the same build from outside, and only one of them is a gate.

    THE READING THAT COLLAPSES THE TWO IS A LENIENT ONE, AND IT WAS ALREADY HERE. A reader handed a
    document it cannot make sense of can always hand back no mutants at all, which is a true
    statement about what it managed to read and a false one about the record. No mutants flows into
    the comparison, the comparison compares nothing against nothing, no kill is lost, and the run
    ends clean over a record that was never there. So the refusal belongs at the READER, in what it
    hands back: a verdict cannot tell an absent record from a record with nothing lost, because
    both of them produce no losses, and a check written against the verdict would watch this one go
    straight past.

    A RECORD CAN FAIL TO BE ONE IN FOUR WAYS, AND THEY ARE FOUR DIFFERENT REPAIRS. There may be
    nothing at all where the record was looked for — a placement that fetched nothing, a scheduled
    sweep that has not run yet. What is there may not be readable. It may be readable and not be a
    mutation record at all — the wrong file, a page of somebody's error. Or it may be a mutation
    record in good order that holds no mutant, which is the subtlest of the four because everything
    about it is well-formed and the comparison over it is perfectly clean. Each is said in its own
    words, because a reader who cannot tell the four apart cannot tell which of them to go and fix.

    AND THE REFUSAL SAYS WHAT IT LOOKED FOR. "There is no record" sends its reader hunting for a
    thing only the run knows the name of; the record it went looking for, named, is the difference
    between a sentence somebody can act on and a sentence somebody has to investigate first.

    @unit @integration @SCN-MRG-005
    Scenario Outline: a record that is absent, unreadable, shapeless or holding no mutant settles nothing and says what it looked for — never a clean comparison
      THE LAST ROW IS THE ONE THAT WOULD GO PAST. The first three are broken in ways anything
      reading them would notice; a mutation record holding no mutant is well-formed, reads back
      without complaint, and compares perfectly cleanly against any run at all. It is the row a
      reader guarding only against damage lets through, and the one whose clean comparison would be
      quoted back afterwards as evidence that no kill was lost.

      AND THE LAST STEP IS WHY THE FOUR ABOVE IT ARE NOT SATISFIED BY REFUSING EVERYTHING. Every
      assertion above it says that something did NOT happen, and a reader that settles nothing
      whatever it is handed satisfies all of them while being no more use than one that settles
      everything. So every row also puts a record that IS in good order in front of the same
      reader, where it must settle — its mutants compared, and no kill lost.

      Given a recorded sweep that <is>
      When that recorded sweep is read
      Then it settles nothing, and is never read as a run that lost no kill
      And what it says names the recorded sweep it looked for
      And what it says of this one is <the reading>
      And no other way a recorded sweep can fail to be one says the same thing
      And a recorded sweep in good order, read the same way, settles instead — its mutants compared, and no kill lost

      Examples: the four ways a recorded sweep settles nothing
        | is                                                | the reading                               | what this row separates                                                                  |
        | is not there at all                               | there is nothing there to read            | the placement fetched nothing, or the scheduled sweep has not run yet                    |
        | is there and cannot be read                       | what is there is not readable             | something is at the name, and whatever it is, a run did not write it                     |
        | is readable and is not a record of a mutation run | what is there is not a mutation record    | the wrong artefact entirely — readable, well-formed, and about something else            |
        | is a record of a mutation run holding no mutant   | it is a mutation record holding no mutant | the subtle one: nothing is damaged, and the comparison over it is clean and says nothing |

  Rule: the run that calls it carries the verdict out

    THE COMPARISON ABOVE ANSWERS A QUESTION AND SETTLES NOTHING BY ITSELF. It reads two lists and
    hands back a verdict, which is a value in a program's memory: no push has reded on it, no log
    carries it, and nothing has been told. Something has to stand at the edge — find the two reports
    on a disk, put them in front of that rule, and carry what comes back out to where a pipeline can
    see it. That carrying is a behaviour of its own with its own ways of being wrong, which is why
    it is a Rule here and not an implementation detail of the ones above.

    IT CARRIES THE VERDICT OUT TWICE, AND THE TWO ROUTES ARE FOR TWO READERS. A lost kill ends the
    run in failure, because somebody watching the log should not have to wait for a reconciliation
    to learn that a kill went missing. And the number of kills lost is written into this run's
    credit stream, because the ledger is what holds it to none. Nothing at this edge reads a
    threshold: a command comparing its own number against its own bar is the runner marking its own
    homework, and one number with two arbiters is a green that lasts until they disagree.

    A RECORD IT COULD NOT READ IS WHERE THOSE TWO ROUTES PART COMPANY. Nothing was compared, so
    nothing was lost and nothing was measured: there is no verdict for the run to end in failure on,
    and there is no number to post. What reds is the ledger, over a row reading as a check that
    never ran — which is the true sentence. The alternative is an edge inventing a nought for a
    comparison that never happened, a claim about the suite assembled out of a fault in the
    machinery reading it.

    AND WHAT IT SAYS IS ITS OWN SENTENCE, NEVER A PROGRAM FALLING OVER. Nothing at the name is the
    ordinary case on the first push after this gate is turned on, and an unhandled fault reaches its
    reader as a stack trace — which names a line of somebody's source rather than the record, says
    nothing about what was looked for, and reads like a broken check instead of an unanswered
    question. The reading belongs to the rule that made it, in that rule's words, carried out
    unchanged.

    @integration @SCN-MRG-006
    Scenario Outline: the command ends on its verdict — a lost kill in failure naming every one, a clean comparison cleanly, and a record it could not read as its own reason rather than a stack trace
      EVERY ROW STARTS THE CHECK THE WAY A PIPELINE STARTS IT, which is the whole of what this
      scenario adds to the rules above. The comparison is already proven over lists somebody composed
      for it; what stays unproven until a process is really started is everything between a command
      line and a verdict — where the two reports are looked for, what is written into the credit
      stream, and the one thing a value in memory cannot carry at all, which is how the run ended.

      AND THE THREE ROWS ARE THE THREE ENDINGS, SO NONE OF THEM IS SATISFIED BY ANOTHER'S ANSWER. A
      check that failed on everything passes the first row and fails the other two; one that passed
      on everything fails the first. What separates the second row from the third is not how the run
      ended, because both end cleanly — it is what was credited. A comparison that found nothing lost
      credits a nought, and a run that read no record credits nothing at all, which is what leaves
      the ledger a row reading as a check that never ran.

      Given a recorded sweep and a report from this run in which <the pair>
      When the check that reads the two of them is run
      Then the run that read them ends <how>
      And what it says of this run names <what it says>
      And it reaches that on its own account, with nothing of a program falling over reaching its reader in place of it
      And what this run lost is credited to the ledger as <credited>

      Examples: the three ways a run ends, and what each one credits
        | the pair                                                                   | how        | what it says                                                                                | credited                                                                |
        | the record holds two kills this run no longer makes, beside one it still does | in failure | every kill this run has lost and no kill it still makes, by the file, the line and the mutator of each | two lost kills                                                          |
        | every kill the record holds is a kill this run still makes                  | cleanly    | how much of the record it compared, what it lost, and what it could compare against nothing | no lost kill                                                            |
        | there is no recorded sweep where this run looked for one                    | cleanly    | the reason it settled nothing, and the recorded sweep it looked for, by name                | nothing at all, because a run that compared no mutant has measured none |
