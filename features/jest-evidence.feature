@JST
Feature: A Jest suite's results answer unit evidence obligations

  A team runs its unit tests with Jest, and Jest writes what ran as a JSON report. `balance`
  reads that report as unit evidence beside a Vitest one, so each @unit scenario in the team's
  feature files is reconciled against the Jest test that cites it, exactly as a Vitest suite's is.

  A Jest test cites its scenario as a Vitest test does: by the scenario's code in square
  brackets in its title.

  Rule: a Jest test answers the scenario its title cites

    @unit @e2e @SCN-JST-001
    Scenario: a passing Jest test that cites its scenario in its title answers that scenario's unit evidence obligation, and the scenario reconciles satisfied
      Given a target whose unit tests are a Jest suite and whose scenario raises a unit evidence obligation
      And a Jest report in which a passing test cites that scenario in its title
      When balance is asked to reconcile that target with the Jest report
      Then the scenario that Jest test cites reconciles satisfied, by that test

    @unit @SCN-JST-002
    Scenario: a failing Jest test that cites its scenario posts a failing observation, and the scenario reconciles failing

    @unit @SCN-JST-003
    Scenario: a code in a Jest test's own title is read before a code in the describe blocks around it

    @unit @SCN-JST-004
    Scenario: a Jest test whose title cites two scenarios credits neither, and suspense names both codes

  Rule: a Jest test that did not run proves nothing

    @unit @SCN-JST-005
    Scenario: a todo or skipped Jest test posts no evidence observation, so the scenario it cites reads missing

    @unit @SCN-JST-006
    Scenario: a Jest test whose shared setup fails before it runs posts a failing observation

    @unit @SCN-JST-007
    Scenario: a Jest test file that failed to run posts a broken item and the run is unsound

  Rule: the report given to --jest is read only in the shape Jest writes

    @unit @e2e @SCN-JST-008
    Scenario Outline: a file given to --jest that is not Jest's JSON report is refused as unreadable at exit 2, naming the shape Jest writes
      Given a target whose Jest report is <defect>
      When the balance run reads that input
      Then the input is refused as one the tool cannot read, never read as a verdict
      And the refusal names the Jest report and the shape Jest writes

      Examples:
        | defect                                 |
        | not JSON at all                        |
        | a JUnit XML report rather than JSON    |
        | JSON that holds no test results        |
