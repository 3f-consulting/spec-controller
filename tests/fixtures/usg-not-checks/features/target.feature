@TNC
Feature: a fixture target that names one of its own CI steps a non-check

  A FIXTURE target (NOT under features/) standing in for a consumer using the third exclusion —
  their own list, about their own pipeline. Its manifest says:

    "notChecks": ["ci.yml:ci:Rule check", "ci.yml:ci:Circular-import check"]

  and its pipeline runs two checks, Rule check and Sweep check. The first entry names the first
  of them; the second names a step this pipeline no longer has, the Sweep check's old name.

  BOTH CHECK STEPS ARE DISCOVERABLE BY TODAY'S PREFIX RULE, and that is what makes the exclusion
  readable before the membership filter inverts: only a lint:-prefixed script reaches the books
  at all right now, so an excluded step that was not one could not be observed leaving them.
  After the inversion the same mechanism takes out plumbing, which is what a consumer will
  actually write in it.

  THE SWEEP CHECK IS THE CONTROL. A reader that discovered nothing at all would satisfy "the Rule
  check is off the books" while being blind, so the second check has to stay on them — one no
  entry names, otherwise identical.

  Both handles are registered and cited by nothing, so each reaches this axis as an uncited
  static check for one reason rather than two: the seam resolves a bare check tag for the handle,
  and no scenario below carries it.

  Rule: a rule holding the target to nothing this axis can cite

    @unit @SCN-TNC-001
    Scenario: the target source is exercised
      Given the target source
