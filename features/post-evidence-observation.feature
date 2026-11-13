@OBS
Feature: Evidence Observations are posted, each to its claim

  Your project makes claims. Running your tests and your CI produces evidence. balance turns that
  evidence into Evidence Observations and posts each one to its claim.

  Evidence comes from two places: the evidence report a test runner writes, and the steps your CI
  ran.

  First, balance decides what counts as evidence. A CI step that proves nothing, such as checking
  out the code, posts nothing. Nor does a step balance recognises as running your tests. Any other step is a fitness
  function.

  Next, balance writes each Evidence Observation. It says which claim it cites, whether it
  passed, failed or never ran, its kind of quality check, and where to look.

  Last, balance posts each one. One that cites one executable claim goes to that claim. One that
  cites a claim nobody wrote goes to a phantom claim. One that cites none, or could mean more than
  one, goes to the unnamed claim.

  Rule: balance posts only the steps that prove something

    @unit
    Scenario Outline: balance posts a fitness Evidence Observation only for a step that is a fitness function, unless its id is a claim code
      given a workflow had <step>
      and the target's configuration had <configuration>
      when balance posts the evidence
      then it will be counted as <counted as>
      and <posted>

      Examples:
        | clm         | step                                                                                    | configuration                  | counted as         | posted                                                                                    |
        | CLM-OBS-004 | a step running pnpm audit-the-tree                                                      | no setting for it              | a fitness function | a fitness Evidence Observation will be posted                                             |
        | CLM-OBS-002 | a step using actions/dependency-review-action                                           | no setting for it              | a fitness function | a fitness Evidence Observation will be posted                                             |
        | CLM-OBS-003 | a step using someone/checkout                                                           | no setting for it              | a fitness function | a fitness Evidence Observation will be posted                                             |
        | CLM-OBS-005 | a step running gradle lint                                                              | gradle test as its unit runner | a fitness function | a fitness Evidence Observation will be posted                                             |
        | CLM-OBS-006 | a step running eslint vitest.config.ts                                                  | vitest as its unit runner      | a fitness function | a fitness Evidence Observation will be posted                                             |
        | CLM-OBS-007 | a step running vitest run \| tee out.txt                                                | vitest as its unit runner      | a fitness function | a fitness Evidence Observation will be posted                                             |
        | CLM-OBS-008 | a step running pnpm test                                                                | no unit runner                 | a fitness function | a fitness Evidence Observation will be posted                                             |
        | CLM-OBS-009 | a step running pnpm test, whose script runs vitest                                      | vitest as its unit runner      | a runner           | nothing will be posted                                                                    |
        | CLM-OBS-114 | a step running pnpm test, whose script runs another script, whose script runs vitest    | vitest as its unit runner      | a runner           | nothing will be posted                                                                    |
        | CLM-OBS-010 | a step running CI=1 npx vitest run                                                      | vitest as its unit runner      | a runner           | nothing will be posted                                                                    |
        | CLM-OBS-011 | a step running pnpm lint && vitest run                                                  | vitest as its unit runner      | a runner           | nothing will be posted                                                                    |
        | CLM-OBS-112 | a step running its unit runner behind a wrapper that runs the command after it         | that runner as its unit runner | a runner           | nothing will be posted                                                                    |
        | CLM-OBS-113 | a step running a runner named in several words                                          | that runner as its unit runner | a runner           | nothing will be posted                                                                    |
        | CLM-OBS-012 | a step running spec-controller balance                                                  | no setting for it              | the reconciler     | nothing will be posted                                                                    |
        | CLM-OBS-013 | a step writing out the step record                                                      | no setting for it              | the reconciler     | nothing will be posted                                                                    |
        | CLM-OBS-109 | a step running spec-controller balance                                                  | that step in notChecks         | the reconciler     | nothing will be posted                                                                    |
        | CLM-OBS-015 | a step using actions/checkout                                                           | no setting for it              | plumbing           | nothing will be posted                                                                    |
        | CLM-OBS-014 | a step named Install                                                                    | that step in notChecks         | a non-check        | nothing will be posted                                                                    |
        | CLM-OBS-016 | a step using actions/checkout                                                           | that step in notChecks         | a non-check        | nothing will be posted                                                                    |
        | CLM-OBS-108 | a step running vitest run, with the id CLM-ONE-001, whose outcome the step record holds | vitest as its unit runner      | a runner           | its recorded outcome will be posted as a fitness Evidence Observation, citing CLM-ONE-001 |

  Rule: balance posts each result with how it went

    @unit
    Scenario Outline: balance posts a result as passed or failed, citing its claim code
      given <source> had a result with <citation>, and <outcome of it>
      when balance posts the evidence
      then an Evidence Observation will be posted, as <result>, citing CLM-ONE-001

      Examples:
        | clm         | source                              | citation                            | outcome of it                            | result |
        | CLM-OBS-017 | Vitest's evidence report            | [CLM-ONE-001] in its title          | it passed                                | passed  |
        | CLM-OBS-018 | Vitest's evidence report            | [CLM-ONE-001] in its title          | it failed                                | failed  |
        | CLM-OBS-019 | Jest's evidence report              | [CLM-ONE-001] in its title          | it passed                                | passed  |
        | CLM-OBS-020 | Jest's evidence report              | [CLM-ONE-001] in its title          | it failed                                | failed  |
        | CLM-OBS-021 | pytest's evidence report            | the clm property CLM-ONE-001        | it passed                                | passed  |
        | CLM-OBS-022 | pytest's evidence report            | the clm property CLM-ONE-001        | it failed                                | failed  |
        | CLM-OBS-023 | Go's evidence report                | [CLM-ONE-001] in its subtest's name | it passed                                | passed  |
        | CLM-OBS-024 | Go's evidence report                | [CLM-ONE-001] in its subtest's name | it failed                                | failed  |
        | CLM-OBS-025 | JUnit 5 in Java's evidence report   | [CLM-ONE-001] in its display name   | it passed                                | passed  |
        | CLM-OBS-026 | JUnit 5 in Java's evidence report   | [CLM-ONE-001] in its display name   | it failed                                | failed  |
        | CLM-OBS-027 | JUnit 5 in Kotlin's evidence report | [CLM-ONE-001] in its display name   | it passed                                | passed  |
        | CLM-OBS-028 | JUnit 5 in Kotlin's evidence report | [CLM-ONE-001] in its display name   | it failed                                | failed  |
        | CLM-OBS-029 | RSpec's evidence report             | [CLM-ONE-001] in its description    | it passed                                | passed  |
        | CLM-OBS-030 | RSpec's evidence report             | [CLM-ONE-001] in its description    | it failed                                | failed  |
        | CLM-OBS-031 | Cucumber's evidence report          | the tag @CLM-ONE-001                | every step passed                        | passed  |
        | CLM-OBS-032 | Cucumber's evidence report          | the tag @CLM-ONE-001                | one step failed and the next was skipped | failed  |
        | CLM-OBS-033 | the step record                     | the id CLM-ONE-001                  | it succeeded                             | passed  |
        | CLM-OBS-034 | the step record                     | the id CLM-ONE-001                  | it failed                                | failed  |
        | CLM-OBS-035 | the step record                     | the id CLM-ONE-001                  | it failed, and continue-on-error hid it  | failed  |

    @unit
    Scenario Outline: balance posts nothing for a test that was skipped
      given <source> had a test citing CLM-ONE-001, and <result>
      when balance posts the evidence
      then nothing will be posted

      Examples:
        | clm         | source                              | result                                   |
        | CLM-OBS-036 | Vitest's evidence report            | it was skipped or marked todo            |
        | CLM-OBS-037 | Jest's evidence report              | it was skipped or marked todo            |
        | CLM-OBS-038 | pytest's evidence report            | it was skipped                           |
        | CLM-OBS-039 | Go's evidence report                | it was skipped                           |
        | CLM-OBS-040 | JUnit 5 in Java's evidence report   | it was disabled or its assumption failed |
        | CLM-OBS-041 | JUnit 5 in Kotlin's evidence report | it was disabled or its assumption failed |
        | CLM-OBS-042 | RSpec's evidence report             | it was skipped or pending                |
        | CLM-OBS-043 | Cucumber's evidence report          | a step was skipped and none failed       |

    @unit @CLM-OBS-106
    Scenario: balance posts nothing for a Cucumber scenario that had no steps
      given Cucumber's evidence report had a scenario tagged @CLM-ONE-001 with no steps
      when balance posts the evidence
      then nothing will be posted

    @unit
    Scenario Outline: balance posts what could not run as never ran
      given <source> said <what could not run>
      when balance posts the evidence
      then an Evidence Observation will be posted, as never-ran, citing <cited> and naming <named>

      Examples:
        | clm         | source                            | what could not run                                                                                            | cited         | named                                      |
        | CLM-OBS-044 | Vitest's evidence report          | a test file failed to collect                                                                                 | no claim code | the file and its error                     |
        | CLM-OBS-045 | Jest's evidence report            | a test file failed to run                                                                                     | no claim code | the file and its error                     |
        | CLM-OBS-046 | pytest's evidence report          | a test file failed to collect                                                                                 | no claim code | the file and its error                     |
        | CLM-OBS-047 | Go's evidence report              | a package failed to compile                                                                                   | no claim code | the package and its error                  |
        | CLM-OBS-100 | Go's evidence report              | TestMain failed before any test ran                                                                           | no claim code | the package and its error                  |
        | CLM-OBS-048 | JUnit 5 in Java's evidence report | a class's setup before all its tests failed                                                                   | no claim code | the class and its error                    |
        | CLM-OBS-049 | RSpec's evidence report           | a spec file failed to load                                                                                    | no claim code | the file and its error                     |
        | CLM-OBS-099 | RSpec's evidence report           | the suite failed to load, naming no spec file                                                                 | no claim code | the error                                  |
        | CLM-OBS-050 | pytest's evidence report          | the setup of a test citing CLM-ONE-001 errored                                                                | CLM-ONE-001   | the test                                   |
        | CLM-OBS-051 | Cucumber's evidence report        | the step "one adds one" of a scenario tagged @CLM-ONE-001 matched two definitions                             | CLM-ONE-001   | that step as written, "Given one adds one" |
        | CLM-OBS-052 | Cucumber's evidence report        | the step "one adds one" of a scenario tagged @CLM-ONE-001 matched no definition                               | CLM-ONE-001   | that step as written, "Given one adds one" |
        | CLM-OBS-110 | Cucumber's evidence report        | a scenario tagged @CLM-ONE-001 had a step that failed, and the step "one adds one" that matched no definition | CLM-ONE-001   | that step as written, "Given one adds one" |
        | CLM-OBS-053 | the step record                   | a fitness function's step with the id CLM-ONE-001 was skipped                                                 | CLM-ONE-001   | that step                                  |
        | CLM-OBS-054 | the step record                   | a fitness function's step with the id CLM-ONE-001 had a status balance does not know                          | CLM-ONE-001   | that step                                  |

    @unit @CLM-OBS-055
    Scenario: a Kotlin class whose setup failed will be posted as one failing result citing no claim code
      given JUnit 5 in Kotlin's evidence report said a class's setup before all its tests failed
      when balance posts the evidence
      then an Evidence Observation will be posted, as failed, citing no claim code

    @unit
    Scenario Outline: balance posts a fitness function known only from its workflow as passed, or as passed-on-error when its failure is allowed
      given the only evidence of a fitness function with the id CLM-ONE-001 was its step in a workflow
      and continue-on-error was <continue-on-error>
      when balance posts the evidence
      then an Evidence Observation will be posted, as <result>, citing CLM-ONE-001

      Examples:
        | clm         | continue-on-error | result                      |
        | CLM-OBS-056 | not set           | passed                       |
        | CLM-OBS-057 | true on its step  | passed-on-error              |
        | CLM-OBS-058 | true on its job   | passed-on-error              |

    @unit @CLM-OBS-096
    Scenario: balance posts a recorded step that no workflow holds at its claim code, as never ran, with the note the record gave
      given the step record had an entry for CLM-ONE-001 that was skipped
      and no workflow balance read had a step with the id CLM-ONE-001
      when balance posts the evidence
      then one never-ran fitness Evidence Observation will be posted, citing CLM-ONE-001, placed at CLM-ONE-001, with the note skipped

    @unit @CLM-OBS-097
    Scenario: a fitness function whose id is not a claim code will be posted once, citing no claim code
      given a workflow had a step running pnpm audit-the-tree with the id audit
      and the step record had an entry for audit
      when balance posts the evidence
      then one fitness Evidence Observation will be posted, citing no claim code

  Rule: balance posts each result at the kind of quality check its source and tags give

    @unit
    Scenario Outline: a test report's result will be unit evidence, and a Cucumber result will take the kind its tags name
      given <source> had a result citing a scenario tagged <tags>
      when balance posts the evidence
      then it will be posted as <kind of quality check> evidence

      Examples:
        | clm         | source                                                    | tags                                  | kind of quality check |
        | CLM-OBS-059 | Vitest's evidence report                                  | any tags                              | unit                  |
        | CLM-OBS-060 | pytest's evidence report                                  | any tags                              | unit                  |
        | CLM-OBS-061 | Cucumber's evidence report                                | no @integration, @e2e or @performance | integration           |
        | CLM-OBS-062 | Cucumber's evidence report                                | @e2e                                  | e2e                   |
        | CLM-OBS-063 | Cucumber's evidence report                                | @performance                          | performance           |
        | CLM-OBS-064 | Cucumber's evidence report                                | @integration @e2e                     | integration and e2e   |
        | CLM-OBS-111 | Cucumber's evidence report, for a scenario that never ran | @integration @e2e                     | integration and e2e   |

  Rule: balance posts each result citing the nearest code it has

    @unit
    Scenario Outline: balance posts a nested test citing its own code, or its parent's code when the report gives one
      given <source> had a passing test whose own citation was <test>, nested in <parent>
      when balance posts the evidence
      then an Evidence Observation will be posted, citing <cited>

      Examples:
        | clm         | source                              | test                                       | parent                                         | cited         |
        | CLM-OBS-065 | Vitest's evidence report            | [CLM-ONE-001] in its title                 | a describe with [CLM-ONE-002] in its title     | CLM-ONE-001   |
        | CLM-OBS-066 | Vitest's evidence report            | no claim code                              | a describe with [CLM-ONE-002] in its title     | CLM-ONE-002   |
        | CLM-OBS-067 | Vitest's evidence report            | CLM-ONE-001 in its title, with no brackets | a describe with [CLM-ONE-002] in its title     | CLM-ONE-002   |
        | CLM-OBS-068 | Jest's evidence report              | [CLM-ONE-001] in its title                 | a describe with [CLM-ONE-002] in its title     | CLM-ONE-001   |
        | CLM-OBS-069 | Jest's evidence report              | no claim code                              | a describe with [CLM-ONE-002] in its title     | CLM-ONE-002   |
        | CLM-OBS-070 | Go's evidence report                | [CLM-ONE-001] in its subtest's name        | a subtest with [CLM-ONE-002] in its name       | CLM-ONE-001   |
        | CLM-OBS-071 | Go's evidence report                | no claim code                              | a subtest with [CLM-ONE-002] in its name       | CLM-ONE-002   |
        | CLM-OBS-072 | JUnit 5 in Java's evidence report   | [CLM-ONE-001] in its display name          | a class with [CLM-ONE-002] in its display name | CLM-ONE-001   |
        | CLM-OBS-073 | JUnit 5 in Java's evidence report   | no claim code                              | a class with [CLM-ONE-002] in its display name | CLM-ONE-002   |
        | CLM-OBS-074 | JUnit 5 in Kotlin's evidence report | no claim code                              | a class with [CLM-ONE-002] in its display name | no claim code |
        | CLM-OBS-075 | RSpec's evidence report             | [CLM-ONE-001] in its description           | a group with [CLM-ONE-002] in its description  | CLM-ONE-001   |
        | CLM-OBS-076 | RSpec's evidence report             | no claim code                              | a group with [CLM-ONE-002] in its description  | CLM-ONE-002   |

    @unit @integration @CLM-OBS-077
    Scenario: balance posts each row of an Outline citing its own claim code
      Given two executable claims were rows of one Scenario Outline, with the claim codes CLM-ONE-001 and CLM-ONE-002
      And Cucumber's evidence report had a result for each row
      When balance posts the evidence
      Then an Evidence Observation will be posted for each row, citing the claim code of its row

    @unit @CLM-OBS-107
    Scenario: balance posts an Outline row's result citing the claim code of the row in its own feature file
      given one.feature and two.feature each had an Outline row at line 10, with the claim codes CLM-ONE-001 and CLM-TWO-001
      and Cucumber's evidence report had a result for the row in two.feature
      when balance posts the evidence
      then an Evidence Observation will be posted, citing CLM-TWO-001

  Rule: an Evidence Observation says where to look

    @unit
    Scenario Outline: balance posts an Evidence Observation saying where to look
      given <source> had a <kind of quality check> result, <result>, citing CLM-ONE-001
      when balance posts the evidence
      then an Evidence Observation will be posted, saying where to look: <where to look>

      Examples:
        | clm         | source                     | kind of quality check | result                                                                             | where to look                   |
        | CLM-OBS-078 | Vitest's evidence report   | unit                  | the test "adds two numbers" in a.test.ts                                           | "adds two numbers" in a.test.ts |
        | CLM-OBS-079 | Vitest's evidence report   | unit                  | the test "adds two numbers" in /work/acme/a.test.ts, for a target at /work/acme    | "adds two numbers" in a.test.ts |
        | CLM-OBS-080 | Cucumber's evidence report | integration           | the scenario "one adds one" in one.feature                                         | "one adds one" in one.feature   |
        | CLM-OBS-081 | the step record            | fitness               | the step Lint in job build of ci.yml                                               | ci.yml:build:Lint               |
        | CLM-OBS-101 | the step record            | fitness               | the step with 3 as its name, running pnpm lint, in job build of ci.yml             | ci.yml:build:pnpm lint          |
        | CLM-OBS-102 | the step record            | fitness               | the step with no name and an empty command, in job build of ci.yml                 | ci.yml:build:                   |
        | CLM-OBS-103 | the step record            | fitness               | the step with no name, running a blank line then pnpm lint, in job build of ci.yml | ci.yml:build:pnpm lint          |
        | CLM-OBS-104 | the step record            | fitness               | the step Lint in jobs build and test of ci.yml                                     | CLM-ONE-001                     |

    @unit @CLM-OBS-098
    Scenario: a test file outside the target's folder will be placed at the absolute path its evidence report recorded
      given the target's folder was /work/app
      and Jest's evidence report recorded a test file at /home/runner/work/app/src/a.test.ts
      when balance posts the evidence
      then the Evidence Observation's place will be /home/runner/work/app/src/a.test.ts

  Rule: balance files each Evidence Observation under the claim it cites, or else on a phantom claim or the unnamed claim

    @unit @CLM-OBS-082
    Scenario: balance posts an Evidence Observation to the executable claim whose code it cites
      given scenarios tagged @CLM-ONE-001 and @CLM-ONE-002 had each raised a unit Evidence Obligation
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
        | clm         | source                            | citation                                              | named                       |
        | CLM-OBS-084 | Vitest's evidence report          | no claim code in its title                            | no claim code               |
        | CLM-OBS-085 | Vitest's evidence report          | [CLM-ABCDEF-001] in its title                         | no claim code               |
        | CLM-OBS-086 | Vitest's evidence report          | CLM-ONE-999 in its title, with no brackets            | no claim code               |
        | CLM-OBS-087 | the step record                   | no id                                                 | no claim code               |
        | CLM-OBS-105 | pytest's evidence report          | the clm property CLM-A-001, which is not a claim code | no claim code               |
        | CLM-OBS-088 | Vitest's evidence report          | [CLM-ONE-001] in its title, a code two claims share   | CLM-ONE-001                 |
        | CLM-OBS-089 | Vitest's evidence report          | [CLM-ONE-001] and [CLM-ONE-002] in its title          | CLM-ONE-001 and CLM-ONE-002 |
        | CLM-OBS-090 | Jest's evidence report            | [CLM-ONE-001] and [CLM-ONE-002] in its title          | CLM-ONE-001 and CLM-ONE-002 |
        | CLM-OBS-091 | pytest's evidence report          | the clm properties CLM-ONE-001 and CLM-ONE-002        | CLM-ONE-001 and CLM-ONE-002 |
        | CLM-OBS-092 | Go's evidence report              | [CLM-ONE-001] and [CLM-ONE-002] in its subtest's name | CLM-ONE-001 and CLM-ONE-002 |
        | CLM-OBS-093 | JUnit 5 in Java's evidence report | [CLM-ONE-001] and [CLM-ONE-002] in its display name   | CLM-ONE-001 and CLM-ONE-002 |
        | CLM-OBS-094 | RSpec's evidence report           | [CLM-ONE-001] and [CLM-ONE-002] in its description    | CLM-ONE-001 and CLM-ONE-002 |
        | CLM-OBS-095 | Cucumber's evidence report        | the tags @CLM-ONE-001 and @CLM-ONE-002                | CLM-ONE-001 and CLM-ONE-002 |
