@TGT
Feature: a target whose fitness checks are stepless scenarios

  Planted for @SCN-STG-005's @integration arm. Two of these scenarios are STEPLESS and
  carry a bare check tag and nothing else — the shape the corpus sweep writes twelve of.
  Neither names a tier, so both red the floor unless the bare check tag satisfies it.

  The tags are registered by this fixture's OWN package.json, and `typecheck` is in the
  registry on purpose: it carries no `lint:` prefix, so a tree that resolved check tags by
  stripping a prefix would miss it (3F-2495).

  @unit @SCN-TGT-001
  Scenario: a behavioural scenario carrying its tier
    Given the target source

  @complexity @SCN-TGT-002
  Scenario: the codebase stays inside the complexity thresholds

  @typecheck @SCN-TGT-003
  Scenario: the tree typechecks
