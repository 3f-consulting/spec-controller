@RPT
Feature: Each report has the right structure, and the Markdown explains it

  The tool writes what it found: JSON for programs, Markdown for people. Each has the structure
  it promises. The JSON has every part; the Markdown leaves out a part the run had nothing for. The
  Markdown names the run verdict in its Summary, adds the headings, labels and keys a person needs,
  and shows every name it quotes
  in code, so no character in it breaks a table. Whether an answer or a count is right is proved
  where it is worked out; this file says only where each one shows.

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
      then it will open with its title, and its sections will be the provenance, the errors in the inputs, run integrity, the summary and the Claim Reconciliations, in that order

  Rule: the Markdown adds the words a person needs to read the data

    @unit @CLM-RPT-109
    Scenario: each section will have its heading, each value its label, and each table a key
      given a run had something for every section
      when its Markdown report is written
      then each section will have its heading, each value its label, and each table a line saying what its columns mean

  Rule: the Markdown report leaves out any part the run had nothing for

    @unit
    Scenario Outline: the Markdown report will not have a part the run had nothing for
      given a run had no <part>
      when its Markdown report is written
      then it will not have that part

      Examples:
        | clm         | part                      |
        | CLM-RPT-077 | errors in the inputs      |
        | CLM-RPT-021 | run integrity             |
        | CLM-RPT-052 | step account              |
        | CLM-RPT-006 | out of balance by feature |

  Rule: the Markdown report shows each name it quotes in code, so no character in it changes the table

    @unit
    Scenario Outline: a name will show in code, and every row will have the same columns
      given a run reported the name <name>
      when its Markdown report is written
      then its table will show the name in code as <shown in code as>, and every row will have the same columns

      Examples:
        | clm         | name               | shown in code as |
        | CLM-RPT-084 | a\|b               | a\|b             |
        | CLM-RPT-107 | a, a line break, b | "a\nb"           |

  Rule: a Markdown report shortens a long message to its first line

    @unit
    Scenario Outline: a section showing a never-ran test's message quotes its first line
      given a test that never ran had <message>, and balance added two notes
      when its Markdown report is written
      then <where> will quote <what>

      Examples:
        | clm         | message                                             | where                     | what                                                       |
        | CLM-RPT-085 | a message of three lines                            | the Claim Reconciliations | the message's first line and both notes                    |
        | CLM-RPT-146 | a message of three lines                            | run integrity             | the message's first line                                   |
        | CLM-RPT-169 | a message whose first line is blank, then two lines | the Claim Reconciliations | the message's first line that is not blank, and both notes |

  Rule: the Markdown report's Summary names the run verdict

    @unit
    Scenario Outline: the Summary names each run verdict, and each reason a run is not reconciled
      given a run was <run verdict>
      when the Markdown report is written
      then its Summary will name the run verdict <run verdict>

      Examples:
        | clm         | run verdict                                            |
        | CLM-RPT-111 | balanced                                               |
        | CLM-RPT-116 | out of balance                                         |
        | CLM-RPT-117 | not reconciled, because unsound                        |
        | CLM-RPT-118 | not reconciled, because of claim code errors           |
        | CLM-RPT-119 | not reconciled, because there was nothing to reconcile |

  Rule: the provenance shows each input the run read on its own line

    @unit @CLM-RPT-115
    Scenario: the provenance has a line for an input the run read by default
      given a run read the CI workflows by default
      when the Markdown report is written
      then the provenance will have a line for the CI workflows

    @unit
    Scenario Outline: the provenance shows the tool SHA only when there is one
      given a run's provenance had <tool SHA>
      when its Markdown report is written
      then the provenance will show <shown>

      Examples:
        | clm         | tool SHA             | shown                  |
        | CLM-RPT-167 | the tool SHA 9f8e7d6 | the tool SHA 9f8e7d6   |
        | CLM-RPT-168 | no tool SHA          | no line for a tool SHA |

  Rule: the report names the files, codes or setting each error in the inputs involves

    @unit
    Scenario Outline: Errors in the inputs lists each error under its kind, with the files, codes or setting it involves
      given a run had <the inputs>
      when its Markdown report is written
      then Errors in the inputs will list <kind> with <involved>

      Examples:
        | clm         | the inputs                                                                                 | kind                         | involved                                       |
        | CLM-RPT-147 | one.feature, tagged @ONE, with a scenario tagged @CLM-TWO-001, and two.feature tagged @TWO | foreign-claim-code           | one.feature, CLM-TWO-001 and two.feature       |
        | CLM-RPT-149 | three.feature, with no feature code, with a scenario tagged @CLM-ONE-002                   | no-feature-code              | three.feature                                  |
        | CLM-RPT-150 | one.feature and uno.feature, both tagged @ONE                                              | duplicate-feature-code       | ONE, one.feature and uno.feature               |
        | CLM-RPT-151 | the scenario adds in one.feature, tagged both @CLM-ONE-001 and @CLM-ONE-002                | several-claim-codes          | one.feature, adds, CLM-ONE-001 and CLM-ONE-002 |
        | CLM-RPT-152 | the Outline adds in one.feature, tagged @CLM-ONE-009, with a clm column                    | claim-code-beside-clm-column | one.feature, adds and CLM-ONE-009              |
        | CLM-RPT-153 | a configuration setting runer, which balance does not know                                 | configuration-unknown-key    | runer                                          |

  Rule: run integrity says where each Evidence Observation that never ran is

    @unit
    Scenario Outline: run integrity lists a never-ran Evidence Observation by its kind, where it is and any name it has
      given a run had <evidence>, which never ran, with no message
      when its Markdown report is written
      then run integrity will list <listed>

      Examples:
        | clm         | evidence                          | listed                        |
        | CLM-RPT-160 | the unit test adds in one.test.ts | unit, at one.test.ts, "adds"  |
        | CLM-RPT-161 | the step ci.yml:build:Lint        | fitness, at ci.yml:build:Lint |

  Rule: the report shows each count the run has in its cell

    @unit @CLM-RPT-163
    Scenario: the Summary shows the run's Claim Reconciliations, balanced and out of balance
      given a run had a claim with a passing unit test and a claim with a failing unit test
      when its Markdown report is written
      then the Summary will show 2 Claim Reconciliations, 1 balanced and 1 out of balance

    @unit @CLM-RPT-164
    Scenario: the Summary's totals by kind show a kind's Evidence Obligations, Evidence Observations and outcomes
      given a run had a claim with a unit Evidence Obligation and a passing unit test citing it, and one with a failing one
      when its Markdown report is written
      then the unit row will show 2 Evidence Obligations, 2 Evidence Observations, 1 satisfied and 1 failing

    @unit
    Scenario Outline: the step account shows each job's counts, and the Total row their sums
      given a run read the steps of job build in ci.yml, 2 steps of which 1 ran a test runner, and the steps of job sweep in nightly.yml, 1 step that only set the job up
      when its Markdown report is written
      then the step account's <row> will show <counts>

      Examples:
        | clm         | row           | counts                                                                                      |
        | CLM-RPT-165 | row for build | 2 steps read, 1 runner, 0 reconciler steps, 0 non-checks, 0 plumbing and 1 fitness function |
        | CLM-RPT-166 | Total row     | 3 steps read, 1 runner, 0 reconciler steps, 0 non-checks, 1 plumbing and 1 fitness function |

  Rule: the Summary leaves out a row or column whose counts are all zero

    @unit
    Scenario Outline: the Summary will show a row or column only when it has a count above zero
      given the totals had <counts>
      when the Markdown report is written
      then the Summary will <show> the <row or column>

      Examples:
        | clm         | counts                                            | show     | row or column                                   |
        | CLM-RPT-120 | no failing Quality Check Reconciliation           | not have | Failing column of its totals by kind            |
        | CLM-RPT-121 | one failing Quality Check Reconciliation          | have     | Failing column of its totals by kind            |
        | CLM-RPT-122 | no no-quality-check Quality Check Reconciliation  | not have | no-quality-check row of its totals by kind      |
        | CLM-RPT-123 | one no-quality-check Quality Check Reconciliation | have     | no-quality-check row of its totals by kind      |
        | CLM-RPT-124 | no performance Evidence Obligation or Observation | not have | performance row of its totals by kind           |
        | CLM-RPT-125 | no Evidence Observation on a phantom claim        | not have | phantom claims row of its totals by where filed |
        | CLM-RPT-126 | one Evidence Observation on a phantom claim       | have     | phantom claims row of its totals by where filed |

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

  Rule: the JSON report keeps every part and every count, empty or zero

    @unit @CLM-RPT-128
    Scenario: a run of passing unit tests alone still has every part and every count in its JSON
      given a run had only passing unit tests, each cited by a claim with a unit Evidence Obligation
      when the JSON report is written
      then it will have every part, the ones with nothing empty
      and its totals will have every kind, the row with no kind, and every outcome under each, the ones with nothing at 0

  Rule: every report has its Claim Reconciliations, even when there are none

    @unit @CLM-RPT-105
    Scenario: a report will show its Claim Reconciliations when the run had none
      given a run had nothing to reconcile
      when its reports are written
      then each report will have its Claim Reconciliations, showing none

  Rule: the Markdown shows the Claim Reconciliations as one table, a row per claim

    @unit
    Scenario Outline: a claim's cell for a kind shows whether it asked and how many ran
      given a claim had <evidence>
      when the Markdown report is written
      then its row will read <cell> under Unit

      Examples:
        | clm         | evidence                                                               | cell  |
        | CLM-RPT-129 | a unit Evidence Obligation, and two passing unit tests citing it       | U/2   |
        | CLM-RPT-130 | a unit Evidence Obligation, and one failing unit test citing it        | U/1   |
        | CLM-RPT-131 | a unit Evidence Obligation, and one unit test citing it that never ran | U/-   |
        | CLM-RPT-132 | a unit Evidence Obligation, and no unit test citing it                 | U/-   |
        | CLM-RPT-133 | no unit Evidence Obligation, and one passing unit test citing it       | -/1   |
        | CLM-RPT-134 | no unit Evidence Obligation, and no unit test citing it                | empty |
        | CLM-RPT-158 | a unit and an e2e Evidence Obligation, and no test citing it           | U/-   |

    @unit
    Scenario Outline: each row will be named by its claim code, or by its file and title
      given the run had <evidence>
      when the Markdown report is written
      then the Claim Reconciliations will have a row named <name>, with <under every kind> under every kind

      Examples:
        | clm         | evidence                                                           | name                                                    | under every kind |
        | CLM-RPT-135 | a scenario tagged @CLM-ONE-001 in one.feature                      | CLM-ONE-001                                             | its cells        |
        | CLM-RPT-136 | a scenario titled "adds one" with no code, in one.feature          | one.feature : adds one                                  | its cells        |
        | CLM-RPT-137 | two scenarios sharing @CLM-ONE-001, in one.feature and two.feature | CLM-ONE-001 (one.feature) and CLM-ONE-001 (two.feature) | their cells      |
        | CLM-RPT-138 | a unit test citing @CLM-ONE-009, which no scenario has             | CLM-ONE-009                                             | —                |
        | CLM-RPT-139 | a unit test citing no code                                         | (unnamed claim)                                         | —                |

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
        | clm         | evidence                                                                                                       | items                                                                   |
        | CLM-RPT-141 | a unit Evidence Obligation, and a passing unit test citing it                                                  | none                                                                    |
        | CLM-RPT-142 | a unit Evidence Obligation, and the unit test "[CLM-CHK-002] charges the card" in src/checkout.test.ts failing | unit failing, at src/checkout.test.ts, "[CLM-CHK-002] charges the card" |
        | CLM-RPT-143 | a unit and an e2e Evidence Obligation, and neither citing it                                                   | unit missing, then e2e missing                                          |
        | CLM-RPT-154 | a fitness Evidence Obligation, and its step ci.yml:build:Lint failing                                          | fitness failing, at ci.yml:build:Lint                                   |
        | CLM-RPT-155 | a code and no kind-of-quality-check tag                                                                        | no-quality-check                                                        |

    @unit
    Scenario Outline: the Markdown has a line of claim codes no claim reads only when there are some
      given the totals had <count> excluded claim code occurrences
      when the Markdown report is written
      then the Claim Reconciliations will <show> a line about claim codes no claim reads

      Examples:
        | clm         | count | show     |
        | CLM-RPT-127 | 0     | not have |
        | CLM-RPT-145 | 1     | have     |

    @unit @CLM-RPT-144
    Scenario: the table has a column only for a kind some claim has an Evidence Obligation or an Evidence Observation for
      given a run had only unit and fitness Evidence Obligations and Evidence Observations
      when the Markdown report is written
      then the Claim Reconciliations table will have a Fitness and a Unit column, and no other kind's column

  Rule: the Markdown report shows the unnamed claim's evidence in its groups

    @unit @CLM-RPT-110
    Scenario: the report shows the unnamed claim's evidence one group per file, with how many tests ran, passed and failed
      given a run had unit tests citing no claim in two files, and one test in one of them failed
      when its Markdown report is written
      then the unnamed claim will show one group for each file, with how many of its tests ran, passed and failed, and the name of the test that failed

    @unit @CLM-RPT-162
    Scenario: a group of the unnamed claim's evidence with a shared claim code shows that code
      given a run had a passing unit test in a.test.ts citing no code, and one in a.test.ts citing CLM-ONE-001, which two scenarios share
      when its Markdown report is written
      then the unnamed claim will show two unit groups for a.test.ts, one showing CLM-ONE-001

    @unit @CLM-RPT-159
    Scenario: the unnamed claim's fitness evidence shows as one group with no file
      given a run had the step ci.yml:build:Lint passing, citing no claim
      when its Markdown report is written
      then the unnamed claim will show one fitness group, with no file, 1 ran, 1 passed and 0 failed
