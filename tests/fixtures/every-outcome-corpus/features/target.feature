@TOC
Feature: every-outcome corpus — a fixture shaped so the REAL reconcile emits every outcome

  # Each scenario (plus the citing observations in vitest.json / cucumber.json and the guard
  # wiring in package.json / ci.yml) is chosen so the real `balance` pipeline emits one of the
  # Outcome members, and together they emit all of them. A unit test reconciles this directory and
  # asserts every Reconciliation line of the JSON report it emits against OUTCOME_SIDE_PROFILE. This fixture lives under tests/fixtures/, so this repository's own
  # checks, which scan features/*.feature only, never see it.

  @unit @SCN-TOC-001
  Scenario: satisfied — a passing unit obligation discharged by a passing unit observation
    Given a unit obligation
    When a passing unit observation cites it
    Then it reconciles satisfied

  @unit @SCN-TOC-002
  Scenario: failing — a unit obligation whose citing observation failed
    Given a unit obligation
    When a failing unit observation cites it
    Then it reconciles failing

  @integration @SCN-TOC-003
  Scenario: missing — an integration obligation no observation discharges
    Given an integration obligation
    When no observation cites it
    Then it reconciles missing

  # STEPLESS and configuring one row — SCN-TOC-004 — whose CI step carries that
  # row's code as its own `id:` AND `continue-on-error: true`. The step RUNS, but its red does not
  # gate the job, so the running-check observer reads it exists-and-unenforced: the watermelon by
  # the SEVERED-STEP route (@SCN-LNT-032).
  @fitness @SCN-TOC-004
  Scenario: watermelon — a fitness function whose step runs but whose red the job swallows

  @e2e @SCN-TOC-005
  Scenario: no-evidence-obligation — a real scenario cited at a quality-check it never named
    Given an e2e obligation discharged by an e2e observation
    When a unit observation also cites this scenario
    Then the unit evidence observation reconciles no-evidence-obligation

  @SCN-TOC-006
  Scenario: both-missing — a scenario with no obligation and no citation
    Given a scenario naming no obligation
    When nothing cites it
    Then it reconciles both-missing

  @unit
  Scenario: no-claim-code — an ordinary scenario carrying no @SCN tag
    Given a scenario carrying an evidence tag but no @SCN
    When it reconciles
    Then its obligation has no code for an observation to link to

  # duplicate-claim-code: two scenarios carrying one code are ONE account, and every
  # quality check on it reads duplicate-claim-code. Nothing cites it; the outcome needs no evidence observation.
  @unit @SCN-TOC-007
  Scenario: duplicate-claim-code — the first of two scenarios carrying one code
    Given a unit obligation
    When another scenario carries the same code
    Then the one account reads duplicate-claim-code

  @unit @SCN-TOC-007
  Scenario: duplicate-claim-code — the second of two scenarios carrying one code
    Given a unit obligation
    When another scenario carries the same code
    Then the one account reads duplicate-claim-code
