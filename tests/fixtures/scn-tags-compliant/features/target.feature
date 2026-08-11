@TGT
Feature: a fixture target whose scenarios each name a tier or are @wip

  A FIXTURE target (NOT under features/) standing in for a codebase whose @SCN scenarios
  each name an evidence tier — a plain tier, a pending variant, or the bare @lint check —
  or are @wip (exempt). The scn-tags guard passes (exit 0). Never a real features/
  scenario — a planted fixture only.

  Rule: every scenario names a tier or is exempt

    @unit @SCN-TGT-001
    Scenario: a unit-tiered scenario
      Given the target source

    @integrationpending @SCN-TGT-002
    Scenario: an integration-pending scenario (the pending variant counts)
      Given the target source

    # STEPLESS and carrying the BARE @lint check — the style-lint check, one registered
    # fitness check among many. The retired @lint=<guard> form used to stand here and no
    # longer satisfies the floor (@SCN-LNT-007): it raises no Evidence Obligation, so a
    # floor that accepted it would call a scenario tiered while it owed nothing at all.
    @lint @SCN-TGT-003
    Scenario: a scenario naming the bare style-lint check

    @wip @SCN-TGT-004
    Scenario: a tier-less scenario that is @wip is exempt
      Given the target source
