@EXT
Feature: an external target repo's own fitness scenario

  A FIXTURE feature standing in for ANOTHER repository, read cross-repo by spec-controller
  via --features. Its stepless fitness scenario carries the bare check @vocab-check, which
  the external package.json registers for the script lint:vocab-check — a script that
  repository DEFINES and its ci.yml never runs. That is the watermelon read entirely from
  the target (@SCN-LNT-005), and every input it rests on lives in this directory.

  Nothing here is spelled the way spec-controller spells it, which is the point: the check
  tag, the script, the registry entry and the @SCN are all words this repository does not
  use, so an input resolved from the tool's own tree instead of the target's cannot answer.

  This file lives under tests/fixtures/ (NOT features/), so neither the feature-code
  registry check nor the scenario-to-sub-issue gate sees @EXT / @SCN-EXT-001 — they scan
  features/*.feature only.

  Rule: the external target holds its own vocabulary inside its own check

    @vocab-check @SCN-EXT-001
    Scenario: the external target's prose stays inside its adopted vocabulary
