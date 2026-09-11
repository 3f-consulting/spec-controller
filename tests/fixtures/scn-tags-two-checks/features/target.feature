@TGT
Feature: a target whose stepless scenario claims two fitness checks

  Planted for @SCN-STG-007's @integration arm — the CORPUS fault the rule refuses. The
  stepless scenario below carries TWO registered bare check tags, so `fitnessCitations`
  points both checks at SCN-TGT-002 and the row raises two fitness obligations from one
  scenario. Canon allows one check per fitness scenario, whatever shape it is written in.

  IT RECONCILES BALANCED, which is why the rule is worth having. Both handles are
  registered and both credits cite honestly, so a ledger over this corpus reports two
  obligations, two observations and exit 0. Nothing but this rule sees it.

  The behavioural scenario above it carries TWO TIER tags on purpose: two tiers on one
  stepped scenario is legal and must stay legal, so a rule that counted tags rather than
  reading the target's check set would red this fixture for the wrong scenario.

  The tags are registered by this fixture's OWN package.json, and `typecheck` is in the
  registry on purpose: it carries no `lint:` prefix, so a tree that resolved check tags by
  stripping a prefix would miss it (3F-2495).

  @unit @integration @SCN-TGT-001
  Scenario: a behavioural scenario carrying two tiers
    Given the target source

  @complexity @typecheck @SCN-TGT-002
  Scenario: the codebase stays inside both thresholds
