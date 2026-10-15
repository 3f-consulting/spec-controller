@KOF
Feature: a target whose unit tests are a Kotlin suite

  A FIXTURE feature (NOT under features/) standing in for a Kotlin target whose JUnit 5 tests
  run under Gradle. Its scenarios are cited by the display names in project/, whose reports a
  real Gradle run wrote into test-results/.

  Rule: the fixture target names the scenarios its JUnit 5 tests cite

    @unit @SCN-KOF-001
    Scenario: the scenario a passing JUnit 5 test cites
      Given the target repo's source

    @unit @SCN-KOF-002
    Scenario: the scenario a failing JUnit 5 test cites
      Given the target repo's source

    @unit @SCN-KOF-003
    Scenario: the scenario a disabled JUnit 5 test cites
      Given the target repo's source

    @unit @SCN-KOF-004
    Scenario: the scenario a class cites around a JUnit 5 test whose own display name cites nothing
      Given the target repo's source

    @unit @SCN-KOF-005
    Scenario: the scenario a JUnit 5 test cites in a class whose setup before all its tests fails
      Given the target repo's source
