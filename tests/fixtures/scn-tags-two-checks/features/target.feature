@TGT
Feature: a target whose stepless scenario claims two fitness checks

  Planted for @SCN-STG-007's @integration arm — the CORPUS fault the rule refuses. The
  stepless scenario below carries TWO measured check tags, so the obligation rule
  points both checks at SCN-TGT-002 and the row raises two fitness obligations from one
  scenario. Canon allows one check per fitness scenario, whatever shape it is written in.

  IT RECONCILES BALANCED, which is why the rule is worth having. Both tags are read off
  this target's own thresholds and both credits cite honestly, so a ledger over this
  corpus reports two obligations, two observations and exit 0. Nothing but this rule
  sees it.

  The behavioural scenario above it carries TWO TIER tags on purpose: two tiers on one
  stepped scenario is legal and must stay legal, so a rule that counted tags rather than
  reading the target's check set would red this fixture for the wrong scenario.

  THE TAGS ARE MEASURED, NOT REGISTERED (3F-3161, 3F-3384). A bare check tag was once
  read off this target's `specController.checkRegistry`; that reading is retired, and
  the only surviving ways for a word to name a check are the fitness axis tag and a word
  this target's own `specController.thresholds` measures. The two tags below are both
  the latter — two distinct measured checks on one scenario is the same fault a pair of
  registered bare tags used to stage, constructed over the kind that survives it.

  @unit @integration @SCN-TGT-001
  Scenario: a behavioural scenario carrying two tiers
    Given the target source

  @ci-run-time @coverage @SCN-TGT-002
  Scenario: the codebase stays inside both measured thresholds
