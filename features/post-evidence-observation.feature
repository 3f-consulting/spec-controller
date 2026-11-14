@OBS
Feature: Evidence Observations are posted, each to its claim

  Your project makes claims. Running your tests and your CI produces evidence. balance turns that
  evidence into Evidence Observations and posts each one to its claim.

  Evidence comes from two places: the evidence report a test runner writes, and the steps your CI
  ran.

  First, balance decides what counts as evidence. A CI step that proves nothing, such as checking
  out the code, posts nothing. Nor does a step that runs your tests, unless its id is a claim code
  the step record has. Any other step is a fitness function.

  Next, balance writes each Evidence Observation. It says whether it passed, failed, passed on
  error or never ran; its kind of quality check; the claim code it cites; and where to look.

  Last, balance posts each one. One that cites one executable claim goes to that claim. One that
  cites a claim nobody wrote goes to a phantom claim. One that cites none, or could mean more than
  one, goes to the unnamed claim.

  Rule: balance posts a step as a fitness function unless it runs a runner, runs the reconciler, sets the job up or is listed in notChecks

    @unit
    Scenario Outline: balance counts each step as what it does, and posts only a fitness function
      given a workflow had <step>
      and the target's configuration had <configuration>
      when balance posts the evidence
      then it will be counted as <counted as>
      and <posted>

      Examples:
        | clm         | step                                                                                                  | configuration                  | counted as         | posted                                                                                    |
        | CLM-OBS-004 | a step running pnpm audit-the-tree                                                                    | no setting for it              | a fitness function | a fitness Evidence Observation will be posted                                             |
        | CLM-OBS-002 | a step using actions/dependency-review-action                                                         | no setting for it              | a fitness function | a fitness Evidence Observation will be posted                                             |
        | CLM-OBS-003 | a step using someone/checkout                                                                         | no setting for it              | a fitness function | a fitness Evidence Observation will be posted                                             |
        | CLM-OBS-005 | a step running gradle lint                                                                            | gradle test as its unit runner | a fitness function | a fitness Evidence Observation will be posted                                             |
        | CLM-OBS-006 | a step running eslint vitest.config.ts                                                                | vitest as its unit runner      | a fitness function | a fitness Evidence Observation will be posted                                             |
        | CLM-OBS-007 | a step running vitest run \| tee out.txt                                                              | vitest as its unit runner      | a fitness function | a fitness Evidence Observation will be posted                                             |
        | CLM-OBS-008 | a step running pnpm test                                                                              | no unit runner                 | a fitness function | a fitness Evidence Observation will be posted                                             |
        | CLM-OBS-125 | a step running go test ./..., in a target whose test script runs vitest                               | vitest as its unit runner      | a fitness function | a fitness Evidence Observation will be posted                                             |
        | CLM-OBS-115 | a step running pnpm loop, whose script runs itself                                                   | vitest as its unit runner      | a fitness function | a fitness Evidence Observation will be posted                                             |
        | CLM-OBS-126 | a step running xvfb-run --help, a wrapper given only options                                          | vitest as its unit runner      | a fitness function | a fitness Evidence Observation will be posted                                             |
        | CLM-OBS-009 | a step running pnpm test, whose script runs vitest                                                    | vitest as its unit runner      | a runner           | nothing will be posted                                                                    |
        | CLM-OBS-010 | a step running CI=1 npx vitest run                                                                    | vitest as its unit runner      | a runner           | nothing will be posted                                                                    |
        | CLM-OBS-011 | a step running pnpm lint && vitest run                                                                | vitest as its unit runner      | a runner           | nothing will be posted                                                                    |
        | CLM-OBS-122 | a step running other lines first, such as a shell function, then vitest run                            | vitest as its unit runner      | a runner           | nothing will be posted                                                                    |
        | CLM-OBS-112 | a step running its unit runner behind a wrapper that runs the command after it                        | that runner as its unit runner | a runner           | nothing will be posted                                                                    |
        | CLM-OBS-113 | a step running a runner named in several words                                                        | that runner as its unit runner | a runner           | nothing will be posted                                                                    |
        | CLM-OBS-012 | a step running spec-controller balance                                                                | no setting for it              | the reconciler     | nothing will be posted                                                                    |
        | CLM-OBS-013 | a step writing out the step record                                                                    | no setting for it              | the reconciler     | nothing will be posted                                                                    |
        | CLM-OBS-109 | a step running spec-controller balance                                                                | that step in notChecks         | the reconciler     | nothing will be posted                                                                    |
        | CLM-OBS-015 | a step using actions/checkout                                                                         | no setting for it              | plumbing           | nothing will be posted                                                                    |
        | CLM-OBS-014 | a step named Install                                                                                  | that step in notChecks         | a non-check        | nothing will be posted                                                                    |
        | CLM-OBS-016 | a step using actions/checkout                                                                         | that step in notChecks         | a non-check        | nothing will be posted                                                                    |

  Rule: balance posts a runner's recorded outcome as fitness evidence only when the step's id is a claim code the step record has

    @unit
    Scenario Outline: balance posts a step's recorded outcome, citing its id, only when the step runs a runner and its id is a recorded claim code
      given a workflow had <step>
      and the target's configuration had <configuration>
      when balance posts the evidence
      then it will be counted as <counted as>
      and <posted>

      Examples:
        | clm         | step                                                                                                  | configuration                  | counted as         | posted                                                                                    |
        | CLM-OBS-108 | a step running vitest run, with the id CLM-ONE-001, whose outcome the step record has               | vitest as its unit runner      | a runner           | its recorded outcome will be posted as a fitness Evidence Observation, citing CLM-ONE-001 |
        | CLM-OBS-145 | a step running vitest run, with the id unit, whose outcome the step record has                      | vitest as its unit runner      | a runner           | nothing will be posted                                                                    |
        | CLM-OBS-146 | a step running vitest run, with the id CLM-ONE-001, whose outcome a step record, given, does not have | vitest as its unit runner      | a runner           | nothing will be posted                                                                    |
        | CLM-OBS-147 | a step using actions/checkout, with the id CLM-ONE-001, whose outcome the step record has           | no setting for it              | plumbing           | nothing will be posted                                                                    |

  Rule: balance posts each result with how it went

    @unit
    Scenario Outline: balance posts a result as passed or failed
      given <source> had a result with <citation>, and <outcome of it>
      when balance posts the evidence
      then an Evidence Observation will be posted, as <result>, citing <cited>

      Examples:
        | clm         | source                              | citation                                                      | outcome of it                                                | result           | cited         |
        | CLM-OBS-017 | Vitest's evidence report            | [CLM-ONE-001] in its title                                    | it passed                                                    | passed           | CLM-ONE-001   |
        | CLM-OBS-018 | Vitest's evidence report            | [CLM-ONE-001] in its title                                    | it failed                                                    | failed           | CLM-ONE-001   |
        | CLM-OBS-025 | JUnit 5 in Java's evidence report   | [CLM-ONE-001] in its display name                             | it passed                                                    | passed           | CLM-ONE-001   |
        | CLM-OBS-026 | JUnit 5 in Java's evidence report   | [CLM-ONE-001] in its display name                             | it failed                                                    | failed           | CLM-ONE-001   |
        | CLM-OBS-118 | JUnit 5 in Java's evidence report   | [CLM-ONE-001] in its display name                             | it raised an error                                           | failed           | CLM-ONE-001   |
        | CLM-OBS-029 | RSpec's evidence report             | [CLM-ONE-001] in its description                              | it passed                                                    | passed           | CLM-ONE-001   |
        | CLM-OBS-030 | RSpec's evidence report             | [CLM-ONE-001] in its description                              | it failed                                                    | failed           | CLM-ONE-001   |
        | CLM-OBS-031 | Cucumber's evidence report          | the tag @CLM-ONE-001                                          | every step passed                                            | passed           | CLM-ONE-001   |
        | CLM-OBS-032 | Cucumber's evidence report          | the tag @CLM-ONE-001                                          | one step failed and the next was skipped                     | failed           | CLM-ONE-001   |
        | CLM-OBS-121 | Cucumber's evidence report          | the tag @CLM-ONE-001                                          | every step passed, after a Background and a hook that passed | passed           | CLM-ONE-001   |
        | CLM-OBS-033 | the step record                     | the id CLM-ONE-001                                            | it succeeded                                                 | passed           | CLM-ONE-001   |
        | CLM-OBS-034 | the step record                     | the id CLM-ONE-001                                            | it failed                                                    | failed           | CLM-ONE-001   |
        | CLM-OBS-035 | the step record                     | the id CLM-ONE-001                                            | it failed, and continue-on-error hid it                      | failed           | CLM-ONE-001   |
        | CLM-OBS-136 | the step record                     | the id audit, on a step in ci.yml running pnpm audit-the-tree | it succeeded                                                 | passed           | no claim code |
        | CLM-OBS-123 | the step record                     | the id audit, on a step in ci.yml running pnpm audit-the-tree | it failed                                                    | failed           | no claim code |

    @unit @CLM-OBS-143
    Scenario: balance posts each recorded step citing its own claim code
      given the step record had the ids CLM-ONE-001 and CLM-ONE-002, on two steps in ci.yml, and each succeeded
      when balance posts the evidence
      then two Evidence Observations will be posted, as passed, each citing its own step's code

    @unit
    Scenario Outline: balance posts nothing for a test that was skipped or had no steps
      given <source> had a test citing CLM-ONE-001, and <what happened>
      when balance posts the evidence
      then nothing will be posted

      Examples:
        | clm         | source                              | what happened                            |
        | CLM-OBS-036 | Vitest's evidence report            | it was skipped or marked todo            |
        | CLM-OBS-040 | JUnit 5 in Java's evidence report   | it was disabled or its assumption failed |
        | CLM-OBS-042 | RSpec's evidence report             | it was skipped or pending                |
        | CLM-OBS-043 | Cucumber's evidence report          | a step was skipped and none failed       |
        | CLM-OBS-106 | Cucumber's evidence report          | it was a scenario with no steps          |

    @unit @CLM-OBS-149
    Scenario: balance posts nothing from an evidence report that lists no tests
      given a Vitest evidence report was written well formed, listing no tests
      when balance posts the evidence
      then nothing will be posted
      and the run will not stop

    @unit
    Scenario Outline: balance posts what could not run as never ran
      given <source> said <what could not run>
      when balance posts the evidence
      then an Evidence Observation will be posted, as never-ran, citing <cited> and naming <named>

      Examples:
        | clm         | source                            | what could not run                                                                                            | cited         | named                                      |
        | CLM-OBS-044 | Vitest's evidence report          | a test file failed to collect                                                                                 | no claim code | the file and its error                     |
        | CLM-OBS-046 | pytest's evidence report          | a test file failed to collect                                                                                 | no claim code | the file and its error                     |
        | CLM-OBS-047 | Go's evidence report              | a package failed to compile                                                                                   | no claim code | the package and its error                  |
        | CLM-OBS-048 | JUnit 5 in Java's evidence report | a class's setup before all its tests failed                                                                   | no claim code | the class and its error                    |
        | CLM-OBS-049 | RSpec's evidence report           | a spec file failed to load                                                                                    | no claim code | the file and its error                     |
        | CLM-OBS-099 | RSpec's evidence report           | the suite failed to load, naming no spec file                                                                 | no claim code | the error                                  |
        | CLM-OBS-050 | pytest's evidence report          | the setup of a test citing CLM-ONE-001 errored                                                                | CLM-ONE-001   | the test                                   |
        | CLM-OBS-051 | Cucumber's evidence report        | the step "one adds one" of a scenario tagged @CLM-ONE-001 matched two definitions                             | CLM-ONE-001   | the step "Given one adds one"              |
        | CLM-OBS-110 | Cucumber's evidence report        | a scenario tagged @CLM-ONE-001 had a step that failed, and the step "one adds one" that matched no definition | CLM-ONE-001   | the step "Given one adds one"              |
        | CLM-OBS-053 | the step record                   | a fitness function's step with the id CLM-ONE-001 was skipped                                                 | CLM-ONE-001   | that step                                  |
        | CLM-OBS-137 | the step record                   | a fitness function's step with the id audit, in ci.yml running pnpm audit-the-tree, was skipped               | no claim code | that step                                  |

    @unit @CLM-OBS-055
    Scenario: balance posts a Kotlin class whose setup failed as one failed Evidence Observation, citing no claim code
      given JUnit 5 in Kotlin's evidence report said a class's setup before all its tests failed
      when balance posts the evidence
      then an Evidence Observation will be posted, as failed, citing no claim code

    @unit
    Scenario Outline: balance posts a failed test with the message its report gave
      given <source> had a failed test, citing CLM-ONE-001, whose report gave <said>
      when balance posts the evidence
      then an Evidence Observation will be posted, as failed, with the message <message>

      Examples:
        | clm         | source                     | said                                      | message                               |
        | CLM-OBS-132 | Vitest's evidence report   | the failure message "expected 2"          | "expected 2"                          |
        | CLM-OBS-133 | Vitest's evidence report   | the failure messages "first" and "second" | "first" then "second", in the order given |

    @unit
    Scenario Outline: balance posts a fitness function known only from its workflow as passed, or as passed-on-error when its failure is allowed
      given the only evidence of a fitness function with the id CLM-ONE-001 was its step in a workflow
      and continue-on-error was <continue-on-error>
      when balance posts the evidence
      then an Evidence Observation will be posted, as <result>, citing CLM-ONE-001

      Examples:
        | clm         | continue-on-error | result          |
        | CLM-OBS-056 | not set           | passed          |
        | CLM-OBS-057 | true on its step  | passed-on-error |

    @unit
    Scenario Outline: balance posts a recorded step with no workflow step only when its id is a claim code
      given the step record had an entry for <id> that was skipped
      and no workflow balance read had a step with the id <id>
      when balance posts the evidence
      then <posted> will be posted

      Examples:
        | clm         | id          | posted                                                                                                                     |
        | CLM-OBS-096 | CLM-ONE-001 | one never-ran fitness Evidence Observation, citing CLM-ONE-001, saying where to look: CLM-ONE-001, with the note skipped |
        | CLM-OBS-148 | audit       | nothing                                                                                                                    |

    @unit @CLM-OBS-150
    Scenario: balance posts the results of a JUnit evidence report written as one suite or as suites of suites
      given a JUnit evidence report was written well formed, as one suite or as a suites element with suites in it
      when balance posts the evidence
      then an Evidence Observation will be posted for each of its tests

  Rule: balance posts each result at the kind of quality check its source and tags give

    @unit @CLM-OBS-059
    Scenario: balance posts a test runner's result as unit evidence, whatever its tags
      given Vitest's evidence report had a result citing a scenario tagged @e2e
      when balance posts the evidence
      then it will be posted as unit evidence

    @unit
    Scenario Outline: balance posts a Cucumber result once for each kind its tags name
      given Cucumber's evidence report had a result citing a scenario tagged <tags>
      when balance posts the evidence
      then an Evidence Observation will be posted for each of <kinds>

      Examples:
        | clm         | tags                                  | kinds               |
        | CLM-OBS-061 | no @integration, @e2e or @performance | integration         |
        | CLM-OBS-062 | @e2e                                  | e2e                 |
        | CLM-OBS-063 | @performance                          | performance         |
        | CLM-OBS-064 | @integration @e2e                     | integration and e2e |

  Rule: balance posts each result citing the nearest code it has

    @unit
    Scenario Outline: balance posts a nested test citing its own code, or its parent's code when the report gives one
      given <source> had a passing test whose own citation was <test>, nested in <parent>
      when balance posts the evidence
      then an Evidence Observation will be posted, citing <cited>

      Examples:
        | clm         | source                              | test                                       | parent                                                                                  | cited         |
        | CLM-OBS-065 | Vitest's evidence report            | [CLM-ONE-001] in its title                 | a describe with [CLM-ONE-002] in its title                                              | CLM-ONE-001   |
        | CLM-OBS-066 | Vitest's evidence report            | no claim code                              | a describe with [CLM-ONE-002] in its title                                              | CLM-ONE-002   |
        | CLM-OBS-067 | Vitest's evidence report            | CLM-ONE-001 in its title, with no brackets | a describe with [CLM-ONE-002] in its title                                              | CLM-ONE-002   |
        | CLM-OBS-072 | JUnit 5 in Java's evidence report   | [CLM-ONE-001] in its display name          | a class with [CLM-ONE-002] in its display name                                          | CLM-ONE-001   |
        | CLM-OBS-073 | JUnit 5 in Java's evidence report   | no claim code                              | a class with [CLM-ONE-002] in its display name                                          | CLM-ONE-002   |
        | CLM-OBS-120 | JUnit 5 in Java's evidence report   | no claim code                              | a class with [CLM-ONE-002] in its display name, nested in one with [CLM-ONE-001] in its display name | CLM-ONE-002   |
        | CLM-OBS-074 | JUnit 5 in Kotlin's evidence report | no claim code                              | a class with [CLM-ONE-002] in its display name                                          | no claim code |
        | CLM-OBS-075 | RSpec's evidence report             | [CLM-ONE-001] in its description           | a group with [CLM-ONE-002] in its description                                           | CLM-ONE-001   |
        | CLM-OBS-076 | RSpec's evidence report             | no claim code                              | a group with [CLM-ONE-002] in its description                                           | CLM-ONE-002   |

    @unit @integration @CLM-OBS-077
    Scenario: balance posts each row of an Outline citing its own claim code
      Given two executable claims were rows of one Scenario Outline, with the claim codes CLM-ONE-001 and CLM-ONE-002
      And Cucumber's evidence report had a result for each row
      When balance posts the evidence
      Then an Evidence Observation will be posted for each row, citing the claim code of its row

    @unit
    Scenario Outline: balance posts an Outline row's result citing the claim code of the row in its own feature file
      given <its file> and one.feature each had an Outline row at line 10, with the claim codes <its code> and CLM-ONE-001
      and Cucumber's evidence report had a result for the row in <its file>
      when balance posts the evidence
      then an Evidence Observation will be posted, citing <its code>

      Examples:
        | clm         | its file        | its code    |
        | CLM-OBS-107 | two.feature     | CLM-TWO-001 |
        | CLM-OBS-138 | sub/one.feature | CLM-SUB-001 |

  Rule: an Evidence Observation says where to look

    @unit
    Scenario Outline: balance posts an Evidence Observation saying where to look
      given <source> had a result, <test or step>, citing CLM-ONE-001
      when balance posts the evidence
      then an Evidence Observation will be posted, saying where to look: <where to look>

      Examples:
        | clm         | source                     | test or step                                                                                                                        | where to look                        |
        | CLM-OBS-078 | Vitest's evidence report   | the test "adds two numbers" in a.test.ts                                                                                            | "adds two numbers" in a.test.ts      |
        | CLM-OBS-079 | Vitest's evidence report   | the test "adds two numbers" in /work/acme/a.test.ts, for a target at /work/acme                                                     | "adds two numbers" in a.test.ts      |
        | CLM-OBS-098 | Jest's evidence report     | a test in the file /home/runner/work/app/src/a.test.ts, for a target at /work/app                                                   | /home/runner/work/app/src/a.test.ts  |
        | CLM-OBS-080 | Cucumber's evidence report | the scenario "one adds one" in one.feature                                                                                          | "one adds one" in one.feature        |
        | CLM-OBS-081 | the step record            | the step Lint in job build of ci.yml                                                                                                | ci.yml:build:Lint                    |
        | CLM-OBS-102 | the step record            | the step with no name and an empty command, in job build of ci.yml                                                                  | ci.yml:build:                        |
        | CLM-OBS-103 | the step record            | the step with no name, running a blank line then pnpm lint, in job build of ci.yml                                                  | ci.yml:build:pnpm lint               |
        | CLM-OBS-104 | the step record            | the step Lint in jobs build and test of ci.yml                                                                                      | CLM-ONE-001                          |
        | CLM-OBS-142 | the step record            | the step Lint with the id CLM-ONE-001 in job build of ci.yml, recorded, while job test had the fitness function pnpm audit-the-tree | ci.yml:build:Lint                    |

  Rule: balance posts each Evidence Observation to the claim it cites, or else to a phantom claim or the unnamed claim

    @unit @CLM-OBS-082
    Scenario: balance posts an Evidence Observation to the executable claim whose code it cites
      given scenarios tagged @CLM-ONE-001 and @CLM-ONE-002 each raised a unit Evidence Obligation
      and Vitest's evidence report had a passing test citing CLM-ONE-001
      when balance posts the evidence
      then an Evidence Observation will be posted to the claim of CLM-ONE-001
      and nothing will be posted to the claim of CLM-ONE-002

    @unit @CLM-OBS-083
    Scenario: balance posts an Evidence Observation citing a code no executable claim has to its phantom claim
      given no executable claim had the code CLM-ONE-999
      and Vitest's evidence report had a passing test citing CLM-ONE-999
      when balance posts the evidence
      then an Evidence Observation will be posted to the phantom claim of CLM-ONE-999

    @unit
    Scenario Outline: balance posts an Evidence Observation no single executable claim can take to the unnamed claim
      given <source> had a passing quality check with <citation>
      when balance posts the evidence
      then an Evidence Observation will be posted to the unnamed claim, naming <named>

      Examples:
        | clm         | source                            | citation                                                                  | named                       |
        | CLM-OBS-084 | Vitest's evidence report          | no claim code in its title                                                | no claim code               |
        | CLM-OBS-085 | Vitest's evidence report          | [CLM-ABCDEF-001] in its title                                             | no claim code               |
        | CLM-OBS-087 | the step record                   | no id                                                                     | no claim code               |
        | CLM-OBS-128 | pytest's evidence report          | the ticket property CLM-ONE-002, not a clm property                       | no claim code               |
        | CLM-OBS-144 | Cucumber's evidence report        | a scenario of a feature file balance did not read, with no claim-code tag | no claim code               |
        | CLM-OBS-088 | Vitest's evidence report          | [CLM-ONE-001] in its title, a code two claims share                       | CLM-ONE-001                 |
        | CLM-OBS-089 | Vitest's evidence report          | [CLM-ONE-001] and [CLM-ONE-002] in its title                              | CLM-ONE-001 and CLM-ONE-002 |
