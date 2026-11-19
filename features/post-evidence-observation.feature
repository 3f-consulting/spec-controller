@OBS
Feature: Evidence Observations are posted, each to its claim

  balance turns the evidence from your tests and your CI into Evidence Observations and posts each
  one to its claim.

  Evidence comes from two places: the evidence report a test runner writes, and the steps your CI
  ran.

  A CI step that proves nothing, such as checking out the code, posts nothing. Nor does a step
  balance recognises as running your tests. Any other step is a fitness function.

  Each Evidence Observation says which claim it cites, whether it passed, failed, never ran or
  was not recorded, its kind of quality check, and where to look.

  An Evidence Observation that cites one executable claim is posted to that claim. One that cites
  a claim nobody wrote is posted to a phantom claim. One that cites none, or could mean more than
  one, is posted to the unnamed claim.

  Rule: balance identifies each result's kind of quality check

    @unit
    Scenario Outline: balance identifies whether a CI step is a fitness function
      given a workflow had <step>
      and the target's configuration had <configuration>
      when balance reads the workflow
      then it <fitness function> a fitness function

      Examples:
        | clm         | step                                                                                                  | configuration                  | fitness function |
        | CLM-OBS-004 | a step running pnpm audit-the-tree                                                                    | no setting for it              | will be          |
        | CLM-OBS-002 | a step using actions/dependency-review-action                                                         | no setting for it              | will be          |
        | CLM-OBS-003 | a step using someone/checkout                                                                         | no setting for it              | will be          |
        | CLM-OBS-005 | a step running gradle lint                                                                            | gradle test as its unit runner | will be          |
        | CLM-OBS-006 | a step running eslint vitest.config.ts                                                                | vitest as its unit runner      | will be          |
        | CLM-OBS-007 | a step running vitest run \| tee out.txt                                                              | vitest as its unit runner      | will be          |
        | CLM-OBS-008 | a step running pnpm test                                                                              | no unit runner                 | will be          |
        | CLM-OBS-139 | a step named Install in job test of ci.yml, whose job ci had a step named Install                     | ci.yml:ci:Install in notChecks | will be          |
        | CLM-OBS-140 | a step named Install in job ci of nightly.yml, beside ci.yml's step Install in job ci                 | ci.yml:ci:Install in notChecks | will be          |
        | CLM-OBS-141 | a step using actions/dependency-review-action                                                         | vitest as its unit runner      | will be          |
        | CLM-OBS-009 | a step running pnpm test, whose script runs vitest                                                    | vitest as its unit runner      | will not be      |
        | CLM-OBS-114 | a step running pnpm test, whose script runs another script, whose script runs vitest                  | vitest as its unit runner      | will not be      |
        | CLM-OBS-131 | a step running pnpm run //, whose scripts entry is a list, not a string                               | vitest as its unit runner      | will be          |
        | CLM-OBS-115 | a step running pnpm loop, whose script runs itself                                                    | vitest as its unit runner      | will be          |
        | CLM-OBS-125 | a step running go test ./..., in a target whose test script runs vitest                               | vitest as its unit runner      | will be          |
        | CLM-OBS-010 | a step running CI=1 npx vitest run                                                                    | vitest as its unit runner      | will not be      |
        | CLM-OBS-116 | a step running uv run python -m pytest                                                                | pytest as its unit runner      | will not be      |
        | CLM-OBS-011 | a step running pnpm lint && vitest run                                                                | vitest as its unit runner      | will not be      |
        | CLM-OBS-122 | a step defining a shell function, then running vitest run                                             | vitest as its unit runner      | will not be      |
        | CLM-OBS-124 | a step setting start=$SECONDS on one line, then running vitest run                                    | vitest as its unit runner      | will not be      |
        | CLM-OBS-127 | a step running an if … fi block, then vitest run                                                      | vitest as its unit runner      | will not be      |
        | CLM-OBS-112 | a step running its unit runner behind a wrapper that runs the command after it                        | that runner as its unit runner | will not be      |
        | CLM-OBS-117 | a step running xvfb-run -s 99 vitest run                                                              | vitest as its unit runner      | will not be      |
        | CLM-OBS-126 | a step running xvfb-run --help, a wrapper given only options                                          | vitest as its unit runner      | will be          |
        | CLM-OBS-113 | a step running a runner named in several words                                                        | that runner as its unit runner | will not be      |
        | CLM-OBS-012 | a step running spec-controller balance                                                                | no setting for it              | will not be      |
        | CLM-OBS-119 | a step running spec-controller balance \| tee report.md                                               | no setting for it              | will not be      |
        | CLM-OBS-013 | a step writing out the step record                                                                    | no setting for it              | will not be      |
        | CLM-OBS-109 | a step running spec-controller balance                                                                | that step in notChecks         | will not be      |
        | CLM-OBS-015 | a step using actions/checkout                                                                         | no setting for it              | will not be      |
        | CLM-OBS-014 | a step named Install                                                                                  | that step in notChecks         | will not be      |
        | CLM-OBS-016 | a step using actions/checkout                                                                         | that step in notChecks         | will not be      |
        | CLM-OBS-108 | a step running vitest run, with the id CLM-ONE-001, whose outcome the step record has                 | vitest as its unit runner      | will be          |
        | CLM-OBS-145 | a step running vitest run, with the id unit, whose outcome the step record has                        | vitest as its unit runner      | will not be      |
        | CLM-OBS-146 | a step running vitest run, with the id CLM-ONE-001, whose outcome a step record, given, does not have | vitest as its unit runner      | will not be      |
        | CLM-OBS-147 | a step using actions/checkout, with the id CLM-ONE-001, whose outcome the step record has             | no setting for it              | will not be      |

    @unit
    Scenario Outline: balance identifies a result's kind of quality check as the layer its report's runner serves
      given the target's configuration named <runners>
      and <result>
      when balance reads the evidence
      then the result will be <kind of quality check> evidence

      Examples:
        | clm         | runners                                                              | result                                                                 | kind of quality check |
        | CLM-OBS-164 | playwright as the e2e runner, writing playwright.xml                 | playwright.xml had a result                                            | e2e                   |
        | CLM-OBS-059 | no runner writing a Vitest evidence report                           | that report had a result                                               | unit                  |
        | CLM-OBS-061 | no runner writing a Cucumber evidence report                         | that report had a result for a scenario tagged @e2e                    | integration           |
        | CLM-OBS-063 | cucumber-js as the performance runner, writing cucumber.json         | cucumber.json had a result for a scenario with no kind tag             | performance           |
        | CLM-OBS-062 | cucumber-js as the integration and e2e runner, writing cucumber.json | cucumber.json had a result for a scenario tagged @e2e                  | e2e                   |
        | CLM-OBS-064 | cucumber-js as the integration and e2e runner, writing cucumber.json | cucumber.json had a result for a scenario tagged @integration @e2e     | integration and e2e   |
        | CLM-OBS-111 | cucumber-js as the integration and e2e runner, writing cucumber.json | cucumber.json had a scenario tagged @integration @e2e that never ran   | integration and e2e   |
        | CLM-OBS-165 | cucumber-js as the integration and e2e runner, writing cucumber.json | cucumber.json had a result for a scenario with no kind tag             | integration and e2e   |

  Rule: balance reads each result as passed or failed, however its source writes it

    @unit
    Scenario Outline: balance reads a result as passed or failed, citing the code it names
      given <source> had a result with <citation>, and <outcome of it>
      when balance reads the evidence
      then the result will be <result>, citing <cited>

      Examples:
        | clm         | source                              | citation                                                      | outcome of it                                                | result           | cited         |
        | CLM-OBS-017 | Vitest's evidence report            | [CLM-ONE-001] in its title                                    | it passed                                                    | passed           | CLM-ONE-001   |
        | CLM-OBS-018 | Vitest's evidence report            | [CLM-ONE-001] in its title                                    | it failed                                                    | failed           | CLM-ONE-001   |
        | CLM-OBS-021 | pytest's evidence report            | the clm property CLM-ONE-001                                  | it passed                                                    | passed           | CLM-ONE-001   |
        | CLM-OBS-022 | pytest's evidence report            | the clm property CLM-ONE-001                                  | it failed                                                    | failed           | CLM-ONE-001   |
        | CLM-OBS-156 | pytest's evidence report            | the clm property CLM-ONE-001, written twice                   | it passed                                                    | passed           | CLM-ONE-001   |
        | CLM-OBS-023 | Go's evidence report                | [CLM-ONE-001] in its subtest's name                           | it passed                                                    | passed           | CLM-ONE-001   |
        | CLM-OBS-024 | Go's evidence report                | [CLM-ONE-001] in its subtest's name                           | it failed                                                    | failed           | CLM-ONE-001   |
        | CLM-OBS-025 | JUnit 5 in Java's evidence report   | [CLM-ONE-001] in its display name                             | it passed                                                    | passed           | CLM-ONE-001   |
        | CLM-OBS-026 | JUnit 5 in Java's evidence report   | [CLM-ONE-001] in its display name                             | it failed                                                    | failed           | CLM-ONE-001   |
        | CLM-OBS-118 | JUnit 5 in Java's evidence report   | [CLM-ONE-001] in its display name                             | it raised an error                                           | failed           | CLM-ONE-001   |
        | CLM-OBS-027 | JUnit 5 in Kotlin's evidence report | [CLM-ONE-001] in its display name                             | it passed                                                    | passed           | CLM-ONE-001   |
        | CLM-OBS-028 | JUnit 5 in Kotlin's evidence report | [CLM-ONE-001] in its display name                             | it failed                                                    | failed           | CLM-ONE-001   |
        | CLM-OBS-029 | RSpec's evidence report             | [CLM-ONE-001] in its description                              | it passed                                                    | passed           | CLM-ONE-001   |
        | CLM-OBS-030 | RSpec's evidence report             | [CLM-ONE-001] in its description                              | it failed                                                    | failed           | CLM-ONE-001   |
        | CLM-OBS-031 | Cucumber's evidence report          | the tag @CLM-ONE-001                                          | every step passed                                            | passed           | CLM-ONE-001   |
        | CLM-OBS-032 | Cucumber's evidence report          | the tag @CLM-ONE-001                                          | one step failed and the next was skipped                     | failed           | CLM-ONE-001   |
        | CLM-OBS-121 | Cucumber's evidence report          | the tag @CLM-ONE-001                                          | every step passed, after a Background and a hook that passed | passed           | CLM-ONE-001   |
        | CLM-OBS-034 | the step record                     | the id CLM-ONE-001, on a step in ci.yml                       | it failed                                                    | failed           | CLM-ONE-001   |
        | CLM-OBS-035 | the step record                     | the id CLM-ONE-001, on a step in ci.yml                       | it failed, and continue-on-error hid it                      | failed           | CLM-ONE-001   |
        | CLM-OBS-136 | the step record                     | the id audit, on a step in ci.yml running pnpm audit-the-tree | it succeeded                                                 | passed           | no claim code |
        | CLM-OBS-123 | the step record                     | the id audit, on a step in ci.yml running pnpm audit-the-tree | it failed                                                    | failed           | no claim code |
        | CLM-OBS-143 | the step record                     | the ids CLM-ONE-001 and CLM-ONE-002, on two steps in ci.yml   | each succeeded                                               | passed, for each | its own code  |

  Rule: balance posts each result as an Evidence Observation of its kind

    @unit
    Scenario Outline: balance posts a result at its kind of quality check, as it went, citing its code
      given a <kind of quality check> result, passed, citing CLM-ONE-001
      when balance posts the evidence
      then a <kind of quality check> Evidence Observation will be posted, as passed, citing CLM-ONE-001

      Examples:
        | clm         | kind of quality check |
        | CLM-OBS-151 | unit                  |
        | CLM-OBS-152 | integration           |
        | CLM-OBS-153 | e2e                   |
        | CLM-OBS-154 | performance           |
        | CLM-OBS-155 | fitness               |

  Rule: balance posts each result with how it went

    @unit
    Scenario Outline: balance posts nothing for a test that was skipped
      given <source> had a test citing CLM-ONE-001, and <result>
      when balance posts the evidence
      then nothing will be posted

      Examples:
        | clm         | source                              | result                                   |
        | CLM-OBS-036 | Vitest's evidence report            | it was skipped or marked todo            |
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

    @unit @CLM-OBS-130
    Scenario: balance posts from a Cucumber evidence report that leaves out a feature's or a scenario's empty lists
      given Cucumber's evidence report left out the scenarios of a feature that had none, the steps of a scenario that had none, and the tags of a scenario that had none
      and the scenario with no tags had every step pass
      when balance posts the evidence
      then an Evidence Observation will be posted for that scenario alone, as passed, citing no claim code

    @unit
    Scenario Outline: balance posts what could not run as never ran
      given <source> said <what could not run>
      when balance posts the evidence
      then an Evidence Observation will be posted, as never-ran, citing <cited> and naming <named>

      Examples:
        | clm         | source                            | what could not run                                                                                            | cited         | named                         |
        | CLM-OBS-044 | Vitest's evidence report          | a test file failed to collect                                                                                 | no claim code | the file and its error        |
        | CLM-OBS-045 | Jest's evidence report            | a test file failed to run                                                                                     | no claim code | the file and its error        |
        | CLM-OBS-046 | pytest's evidence report          | a test file failed to collect                                                                                 | no claim code | the file and its error        |
        | CLM-OBS-047 | Go's evidence report              | a package failed to compile                                                                                   | no claim code | the package and its error     |
        | CLM-OBS-100 | Go's evidence report              | TestMain failed before any test ran                                                                           | no claim code | the package and its error     |
        | CLM-OBS-048 | JUnit 5 in Java's evidence report | a class's setup before all its tests failed                                                                   | no claim code | the class and its error       |
        | CLM-OBS-049 | RSpec's evidence report           | a spec file failed to load                                                                                    | no claim code | the file and its error        |
        | CLM-OBS-129 | RSpec's evidence report           | a spec file failed to load, and the run wrote no other message                                                | no claim code | the file and its error        |
        | CLM-OBS-099 | RSpec's evidence report           | the suite failed to load, naming no spec file                                                                 | no claim code | the error                     |
        | CLM-OBS-050 | pytest's evidence report          | the setup of a test citing CLM-ONE-001 errored                                                                | CLM-ONE-001   | the test                      |
        | CLM-OBS-051 | Cucumber's evidence report        | the step "one adds one" of a scenario tagged @CLM-ONE-001 matched two definitions                             | CLM-ONE-001   | the step "Given one adds one" |
        | CLM-OBS-052 | Cucumber's evidence report        | the step "one adds one" of a scenario tagged @CLM-ONE-001 matched no definition                               | CLM-ONE-001   | the step "Given one adds one" |
        | CLM-OBS-110 | Cucumber's evidence report        | a scenario tagged @CLM-ONE-001 had a step that failed, and the step "one adds one" that matched no definition | CLM-ONE-001   | the step "Given one adds one" |
        | CLM-OBS-053 | the step record                   | a fitness function's step with the id CLM-ONE-001, in ci.yml, was skipped                                     | CLM-ONE-001   | that step                     |
        | CLM-OBS-137 | the step record                   | a fitness function's step with the id audit, in ci.yml running pnpm audit-the-tree, was skipped               | no claim code | that step                     |
        | CLM-OBS-054 | the step record                   | a fitness function's step with the id CLM-ONE-001, in ci.yml, had a status balance does not know              | CLM-ONE-001   | that step                     |

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
        | CLM-OBS-133 | Vitest's evidence report   | the failure messages "first" and "second" | "first" and "second", the first first |
        | CLM-OBS-134 | RSpec's evidence report    | the message "expected 2"                  | "expected 2"                          |
        | CLM-OBS-135 | Cucumber's evidence report | the failed step's message "expected 2"    | "expected 2"                          |

    @unit
    Scenario Outline: balance posts a fitness function's step the step record does not name as not recorded
      given a workflow had a fitness function's step <identity>, and continue-on-error <continue-on-error>
      and <step record>
      when balance posts the evidence
      then an Evidence Observation will be posted, as not recorded

      Examples:
        | clm         | identity                | continue-on-error | step record                                                        |
        | CLM-OBS-056 | with the id CLM-ONE-001 | was not set       | no step record was given                                           |
        | CLM-OBS-157 | with the id CLM-ONE-001 | was not set       | the step record had entries for other steps and none for that step |
        | CLM-OBS-158 | with the id CLM-ONE-001 | was true on it    | no step record was given                                           |
        | CLM-OBS-159 | with no id              | was not set       | a step record was given                                            |

    @unit
    Scenario Outline: balance posts a fitness function's step from each step record that names it
      given a workflow had a fitness function's step with the id CLM-ONE-001
      and the run read two step records, <records>
      when balance posts the evidence
      then <posted>, citing CLM-ONE-001

      Examples:
        | clm         | records                                                          | posted                                                                      |
        | CLM-OBS-166 | one with no entry for CLM-ONE-001, and one in which it succeeded | one fitness Evidence Observation will be posted, as passed                  |
        | CLM-OBS-167 | one in which CLM-ONE-001 succeeded, and one in which it failed   | two fitness Evidence Observations will be posted, one passed and one failed |

    @unit
    Scenario Outline: balance posts a recorded success in a workflow as passed-on-error only when its step or its job sets continue-on-error to anything but false
      given the step record had a result with the id CLM-ONE-001, on a fitness function's step in ci.yml, and it succeeded
      and ci.yml set continue-on-error on <where> to <value>
      when balance posts the evidence
      then an Evidence Observation will be posted, as <result>, citing CLM-ONE-001

      Examples:
        | clm         | where           | value | result          |
        | CLM-OBS-057 | that step       | true  | passed-on-error |
        | CLM-OBS-058 | that step's job | true  | passed-on-error |
        | CLM-OBS-160 | that step       | false | passed          |

    @unit
    Scenario Outline: balance posts a recorded step that no workflow has with the result its step record gives
      given the step record had an entry for <id> that <outcome>
      and no workflow balance read had a step with the id <id>
      when balance posts the evidence
      then a fitness Evidence Observation will be posted, as <result>, citing <cited>, placed at <id>

      Examples:
        | clm         | id          | outcome     | result          | cited         |
        | CLM-OBS-096 | CLM-ONE-001 | was skipped | never-ran       | CLM-ONE-001   |
        | CLM-OBS-162 | CLM-ONE-001 | succeeded   | passed-on-error | CLM-ONE-001   |
        | CLM-OBS-163 | CLM-ONE-001 | failed      | failed          | CLM-ONE-001   |
        | CLM-OBS-148 | audit       | succeeded   | passed-on-error | no claim code |

    @unit @CLM-OBS-097
    Scenario: balance posts a fitness function whose id is not a claim code once, citing no claim code
      given a workflow had a step running pnpm audit-the-tree with the id audit
      and the step record had an entry for audit
      when balance posts the evidence
      then one fitness Evidence Observation will be posted, citing no claim code

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
        | CLM-OBS-070 | Go's evidence report                | [CLM-ONE-001] in its subtest's name        | a subtest with [CLM-ONE-002] in its name                                                | CLM-ONE-001   |
        | CLM-OBS-071 | Go's evidence report                | no claim code                              | a subtest with [CLM-ONE-002] in its name                                                | CLM-ONE-002   |
        | CLM-OBS-072 | JUnit 5 in Java's evidence report   | [CLM-ONE-001] in its display name          | a class with [CLM-ONE-002] in its display name                                          | CLM-ONE-001   |
        | CLM-OBS-073 | JUnit 5 in Java's evidence report   | no claim code                              | a class with [CLM-ONE-002] in its display name                                          | CLM-ONE-002   |
        | CLM-OBS-120 | JUnit 5 in Java's evidence report   | no claim code                              | a class with [CLM-ONE-002] in its display name, nested in one with [CLM-ONE-001] in its | CLM-ONE-002   |
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

    @unit @CLM-OBS-161
    Scenario: balance posts a fitness function's step the step record does not name citing no claim code
      given a workflow had a fitness function's step with the id CLM-ONE-001
      and an executable claim carried CLM-ONE-001
      and the step record had entries for other steps and none for that step
      when balance posts the evidence
      then an Evidence Observation will be posted, citing no claim code

  Rule: an Evidence Observation says where to look

    @unit
    Scenario Outline: balance posts an Evidence Observation saying where to look
      given <source> had a <kind of quality check> result, <result>, citing CLM-ONE-001
      when balance posts the evidence
      then an Evidence Observation will be posted, saying where to look: <where to look>

      Examples:
        | clm         | source                     | kind of quality check | result                                                                                                                              | where to look                   |
        | CLM-OBS-078 | Vitest's evidence report   | unit                  | the test "adds two numbers" in a.test.ts                                                                                            | "adds two numbers" in a.test.ts |
        | CLM-OBS-079 | Vitest's evidence report   | unit                  | the test "adds two numbers" in /work/acme/a.test.ts, for a target at /work/acme                                                     | "adds two numbers" in a.test.ts |
        | CLM-OBS-080 | Cucumber's evidence report | integration           | the scenario "one adds one" in one.feature                                                                                          | "one adds one" in one.feature   |
        | CLM-OBS-081 | the step record            | fitness               | the step Lint in job build of ci.yml                                                                                                | ci.yml:build:Lint               |
        | CLM-OBS-101 | the step record            | fitness               | the step with 3 as its name, running pnpm lint, in job build of ci.yml                                                              | ci.yml:build:3                  |
        | CLM-OBS-102 | the step record            | fitness               | the step with no name and an empty command, in job build of ci.yml                                                                  | ci.yml:build:                   |
        | CLM-OBS-103 | the step record            | fitness               | the step with no name, running a blank line then pnpm lint, in job build of ci.yml                                                  | ci.yml:build:pnpm lint          |
        | CLM-OBS-104 | the step record            | fitness               | the step Lint in jobs build and test of ci.yml                                                                                      | CLM-ONE-001                     |
        | CLM-OBS-142 | the step record            | fitness               | the step Lint with the id CLM-ONE-001 in job build of ci.yml, recorded, while job test had the fitness function pnpm audit-the-tree | ci.yml:build:Lint               |

    @unit @CLM-OBS-098
    Scenario: balance places a test file outside the target's folder at the absolute path its evidence report recorded
      given the target's folder was /work/app
      and Jest's evidence report recorded a test file at /home/runner/work/app/src/a.test.ts
      when balance posts the evidence
      then the Evidence Observation's place will be /home/runner/work/app/src/a.test.ts

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
        | CLM-OBS-086 | Vitest's evidence report          | CLM-ONE-999 in its title, with no brackets                                | no claim code               |
        | CLM-OBS-105 | pytest's evidence report          | the clm property CLM-A-001, which is not a claim code                     | no claim code               |
        | CLM-OBS-128 | pytest's evidence report          | the ticket property CLM-ONE-002, not a clm property                       | no claim code               |
        | CLM-OBS-144 | Cucumber's evidence report        | a scenario of a feature file balance did not read, with no claim-code tag | no claim code               |
        | CLM-OBS-088 | Vitest's evidence report          | [CLM-ONE-001] in its title, a code two claims share                       | CLM-ONE-001                 |
        | CLM-OBS-089 | Vitest's evidence report          | [CLM-ONE-001] and [CLM-ONE-002] in its title                              | CLM-ONE-001 and CLM-ONE-002 |
        | CLM-OBS-090 | Jest's evidence report            | [CLM-ONE-001] and [CLM-ONE-002] in its title                              | CLM-ONE-001 and CLM-ONE-002 |
        | CLM-OBS-091 | pytest's evidence report          | the clm properties CLM-ONE-001 and CLM-ONE-002                            | CLM-ONE-001 and CLM-ONE-002 |
        | CLM-OBS-092 | Go's evidence report              | [CLM-ONE-001] and [CLM-ONE-002] in its subtest's name                     | CLM-ONE-001 and CLM-ONE-002 |
        | CLM-OBS-093 | JUnit 5 in Java's evidence report | [CLM-ONE-001] and [CLM-ONE-002] in its display name                       | CLM-ONE-001 and CLM-ONE-002 |
        | CLM-OBS-094 | RSpec's evidence report           | [CLM-ONE-001] and [CLM-ONE-002] in its description                        | CLM-ONE-001 and CLM-ONE-002 |
        | CLM-OBS-095 | Cucumber's evidence report        | the tags @CLM-ONE-001 and @CLM-ONE-002                                    | CLM-ONE-001 and CLM-ONE-002 |
