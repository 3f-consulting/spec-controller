@GRD
Feature: balance reads each scenario's tags from its feature file

  balance reads each scenario's tags from a feature file, its own and those it inherits from its Feature and Rule, and reads its claim code from them.

  Rule: a scenario's tags include the ones it inherits from its Feature and Rule

    @unit @CLM-GRD-001
    Scenario Outline: a layer tag on the <ancestor> is named of the scenarios beneath it

      Examples:
        | ancestor |
        | Feature  |
        | Rule     |

    @unit @e2e @CLM-GRD-002
    Scenario Outline: a scenario whose claim code it inherits from its <ancestor> is reconciled once, on that code's row, and never also as no-claim-code
      Given a target whose one scenario carries no claim code of its own, inherits one from its <ancestor>, and has passing evidence citing that code
      When balance reconciles that target
      Then the scenario is reconciled once, balanced, on its claim code's row
      And no reconciliation names it as a scenario with no claim code
      And the run balances

      Examples:
        | ancestor |
        | Feature  |
        | Rule     |

  Rule: a scenario's code is read from its own tags and those it inherits, and a scenario carrying more than one is read under none

    @unit @CLM-GRD-003
    Scenario: a code a scenario inherits from its Rule or Feature is read as one of its codes, so a different code of its own leaves it two and the same code one

    @unit @CLM-GRD-004
    Scenario: a scenario tagged with two claim codes is read under neither, and is not read as untagged

  Rule: an Outline with a clm column is several claims, one for each row

    @unit @CLM-GRD-005
    Scenario: an Outline whose two rows hold CLM-ONE-001 and CLM-ONE-002 is two claims

    @unit @CLM-GRD-006
    Scenario: each row's claim raises the Evidence Obligations its Outline's tags name

    @unit @CLM-GRD-007
    Scenario Outline: a row whose code is wrong reconciles as a scenario whose code is wrong

      Examples:
        | case                       |
        | not a code, empty included |
        | one code in two rows       |

    @unit @CLM-GRD-008
    Scenario: an Outline tagged with a code and with no clm column is one claim

  Rule: an Outline carries a claim code of its own or a clm column, never both

    @unit @CLM-GRD-009
    Scenario Outline: an Outline with a code and a clm column reaches claim code errors, whatever its cells hold

      Examples:
        | case                      |
        | on the Outline            |
        | from its Rule             |
        | from its Feature          |
        | a code on the Outline too |
        | a code on an Examples tag |
