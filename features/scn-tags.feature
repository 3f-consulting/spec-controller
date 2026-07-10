@STG
Feature: The tier-tag floor — every scenario declares an evidence tier

  spec-controller reconciles on evidence tiers but did not require its OWN scenarios to
  declare one — a tier-less scenario yields no evidence obligation and slips silently. This
  guard closes that (the cobbler's shoes): every scenario under features/ carrying an @SCN
  must declare at least one tier tag, UNLESS it carries @wip. scnTags parity with an adopter's repository's
  guard:scn-tags. The guard is itself @lint-declared (@lint=lint:scn-tags) and CI-wired, so
  spec-controller's own ledger reconciles it.

  What counts as a tier (load-bearing): @unit / @integration / @e2e / @performance, their
  pending variants (@unitpending / @integrationpending / etc. — a <tier>pending declares the
  tier, deferred), AND @lint=<guard> — spec-controller declares lint as @lint=<guard>, not
  bare @lint, so the guard accepts the =<guard> form. A bare-@lint-only match would
  false-flag every guard scenario (including this one) and red the real tree. Exempt: @wip
  only (the other recognised deferral tags are for reconciled targets, not spec-controller's
  own authoring).

  Rule: a tier-less non-@wip @SCN scenario reds the scn-tags guard

    The lint:scn-tags guard fails (non-zero, naming each offender) if any scenario under
    features/ carries an @SCN but declares no evidence tier and is not @wip, and passes over
    a tree where every @SCN scenario declares a tier (or is @wip). @SCN-STG-001 itself
    carries @unit @integration, satisfying the floor it enforces.

    @unit @integration @lint=lint:scn-tags @SCN-STG-001
    Scenario: the scn-tags guard flags a tier-less non-@wip scenario, exempts @wip, and passes a tiered tree
      Given the scn-tags guard
      When it runs over a features tree with a tier-less non-@wip scenario
      Then it fails, naming the offending scenario
      When it runs over a fully tiered tree where every @SCN scenario declares a tier or is @wip
      Then it passes
