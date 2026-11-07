@KOT
Feature: A Kotlin suite's results answer unit evidence obligations

  A Kotlin team runs its JUnit 5 tests with Gradle, whose test task writes what ran as JUnit
  XML reports, one file per test class. `balance` reads that directory, given with --junit, as
  unit evidence, so each @unit scenario is reconciled against the JUnit 5 test that cites it in
  its display name.

  Rule: a JUnit 5 test in Kotlin answers the scenario its display name cites

    @unit @e2e @CLM-KOT-001
    Scenario: a passing JUnit 5 test in Kotlin that cites its scenario in its display name answers that scenario's unit evidence obligation, read from the reports Gradle writes, and the scenario reconciles satisfied
      Given a target whose unit tests are a Kotlin suite that Gradle has run, writing its reports into a directory
      And in that run a passing test cites one of the target's unit scenarios in its display name
      When balance is asked to reconcile that target with that directory of Gradle reports
      Then the scenario that JUnit 5 test cites reconciles satisfied, by that test
