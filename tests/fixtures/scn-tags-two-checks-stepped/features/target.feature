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

  AND IT REDS ONCE, WHICH IS WHAT THE ARM'S FINDING COUNT TURNS ON. This tree used to red
  TWICE while the private check's tier floor still read steplessness — two faults, and the
  arm could assert only its own half. The shipped command carries no tier floor at all, so
  the one finding here is this rule's and the count is a control rather than a coincidence.

  The behavioural scenario above it carries TWO TIER tags on purpose, exactly as its
  sibling fixture does: two tiers on one stepped scenario is legal and must stay legal, so
  a rule that counted tags rather than reading the target's check set would red this
  fixture for the wrong scenario.

  @unit @integration @SCN-TGT-001
  Scenario: a behavioural scenario carrying two tiers
    Given the target source

  @complexity @typecheck @SCN-TGT-002
  Scenario: the codebase stays inside both thresholds
    Given the target source
