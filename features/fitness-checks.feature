@FIT
Feature: The fitness checks this repository declares, one scenario per check

  HOW A CHECK IS ADDED HERE, IN TWO STEPS — write the scenario, annotate the step. The scenario is
  authored like every other scenario in this corpus: a tag line carrying `@fitness` and a freshly
  minted code, a title saying what the check asserts, and steps saying it in Given/When/Then. The
  CI step that already runs the check takes that same code as its `id:`, in the pipeline this
  repository was running anyway. Neither half is derived from the
  other, which is what makes them two books rather than one read twice: a scenario derived from the
  step it is reconciled against could never disagree with it.

  SO A SCENARIO THE PIPELINE NEVER RUNS IS A FAULT SOMETHING SAYS OUT LOUD. Each scenario here
  raises its fitness Evidence Obligation from its @fitness tag; a scenario whose @SCN no CI step
  states reconciles missing and the run is out of balance, exactly as a @unit scenario with no test
  does. That is the return on authoring the two halves independently, and the whole of it: the
  disagreement is reportable because it is possible.

  WHY THE SCENARIOS EXIST AT ALL, given the pipeline already runs everything. A check reports its
  findings and says nothing when it finds none, so its silence cannot be told from its absence. The
  enumeration that tells them apart is the RUN's own record of its steps: the pipeline reports every
  step it ran and what each one did, and a scenario here is the obligation that record answers.
  Reading the pipeline alone would put the axis back to single-entry.

  THE CODE IS STORED, NEVER POSITIONAL. Each scenario's `@SCN` is the one its CI step states, chosen
  when the check was added and never derived from where the scenario sits in this file, so
  inserting one renumbers nothing and every citation elsewhere in the tree stays true. The
  numbering below is not contiguous for that reason, and that is the rule working rather than a
  gap.

  A CHECK'S STEP MAY ALSO STATE A CODE MINTED UNDER ANOTHER FEATURE, and that is the same rule. A
  code, once allocated, is stable forever: it survives a feature-file rename and is never reused.
  A check whose code is cited by something outside this repository's corpus — a record another
  pipeline stamps with it, say — therefore keeps that code while its scenario moves here, and is
  re-minted only by the change that can move every citing surface with it.

  THE TAG NAMES THE AXIS AND THE TITLE NAMES THE CHECK. Every scenario here carries `@fitness` and
  nothing else about its subject: what the check asserts is its title's to say, its `@SCN` is its
  identity, and the command that settles it is the one its CI step runs.

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

  NOTHING HERE STATES A BAR, AND NEITHER DOES THIS FILE. Every obligation is answered by its
  step's outcome: a check that measures something holds its own bar — Stryker's
  `thresholds.break`, `timeout` around a suite — and fails its step below it. Whether
  the step succeeded is the ledger's sentence, never this file's — a scenario comparing its own
  measurement would be grading its own homework.

  A BAR IS RAISED AS DELIBERATE PROCESS OPTIMISATION AND IS NEVER LOWERED BECAUSE A PUSH WENT RED.
  Raising one because the suite has got stronger and should be held higher is a change of its own,
  in its own commit, with its own reason. Lowering one because a PR went red is the gate certifying
  the regression it exists to catch, and it is banned. Canon's rule is that a bar rises or holds and
  never re-baselines down; a fixed bar obeys it by standing still, which is why it cannot go stale
  in the direction that matters.

  @fitness @SCN-FIT-001
  Scenario: every function the push touches measures inside the external complexity standard, and no dead suppression survives
    Given this repository's source as this push leaves it, and the files the push touched
    When the external complexity standard is applied across that source
    Then every function the push touched measures inside the standard
    And every other function over the standard is reported without failing the run
    And no suppression directive that suppresses nothing survives the run

  @fitness @SCN-FIT-009
  Scenario: every architectural boundary this repository draws holds, and no dead suppression survives
    Given this repository's own module graph, its source, and the names of its domain modules
    When the installed boundary tools read them
    Then no engine module imports the app package or a node IO builtin
    And no engine module references the process global
    And no engine module reads the clock or a random number
    And no app module imports the engine anywhere but its published entry point
    And no module outside run-management and cli-allocate imports child_process
    And no file in the repository detects the mutation sandbox
    And no domain module imports an adapter layer
    And no domain module is named for a procedural layer
    And no suppression directive that suppresses nothing survives the run

  @fitness @SCN-FIT-011
  Scenario: the whole tree type-checks
    Given the whole tree — source, tests, step definitions and checks alike
    When the type-checker is run over it
    Then it reports no error

  @fitness @SCN-FIT-012
  Scenario: the unit suite finishes inside the limit its step runs it under
    Given the unit suite as this push runs it
    When it is run under the limit its step states
    Then it finishes inside that limit

  @fitness @SCN-FIT-013
  Scenario: the behavioural suite finishes inside the limit its step runs it under
    Given the behavioural suite as this push runs it
    When it is run under the limit its step states
    Then it finishes inside that limit

  @fitness @SCN-FIT-002
  Scenario: the newest nightly mutation sweep of the gated branch, finished inside its window, cleared the break threshold its runner states
    Given the gated branch's nightly mutation sweeps that started inside the window before this push and have since finished
    When the newest of them is read for its verdict
    Then it cleared the break threshold its runner states
    And a window holding no such sweep fails the check rather than passing it

  @fitness @SCN-FIT-018
  Scenario: every entry point, file and field the two packages publish is one a consumer can resolve
    Given each package as its own pack would send it — its publish-time manifest standing in for its workspace manifest, wholesale
    When the npm community's package linter reads what each one offers a consumer
    Then every entry point either manifest publishes resolves to a file its own tarball carries
    And no field either manifest publishes is one the ecosystem cannot read

  @fitness @SCN-FIT-019
  Scenario: the packed engine's declarations resolve for every consumer the package says it serves
    Given the engine's tarball, as this release would send it
    When every module resolution the package offers is followed to the declarations it lands on
    Then each one lands on declarations the tarball carries, under the conditions the manifest named

  @fitness @SCN-FIT-020
  Scenario: every workflow file this repository runs is one GitHub Actions can execute as written
    Given every workflow file under .github/workflows
    When the community's workflow linter reads each against the Actions schema, its expression language and its shell
    Then no workflow names a key, an expression, a context or a shell construct Actions would refuse

  @fitness @SCN-FIT-021
  Scenario: no workflow file this repository runs carries a CI security fault the community's auditor knows
    Given every workflow file under .github/workflows
    When the community's workflow auditor reads each for the faults in its catalogue
    Then no workflow carries one this repository has not ruled on by name
