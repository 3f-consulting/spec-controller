@FIT
Feature: The fitness checks this repository configures, one scenario per row

  HOW A CHECK IS ADDED HERE, IN TWO STEPS — write the scenario, add the row. The scenario is
  authored like every other scenario in this corpus: a tag line carrying `@fitness` and a freshly
  minted code, a title saying what the check asserts, and the one sentence its row's shape asks
  for. The row goes in `specController.fitnessChecks` in package.json, naming that same code, the
  characteristic the check is about, and the command that runs it. Neither half is derived from the
  other, which is what makes them two books rather than one read twice: this file was EMITTED from
  those rows until 3F-3244, and a scenario emitted from the row it is reconciled against could
  never disagree with it.

  SO A SCENARIO WITH NO ROW, AND A ROW WITH NO SCENARIO, ARE BOTH FAULTS SOMETHING NOW SAYS OUT
  LOUD. The pass reds a scenario whose code no row names, because there is no command for it to
  run; the ledger reports a row whose scenario the corpus does not carry as an Evidence Obligation
  nothing observed. Under generation neither could happen and neither could be reported, which is
  the same trade every derived artefact makes.

  WHY THE SCENARIOS EXIST AT ALL, given the rows already carry everything. A check reports its
  findings and says nothing when it finds none, so its silence cannot be told from its absence.
  Cucumber reports every scenario it ran, pass or fail — that enumeration is what the fitness axis
  was missing, and these scenarios are how a configured check acquires it. Reading the rows alone
  would put the axis back to single-entry.

  THE CODE IS STORED, NEVER POSITIONAL. Each scenario's `@SCN` is the one its row names, chosen
  when the check was added and never derived from where the scenario sits in this file, so
  inserting one renumbers nothing and every citation elsewhere in the tree stays true. The
  numbering below is not contiguous for that reason, and that is the rule working rather than a
  gap.

  A ROW MAY ALSO CARRY A CODE MINTED UNDER ANOTHER FEATURE, and that is the same rule. A code, once
  allocated, is stable forever: it survives a feature-file rename and is never reused. A check whose
  code is cited by something outside this repository's corpus — a nightly producer's sweep record,
  say — therefore keeps that code while its scenario moves here, and is re-minted only by the change
  that can move every citing surface with it.

  THE TAG NAMES THE AXIS AND THE ROW NAMES THE SUBJECT. Every scenario here carries `@fitness` and
  no characteristic tag: which characteristic a check asserts, and which bar it is held to, are read
  from its row by the ledger. One sentence for a static check and one for a measured one, so the
  step-definition count is two however many rows arrive.

  WHICH OF THE TWO SENTENCES A SCENARIO CARRIES IS ITS ROW'S SHAPE. A row with no bar gets the
  static sentence and its command's exit code is the whole verdict; a row carrying `atLeast` or
  `atMost` gets the measured one and its command has to yield a number. Whether that number clears
  the bar is the ledger's sentence, never this file's — a scenario comparing its own measurement
  would be grading its own homework.

  THE FITNESS PASS RUNS LAST, AND THAT IS LOAD-BEARING RATHER THAN CONVENTIONAL. Reader-shaped rows
  read what an earlier step produced — a mutation sweep's record, the behavioural suite's timing —
  so a pipeline that runs this pass first meets absent artefacts and a wall of unsettled rows while
  doing exactly what it was told.

  @fitness @SCN-FIT-001
  Scenario: every function and module measures inside the external complexity standard, or inside its recorded exception
    Then the check this scenario names finds no violations

  @fitness @SCN-FIT-003
  Scenario: every recorded complexity exception states the value the tree currently measures
    Then the check this scenario names finds no violations

  @fitness @SCN-FIT-007
  Scenario: every feature file carries a registered header code, and the corpus parses
    Then the check this scenario names finds no violations

  @fitness @SCN-FIT-008
  Scenario: every scenario carrying a code names an evidence tier, or is parked
    Then the check this scenario names finds no violations

  @fitness @SCN-FIT-009
  Scenario: no domain module is named for a procedural layer
    Then the check this scenario names finds no violations

  @fitness @SCN-FIT-010
  Scenario: every scenario a change touches is named by a sub-issue of the ticket it is on
    Then the check this scenario names finds no violations

  @fitness @SCN-FIT-011
  Scenario: the whole tree type-checks
    Then the check this scenario names finds no violations

  @fitness @SCN-FIT-012
  Scenario: the unit suite's wall-clock, for the ledger to hold against its ceiling
    Then the check this scenario names reports its measurement

  @fitness @SCN-FIT-013
  Scenario: the behavioural suite's wall-clock, for the ledger to hold against its ceiling
    Then the check this scenario names reports its measurement

  @fitness @SCN-FIT-002
  Scenario: the domain's mutation score, for the ledger to hold against its kill floor
    Then the check this scenario names reports its measurement

  @fitness @SCN-FIT-015
  Scenario: the compatibility page's configuration examples still resolve, and every scenario it cites still exists
    Then the check this scenario names finds no violations

  @fitness @SCN-FIT-016
  Scenario: no published page sends a reader to an absolute path inside somebody's home directory
    Then the check this scenario names finds no violations
