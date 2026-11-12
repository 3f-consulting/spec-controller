@FMT
Feature: You get each report in the format and place you asked for, and the run stops before it damages anything

  The tool writes a report saying what it found. You can choose what kind of report
  you want, Markdown or JSON, and where it goes: on the screen, or in a file you name. If you say
  nothing, you get Markdown on the screen.

  This file makes sure of two things.

  You get what you asked for: each report ends up where you said.

  It won't damage anything. Before it writes anything, it checks whether something would go wrong,
  and stops if so:

  - it can't write there, such as a read-only file or a folder that doesn't exist
  - two reports would land in the same place, so one would wipe out the other
  - a report would overwrite one of the files it's reading, such as your test results

  Rule: you get what you asked for

    @unit
    Scenario Outline: you will get the report format you named
      given a run had its report to write
      when you ask for <format>
      then you will get <report>

      Examples:
        | clm         | format    | report              |
        | CLM-FMT-001 | no format | the Markdown report |
        | CLM-FMT-014 | md        | the Markdown report |
        | CLM-FMT-015 | json      | the JSON report     |

    @unit
    Scenario Outline: a report will be where you asked
      given a run had a report to write
      when you ask for it at <destination>
      then <where it will be>

      Examples:
        | clm         | destination                                            | where it will be                                                                 |
        | CLM-FMT-016 | no destination                                         | it will be on standard output                                                    |
        | CLM-FMT-003 | a file                                                 | it will be in that file, and nothing will be on standard output                  |
        | CLM-FMT-017 | a file whose name contains a colon                     | it will be in that file                                                          |
        | CLM-FMT-012 | a link to a file that does not exist yet               | it will be in the file the link points to, and the link will still point there   |
        | CLM-FMT-018 | a file that already exists                             | the file will contain the new report                                             |
        | CLM-FMT-019 | a file in the corpus folder that is not a feature file | the file will contain the new report, and the feature files will be as they were |

    @unit @e2e
    Scenario Outline: each of two reports will be where you asked
      Given a run had two reports to write
      When you ask for them at <destination>
      Then <where it will be>

      Examples:
        | clm         | destination                                            | where it will be                                                                 |
        | CLM-FMT-004 | no destination for one, a file for the other           | one will be on standard output, and the other in the file                        |
        | CLM-FMT-020 | no destination for one, standard error for the other   | one will be on standard output, and the other on standard error                  |
        | CLM-FMT-021 | two different files                                    | each file will contain its own report                                            |
        | CLM-FMT-022 | standard error for both                                | both reports will be on standard error, one after the other                      |

  Rule: it stops before it damages anything

    @unit
    Scenario Outline: two reports will not both go to standard output
      given a run had two reports to write
      when you ask for them at <one destination> and <the other destination>
      then the run will stop, give no verdict and exit 2
      and it will complain, naming what each report asked for
      and nothing will be on standard output

      Examples:
        | clm         | one destination | the other destination             |
        | CLM-FMT-005 | no destination  | no destination                    |
        | CLM-FMT-011 | no destination  | a path that names standard output |
        | CLM-FMT-023 | no destination  | a link to standard output         |

    @unit @e2e
    Scenario Outline: two reports will not go in one file
      Given a run had two reports to write
      When you ask for them at a file and at <the other destination>
      Then the run will stop, give no verdict and exit 2
      And it will complain, naming the file and both reports
      And the file will be as it was

      Examples:
        | clm         | the other destination                   |
        | CLM-FMT-010 | the same path                           |
        | CLM-FMT-024 | a link to it                            |
        | CLM-FMT-025 | standard output, redirected to the file |

    @unit
    Scenario Outline: a place it cannot write will stop the run, and nothing will be written
      given a run had its report to write
      when you ask for it at <destination>
      then the run will stop, give no verdict and exit 2
      and it will complain, naming the place and why it cannot write there
      and nothing will be written

      Examples:
        | clm         | destination                           |
        | CLM-FMT-008 | a file it may not write               |
        | CLM-FMT-026 | an existing folder                    |
        | CLM-FMT-027 | a file in a folder that doesn't exist |

    @unit
    Scenario Outline: if one report cannot be written, neither will be
      given a run had two reports to write
      when you ask for one at a place it cannot write, and the other at <other>
      then the run will stop, give no verdict and exit 2
      and it will complain, naming the place and why it cannot write there
      and <what stays>

      Examples:
        | clm         | other                         | what stays                                        |
        | CLM-FMT-009 | no destination                | nothing will be on standard output                |
        | CLM-FMT-028 | a file that does not exist    | the file will still not exist                     |
        | CLM-FMT-029 | a file that already exists    | the file will be as it was                        |
        | CLM-FMT-030 | a link to a file not yet made | the file will still not exist, and the link stays |

    @unit @CLM-FMT-013
    Scenario: a report will not be written over a file the run reads
      given the run read a file, such as your test results
      when you ask for the report to go in that same file
      then the run will stop, give no verdict and exit 2
      and it will complain, naming the file
      and the file will be as it was

    @unit @CLM-FMT-033
    Scenario: a report will be written to a file the run does not read, even on the same device
      given the run read one file
      when you ask for the report to go in another file on the same device
      then the report will be written there

    @unit
    Scenario Outline: a report on standard error will not go in a file another report names or the run reads
      given standard error was redirected to <the file>
      when you ask for a report on standard error
      then the run will stop, give no verdict and exit 2
      and it will complain, naming the file
      and the file will be as it was

      Examples:
        | clm         | the file                    |
        | CLM-FMT-031 | a file another report names |
        | CLM-FMT-032 | a file the run reads        |
