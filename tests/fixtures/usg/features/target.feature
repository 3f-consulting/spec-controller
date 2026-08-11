@TGT
Feature: a fixture target citing one of the two checks its CI runs

  A FIXTURE target (NOT under features/) standing in for a codebase whose CI runs two
  static checks (lint:foo + lint:bar) and whose corpus carries a stepless fitness scenario
  for only one of them. Both handles are REGISTERED — this target's own
  specController.checkRegistry maps lint:foo to the bare check foo and lint:bar to bar — so
  the only thing separating them is the scenario below. The seam resolves lint:foo to
  SCN-TGT-001 and reaches no @SCN at all for lint:bar, which is therefore the uncited
  static check the suspense row carries. `test` / `cucumber` run in this CI too and carry
  no check prefix, so they are never observed on this axis.

  REGISTERING BOTH IS WHAT GIVES THE PAIR ITS TEETH. Leaving lint:bar out of the registry
  would produce the same report for a second reason, since a handle nothing registers
  reaches nothing either — and the target could then go on passing under a rule that never
  asked whether anything CARRIED the check. Registered-but-uncarried is the shape only the
  one posting rule can produce, so it is the one this fixture holds.

  THE @unit TAG BELOW IS LOAD-BEARING AND IS NOT THIS FEATURE FILE'S. This target is shared
  with @SCN-RMD-005 and @SCN-RMD-008 in features/report-model.feature, and RMD-008 reads the
  missing-evidence split for the word "unit" — which only exists because this scenario owes a
  unit test no run ever supplies. Two axes on one stepless row is the shape @SCN-LNT-004
  already models, so it costs the fitness reading nothing; dropping the tag silently empties
  another scenario's assertion.

  Rule: the target holds itself to the foo check its CI runs

    @unit @foo @SCN-TGT-001
    Scenario: the tree stays inside the foo threshold
