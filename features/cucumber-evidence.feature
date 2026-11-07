@CUC
Feature: A Cucumber run's results answer integration and end-to-end evidence obligations

  A team runs its integration and end-to-end scenarios with Cucumber, and Cucumber writes what ran
  as a JSON report. `balance` reads that report as integration and end-to-end evidence, so each
  scenario in the team's feature files is reconciled against the Cucumber scenario that cites it.

  A Cucumber scenario cites its scenario by the scenario's code among its tags.

  Rule: a Cucumber scenario answers the scenario code its tags carry

    @unit @SCN-CUC-001
    Scenario: a Cucumber scenario tagged with two scenario codes credits neither, and the unnamed claim's row names both codes

    @unit @SCN-CUC-005
    Scenario: a Cucumber scenario tagged with a feature part outside two to five characters cites no scenario, beside tags of two and five characters that do

  Rule: a Cucumber scenario's observations are posted at each layer beyond @unit that its tags name, its own and those it inherits, or at integration when there are none

    @unit @SCN-CUC-002
    Scenario: a Cucumber scenario tagged @e2e, by its own tag or one it inherits, is posted at e2e, and one tagged only @unit, or with no layer tag, at integration

  Rule: an ambiguous Cucumber step is broken, not absent

    @unit @SCN-CUC-003
    Scenario: an ambiguous Cucumber step posts a broken observation naming the step and citing the scenario it would have proven

  Rule: a Cucumber scenario's step results give its run result: passed when every step passed, failed when one failed, inconclusive when one was skipped

    @unit @SCN-CUC-004
    Scenario: a Cucumber scenario whose steps all passed posts a passed observation, one with a failed step posts a failed one, and one with a skipped step posts nothing at any of its layers

  Rule: Cucumber's result for a row credits that row's code

    @unit @integration @SCN-CUC-006
    Scenario: a passing row and a failing row of one Outline reconcile apart
      Given a target whose one Outline is tagged @integration and has a clm column holding CLM-ONE-001 and CLM-ONE-002
      And Cucumber's evidence report says CLM-ONE-001's row passed and CLM-ONE-002's row failed
      When balance reconciles that target
      Then CLM-ONE-001's Claim Reconciliation is balanced, and CLM-ONE-002's is out of balance with a failing reconciling item
