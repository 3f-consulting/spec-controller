@TGT
Feature: a target whose timed suite is named by its own thresholds

  Planted for @SCN-STG-009's @integration arm and used TWICE — this tree is byte-identical
  in the scn-tags-measured-unconfigured fixture beside it, and only the package.json differs.

  SCN-TGT-001 carries `@ci-run-time`, a MEASURED check: nothing invokes it, so no runnable
  handle can register it and the only place it is named is this target's thresholds. SCN-TGT-002
  is the REGISTERED shape @SCN-STG-005 already covers, kept here so the pair proves the two sets
  are UNIONED rather than swapped — a command reading the thresholds INSTEAD of the registry
  admits the first and reds the second, and one reading the registry alone does the reverse.

  With the thresholds configured both words are grammar; with them gone the first reds for
  meaning nothing here, which is what makes the pass the CONFIG's doing rather than a hard-coded
  allowance for a word this command does not own. The twin's REGISTRY is left untouched, so its
  one finding is the measured tag alone.

  Steps say nothing either way (3F-3126): the grammar walk reads a scenario's TAGS, so these
  rows are written stepless because a threshold is what they assert, not because the rule looks.

  @ci-run-time @SCN-TGT-001
  Scenario: the timed suite completes inside its CI threshold

  @complexity @SCN-TGT-002
  Scenario: the codebase stays inside the complexity thresholds
