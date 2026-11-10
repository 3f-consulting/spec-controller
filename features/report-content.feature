@RPT
Feature: Each report has the right structure, and the Markdown explains it

  The tool writes what it found: JSON for programs, Markdown for people.

  This file makes sure of five things:

  - each report has the right structure
  - an optional section with nothing in it is left out
  - the Claim Reconciliations are always there, because they are the heart of the report
  - odd characters in what it quotes don't break anything
  - the Markdown adds words so a person can read it

  Whether an answer or a count is right is proved where it's worked out, not here.

  Rule: each report has the structure it promises

    @wip
    Scenario Outline: the JSON report will pass its schema only when it has the structure the schema promises
      given <report> was written
      when it is checked against the schema
      then it will be <result>

      Examples:
        | clm         | report                                               | result   |
        | CLM-RPT-101 | a JSON report from a real run                        | accepted |
        | CLM-RPT-102 | a JSON report with one of its required parts removed | refused  |
        | CLM-RPT-103 | a JSON report with a part the schema does not name   | refused  |
        | CLM-RPT-104 | a JSON report with text where a count goes           | refused  |

    @unit @CLM-RPT-009
    Scenario: the Markdown report's sections will come in a fixed order
      given a run had something for every section
      when its Markdown report is written
      then its sections will be the provenance, the errors in the inputs, run integrity, the summary and the Claim Reconciliations, in that order

  Rule: a report leaves out any optional section that would be empty

    Scenario Outline: neither report will have an optional section the run had nothing for
      Given a run had no <optional section>
      When its reports are written
      Then neither report will have that optional section

      Examples:
        | clm         | optional section          |
        | CLM-RPT-077 | errors in the inputs      |
        | CLM-RPT-021 | run integrity             |
        | CLM-RPT-052 | step accounting           |
        | CLM-RPT-006 | out of balance by feature |

  Rule: every report has its Claim Reconciliations, even when there are none

    @unit @CLM-RPT-105
    Scenario: a report will show its Claim Reconciliations when the run had none
      given a run had nothing to reconcile
      when its reports are written
      then each report will have its Claim Reconciliations, showing none

  Rule: odd characters in what a report quotes break nothing

    Scenario Outline: a name will read as it was given, in a table that stays a table
      Given a run had reported a name containing <character>
      When its Markdown report is written
      Then the name will read as it was given, in a table that stays a table

      Examples:
        | clm         | character                         |
        | CLM-RPT-084 | a pipe, as in a\|b                |
        | CLM-RPT-NEW | a backslash, as in a\\b           |
        | CLM-RPT-NEW | a line break                      |
        | CLM-RPT-088 | a backtick, as in `a`             |
        | CLM-RPT-NEW | a formatting character, as in *a* |

  Rule: a Markdown report shortens a long message to its first line

    @CLM-RPT-085
    Scenario: the report quotes an Evidence Observation's first line and every note
      Given a test that never ran had a message of three lines, and balance had added two notes
      When its Markdown report is written
      Then the report will quote the message's first line and both notes

  Rule: the Markdown adds the words a person needs to read the data

    @CLM-RPT-NEW
    Scenario: each section will have its heading, each value its label, and each table a key
      Given a run had something for every section
      When its Markdown report is written
      Then each section will have its heading, each value its label, and each table a line saying what its columns mean
