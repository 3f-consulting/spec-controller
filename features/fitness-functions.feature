@FIT
Feature: The fitness functions this repository carries, one scenario per check

  HOW A CHECK IS ADDED HERE, IN TWO STEPS — write the scenario, annotate the step. The scenario is
  a tag line carrying `@fitness` and a freshly minted code, and a title saying what the check
  asserts. It has no Given/When/Then, because nothing here runs it. The
  CI step that runs the check takes that same code as its `id:`, in the pipeline this
  repository runs anyway. Neither half is derived from the
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
  outside the Cucumber profile's `@integration or @e2e` exactly as `@unit` does, so
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
  the regression it exists to catch, and it is banned. The rule is that a bar rises or holds and
  never re-baselines down; a fixed bar obeys it by standing still, which is why it cannot go stale
  in the direction that matters.

  @fitness @SCN-FIT-073
  Scenario: the tree breaks no rule of the repository's ESLint configuration and keeps no dead suppression, and no file the push touches carries one of its warnings

  @fitness @SCN-FIT-022
  Scenario: every function in a file the push touches scores under the external change-risk standard

  @fitness @SCN-FIT-009
  Scenario: every import boundary this repository draws holds

    The boundaries include the ports and adapters ones: an engine adapter meets another adapter only
    through the domain, a driven module of the command-line app never reaches into another, and a
    test of the app reaches the engine only through its front door or its internal seam. Every
    break fails the check; there is no list of tolerated breaks.

  @fitness @SCN-FIT-011
  Scenario: the whole tree type-checks

  @fitness @SCN-FIT-012
  Scenario: the unit suite finishes inside the limit its step runs it under

  @fitness @SCN-FIT-013
  Scenario: the behavioural suite finishes inside the limit its step runs it under

  @fitness @SCN-FIT-002
  Scenario: each push records the default branch's mutation verdict as one of four states, a fresh sweep green or red, the schedule lapsed, or no scope measured, and fails when the verdict cannot be read

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

  Rule: a push to the default branch publishes exactly when what a package ships has changed since the last release

    @fitness @SCN-FIT-066
    Scenario: a push publishes both packages when either one's built contents differ from the last release's, a changed type declaration alone included

    @fitness @SCN-FIT-067
    Scenario: a push whose release comparison cannot reach the registry publishes nothing, fails nothing, and says it could not compare

    @fitness @SCN-FIT-072
    Scenario: a push whose last release the registry does not serve yet waits for it, publishes a change once it can compare, and fails when the release is still not served

  Rule: the behavioural suite runs only on a command bundle built from the tree it is in

    @fitness @SCN-FIT-068
    Scenario: the behavioural suite refuses to start on a command bundle older than the lockfile that fixes what it bundles

  Rule: the published command installs as one package, carrying the licence of everything it bundles

    @fitness @SCN-FIT-069
    Scenario: the packed command declares no runtime dependency, so installing it installs no package its bundle already carries

    @fitness @SCN-FIT-070
    Scenario: the packed command carries the repository's licence and a notice for every package its bundle carries, the engine's included

  Rule: the command's bundle carries one copy of the engine, taken from the engine's own build

    @fitness @SCN-FIT-071
    Scenario: building the command fails, naming the import, when it imports an engine entry point the bundle does not map, even one the engine exports

  Rule: production logic is written once

    @fitness @SCN-FIT-032
    Scenario: no clone in production code touches a file the change touches

  Rule: nothing ships that nothing uses

    @fitness @SCN-FIT-033
    Scenario: no file the change touches carries an unused file, export or dependency

  Rule: mutation reaches every production source file, or the repository records which it leaves out and why

    @fitness @SCN-FIT-040
    Scenario: every production source file in the packages is in a mutation scope or on the recorded list of files no scope mutates

  Rule: the test estate stays within the ceiling the product declares

    @fitness @SCN-FIT-043
    Scenario: test code above the declared ceiling ratio to production code reds the build

  Rule: no child process runs through a shell

    @fitness @SCN-FIT-051
    Scenario: a child process started through a shell reds the build

  Rule: no code is built from a string while the program runs

    @fitness @SCN-FIT-052
    Scenario: code evaluated from a string reds the build

  Rule: no regular expression is built from a value the program receives

    @fitness @SCN-FIT-053
    Scenario: a regular expression built from a function's argument reds the build

  Rule: a file is written only where its location has been checked

    @fitness @SCN-FIT-054
    Scenario: a file written outside the modules that check the output location reds the build

  Rule: a unit test citing a domain concept's scenario lives in core's domain, never in an adapter, and a feature is a domain concept when core's domain has a module named for it

    @fitness @SCN-FIT-055
    Scenario: a unit test citing a domain concept's scenario placed outside core's domain reds the build

  Rule: every reference in a current-state document resolves

    @fitness @SCN-FIT-059
    Scenario: the build reds when a current-state document cites a file, heading or path that does not exist

  Rule: each of Gherkin and workflow YAML is parsed by one module

    @fitness @SCN-FIT-060
    Scenario: the build reds when a second module imports the Gherkin parser

    @fitness @SCN-FIT-061
    Scenario: the build reds when a module other than the workflow module and the run store imports the YAML parser

  Rule: a test helper used by more than one test file is written once, in a test-utils file

    @fitness @SCN-FIT-062
    Scenario: the build reds when a helper in a changed test file has the same name and the same body as one in another test file
