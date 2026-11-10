@CLI
Feature: the command line reads what you give it, and says where each kind of output goes

  spec-controller runs a command, balance or allocate, and the command's flags go after it.

  Help answers first. It lists the commands, or a command's flags, and it
  runs nothing and writes nothing. A bare invocation answers help too.

  Every argument is read as what it is, or validation fails. The invocation stops as a usage error
  before anything runs, naming the argument and what is wrong with it.

  An input the command line names, or leaves to its default, is validated the same way, and one that
  cannot be read stops the run as a usage error too.

  A run ends on an exit code: 0 balanced, 1 out of balance, 3 not reconciled, 2 for a usage error,
  or 4 for an unexpected error before its verdict. --exit-zero moves only 1 to 0, never the code of
  a run that could not be reconciled.

  This is just about the command line. What a command does is specified in the feature files about it.

  Rule: help comes before anything else on the command line, unless it follows a command the tool does not have

    Scenario Outline: help will answer, and nothing will run
      Given a command line had <help> <beside>
      When it is read
      Then help will answer, and it will exit 0
      And nothing will have run or been written

      Examples:
        | clm         | help               | beside                                   |
        | CLM-CLI-073 | a request for help | beside an argument that fails validation |
        | CLM-ALC-013 | allocate's help    | beside a flag allocate does not take     |

    @CLM-CLI-NEW
    Scenario: help after a command the tool does not have will not answer
      Given a command line had a command the tool does not have, and a request for help after it
      When it is read
      Then it will exit 2, as for a command the tool does not have

  Rule: asking for help shows what can be asked for

    Scenario Outline: help will list what you can ask for
      Given a command line had <request>
      When it is read
      Then help will list <what it lists>, and the run will succeed

      Examples:
        | clm         | request                | what it lists                           |
        | CLM-CLI-006 | balance --help         | balance's flags                         |
        | CLM-CLI-NEW | balance -h             | balance's flags                         |
        | CLM-ALC-013 | allocate --help        | the feature code it takes and its flags |
        | CLM-CLI-007 | spec-controller --help | the commands                            |
        | CLM-CLI-NEW | spec-controller help   | the commands                            |
        | CLM-CLI-068 | nothing at all         | the commands                            |

  Rule: a command accepts only the arguments it takes

    Scenario Outline: a flag the command takes will take effect
      Given a command line had <given>
      When it is read
      Then <what happens>

      Examples:
        | clm         | given                                     | what happens                      |
        | CLM-CLI-NEW | a flag and its value as two arguments     | the flag will take that value     |
        | CLM-CLI-NEW | a flag that takes no value                | the flag will be on               |
        | CLM-CLI-NEW | --format twice                            | each report will be made          |
        | CLM-CLI-NEW | a command's flags in two different orders | both orders will be read the same |

    Scenario Outline: an argument the tool does not accept will stop the run
      Given the run met <error>
      When it stops
      Then it will give no verdict, and will exit 2
      And it will complain about the error, with <facts>

      Examples:
        | clm         | error                                         | facts                                   |
        | CLM-CLI-056 | a command the tool does not have              | the command it does not know            |
        | CLM-CLI-009 | a flag the command does not take              | the flag                                |
        | CLM-CLI-058 | a flag that takes a value, given none         | the flag, as missing its value          |
        | CLM-CLI-062 | a value given to a flag that takes none       | the flag and the value                  |
        | CLM-CLI-063 | an argument that is no flag and no value      | the argument                            |
        | CLM-CLI-064 | a flag that does not repeat, given twice      | the flag                                |
        | CLM-CLI-065 | a flag and its value joined by an equals sign | the form, and the spelling that is read |
        | CLM-CLI-060 | a flag before the command                     | the flag, as going after the command    |
        | CLM-FMT-007 | a report format the tool does not have        | the format, and the formats it has      |
        | CLM-ALC-012 | no feature code given to allocate             | that it needs a feature code            |
        | CLM-ALC-NEW | two feature codes given to allocate           | the argument past what it takes         |

  Rule: an input left out takes its default

    Scenario Outline: balance will use the default when an input is not named
      Given a balance command line had named no <input>
      When it is read
      Then balance will use <default>

      Examples:
        | clm         | input                               | default             |
        | CLM-CLI-NEW | feature corpus                      | the features folder |
        | CLM-CLI-NEW | manifest                            | package.json        |
        | CLM-CLI-NEW | CI workflows                        | .github/workflows   |
        | CLM-CLI-NEW | target name                         | unknown-target      |
        | CLM-CLI-NEW | source commit                       | the target's HEAD   |
        | CLM-CLI-NEW | source commit, in no git repository | unknown             |

    Scenario Outline: balance works out the target's folder
      Given a balance command line had named <corpus>, <where>
      When it is read
      Then the target's folder will be <folder>

      Examples:
        | clm         | corpus              | where                             | folder     |
        | CLM-CLI-NEW | no feature corpus   | run from /work/acme               | /work/acme |
        | CLM-CLI-NEW | /work/acme/features | in a git repository at /work/acme | /work/acme |
        | CLM-CLI-NEW | /tmp/x/features     | in no git repository              | /tmp/x     |

    Scenario Outline: a default that cannot be read will stop the run
      Given the run met <error>
      When it stops
      Then it will give no verdict, and will exit 2
      And it will complain about the error, with <facts>

      Examples:
        | clm         | error                                                                                | facts                                         |
        | CLM-CLI-100 | the corpus read by default that sits under a working directory that has been removed | the corpus read by default, and what is wrong |

  Rule: a command validates every input before it does its work

    Before a command does its work, it validates every input it reads, named on the command line or
    left to its default: the evidence reports, the step record, the feature corpus, the CI
    workflows and the manifest. A well-formed input that is empty is valid. A valid evidence report whose
    evidence did not fully materialise is valid too, and the run is unsound. A configuration setting
    balance cannot use is left out, as configuration.feature says.

    @CLM-CLI-080
    Scenario: an empty evidence report will count as no evidence, not as a broken file
      Given a Vitest evidence report was written well formed, listing no tests
      When balance reads it
      Then nothing will be posted from it
      And the run will not stop

    Scenario Outline: an input that is not valid will stop the run
      Given the run met <error>
      When it stops
      Then it will give no verdict, and will exit 2
      And it will complain about the error, with <facts>

      Examples:
        | clm         | error                                                               | facts                                          |
        | CLM-CLI-002 | a named input that does not exist                                   | a named input, and what is wrong               |
        | CLM-CLI-014 | a JSON evidence report that does not parse                          | a JSON evidence report, and what is wrong      |
        | CLM-CLI-016 | a feature file that does not parse                                  | a feature file, and what is wrong              |
        | CLM-CLI-102 | a workflow that does not parse                                      | a workflow, and what is wrong                  |
        | CLM-CLI-076 | a Vitest evidence report that is not in the shape Vitest writes     | a Vitest evidence report, and what is wrong    |
        | CLM-CLI-077 | a Cucumber evidence report that is not in the shape Cucumber writes | a Cucumber evidence report, and what is wrong  |
        | CLM-JST-008 | a Jest evidence report that is not in the shape Jest writes         | a Jest evidence report, and what is wrong      |
        | CLM-PYT-009 | a pytest evidence report that is not in the shape pytest writes     | a pytest evidence report, and what is wrong    |
        | CLM-GOT-009 | a JUnit evidence report that is not in the shape JUnit writes       | a JUnit evidence report, and what is wrong     |
        | CLM-JAV-011 | a file in a JUnit directory that is not in the shape JUnit writes   | a file in a JUnit directory, and what is wrong |
        | CLM-RSP-009 | an RSpec evidence report that is not in the shape RSpec writes      | an RSpec evidence report, and what is wrong    |
        | CLM-CLI-078 | a step record that is not in the shape of a record of step outcomes | a CI step record, and what is wrong            |
        | CLM-CLI-079 | a manifest that is not in a manifest's shape                        | a manifest, and what is wrong                  |
        | CLM-CLI-075 | a named path that is not the kind of path its flag reads            | a named path, and what is wrong                |
        | CLM-CLI-082 | a named input that the tool is not permitted to read                | a named input, and what is wrong               |

  Rule: each kind of output has its place

    Scenario Outline: an answer will be on standard output, and anything about it on standard error
      Given a run had produced <output>
      When it ends
      Then it will be on <place>

      Examples:
        | clm         | output               | place           |
        | CLM-ALC-NEW | allocate's answer    | standard output |
        | CLM-ALC-NEW | allocate's note      | standard error  |
        | CLM-CLI-NEW | a validation failure | standard error  |
        | CLM-CLI-NEW | an unexpected error  | standard error  |

  Rule: a run ends on its run verdict's exit code

    Scenario Outline: each run verdict will have its exit code
      Given a run had reached the run verdict <run verdict>
      When it ends
      Then it will exit <exit code>

      Examples:
        | clm         | run verdict                                  | exit code |
        | CLM-CLI-005 | balanced                                     | 0         |
        | CLM-CLI-004 | out of balance                               | 1         |
        | CLM-CLI-012 | not reconciled, because unsound              | 3         |
        | CLM-CLI-NEW | not reconciled, because claim code errors    | 3         |
        | CLM-CLI-019 | not reconciled, because nothing to reconcile | 3         |

  Rule: --exit-zero moves only an out-of-balance run's exit code, to 0

    Scenario Outline: under --exit-zero only an out-of-balance run will exit 0 instead of its code
      Given a run had ended on <ending> at <exit code>
      When it runs again under --exit-zero
      Then it will exit <under --exit-zero>
      And its run verdict, if it has one, will be the same

      Examples:
        | clm         | ending              | exit code | under --exit-zero |
        | CLM-CLI-021 | balanced            | 0         | 0                 |
        | CLM-CLI-NEW | out of balance      | 1         | 0                 |
        | CLM-CLI-NEW | not reconciled      | 3         | 3                 |
        | CLM-CLI-022 | a usage error       | 2         | 2                 |
        | CLM-CLI-NEW | an unexpected error | 4         | 4                 |

  Rule: an unexpected error stops the run, with exit code 4 and a complaint

    Scenario Outline: the run will give no verdict, and will exit 4
      Given the run met <error>
      When it stops
      Then it will give no verdict, and will exit 4
      And it will complain about the error, with <facts>

      Examples:
        | clm         | error                                          | facts     |
        | CLM-CLI-101 | an error nothing else handles                  | the error |
        | CLM-CLI-103 | an error that cannot be formatted              | the error |
        | CLM-CLI-105 | an error before the run reached its verdict    | the error |
        | CLM-CLI-106 | an error while the program loads               | the error |
        | CLM-CLI-111 | an error in reading a file the parser accepted | the error |

    @CLM-CLI-NEW
    Scenario: an unexpected error after the run verdict will leave its exit code alone
      Given a run had reached its run verdict
      And it met an unexpected error afterwards
      When it ends
      Then it will exit with its run verdict's code

    @CLM-CLI-107
    Scenario: a run will complain about only one unexpected error
      Given a run had met two unexpected errors
      When it ends
      Then it will have complained about one of them
