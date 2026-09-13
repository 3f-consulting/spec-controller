@FIT
Feature: The fitness checks this repository configures, one scenario per row

  HOW A CHECK IS ADDED HERE, IN TWO STEPS — write the scenario, add the row. The scenario is
  authored like every other scenario in this corpus: a tag line carrying `@fitness` and a freshly
  minted code, a title saying what the check asserts, and steps saying it in Given/When/Then. The
  row goes in `specController.fitnessChecks` in package.json, naming that same code, the
  characteristic the check is about, and the command that runs it. Neither half is derived from the
  other, which is what makes them two books rather than one read twice: a scenario derived from the
  row it is reconciled against could never disagree with it.

  SO A SCENARIO WITH NO ROW, AND A ROW WITH NO SCENARIO, ARE BOTH FAULTS SOMETHING SAYS OUT LOUD.
  The ledger reports a scenario whose code no row names as unconfigured, and a row whose scenario
  the corpus does not carry as an Evidence Obligation nothing observed. That is the return on
  authoring the two halves independently, and the whole of it: the disagreement is reportable
  because it is possible.

  WHY THE SCENARIOS EXIST AT ALL, given the rows already carry everything. A check reports its
  findings and says nothing when it finds none, so its silence cannot be told from its absence. The
  enumeration that tells them apart is the RUN's own record of its steps: the pipeline reports every
  step it ran and what each one did, and a scenario here is the obligation that record answers.
  Reading the rows alone would put the axis back to single-entry.

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
  from its row by the ledger.

  AND WHAT KEEPS A SCENARIO HERE OFF THE RUNNERS IS ITS TAG, NEVER ITS SHAPE. `@fitness` sits
  outside the Cucumber profile's `@integration or @e2e or @performance` exactly as `@unit` does, so
  Cucumber selects none of these scenarios and no step definition stands behind their steps — the
  same arrangement `@unit` already has with vitest. So a scenario here is authored like every other
  scenario in this corpus, steps and all: the steps are the SPECIFICATION, saying what the check
  asserts of this tree, and the check's own command — run as a step of the pipeline under this
  scenario's code — is the EVIDENCE. It is still a DECLARED OBLIGATION rather than a test, because
  nothing here runs it: the pipeline records what that step did, and `balance` reads the record.

  WHAT A STEP HERE MAY NOT DO IS GRADE THE RUN. "Then the check passes", or "Then the build is
  green", is the scenario raising the obligation and answering it in the same breath — BOTH SIDES
  OF THE ENTRY, which is the one thing double entry cannot allow. A `Then` states the PROPERTY
  ASSERTED, as a `@unit` scenario's does; whether this push cleared it is the ledger's sentence,
  taken from the record.

  WHICH BAR A ROW STATES IS ITS OWN SHAPE, AND IT NEVER REACHES THIS FILE. A row with no bar is
  answered by its step's outcome, and a row carrying `atLeast` or `atMost` is answered by the number
  its command wrote down. Whether that number clears the bar is the ledger's sentence, never this
  file's — a scenario comparing its own measurement would be grading its own homework.

  A BAR IS RAISED AS DELIBERATE PROCESS OPTIMISATION AND IS NEVER LOWERED BECAUSE A PUSH WENT RED.
  Raising one because the suite has got stronger and should be held higher is a change of its own,
  in its own commit, with its own reason. Lowering one because a PR went red is the gate certifying
  the regression it exists to catch, and it is banned. Canon's rule is that a bar rises or holds and
  never re-baselines down; a fixed bar obeys it by standing still, which is why it cannot go stale
  in the direction that matters.

  READER-SHAPED ROWS RUN BEHIND THE PRODUCERS THEY READ, AND THAT IS LOAD-BEARING RATHER THAN
  CONVENTIONAL. Some of these rows print a number an earlier step of the same run left behind — a
  mutation sweep's record, a recorded sweep put beside this push's own, each suite's own timing —
  so a pipeline that puts their steps ahead of those producers meets absent artefacts and a wall of
  unsettled rows while doing exactly what it was told. Which rows those are is read off the rows
  themselves and is deliberately not counted here: a number in this prose is a second reading of
  the manifest, kept in step by whoever remembers.

  @fitness @SCN-FIT-001
  Scenario: every function and module measures inside the external complexity standard, or inside its recorded exception
    Given this repository's source as this push leaves it
    And a recorded exception for each site held above the standard
    When the external complexity standard is applied across that source
    Then every function and module measures inside the standard, or inside its own recorded exception

  @fitness @SCN-FIT-003
  Scenario: every recorded complexity exception states the value the tree currently measures
    Given the recorded complexity exceptions, each naming a value
    When each is read against what the tree now measures at that site
    Then every exception states the value the tree currently measures

  @fitness @SCN-FIT-014
  Scenario: every tag on the corpus obeys the @SCN scheme's own rules
    Given this repository's Gherkin corpus, its tags and its feature codes
    When the @SCN scheme's own rules are applied to it
    Then every tag on the corpus obeys them

  @fitness @SCN-FIT-009
  Scenario: no domain module is named for a procedural layer
    Given the modules of this repository's domain
    When each module's name is read against the procedural-layer words
    Then no domain module is named for one

  @fitness @SCN-FIT-010
  Scenario: every scenario a change touches is named by a sub-issue of the ticket it is on
    Given the scenarios this change touches, read from the diff and from the checked-out tree
    When each is asked which tracked work-item carries it
    Then every one of them is named by a sub-issue of the ticket the change is on

  @fitness @SCN-FIT-011
  Scenario: the whole tree type-checks
    Given the whole tree — source, tests, step definitions and checks alike
    When the type-checker is run over it
    Then it reports no error

  @fitness @SCN-FIT-012
  Scenario: the unit suite's wall-clock, for the ledger to hold against its ceiling
    Given the unit suite as this push runs it
    When the wrapper that launched it records its wall-clock
    Then that number is posted for the ledger to hold against the ceiling its row states

  @fitness @SCN-FIT-013
  Scenario: the behavioural suite's wall-clock, for the ledger to hold against its ceiling
    Given the behavioural suite as this push runs it
    When the wrapper that launched it records its wall-clock
    Then that number is posted for the ledger to hold against the ceiling its row states

  @fitness @SCN-FIT-002
  Scenario: the domain's mutation score, for the ledger to hold against the break threshold its runner reads from the same row
    Given the mutation sweep's record for this push
    When the domain's score is read off that record
    Then that number is posted for the ledger to hold against the break threshold its runner reads from the same row

  @fitness @SCN-FIT-017
  Scenario: no mutant the recorded sweep detected survives this push
    Given the recorded sweep's mutants and this push's own
    When the two are compared, mutant for mutant
    Then no mutant the recorded sweep detected survives this push
