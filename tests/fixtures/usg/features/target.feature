@TGT
Feature: a fixture target citing one of the two checks its CI runs

  A FIXTURE target (NOT under features/) standing in for a codebase whose CI runs two
  fitness functions (lint:foo + lint:bar) and whose corpus carries a stepless fitness scenario
  for only one of them. Its lint:foo step carries that scenario's code as its
  own `id:`, so the running-check observer reads the citation directly off the step rather
  than through a registered handle. lint:bar's step carries no `id:` and no row answers it,
  which is therefore the uncited fitness function the suspense row carries. `test` / `cucumber`
  run in this CI too and carry no check prefix, so they are never observed on this axis.

  ONE CHECK CITING AND ONE NOT IS WHAT GIVES THE PAIR ITS TEETH. Leaving lint:bar's step
  at cites-no-scenario produces the same report for the reason a step naming no row always does — a
  step nothing names reaches nothing — and the target could then go on passing under a
  rule that never asked whether anything CITED the check. One citing and one at cites-no-scenario is the shape
  only the one posting rule can produce, so it is the one this fixture holds.

  THE @unit TAG BELOW IS LOAD-BEARING AND IS NOT THIS FEATURE FILE'S. This target is shared
  with @SCN-RMD-005 and @SCN-RMD-008 in features/report-model.feature, and RMD-008 reads the
  missing-evidence split for the word "unit" — which only exists because this scenario owes a
  unit test no run ever supplies. Two axes on one stepless row is the shape @SCN-LNT-004
  already models, so it costs the fitness reading nothing; dropping the tag silently empties
  another scenario's assertion.

  Rule: the target holds itself to the foo check its CI runs

    @unit @fitness @SCN-TGT-001
    Scenario: the tree stays inside the foo threshold
