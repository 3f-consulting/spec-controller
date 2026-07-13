@BRK
Feature: an unsound reconciliation fixture target

  A FIXTURE feature (NOT under features/) standing in for a target repo whose proving
  suite FAILED TO COLLECT — an adopter's repository dogfood fault (3F-1642). The declared scenario's
  test exists and cites it correctly, but the file errored before it named a single
  test (a missing dependency), so the vitest report carries the file with
  `status: "failed"` and ZERO assertionResults. The reader posts a `broken` suspense
  item; the scenario itself still reads `missing` (honest at that resolution).

  The run is therefore BOTH out-of-balance (the broken item sits on the suspense row)
  and UNSOUND — which is exactly the trap @SCN-CLI-012 exists to close: without
  checking `hasBrokenEvidence` FIRST, this run exits 1 and the collection failure is
  masked as an honest disagreement.

  This file lives under tests/fixtures/ (NOT features/), so neither the feature-code
  registry lint nor the scenario↔sub-issue gate sees @BRK / @SCN-BRK-NNN — they scan
  features/*.feature only.

  Rule: the fixture target declares one unit-level scenario whose proving suite is broken

    @unit @SCN-BRK-001
    Scenario: the target declares a scenario whose proof failed to collect
      Given the target repo's source
