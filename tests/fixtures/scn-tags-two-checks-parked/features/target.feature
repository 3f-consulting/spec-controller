@TGT
Feature: a target whose two-check stepless scenario has been parked

  The PARKED half of @SCN-STG-007's @integration arm — byte-for-byte `scn-tags-two-checks`
  with a parking tag added to the offending scenario and nothing else changed. The check
  must pass: parking is a skip-signal, and a parked scenario is out of the shape rule's
  scope until it is unparked (operator ruling, 3F-2655).

  IT CONFIGURES NO DEFERRAL TAGS, on purpose. This tree parks with the community tag and
  gets it from the starter set the application layer supplies, which is the second half of
  the same claim @SCN-STG-008's third pair makes: the guard names no community tag, and a
  target that configures nothing still parks.

  THE UNPARKING IS THE SIBLING, not an edit to this file — `scn-tags-two-checks` is this
  tree with the parking tag off, and it still reds naming both tags. That pair is what says
  the skip is a skip rather than an erasure.

  @unit @integration @SCN-TGT-001
  Scenario: a behavioural scenario carrying two tiers
    Given the target source

  @wip @complexity @typecheck @SCN-TGT-002
  Scenario: the codebase stays inside both thresholds
