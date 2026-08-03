@DEM
Feature: a corpus whose only lint credit is a named static check

  A FIXTURE target (NOT under features/) standing in for a codebase whose ONLY lint credit is a
  NAMED static check: one scenario declares @lint=lint:obligations-only; CI runs
  lint:obligations-only; package.json defines it. So the guard EXISTS and is ENFORCED over the real
  source → satisfied → the run is BALANCED. There is NO other credit shape — no broken, no
  uncited, no no-evidence-obligation guard — so nothing else can mint the suspense row. The named-guard
  posting rule ALONE determines the verdict (@SCN-LDG-025, 3F-1851): the credit posts to its
  naming account, so summary.outOfBalance is 0 and agrees with the balanced verdict. Under the
  REJECTED post-to-suspense treatment this corpus would mint a spurious out-of-balance suspense
  row (the 3F-1703 fault), which this fixture makes falsifiable for the first time.

  Rule: one scenario names a wired-and-green static check

    # ONLY @lint — no runtime (@unit/@integration/…) tier. A runtime tier would declare a runtime
    # obligation with no credit (there is no vitest/cucumber report here) → missing → out-of-balance,
    # and the named-guard path would no longer ALONE determine the verdict. The @lint tag alone
    # satisfies the target's obligation set: one named static check, which its CI runs green.
    @lint=lint:obligations-only @SCN-DEM-001
    Scenario: the sole naming scenario of lint:obligations-only
      Given the target source
