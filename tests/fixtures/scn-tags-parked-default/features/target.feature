@TGT
Feature: a target that configures nothing and parks with the community tag

  The FALLBACK half of @SCN-STG-008's @integration arm. This fixture's package.json carries
  no specController block at all — no deferralTags, nothing — so the guard has only the
  starter set the application layer supplies, and `@wip` is in it.

  WHY THE ARM EXISTS. Taking the hard-coded `wip` out of the guard is only safe if nothing
  a target already relies on stops working, and the community convention is the thing every
  target relies on. So the claim under test is not "the guard knows about @wip" — it must
  not — but "a target that configures nothing still gets the community default, from the
  layer that owns product policy". A guard that had simply forgotten `@wip` would red here.

  @wip @SCN-TGT-001
  Scenario: a tier-less scenario parked with the community tag
    Given the target source
