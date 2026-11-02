@LNT
Feature: Reconcile every fitness function as a @fitness scenario citing its own @SCN

  A scenario tagged @fitness raises one Evidence Obligation for a whole-system property, and the
  CI step whose id: is that scenario's code answers it with one Evidence Observation.

  A @fitness scenario has a title and tags and no steps, and nothing runs it. Its obligation is
  satisfied only by a run: step in the CI config over the real tree. A check that is not wired
  into CI leaves its obligation missing, and one whose CI step or job sets `continue-on-error`
  reconciles as watermelon. No other key or tag names a check: a
  specController.checkRegistry key settles nothing and is reported under "Configuration not
  read" like any key the block does not read, and a tag carrying a bare check word raises no
  obligation.

  Rule: a `@lint=<check>` tag raises no Evidence Obligation — the retired form is inert

    @unit @SCN-LNT-007
    Scenario: a @lint=<check> tag raises no Evidence Obligation — the retired form is inert

      No reader turns a @lint=<handle> tag into an obligation, however it is spelled and wherever
      it appears. Only the @fitness tag raises a fitness obligation.

  Rule: a fitness function's run posts ONE Evidence Observation, citing its scenario's @SCN

    A fitness run posts to the row of the scenario code it cites, as any other Evidence Observation
    does. One run is one Evidence Observation and cites one scenario.

    @unit @SCN-LNT-004
    Scenario: a scenario raising Evidence Obligations for both a unit test and a fitness function reports each independently
      The @unit tag raises the unit obligation and the @fitness tag raises the fitness obligation.
      Both Evidence Observations cite the same scenario code and post to the same row, and each
      obligation is answered only by an observation of its own kind of quality check. One may reconcile while the other does not.

  Rule: a fitness Evidence Observation matching no Evidence Obligation lands on the unnamed claim or a phantom claim

    An Evidence Observation citing nothing lands on the unnamed claim. One citing a code no scenario
    carries creates a phantom claim's row for that code and posts there.

    @unit @SCN-LNT-009
    Scenario: a fitness Evidence Observation citing an @SCN no scenario carries posts to a phantom claim's row, named by the @SCN its step stated
      The citation is resolved against the corpus, never a manifest list, so such a step does not
      fall to the unnamed claim.
      The Evidence Observation is never dropped: it posts to the phantom claim's row carrying the check
      that ran, and the row is out of balance.

  Rule: a @fitness scenario is one check: its kind of quality check is fitness, and its obligation is raised by its tag and keyed by its own @SCN

    The scenario's title says what the check is about. No manifest list or characteristic word
    stands between the tag and the obligation.

    @unit @SCN-LNT-018
    Scenario: a @fitness scenario raises exactly one fitness Evidence Obligation keyed by its own @SCN, from its tag alone, and two @fitness scenarios raise two

      A run's step answers only the obligation whose code it carries. A scenario raises one
      obligation even if the tag reaches it from its Rule or Feature as well as itself.

    @unit @SCN-LNT-020
    Scenario: a @fitness scenario no CI step cites reconciles missing, its row is out of balance, and the run fails

      The missing obligation is reported on the scenario's own row and nowhere else.

  Rule: a check that did not run is broken evidence rather than an absent one

    A broken check carries where to fix it and what broke. The obligation it cites reconciles
    missing, and the run is stamped unsound.

    @unit @SCN-LNT-026
    Scenario: a check step's outcome answers its scenario's obligation only where it says what the check did, and every other reading is broken evidence, which answers no obligation, read over every line on the scenario's row

      A step that succeeded or failed answers its obligation. A skipped step, or any status the
      reader does not recognise, is broken evidence.

  Rule: a pipeline nobody has annotated is reported as every check it runs, each citing no scenario

    With no @fitness scenarios and no annotated steps, the report lists every check the pipeline
    runs, each on the unnamed claim. Steps the target lists as not checks, such as checkout, toolchain
    setup, install and build, are reported as excluded. Only that list excludes a step.

    @unit @SCN-LNT-029
    Scenario: a check step citing no @SCN posts to the unnamed claim, which is the unannotated consumer's whole report

      Each check on the unnamed claim is named by the script that ran. With no corpus, the unnamed
      claim's row is the only row on the report.

  Rule: a running check's citation is the @SCN its own CI step states, and nothing resolves it

    The citation is the code in the step's id:, never the script's name, and it is not checked
    against any list. A step whose id: is not a scenario code, or that has no id:, cites nothing.

    @unit @SCN-LNT-031
    Scenario: a check step's id: is the citation it supplies, so an annotated pipeline is not read as unannotated

  Rule: a check its job's verdict does not depend on is not enforced over the real source

    @unit @SCN-LNT-032
    Scenario: a check its job's verdict does not depend on reconciles as the watermelon, beside a sibling check whose red is the job's verdict

    @unit @SCN-LNT-033
    Scenario: the fitness-function census counts a check whose red its job survives as a check that ran, on both of its counts

      The census counts checks that ran, and how many of those no scenario names. Both counts take
      the same rule: a check is counted when it is present and its Evidence Observation is not
      broken, so a check whose red its job survives counts as run. A missing or broken check is in
      neither.

  Rule: a check step's outcome in the CI run's record is the fitness Evidence Observation

    The workflow file says a check is wired and which row it cites. The run's record says what
    the step did on this run, and that outcome is the row's Evidence Observation. The record is the
    dump of the run's steps that the consumer's pipeline writes; it carries each step's own result
    and the code its id: states.

    @unit @SCN-LNT-021
    Scenario: a check step the run's record says succeeded answers the obligation of the scenario whose @SCN it carries

      Each row is answered by its own step's entry in the record, with no registry or corpus
      lookup. The step that wrote the record is not a check, so it appears nowhere on the ledger.

    @unit @SCN-LNT-028
    Scenario: a check step that failed posts a failing observation, out of balance whatever the job concluded

      A failed step reconciles failing, not broken or missing, exactly as a failed unit test does.
      The row is read from its own step alone, never from the run as a whole.

  Rule: a fitness obligation answered by several evidence observations reads one Reconciliation line per observation

    Each evidence observation is read on its own and is its own Reconciliation line, in evidence order,
    whatever order the observations arrive in. No line names another observation, and the ledger balances
    only when every line is satisfied.

    @unit @SCN-LNT-036
    Scenario: a failed fitness evidence observation beside a passing one for the same check reads a failing line beside a satisfied one, and the ledger is out of balance

    @unit @SCN-LNT-037
    Scenario: a watermelon fitness evidence observation beside a wired one for the same check reads a watermelon line beside a satisfied one, and the ledger is out of balance, whichever one's locator sorts first

    @unit @SCN-LNT-038
    Scenario: a failed fitness evidence observation beside a watermelon one for the same check reads a failing line and a watermelon line, each carrying its own observation, whichever one's locator sorts first
