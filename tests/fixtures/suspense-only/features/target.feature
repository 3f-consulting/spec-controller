@SUS
Feature: a fixture target whose ONLY out-of-balance row is the suspense reconciliation

  A FIXTURE feature (NOT under features/) standing in for THE an adopter's repository 17-36-50Z SHAPE — the
  run that started 3F-1703. EVERY SCENARIO BALANCES: both @unit obligations are
  satisfied by a passing observation, no observation cites a phantom scenario (no
  phantom), no suite failed to collect (no broken item, so the run is SOUND and exit 4
  never pre-empts). The one and only reconciling item in the whole run sits on the
  SUSPENSE row: the target's CI runs `lint:uncited` and NO scenario cites it — the
  target registers no check for that handle and carries no scenario for one — so it is an
  uncited fitness function: an uncited evidence observation, posted to the `(no scenario)` suspense reconciliation.

  This is the fixture the anti-drift invariant (@SCN-CLI-013) needs, and the one shape no
  other fixture in the suite has: the named-only tally reads a CLEAN 2/2/0 while the run
  is genuinely out-of-balance and exits 1. Under the retracted "ruling Q3" the three views
  disagreed here — tally says PASS, headline says FAIL, process exits 1 — which is exactly
  the false green the operator and Cowork both read as a clean board. Now the summary counts
  every Scenario Reconciliation (@SCN-RMD-001), so the tally reads 3 | 2 | 1 and all three
  views name the same outcome.

  This file lives under tests/fixtures/ (NOT features/), so neither the feature-code
  registry lint nor the scenario↔sub-issue gate sees @SUS / @SCN-SUS-NNN — they scan
  features/*.feature only.

  Rule: the fixture target names two satisfied unit-level scenarios and no fitness function

    @unit @SCN-SUS-001
    Scenario: the target names a first satisfied unit-level scenario
      Given the target repo's source

    @unit @SCN-SUS-002
    Scenario: the target names a second satisfied unit-level scenario
      Given the target repo's source
