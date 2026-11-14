@FMT
Feature: You get each report in the format and place you asked for, and the run stops before it damages anything

  The tool writes a report of what it found. You choose its format, Markdown or JSON, and where it
  goes: standard output, standard error, or a file you name. Without a format you get Markdown; without a
  destination, standard output. An answer goes to standard output, and anything said about it to
  standard error.

  Each report goes where you asked.

  The run stops before it writes anything, and so damages nothing, when:

  - it cannot write there, such as to a read-only file or a folder that does not exist
  - two reports would go to standard output, or to the same file
  - a report would overwrite a file the run reads, such as your test results

  Rule: you get what you asked for

    @unit
    Scenario Outline: you will get the format you name, or Markdown when you name none
      given a run had its report to write
      when you ask for <format>
      then you will get <report>

      Examples:
        | clm         | format    | report              |
        | CLM-FMT-001 | no format | the Markdown report |
        | CLM-FMT-015 | json      | the JSON report     |

    @unit
    Scenario Outline: a report will go where you ask, or to standard output when you name no place
      given a run had a report to write
      when you ask for it at <destination>
      then <where it will be>

      Examples:
        | clm         | destination                                            | where it will be                                                                 |
        | CLM-FMT-016 | no destination                                         | it will be on standard output                                                    |
        | CLM-FMT-003 | a file                                                 | it will be in that file, and nothing will be on standard output                  |
        | CLM-FMT-018 | a file that already exists                             | the file will contain the new report                                             |
        | CLM-FMT-012 | a link to a file that does not exist yet               | it will be in the file the link points to, and the link will still point there   |
        | CLM-FMT-019 | a file in the corpus folder that is not a feature file | the file will contain the new report, and the feature files will be as they were |

    @unit @e2e
    Scenario Outline: each of two reports will be where you asked
      Given a run had two reports to write
      When you ask for them at <destination>
      Then <where it will be>

      Examples:
        | clm         | destination                                          | where it will be                                                |
        | CLM-FMT-004 | no destination for one, a file for the other         | one will be on standard output, and the other in the file       |
        | CLM-FMT-020 | no destination for one, standard error for the other | one will be on standard output, and the other on standard error |
        | CLM-FMT-021 | two different files                                  | each file will contain its own report                           |

  Rule: each kind of output goes to its own stream

    @unit
    Scenario Outline: each kind of output will go to its own stream
      given a run produced <output>
      when it ends
      then it will be on <place>

      Examples:
        | clm         | output               | place           |
        | CLM-FMT-036 | allocate's answer    | standard output |
        | CLM-FMT-037 | allocate's note      | standard error  |

  Rule: two reports share a place only when it is standard error or a place that discards them

    @unit @CLM-FMT-022
    Scenario: both reports go to standard error, one after the other
      given a run had two reports to write
      when you ask for both on standard error
      then both reports will be on standard error, one after the other

    @unit @CLM-FMT-035
    Scenario: both reports are written when both are asked for at /dev/null
      given a run had two reports to write
      when you ask for both at /dev/null
      then both will be written, and the run will not stop

    @unit @CLM-FMT-005
    Scenario: two reports asked for with no destination will stop the run
      given a run had two reports to write
      when you ask for both with no destination
      then the run will stop, give no verdict and exit 2
      and it will complain, naming what each report asked for
      and nothing will be on standard output

    @unit @e2e @CLM-FMT-010
    Scenario: two reports asked for at the same path will stop the run
      Given a run had two reports to write
      When you ask for them at a file and at the same path
      Then the run will stop, give no verdict and exit 2
      And it will complain, naming the file and both reports
      And the file will be as it was

  Rule: it stops before it damages anything

    @unit @CLM-FMT-008
    Scenario: a report asked for in a file it may not write will stop the run, and nothing will be written
      given a run had its report to write
      when you ask for it in a file it may not write
      then the run will stop, give no verdict and exit 2
      and it will complain, naming the place and why it cannot write there
      and nothing will be written

    @unit
    Scenario Outline: the run writes neither report when it cannot write one
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
        | CLM-FMT-030 | a link to a file not yet made | the file will still not exist, and the link will still point there |

    @unit @CLM-FMT-033
    Scenario: the run writes a report to a file it does not read, even one on the same disk
      given the run read one file
      when you ask for the report to go in another file on the same disk
      then the report will be written there

    @unit @CLM-FMT-013
    Scenario: the run refuses to write a report over a file it reads
      given the run read a file, such as your test results
      when you ask for the report to go in that same file
      then the run will stop, give no verdict and exit 2
      and it will complain, naming the file
      and the file will be as it was
