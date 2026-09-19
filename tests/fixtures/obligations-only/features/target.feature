@DEM
Feature: a corpus whose only fitness credit is one satisfied citation-routed check

  A FIXTURE target (NOT under features/) standing in for a codebase whose ONLY fitness credit is a
  satisfied, CITATION-ROUTED check: one STEPLESS fitness scenario configures one row — SCN-DEM-001,
  and its lint:obligations-only CI step carries that row's code as
  its own `id:`, so the running-check observer reads the citation directly off the step rather than
  through a registered handle; package.json defines the script. So the check EXISTS and is ENFORCED
  over the real source → satisfied → the run is BALANCED. There is NO other credit shape — no
  broken, no uncited, no no-evidence-obligation check — so nothing else can mint the suspense row.

  WHAT THAT ISOLATION BUYS (@SCN-LDG-025, 3F-1851): summary.outOfBalance is 0 and AGREES with the
  balanced verdict. Under the REJECTED post-to-suspense treatment this corpus mints a spurious
  out-of-balance suspense row — outOfBalance 1 while isBalanced stays true, a failing run whose
  headline reads as a pass (the 3F-1703 fault). Every other fitness fixture mints a suspense row for
  some other reason, so this is the only corpus where that disagreement is falsifiable.

  Rule: one stepless fitness scenario carries a wired-and-green check

    # STEPLESS, and carrying ONLY the @fitness tag — no runtime (@unit/@integration/…) tier. A
    # runtime tier would raise a runtime obligation with no credit (there is no vitest/cucumber
    # report here) → missing → out-of-balance, and the fitness credit would no longer ALONE
    # determine the verdict. The configured row alone raises the target's whole obligation set: one
    # fitness check, which its CI runs green.
    @fitness @SCN-DEM-001
    Scenario: the fitness scenario for lint:obligations-only
