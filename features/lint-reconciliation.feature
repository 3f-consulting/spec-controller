@LNT
Feature: Reconcile @lint static-check evidence against CI wiring over the real source

  The second evidence axis. Alongside the runtime KIND (the unit
  / integration tests, keyed by level), a scenario can declare a STATIC-check
  evidence obligation via an explicit lint:<guard> tag handle — a lint/guard over the
  source artifact, keyed by its guard, carrying no level.

  A lint evidence obligation reconciles as evidence only when the guard actually holds
  over the REAL source: its command must be a `run:` step in the CI config
  (`.github/workflows/ci.yml`) over the real tree — not green merely over
  fixtures. The new outcome watermelon (the
  watermelon) is what a guard that exists but is not wired into CI reconciles to;
  it slots into the verdict model like any other non-balanced reconciling
  item.

  This first scenario (seam-bearing) carries the static-kind foundation —
  the (kind, level)/(kind, guard) discriminated union, the ingest/guard reader,
  the LNT registration — and proves the SATISFIED path: spec-controller's OWN
  lint:feature-codes guard, genuinely wired as a CI run step over its real tree,
  reconciles balanced. The watermelon (LNT-002), absent-guard (LNT-003) and
  multi-kind-axis (LNT-004) paths grow this feature in later sub-issues.

  WHY LNT-001 CARRIES AN @lint= TAG AND LNT-002/003/004 DO NOT. An @lint=<guard> tag
  declares an evidence obligation THIS repository owes: a real guard that must be found
  wired over the real source, or the scenario reds. LNT-001 owes one — lint:feature-codes
  genuinely runs here. The other three name FIXTURE data: lint:planted-watermelon,
  lint:absent-guard and lint:unwired-guard must never exist as real scripts, because these
  scenarios exist to prove spec-controller DETECTS an absent or unwired guard. Tagging
  them declared an obligation this repo could never discharge, so all three reconciled
  out-of-balance — permanently, and correctly, given what the tag said. Nothing ever read
  the handle from the tag: it is defined as a constant in lintReconciliation.test.ts and
  fed through planted package.json / ci.yml fixtures, so the tag was decorative and
  actively misleading. Dropping it follows @SCN-LDG-028, which tests the identical shape
  through the fixture handle lint:ldg028-absent-guard, carries no @lint= tag, and
  reconciles balanced. Their @unit and @integration obligations are untouched and still
  reconcile — the distinction from a deferral tag, which would have taken every obligation
  these scenarios declare dark to silence one row each (3F-2351).

  Rule: a @lint scenario whose guard is wired into CI over the real source is balanced

    @unit @integration @lint=lint:feature-codes @SCN-LNT-001
    Scenario: a @lint scenario whose guard is a CI run step over the real tree is reported as balanced
      Given a declared @lint scenario "SCN-LNT-001" requiring the static check "lint:feature-codes"
      And spec-controller's real CI config and package.json wire "lint:feature-codes" as a run step over the real tree
      When the lint reconciler runs
      Then the ledger reports the lint scenario "SCN-LNT-001" as balanced with no reconciling items

  Rule: a @lint scenario whose guard is fixture-green but not wired into CI is the watermelon

    The slice's headline. A guard can EXIST (a package.json script) and be
    fixture-green while its command is absent from the CI config — so it guards
    nothing over the real source. spec-controller flags that as
    watermelon (the watermelon), out-of-balance —
    the classic 609-violations-while-green failure class made detectable. The
    watermelon is exercised over a PLANTED fixture (a fixture ci.yml + a fixture
    guard fed through the ingest/guard seam); spec-controller cannot keep a permanent
    real watermelon in-repo, and the planted guard is never a real in-repo script.

    @unit @integration @SCN-LNT-002
    Scenario: a @lint scenario whose guard exists but is absent from CI is reported as the watermelon
      Given a declared @lint scenario "SCN-LNT-002" requiring the static check "lint:planted-watermelon"
      And a planted package.json defines the guard "lint:planted-watermelon" but the planted CI config does not run it
      When the lint reconciler runs
      Then the ledger reports the lint scenario "SCN-LNT-002" as out-of-balance with a watermelon reconciling item for the guard "lint:planted-watermelon"

  Rule: a @lint scenario whose named guard does not exist is missing

    Outcome parity with the runtime kind's missing path. A @lint scenario
    can name a guard that does not exist at all — no package.json script, no CLI,
    no CI run step. That is a required ledger entry that was never recorded:
    spec-controller flags it as missing, out-of-balance — GENUINELY
    DIFFERENT from the watermelon (a guard that EXISTS but is unenforced). Absence
    and the watermelon are two distinct problems the verdict model refuses to rank
    away; excluding this would leave the static kind's missing path unproven.
    Exercised over a PLANTED fixture where the named guard is absent from BOTH the
    fixture package.json and the fixture CI config, so ingest/guard reports
    exists:false.

    @unit @integration @SCN-LNT-003
    Scenario: a @lint scenario whose named guard does not exist is reported as missing
      Given a declared @lint scenario "SCN-LNT-003" requiring the static check "lint:absent-guard"
      And a planted package.json and CI config that name no such guard "lint:absent-guard"
      When the lint reconciler runs
      Then the ledger reports the lint scenario "SCN-LNT-003" as out-of-balance with a missing reconciling item for the guard "lint:absent-guard"

  Rule: a scenario requiring both a @unit test and a @lint guard reconciles each kind independently

    The kind-axis analogue of LDG-004 — the proof that `kind` is a real
    SECOND AXIS orthogonal to level, not just an asserted one. A scenario
    can carry BOTH a runtime evidence obligation (@unit) AND a static evidence obligation
    (@lint=<guard>); the reconciler reconciles each KIND independently, keyed by
    (kind, [level]). With the unit result green but the guard NOT wired into CI, the
    runtime evidence obligation balances (omitted from the reconciling items) while the
    static evidence obligation is the watermelon — so the scenario is out-of-balance carrying
    ONLY the static item. The two kinds are reconciled on their own axes, never
    collapsed to a single per-scenario verdict. Exercised over a PLANTED fixture: a
    fixture feature declaring both evidence obligations (read through the real declared
    reader, which emits TWO evidence obligations from one tag block), a green unit
    evidence observation, and a planted guard the planted CI does not run.

    @unit @integration @SCN-LNT-004
    Scenario: a scenario requiring both a unit test and an unwired guard reports each kind independently
      Given a scenario "SCN-LNT-004" requiring both a @unit runtime test and the static check "lint:unwired-guard"
      And the unit result for "SCN-LNT-004" is green but the planted CI does not run the guard "lint:unwired-guard"
      When the lint reconciler runs
      Then the ledger reports the lint scenario "SCN-LNT-004" as out-of-balance, the runtime evidence obligation balanced and omitted, and the static check "lint:unwired-guard" carried as a watermelon reconciling item

  Rule: a guard's existence is read from an externally-specified package.json, not spec-controller's own

    The cross-repo guard read (@SCN-LNT-005) — the seam that makes
    reconciling ANOTHER repo's guards first-class. A new --package-json
    <path> CLI flag (mirroring --ci) points the static check reader at the TARGET
    repo's package.json, so a guard's `exists` is read there, not from spec-controller's
    own cwd. This is what renders the historical watermelon correctly: a guard that
    exists:true in the target repo's package.json but is unwired in its CI reconciles
    as watermelon (🍉), NOT missing.
    Exercised over a PLANTED EXTERNAL fixture (tests/fixtures/scn-lnt-005/): an
    external feature declaring @lint=lint:vocab-check, an external package.json where
    the guard EXISTS, and an external ci.yml that does NOT run it. The guard
    (lint:vocab-check) is absent from spec-controller's OWN package.json, so reading it as
    the watermelon proves the existence was read from the external package.json.

    @unit @integration @SCN-LNT-005
    Scenario: a guard read from an external package.json but absent from the external CI is the watermelon
      Given an externally-specified package.json declaring the guard "lint:vocab-check" and an external CI config that does not run it
      When the reconciler runs against the external repo via --package-json and --ci
      Then the ledger reports the external scenario "SCN-EXT-001" as out-of-balance with a watermelon reconciling item for the guard "lint:vocab-check"
