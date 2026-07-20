@DEM
Feature: a corpus whose only lint credit is a demanded static guard

  A FIXTURE target (NOT under features/) standing in for a codebase whose ONLY lint credit is a
  DEMANDED static guard: one scenario declares @lint=lint:demanded-only; CI runs
  lint:demanded-only; package.json defines it. So the guard EXISTS and is ENFORCED over the real
  source → satisfied → the run is BALANCED. There is NO other credit shape — no broken, no
  uncited, no undemanded guard — so nothing else can mint the suspense row. The demanded-guard
  posting rule ALONE determines the verdict (@SCN-LDG-025, 3F-1851): the credit posts to its
  demanding account, so summary.outOfBalance is 0 and agrees with the balanced verdict. Under the
  REJECTED post-to-suspense treatment this corpus would mint a spurious out-of-balance suspense
  row (the 3F-1703 fault), which this fixture makes falsifiable for the first time.

  Rule: one scenario demands a wired-and-green static guard

    # ONLY @lint — no runtime (@unit/@integration/…) tier. A runtime tier would declare a runtime
    # obligation with no credit (there is no vitest/cucumber report here) → missing → out-of-balance,
    # and the demanded-guard path would no longer ALONE determine the verdict. The @lint tag alone
    # satisfies the target's obligation set: one demanded static guard, which its CI runs green.
    @lint=lint:demanded-only @SCN-DEM-001
    Scenario: the sole demander of lint:demanded-only
      Given the target source
