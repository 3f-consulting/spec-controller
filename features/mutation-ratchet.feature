@RAT
Feature: Ratchet a mutation gate against the record it last banked — the no-regression verdict, as a library that names no project of its own

  THE VERDICT IS THE PRODUCT, AND IT WAS BUILT IN THE WRONG PLACE FIRST. A mutation sweep
  produces one number, and a bar can only ask whether that number fell. The interesting question
  is WHY it fell, and there are two unrelated answers a single number cannot separate: a mutant
  this suite used to kill now survives, which is the fault the gate exists for; or new mutable
  code arrived carrying survivors with it, which is not a fault at all. Recording the COUNTS
  rather than the score is what lets the two be told apart — kills lost is stated directly, and a
  growing population moves `total` while leaving `detected` alone.

  WHY IT IS WRITTEN AS A LIBRARY AND NOT AS THIS REPOSITORY'S OWN SCRIPT. That argument is a fact
  about mutation testing, not about any one repository, and it is now settled in one. Nothing
  publishes this module — each project owns its own no-regression gate, and this one is the gate
  this repository runs — so a second repository that wants the reasoning LIFTS it rather than
  importing it, and a module carrying its first home's terms is not liftable at all. Each project
  keeps owning its BAR: the figures live in that project's own record file, under a name of its own
  choosing, and its own CI runs the gate. What is shared is the reasoning.

  AND SO EVERY TERM A PROJECT OWNS IS AN INPUT. Which record file, which gates it holds, where a
  gate's report lands, which tree is being judged, and what to type to bank a measurement — all
  of them arrive from the caller. Nothing below names a project, a check, a runner, a workflow or
  a repository, and that is asserted rather than intended: a second project's config drives every
  Rule here to different verdicts on different numbers.

  IT IS NOT A STATIC CHECK, and it takes no `static-check:` prefix. A static check is a pure
  function of the checked-out tree; this reads a MEASUREMENT, which by construction is not in the
  tree. It is the standing ruling every scheduled-sweep reader in this portfolio already carries.

  Rule: a gate's record is a pair of counts and the allowance stated against them

    AND A NON-ZERO ALLOWANCE WITH NO REASON IS A MALFORMED RECORD, REFUSED AT THE LOADER — a
    mandated row of @SCN-RAT-002's table rather than a case left to the reconciler downstream. An
    allowance nobody can justify is head-room, not tolerance, and head-room admitted at read time
    is a bar nobody wrote being enforced as though somebody had.

    THE FLOOR IS DERIVED, NEVER STORED, AND IT IS A REPORTED FIGURE RATHER THAN THE DECISION
    VARIABLE. The allowance is spent from the NUMERATOR — out of the kills — because it is
    counted in mutants, and a mutant is worth a different number of points in every gate; taking
    it off the score instead would make the same allowance mean two different things in two
    gates of different sizes. What the floor is FOR is a reader who wants the bar in the units
    the sweep reports. The verdict Rule below decides on counts, and the two part company the
    moment the population moves — which is exactly the confusion the counts model exists to
    prevent, so it is said here, where the floor is defined.

    @unit @integration @SCN-RAT-001
    Scenario: a record hands back each gate's counts, the allowance it states, and the floor those two imply
      Given a ratchet record states that gate "domain" last detected 2175 of 2243 mutants, allowing 1 with a reason
      And that same ratchet record states that gate "state-model" last detected 202 of 254 mutants, allowing none
      When that ratchet record is read
      Then the ratchet record holds exactly the gates "domain, state-model"
      And the ratchet record for gate "domain" states 2175 kills of 2243 mutants and an allowance of 1
      And the ratchet record for gate "domain" carries the reason its allowance was given
      And the ratchet record for gate "state-model" states 202 kills of 254 mutants and an allowance of 0
      And gate "domain" reports a floor of the 2174 kills its allowance leaves over 2243 mutants
      And gate "domain" reports a floor below the score it recorded
      And gate "state-model" reports a floor equal to the score it recorded, because it allows nothing

    @unit @SCN-RAT-002
    Scenario Outline: a record that cannot be read as a bar is refused, naming the gate and the field — never read as a bar of its own
      MALFORMED MEANS NO BAR, NEVER A DEFAULTED ONE. Every row of the table below is a record a
      lenient reader would answer with a bar nobody wrote: an absent section read as "no gates to
      enforce", a gate that measured nothing read as scoring zero, an allowance nobody justified read
      as justified. A bar nobody wrote is then enforced as though somebody had, and the only signal
      that it happened is a build that stopped being able to red. So the reader refuses, and the
      refusal says which record it read and where in that record the fault is — a file of
      near-identical gate blocks and a bare "invalid config" is what leaves a reader hunting.

      THE LAST ROW IS THE ONE THAT MAKES THE RULE TOTAL RATHER THAN NEARLY TOTAL. A gate recorded
      twice is already caught, but by the YAML parser, and it arrives as the parser's own error type
      — so a caller that catches this module's refusal and nothing else sails straight past it. It is
      normalised into the same refusal as every other row here, which is what lets "a malformed
      record fails loudly" be a property of the reader rather than a property of the field checks
      alone.

      Given a ratchet record in which <fault>
      When that ratchet record is read
      Then reading it is refused, and no bar is handed back
      And the refusal names the record it read, and where in that record the fault is

      Examples: every shape of malformed record, each one a bar nobody wrote if it were read leniently
        | fault                                                |
        | there is no section holding gates at all             |
        | the section holding gates holds no gate              |
        | a gate measured no mutants at all                    |
        | a gate detected more mutants than it measured        |
        | a gate allows more kills than it recorded detecting  |
        | a gate's count is not a whole number of mutants      |
        | a gate allows a kill and says nothing about why      |
        | the same gate is recorded twice                      |

    @unit @SCN-RAT-003
    Scenario: a gate the record does not hold is refused by name, rather than passing as a gate with no bar
      THIS IS THE ONE FAULT IN THE RULE THAT LOOKS LIKE NOTHING AT ALL. Every refusal above is a
      record somebody wrote badly, sitting in the file a reader would go and open. This one is a
      record that reads perfectly and a caller asking it for a gate it never held — a gate name
      mistyped where the caller states it. The lenient answer is not a wrong bar but NO bar:
      "nothing recorded for that one", which reads as a gate with nothing to enforce and greens
      for as long as the typo survives. Nothing about the record is wrong, so nobody is ever sent
      to look at it, and the sweep goes on running and being ignored.

      AND THE REFUSAL LISTS THE GATES THE RECORD DOES HOLD, which is what turns a typo into a
      one-line diagnosis instead of an errand. The gates of a record are near-neighbours by
      construction — a project names them after the scopes it is quarantining from each other — so
      a refusal naming only the gate that was asked for sends its reader off to open the file and
      compare spellings by eye, which is the work the refusal was supposed to have done.

      Given a ratchet record holding bars for the gates "domain, state-model"
      When gate "domian" is asked of that ratchet record
      Then that gate is refused by name, and no bar is handed back
      And the refusal names the record it was read from, and lists every gate that record holds
      And a gate the ratchet record does hold is still answered with the bar it states

  Rule: a run is reconciled on kills, and the score only ever separates the two innocent drops

    THE BOUNDARY IS PINNED FROM BOTH SIDES, AND IT IS THE ONE PLACE THIS RULE CAN BE SILENTLY
    WRONG. `D == D₀ − slack` is the last measurement the allowance covers and `D == D₀ − slack − 1`
    is the first it does not; the two sit one mutant apart and no other example separates them.
    Whichever comparison gets typed first — `<` or `<=` — is green against every other row in this
    Rule, so the off-by-one hides in either direction. One example each side, and it cannot.

    @unit @integration @SCN-RAT-004
    Scenario Outline: fewer kills than the record less its allowance is a regression — whether or not the population also grew
      THE KILLS ARE ASKED ABOUT FIRST, AND ASKED ABOUT ALONE. A run that loses kills while its mutant
      population grows is the shape every looser reading of this Rule gets wrong. The growth is a true
      fact about that run and it is innocent on its own, so a reconciler that notices it before it
      counts the kills answers with the innocent half and hands back a green — the score fell, the
      population explains why, nobody looks any further. The kills are what the gate exists for, so
      the population's movement is never allowed to be the answer while a kill is missing.

      AND THE FLOOR IS STATED, NEVER CONSULTED. The verdict carries the floor the record implies
      because a reader arriving from the sweep has a percentage in front of them and wants the bar in
      the units they are already holding. It is not what the verdict was decided on. The two agree
      exactly while the population holds still, which is why the difference is said out loud here
      rather than left to be inferred from a message that happens to read the same either way.

      Given a ratchet record states that gate "domain" banked <recorded kills> kills of <recorded mutants> mutants, allowing <allowance>
      When that gate's run is reconciled against the ratchet record, having measured <measured kills> kills of <measured mutants> mutants
      Then the ratchet reds that run as a regression, and the gate does not stand
      And the verdict names the <lost> kills lost and the allowance of <allowance> they were measured against
      And the verdict names both count pairs — the <recorded kills> of <recorded mutants> recorded, and the <measured kills> of <measured mutants> measured
      And the verdict states the floor the ratchet record implies, as a percentage
      And the verdict says a mutant this suite used to kill now survives, and sends its reader to the run's own report

      Examples: every run below has lost more kills than its allowance covers, and each one loses them differently
        | recorded kills | recorded mutants | allowance | measured kills | measured mutants | lost | what this row separates                                                                   |
        | 2175           | 2243             | 3         | 2160           | 2243             | 15   | kills lost with the population unmoved — the plain case                                   |
        | 2175           | 2243             | 3         | 2160           | 2400             | 15   | kills lost AND the population grew — the growth is not allowed to be the answer           |
        | 2175           | 2243             | 3         | 2171           | 2243             | 4    | one kill past the allowance — the first measurement the allowance does not cover          |

    @unit @SCN-RAT-005
    Scenario Outline: a kill lost inside the allowance passes, and says out loud why the allowance exists
      THE ALLOWANCE IS SPENT IN PUBLIC OR IT IS NOT SPENT AT ALL. A gate that quietly absorbs a lost
      kill because a figure in the record said it could is a gate that has moved, and the move stays
      invisible for exactly as long as nobody re-derives it. So this passes and REPORTS: how many
      kills went missing, how wide the allowance is, both count pairs, and — the half a bare pass
      always drops — the reason the record itself gives for that allowance existing. That reason is
      the standard the allowance answers to, the gate's own measured non-determinism, and a standard
      nobody is shown is one nobody can notice has stopped being true.

      AND THE SECOND ROW IS THE BOUNDARY, WHICH IS WHY IT IS NOT LEFT TO THE PLAIN CASE ABOVE IT. A
      run measuring exactly the record less its allowance is the last one the allowance covers, and
      one kill further down is @SCN-RAT-004's red twin. The plain row is green under a comparison
      that stops one mutant early and under one that does not alike, so it separates nothing; this
      row is the only example in the Rule that reds a comparison widened by one, just as its twin is
      the only one that reds a comparison that forgot the allowance was there.

      Given a ratchet record states that gate "domain" banked <recorded kills> kills of <recorded mutants> mutants, allowing <allowance>
      When that gate's run is reconciled against the ratchet record, having measured <measured kills> kills of <measured mutants> mutants
      Then the ratchet passes that run as one inside the allowance, and the gate stands
      And the verdict names the <lost> kills lost and the allowance of <allowance> they were spent from
      And the verdict names both count pairs — the <recorded kills> of <recorded mutants> recorded, and the <measured kills> of <measured mutants> measured
      And the verdict states the reason the ratchet record gives for that allowance

      Examples: both runs sit inside the allowance, and the second sits on the last measurement it covers
        | recorded kills | recorded mutants | allowance | measured kills | measured mutants | lost | what this row separates                                                                     |
        | 2175           | 2243             | 3         | 2174           | 2243             | 1    | a kill lost well inside the allowance — the plain case                                      |
        | 2175           | 2243             | 3         | 2172           | 2243             | 3    | the allowance spent exactly — the last measurement it covers, one mutant from RAT-004's red |

    @unit @SCN-RAT-006
    Scenario: a score that fell with no kill lost passes as a grown population, and asks for the record to be banked
      THIS IS THE DROP A BAR SHAPED LIKE A SCORE CANNOT EXPRESS, AND IT IS WHY THE RECORD KEEPS TWO
      COUNTS. New mutable code arrived carrying survivors with it, so the score fell while every
      mutant this suite used to kill still dies. A score bar reds on that, and the cheapest way back
      to green is then to widen the bar — which spends the gate's teeth on a run that lost nothing,
      and spends them for every real regression that follows. So it passes.

      AND IT PASSES LOUDLY, BECAUSE THE SILENT VERSION IS THE OPPOSITE ERROR. Mutable code arriving
      with survivors on it is a real event, and the record no longer describes the tree it was
      banked from. So the verdict says how many mutants the run measured that the record never held,
      that no kill went missing, the score the growth produced, and what to type to bank it — in the
      caller's own words, because a command worded here would name some project's own script.

      IT IS REACHED ONLY AFTER THE KILLS HAVE BEEN ASKED ABOUT, AND THAT IS THE EDGE OF WHAT IT
      CLAIMS. A run that lost a kill the allowance covers AND grew its population is @SCN-RAT-005's
      pass, not this one, however far its score fell: this verdict's load-bearing sentence is that no
      mutant which used to die now survives, and of that run the sentence is false. The allowance was
      spent, so the pass that names the spend and the record's reason for it is the one that must
      fire; the growth stays visible in the count pairs that pass already carries.

      Given a ratchet record states that gate "domain" banked 2175 kills of 2243 mutants, allowing 3
      And a run of that gate measured 2175 kills of 2400 mutants — every kill the record banked, and 157 mutants the record never held
      And that run's score is below the floor the ratchet record implies, so a bar shaped like a score reds on it
      When that run is reconciled against the ratchet record
      Then the ratchet passes that run as one whose population grew, and the gate stands
      And the verdict names the 157 mutants the run measured that the record never held
      And the verdict says no kill was lost, naming both count pairs — the 2175 of 2243 recorded and the 2175 of 2400 measured
      And the verdict states the score the growth produced, as a percentage
      And the verdict asks for the record to be banked, in the words the caller gives for banking it

    @unit @SCN-RAT-007
    Scenario: a tree measuring better than its record reds as ratchet debt, because the gap between them is head-room
      THIS IS THE CLAUSE THAT TURNS A CEILING INTO A RATCHET, AND IT IS THE ONE A READER'S INSTINCT
      FIGHTS. The suite got better and the verdict reds, which looks like a gate punishing the
      improvement it was built to want. It is not that. The gap between a stale record and a better
      tree is HEAD-ROOM, and head-room is the one thing a bar must never be allowed to accumulate: a
      survivor arriving inside it costs nothing and reds nothing, so the gate goes quiet exactly
      where it was meant to be watching, and stays quiet until the whole gain has been given back.

      THE SAME RULING IS ALREADY MADE ONE LEVEL UP, AND FOR THIS REASON. `complexity-exceptions`
      (@SCN-CPX-003) reds an exception list that disagrees with the tree in EITHER direction — over
      the recorded figure is a regression, under it is an improvement nobody recorded — because a
      recorded figure that has stopped describing the tree has stopped being a bar, whichever side
      of it the tree moved to. A ratchet is a ceiling plus this clause and nothing else.

      SO THE RED IS AN ERRAND RATHER THAN A PUNISHMENT, AND THE VERDICT HAS TO READ AS ONE. It says
      how many points better the tree measured, both count pairs so which figure moved is visible,
      and then the two figures banking would write beside what to type to write them — in the
      caller's own words, because a command worded here would name some project's own script.
      Clearing it is one command, after which the gate stands where the tree now is.

      Given a ratchet record states that gate "domain" banked 2175 kills of 2243 mutants, allowing 3
      And a run of that gate measured 2200 kills of 2243 mutants — 25 kills the record never banked, over the very same population
      And that run's score is above both the floor the ratchet record implies and the score it banked, so a bar shaped like a ceiling greens it
      When that run is reconciled against the ratchet record
      Then the ratchet reds that run as ratchet debt, and the gate does not stand
      And the verdict states how many points better the tree measured than the record holds
      And the verdict names both count pairs — the 2175 of 2243 recorded and the 2200 of 2243 measured
      And the verdict says the gap between them is head-room, which a later survivor would arrive inside unnoticed
      And the verdict names the two figures banking would write, and asks for them in the words the caller gives for banking

    @unit @SCN-RAT-008
    Scenario Outline: a run sitting exactly on its record passes, saying only that
      THE BORING ONE, AND THAT IS PRECISELY WHY IT IS WRITTEN DOWN. Four readings above this one
      each claim a run for a reason they state out loud; this is what is left, and what is left
      arrives by falling THROUGH every one of them. A fall-through has no condition of its own to
      get wrong, which is its whole virtue and also the only way it can lie: a run one of the arms
      above should have claimed and did not lands here and is greened, and the run that was
      quietly swallowed looks, on the way out, exactly like this one does.

      SO THE VERDICT SAYS ALMOST NOTHING, AND THE ALMOST IS THE POINT. Both count pairs and the
      score they share, because a reader who wants to know a run held its ground wants to see the
      two figures it held against. Nothing else: no kills lost, because none were; no head-room,
      because there is none; no floor, because nothing came near one; no reason for an allowance
      nothing spent; and above all NO ASK, in any caller's words. The two loud greens either side
      of it each end in one, and a quiet green that ends in an ask is a green whose reader stops
      being able to tell the two apart.

      AND IT IS READ ON THE SCORE RATHER THAN ON THE COUNTS, WHICH IS WHAT THE SECOND ROW IS FOR.
      The arms above part on `<` and `>` of the same two products, so EQUAL is the one answer
      neither can give — and equal is a fact about the ratio, not about the pair. The first row
      holds both counts still, which is what separates this reading from a grown population. The
      second moves both and holds the ratio, which separates a fall-through that is genuinely
      unconditional from one written as "the very same two counts" with a refusal left behind it;
      those two agree on every row but this one.

      AFTER THIS THERE IS NO RUN THE RECONCILER CANNOT ANSWER. Once the kills have been asked
      about first, every measurement sits below, on, or above the ratio the record banked, and the
      three are claimed by @SCN-RAT-006, by this scenario, and by @SCN-RAT-007. What is left over
      is a run that measured nothing at all, which is not a comparison and is refused a reading
      before it ever reaches one (@SCN-RAT-009).

      Given a ratchet record states that gate "domain" banked 2175 kills of 2243 mutants, allowing 3
      And a run of that gate measured <measured kills> kills of <measured mutants> mutants
      And that run's score is exactly the score the ratchet record banked, neither above it nor below
      When that run is reconciled against the ratchet record
      Then the ratchet passes that run as one sitting exactly on its record, and the gate stands
      And the verdict names both count pairs — the 2175 of 2243 recorded and the <measured kills> of <measured mutants> measured
      And the verdict states the score the ratchet record banked, which is the score the run measured
      And the verdict asks for nothing to be banked, in any words the caller gives for banking
      And the verdict names no kill lost, no head-room, no floor, and no reason for an allowance nothing spent
      And no run of that gate falls out of the ratchet unanswered, whichever way its two counts moved

      Examples: both runs score exactly what the record banked, and only the second moves its counts to do it
        | measured kills | measured mutants | what this row separates                                                                     |
        | 2175           | 2243             | both counts unmoved — the plain case, and what tells this reading from a grown population    |
        | 4350           | 4486             | the ratio held while both counts doubled — a fall-through read off the pair refuses this run |

    @unit @SCN-RAT-016
    Scenario: a population that shrank alongside its kills reds honestly, rather than asserting a lost kill the counts cannot prove
      A DELETION AND A REGRESSION ARE COUNT-IDENTICAL HERE, AND THAT IS THE WHOLE REASON THIS IS A
      READING OF ITS OWN. Remove one mutant this suite killed and the record sees one kill fewer
      over one mutant fewer. Remove one SURVIVING mutant while a weakened assertion loses a kill,
      and the record sees exactly the same pair. No arithmetic over two whole numbers separates
      them, so the ratchet must not pretend it can: asserting the lost kill would be crying wolf
      at an honest refactor, in a gate whose entire thesis is not doing that.

      SO IT REDS ANYWAY, AND THAT IS NOT A HEDGE. Passing the shrink would let the weakened
      assertion hide inside the honest refactor, which is precisely the fault this gate exists
      for. And removed code genuinely does lower the kills the gate can ever reach, so the record
      has to come down — deliberately, by hand, with the reason in the commit. That is the same
      conscious lowering @SCN-RAT-012's refusal already points at, and it stays the only way down:
      no flag lowers a record, and this verdict must not read as though one did.

      THE HONESTY LIVES IN THE MESSAGE, WHICH IS THE HALF A BARE RED ALWAYS DROPS. It names both
      falls, says out loud that two unrelated events look identical from here, and hands its
      reader both branches instead of picking one on evidence it does not have.

      AND IT IS REACHED INSIDE THE KILL COMPARISON RATHER THAN BESIDE IT. The kills must already
      have fallen past the allowance before the population's direction is consulted at all: a run
      that lost no kills is not this reading however far its population fell, and a run that lost
      kills while its population held still or GREW is @SCN-RAT-004's regression, whose sentence
      about a mutant that still exists is licensed exactly because nothing left the scope.

      Given a ratchet record states that gate "domain" banked 2175 kills of 2243 mutants, allowing 3
      And a run of that gate measured 2160 kills of 2230 mutants — 15 kills fewer over 13 mutants fewer
      And that run's score is above the floor the ratchet record implies, so a bar shaped like a score greens it
      When that run is reconciled against the ratchet record
      Then the ratchet reds that run as a population that shrank, and the gate does not stand
      And the verdict names both falls — the 15 kills and the 13 mutants
      And the verdict names both count pairs — the 2175 of 2243 recorded and the 2160 of 2230 measured
      And the verdict says the two cases look identical from here, so it reds either way
      And the verdict does not assert that a mutant this suite used to kill now survives
      And the verdict sends a reader who removed tested code to lower the record by hand, with the reason in the commit
      And the verdict sends a reader who removed none to the survivor in the run's own report
      And the verdict asks for nothing to be banked, in any words the caller gives for banking
      And a run whose kills held while its population shrank is not read as this at all
      And a run that lost kills while its population held still or grew is still read as a regression

  Rule: a run that measured nothing is not a run that passed

    A REFUSAL IS A RESULT, NEVER AN EXCEPTION THE CALLER MAY FORGET TO CATCH. Reading a report is
    the one step of this reconciler that reaches for something outside its own arguments, so it is
    the one step that can fail for reasons nothing in the record explains. The reader therefore
    hands back either a measurement or the reason there is not one, and the reconciler turns a
    reason into a verdict like any other. A throw would be a fault every caller has to remember to
    catch, and the caller who forgets reports whatever their own surroundings do with an uncaught
    one — which on a good day is a red nobody can read, and on a bad one is a step that was never
    reached at all.

    AND IT REDS, WHICH IS THE HALF THAT LOOKS OPTIONAL AND IS NOT. A sweep that did not run
    produced no evidence about the tree, and a reconciler that shrugs at no evidence reports
    success for a run that measured nothing. That is how a gate stays broken for nights on end
    with nobody the wiser: the build is green, the report is absent, and the two facts never meet.

    IT IS NOT A ZERO EITHER, AND THE DIFFERENCE IS NOT COSMETIC. Zero is a measurement — a run
    that mutated the scope and killed none of it — and reconciling zero against any record with a
    kill in it reaches a regression, whose message sends its reader hunting the kills that went
    missing. Over a report that was never written there are no such kills and never were, so that
    reader hunts something which does not exist, in a scope that may not have been mutated at all.

    AND EVERY REASON NAMES THE PATH. "No measurement" over a path nothing writes to and "no
    measurement" over a sweep that never ran are the same sentence with entirely different fixes,
    and the path is the only thing in the sentence that separates them.

    @unit @integration @SCN-RAT-009
    Scenario Outline: a report that is absent, unreadable, shapeless or holding no scored mutant reds as no measurement, rather than as a score of zero
      THE FIVE ROWS ARE ONE FAULT WEARING FIVE FACES, and each face is reached by a different
      reader being lenient. Nothing at the path is the sweep that never ran; unreadable text is
      the sweep killed part-way through its own write; a document of the wrong shape is a path
      pointing at somebody else's artefact; a document with no grouping in it and a grouping with
      nothing scored in it are the two ways a run can finish and still have measured nothing. Each
      one greens a reader that defaults, and every default lands on the same wrong answer.

      AND THE READER STILL HAS TO SAY YES SOMETIMES, which is why the last line is here. Every
      other assertion in this example is satisfied by a reader that refuses everything it is ever
      handed, and a gate that can never measure is worth no more than one that never reds.

      Given a ratchet record states that gate "domain" banked 2175 kills of 2243 mutants, allowing 3
      And the report that gate's run should have left behind <how the report stands>
      When that gate's report is read, and what comes back is reconciled against the ratchet record
      Then the reading hands its refusal back as a result, never as an exception its caller must catch
      And the ratchet reds that run as no measurement, and the gate does not stand
      And the reason given says <what its reason names>
      And the reason given names the path the report was looked for at
      And the reason given quotes the fault the report itself raised, where there was one to quote
      And the verdict says a run that produced no score is not a run that passed
      And the verdict is not a regression, because no kill has been shown to have gone missing
      And that same gate measuring 0 kills of 2243 mutants is reconciled to a regression instead
      And a report holding scored mutants at that very same path is read as a measurement, so refusing is not the only answer this reader gives

      Examples: five ways to have measured nothing, each of which a lenient reader hands back as a score of zero
        | how the report stands                          | what its reason names          |
        | is not there at all                            | no report at                   |
        | is there, but is not readable JSON             | not readable JSON              |
        | parses, but is not a mutation-report document  | not a mutation-report document |
        | is a document holding no files section         | holds no files section         |
        | groups files, but holds no scored mutant       | the gate measured nothing      |

  Rule: the counts are the mutants' own, never a headline the runner wrote

    STATED, NEVER INFERRED, AND THAT IS THE WHOLE RULE. A mutation report groups its mutants by
    the file they were made in and gives each one a status. The metric scores two of those
    statuses over four: the kills are the killed and the timed-out, and the population is those
    plus the survived and the never-covered. Both sets are written down member by member, and the
    four statuses left over — a mutant that would not compile, one that faulted at run time, one
    the run was told to ignore, and one that never got as far as being tried — are in neither.

    THE LENIENT READING IS ONE SENTENCE LONG, AND IT IS WRONG. "Everything not detected is
    undetected" reaches a population without anybody having to write a second set down, and it
    folds all four of those statuses into the denominator. A mutant that would not compile is not
    a survivor: nobody's assertion failed to catch it, because there was never anything there to
    catch. So that reading answers with a score which disagrees with the one the run itself
    printed — quietly, and in the direction of looking worse — and a reconciler holding a second
    opinion about the very number it is reconciling has stopped being one. Naming the two sets is
    what makes that disagreement impossible rather than merely unlikely.

    AND THE REPORT'S OWN THRESHOLDS ARE NOT READ, WHICH IS THE SAME RULING ONE ARTEFACT FURTHER
    OUT. A report carries the thresholds its run was configured against, and reading them would
    be taking the runner's verdict on its own homework as the measurement. The bar lives in the
    record, and the report is only ever asked what happened. Every figure here is counted from
    the mutants; every other number in the document is left where it lies, however conveniently
    it is shaped.

    THE COUNTS ARE TAKEN ACROSS THE WHOLE REPORT RATHER THAN A FILE OF IT. The grouping is
    presentation and nothing more — a gate's population is every mutant under it, wherever the
    report chose to file it. A counter that stopped at the first file would be green against
    every report holding exactly one, which is the shape a small fixture takes by default.

    @unit @SCN-RAT-010
    Scenario: the counts are the killed and timed-out over those plus the survived and never-covered — the four statuses the metric does not score are in neither, and the report's own thresholds block is not read
      Given a mutation report that groups its mutants across three files
      And those files hold between them 7 killed mutants and 3 that timed out
      And they hold 4 that survived and 2 that no test covered
      And they hold 5 that would not compile, 2 that faulted at run time, 3 the run ignored and 1 never tried
      And that report states thresholds of its own, holding figures the mutants do not imply
      When a measurement of gate "domain" is counted out of that report
      Then the measurement holds 10 kills — the killed and the timed-out, and nothing besides
      And the measurement holds a population of 16 — those kills plus the survived and the uncovered
      And the population is not the 27 mutants the report holds, because the four statuses the metric does not score are in neither set
      And both counts are taken across every file the report groups, never one file's own
      And no figure the report's own thresholds state reaches the measurement
      And the measurement names the gate in the words its caller used, never a name read out of the report
      And every one of the eight statuses is counted into the same set whichever report carries it

  Rule: the record only ratchets up, and the reasoning around it survives the write

    A SURGICAL TEXT EDIT, NEVER A RE-DUMP, AND THAT IS THE WHOLE OF THIS RULE'S DIFFICULTY.
    Emitting the parsed document back out is the obvious way to write two figures into a record
    and it throws away every comment on the way through, because comments are not part of the
    document a parser hands back. A record file is MOSTLY comment: every allowance's justification
    lives there, and so does the argument for the bar sitting where it sits. So a recorder that
    re-serialised would delete the reasoning for the very bar it was raising — quietly, in the
    same commit that claims to be strengthening it, and with the two figures perfectly correct.

    WHICH IS WHY THE EXAMPLE BELOW COMPARES BYTES RATHER THAN READING THE ANSWER BACK. A record
    that is parsed, checked for two numbers and pronounced good is a record whose comments were
    never looked at, and a re-dump passes that check every time. Putting the two moved lines back
    and asking whether what is left is the file it started as is the only reading that cannot.

    AND THE EDIT IS BOUNDED BY THE NAMED GATE'S OWN BLOCK. A record is a wall of near-identical
    blocks holding identically-named lines, so a rewriter that took the first `detected` line it
    met would raise whichever gate happens to be written first and report success. The block runs
    from the gate's key line to the first line after it indented no further than that key — the
    next gate, or the comment introducing it.

    A LINE THE BLOCK DOES NOT HOLD IS AN ERROR NAMING THE LINE, NEVER A NO-OP. Both of the other
    answers are worse than a refusal: skipping quietly banks half a measurement and reports a
    raise that did not happen, and searching on past the block's end rewrites some other gate's
    figure with this gate's count.

    @unit @integration @SCN-RAT-011
    Scenario: a better measurement raises the named gate's two figures and leaves every other byte of the record alone
      Given a ratchet record authored the way a project authors one — an argument above each gate, a blank line inside every block, an allowance justified at length, and a trailing newline
      And that ratchet record banks gate "state-model" first, and gate "domain" below it at 2175 kills of 2243 mutants
      When gate "domain" is raised to a run measuring 2200 kills of 2250 mutants
      Then the raised ratchet record banks gate "domain" at 2200 kills of 2250 mutants
      And exactly two lines of the ratchet record moved, and putting those two back hands back the file it started as, byte for byte
      And gate "state-model" is banked at the figures it was banked at before, its own reasoning still above it
      And the raised record is what the file on the tree now holds, read back at the path its caller named
      And raising a gate whose block holds no line to rewrite is refused by the name of the line, never by rewriting another gate's

    @unit @SCN-RAT-012
    Scenario Outline: a measurement no better than the record is refused, and there is no flag that overrides the refusal
      UP-ONLY, AND THE EQUAL MEASUREMENT IS THE ROW THAT SAYS SO. Refusing a run that measured
      worse is the easy half — lowering a bar is not something a tool does on a run's say-so.
      Refusing one that measured EXACTLY what the record already holds is the half a recorder
      written to the obvious comparison gets wrong: writing the same two figures back changes
      nothing, and a no-op that reports success reads, in a shell history or a run's own log, as a
      ratchet that happened. The refusal is what keeps "I banked it" meaning something.

      AND THE REFUSAL HAS NO OVERRIDE, DELIBERATELY. A fall that is honest — code deleted, a scope
      narrowed — is a conscious bump: a human edits the two figures and puts the reason in the
      commit, which is the route this refusal names, and the same route the shrunk-population red
      already sends its reader down. An escape hatch the tool offers is one nobody has to justify,
      and it would be reached for on the first red night rather than the first honest one. So the
      absence is ASSERTED here rather than merely intended: an example that only watched the
      refusal fire would be green against a recorder that had quietly grown a way past it.

      AND IT IS THE SCORE THAT IS COMPARED, NEVER THE PAIR. The third row moves both counts and
      holds the ratio exactly — the run a recorder written as "the very same two figures" banks,
      writing a record that raises nothing over one already stating that score.

      Given a ratchet record banking gate "state-model" first, and gate "domain" below it at 2175 kills of 2243 mutants
      When gate "domain" is offered a run measuring <measured kills> kills of <measured mutants> mutants
      Then banking that run is refused, because the ratchet only ever raises
      And no raised record is handed back at all, so there is nothing for a caller to write
      And the refusal names both count pairs with the score each implies — the 2175 of 2243 recorded, and the <measured kills> of <measured mutants> measured
      And the refusal sends its reader to edit the ratchet record by hand, under the name its caller gave, with the reason in the commit
      And the refusal names no flag, and no input the recorder takes anywhere overrides it
      And a run that genuinely measured better is still written, so the refusal is the fall rather than the write

      Examples: three runs that are not a raise, each one banked by a comparison written wrong a different way
        | measured kills | measured mutants | what this row separates                                                                    |
        | 2100           | 2243             | a run that measured worse — the plain case, refused by any comparison at all               |
        | 2175           | 2243             | the record's own two figures offered back — the no-op a comparison written on `<` banks     |
        | 4350           | 4486             | both counts moved and the ratio held — the run a comparison written on the PAIR banks       |

    @unit @SCN-RAT-013
    Scenario: the write stays inside the named gate when a sibling gate holds the very same counts
      THE COLLISION IS PLANTED, BECAUSE A RECORD WITHOUT ONE GREENS THE BUG THIS EXAMPLE IS FOR.
      Every other example in this Rule is driven by a record whose gates hold distinct figures, and
      over such a record a rewriter that reached for the two figures BY THEIR VALUES — striking out
      the old numerals wherever in the file they first appear — writes exactly the right two lines
      and is indistinguishable from a correct one. Two gates measuring the very same kills of the
      very same mutants is the record that tells them apart, and nothing but a deliberate plant
      produces it, because a project's gates rarely collide by accident.

      AND THE ORDERING IS EXERCISED BOTH WAYS ROUND, WHICH IS THE HALF AN EXAMPLE FORGETS. A
      colliding record that only ever writes the named gate ABOVE its twin is green against a
      rewriter that takes the first line it meets — the first line it meets is the right one. Only
      the other ordering reds it. So the same collision is authored twice, the gate to be raised
      above its twin and below it, and both orderings are required to reach the same answer.

      THE SIBLING IS ASSERTED AS BYTES, NOT AS A READING. Parsing the raised record and finding the
      sibling still stating 2175 of 2243 is satisfied by a record whose sibling block was rewritten
      to the very numbers it already held; only the bytes say the lines were never touched at all.

      Given a ratchet record banking gate "domain" and gate "state-model" at the very same 2175 kills of 2243 mutants
      And that ratchet record is authored twice over — once with gate "domain" written above its twin, and once below it
      When gate "domain" is raised to a run measuring 2200 kills of 2250 mutants
      Then gate "domain" is banked at 2200 kills of 2250 mutants, whichever way round the two gates were written
      And gate "state-model" holds the two figure lines it held before, byte for byte, in both orderings
      And exactly two lines of the ratchet record moved, so nothing outside gate "domain"'s own block was rewritten

  Rule: every term a project owns arrives from the project

    THE GENERICITY IS THE WORK, NOT A PROPERTY THE LIFT INHERITED. The reference implementation
    this library was lifted from held its tree's location, its record file's name, its reports'
    directory and the words for banking a measurement — four of them written into the code and
    the fifth into a message. Every Rule above it was already right about mutation testing and
    already wrong about whose repository it was standing in, and none of those Rules could tell,
    because each was driven by this repository's own fixtures. So the example below is a SECOND
    project: a record filed under a name of its own, gates named in its own words, a report
    wherever its own sweep leaves one, and its own instruction for banking a measurement.

    THE ROOT IS THE CONSUMER'S WORKSPACE AND NEVER THE MODULE'S OWN LOCATION, which is the term
    of the five that is silent rather than wrong. A module that finds the tree from where it
    itself is installed agrees with the caller exactly as long as it sits beside the caller's
    code — which it does in the repository it was written in, and stops doing the moment it is
    installed as a dependency of one, when it resolves quietly into its own directory inside a
    package folder and reads nothing. So the tree below is deliberately not the one this suite
    is running in, and a reader that joined a root of its own reaches nothing at all.

    AND THE SURFACE IS GREPPED, BECAUSE BEHAVIOUR ALONE CANNOT SEE THE FIFTH TERM. A reconciler
    told which words to use for banking a measurement passes every verdict this Rule drives even
    while a second, unreachable sentence beside it still names somebody's script. The module's own
    bytes are what say otherwise, and each pattern is proved to fire on the leak it was drawn from
    before its absence is believed of anything.

    @unit @integration @SCN-RAT-014
    Scenario: a second project's record file, gate names, report path and bank-it command drive the whole verdict unchanged, and the module's own surface names no project, check, runner, workflow or repository
      Given a second project that files its bars under a record name of its own, holding a gate it calls "parcel-routing" banked at 812 kills of 900 mutants, allowing 2
      And that project keeps its tree somewhere that is not the tree this suite is running in, and leaves its sweep's report at a path of its own choosing
      And that project's own instruction for banking a measurement is the only one the ratchet is given
      When that project's gate is reconciled against that project's own record, run by run
      Then each run reaches the verdict its counts imply, over the gate name that project uses
        | kills measured | mutants measured | what the ratchet makes of the run                                 |
        | 805            | 900              | a regression, and the gate does not stand                         |
        | 805            | 890              | a population that shrank, and the gate does not stand             |
        | 810            | 900              | a kill lost inside the allowance, and the gate stands             |
        | 812            | 910              | a population that grew, and the gate stands                       |
        | 830            | 900              | a tree ahead of its record, and the gate does not stand           |
        | 812            | 900              | a run sitting exactly on its record, and the gate stands          |
      And the same gate with no report written at all reds as no measurement, naming the path that project chose
      And every verdict that asks for the record to be banked quotes that project's own instruction, and no other project's
      And the record and the report were each sought under the root that project named, and nothing was read from the directory this suite is running in
      And no source file this module holds carries a name this repository goes by — not its packages, not its checks, not its workflows
      And every error a public function of that surface raises is reachable by name from that surface, so a caller can catch it by type rather than by matching its sentence

  Rule: the run that calls it carries the verdict out

    A LIBRARY THAT ONLY EVER RETURNS A VALUE IS A LIBRARY NOBODY'S PIPELINE CAN READ. Every Rule
    above this one settles what the verdict IS; none of them settles how a run that asked for it
    ends, and a run's ending is the only part of this a pipeline actually observes. So the last
    piece is the command: the terms a project owns arrive as arguments, the verdict goes where a
    reader reads an answer, and the run ends on it.

    THREE ENDINGS, AND THE THIRD IS THE ONE WORTH BUILDING FOR. A gate that stands and a gate that
    does not are the two a pipeline is watching for, and telling them apart is arithmetic that has
    already been done by the time this Rule is reached. The third is a run that was CALLED wrong —
    a name left off, a value left off — and it must not wear either of the other two, because a
    typo reported as a gate that does not stand sends somebody hunting through their code for a
    regression that never happened, and a typo reported as a gate that stands is a bar that
    quietly stopped being read at all.

    A REFUSAL TO BANK IS AN EXPECTED ENDING RATHER THAN A CRASH. Asking whether there is anything
    to bank is what an operator types, and most of the time the answer is no. Handed out as an
    unhandled fall it arrives as a stack trace — a reading that says the tool broke where what
    happened was the tool working, and one that buries the refusal's own sentence, which is the
    only part of it anybody needed. So the refusal's reason is what the reader gets.

    AND THE ENDING IS ASSERTED ALONGSIDE WHAT WAS SAID, NEVER ALONE. A command that falls over
    before it reaches its first argument ends in failure too, and satisfies every assertion that
    only ever looked at how a run ended: the red rows below would be green against a command that
    could not start. So each row states what its reader was told and which channel it was told it
    on, and the last step reads both channels for the shape an unhandled fall leaves.

    @integration @SCN-RAT-015
    Scenario Outline: the command ends on its verdict — a red one in failure, a green one cleanly, a refusal to bank as its reason rather than a stack trace, and a fault in how it was called told apart from either
      Given a project keeping a ratchet record of its own, banking gate "parcel-routing" at 812 kills of 900 mutants, allowing 2
      And that gate's own sweep measured <kills> kills of <mutants> mutants
      When the ratchet is run over that project's tree, "<how it is called>"
      Then the run ends <how it ends>, telling its reader "<what it is told>" where a reader reads <which channel>
      And that project's ratchet record is <the record then>
      And neither channel carries the fall of a command that broke before it reached its own argument

      Examples:
        | how it is called                             | kills | mutants | how it ends | what it is told                | which channel | the record then          |
        | asked only for the verdict                   | 812   | 900     | cleanly     | the verdict it reached         | an answer     | untouched, byte for byte |
        | asked only for the verdict                   | 805   | 900     | in failure  | the verdict it reached         | an answer     | untouched, byte for byte |
        | asked to bank the measurement                | 830   | 900     | cleanly     | where the record now stands    | an answer     | raised to that run       |
        | asked to bank the measurement                | 805   | 900     | in failure  | why it will not bank the run   | a fault       | untouched, byte for byte |
        | called with the report left without its path | 812   | 900     | broken      | how it should have been called | a fault       | untouched, byte for byte |
        | called without naming a gate at all          | 812   | 900     | broken      | how it should have been called | a fault       | untouched, byte for byte |
