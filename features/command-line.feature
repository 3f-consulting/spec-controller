@CLI
Feature: the command line reads what you give it, and says where each kind of output goes

  spec-controller runs a command, balance or allocate. A command's flags go after it.

  Help answers first. It lists the commands, or one command's flags. It runs nothing and writes
  nothing. Running spec-controller with nothing after it also shows help. There is one exception:
  help after a command the tool does not have does not answer. The run ends with a usage error, as
  it does for any command the tool does not have.

  Every argument is read as what it is, or validation fails. Then the run stops with a usage error
  before anything runs. The error names the argument and says what is wrong with it.

  The tool validates each input the same way, whether the command line names it or leaves it to
  its default. An input that cannot be read when it is validated also stops the run with a usage
  error. A file that fails to read after validation accepted it is an unexpected error.

  A run ends on an exit code: 0 if balanced, 1 if out of balance, 3 if not reconciled, 2 for a
  usage error, and 4 for an unexpected error before the run verdict. --exit-zero changes only 1 to
  0. It never changes the code of a run that could not be reconciled.

  This file covers only the command line. The feature files for each command say what it does.

  Rule: asking for help shows what can be asked for

    @unit
    Scenario Outline: help will list what you can ask for
      given a command line had <request>
      when it is read
      then help will list <what it lists>, and the run will succeed

      Examples:
        | clm         | request                | what it lists                           |
        | CLM-CLI-115 | balance --help         | balance's flags                         |
        | CLM-CLI-116 | balance -h             | balance's flags                         |
        | CLM-CLI-117 | allocate --help        | the feature code it takes and its flags |
        | CLM-CLI-118 | spec-controller --help | the commands                            |
        | CLM-CLI-119 | spec-controller help   | the commands                            |
        | CLM-CLI-120 | nothing at all         | the commands                            |

    @unit @CLM-CLI-189
    Scenario: a command's help gives each flag it takes beside what the flag does
      given balance took the flags --strict and --exit-zero
      when its help is shown
      then each flag will be on a line of its own, followed by its description

  Rule: help comes before anything else on the command line, unless it follows a command the tool does not have

    @unit
    Scenario Outline: help will answer, and nothing will run
      given a command line had <help> <beside>
      when it is read
      then help will answer, and it will exit 0
      and nothing will have run or been written

      Examples:
        | clm         | help               | beside                                   |
        | CLM-CLI-112 | a request for help | beside an argument that fails validation |
        | CLM-CLI-113 | allocate's help    | beside a flag allocate does not take     |

    @unit @CLM-CLI-114
    Scenario: help after a command the tool does not have will not answer
      given a command line had a command the tool does not have, and a request for help after it
      when it is read
      then it will exit 2, as for a command the tool does not have

  Rule: a command accepts only the arguments it takes

    @unit
    Scenario Outline: a flag the command takes will take effect
      given a command line had <given>
      when it is read
      then <what happens>

      Examples:
        | clm         | given                                                     | what happens                      |
        | CLM-CLI-121 | a flag and its value as two arguments                     | the flag will take that value     |
        | CLM-CLI-122 | a flag that takes no value                                | the flag will be on               |
        | CLM-CLI-123 | --format twice                                            | each report will be made          |
        | CLM-CLI-124 | two command lines with the same flags in different orders | both orders will be read the same |

    @unit
    Scenario Outline: an argument the tool does not accept will stop the run
      given the command line had <given>
      when it is read
      then the run will stop, give no verdict and exit 2
      and it will complain about it, with <facts>

      Examples:
        | clm         | given                                         | facts                                   |
        | CLM-CLI-125 | a command the tool does not have              | the command it does not know            |
        | CLM-CLI-126 | a flag the command does not take              | the flag                                |
        | CLM-CLI-127 | a flag that takes a value, given none         | the flag, as missing its value          |
        | CLM-CLI-128 | a value given to a flag that takes none       | the flag and the value                  |
        | CLM-CLI-129 | an argument that is no flag and no value      | the argument                            |
        | CLM-CLI-130 | a flag that does not repeat, given twice      | the flag                                |
        | CLM-CLI-131 | a flag and its value joined by an equals sign | the form, and the spelling that is read |
        | CLM-CLI-132 | a flag before the command                     | the flag, as going after the command    |
        | CLM-CLI-133 | a report format the tool does not have        | the format, and the formats it has      |
        | CLM-CLI-134 | no feature code given to allocate             | that it needs a feature code            |
        | CLM-CLI-135 | two feature codes given to allocate           | the argument past what it takes         |

    @unit
    Scenario Outline: a refusal points to the help that lists what was allowed
      given a command line had <given>
      when it is read
      then the complaint will end by pointing to <help>

      Examples:
        | clm         | given                        | help                           |
        | CLM-CLI-187 | a flag balance does not take | spec-controller balance --help |
        | CLM-CLI-188 | a flag before the command    | spec-controller --help         |

  Rule: an input left out takes its default

    @unit
    Scenario Outline: balance will use the default when an input is not named
      given the run named no <input>
      when it is read
      then balance will use <default>

      Examples:
        | clm         | input                               | default             |
        | CLM-CLI-136 | feature corpus                      | the features folder |
        | CLM-CLI-137 | manifest                            | package.json        |
        | CLM-CLI-138 | CI workflows                        | .github/workflows   |
        | CLM-CLI-139 | target name                         | unknown-target      |
        | CLM-CLI-140 | source commit                       | the target's HEAD   |
        | CLM-CLI-141 | source commit, in no git repository | unknown             |

    @unit
    Scenario Outline: the target's folder will be the git repository the corpus is in, or else the corpus's parent folder
      given a balance command line named <corpus>, <where>
      when it is read
      then the target's folder will be <folder>

      Examples:
        | clm         | corpus                   | where                             | folder     |
        | CLM-CLI-142 | no feature corpus        | run from /work/acme               | /work/acme |
        | CLM-CLI-184 | /work/acme/docs/features | in a git repository at /work/acme | /work/acme |
        | CLM-CLI-144 | /tmp/x/features          | in no git repository              | /tmp/x     |

    @unit @e2e
    Scenario Outline: a default that cannot be read will stop the run
      Given the run met <error>
      When balance reads its inputs
      Then the run will stop, give no verdict and exit 2
      And it will complain about it, with <facts>

      Examples:
        | clm         | error                                                                                | facts                                         |
        | CLM-CLI-145 | the corpus read by default that sits under a working directory that has been removed | the corpus read by default, and what is wrong |

    @unit @CLM-CLI-183
    Scenario: a workflows folder read by default that does not exist will count as no workflows, not as a missing input
      given the run named no CI workflows, and the folder .github/workflows did not exist
      when balance reads its inputs
      then it will read no workflows
      and the run will not stop

    @unit @CLM-CLI-190
    Scenario: a feature corpus read by default that does not exist will count as no feature files, not as a missing input
      given the run named no feature corpus, and the folder features did not exist
      when balance reads its inputs
      then it will read no feature files
      and the run will not stop

    @unit @CLM-CLI-192
    Scenario: a manifest read by default that does not exist will count as no manifest, not as a missing input
      given the run named no manifest, and the file package.json did not exist
      when balance reads its inputs
      then it will read no manifest
      and the run will not stop

    @unit @CLM-CLI-198
    Scenario: an input read by default that the tool is not permitted to read will stop the run, not count as none
      given the run named no CI workflows, and the tool was not permitted to read the folder .github/workflows
      when balance reads its inputs
      then the run will stop, give no verdict and exit 2
      and it will complain that it is not permitted to read .github/workflows

  Rule: balance reads every input the command line names or leaves to its default

    @unit @CLM-CLI-191
    Scenario: balance reads a feature file in a subfolder of the feature corpus
      given the feature corpus's one feature file was two folders down, at area/deeper/one.feature
      when balance reads its inputs
      then it will read area/deeper/one.feature

    @unit @CLM-CLI-197
    Scenario: balance reads the feature corpus in path order
      given the feature corpus had b.feature and a/x.feature
      when balance writes its report
      then the report will list the claims of a/x.feature before those of b.feature

    @unit @CLM-CLI-193
    Scenario: balance reads the one workflow a CI workflows path names, or every workflow in the folder it names
      given the run named the workflow ci.yml as its CI workflows, and then a folder with ci.yml and release.yaml in it
      when balance reads its inputs
      then it will read ci.yml alone, and then both workflows

  Rule: a command validates every input before it does its work

    A command validates every input it reads before it does its work, whether named on the command
    line or left to its default: the evidence reports, the step record, the feature corpus, the CI
    workflows and the manifest. An input that is well formed but empty is valid.

    @unit @CLM-CLI-146
    Scenario: an empty evidence report will count as no evidence, not as a broken file
      given a Vitest evidence report was written well formed, listing no tests
      when balance reads it
      then nothing will be posted from it
      and the run will not stop

    @unit @CLM-CLI-194
    Scenario: a well-formed JUnit evidence report will be read, not refused
      given a JUnit evidence report was written well formed, as one suite or as a suites element holding suites
      when balance reads it
      then it will post its results
      and the run will not stop

    @unit
    Scenario Outline: balance posts the result in the evidence report each runner's flag names
      given the run named <flag> with an evidence report of one passing result that cites a claim
      when balance reads its inputs
      then it will post that result

      Examples:
        | clm         | flag       |
        | CLM-CLI-196 | --vitest   |
        | CLM-CLI-199 | --jest     |
        | CLM-CLI-200 | --rspec    |
        | CLM-CLI-201 | --cucumber |

    @unit
    Scenario Outline: an input that is not valid will stop the run
      given the command line had <given>
      when it is read
      then the run will stop, give no verdict and exit 2
      and it will complain about it, with <facts>

      Examples:
        | clm         | given                                                               | facts                                          |
        | CLM-CLI-147 | a named input that does not exist                                   | a named input, and what is wrong               |
        | CLM-CLI-160 | a named path that is not the kind of path its flag reads            | a named path, and what is wrong                |
        | CLM-CLI-161 | a named input that the tool is not permitted to read                | a named input, and what is wrong               |
        | CLM-CLI-148 | a JSON evidence report that does not parse                          | a JSON evidence report, and what is wrong      |
        | CLM-CLI-186 | a JUnit evidence report that does not parse                         | a JUnit evidence report, and what is wrong     |
        | CLM-CLI-149 | a feature file that does not parse                                  | a feature file, and what is wrong              |
        | CLM-CLI-150 | a workflow that does not parse                                      | a workflow, and what is wrong                  |
        | CLM-CLI-151 | a Vitest evidence report that is not in the shape Vitest writes     | a Vitest evidence report, and what is wrong    |
        | CLM-CLI-152 | a Cucumber evidence report that is not in the shape Cucumber writes | a Cucumber evidence report, and what is wrong  |
        | CLM-CLI-153 | a Jest evidence report that is not in the shape Jest writes         | a Jest evidence report, and what is wrong      |
        | CLM-CLI-154 | a pytest evidence report that is not in the shape pytest writes     | a pytest evidence report, and what is wrong    |
        | CLM-CLI-155 | a JUnit evidence report that is not in the shape JUnit writes       | a JUnit evidence report, and what is wrong     |
        | CLM-CLI-156 | a file in a JUnit directory that is not in the shape JUnit writes   | a file in a JUnit directory, and what is wrong |
        | CLM-CLI-157 | an RSpec evidence report that is not in the shape RSpec writes      | an RSpec evidence report, and what is wrong    |
        | CLM-CLI-158 | a step record that is not in the shape of a record of step outcomes | a CI step record, and what is wrong            |
        | CLM-CLI-159 | a manifest that is not in a manifest's shape                        | a manifest, and what is wrong                  |

    @unit @CLM-CLI-185
    Scenario: balance refuses a corpus with several feature files that do not parse, naming each
      given the corpus had two feature files that did not parse
      when balance reads it
      then the run will stop, give no verdict and exit 2
      and it will complain about each file, with what is wrong in each

  Rule: each kind of output has its place

    @unit
    Scenario Outline: an answer will be on standard output, and anything about it on standard error
      given a run produced <output>
      when it ends
      then it will be on <place>

      Examples:
        | clm         | output               | place           |
        | CLM-CLI-162 | allocate's answer    | standard output |
        | CLM-CLI-163 | allocate's note      | standard error  |
        | CLM-CLI-164 | a validation failure | standard error  |
        | CLM-CLI-165 | an unexpected error  | standard error  |

  Rule: a run ends on its run verdict's exit code

    @unit
    Scenario Outline: each run verdict will have its exit code
      given a run reached the run verdict <run verdict>
      when it ends
      then it will exit <exit code>

      Examples:
        | clm         | run verdict                                  | exit code |
        | CLM-CLI-166 | balanced                                     | 0         |
        | CLM-CLI-167 | out of balance                               | 1         |
        | CLM-CLI-168 | not reconciled, because unsound              | 3         |
        | CLM-CLI-169 | not reconciled, because claim code errors    | 3         |
        | CLM-CLI-170 | not reconciled, because nothing to reconcile | 3         |

  Rule: --exit-zero moves only an out-of-balance run's exit code, to 0

    @unit
    Scenario Outline: under --exit-zero only an out-of-balance run's exit code changes
      given a run's evidence was <ending>
      when it runs under --exit-zero
      then it will exit <code>
      and its run verdict, if it has one, will be the same

      Examples:
        | clm         | ending              | code |
        | CLM-CLI-172 | out of balance      | 0    |
        | CLM-CLI-173 | not reconciled      | 3    |
        | CLM-CLI-174 | a usage error       | 2    |
        | CLM-CLI-175 | an unexpected error | 4    |

  Rule: an unexpected error stops the run, with exit code 4 and a complaint

    @unit
    Scenario Outline: an unexpected error will stop the run with no verdict and exit 4, naming the error
      when the run meets <error>
      then the run will stop, give no verdict and exit 4
      and it will complain about it, with <facts>

      Examples:
        | clm         | error                                       | facts     |
        | CLM-CLI-176 | an error nothing else handles               | the error |
        | CLM-CLI-177 | an error that cannot be formatted           | the error |
        | CLM-CLI-178 | an error before the run reached its verdict | the error |
        | CLM-CLI-179 | an error while the program loads            | the error |

    @unit @CLM-CLI-181
    Scenario: an unexpected error after the run verdict will leave its exit code alone
      given a run reached its run verdict
      when it meets an unexpected error
      then it will exit with its run verdict's code

    @unit @CLM-CLI-182
    Scenario: a run will complain about only one unexpected error
      when a run meets two unexpected errors
      then it will complain about only one of them
