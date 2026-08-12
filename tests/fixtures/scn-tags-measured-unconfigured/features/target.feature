@TGT
Feature: a target whose timed suite is a stepless scenario

  Planted for @SCN-STG-009's @integration arm and used TWICE — this tree is byte-identical
  in the scn-tags-measured-unconfigured fixture beside it, and only the package.json differs.

  The first scenario is STEPLESS and carries `@ci-run-time`, a MEASURED check: nothing invokes
  it, so no runnable handle can register it and the only place it is named is this target's
  thresholds. The second is the REGISTERED shape @SCN-STG-005 already covers, kept here so the
  pair proves the two sets are UNIONED rather than swapped — a floor reading the thresholds
  INSTEAD of the registry admits the first and reds the second.

  With the thresholds configured both are admitted; with them gone the first reds for naming no
  tier, which is what makes the pass the CONFIG's doing rather than a hard-coded allowance for a
  word this check does not own.

  @ci-run-time @SCN-TGT-001
  Scenario: the timed suite completes inside its CI threshold

  @complexity @SCN-TGT-002
  Scenario: the codebase stays inside the complexity thresholds
