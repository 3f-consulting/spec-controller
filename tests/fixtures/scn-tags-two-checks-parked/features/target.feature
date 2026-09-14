@TGT
Feature: a target whose two-check stepless scenario has been parked

  The PARKED half of @SCN-STG-007's @integration arm — byte-for-byte `scn-tags-two-checks`
  with a parking tag added to the offending scenario and nothing else changed. The check
  must pass: parking is a skip-signal, and a parked scenario is out of the shape rule's
  scope until it is unparked (operator ruling, 3F-2655).

  IT CONFIGURES NO DEFERRAL TAGS, on purpose, and since 3F-3309 this tree is the whole of
  where that claim is asserted as PARKING. The rule names no community tag; what parks the
  scenario below is `@wip` in the starter set the application layer supplies, so a target
  that configures nothing still parks. The parked-scenario Rule's third pair used to say the
  same thing about the tier floor, over a fixture of its own, and left with the floor.

  THE UNPARKING IS THE SIBLING, not an edit to this file — `scn-tags-two-checks` is this
  tree with the parking tag off, and it still reds naming both tags. That pair is what says
  the skip is a skip rather than an erasure.

  @unit @integration @SCN-TGT-001
  Scenario: a behavioural scenario carrying two tiers
    Given the target source

  @wip @ci-run-time @coverage @SCN-TGT-002
  Scenario: the codebase stays inside both measured thresholds
