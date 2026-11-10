@CFG
Feature: balance reads and validates the configuration settings in the specController block

  A target's package.json can have a specController block with three configuration settings:
  runners, notChecks and deferralTags. balance reads each one, and validates it. An invalid configuration
  setting never stops the run, and the others still apply. What each one then changes belongs
  to the files about those things.

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

    Scenario Outline: a configuration setting balance cannot use will be left out
      Given the specController block had <configuration setting>
      When balance validates it
      Then the target's configuration will not include it
      And it will trigger an error <error>

      Examples:
        | clm         | configuration setting                                   | error                            |
        | CLM-CFG-004 | "unit": 3 under runners                                 | configuration-wrong-kind         |
        | CLM-CFG-005 | "runer": {} beside runners                              | configuration-unknown-key        |
        | CLM-CFG-003 | "unittest": "vitest" under runners                      | runner-key-not-a-layer           |
        | CLM-RPT-078 | "ci.yml:ci:No such step" in notChecks, with ci.yml read | not-checks-entry-matches-no-step |
        | CLM-RPT-087 | "Install dependencies" in notChecks                     | not-checks-entry-not-a-step-name |

    @unit @CLM-CFG-017
    Scenario: the run will still reach its run verdict, using the configuration settings it could use
      given the specController block had "unit": 3 and "integration": "cucumber-js" under runners
      when balance reconciles the target
      then the run will reach its run verdict
      and cucumber-js will be what runs the integration layer
