@TGT
Feature: a target that parks scenarios with a tag of its own choosing

  Planted for @SCN-STG-008's @integration arm — the target whose parking tag is NOT the
  community one. `@parked` is in no starter set; it is recognised, and it parks, ONLY
  because this fixture's own package.json configures it under specController.deferralTags.
  That is what the tag being the TARGET'S means, and it is why this fixture is driven from
  INSIDE its own tree: run from repoRoot the CLI would resolve spec-controller's config,
  which configures nothing, and `@parked` would be an unrecognised tag on a tier-less
  scenario — two findings instead of a pass.

  The scenario below names NO tier on purpose. The floor is the question, and a parked
  scenario is out of its scope until it is unparked.

  @parked @SCN-TGT-001
  Scenario: a tier-less scenario the target has parked
    Given the target source
