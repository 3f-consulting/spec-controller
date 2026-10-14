@JSF
Feature: a target whose unit tests are a Jest suite

  A FIXTURE feature (NOT under features/) standing in for a JavaScript target whose unit
  tests run under Jest. Its scenarios are cited by the test titles in project/cases.test.js,
  whose JSON report a real Jest run wrote as report.json.

  Rule: the fixture target names the scenarios its Jest tests cite

    @unit @SCN-JSF-001
    Scenario: the scenario a passing Jest test cites
      Given the target repo's source

    @unit @SCN-JSF-002
    Scenario: the scenario a failing Jest test cites
      Given the target repo's source

    @unit @SCN-JSF-003
    Scenario: the scenario a Jest test's own title cites inside a describe block that cites another
      Given the target repo's source

    @unit @SCN-JSF-004
    Scenario: the scenario a describe block cites around a test whose own title cites nothing
      Given the target repo's source

    @unit @SCN-JSF-005
    Scenario: the first of two scenarios one Jest test cites
      Given the target repo's source

    @unit @SCN-JSF-006
    Scenario: the second of two scenarios one Jest test cites
      Given the target repo's source

    @unit @SCN-JSF-007
    Scenario: the scenario a todo Jest test cites
      Given the target repo's source

    @unit @SCN-JSF-008
    Scenario: the scenario a skipped Jest test cites
      Given the target repo's source

    @unit @SCN-JSF-009
    Scenario: the scenario a Jest test under a failing beforeAll cites
      Given the target repo's source
