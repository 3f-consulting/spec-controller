@RPT
Feature: Each report has the right structure, and the Markdown explains it

  The tool writes what it found: JSON for programs, Markdown for people.

  - Each report has the structure it promises.
  - A report leaves out an optional section with nothing in it.
  - Every report has its Claim Reconciliations.
  - Odd characters in what a report quotes break nothing.
  - The Markdown report shows the unnamed claim's evidence in groups, by kind of quality check, file and shared claim code.
  - The Markdown adds the words a person needs to read it.
  - The provenance shows each input the run read on its own line.
  - The Markdown summary leaves out a row or column whose counts are all zero.
  - The JSON report keeps every count, zero or not.
  - The Markdown shows the Claim Reconciliations as one table, a row per claim.
  - The step account totals its jobs only when it has more than one.

  Whether an answer or a count is right is proved where it is worked out, not here.

  Rule: each report has the structure it promises

    @e2e
    Scenario Outline: the JSON report will pass its schema only when it has the structure the schema promises
      Given <report> was written
      When it is checked against the schema
      Then it will be <result>

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
      then the opening sentence will come first, under the title, and its sections will be the provenance, the errors in the inputs, run integrity, the summary and the Claim Reconciliations, in that order

  Rule: a report leaves out any optional section that would be empty

    @unit
    Scenario Outline: neither report will have an optional section the run had nothing for
      given a run had no <optional section>
      when its reports are written
      then neither report will have that optional section

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

    @unit
    Scenario Outline: a name will read as it was given, in a table that stays a table
      given a run had reported a name containing <character>
      when its Markdown report is written
      then the name will read as it was given, in a table that stays a table

      Examples:
        | clm         | character                         |
        | CLM-RPT-084 | a pipe, as in a\|b                |
        | CLM-RPT-106 | a backslash, as in a\\b           |
        | CLM-RPT-107 | a line break                      |
        | CLM-RPT-088 | a backtick, as in `a`             |
        | CLM-RPT-108 | a formatting character, as in *a* |

  Rule: a Markdown report shortens a long message to its first line

    @unit @CLM-RPT-085
    Scenario: the report quotes an Evidence Observation's first line and every note
      given a test that never ran had a message of three lines, and balance had added two notes
      when its Markdown report is written
      then the report will quote the message's first line and both notes

  Rule: the Markdown report shows the unnamed claim's evidence in its groups

    @unit @CLM-RPT-110
    Scenario: the report shows the unnamed claim's evidence one group per file, with how many tests ran, passed and failed
      given a run had unit tests citing no claim in two files, and one test in one of them failed
      when its Markdown report is written
      then the unnamed claim will show one group for each file, with how many of its tests ran, passed and failed, and the name of the test that failed

  Rule: the Markdown adds the words a person needs to read the data

    @unit @CLM-RPT-109
    Scenario: each section will have its heading, each value its label, and each table a key
      given a run had something for every section
      when its Markdown report is written
      then each section will have its heading, each value its label, and each table a line saying what its columns mean

  Rule: the Markdown report opens with a sentence for its run verdict

    @unit
    Scenario Outline: each run verdict, and each reason a run is not reconciled, has an opening of its own
      given a run was <run verdict>
      when the Markdown report is written
      then the report will have the opening for <run verdict>

      Examples:
        | clm         | run verdict                               |
        | CLM-RPT-111 | balanced                                  |
        | CLM-RPT-116 | out of balance                            |
        | CLM-RPT-117 | not reconciled, as unsound                |
        | CLM-RPT-118 | not reconciled, for claim code errors     |
        | CLM-RPT-119 | not reconciled, with nothing to reconcile |

  Rule: the provenance shows each input the run read on its own line

    @unit
    Scenario Outline: an input the run did not read has no line, and one it read by default has one
      given a run read <inputs read>
      when the Markdown report is written
      then the provenance will have <lines>

      Examples:
        | clm         | inputs read                                                 | lines                                         |
        | CLM-RPT-114 | a Vitest report and a Cucumber report, and no pytest report | one line for each report, and none for pytest |
        | CLM-RPT-115 | the CI workflows by default                                 | a line for the CI workflows                   |

  Rule: the Markdown summary leaves out a row or column whose counts are all zero

    @unit
    Scenario Outline: the Failing column, the row with no kind and the performance row each appear only above zero
      given the totals had <counts>
      when the Markdown report is written
      then the table by kind will <show> the <row or column>

      Examples:
        | clm         | counts                                            | show     | row or column    |
        | CLM-RPT-120 | no failing Quality Check Reconciliation           | not have | Failing column   |
        | CLM-RPT-121 | one failing Quality Check Reconciliation          | have     | Failing column   |
        | CLM-RPT-122 | no Quality Check Reconciliation with no kind      | not have | row with no kind |
        | CLM-RPT-123 | one no-quality-check Quality Check Reconciliation | have     | row with no kind |
        | CLM-RPT-124 | no performance Evidence Obligation or Observation | not have | performance row  |

    @unit
    Scenario Outline: the Markdown where-filed table leaves out a place nothing was filed on
      given the totals had <filed>
      when the Markdown report is written
      then the where-filed table will <show> a row for the phantom claims

      Examples:
        | clm         | filed                                       | show     |
        | CLM-RPT-125 | no Evidence Observation on a phantom claim  | not have |
        | CLM-RPT-126 | one Evidence Observation on a phantom claim | have     |

    @unit @CLM-RPT-127
    Scenario: the line of claim codes no claim reads is left out when there are none
      given the totals had 0 claim codes written where no claim reads them
      when the Markdown report is written
      then the Claim Reconciliations will have no line about claim codes no claim reads

  Rule: the JSON report keeps every count, zero or not

    @unit @CLM-RPT-128
    Scenario: a run of passing unit tests alone still has the JSON count failing and performance, at 0
      given a run had only passing unit tests, each cited by a claim asking for one
      when the JSON report is written
      then its totals will have every kind, the row with no kind, and every outcome under each, the ones with nothing at 0

  Rule: the Markdown shows the Claim Reconciliations as one table, a row per claim

    @unit
    Scenario Outline: a claim's cell for a kind shows whether it asked and how many ran
      given a claim had <evidence>
      when the Markdown report is written
      then its row will read <cell> under Unit

      Examples:
        | clm         | evidence                                                          | cell  |
        | CLM-RPT-129 | asked for a unit test, and two passing unit tests citing it       | U/2   |
        | CLM-RPT-130 | asked for a unit test, and one failing unit test citing it        | U/1   |
        | CLM-RPT-131 | asked for a unit test, and one unit test citing it that never ran | U/-   |
        | CLM-RPT-132 | asked for a unit test, and no unit test citing it                 | U/-   |
        | CLM-RPT-133 | asked for no unit test, and one passing unit test citing it       | -/1   |
        | CLM-RPT-134 | asked for no unit test, and no unit test citing it                | empty |

    @unit
    Scenario Outline: each row is named so a reader can find its claim
      given the run had <claim>
      when the Markdown report is written
      then the Claim Reconciliations will have a row named <name>

      Examples:
        | clm         | claim                                                              | name                                                    |
        | CLM-RPT-135 | a scenario tagged @CLM-ONE-001 in one.feature                      | CLM-ONE-001                                             |
        | CLM-RPT-136 | a scenario titled "adds one" with no code, in one.feature          | one.feature : adds one                                  |
        | CLM-RPT-137 | two scenarios sharing @CLM-ONE-001, in one.feature and two.feature | CLM-ONE-001 (one.feature) and CLM-ONE-001 (two.feature) |
        | CLM-RPT-138 | a unit test citing @CLM-ONE-009, which no scenario has             | CLM-ONE-009, with — under every kind                    |
        | CLM-RPT-139 | a unit test citing no code                                         | (unnamed claim), with — under every kind                |

    @unit @CLM-RPT-140
    Scenario: the rows come in the order the claims were read, then the phantom claims, then the unnamed claim
      given a run had claims in one.feature then two.feature, a phantom claim and evidence on the unnamed claim
      when the Markdown report is written
      then the rows will be one.feature's claims in the order written, then two.feature's, then the phantom claim, then the unnamed claim

    @unit
    Scenario Outline: a row lists its reconciling items, each with where to look
      given a claim had <evidence>
      when the Markdown report is written
      then its row's reconciling items will be <items>

      Examples:
        | clm         | evidence                                                                                                  | items                                                                   |
        | CLM-RPT-141 | asked for a unit test, and a passing unit test citing it                                                  | none                                                                    |
        | CLM-RPT-142 | asked for a unit test, and the unit test "[CLM-CHK-002] charges the card" in src/checkout.test.ts failing | unit failing, at src/checkout.test.ts, "[CLM-CHK-002] charges the card" |
        | CLM-RPT-143 | asked for a unit and an e2e test, and neither citing it                                                   | unit missing, then e2e missing                                          |

    @unit @CLM-RPT-144
    Scenario: the table has a column only for a kind some claim raises or answers
      given a run had only unit and fitness Evidence Obligations and Evidence Observations
      when the Markdown report is written
      then the Claim Reconciliations table will have a Fitness and a Unit column, and no other kind's column

  Rule: the step account totals its jobs only when it has more than one

    @unit
    Scenario Outline: one job has no Total row, and two jobs have one
      given a run read the steps of <jobs>
      when the Markdown report is written
      then the step account will <total> a Total row

      Examples:
        | clm         | jobs                       | total    |
        | CLM-RPT-112 | one job                    | not have |
        | CLM-RPT-113 | two jobs, in two workflows | have     |
