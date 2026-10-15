@AAA
Feature: a target whose unit tests are a Java suite

  A FIXTURE feature (NOT under features/) standing in for a Java target whose JUnit 5 tests
  run under Maven. report.xml is one TEST-*.xml file a real Maven Surefire run wrote with its
  phrased reporter, whose root is a single test suite. Its tests cite this feature's
  scenarios in their display names.

  Rule: the fixture target names the scenario a passing JUnit 5 test cites

    @unit @SCN-AAA-001
    Scenario: the scenario a passing JUnit 5 test cites
      Given the target repo's source
