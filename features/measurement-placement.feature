@PLC
Feature: A measurement reaches the evidence root only while it is still about this code

  A measured row is answered by a number somebody else took: a nightly sweep's kill count, a
  suite's wall-clock from earlier in this job. Nothing in that number says when it was taken, and
  by ruling nothing ever will — a row carries no clock and neither does its reader (3F-2841). So
  the one place the question "is this still about the code it will settle?" can be asked is where a
  measurement CROSSES into this run's evidence, and that crossing is what this file is about.

  STALE AND ABSENT ARE THE SAME OBSERVABLE, WHICH IS THE PROPERTY THE WHOLE ARRANGEMENT TURNS ON.
  A measurement past its window is not placed, so the reader downstream meets no record at all and
  the row reconciles `missing` — no measurement arrived, which is the true sentence and is not one
  anybody can mistake for a satisfied bar. A row can never be quietly settled by an old number
  because there is no old number there for it to read.

  AND THE WINDOW IS ONE WINDOW (3F-3200). Three rows are placed here — a nightly sweep's record and
  the two suites' timings — and until this file two of them had no window at all and behaved as
  though they did, because `$RUNNER_TEMP` happens to be fresh on every CI job. That is luck, and a
  consumer copying this axis copies the luck rather than the rule. Every row asks
  `scripts/freshness-window.sh`, which holds the value as its derivation and holds the only
  age-versus-window comparison there is.

  Rule: a measurement is placed only if it is inside the freshness window

    THE ARM RUNS THE PLACEMENT, IT DOES NOT READ IT, and that is the whole of the difference here.
    Every other arm over a placement step in this repository reads its TEXT — which run it selects,
    on which line, what it says once it has chosen. A text assertion cannot tell a window that
    FIRES from a window whose arithmetic is broken on the runner it runs on, and reading a
    mechanism's behaviour off its configuration is exactly the move that let this window go
    unwitnessed for as long as it did (features/mutation-score.feature's Rule on the same subject,
    which spent two slices describing this arm and never had one). So each step is lifted out of
    the workflow every push runs, its own `env:` supplies its terms, the boundary to GitHub is
    answered and nothing else is replaced, and it is EXECUTED against a planted evidence root.

    WHICH MEANS THE ARM DEPENDS ON GNU ARITHMETIC, AND REDS WHERE IT FINDS NONE. A run's `createdAt`
    is parsed with `date -u -d`, a staged record's age is read with `stat -c %Y`, and both are GNU
    spellings a BSD implementation refuses. Measured at 3F-3156: with a BSD `date`, a run one hour
    old and a run forty hours old both placed nothing, for the same wrong reason — so an arm that
    SKIPPED itself on such a runner would be a credit saying a check ran when it did not. It
    resolves the GNU tools or it fails naming what it could not find.

    AND "NOTHING WAS PLACED" IS NOT ON ITS OWN THE CLAIM. A placement that did nothing at all
    places nothing too, and would satisfy every assertion phrased on the row's absence; so would a
    fetch that failed for its own reasons. The refusal is therefore read for the AGE it computed
    and the window it compared that age against, and for the sweep the fetch is watched and must
    never happen — the window is cleared before the payload is fetched, or a run past it would be
    downloaded and only then thrown away.

    @integration @SCN-PLC-001
    Scenario Outline: a measurement older than the freshness window is not placed, and its row reads missing
      Given "<measurement>", taken longer ago than the freshness window allows
      When this run places what it has
      Then nothing is placed, and the refusal names an age past the window it was measured against
      And "<row>" reads missing, because its own command has no measurement to answer with

      Examples:
        | row         | measurement                    |
        | SCN-FIT-002 | the nightly sweep's record     |
        | SCN-FIT-012 | the unit suite's timing        |
        | SCN-FIT-013 | the behavioural suite's timing |

    @integration @SCN-PLC-002
    Scenario Outline: a measurement inside the freshness window is placed, and its row reads satisfied

      THE OTHER END OF ONE BOUNDARY, AND DELIBERATELY NOT A SECOND EXPERIMENT. The arm above proves
      that a measurement past the window never arrives; this proves that one inside it does, and
      that the row it answers then reads `satisfied` rather than `missing`. Both ends plant the SAME
      artefact — the same staged record, the same run, the same downloadable payload — and move it
      across the boundary by its TIMESTAMP alone. Two arms planting two different artefacts would
      agree about a boundary neither of them had crossed.

      WHICH IS ALSO WHY THE PAYLOAD IS THERE ON BOTH SIDES. The sweep's artefact is downloadable in
      the arm above too, and is not downloaded: a plant that staged no payload would let a fetch
      that never happened pass for a fetch the window refused. The claim there is that the window
      stopped a download that would otherwise have succeeded, and only a fetchable payload carries
      it.

      AND THE NUMBER EACH ROW IS ANSWERED WITH IS READ OFF THAT ROW'S OWN BAR, never typed beside
      it. `satisfied` is a statement about a number and the ceiling or floor its row states, and
      these three rows state three different ones — so a literal here would be a second copy of a
      bar that lives in the manifest, kept in step by whoever remembers. The arm reads the bar the
      row authored and plants a number inside it.

      AND IT WAS GREEN THE DAY IT WAS WRITTEN, which is said out loud rather than dressed up. The
      placement and its refusal arrived in one move, so the positive path already worked when this
      arm reached it; what it is held by is a recorded plant — the shared window set to `0`, where
      nothing can ever be inside it, reds all three rows below.

      Given "<measurement>", taken inside the freshness window
      When this run places what it has
      Then it is placed, and the placement names an age inside the window it was measured against
      And "<row>" reads satisfied, because its own command answers with the number that was placed

      Examples:
        | row         | measurement                    |
        | SCN-FIT-002 | the nightly sweep's record     |
        | SCN-FIT-012 | the unit suite's timing        |
        | SCN-FIT-013 | the behavioural suite's timing |

    @integration @SCN-PLC-004
    Scenario Outline: a refusal removes what an earlier run placed, so the row reads missing rather than yesterday's number

      A REFUSAL THAT REMOVES NOTHING HAS NO EFFECT, AND THE TWO ARMS ABOVE CANNOT SEE THAT. They
      run against a root this file makes and throws away, and on such a root "nothing is placed"
      and "the row reads missing" are one sentence said twice. They are two sentences on a root
      that outlives the run: there, an earlier run's copy is still sitting in the evidence root
      when this run's measurement is refused, and the row's own command reads that copy and answers
      with it — a number the age test had already rejected, reaching the ledger as though nothing
      had been refused at all (3F-3431).

      SO THE ROOT SURVIVES BETWEEN THE TWO RUNS, AND THAT IS THE WHOLE OF WHAT IS NEW HERE.
      Everything else is the plant the arms above already make. A root thrown away between runs
      cannot tell a refusal that removes from a refusal that does nothing, and being thrown away is
      exactly the condition under which this went unseen — which is this file's own complaint about
      the two timings, arriving one level down and applying to all three rows.

      THE SECOND RUN HAS NO SOURCE AT ALL, AND THAT IS THE STRICTER HALF ON PURPOSE. A measurement
      whose source has gone is removed even though the copy sitting in the root might still be
      inside the window, so this rule can make a row read `missing` where evidence arguably
      existed. That failure is a red. The alternative — ageing the placed copy on its own account —
      needs the measurement's own time to survive a copy that does not carry it, and its failure is
      a satisfied row on a stale number. In a product whose subject is false greens, take the rule
      that fails loudly (3F-3200, operator ruling 2026-09-16).

      AND WHAT IS REMOVED IS THE ROW, NEVER THE ROOT. Clearing the evidence root up front, before
      the producers run, was rejected and this is not that: the removal is the placement's own
      decision acting on its other outcome, over exactly the record that placement answers for. So
      the arm leaves a neighbouring row's placed record and this run's own credit stream in the
      root and asserts both survive — a placement that reached for the root instead of for its row
      reds here.

      Given "<measurement>", placed into an evidence root by a run that came before this one
      When this run has nothing to place into that same root
      Then the earlier run's copy is gone from the evidence root, and nothing else there is disturbed
      And "<row>" reads missing, because its own command has no measurement to answer with

      Examples:
        | row         | measurement                    |
        | SCN-FIT-002 | the nightly sweep's record     |
        | SCN-FIT-012 | the unit suite's timing        |
        | SCN-FIT-013 | the behavioural suite's timing |

  Rule: the window is written once, and every placement reaches that one writing

    THE ARMS ABOVE RUN THE PLACEMENT AND THIS ONE READS TEXT, which is a difference in the CLAIM
    rather than a difference in rigour. What they establish is what a placement DOES at the
    boundary — a measurement past the window, the same measurement inside it, and the row each
    time. What they cannot establish is that there is ONE boundary: three arrangements that happen
    to agree is exactly the state a behavioural pair cannot tell apart from one rule applied three
    times, and it is the state this file replaces. That claim is about where the rule is WRITTEN,
    so reading the writing is the honest instrument here rather than a weaker substitute for
    running it.

    @unit @SCN-PLC-003
    Scenario: the sweep and both suite timings are placed by one rule under one window

      THE PLACEMENTS ARE DERIVED FROM THE PIPELINE, NEVER LISTED BESIDE IT. A list typed into this
      arm would be a fourth writing of the very fact the scenario is about, and it would go stale
      on the day a placement is added without it — quietly, because a list naming two things still
      finds both of them however many there are. So the population is whatever the workflow every
      push runs states it to be: a step carrying a measurement into this run's evidence is one
      whether or not anybody remembered this scenario.

      AND A RECORD IS NOT A MEASUREMENT, WHICH IS THE ONE PARTITION IN THAT POPULATION. The same
      workflow places a per-mutant record under no window at all, deliberately: a MEASUREMENT
      lapses because a number about an older tree is a false statement about this one, and a record
      does not — it says what the kills WERE, and age only makes that comparison stricter. The two
      are told apart by the name the product's own reader reads each back under, never by the
      step's name and never by a list.

      AND NO READER HOLDS EITHER HALF OF A WINDOW. A window needs an age and an age needs a clock,
      so a reader holding one could answer a row from a measurement whose freshness nobody decided
      at the crossing — which is the arrangement that let two rows behave as though they had a
      window while having none. The rows are read off the manifest and each row's command is
      followed to the source that answers it.

      Given every placement of a measurement into this run's evidence, as the pipeline states them
      When each is read for the window it places under
      Then the window is written in exactly one place, as a cadence and a margin rather than a bare number
      And every placement asks that one writing, holding no window and no clock of its own
      And no measured row's reader holds a window or a clock either
