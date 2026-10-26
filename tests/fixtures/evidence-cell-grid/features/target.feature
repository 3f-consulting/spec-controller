@CEL
Feature: an evidence-cell-grid fixture target spanning every four-way cell case

  A FIXTURE feature (NOT under features/) standing in for a target repo whose reconciliation
  spans EVERY cell of the ledger's four-way evidence-obligation×evidence-observation encoding (@SCN-RPT-011) —
  so the @integration arm can drive the REAL reconcile + render and hold the cell honest against
  the shapes the pipeline ACTUALLY emits (the class @SCN-RPT-017 / @SCN-RPT-018 established: a
  cell bug is only caught by the real pipeline, never by a hand-built balance).

  The four scenarios, and the cells they pin:
    - @SCN-CEL-001 — @unit + @fitness, both discharged → Fitness `F/1`, Unit `U/1`
      (named and met — the count).
    - @SCN-CEL-002 — @integration, NO cucumber observation → Integration `I/-` (named, missing),
      and Unit / E2e blank (a column absent for this scenario — neither named nor present).
    - @SCN-CEL-003 — @e2e ONLY, discharged by a passing cucumber observation → E2e `E/1`; a VITEST
      unit test nonetheless cites it, which the reconciler posts as a NO-EVIDENCE-OBLIGATION evidence-observation row
      (@SCN-LDG-008) and the census counts into `noEvidenceObligationCount`, OUT of `attributed` → its Unit
      cell must read `-/1`, NOT `U/-`. This is the SCN-CLI-054 shape — the bug this scenario fixes.
    - @SCN-CEL-004 — @unitpending: the unit obligation is DEFERRED, so it partitions to a one-sided
      Pending Item and posts NO reconciled row; the vitest observation citing it answers no
      obligation, so it posts as a no-evidence-obligation row → its Unit cell reads `-/1`, beside
      its pending item.

  No scenario here puts two checks on one row. A Quality Check is the check ITSELF as a
  scenario, so several checks of one kind are several SCENARIOS, told apart by `@SCN`, and one
  scenario is one fitness function BY CONSTRUCTION. A row naming two checks has no expression
  in the target model this fixture exercises, so the Fitness cell's left is the single `F`.

  This file lives under tests/fixtures/ (NOT features/), so this repository's own checks,
  which scan features/*.feature only, never see @CEL / @SCN-CEL-NNN. cucumber.js runs
  features/** only, so it is never executed as a scenario.

  Rule: the fixture target spans every cell case

    # STEPLESS, and `@fitness` with its configured row raises the fitness obligation rather than the
    # shape (@SCN-LNT-018); the behavioural tier rides alongside, making this a two-axis row
    # (@SCN-LNT-004).
    @unit @fitness @SCN-CEL-001
    Scenario: a named, met obligation at unit and fitness

    @integration @SCN-CEL-002
    Scenario: a named obligation with no evidence observation
      Given the target repo's source

    @e2e @SCN-CEL-003
    Scenario: an e2e-only scenario a unit test nonetheless cites
      Given the target repo's source

    @unitpending @SCN-CEL-004
    Scenario: a pending unit obligation a unit test nonetheless cites
      Given the target repo's source
