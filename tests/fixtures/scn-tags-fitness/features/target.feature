@TGT
Feature: a target whose fitness checks are named by a bare check tag

  Planted for @SCN-STG-005's @integration arm. This tree's package.json still configures
  `specController.checkRegistry` for `lint:complexity` and `typecheck` — the old, retired way of
  declaring a fitness check (3F-3161) — deliberately, so the arm proves the stronger claim: the
  shipped command reds a bare check tag whether or not the target's manifest tries to register
  it, because nothing can register one any longer.

  TWO SHAPES IN ONE TREE, WHICH IS THE POINT OF IT (3F-3126). SCN-TGT-002 is STEPLESS and
  SCN-TGT-003 HAS STEPS, and each carries nothing but a bare check tag and its id. Steps say
  only how a row was written, never whether the tag it carries means anything, so both must
  red — a rule that reds one shape and greens the other is reading steps rather than tags.

  SCN-TGT-001 CARRIES A TIER AND IS LEFT ALONE THROUGHOUT. It is the control: a command that
  redded it too would have stopped recognising the scheme's own words, rather than redded a
  word that means nothing here.

  @unit @SCN-TGT-001
  Scenario: a behavioural scenario carrying its tier
    Given the target source

  @complexity @SCN-TGT-002
  Scenario: the codebase stays inside the complexity thresholds

  @typecheck @SCN-TGT-003
  Scenario: the tree typechecks
    Given the target source
