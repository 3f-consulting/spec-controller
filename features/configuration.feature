@CFG
Feature: balance reads and validates the configuration settings in the specController block

  A target's package.json can have a specController block with three configuration settings:
  runners, notChecks and deferral tags. balance reads and validates each one. It leaves out a
  configuration setting that is not valid, names it among the configuration errors, and still
  uses the others. A configuration setting that is not valid never stops the run. A
  specController block that is not an object, such as null, stops the run as a usage error.

  Rule: balance takes each configuration setting it can use

    @unit
    Scenario Outline: balance takes each configuration setting it can use as the runner, non-check or deferral tag it names
      given the specController block had <configuration setting>
      when balance reads it
      then balance will take it as <what it sets>

      Examples:
        | clm         | configuration setting                                                                                           | what it sets                                                                   |
        | CLM-CFG-008 | "unit": "vitest" under runners                                                                                  | vitest as the unit layer's runner                                              |
        | CLM-CFG-009 | "performance": null under runners                                                                               | the performance layer as having no runner                                      |
        | CLM-CFG-024 | "e2e": { "runner": "playwright", "reports": ["playwright.xml"] } under runners                                  | playwright as the e2e layer's runner, and playwright.xml as its report         |
        | CLM-CFG-010 | "ci.yml:ci:Install dependencies" in notChecks, with ci.yml read, whose job ci had the step Install dependencies | the step Install dependencies, in job ci, in ci.yml, as a non-check            |
        | CLM-CFG-011 | "nightly:build.yml:ci:Install dependencies" in notChecks                                                        | the step Install dependencies, in job ci, in nightly:build.yml, as a non-check |
        | CLM-CFG-023 | "nightly.yml:ci:Install dependencies" in notChecks, with only ci.yml read                                       | the step Install dependencies, in job ci, in nightly.yml, as a non-check       |
        | CLM-CFG-012 | "deferred" in deferralTags                                                                                      | @deferred as a deferral tag                                                    |
        | CLM-CFG-013 | "@blocked" in deferralTags                                                                                      | @blocked as a deferral tag                                                     |
        | CLM-CFG-014 | " deferred " in deferralTags                                                                                    | @deferred as a deferral tag                                                    |
        | CLM-CFG-006 | nothing                                                                                                         | the defaults                                                                   |

  Rule: balance leaves out any configuration setting it cannot use, and runs anyway

    @unit
    Scenario Outline: balance leaves out a configuration setting it cannot use, naming the error
      given the specController block had <configuration setting>
      when balance validates it
      then the run will not use it
      and balance will find the error <error>, naming <setting>

      Examples:
        | clm         | configuration setting                                                                                                                         | error                            | setting                          |
        | CLM-CFG-004 | "unit": 3 under runners                                                                                                                       | configuration-wrong-kind         | runners.unit                     |
        | CLM-CFG-003 | "unittest": "vitest" under runners                                                                                                            | runner-key-not-a-layer           | runners.unittest                 |
        | CLM-CFG-018 | "runners": null                                                                                                                               | configuration-wrong-kind         | runners                          |
        | CLM-CFG-025 | "e2e": { "runner": "playwright", "reports": ["playwright.xml"] } under runners, with no report named playwright.xml read                      | runner-report-not-read           | playwright.xml                   |
        | CLM-CFG-005 | "runer": {} beside runners                                                                                                                    | configuration-unknown-key        | runer                            |
        | CLM-CFG-015 | "ci.yml:ci:No such step" in notChecks, with ci.yml read                                                                                       | not-checks-entry-matches-no-step | ci.yml:ci:No such step           |
        | CLM-CFG-022 | "ci.yml:lint:Install dependencies" in notChecks, with ci.yml read, whose job ci had the step Install dependencies and whose job lint had none | not-checks-entry-matches-no-step | ci.yml:lint:Install dependencies |
        | CLM-CFG-016 | "Install dependencies" in notChecks                                                                                                           | not-checks-entry-not-a-step-name | Install dependencies             |
        | CLM-CFG-019 | "notChecks": "Install"                                                                                                                        | configuration-wrong-kind         | notChecks                        |
        | CLM-CFG-020 | 3 in deferralTags                                                                                                                             | configuration-wrong-kind         | deferralTags[0]                  |

    @unit @CLM-CFG-017
    Scenario: the run will still reach its run verdict, using the configuration settings it could use
      given the specController block had "unit": 3 and "integration": "cucumber-js" under runners
      when balance reconciles the target
      then the run will reach its run verdict
      and cucumber-js will be what runs the integration layer

  Rule: a specController block that is not an object stops the run

    @unit @CLM-CFG-021
    Scenario: a specController block that is not an object stops the run as a usage error
      given the specController block was 5, which is not an object
      when balance reads it
      then the run will stop as a usage error
