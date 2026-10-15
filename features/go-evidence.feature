@GOT
Feature: A Go suite's results answer unit evidence obligations

  A Go team runs its unit tests with go test through gotestsum, and gotestsum writes what ran
  as a JUnit XML report. `balance` reads that report, given with --junit, as unit evidence
  beside a Vitest one, so each @unit scenario in the team's feature files is reconciled
  against the Go test that cites it, exactly as a Vitest suite's is.

  A Go test cites its scenario through a subtest: the scenario's code in square brackets in
  the subtest's name.

  Rule: a Go test answers the scenario its subtest's name cites

    @unit @e2e @SCN-GOT-001
    Scenario: a passing Go subtest that cites its scenario in its name answers that scenario's unit evidence obligation, and the scenario reconciles satisfied
      Given a target whose unit tests are a Go suite and whose scenario raises a unit evidence obligation
      And a gotestsum report in which a passing subtest cites that scenario in its name
      When balance is asked to reconcile that target with the gotestsum report
      Then the scenario that Go subtest cites reconciles satisfied, by that subtest

    @unit @SCN-GOT-002
    Scenario: a failing Go subtest that cites its scenario posts a failing observation, and the scenario reconciles failing

    @unit @SCN-GOT-003
    Scenario: a code in a Go subtest's own name is read before a code in the names of the tests around it

    @unit @SCN-GOT-004
    Scenario: a Go subtest whose name cites two scenarios credits neither, and suspense names both codes

  Rule: a Go test that did not run proves nothing

    @unit @SCN-GOT-005
    Scenario: a skipped Go subtest posts no evidence observation, so the scenario it cites reads missing

    @unit @SCN-GOT-006
    Scenario: a Go subtest whose enclosing test fails before starting it posts nothing, so the scenario it cites reads missing

    @unit @SCN-GOT-007
    Scenario: a Go package that fails to compile posts a broken item and the run is unsound

    @unit @SCN-GOT-008
    Scenario: a Go subtest that panics posts a failing observation

  Rule: the report given to --junit is read only in the shape a JUnit XML report takes

    @unit @e2e @SCN-GOT-009
    Scenario Outline: a file given to --junit that is not a JUnit XML report is refused as unreadable at exit 2, naming that shape
      Given a target whose JUnit report is <defect>
      When the balance run reads that input
      Then the input is refused as one the tool cannot read, never read as a verdict
      And the refusal names the JUnit report and the shape a JUnit XML report takes

      Examples:
        | defect                         |
        | not XML at all                 |
        | a JSON report rather than XML  |
        | XML that holds no test suites  |
