@PND
Feature: A planted named-side fixture for the undefined-not-pending anti-leniency case (@SCN-PND-014)

  A single scenario carrying an @integration obligation and NO `<qc>pending` deferral,
  cited by an UNREGISTERED SCN code (SCN-PDA-001 — the distinct fixture convention, never a real
  scanned scenario per evidence-manifesto §11B). The OBSERVED side — a cucumber JSON report whose
  one step is `undefined` — is built in the step and fed to the REAL cucumber reader (§11A): the
  reader drops the inconclusive scenario, so the named obligation finds no observation and
  reconciles MISSING by absence. Because no `<qc>pending` was named, the scenario raises no
  Pending Item — its verdict is out-of-balance, not silently excused as pending.

  Rule: a fixture rule

    @integration @SCN-PDA-001
    Scenario: a named integration obligation, no pending deferral
      Given a fixture step
