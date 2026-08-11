@DEM
Feature: a corpus whose only fitness credit is one satisfied citation-routed check

  A FIXTURE target (NOT under features/) standing in for a codebase whose ONLY fitness credit is a
  satisfied, CITATION-ROUTED check: one STEPLESS fitness scenario carries the bare check
  `@obligations-only`; the target's `specController.checkRegistry` registers
  `lint:obligations-only` as that check; CI runs lint:obligations-only; package.json defines it. So
  the check EXISTS and is ENFORCED over the real source → satisfied → the run is BALANCED. There is
  NO other credit shape — no broken, no uncited, no no-evidence-obligation check — so nothing else
  can mint the suspense row.

  WHAT THAT ISOLATION BUYS (@SCN-LDG-025, 3F-1851): summary.outOfBalance is 0 and AGREES with the
  balanced verdict. Under the REJECTED post-to-suspense treatment this corpus mints a spurious
  out-of-balance suspense row — outOfBalance 1 while isBalanced stays true, a failing run whose
  headline reads as a pass (the 3F-1703 fault). Every other fitness fixture mints a suspense row for
  some other reason, so this is the only corpus where that disagreement is falsifiable.

  Rule: one stepless fitness scenario carries a wired-and-green check

    # STEPLESS, and carrying ONLY its bare check tag — no runtime (@unit/@integration/…) tier. A
    # runtime tier would raise a runtime obligation with no credit (there is no vitest/cucumber
    # report here) → missing → out-of-balance, and the fitness credit would no longer ALONE
    # determine the verdict. The bare tag alone raises the target's whole obligation set: one
    # fitness check, which its CI runs green.
    @obligations-only @SCN-DEM-001
    Scenario: the fitness scenario for lint:obligations-only
