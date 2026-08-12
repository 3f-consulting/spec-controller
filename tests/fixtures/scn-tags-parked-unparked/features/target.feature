@TGT
Feature: the same target with the scenario unparked

  The RED half of @SCN-STG-008's @integration arm — byte-for-byte its sibling
  `scn-tags-parked` with the parking tag taken off the scenario. The package.json is
  unchanged and still configures `@parked`, so the difference the arm turns on is exactly
  the tag on the tag line and nothing about the config.

  Keeping the pair apart as two trees is what makes it a pair rather than a single
  assertion: the check passes the sibling and reds this, so the skip is demonstrably the
  parking tag's doing.

  @SCN-TGT-001
  Scenario: a tier-less scenario nobody parked
    Given the target source
