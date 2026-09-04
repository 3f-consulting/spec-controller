@TGT
Feature: a target whose stepped scenario claims two fitness checks

  The FIFTH pair of the @integration arm belonging to @SCN-STG-007, and byte-for-byte
  `scn-tags-two-checks` with one difference: the offending scenario has STEPS. The registry
  is the same, the two bare check tags are the same, and the verdict has to be the same —
  because the fitness axis is named by the registered TAG, not by whether the author wrote
  a step (3F-3126, following 3F-3115 in the engine). Two tags on one scenario meant two
  scenarios however it was written.

  THIS TREE IS THE PAIR THAT ONLY REDS BECAUSE THE RULE STOPPED READING SHAPE. Before
  3F-3132 the one-check rule returned nothing for a stepped scenario and this fixture
  passed that arm; the whole change is that it no longer does.

  IT ALSO REDS AS TIER-LESS UNTIL 3F-3133 LANDS, and that is deliberate rather than
  incidental: the tier floor still reads steplessness for one more commit, so SCN-TGT-002
  names no tier it recognises. Both faults are real while both rules disagree, and this
  arm asserts only its own half — the scenario named, and both check tags named.

  The behavioural scenario above it carries TWO TIER tags on purpose, exactly as its
  sibling fixture does: two tiers on one stepped scenario is legal and must stay legal, so
  a rule that counted tags rather than reading the registry would red this fixture for the
  wrong scenario.

  @unit @integration @SCN-TGT-001
  Scenario: a behavioural scenario carrying two tiers
    Given the target source

  @complexity @typecheck @SCN-TGT-002
  Scenario: the codebase stays inside both thresholds
    Given the target source
