@CFG
Feature: balance reads and validates the configuration settings the run names

  A run names three kinds of configuration setting, on its command line or in its settings file:
  the runners of each layer, the non-checks and the deferral tags. A runner balance knows that no
  setting names, it finds in the workflows. The settings file names each of balance's settings by
  the name its command line uses. balance reads and validates each one.
  It leaves out a configuration setting that is not valid, names it among the configuration
  errors, and still uses the others. A setting balance cannot use never stops the run. It makes
  the run not reconciled, as evidence-reconciliation.feature claims. An input it cannot read
  stops it, whether the command line or the settings file names it.

  Rule: balance takes the settings its settings file gives, by the names its command line uses

    @unit
    Scenario Outline: balance takes each entry of the settings file as the command-line setting of the same name
      given the settings file had <entry>
      when balance reads it
      then balance will take it as <what it sets>

      Examples:
        | clm         | entry                     | what it sets                                         |
        | CLM-CFG-031 | unit: [vitest]            | vitest as the unit layer's runner                    |
        | CLM-CFG-032 | written-claims-only: true | a run verdict that counts only the executable claims |

  Rule: a setting the command line gives replaces the settings file's setting of the same name

    @unit @CLM-CFG-033
    Scenario: a runner the command line names replaces the settings file's runners for that layer alone
      given the settings file had unit: [vitest] and e2e: [playwright:junit:out/e2e.xml]
      and the run named pytest as the unit runner
      when balance reads its settings
      then pytest alone will be the unit layer's runner
      and playwright will be the e2e layer's runner

  Rule: balance takes each configuration setting it can use

    @unit
    Scenario Outline: balance takes each configuration setting it can use as the runner, non-check or deferral tag it names
      given the run named <configuration setting>
      when balance reads it
      then balance will take it as <what it sets>

      Examples:
        | clm         | configuration setting                                                                                        | what it sets                                                                               |
        | CLM-CFG-008 | --unit vitest                                                                                                | vitest as the unit layer's runner                                                          |
        | CLM-CFG-026 | --unit vitest and --unit pytest                                                                              | vitest and pytest as the unit layer's runners                                              |
        | CLM-CFG-024 | --e2e playwright:junit:out/playwright.xml                                                                    | playwright as the e2e layer's runner, with out/playwright.xml as its JUnit evidence report |
        | CLM-CFG-010 | --not-check ci.yml:ci:Install dependencies, with ci.yml read, whose job ci had the step Install dependencies | the step Install dependencies, in job ci, in ci.yml, as a non-check                        |
        | CLM-CFG-011 | --not-check nightly:build.yml:ci:Install dependencies                                                        | the step Install dependencies, in job ci, in nightly:build.yml, as a non-check             |
        | CLM-CFG-023 | --not-check nightly.yml:ci:Install dependencies, with only ci.yml read                                       | the step Install dependencies, in job ci, in nightly.yml, as a non-check                   |
        | CLM-CFG-012 | --deferral-tag deferred                                                                                      | @deferred as a deferral tag                                                                |
        | CLM-CFG-013 | --deferral-tag @blocked                                                                                      | @blocked as a deferral tag                                                                 |
        | CLM-CFG-014 | --deferral-tag with spaces around deferred                                                                   | @deferred as a deferral tag                                                                |
        | CLM-CFG-006 | nothing                                                                                                      | no runner named for any layer, no non-check, and the built-in deferral tags alone          |

  Rule: a layer the run names no runner for takes the runners balance knows that the workflows run there, and that the run named at no layer

    @unit
    Scenario Outline: balance finds a runner it knows in a workflow, at its usual layer
      given a workflow had <step>
      and the run named <named>
      when balance reads its inputs
      then <runners>

      Examples:
        | clm         | step                           | named                                      | runners                                            |
        | CLM-CFG-036 | a step running vitest run      | no runner                                  | vitest will be the unit layer's runner             |
        | CLM-CFG-037 | a step running cucumber-js     | no runner                                  | cucumber-js will be the integration layer's runner |
        | CLM-CFG-038 | a step running vitest run      | pytest as the unit runner                  | pytest alone will be the unit layer's runner       |
        | CLM-CFG-039 | a step running playwright test | pytest as the unit runner                  | playwright will be the e2e layer's runner          |
        | CLM-CFG-040 | a step running cucumber-js     | cucumber-js as the e2e runner              | the integration layer will have no runner          |
        | CLM-CFG-041 | a step running vitest run      | that step as a non-check                   | no layer will have a runner                        |
        | CLM-CFG-042 | a step running vitest run      | vitest:vitest as the unit runner, left out | vitest will be the unit layer's runner             |
        | CLM-CFG-043 | a step running my-tool test    | no runner                                  | no layer will have a runner                        |

  Rule: balance leaves out any configuration setting it cannot use, and runs anyway

    @unit
    Scenario Outline: balance leaves out a configuration setting it cannot use, naming the error
      given the run named <configuration setting>
      when balance validates it
      then the run will not use it
      and balance will find the error <error>, naming <naming>

      Examples:
        | clm         | configuration setting                                                                                                                      | error                            | naming                           |
        | CLM-CFG-004 | --unit vitest:vitest, a long form with no report                                                                                           | configuration-wrong-kind         | vitest:vitest                    |
        | CLM-CFG-015 | --not-check ci.yml:ci:No such step, with ci.yml read                                                                                       | not-checks-entry-matches-no-step | ci.yml:ci:No such step           |
        | CLM-CFG-022 | --not-check ci.yml:lint:Install dependencies, with ci.yml read, whose job ci had the step Install dependencies and whose job lint had none | not-checks-entry-matches-no-step | ci.yml:lint:Install dependencies |
        | CLM-CFG-016 | --not-check Install dependencies                                                                                                           | not-checks-entry-not-a-step-name | Install dependencies             |

    @unit
    Scenario Outline: balance leaves out an entry of the settings file it cannot use, naming the error
      given the settings file had <entry>
      when balance reads it
      then the run will not use it
      and balance will find the error <error>, naming <named>

      Examples:
        | clm         | entry           | error                     | named |
        | CLM-CFG-034 | unitt: [vitest] | configuration-unknown-key | unitt |
        | CLM-CFG-035 | unit: vitest    | configuration-wrong-kind  | unit  |

    @unit
    Scenario Outline: balance reads no evidence report for a runner whose report it cannot find, naming the error
      given the run named <runner> as the unit runner
      and <where its report was>
      when balance reads its inputs
      then it will read no evidence report for <runner>
      and balance will find the error <error>, naming <named>

      Examples:
        | clm         | runner                                                           | where its report was                                                                                   | error                   | named              |
        | CLM-CFG-025 | playwright, with out/playwright.xml as its JUnit evidence report | no file was at out/playwright.xml                                                                      | runner-report-not-read  | out/playwright.xml |
        | CLM-CFG-027 | vitest                                                           | a step ran vitest run --reporter=json --outputFile=out/vitest.json, and no file was at out/vitest.json | runner-report-not-read  | out/vitest.json    |
        | CLM-CFG-028 | my-tool, a runner balance does not know                          | a step ran my-tool                                                                                     | runner-report-not-named | my-tool            |
        | CLM-CFG-029 | vitest                                                           | a step ran vitest run, naming no report                                                                | runner-report-not-named | vitest             |
        | CLM-CFG-030 | vitest                                                           | no step ran vitest                                                                                     | runner-report-not-named | vitest             |

    @unit @CLM-CFG-017
    Scenario: balance still uses the configuration settings it can use beside one it cannot
      given the run named a unit runner it could not use, and cucumber-js as the integration runner
      when balance reconciles the target
      then cucumber-js will be what runs the integration layer
