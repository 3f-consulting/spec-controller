@RSF
Feature: a target whose unit tests are an RSpec suite

  A FIXTURE feature (NOT under features/) standing in for a Ruby target whose unit tests run
  under RSpec. Its scenarios are cited by the example and group descriptions in project/spec,
  whose JSON report a real RSpec run wrote as report.json.

  Rule: the fixture target names the scenarios its RSpec examples cite

    @unit @CLM-RSF-001
    Scenario: the scenario a passing RSpec example cites
      Given the target repo's source

    @unit @CLM-RSF-002
    Scenario: the scenario a failing RSpec example cites
      Given the target repo's source

    @unit @CLM-RSF-003
    Scenario: the scenario an RSpec example's own description cites inside a group that cites another
      Given the target repo's source

    @unit @CLM-RSF-004
    Scenario: the scenario a group cites around an RSpec example whose own description cites nothing
      Given the target repo's source

    @unit @CLM-RSF-005
    Scenario: the first of two scenarios one RSpec example cites
      Given the target repo's source

    @unit @CLM-RSF-006
    Scenario: the second of two scenarios one RSpec example cites
      Given the target repo's source

    @unit @CLM-RSF-007
    Scenario: the scenario a skipped RSpec example cites
      Given the target repo's source

    @unit @CLM-RSF-008
    Scenario: the scenario an xit RSpec example cites
      Given the target repo's source

    @unit @CLM-RSF-009
    Scenario: the scenario a pending RSpec example that fails cites
      Given the target repo's source

    @unit @CLM-RSF-010
    Scenario: the scenario a pending RSpec example that passes cites
      Given the target repo's source

    @unit @CLM-RSF-011
    Scenario: the scenario an RSpec example after a failing before hook cites
      Given the target repo's source

    @unit @CLM-RSF-012
    Scenario: the scenario an RSpec example after a failing before(:context) hook cites
      Given the target repo's source
