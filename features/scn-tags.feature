@STG
Feature: The tier-tag floor — every scenario names an evidence tier

  spec-controller reconciles on evidence tiers but did not require its OWN scenarios to
  name one — a tier-less scenario yields no evidence obligation and slips silently. This
  guard closes that (the cobbler's shoes): every scenario under features/ carrying an @SCN
  must name at least one tier tag, UNLESS it carries @wip. scnTags parity with an adopter's repository's
  guard:scn-tags. The guard is itself @lint-cited (@lint=lint:scn-tags) and CI-wired, so
  spec-controller's own ledger reconciles it.

  What counts as a tier (load-bearing): @unit / @integration / @e2e / @performance, their
  pending variants (@unitpending / @integrationpending / etc. — a <tier>pending names the
  tier, deferred), AND @lint=<guard> — spec-controller names lint as @lint=<guard>, not
  bare @lint, so the guard accepts the =<guard> form. A bare-@lint-only match would
  false-flag every guard scenario (including this one) and red the real tree. Exempt: @wip
  only (the other recognised deferral tags are for reconciled targets, not spec-controller's
  own authoring).

  Rule: a tier-less non-@wip @SCN scenario reds the scn-tags guard

    The lint:scn-tags guard fails (non-zero, naming each offender) if any scenario under
    features/ carries an @SCN but names no evidence tier and is not @wip, and passes over
    a tree where every @SCN scenario names a tier (or is @wip). @SCN-STG-001 itself
    carries @unit @integration, satisfying the floor it enforces.

    @unit @integration @lint=lint:scn-tags @SCN-STG-001
    Scenario: the scn-tags guard flags a tier-less non-@wip scenario, exempts @wip, and passes a tiered tree
      Given the scn-tags guard
      When it runs over a features tree with a tier-less non-@wip scenario
      Then it fails, naming the offending scenario
      When it runs over a fully tiered tree where every @SCN scenario names a tier or is @wip
      Then it passes

  Rule: a tag outside the recognised grammar reds the tier-tag static check

    THE TYPO THAT READS AS A COMMUNITY TAG. The floor above asks one question —
    does the scenario NAME a tier? A mistyped tier tag is invisible to it:
    `@untit` is not a tier, so it contributes nothing, and the scenario is
    satisfied by the `@unit` beside it — or, when the typo IS the only tier-ish
    tag, slips the floor entirely and raises no Evidence Obligation at all.
    Nothing else catches it either: the vocabulary audit sees the token and asks
    the wrong question of it (is this word retired?), and in prose mode an unknown
    word does not flag, so the typo is silently green (3F-2313 posed this and
    deliberately left it).

    Whether a tag is legitimate is a GRAMMAR question about a closed set, and the
    set is already written down twice over — the tier tags this check owns, and
    the recognised community deferral tags the product itself honours. So the
    recognised grammar is DERIVED, never restated: the @SCN id, a tier tag, or a
    member of the resolved deferral set. Anything else is a tag that means nothing
    here, and it reds.

    NAMING WHAT WAS PROBABLY MEANT IS A COURTESY, NOT THE VERDICT. When the
    unrecognised tag is close to a tier the message says so; when it is not, it
    reds all the same. A guess that steers the fix is worth having; a guess that
    decides the outcome would make the gate only as good as its edit distance.

    @unit @integration @SCN-STG-002
    Scenario: an unrecognised tag reds the check, naming it and the tier it resembles
      Given the scn-tags static check
      When it runs over a features tree whose @SCN scenario carries a mistyped tier tag
      Then it fails, naming the unrecognised tag and the tier it resembles

  Rule: a recognised community deferral tag is grammar, not a typo

    THE CARVE-OUT THAT KEEPS THE TEETH OFF THE PRODUCT'S OWN POLICY. Reding every
    tag outside the tier set would red `@skip` — a tag spec-controller itself
    recognises, honours as a deferral signal, and lets a target extend by config.
    A check that condemns what the product accepts is not stricter, it is wrong.

    So the recognised set is the resolved deferral set, and it arrives the way the
    ingest edge gets it: resolved at the CLI from the target's package.json and
    handed to the check. That is what makes "derived, not restated" true rather
    than aspirational — there is no second list here to fall behind the first.

    RECOGNISING A TAG IS NOT EXCUSING THE FLOOR, and the two questions must not
    bleed. A `@skip` scenario naming no tier still reds — as tier-less, which is
    what it is. `@wip` remains the only exemption.

    @unit @integration @SCN-STG-003
    Scenario: a recognised community deferral tag is not an unrecognised tag
      Given the scn-tags static check
      When it runs over a features tree whose tiered @SCN scenario also carries a recognised community deferral tag
      Then it passes
