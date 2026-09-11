@TGT
Feature: a target whose fitness checks are named by a bare registered check tag

  Planted for @SCN-STG-005's @integration arm and used TWICE — this tree is byte-identical in
  the scn-tags-fitness-unregistered fixture beside it, and only the package.json differs.
  Without that pair every Then in the scenario reads `it passes`, and a rule that recognised
  the registry's words would be indistinguishable from one that had stopped looking at tags
  altogether.

  TWO SHAPES IN ONE TREE, WHICH IS THE POINT OF IT (3F-3126). SCN-TGT-002 is STEPLESS and
  SCN-TGT-003 HAS STEPS, and each carries nothing but a bare registered check tag and its id.
  Steps say only how a row was written; the registered tag is the claim about which axis it is
  on. So the two shapes are one case, and the twin beside this tree has to red BOTH of them —
  which is the arm that was missing while they were two fixtures with an arm each (3F-3305),
  because no run ever compared them and the stepless shape was never shown to be the
  registry's doing at all.

  The tags are registered by this fixture's OWN package.json, and `typecheck` is in the
  registry on purpose: it carries no `lint:` prefix, so a tree that resolved check tags by
  stripping a prefix would miss it (3F-2495).

  SCN-TGT-001 CARRIES A TIER AND IS LEFT ALONE THROUGHOUT, here and in the twin. It is the
  control: a command that redded the twin by having stopped recognising the scheme's own words,
  rather than by reading this target's registry, would name it too.

  @unit @SCN-TGT-001
  Scenario: a behavioural scenario carrying its tier
    Given the target source

  @complexity @SCN-TGT-002
  Scenario: the codebase stays inside the complexity thresholds

  @typecheck @SCN-TGT-003
  Scenario: the tree typechecks
    Given the target source
