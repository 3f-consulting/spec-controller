@FIT
Feature: the fitness functions CI runs over this repository, one scenario for each

  CI runs these fitness functions over spec-controller's own repository. Each one checks the
  whole repository, or what a push changed, and fails its CI step when it finds a fault.

  Each scenario is one fitness function, tagged @fitness. The CI step that runs it has the
  scenario's claim code as its id. balance reads the step record to see that the step ran and
  how it ended.

  Rule: the source code follows this repository's design rules

    @fitness @CLM-FIT-073
    Scenario: no file breaks a design rule for its structure, its domain's language or its tests
      given the repository had design rules for its source, its tests and its scripts
      when CI runs the fitness function over every file those rules cover
      then no file will break a design rule

    @fitness @CLM-FIT-081
    Scenario: no file the push touches breaks a readability limit
      given a push changed some files
      when CI runs the fitness function over those files
      then no function in them will be over its complexity or length limit

    @fitness @CLM-FIT-022
    Scenario: every function in a file the push touches is under the CRAP limit for its complexity and coverage
      given a push changed some source files in the packages
      and the unit suite measured each function's coverage
      when CI runs the fitness function over those files
      then every function in them will be under the CRAP limit

    @fitness @CLM-FIT-009
    Scenario: the packages, core's adapters and its domain import each other only where this repository's boundaries allow, with no list of tolerated breaks
      given the repository drew boundaries between its packages, core's adapters and its domain
      when CI runs the fitness function over every import in the packages
      then no import will break a boundary, and there will be no list of tolerated breaks

    @fitness @CLM-FIT-011
    Scenario: each package's source, its unit tests and the behavioural suite's code type-check
      given the repository had each package's source, its unit tests and the behavioural suite's code
      when CI runs the fitness function over them
      then there will be no type error

    @fitness @CLM-FIT-074
    Scenario: the packages use no unsafe way to start a process, build code or a pattern, or write a file
      given the repository had its packages' code
      when CI runs the fitness function over that code
      then no child process will be started through a shell
      and no code will be built from a string
      and no regular expression will be built from an argument
      and no file will be written outside the modules that check its location

    @fitness @CLM-FIT-076
    Scenario: every error the tool shows a reader is shown from one place
      given the repository had its packages' code
      when CI runs the fitness function over that code
      then only one module will show an error

  Rule: production code is only what the product needs

    @fitness @CLM-FIT-033
    Scenario: outside the behavioural suite's test code, no file, export or dependency is unused, except the dependencies and script listed with why the fitness function cannot read their use
      given the repository had a list of the dependencies and script whose use cannot be read
      when CI runs the fitness function over everything outside the behavioural suite's test code
      then no file, export or dependency off that list will be unused

    @fitness @CLM-FIT-032
    Scenario: no production code is a copy of other production code
      given the repository had its production code
      when CI runs the fitness function over that code
      then none of it will be a copy of other code in it

  Rule: the tests stay fast and in proportion to the code

    @fitness @CLM-FIT-012
    Scenario: the unit suite finishes inside its time limit
      given the unit suite had a time limit
      when CI runs the unit suite
      then the unit suite will finish inside its limit

    @fitness @CLM-FIT-013
    Scenario: the behavioural suite finishes inside its time limit
      given the behavioural suite had a time limit
      when CI runs the behavioural suite
      then the behavioural suite will finish inside its limit

    @fitness @CLM-FIT-043
    Scenario: test code is within the declared ceiling ratio to production code
      given the repository declared a ceiling for the ratio of test lines to production lines
      when CI runs the fitness function over its tracked test and production lines
      then the ratio will be within the ceiling

  Rule: no production code misses mutation testing unannounced

    @fitness @CLM-FIT-040
    Scenario: every production source file in the packages is in a mutation scope or on the recorded list of files no scope mutates
      given the repository had mutation scopes and a recorded list of files no scope mutates
      when CI runs the fitness function over the production source files in the packages
      then every file will be in a scope or on the list

  Rule: the words around the code are few and stay true

    @fitness @CLM-FIT-023
    Scenario: no source, script, configuration or Gherkin file is over the comment-share limit, outside the lockfile, git's ignore list and knip's configuration
      given the repository had a comment-share limit
      when CI runs the fitness function over its source, script, configuration and Gherkin files, leaving out the lockfile, git's ignore list and knip's configuration
      then none will be over the limit

    @fitness @CLM-FIT-075
    Scenario: no comment, description or current-state document points to the product's history
      given the repository had comments, descriptions and current-state documents
      when CI runs the fitness function over them
      then none will name a ticket or a claim code
      and none will narrate how the product used to be

    @fitness @CLM-FIT-059
    Scenario: every file, heading or path a current-state document cites exists
      given the repository had current-state documents citing files, headings and paths
      when CI runs the fitness function over those documents
      then every file, heading and path they cite will exist

    @fitness @CLM-FIT-084
    Scenario: every TypeScript example in the repository's README and its packages' READMEs type-checks
      given the repository had TypeScript examples in its README and its packages' READMEs
      when CI runs the fitness function over them
      then there will be no type error

  Rule: a feature file states behaviour in the reader's words

    @fitness @CLM-FIT-038
    Scenario: no Feature, Rule or Scenario title or description names a code identifier or a source file
      given the corpus had Feature, Rule and Scenario titles and descriptions
      when CI runs the fitness function over them
      then none will name a code identifier or a source file

    @fitness @CLM-FIT-030
    Scenario: no step in the corpus names an interface mechanic, outside the files whose subject is where output goes
      given the corpus had given, when, then, and and but lines, capitalised and lowercase
      when CI runs the fitness function over those lines
      then none will name an interface mechanic

  Rule: every step in the corpus is one Cucumber runs

    @fitness @CLM-FIT-028
    Scenario: no scenario outside the tag filter Cucumber runs under has a step
      given the corpus had scenarios outside the tag filter Cucumber runs under
      when CI runs the fitness function over those scenarios
      then none will have a step

    @fitness @CLM-FIT-029
    Scenario: every step definition matches a step in a scenario Cucumber runs
      given the repository had step definitions
      when CI runs the fitness function over them
      then every one will match a step in a scenario Cucumber runs

  Rule: what the packages publish is what a consumer can use

    @fitness @CLM-FIT-018
    Scenario: every entry point, file and field the two packages publish resolves for a consumer
      given the two packages were packed
      when CI runs the fitness function over what they publish
      then every entry point, file and field will resolve for a consumer

    @fitness @CLM-FIT-019
    Scenario: the packed core's declarations resolve for every consumer the package says it serves
      given core was packed
      when CI runs the fitness function over its declarations
      then they will resolve for every consumer the package says it serves

    @fitness @CLM-FIT-083
    Scenario: a change to the JSON report's schema raises the schema's version
      given a change altered the JSON report's schema
      when CI runs the fitness function over the change
      then the change will have raised the schema's version

  Rule: every change but a Dependabot update is told in the changelog

    @fitness @CLM-FIT-082
    Scenario: every pull request Dependabot did not open adds a line to the changelog
      given a pull request was opened by anyone but Dependabot
      when CI runs the fitness function over the pull request
      then CHANGELOG.md will have gained a line

  Rule: this repository's workflows are valid and safe

    @fitness @CLM-FIT-020
    Scenario: GitHub Actions can execute every workflow file
      given the repository had workflow files
      when CI runs the fitness function over them
      then GitHub Actions will be able to execute each one

    @fitness @CLM-FIT-021
    Scenario: no workflow file has a CI security fault the community's auditor knows
      given the repository had workflow files
      when CI runs the fitness function over them
      then none will have a CI security fault the community's auditor knows
