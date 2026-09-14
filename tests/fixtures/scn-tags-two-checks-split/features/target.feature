@TGT
Feature: a target whose stepless scenario claims one fitness check

  The REMEDIED half of @SCN-STG-007's @integration arm — byte-for-byte its sibling
  `scn-tags-two-checks` with ONE of the two check tags removed. Keeping the pair apart as
  two trees is what makes the arm a pair rather than a single assertion: the check reds the
  first and passes this, so the difference the rule turns on is exactly the second tag.

  The behavioural scenario keeps BOTH of its tier tags, so the green here also says the
  rule never reached a stepped scenario naming two tiers.

  @unit @integration @SCN-TGT-001
  Scenario: a behavioural scenario carrying two tiers
    Given the target source

  @ci-run-time @SCN-TGT-002
  Scenario: the codebase stays inside the ci-run-time threshold
