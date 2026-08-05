@TGT
Feature: a fixture target with a tier-less scenario

  A FIXTURE target (NOT under features/) standing in for a codebase whose one @SCN scenario
  names no evidence tier and is not @wip. The scn-tags guard must flag it (non-zero,
  naming the offending @SCN). Never a real features/ scenario — a planted fixture only.

  Rule: a tier-less scenario

    @SCN-TGT-001
    Scenario: a scenario that names no evidence tier
      Given the target source
