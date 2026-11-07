@JAV
Feature: A Java suite's results answer unit evidence obligations

  A Java team runs its JUnit 5 tests with Maven, and Maven Surefire writes what ran as JUnit
  XML reports, one file per test class. `balance` reads those reports, given with --junit, as
  unit evidence beside a Vitest one, so each @unit scenario in the team's feature files is
  reconciled against the JUnit 5 test that cites it, exactly as a Vitest suite's is.

  A JUnit 5 test cites its scenario through its display name: the scenario's code in square
  brackets, carried into the report by Surefire's phrased reporter.

  Rule: a JUnit 5 test answers the scenario its display name cites

    @unit @e2e @CLM-JAV-001
    Scenario: a passing JUnit 5 test that cites its scenario in its display name answers that scenario's unit evidence obligation, and the scenario reconciles satisfied
      Given a target whose unit tests are a Java suite that Maven Surefire has run, writing its reports into a directory
      And in that run a passing test cites one of the target's unit scenarios in its display name
      When balance is asked to reconcile that target with that directory of Surefire reports
      Then the scenario that JUnit 5 test cites reconciles satisfied, by that test

    @unit @CLM-JAV-002
    Scenario: a failing JUnit 5 test that cites its scenario posts a failing observation, and the scenario reconciles failing

    @unit @CLM-JAV-003
    Scenario: a code in a JUnit 5 test's own display name is read before a code in the display names of the classes around it

    @unit @CLM-JAV-004
    Scenario: a JUnit 5 test with no code of its own is credited to the innermost class around it that cites one

    @unit @CLM-JAV-005
    Scenario: a JUnit 5 test whose display name cites two scenarios credits neither, and the unnamed claim's row names both codes

    @unit @CLM-JAV-006
    Scenario: each invocation of a parameterised JUnit 5 test cites the scenario its name pattern carries

  Rule: a JUnit 5 test that did not finish proves nothing it did not reach

    @unit @CLM-JAV-007
    Scenario: a disabled JUnit 5 test, or one whose assumption fails, posts no evidence observation, so the scenario it cites reads missing

    @unit @CLM-JAV-008
    Scenario: a JUnit 5 test that throws, in its body or in its setup before each test, posts a failing observation

    @unit @CLM-JAV-009
    Scenario: a JUnit 5 class whose setup before all its tests fails posts a broken item and the run is unsound

  Rule: Surefire's reports are read as Surefire writes them

    @unit @e2e @CLM-JAV-010
    Scenario: a single Surefire report file whose root is one test suite is read through --junit
      Given a target whose unit tests are a Java suite and whose scenario raises a unit evidence obligation
      And a single Surefire report file, whose root is one test suite, in which a passing test cites that scenario in its display name
      When balance is asked to reconcile that target with that Surefire report file
      Then the scenario that JUnit 5 test cites reconciles satisfied, by that test

    @unit @e2e @CLM-JAV-011
    Scenario Outline: a report file in the directory given to --junit that is not a JUnit XML report is refused as unreadable at exit 2, naming that file
      Given a target whose unit tests are a Java suite that Maven Surefire has run, writing its reports into a directory
      And beside the reports Surefire wrote, that directory holds a report file that is <defect>
      When balance is asked to reconcile that target with that directory of Surefire reports
      Then the reports are refused as input the tool cannot read, never read as a verdict
      And the refusal names that report file and the shape a JUnit XML report takes

      Examples:
        | defect                        |
        | not XML at all                |
        | XML that holds no test suites |
