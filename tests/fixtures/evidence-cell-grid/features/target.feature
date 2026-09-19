@CEL
Feature: an evidence-cell-grid fixture target spanning every four-way cell case

  A FIXTURE feature (NOT under features/) standing in for a target repo whose reconciliation
  spans EVERY cell of the ledger's four-way evidence-obligation×evidence-observation encoding (@SCN-RPT-011) —
  so the @integration arm can drive the REAL reconcile + render and hold the cell honest against
  the shapes the pipeline ACTUALLY emits (the class @SCN-RPT-017 / @SCN-RPT-018 established: a
  cell bug is only caught by the real pipeline, never by a hand-built balance).

  The four scenarios, and the cells they pin:
    - @SCN-CEL-001 — @unit + the bare check @cell-grid, both discharged → Lint `1`, Unit `1`
      (named and met — the count).
    - @SCN-CEL-002 — @integration, NO cucumber observation → Integration `∅` (named, missing),
      and Unit / E2e `—` (a column absent for this scenario — neither named nor present).
    - @SCN-CEL-003 — @e2e ONLY, discharged by a passing cucumber observation → E2e `1`; a VITEST
      unit test nonetheless cites it, which the reconciler posts as a NO-EVIDENCE-OBLIGATION credit-side row
      (@SCN-LDG-008) and the census counts into `noEvidenceObligationCount`, OUT of `attributed` → its Unit
      cell must read `(1)`, NOT `∅`. This is the SCN-CLI-054 shape — the bug this scenario fixes.
    - @SCN-CEL-004 — @unitpending: the unit obligation is DEFERRED, so it partitions to a one-sided
      Pending Item and posts NO reconciled row; but the pending pair STAYS in
      evidenceObligationPairs, so the vitest observation citing it is ATTRIBUTED, not no-evidence-obligation →
      its Unit cell must read `(1)`. The second, live-today production shape of `(N)`.

  A FIFTH SCENARIO ONCE STOOD HERE — SCN-CEL-005, two bare checks on one row, both wired and
  discharged, pinning the `L2/2` left-count path. It carried no corpus obligation of its own (it
  existed only to plant a `specController.checkRegistry` collision) and went with the rest of the
  registry-route migration (3F-3395). Canon settles why it has no replacement: `double-entry-
  manifesto.md`'s Quality Check definition makes the check ITSELF the scenario, and several checks
  of one characteristic are several SCENARIOS sharing that characteristic, told apart by `@SCN` —
  one scenario is one fitness check BY CONSTRUCTION. A row naming two characteristics has no
  expression in the target model this fixture exercises, so there is nothing left to plant it
  with. The `L2`/`L3` rendering branch this scenario was the only producer of went too (3F-3411):
  the Lint cell's left is the single `L`.

  This file lives under tests/fixtures/ (NOT features/), so neither the feature-code registry
  lint nor the scenario↔sub-issue gate sees @CEL / @SCN-CEL-NNN — they scan features/*.feature
  only. cucumber.js runs features/** only, so it is never executed as a scenario.

  Rule: the fixture target spans every cell case

    # STEPLESS, and the bare check raises its fitness obligation off that tag rather than off the
    # shape (@SCN-LNT-006); the runtime tier rides alongside, making this a two-axis row
    # (@SCN-LNT-004).
    @unit @fitness @SCN-CEL-001
    Scenario: a named, met obligation at unit and lint

    @integration @SCN-CEL-002
    Scenario: a named obligation with no evidence observation
      Given the target repo's source

    @e2e @SCN-CEL-003
    Scenario: an e2e-only scenario a unit test nonetheless cites
      Given the target repo's source

    @unitpending @SCN-CEL-004
    Scenario: a pending unit obligation an observation is nonetheless attributed to
      Given the target repo's source
