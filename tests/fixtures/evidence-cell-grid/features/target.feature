@CEL
Feature: an evidence-cell-grid fixture target spanning every four-way cell case

  A FIXTURE feature (NOT under features/) standing in for a target repo whose reconciliation
  spans EVERY cell of the ledger's four-way evidence-obligation×evidence-observation encoding (@SCN-RPT-011) —
  so the @integration arm can drive the REAL reconcile + render and hold the cell honest against
  the shapes the pipeline ACTUALLY emits (the class @SCN-RPT-017 / @SCN-RPT-018 established: a
  cell bug is only caught by the real pipeline, never by a hand-built balance).

  The five scenarios, and the cells they pin:
    - @SCN-CEL-001 — @unit + @lint=guard:cell-grid, both discharged → Lint `1`, Unit `1`
      (named and met — the count).
    - @SCN-CEL-002 — @integration, NO cucumber observation → Integration `∅` (named, missing),
      and Unit / E2e `—` (a column absent for this scenario — neither declared nor present).
    - @SCN-CEL-003 — @e2e ONLY, discharged by a passing cucumber observation → E2e `1`; a VITEST
      unit test nonetheless cites it, which the reconciler posts as an UNDEMANDED credit-side row
      (@SCN-LDG-008) and the census counts into `undemandedCount`, OUT of `attributed` → its Unit
      cell must read `(1)`, NOT `∅`. This is the SCN-CLI-054 shape — the bug this scenario fixes.
    - @SCN-CEL-004 — @unitpending: the unit obligation is DEFERRED, so it partitions to a one-sided
      Pending Item and posts NO reconciled row; but the pending pair STAYS in
      evidenceObligationPairs, so the vitest observation citing it is ATTRIBUTED, not undemanded →
      its Unit cell must read `(1)`. The second, live-today production shape of `(N)`.
    - @SCN-CEL-005 — two @lint guards (@lint=guard:cell-grid-a @lint=guard:cell-grid-b), BOTH wired
      into CI and discharged → Lint `L2/2`: the LEFT count is the evidence-obligation count (two
      lint QCRs on the row, @SCN-RPT-011), the RIGHT the present-guard count. The ONLY scenario
      naming >1 static check — it exercises the `L2` left-count path.

  This file lives under tests/fixtures/ (NOT features/), so neither the feature-code registry
  lint nor the scenario↔sub-issue gate sees @CEL / @SCN-CEL-NNN — they scan features/*.feature
  only. cucumber.js runs features/** only, so it is never executed as a scenario.

  Rule: the fixture target spans every cell case

    @unit @lint=guard:cell-grid @SCN-CEL-001
    Scenario: a named, met obligation at unit and lint
      Given the target repo's source

    @integration @SCN-CEL-002
    Scenario: a named obligation with no evidence observation
      Given the target repo's source

    @e2e @SCN-CEL-003
    Scenario: an e2e-only scenario a unit test nonetheless cites
      Given the target repo's source

    @unitpending @SCN-CEL-004
    Scenario: a pending unit obligation an observation is nonetheless attributed to
      Given the target repo's source

    @lint=guard:cell-grid-a @lint=guard:cell-grid-b @SCN-CEL-005
    Scenario: a scenario naming two static checks, both wired and discharged
      Given the target repo's source
