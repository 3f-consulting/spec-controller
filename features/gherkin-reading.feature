@GRD
Feature: balance reads each scenario's tags from its feature file

  balance reads each scenario's tags from a feature file, its own and those it inherits from its Feature and Rule, and reads its scenario code from them.

  Rule: a scenario's tags include the ones it inherits from its Feature and Rule

    @unit @SCN-GRD-001
    Scenario Outline: an evidence tier tagged on the <ancestor> is named of the scenarios beneath it

      Examples:
        | ancestor |
        | Feature  |
        | Rule     |

    @unit @e2e @SCN-GRD-002
    Scenario Outline: a scenario whose @SCN it inherits from its <ancestor> is reconciled once, on that code's row, and never also as no-scn-code
      Given a target whose one scenario carries no scenario code of its own, inherits one from its <ancestor>, and has passing evidence citing that code
      When balance reconciles that target
      Then the scenario is reconciled once, balanced, on its scenario code's row
      And no reconciliation names it as a scenario with no scenario code
      And the run balances

      Examples:
        | ancestor |
        | Feature  |
        | Rule     |

  Rule: a scenario's code is read from its own tags and those it inherits, and a scenario carrying more than one is read under none

    @unit @SCN-GRD-003
    Scenario: a code a scenario inherits from its Rule or Feature is read as one of its codes, so a different code of its own leaves it two and the same code one

    @unit @SCN-GRD-004
    Scenario: a scenario tagged with two scenario codes is read under neither, and is not read as untagged
