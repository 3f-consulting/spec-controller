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

  Rule: a Cucumber scenario's observations are posted at the quality checks its own tags decide

    @unit @SCN-CUC-002
    Scenario: the tags a Cucumber scenario carries, its own and those it inherits, decide each quality check its observations are posted at, and with no tier tag they are posted at integration, because a Cucumber report is a report of scenario runs

  Rule: an ambiguous Cucumber step is broken, not absent

    @unit @SCN-CUC-003
    Scenario: an ambiguous Cucumber step posts a broken observation naming the step and citing the scenario it would have proven

  Rule: a Cucumber scenario's step results give its run result: passed when every step passed, failed when one failed, inconclusive when one was skipped

    @unit @SCN-CUC-004
    Scenario: a Cucumber scenario whose steps all passed posts a passed observation, one with a failed step posts a failed one, and one with a skipped step posts nothing at any of its quality checks
