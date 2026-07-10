@PDF
Feature: A planted declared-side fixture for the deferral-overrides-observation case (@SCN-PND-019)

  Two declared scenarios, each carrying a RECOGNISED community deferral tag over a single
  `@integration` obligation, cited by UNREGISTERED SCN codes (SCN-PDF-001/002 — the distinct
  fixture convention, never a real @skip / @wip in the scanned features/ corpus per
  evidence-manifesto §11B). The declared side defers the integration obligation at parse
  (scenario-scope, @SCN-PND-016), so it partitions to a Pending Item BEFORE any observation
  match — the declaration overriding whatever the observation side would otherwise derive.

  The two scenarios stand for the two OBSERVATION SIDES the behaviour spans:
    - SCN-PDF-001 (@skip) — FILTERED OUT of the cucumber run: it contributes NO observation at
      all (its @SCN never appears in the report). Without the deferral its declared @integration
      obligation would reconcile MISSING by absence; the @skip deferral makes it a Pending Item.
    - SCN-PDF-002 (@wip) — REPORTS A PENDING STATUS: it runs and yields a cucumber `pending`-status
      step, which the reader (slice-3) DROPS as inconclusive → again missing by absence. The @wip
      deferral makes it a Pending Item too.

  Either way the declaration governs — a Pending Item, never a missing reconciling item.

  This file lives under tests/fixtures/ (NOT features/), so neither the feature-code registry
  lint nor the scenario↔sub-issue gate sees @PDF / @SCN-PDF-NNN — they scan features/*.feature
  only. cucumber.js runs features/** only, so it is never executed as a scenario; it is read as a
  string via readFileSync and fed to the pure parser. The OBSERVED side (the filtered-out absence
  and the pending-status cucumber report) is supplied in the step.

  Rule: a fixture rule — a deferred integration obligation, one per observation side

    @skip @integration @SCN-PDF-001
    Scenario: a filtered-out @skip scenario declaring an integration obligation
      Given a fixture step

    @wip @integration @SCN-PDF-002
    Scenario: a pending-status @wip scenario declaring an integration obligation
      Given a fixture step
