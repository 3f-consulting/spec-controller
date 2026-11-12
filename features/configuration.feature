@CFG
Feature: balance reads and validates the configuration settings in the specController block

  A target's package.json can have a specController block with three configuration settings:
  runners, notChecks and deferral tags. balance reads and validates each one. A configuration
  setting that is not valid never stops the run, and the others still apply. A specController
  block that is broken as a whole, such as null, is not a setting: it stops the run as an
  unexpected error. What each setting changes is in the feature files about those things.

  Rule: balance takes each configuration setting it can use

    @unit
    Scenario Outline: balance turns each configuration setting into its internal setting
      given the specController block had <configuration setting>
      when balance reads it
      then the target's configuration will include <internal setting>

      Examples:
        | clm         | configuration setting                         | internal setting                                    |
        | CLM-CFG-008 | "unit": "vitest" under runners                | vitest as what runs the unit layer                  |
        | CLM-CFG-009 | "performance": null under runners             | that the target has no performance runner           |
        | CLM-CFG-010 | "ci.yml:ci:Install dependencies" in notChecks | the step Install dependencies, in job ci, in ci.yml |
        | CLM-CFG-011 | "nightly:build.yml:ci:Install" in notChecks   | the step Install, in job ci, in nightly:build.yml   |
        | CLM-CFG-012 | "deferred" in deferralTags                    | the tag @deferred                                   |
        | CLM-CFG-013 | "@blocked" in deferralTags                    | the tag @blocked                                    |
        | CLM-CFG-014 | " deferred " in deferralTags                  | the tag @deferred                                   |
        | CLM-CFG-006 | nothing                                       | no configuration setting                            |

  Rule: balance leaves out any configuration setting it cannot use, and runs anyway

    @unit
    Scenario Outline: a configuration setting balance cannot use will be left out
      given the specController block had <configuration setting>
      when balance validates it
      then the target's configuration will not include it
      and it will trigger an error <error>

      Examples:
        | clm         | configuration setting                                   | error                                                           |
        | CLM-CFG-004 | "unit": 3 under runners                                 | configuration-wrong-kind, naming runners.unit                   |
        | CLM-CFG-003 | "unittest": "vitest" under runners                      | runner-key-not-a-layer, naming runners.unittest                 |
        | CLM-CFG-018 | "runners": null                                         | configuration-wrong-kind, naming runners                        |
        | CLM-CFG-005 | "runer": {} beside runners                              | configuration-unknown-key, naming runer                         |
        | CLM-CFG-015 | "ci.yml:ci:No such step" in notChecks, with ci.yml read | not-checks-entry-matches-no-step, naming ci.yml:ci:No such step |
        | CLM-CFG-016 | "Install dependencies" in notChecks                     | not-checks-entry-not-a-step-name, naming Install dependencies   |
        | CLM-CFG-019 | "notChecks": "Install"                                  | configuration-wrong-kind, naming notChecks                      |
        | CLM-CFG-020 | 3 in deferralTags                                       | configuration-wrong-kind, naming deferralTags[0]                |

    @unit @CLM-CFG-017
    Scenario: the run will still reach its run verdict, using the configuration settings it could use
      given the specController block had "unit": 3 and "integration": "cucumber-js" under runners
      when balance reconciles the target
      then the run will reach its run verdict
      and cucumber-js will be what runs the integration layer
