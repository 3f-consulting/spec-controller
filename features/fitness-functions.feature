@FIT
Feature: The fitness functions this repository carries, one scenario per check

  A check is added here in two steps: write the scenario, then annotate the step. The scenario is a
  tag line carrying `@fitness` and a freshly minted code, and a title saying what the check
  asserts. The CI step that runs the check, in the pipeline this repository runs anyway, takes that
  same code as its `id:`. Neither half is derived from the other, so they are two books rather than
  one read twice, and they can disagree. A scenario whose code no CI step states reconciles as
  missing, and the run is out of balance, as a `@unit` scenario with no test is.

  The scenarios exist because a check that finds nothing says nothing, so its silence cannot be told
  from its absence. The run's record of its steps tells them apart: the pipeline reports every step
  it ran and what each one did. Each scenario raises its fitness evidence obligation from its
  `@fitness` tag, and that record answers it.

  The tag names the axis and the title names the check. A scenario here carries no other tag about
  its subject: its title says what the check asserts, its `@SCN` is its identity, and its CI step
  runs the command that settles it. A fitness function is known by its tag, never its shape. The
  Cucumber profile selects `@integration or @e2e`, so it selects none of these scenarios. Any
  scenario that profile does not select, a `@unit`-only one included, carries no Given, When or
  Then and no step definition. The title is the specification. The evidence is the check's own
  command, run as a pipeline step under the scenario's code. It is an evidence obligation rather
  than a test, because nothing here runs it: the pipeline records what the step did, and `balance`
  reads the record.

  A code is stored, never positional. It is chosen when the check is written, never derived from
  where its scenario sits in this file, so inserting a scenario renumbers nothing and every citation
  elsewhere stays true. The numbering has gaps for that reason: the rule working rather than a gap.
  A code, once allocated, is stable forever: it survives a feature-file rename and is never reused.
  So a check's step may state a code minted under another feature. A check whose code is cited
  outside this repository's corpus, such as by a record another pipeline stamps with it, keeps that
  code when its scenario moves here. Only a change that can move every citing surface with it
  re-mints the code.

  A title states the property the check asserts, as a `@unit` scenario's title does. It never
  grades the run: "the check passes" or "the build is green" would raise the obligation and answer
  it at once, both sides of one entry, which double entry forbids. Whether a push cleared the check
  is the ledger's to say, from the record.

  No scenario states a bar, and neither does this file. Every obligation is answered by its step's
  outcome. A check that measures something holds its own bar, such as the time limit around a suite
  or the ratio check's declared ceiling, and fails its step when the measurement misses it. Whether
  the step succeeded is the ledger's to say, never this file's: a scenario that compared its own
  measurement would be grading its own work.

  A bar is raised as a deliberate process optimisation. Raising one because the suite has got
  stronger is a change of its own, in its own commit, with its own reason. A bar is never lowered
  because a push went red: that would certify the regression the gate exists to catch. A bar rises
  or holds and never re-baselines down. A fixed bar obeys that by standing still, so it cannot go
  stale in the direction that matters.

  @fitness @SCN-FIT-073
  Scenario: the source code follows this repository's design rules for its structure, its domain's language and its tests, and no file the push touches breaks a readability limit

  @fitness @SCN-FIT-022
  Scenario: every function in a file the push touches scores under the external change-risk standard

  @fitness @SCN-FIT-009
  Scenario: the packages, the engine's adapters and its domain import each other only across the boundaries this repository draws

    The boundaries include the ports and adapters ones: an engine adapter meets another adapter only
    through the domain, a driven module of the command-line app never reaches into another, and a
    test of the app reaches the engine only through its front door or its internal seam. Each input
    format's parser stays in its homes among the packages' source: only core's Gherkin module
    imports the Gherkin parser, and only core's workflow module and the run store import the YAML
    parser. Every break fails the
    check; there is no list of tolerated breaks.

  @fitness @SCN-FIT-074
  Scenario: the packages contain none of the patterns this repository forbids for security: a child process started through a shell, code built from a string, a regular expression built from an argument, or a file written outside the modules that check its location

  @fitness @SCN-FIT-011
  Scenario: the code in each package's source folder, with its unit tests, and the behavioural suite's code type-check

  @fitness @SCN-FIT-012
  Scenario: the unit suite finishes inside the limit its step runs it under

  @fitness @SCN-FIT-013
  Scenario: the behavioural suite finishes inside the limit its step runs it under

  @fitness @SCN-FIT-018
  Scenario: every entry point, file and field the two packages publish is one a consumer can resolve

  @fitness @SCN-FIT-019
  Scenario: the packed engine's declarations resolve for every consumer the package says it serves

  @fitness @SCN-FIT-020
  Scenario: every workflow file this repository runs is one GitHub Actions can execute as written

  @fitness @SCN-FIT-021
  Scenario: no workflow file this repository runs carries a CI security fault the community's auditor knows

  Rule: the build holds the comments it reads to a share of their file, and to no ticket ID, scenario code or narrated history

    A comment carries only what the code cannot say. No check reads what a comment means, so the build holds the two parts a tool can read: how much of a file is comment, and whether a comment names a ticket or a scenario or tells how the code came to be. Review holds the rest.

    @fitness @SCN-FIT-023
    Scenario: no source, script, configuration or Gherkin file is more than fifteen per cent comment lines, outside the test fixtures, the lockfile, git's ignore list and knip's configuration

    @fitness @SCN-FIT-075
    Scenario: outside the test fixtures, no comment in a module or a YAML file, and no Feature, Rule or Scenario description or current-state document, carries a ticket ID or a scenario code, or narrates how the product used to be

  Rule: every Given, When and Then in the corpus is one Cucumber runs

    @fitness @SCN-FIT-028
    Scenario: no scenario outside the tag filter Cucumber runs under carries a step

    @fitness @SCN-FIT-029
    Scenario: every step definition matches a step in a scenario Cucumber runs

  Rule: a Given, When or Then states the rule it checks, never the interface it is observed through

    @fitness @SCN-FIT-030
    Scenario: no Given, When or Then line in the corpus names an output channel, an exit code, a flag, a file name or the binary

  Rule: a title or description states behaviour in the reader's language, never the code's

    @fitness @SCN-FIT-038
    Scenario: no Feature, Rule or Scenario title or description names a code identifier or a source file

  Rule: production logic is written once

    @fitness @SCN-FIT-032
    Scenario: no clone exists anywhere in the production code

  Rule: nothing ships that nothing uses

    @fitness @SCN-FIT-033
    Scenario: outside the behavioural suite's test code, no file, export or dependency is unused, except three dependencies and one script whose use the check cannot read

  Rule: mutation reaches every production source file, or the repository records which it leaves out and why

    @fitness @SCN-FIT-040
    Scenario: every production source file in the packages is in a mutation scope or on the recorded list of files no scope mutates

  Rule: the test estate stays within the ceiling the product declares

    @fitness @SCN-FIT-043
    Scenario: test code above the declared ceiling ratio to production code reds the build

  Rule: every reference in a current-state document resolves

    @fitness @SCN-FIT-059
    Scenario: the build reds when a current-state document cites a file, heading or path that does not exist
