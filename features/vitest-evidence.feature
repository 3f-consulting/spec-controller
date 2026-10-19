@VIT
Feature: A Vitest suite's results answer unit evidence obligations

  A team runs its unit tests with Vitest, and Vitest writes what ran as a JSON report. `balance`
  reads that report as unit evidence, so each @unit scenario in the team's feature files is
  reconciled against the Vitest test that cites it.

  A Vitest test cites its scenario by the scenario's code in square brackets in its title.

  Rule: a Vitest test answers the scenario its own leaf title cites

    @unit @SCN-VIT-001
    Scenario: a self-citing leaf discharges its own scenario while a bare sibling leaf still discharges the ancestor's

    @unit @SCN-VIT-002
    Scenario: a test whose only SCN-shaped token is prose cites no scenario, and its evidence observation posts to the unnamed claim

    @unit @SCN-VIT-003
    Scenario: a leaf naming a scenario code in prose does not override its describe's bracketed citation

    @unit @SCN-VIT-004
    Scenario: a Vitest test whose title cites two scenarios credits neither, and the unnamed claim's row names both codes

    @unit @SCN-VIT-008
    Scenario: a title citing a feature part outside two to five characters cites no scenario, beside a citation of five characters that is read

  Rule: a Vitest file that failed to collect is broken, not absent

    @unit @SCN-VIT-005
    Scenario: a Vitest file that failed to collect posts a broken item naming the file and its error to the unnamed claim's row, while the scenario it would have proven still reads missing

  Rule: a Vitest observation carries the quality check the caller names

    @unit @SCN-VIT-006
    Scenario: every observation read from a Vitest report carries the quality check the caller names, because a Vitest report carries no tier tags

  Rule: a Vitest test's result gives its run result: passed or failed as reported, inconclusive when skipped or todo

    @unit @SCN-VIT-007
    Scenario: a Vitest test that passed or failed posts that status, and one skipped or todo posts nothing
