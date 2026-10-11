@FIT
Feature: The fitness functions this repository carries, one scenario per check

  HOW A CHECK IS ADDED HERE, IN TWO STEPS — write the scenario, annotate the step. The scenario is
  a tag line carrying `@fitness` and a freshly minted code, and a title saying what the check
  asserts. It has no Given/When/Then, because nothing here runs it. The
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
  when the check is written and never derived from where the scenario sits in this file, so
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
  Cucumber selects none of these scenarios. A scenario Cucumber does not select carries no
  Given/When/Then and no step definition, here as for a `@unit`-only scenario: the title is the
  SPECIFICATION, saying what the check asserts of this tree, and the check's own command — run as a
  step of the pipeline under this scenario's code — is the EVIDENCE. It is an EVIDENCE OBLIGATION
  rather than a test, because nothing here runs it: the pipeline records what that step did, and
  `balance` reads the record.

  WHAT A TITLE HERE MAY NOT DO IS GRADE THE RUN. "the check passes", or "the build is green", is the
  scenario raising the obligation and answering it in the same breath — BOTH SIDES OF THE ENTRY,
  which is the one thing double entry cannot allow. The title states the PROPERTY ASSERTED, as a
  `@unit` scenario's does; whether this push cleared it is the ledger's sentence, taken from the
  record.

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

  @fitness @SCN-FIT-022
  Scenario: every function in a file the push touches scores under the external change-risk standard

  @fitness @SCN-FIT-009
  Scenario: every architectural boundary this repository draws holds, and no dead suppression survives

  @fitness @SCN-FIT-011
  Scenario: the whole tree type-checks

  @fitness @SCN-FIT-012
  Scenario: the unit suite finishes inside the limit its step runs it under

  @fitness @SCN-FIT-013
  Scenario: the behavioural suite finishes inside the limit its step runs it under

  @fitness @SCN-FIT-002
  Scenario: the newest nightly mutation sweep of the gated branch, finished inside its window, cleared the break threshold its runner states

  @fitness @SCN-FIT-018
  Scenario: every entry point, file and field the two packages publish is one a consumer can resolve

  @fitness @SCN-FIT-019
  Scenario: the packed engine's declarations resolve for every consumer the package says it serves

  @fitness @SCN-FIT-020
  Scenario: every workflow file this repository runs is one GitHub Actions can execute as written

  @fitness @SCN-FIT-021
  Scenario: no workflow file this repository runs carries a CI security fault the community's auditor knows

  Rule: a comment carries only what the code cannot say, and the build holds it to that on every run

    @fitness @SCN-FIT-023
    Scenario: no file in the tree is more than fifteen per cent comment lines

    @fitness @SCN-FIT-024
    Scenario: no comment, description or current-state document in the tree carries a ticket ID

    @fitness @SCN-FIT-025
    Scenario: no comment, description or current-state document in the tree carries a scenario code

    @fitness @SCN-FIT-026
    Scenario: no comment, description or current-state document in the tree narrates how the product used to be

  Rule: a second evidence layer reaches the product only through a seam

    @fitness @SCN-FIT-027
    Scenario: no step definition imports the product's own modules, by a path into its packages or by its core package's name

  Rule: every Given, When and Then in the corpus is one Cucumber runs

    @fitness @SCN-FIT-028
    Scenario: no scenario outside the tag filter Cucumber runs under carries a step

    @fitness @SCN-FIT-029
    Scenario: every step definition matches a step in a scenario Cucumber runs

    @fitness @SCN-FIT-044
    Scenario: every scenario Cucumber runs takes all its steps from one step-definition file

  Rule: a Given, When or Then states the rule it checks, never the interface it is observed through

    @fitness @SCN-FIT-030
    Scenario: no Given, When or Then line in the corpus names an output channel, an exit code, a flag, a file name or the binary

  Rule: a title or description states behaviour in the reader's language, never the code's

    @fitness @SCN-FIT-038
    Scenario: no Feature, Rule or Scenario title or description names a code identifier or a source file

  Rule: a test run leaves the machine it ran on as it found it

    @fitness @SCN-FIT-031
    Scenario: neither suite leaves an entry in the temporary directory it ran in

  Rule: a scenario's red is proven by a run of that scenario's own tests alone

    @fitness @SCN-FIT-034
    Scenario: a red proof of a unit scenario runs exactly the tests whose titles carry its code

    @fitness @SCN-FIT-035
    Scenario: a red proof of an integration or e2e scenario runs exactly that scenario

    @fitness @SCN-FIT-036
    Scenario: a red proof that selects no test fails, saying no test was selected

    @fitness @SCN-FIT-037
    Scenario: a red proof in which no selected test reported a result fails as not a red

  Rule: production logic is written once

    @fitness @SCN-FIT-032
    Scenario: no clone in production code touches a file the change touches

  Rule: nothing ships that nothing uses

    @fitness @SCN-FIT-033
    Scenario: no file the change touches carries an unused file, export or dependency

  Rule: a mutant is killed or removed at its source, never hidden from the mutation run

    @fitness @SCN-FIT-039
    Scenario: no source or test file in the packages carries a comment that disables a mutant

  Rule: mutation reaches every production source file, or the repository records which it leaves out and why

    @fitness @SCN-FIT-040
    Scenario: every production source file in the packages is in a mutation scope or on the recorded list of files no scope mutates

  Rule: a human-facing message is read from its package's catalogue, never written in production code

    @fitness @SCN-FIT-041
    Scenario: no production source file in the packages writes human-facing message prose outside its package's catalogue

  Rule: a unit test does its work inside the test, so mutation reads each mutant against the tests that cover it

    @fitness @SCN-FIT-042
    Scenario: no unit test file runs code at collection time or in a hook that runs once for many tests

  Rule: the test estate stays within the ceiling the product declares

    @fitness @SCN-FIT-043
    Scenario: test code above the declared ceiling ratio to production code reds the build
