@CLI
Feature: the command line reads what you give it

  spec-controller runs a command, balance or allocate. A command's flags go after it.

  Help lists the commands, or one command's flags. It runs nothing and writes nothing. Running
  spec-controller with nothing after it also shows help.

  Every argument is read as what it is, or validation fails. Then the run stops with a usage error
  before anything runs, whether or not help was asked for. The error names the argument and says
  what is wrong with it, and the help for what was asked for follows it.

  The tool validates each input the same way, whether the command line names it or leaves it to
  its default. An input that cannot be read when it is validated also stops the run with a usage
  error. A file that fails to read after validation accepted it is an unexpected error.

  A run ends on an exit code: 0 if balanced, 1 if out of balance, 3 if not reconciled, 2 for a
  usage error, and 4 for an unexpected error before the run verdict. --exit-zero changes only 1 to
  0. It never changes the code of a run that could not be reconciled.

  This file covers only the command line. The feature files for each command say what it does.

  Rule: asking for help shows what can be asked for

    @unit
    Scenario Outline: help will list a command's flags, the feature code allocate takes, or the commands
      given a command line had <request>
      when it is read
      then help will list <what it lists>, and the run will succeed

      Examples:
        | clm         | request                | what it lists                           |
        | CLM-CLI-115 | balance --help         | balance's flags                         |
        | CLM-CLI-117 | allocate --help        | the feature code it takes and its flags |
        | CLM-CLI-118 | spec-controller --help | the commands                            |

    @unit @CLM-CLI-189
    Scenario: a command's help gives each flag it takes beside what the flag does
      given balance took the flags --strict and --exit-zero
      when its help is shown
      then each flag will be on a line of its own, followed by its description

  Rule: a command reads each argument as what it is, or refuses it

    @unit
    Scenario Outline: a flag the command takes will take effect
      given a command line had <given>
      when it is read
      then <what happens>

      Examples:
        | clm         | given                                     | what happens                                     |
        | CLM-CLI-121 | a flag and its value as two arguments     | the flag will take that value                    |
        | CLM-CLI-122 | a flag that takes no value                | the flag will be on                              |
        | CLM-CLI-123 | --format twice                            | each report will be made                         |
        | CLM-CLI-124 | a command's flags in two different orders | both orders will be read the same                |
        | CLM-CLI-196 | --vitest report.json                      | balance will read report.json as a Vitest report |

    @unit
    Scenario Outline: an argument the tool does not accept will stop the run
      given a command line had <argument>
      when it is read
      then the run will stop, give no verdict and exit 2
      and it will complain, naming <facts>

      Examples:
        | clm         | argument                                         | facts                                   |
        | CLM-CLI-125 | a command the tool does not have                 | the command it does not know            |
        | CLM-CLI-126 | a flag the command does not take                 | the flag                                |
        | CLM-CLI-127 | a flag that takes a value, given none            | the flag, as missing its value          |
        | CLM-CLI-128 | a value given to a flag that takes none          | the flag and the value                  |
        | CLM-CLI-129 | an argument that is no flag and no value         | the argument                            |
        | CLM-CLI-130 | a flag that does not repeat, given twice         | the flag                                |
        | CLM-CLI-131 | a flag and its value joined by an equals sign    | the form, and the spelling that is read |
        | CLM-CLI-132 | a flag before the command                        | the flag, as going after the command    |
        | CLM-CLI-133 | a report format the tool does not have           | the format, and the formats it has      |
        | CLM-CLI-134 | no feature code given to allocate                | that it needs a feature code            |
        | CLM-CLI-135 | two feature codes given to allocate              | the argument past what it takes         |
        | CLM-CLI-202 | a request to allocate that is not a feature code | the request, as not a feature code      |

  Rule: a usage error shows the help for what was asked for, whether or not help was asked for

    @unit
    Scenario Outline: a usage error will be followed by the help that lists what was allowed
      given a command line had <given>
      when it is read
      then the complaint will be followed by <help>
      and it will exit 2

      Examples:
        | clm         | given                                                             | help           |
        | CLM-CLI-187 | a flag the command does not take, given to balance                | balance's help |
        | CLM-CLI-188 | a flag before the command                                         | the commands   |
        | CLM-CLI-114 | a command the tool does not have, and a request for help after it | the commands   |

  Rule: an input left out takes its default

    If the default does not exist, the tool reads none of that input. If the tool may not read it,
    the run stops.

    @unit
    Scenario Outline: balance will use the features folder, package.json and the .github/workflows folder when none is named
      given the run named no <input>
      when balance reads its inputs
      then balance will use <default>

      Examples:
        | clm         | input          | default                      |
        | CLM-CLI-136 | feature corpus | the features folder          |
        | CLM-CLI-137 | manifest       | package.json                 |
        | CLM-CLI-138 | CI workflows   | the .github/workflows folder |

    @unit
    Scenario Outline: an input read by default that does not exist counts as none, not as a missing input
      given the run named no <input>, and <its default> did not exist
      when balance reads its inputs
      then it will read no <input>

      Examples:
        | clm         | input          | its default                  |
        | CLM-CLI-183 | CI workflows   | the .github/workflows folder |
        | CLM-CLI-190 | feature corpus | the features folder          |
        | CLM-CLI-192 | manifest       | package.json                 |

    @unit @CLM-CLI-198
    Scenario: an input read by default that the tool is not permitted to read will stop the run, not count as none
      given the run named no CI workflows, and the tool was not permitted to read the .github/workflows folder
      when balance reads its inputs
      then the run will stop, give no verdict and exit 2
      and it will complain, naming .github/workflows and that it may not read it

  Rule: balance works out the target's folder from the corpus

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

  Rule: balance reads every workflow a CI workflows path names

    @unit
    Scenario Outline: balance reads every workflow a CI workflows path names, a file or a folder
      given the run named <path> as its CI workflows
      when balance reads its inputs
      then it will read <workflows>

      Examples:
        | clm         | path                                          | workflows      |
        | CLM-CLI-193 | the workflow ci.yml                           | ci.yml alone   |
        | CLM-CLI-203 | a folder with ci.yml and release.yaml in it   | both workflows |

  Rule: a command validates every input before it does its work

    A command validates every input it reads before it does its work, whether named on the command
    line or left to its default: the evidence reports, the step record, the feature corpus, the CI
    workflows and the manifest. An input that is well formed but empty is valid.

    @unit
    Scenario Outline: an input that is not valid will stop the run
      given the run named <input>
      when balance reads its inputs
      then the run will stop, give no verdict and exit 2
      and it will complain, naming the input and what is wrong with it

      Examples:
        | clm         | input                                                               |
        | CLM-CLI-147 | a named input that does not exist                                   |
        | CLM-CLI-160 | a named path that is not the kind of path its flag reads            |
        | CLM-CLI-161 | a named input that the tool is not permitted to read                |
        | CLM-CLI-148 | a JSON evidence report that does not parse                          |
        | CLM-CLI-186 | a JUnit evidence report that does not parse                         |
        | CLM-CLI-149 | a feature file that does not parse                                  |
        | CLM-CLI-150 | a workflow that does not parse                                      |
        | CLM-CLI-151 | a Vitest evidence report that is not in the shape Vitest writes     |
        | CLM-CLI-152 | a Cucumber evidence report that is not in the shape Cucumber writes |
        | CLM-CLI-153 | a Jest evidence report that is not in the shape Jest writes         |
        | CLM-CLI-154 | a pytest evidence report that is not in the shape pytest writes     |
        | CLM-CLI-155 | a JUnit evidence report that is not in the shape JUnit writes       |
        | CLM-CLI-156 | a file in a JUnit directory that is not in the shape JUnit writes   |
        | CLM-CLI-157 | an RSpec evidence report that is not in the shape RSpec writes      |
        | CLM-CLI-158 | a step record that is not in the shape of a record of step outcomes |
        | CLM-CLI-159 | a manifest that is not in a manifest's shape                        |

    @unit @CLM-CLI-185
    Scenario: balance refuses a corpus with several feature files that do not parse, naming each
      given the corpus had two feature files that did not parse
      when balance reads it
      then the run will stop, give no verdict and exit 2
      and it will complain, naming each file and what is wrong in it

  Rule: a run ends on its run verdict's exit code

    @unit
    Scenario Outline: each run verdict will have its exit code
      given a run reached the run verdict <run verdict>
      when it ends
      then it will exit <exit code>

      Examples:
        | clm         | run verdict                     | exit code |
        | CLM-CLI-166 | balanced                        | 0         |
        | CLM-CLI-167 | out of balance                  | 1         |
        | CLM-CLI-168 | not reconciled, because unsound | 3         |

  Rule: --exit-zero moves only an out-of-balance run's exit code, to 0

    @unit
    Scenario Outline: --exit-zero will change exit 1 to 0 and leave exit 3 alone
      given a run's evidence was <ending>
      when it runs under --exit-zero
      then it will exit <code>
      and its run verdict, if it has one, will be the same

      Examples:
        | clm         | ending         | code |
        | CLM-CLI-172 | out of balance | 0    |
        | CLM-CLI-173 | not reconciled | 3    |

  Rule: the run reports an error it did not expect, rather than crashing silently

    @unit @CLM-CLI-176
    Scenario: an unexpected error will stop the run with no verdict and exit 4, naming the error
      when the run meets an unexpected error
      then the run will stop, give no verdict and exit 4
      and it will complain, naming the error

    @unit @CLM-CLI-181
    Scenario: an unexpected error after the run verdict will leave its exit code alone
      given a run reached its run verdict
      when it meets an unexpected error
      then it will exit with its run verdict's code

    @unit @CLM-CLI-182
    Scenario: a run will complain about only one unexpected error
      when a run meets two unexpected errors
      then it will complain about only one of them
