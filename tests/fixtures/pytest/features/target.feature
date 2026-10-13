@PYF
Feature: a target whose unit tests are a pytest suite

  A FIXTURE feature (NOT under features/) standing in for a Python target whose unit
  tests run under pytest. Its scenarios are cited by the tests in project/test_cases.py,
  whose JUnit XML report a real pytest run wrote as report.xml.

  Rule: the fixture target names the scenarios its pytest tests cite

    @unit @SCN-PYF-001
    Scenario: the scenario a passing pytest test cites
      Given the target repo's source

    @unit @SCN-PYF-002
    Scenario: the scenario a failing pytest test cites
      Given the target repo's source

    @unit @SCN-PYF-003
    Scenario: the scenario a skipped pytest test cites
      Given the target repo's source

    @unit @SCN-PYF-004
    Scenario: the first of two scenarios one pytest test cites
      Given the target repo's source

    @unit @SCN-PYF-005
    Scenario: the second of two scenarios one pytest test cites
      Given the target repo's source

    @unit @SCN-PYF-006
    Scenario: the scenario a pytest test whose setup errored cites
      Given the target repo's source
