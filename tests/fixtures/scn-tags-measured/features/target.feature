@TGT
Feature: a target whose timed suite is named by its own thresholds

  Planted for @SCN-STG-009's @integration arm and used TWICE — this tree is byte-identical
  in the scn-tags-measured-unconfigured fixture beside it, and only the package.json differs.

  SCN-TGT-001 carries `@ci-run-time`, a MEASURED check: nothing invokes it, so no runnable
  handle can register it and the only place it is named is this target's thresholds.

  With the threshold configured the word is grammar; with it gone the scenario reds for
  meaning nothing here, which is what makes the pass the CONFIG's doing rather than a
  hard-coded allowance for a word this command does not own.

  Steps say nothing either way (3F-3126): the grammar walk reads a scenario's TAGS, so this
  row is written stepless because a threshold is what it asserts, not because the rule looks.

  @ci-run-time @SCN-TGT-001
  Scenario: the timed suite completes inside its CI threshold
