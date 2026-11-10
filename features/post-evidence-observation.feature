@OBS
Feature: Evidence Observations are posted, each to its claim

  Your project makes claims. Running your tests and your CI produces evidence. This file is about
  turning that evidence into Evidence Observations and posting each one to the right claim.

  Evidence comes from two places: the report a test runner writes, and the steps your CI ran.

  First, balance decides what counts as evidence. Some CI steps prove nothing, like downloading the code. Those are
  skipped. A step recognised as running your tests is skipped too, because the test runner's own report already
  tells us about each test. Any other step is a fitness function.

  Next, balance writes each Evidence Observation. It says which claim it cites, whether it passed,
  failed or never ran, what kind of quality check it is, and where to look if you need to fix it.

  Last, balance posts each one. One that cites one executable claim goes to that claim. One that cites
  a claim nobody wrote goes to a phantom claim. One that cites none, or could mean more than one,
  goes to the unnamed claim.

  Rule: balance posts only the steps that prove something

    Scenario Outline: balance posts a fitness Evidence Observation only for a step that is a fitness function
      Given a workflow had <step>
      And the target's configuration had <configuration>
      When balance posts the evidence
      Then it will be counted as <counted as>
      And <posted>

      Examples:
        | clm         | step                                               | configuration                  | counted as         | posted                                        |
        | CLM-USG-031 | a step using actions/dependency-review-action      | no setting for it              | a fitness function | a fitness Evidence Observation will be posted |
        | CLM-WFS-015 | a step using someone/checkout                      | no setting for it              | a fitness function | a fitness Evidence Observation will be posted |
        | CLM-USG-004 | a step running pnpm audit-the-tree                 | no setting for it              | a fitness function | a fitness Evidence Observation will be posted |
        | CLM-WFS-006 | a step running gradle lint                         | gradle test as its unit runner | a fitness function | a fitness Evidence Observation will be posted |
        | CLM-WFS-002 | a step running eslint vitest.config.ts             | vitest as its unit runner      | a fitness function | a fitness Evidence Observation will be posted |
        | CLM-WFS-007 | a step running vitest run \| tee out.txt           | vitest as its unit runner      | a fitness function | a fitness Evidence Observation will be posted |
        | CLM-USG-017 | a step running pnpm test                           | no unit runner                 | a fitness function | a fitness Evidence Observation will be posted |
        | CLM-WFS-001 | a step running pnpm test, whose script runs vitest | vitest as its unit runner      | a runner           | nothing will be posted                        |
        | CLM-WFS-003 | a step running CI=1 npx vitest run                 | vitest as its unit runner      | a runner           | nothing will be posted                        |
        | CLM-WFS-026 | a step running pnpm lint && vitest run             | vitest as its unit runner      | a runner           | nothing will be posted                        |
        | CLM-USG-014 | a step running spec-controller balance             | no setting for it              | the reconciler     | nothing will be posted                        |
        | CLM-WFS-013 | a step writing out the step record                 | no setting for it              | the reconciler     | nothing will be posted                        |
        | CLM-USG-015 | a step named Install                               | that step in notChecks         | a non-check        | nothing will be posted                        |
        | CLM-USG-030 | a step using actions/checkout                      | no setting for it              | plumbing           | nothing will be posted                        |
        | CLM-USG-032 | a step using actions/checkout                      | that step in notChecks         | a non-check        | nothing will be posted                        |

  Rule: balance posts each result with how it went

    Scenario Outline: balance posts a result as passed or failed, citing its claim code
      Given <source> had a result with <citation>, and <outcome of it>
      When balance posts the evidence
      Then an Evidence Observation will be posted, as <result>, citing CLM-ONE-001

      Examples:
        | clm         | source                              | citation                            | outcome of it                            | result |
        | CLM-VIT-007 | Vitest's evidence report            | [CLM-ONE-001] in its title          | it passed                                | passed  |
        | CLM-VIT-NEW | Vitest's evidence report            | [CLM-ONE-001] in its title          | it failed                                | failed  |
        | CLM-JST-001 | Jest's evidence report              | [CLM-ONE-001] in its title          | it passed                                | passed  |
        | CLM-JST-002 | Jest's evidence report              | [CLM-ONE-001] in its title          | it failed                                | failed  |
        | CLM-PYT-001 | pytest's evidence report            | the clm property CLM-ONE-001        | it passed                                | passed  |
        | CLM-PYT-002 | pytest's evidence report            | the clm property CLM-ONE-001        | it failed                                | failed  |
        | CLM-GOT-001 | Go's evidence report                | [CLM-ONE-001] in its subtest's name | it passed                                | passed  |
        | CLM-GOT-002 | Go's evidence report                | [CLM-ONE-001] in its subtest's name | it failed                                | failed  |
        | CLM-JAV-001 | JUnit 5 in Java's evidence report   | [CLM-ONE-001] in its display name   | it passed                                | passed  |
        | CLM-JAV-002 | JUnit 5 in Java's evidence report   | [CLM-ONE-001] in its display name   | it failed                                | failed  |
        | CLM-KOT-001 | JUnit 5 in Kotlin's evidence report | [CLM-ONE-001] in its display name   | it passed                                | passed  |
        | CLM-KOT-NEW | JUnit 5 in Kotlin's evidence report | [CLM-ONE-001] in its display name   | it failed                                | failed  |
        | CLM-RSP-001 | RSpec's evidence report             | [CLM-ONE-001] in its description    | it passed                                | passed  |
        | CLM-RSP-002 | RSpec's evidence report             | [CLM-ONE-001] in its description    | it failed                                | failed  |
        | CLM-CUC-004 | Cucumber's evidence report          | the tag @CLM-ONE-001                | every step passed                        | passed  |
        | CLM-CUC-NEW | Cucumber's evidence report          | the tag @CLM-ONE-001                | one step failed and the next was skipped | failed  |
        | CLM-LNT-021 | the step record                     | the id CLM-ONE-001                  | it succeeded                             | passed  |
        | CLM-LNT-028 | the step record                     | the id CLM-ONE-001                  | it failed                                | failed  |
        | CLM-WFS-019 | the step record                     | the id CLM-ONE-001                  | it failed, and continue-on-error hid it  | failed  |

    Scenario Outline: balance posts nothing for a test that was skipped
      Given <source> had a test citing CLM-ONE-001, and <result>
      When balance posts the evidence
      Then nothing will be posted

      Examples:
        | clm         | source                              | result                                   |
        | CLM-VIT-NEW | Vitest's evidence report            | it was skipped or marked todo            |
        | CLM-JST-005 | Jest's evidence report              | it was skipped or marked todo            |
        | CLM-PYT-003 | pytest's evidence report            | it was skipped                           |
        | CLM-GOT-005 | Go's evidence report                | it was skipped                           |
        | CLM-JAV-007 | JUnit 5 in Java's evidence report   | it was disabled or its assumption failed |
        | CLM-KOT-NEW | JUnit 5 in Kotlin's evidence report | it was disabled or its assumption failed |
        | CLM-RSP-005 | RSpec's evidence report             | it was skipped or pending                |
        | CLM-CUC-NEW | Cucumber's evidence report          | a step was skipped and none failed       |

    Scenario Outline: balance posts what could not run as never ran
      Given <source> said <what could not run>
      When balance posts the evidence
      Then an Evidence Observation will be posted, as never-ran, citing <cited> and naming <named>

      Examples:
        | clm         | source                            | what could not run                                                                   | cited         | named                     |
        | CLM-VIT-005 | Vitest's evidence report          | a test file failed to collect                                                        | no claim code | the file and its error    |
        | CLM-JST-007 | Jest's evidence report            | a test file failed to run                                                            | no claim code | the file and its error    |
        | CLM-PYT-007 | pytest's evidence report          | a test file failed to collect                                                        | no claim code | the file and its error    |
        | CLM-GOT-007 | Go's evidence report              | a package failed to compile                                                          | no claim code | the package and its error |
        | CLM-JAV-009 | JUnit 5 in Java's evidence report | a class's setup before all its tests failed                                          | no claim code | the class and its error   |
        | CLM-RSP-008 | RSpec's evidence report           | a spec file failed to load                                                           | no claim code | the file and its error    |
        | CLM-PYT-008 | pytest's evidence report          | the setup of a test citing CLM-ONE-001 errored                                       | CLM-ONE-001   | the test                  |
        | CLM-CUC-003 | Cucumber's evidence report        | the step "one adds one" of a scenario tagged @CLM-ONE-001 matched two definitions    | CLM-ONE-001   | that step                 |
        | CLM-CUC-NEW | Cucumber's evidence report        | the step "one adds one" of a scenario tagged @CLM-ONE-001 matched no definition      | CLM-ONE-001   | that step                 |
        | CLM-LNT-026 | the step record                   | a fitness function's step with the id CLM-ONE-001 was skipped                        | CLM-ONE-001   | that step                 |
        | CLM-LNT-NEW | the step record                   | a fitness function's step with the id CLM-ONE-001 had a status balance does not know | CLM-ONE-001   | that step                 |

    @CLM-KOT-NEW
    Scenario: a Kotlin class whose setup failed will be posted as one failing result citing no claim code
      Given JUnit 5 in Kotlin's evidence report said a class's setup before all its tests failed
      When balance posts the evidence
      Then an Evidence Observation will be posted, as failed, citing no claim code

    Scenario Outline: balance posts a fitness function known only from its workflow as passed, or as passed-on-error when its failure is allowed
      Given the only evidence of a fitness function with the id CLM-ONE-001 was its step in a workflow
      And continue-on-error was <continue-on-error>
      When balance posts the evidence
      Then an Evidence Observation will be posted, as <result>, citing CLM-ONE-001

      Examples:
        | clm         | continue-on-error | result                      |
        | CLM-WFS-017 | not set           | passed                       |
        | CLM-LNT-032 | true on its step  | passed-on-error              |
        | CLM-WFS-NEW | true on its job   | passed-on-error              |

  Rule: balance posts each result at the kind of quality check its source and tags give

    Scenario Outline: a test report's result will be unit evidence, and a Cucumber result will take the kind its tags name
      Given <source> had a result citing a scenario tagged <tags>
      When balance posts the evidence
      Then it will be posted as <kind of quality check> evidence

      Examples:
        | clm         | source                     | tags                                  | kind of quality check |
        | CLM-LDG-045 | Vitest's evidence report   | any tags                              | unit                  |
        | CLM-LDG-NEW | pytest's evidence report   | any tags                              | unit                  |
        | CLM-LDG-015 | Cucumber's evidence report | no @integration, @e2e or @performance | integration           |
        | CLM-LDG-011 | Cucumber's evidence report | @e2e                                  | e2e                   |
        | CLM-LDG-NEW | Cucumber's evidence report | @performance                          | performance           |
        | CLM-LDG-014 | Cucumber's evidence report | @integration @e2e                     | integration and e2e   |

  Rule: balance posts each result citing the nearest code it has

    Scenario Outline: balance posts a nested test citing its own code, or its parent's code when the report gives one
      Given <source> had a passing test whose own citation was <test>, nested in <parent>
      When balance posts the evidence
      Then an Evidence Observation will be posted, citing <cited>

      Examples:
        | clm         | source                              | test                                       | parent                                         | cited         |
        | CLM-VIT-001 | Vitest's evidence report            | [CLM-ONE-001] in its title                 | a describe with [CLM-ONE-002] in its title     | CLM-ONE-001   |
        | CLM-VIT-NEW | Vitest's evidence report            | no claim code                              | a describe with [CLM-ONE-002] in its title     | CLM-ONE-002   |
        | CLM-VIT-003 | Vitest's evidence report            | CLM-ONE-001 in its title, with no brackets | a describe with [CLM-ONE-002] in its title     | CLM-ONE-002   |
        | CLM-JST-003 | Jest's evidence report              | [CLM-ONE-001] in its title                 | a describe with [CLM-ONE-002] in its title     | CLM-ONE-001   |
        | CLM-JST-NEW | Jest's evidence report              | no claim code                              | a describe with [CLM-ONE-002] in its title     | CLM-ONE-002   |
        | CLM-GOT-003 | Go's evidence report                | [CLM-ONE-001] in its subtest's name        | a subtest with [CLM-ONE-002] in its name       | CLM-ONE-001   |
        | CLM-GOT-NEW | Go's evidence report                | no claim code                              | a subtest with [CLM-ONE-002] in its name       | CLM-ONE-002   |
        | CLM-JAV-003 | JUnit 5 in Java's evidence report   | [CLM-ONE-001] in its display name          | a class with [CLM-ONE-002] in its display name | CLM-ONE-001   |
        | CLM-JAV-004 | JUnit 5 in Java's evidence report   | no claim code                              | a class with [CLM-ONE-002] in its display name | CLM-ONE-002   |
        | CLM-KOT-NEW | JUnit 5 in Kotlin's evidence report | no claim code                              | a class with [CLM-ONE-002] in its display name | no claim code |
        | CLM-RSP-003 | RSpec's evidence report             | [CLM-ONE-001] in its description           | a group with [CLM-ONE-002] in its description  | CLM-ONE-001   |
        | CLM-RSP-NEW | RSpec's evidence report             | no claim code                              | a group with [CLM-ONE-002] in its description  | CLM-ONE-002   |

    @CLM-CUC-006
    Scenario: balance posts each row of an Outline citing its own claim code
      Given two executable claims were rows of one Scenario Outline, with the claim codes CLM-ONE-001 and CLM-ONE-002
      And Cucumber's evidence report had a result for each row
      When balance posts the evidence
      Then an Evidence Observation will be posted for each row, citing the claim code of its row

  Rule: an Evidence Observation says where to look

    Scenario Outline: balance posts an Evidence Observation saying where to look
      Given <source> had a <kind of quality check> result, <result>, citing CLM-ONE-001
      When balance posts the evidence
      Then an Evidence Observation will be posted, saying where to look: <where to look>

      Examples:
        | clm         | source                     | kind of quality check | result                                                                          | where to look                   |
        | CLM-LDG-NEW | Vitest's evidence report   | unit                  | the test "adds two numbers" in a.test.ts                                        | "adds two numbers" in a.test.ts |
        | CLM-RPT-NEW | Vitest's evidence report   | unit                  | the test "adds two numbers" in /work/acme/a.test.ts, for a target at /work/acme | "adds two numbers" in a.test.ts |
        | CLM-LDG-NEW | Cucumber's evidence report | integration           | the scenario "one adds one" in one.feature                                      | "one adds one" in one.feature   |
        | CLM-LDG-NEW | the step record            | fitness               | the step Lint in job build of ci.yml                                            | ci.yml:build:Lint               |

  Rule: balance files each Evidence Observation under the claim it cites, or else on a phantom claim or the unnamed claim

    @CLM-LDG-022
    Scenario: balance posts an Evidence Observation to the executable claim whose code it cites
      Given scenarios tagged @CLM-ONE-001 and @CLM-ONE-002 had each raised a unit Evidence Obligation
      And Vitest's evidence report had a passing test citing CLM-ONE-001
      When balance posts the evidence
      Then an Evidence Observation will be posted to the claim of CLM-ONE-001
      And nothing will be posted to the claim of CLM-ONE-002

    @CLM-LDG-NEW
    Scenario: balance posts an Evidence Observation citing a code no executable claim has to its phantom claim
      Given no executable claim had the code CLM-ONE-999
      And Vitest's evidence report had a passing test citing CLM-ONE-999
      When balance posts the evidence
      Then an Evidence Observation will be posted to the phantom claim of CLM-ONE-999

    Scenario Outline: balance posts an Evidence Observation no single executable claim can take to the unnamed claim
      Given <source> had a passing quality check with <citation>
      When balance posts the evidence
      Then an Evidence Observation will be posted to the unnamed claim, naming <named>

      Examples:
        | clm         | source                            | citation                                              | named                       |
        | CLM-LDG-NEW | Vitest's evidence report          | no claim code in its title                            | no claim code               |
        | CLM-VIT-008 | Vitest's evidence report          | [CLM-ABCDEF-001] in its title                         | no claim code               |
        | CLM-VIT-002 | Vitest's evidence report          | CLM-ONE-999 in its title, with no brackets            | no claim code               |
        | CLM-LNT-029 | the step record                   | no id                                                 | no claim code               |
        | CLM-LDG-NEW | Vitest's evidence report          | [CLM-ONE-001] in its title, a code two claims share   | CLM-ONE-001                 |
        | CLM-VIT-004 | Vitest's evidence report          | [CLM-ONE-001] and [CLM-ONE-002] in its title          | CLM-ONE-001 and CLM-ONE-002 |
        | CLM-JST-004 | Jest's evidence report            | [CLM-ONE-001] and [CLM-ONE-002] in its title          | CLM-ONE-001 and CLM-ONE-002 |
        | CLM-PYT-006 | pytest's evidence report          | the clm properties CLM-ONE-001 and CLM-ONE-002        | CLM-ONE-001 and CLM-ONE-002 |
        | CLM-GOT-004 | Go's evidence report              | [CLM-ONE-001] and [CLM-ONE-002] in its subtest's name | CLM-ONE-001 and CLM-ONE-002 |
        | CLM-JAV-005 | JUnit 5 in Java's evidence report | [CLM-ONE-001] and [CLM-ONE-002] in its display name   | CLM-ONE-001 and CLM-ONE-002 |
        | CLM-RSP-004 | RSpec's evidence report           | [CLM-ONE-001] and [CLM-ONE-002] in its description    | CLM-ONE-001 and CLM-ONE-002 |
        | CLM-CUC-001 | Cucumber's evidence report        | the tags @CLM-ONE-001 and @CLM-ONE-002                | CLM-ONE-001 and CLM-ONE-002 |
