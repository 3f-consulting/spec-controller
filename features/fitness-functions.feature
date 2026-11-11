@FIT
Feature: the fitness functions CI runs over this repository, one scenario for each

  These are the fitness functions for spec-controller's own repository. Each one looks at the whole
  repository, or at what a push changed, and fails its CI step if it finds a fault.

  A scenario here is one fitness function. It is tagged @fitness, and its title says what will be
  true of the repository. The CI step that runs it has the scenario's claim code as its id. A
  fitness function that finds nothing prints nothing, so balance reads the run's step
  record to see that it ran and how it ended.

  A title never says a fitness function passed: that is balance's to say. A fitness function's
  limit is set where it runs, and is not repeated here.

  Rule: the source code follows this repository's design rules

    @fitness @CLM-FIT-073
    Scenario: no file breaks a design rule for its structure, its domain's language or its tests
      Given the repository had design rules for its source, its tests and its scripts
      When CI runs the fitness function over every file those rules cover
      Then no file will break a design rule

    @fitness @CLM-FIT-081
    Scenario: no file the push touches breaks a readability limit
      Given a push changed some files
      When CI runs the fitness function over those files
      Then no function in them will be over its complexity or length limit

    @fitness @CLM-FIT-009
    Scenario: the packages, core's adapters and its domain import each other only where this repository's boundaries allow, with no list of tolerated breaks
      Given the repository had drawn boundaries between its packages, core's adapters and its domain
      When CI runs the fitness function over every import in the packages
      Then no import will break a boundary, and there will be no list of tolerated breaks

    @fitness @CLM-FIT-011
    Scenario: each package's source, its unit tests and the behavioural suite's code type-check
      Given the repository had each package's source, its unit tests and the behavioural suite's code
      When CI runs the fitness function over them
      Then there will be no type error

    @fitness @CLM-FIT-022
    Scenario: every function in a file the push touches is under the CRAP limit for its complexity and coverage
      Given a push changed some source files in the packages
      And the unit suite had measured each function's coverage
      When CI runs the fitness function over those files
      Then every function in them will be under the CRAP limit

    @fitness @CLM-FIT-074
    Scenario: the packages have no child process started through a shell, no code built from a string, no regular expression built from an argument, and no file written outside the modules that check its location
      Given the repository had its packages' code
      When CI runs the fitness function over that code
      Then no child process will be started through a shell
      And no code will be built from a string
      And no regular expression will be built from an argument
      And no file will be written outside the modules that check its location

    @fitness @CLM-FIT-076
    Scenario: only the printer shows an error, with its error code
      Given the repository had its packages' code
      When CI runs the fitness function over that code
      Then only the printer will show an error

  Rule: production code is only what the product needs

    @fitness @CLM-FIT-033
    Scenario: outside the behavioural suite's test code, no file, export or dependency is unused, except the dependencies and script listed with why the fitness function cannot read their use
      Given the repository had a list of the dependencies and script whose use cannot be read
      When CI runs the fitness function over everything outside the behavioural suite's test code
      Then no file, export or dependency off that list will be unused

    @fitness @CLM-FIT-032
    Scenario: no clone exists in the production code
      Given the repository had its production code
      When CI runs the fitness function over that code
      Then there will be no clone in it

  Rule: the words around the code are few and stay true

    @fitness @CLM-FIT-023
    Scenario: no source, script, configuration or Gherkin file is over the comment-share limit, outside the test fixtures, the lockfile, git's ignore list and knip's configuration
      Given the repository had a comment-share limit
      When CI runs the fitness function over its source, script, configuration and Gherkin files, leaving out the test fixtures, the lockfile, git's ignore list and knip's configuration
      Then none will be over the limit

    @fitness @CLM-FIT-075
    Scenario: outside the test fixtures, no comment, Feature, Rule or Scenario description or current-state document names a ticket or a claim code, or narrates how the product used to be
      Given the repository had comments, descriptions and current-state documents outside the test fixtures
      When CI runs the fitness function over them
      Then none will name a ticket or a claim code
      And none will narrate how the product used to be

    @fitness @CLM-FIT-059
    Scenario: every file, heading or path a current-state document cites exists
      Given the repository had current-state documents citing files, headings and paths
      When CI runs the fitness function over those documents
      Then every file, heading and path they cite will exist

  Rule: the tests stay fast and in proportion to the code

    @fitness @CLM-FIT-012
    Scenario: the unit suite finishes inside its time limit
      Given the unit suite had a time limit
      When CI runs the unit suite
      Then the unit suite will finish inside its limit

    @fitness @CLM-FIT-013
    Scenario: the behavioural suite finishes inside its time limit
      Given the behavioural suite had a time limit
      When CI runs the behavioural suite
      Then the behavioural suite will finish inside its limit

    @fitness @CLM-FIT-043
    Scenario: test code is within the declared ceiling ratio to production code
      Given the repository had declared a ceiling for the ratio of test lines to production lines
      When CI runs the fitness function over its tracked test and production lines
      Then the ratio will be within the ceiling

  Rule: no production code misses mutation testing unannounced

    @fitness @CLM-FIT-040
    Scenario: every production source file in the packages is in a mutation scope or on the recorded list of files no scope mutates
      Given the repository had mutation scopes and a recorded list of files no scope mutates
      When CI runs the fitness function over the production source files in the packages
      Then every file will be in a scope or on the list

  Rule: a feature file states behaviour in the reader's words

    @fitness @CLM-FIT-038
    Scenario: no Feature, Rule or Scenario title or description names a code identifier or a source file
      Given the corpus had Feature, Rule and Scenario titles and descriptions
      When CI runs the fitness function over them
      Then none will name a code identifier or a source file

    @fitness @CLM-FIT-030
    Scenario: no given, when, then, and or but line in the corpus, capitalised or lowercase, names an output channel, an exit code, a flag, a file name or the binary
      Given the corpus had given, when, then, and and but lines, capitalised and lowercase
      When CI runs the fitness function over those lines
      Then none will name an interface mechanic

  Rule: every step in the corpus is one Cucumber runs

    @fitness @CLM-FIT-028
    Scenario: no scenario outside the tag filter Cucumber runs under has a step
      Given the corpus had scenarios outside the tag filter Cucumber runs under
      When CI runs the fitness function over those scenarios
      Then none will have a step

    @fitness @CLM-FIT-029
    Scenario: every step definition matches a step in a scenario Cucumber runs
      Given the repository had step definitions
      When CI runs the fitness function over them
      Then every one will match a step in a scenario Cucumber runs

  Rule: what the packages publish is what a consumer can use

    @fitness @CLM-FIT-018
    Scenario: every entry point, file and field the two packages publish resolves for a consumer
      Given the two packages were packed
      When CI runs the fitness function over what they publish
      Then every entry point, file and field will resolve for a consumer

    @fitness @CLM-FIT-019
    Scenario: the packed core's declarations resolve for every consumer the package says it serves
      Given core was packed
      When CI runs the fitness function over its declarations
      Then they will resolve for every consumer the package says it serves

  Rule: this repository's workflows are valid and safe

    @fitness @CLM-FIT-020
    Scenario: GitHub Actions can execute every workflow file
      Given the repository had workflow files
      When CI runs the fitness function over them
      Then GitHub Actions will be able to execute each one

    @fitness @CLM-FIT-021
    Scenario: no workflow file has a CI security fault the community's auditor knows
      Given the repository had workflow files
      When CI runs the fitness function over them
      Then none will have a CI security fault the community's auditor knows
