@API
Feature: The public core exposes its reconciliation for reading, not for construction

  The `@3f-consulting/spec-controller-core` package publishes exactly one
  entrypoint, and what that entrypoint exports is the contract a downstream
  consumer builds on. NOTHING IN THIS REPOSITORY HOLDS THAT BARREL TO A
  WRITTEN-DOWN LIST ANY MORE. The list, and the arm that reconciled the barrel
  against it in both directions, left with the rest of the packaging
  checks this repository wrote for itself; the community's instrument for the
  job is a generated `api-extractor` report, and it is adopted at the 1.0
  boundary, where a stability promise exists again. Until then a symbol quietly
  added to the barrel, or quietly dropped from it, reds nothing — which is what
  `0.x` already says out loud in `doc/compatibility.md`.

  What is still held here is narrower, and was never about the surface's SHAPE.
  One symbol the barrel exports is exported for READING and cannot be
  CONSTRUCTED from outside it, and the evidence is the type-checker refusing the
  assignment rather than a list anyone maintains.

  Rule: the v1 barrel exposes QualityCheckReconciliation for reading, not construction

    @unit @SCN-API-002
    Scenario: an external consumer cannot construct a QualityCheckReconciliation
      Given the frozen v1 barrel exports the QualityCheckReconciliation type but not its constructor
      When external code assembles a QCR-shaped object literal and assigns it to QualityCheckReconciliation
      Then it is a type error — the nominal brand makes the engine the only mint
      And the barrel still exposes the type for reading the reconciliation the engine produced
