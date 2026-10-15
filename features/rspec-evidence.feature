@RSP
Feature: An RSpec suite's results answer unit evidence obligations

  A Ruby team runs its unit tests with RSpec, and RSpec's JSON formatter writes what ran as a
  report. `balance` reads that report as unit evidence beside a Vitest one, so each @unit
  scenario in the team's feature files is reconciled against the RSpec example that cites it,
  exactly as a Vitest suite's is.

  An RSpec example cites its scenario by the scenario's code in square brackets in its
  description.

  Rule: an RSpec example answers the scenario its description cites

    @unit @e2e @SCN-RSP-001
    Scenario: a passing RSpec example that cites its scenario in its description answers that scenario's unit evidence obligation, and the scenario reconciles satisfied
      Given a target whose unit tests are an RSpec suite and whose scenario raises a unit evidence obligation
      And an RSpec report in which a passing example cites that scenario in its description
      When balance is asked to reconcile that target with the RSpec report
      Then the scenario that RSpec example cites reconciles satisfied, by that example

    @unit @SCN-RSP-002
    Scenario: a failing RSpec example that cites its scenario posts a failing observation, and the scenario reconciles failing

    @unit @SCN-RSP-003
    Scenario: a code in an RSpec example's own description is read before a code in the groups around it

    @unit @SCN-RSP-004
    Scenario: an RSpec example whose description cites two scenarios credits neither, and suspense names both codes

  Rule: an RSpec example that did not run proves nothing

    @unit @SCN-RSP-005
    Scenario: a skipped or pending RSpec example posts no evidence observation, so the scenario it cites reads missing

    @unit @SCN-RSP-006
    Scenario: a pending RSpec example that passes posts a failing observation

    @unit @SCN-RSP-007
    Scenario: an RSpec example whose before hook fails posts a failing observation

    @unit @SCN-RSP-008
    Scenario: an RSpec spec file that fails to load posts a broken item and the run is unsound

  Rule: the report given to --rspec is read only in the shape RSpec's JSON formatter writes

    @unit @e2e @SCN-RSP-009
    Scenario Outline: a file given to --rspec that is not RSpec's JSON report is refused as unreadable at exit 2, naming the shape RSpec writes
      Given a target whose RSpec report is <defect>
      When the balance run reads that input
      Then the input is refused as one the tool cannot read, never read as a verdict
      And the refusal names the RSpec report and the shape RSpec writes

      Examples:
        | defect                                 |
        | not JSON at all                        |
        | a JUnit XML report rather than JSON    |
        | JSON that holds no examples            |
