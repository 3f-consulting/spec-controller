@BRK
Feature: an unsound reconciliation fixture target

  A FIXTURE feature (NOT under features/) standing in for a target repo whose proving
  suite FAILED TO COLLECT. The scenario's
  test exists and cites it correctly, but the file errored before it named a single
  test (a missing dependency), so the vitest report carries the file with
  `status: "failed"` and ZERO assertionResults. The reader posts a `never-ran` item to the
  unnamed claim; the scenario itself still reads `missing` (honest at that resolution).

  The run is therefore BOTH out-of-balance (the never-ran item sits on the unnamed claim's row)
  and UNSOUND — which is exactly the trap @CLM-CLI-012 exists to close: without
  checking `hasNeverRanEvidence` FIRST, this run exits 1 and the collection failure is
  masked as an honest disagreement.

  This file lives under tests/fixtures/ (NOT features/), so this repository's own checks,
  which scan features/*.feature only, never see @BRK / @CLM-BRK-NNN.

  Rule: the fixture target names one unit-level scenario whose proving suite never ran

    @unit @CLM-BRK-001
    Scenario: the target names a scenario whose proof failed to collect
      Given the target repo's source
