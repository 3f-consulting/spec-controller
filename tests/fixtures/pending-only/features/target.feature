@PDO
Feature: an only-Pending-Items reconciliation fixture target

  A FIXTURE feature (NOT under features/) standing in for a target repo whose ONLY
  non-satisfied element is a deferred `<quality-check>pending` obligation. Every declared
  scenario's sole obligation is deferred pending, so each partitions off to a one-sided
  Pending Item (run-neutral by default — the slice-2 partition) leaving ZERO reconciled
  rows; there is no observation, no phantom, no uncited credit, and — run with a guardless
  --package-json — no undemanded static-check suspense row. So the WHOLE reconciliation is
  balanced-with-pending: `isBalanced` sees no reconciling item anywhere, and `balance`
  exits 0 when `--strict` is NOT given (the lenient default, planted, never a real scanned
  deferral).

  This file lives under tests/fixtures/ (NOT features/), so neither the feature-code
  registry lint nor the scenario-to-sub-issue gate sees @PDO or its scenario ids — they
  scan features/*.feature only. cucumber.js runs features/** only, so it is never executed
  as a scenario; it is fed to the real binary as a --features target dir.

  Rule: the fixture target declares only deferred-pending scenarios

    @unitpending @SCN-PDO-001
    Scenario: the target declares a unit obligation deferred pending
      Given the target repo's source

    @integrationpending @SCN-PDO-002
    Scenario: the target declares an integration obligation deferred pending
      Given the target repo's source
