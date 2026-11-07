@GOF
Feature: a target whose unit tests are a Go suite

  A FIXTURE feature (NOT under features/) standing in for a Go target whose unit tests run
  under go test. Its scenarios are cited by the subtest names in project/, whose JUnit XML
  report a real gotestsum run wrote as report.xml.

  Rule: the fixture target names the scenarios its Go subtests cite

    @unit @CLM-GOF-001
    Scenario: the scenario a passing Go subtest cites
      Given the target repo's source

    @unit @CLM-GOF-002
    Scenario: the scenario a failing Go subtest cites
      Given the target repo's source

    @unit @CLM-GOF-003
    Scenario: the scenario a Go subtest's own name cites inside a subtest that cites another
      Given the target repo's source

    @unit @CLM-GOF-004
    Scenario: the scenario a parent subtest cites around a child whose own name cites nothing
      Given the target repo's source

    @unit @CLM-GOF-005
    Scenario: the first of two scenarios one Go subtest cites
      Given the target repo's source

    @unit @CLM-GOF-006
    Scenario: the second of two scenarios one Go subtest cites
      Given the target repo's source

    @unit @CLM-GOF-007
    Scenario: the scenario a skipped Go subtest cites
      Given the target repo's source

    @unit @CLM-GOF-008
    Scenario: the scenario a Go subtest cites whose enclosing test fails before starting it
      Given the target repo's source

    @unit @CLM-GOF-009
    Scenario: the scenario a panicking Go subtest cites
      Given the target repo's source

    @unit @CLM-GOF-010
    Scenario: the scenario a Go subtest cites that a panic earlier in its package stopped
      Given the target repo's source
