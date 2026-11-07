@PYT
Feature: A pytest suite's results answer unit evidence obligations

  A Python team runs its unit tests with pytest, and pytest writes what ran as a JUnit XML
  report. `balance` reads that report as unit evidence beside a Vitest one, so each @unit
  scenario in the team's feature files is reconciled against the pytest test that cites it,
  exactly as a Vitest suite's is.

  A pytest test cites its scenario by a `scn` property on its testcase: a `@pytest.mark.scn`
  marker that a `conftest.py` hook copies into the test's properties, or `record_property`.

  Rule: a pytest test answers the scenario its testcase cites by exactly one scn property

    @unit @e2e @SCN-PYT-001
    Scenario: a passing pytest test that cites its scenario answers that scenario's unit evidence obligation, and the scenario reconciles satisfied
      Given a target whose scenario raises a unit evidence obligation
      And a pytest report in which a passing test cites that scenario
      When balance is asked to reconcile that target with the pytest report
      Then the scenario reconciles satisfied

    @unit @SCN-PYT-002
    Scenario: a failing pytest test that cites its scenario posts a failing observation, and the scenario reconciles failing

    @unit @SCN-PYT-003
    Scenario: a skipped pytest test posts no evidence observation, as a skipped Vitest test posts none

    @unit @SCN-PYT-004
    Scenario: a pytest test citing a scenario no feature file carries posts to a phantom claim

    @unit @SCN-PYT-005
    Scenario: a pytest test citing no scenario posts its passed observation to the unnamed claim

    @unit @SCN-PYT-006
    Scenario: a pytest test whose testcase carries two scn properties credits neither scenario, and the unnamed claim's row names both codes

  Rule: a pytest test cites its claim code by a clm property, as it does by scn

    @unit @SCN-PYT-010
    Scenario Outline: a pytest test credits a claim only when its properties name one code

  Rule: a pytest run whose proof never ran is broken evidence, never missing or failing

    @unit @SCN-PYT-007
    Scenario: a pytest run that failed to collect posts a broken item and the run is unsound

    @unit @SCN-PYT-008
    Scenario: a pytest test whose setup errored posts a broken line naming the test, and the scenario it cites reads a missing line beside it

  Rule: the report given to --pytest is read only in the shape pytest writes

    @unit @e2e @SCN-PYT-009
    Scenario Outline: a file given to --pytest that is not a JUnit XML report is refused as unreadable at exit 2, naming the shape pytest writes
      Given a target whose pytest report is <defect>
      When the balance run reads that input
      Then the input is refused as one the tool cannot read, never read as a verdict
      And the refusal names the pytest report and the shape pytest writes

      Examples:
        | defect                         |
        | not XML at all                 |
        | a JSON report rather than XML  |
        | XML that holds no test suites  |
