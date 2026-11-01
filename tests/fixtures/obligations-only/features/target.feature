@DEM
Feature: a corpus whose only fitness evidence observation is one satisfied citation-routed check

  A FIXTURE target (NOT under features/) standing in for a codebase whose ONLY fitness evidence observation is a
  satisfied, CITATION-ROUTED check: one STEPLESS scenario configures one row — SCN-DEM-001,
  and its lint:obligations-only CI step carries that row's code as
  its own `id:`, so the running-check observer reads the citation directly off the step rather than
  through a registered handle; package.json defines the script. So the check EXISTS and is ENFORCED
  over the real source → satisfied → the run is BALANCED. There is NO other evidence observation shape — no
  broken, no uncited, no no-evidence-obligation check — so nothing else can mint the unnamed claim's row.

  WHAT THAT ISOLATION BUYS (@SCN-LDG-025): summary.outOfBalance is 0 and AGREES with the
  balanced verdict. Under the REJECTED treatment that posts it to the unnamed claim, this corpus mints a spurious
  out-of-balance unnamed claim's row — outOfBalance 1 while isBalanced stays true, a failing run whose
  headline reads as a pass. Every other fitness fixture mints the unnamed claim's row for
  some other reason, so this is the only corpus where that disagreement is falsifiable.

  Rule: one stepless scenario carries a wired-and-green check

    # STEPLESS, and carrying ONLY the @fitness tag — no behavioural (@unit/@integration/…) layer. A
    # behavioural layer would raise a behavioural obligation with no evidence observation (there is no vitest/cucumber
    # report here) → missing → out-of-balance, and the fitness evidence observation would not ALONE
    # determine the verdict. The configured row alone raises the target's whole obligation set: one
    # fitness function, which its CI runs green.
    @fitness @SCN-DEM-001
    Scenario: the scenario for lint:obligations-only
