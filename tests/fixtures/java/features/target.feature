@JVF
Feature: a target whose unit tests are a Java suite

  A FIXTURE feature (NOT under features/) standing in for a Java target whose JUnit 5 tests
  run under Maven. Its scenarios are cited by the display names in project/, whose reports a
  real Maven Surefire run wrote, with its phrased reporter, into surefire-reports/.

  Rule: the fixture target names the scenarios its JUnit 5 tests cite

    @unit @CLM-JVF-001
    Scenario: the scenario a passing JUnit 5 test cites
      Given the target repo's source

    @unit @CLM-JVF-002
    Scenario: the scenario a failing JUnit 5 test cites
      Given the target repo's source

    @unit @CLM-JVF-003
    Scenario: the scenario a JUnit 5 test's own display name cites inside a class that cites another
      Given the target repo's source

    @unit @CLM-JVF-004
    Scenario: the scenario an inner class cites around a JUnit 5 test whose own display name cites nothing
      Given the target repo's source

    @unit @CLM-JVF-005
    Scenario: the first of two scenarios one JUnit 5 test cites
      Given the target repo's source

    @unit @CLM-JVF-006
    Scenario: the second of two scenarios one JUnit 5 test cites
      Given the target repo's source

    @unit @CLM-JVF-007
    Scenario: the scenario each invocation of a parameterised JUnit 5 test cites
      Given the target repo's source

    @unit @CLM-JVF-008
    Scenario: the scenario a disabled JUnit 5 test cites
      Given the target repo's source

    @unit @CLM-JVF-009
    Scenario: the scenario a JUnit 5 test whose assumption fails cites
      Given the target repo's source

    @unit @CLM-JVF-010
    Scenario: the scenario a JUnit 5 test that throws cites
      Given the target repo's source

    @unit @CLM-JVF-011
    Scenario: the scenario a JUnit 5 test cites whose setup before each test throws
      Given the target repo's source

    @unit @CLM-JVF-012
    Scenario: the scenario a JUnit 5 test cites in a class whose setup before all its tests fails
      Given the target repo's source

    @unit @CLM-JVF-013
    Scenario: the scenario an outer class cites around a JUnit 5 test whose own display name cites nothing
      Given the target repo's source
