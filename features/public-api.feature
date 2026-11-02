@API
Feature: The public core exposes its reconciliation for reading, not for construction

  The `@3f-consulting/spec-controller-core` package publishes exactly one
  entrypoint, and what that entrypoint exports is the contract a downstream
  consumer builds on. NOTHING IN THIS REPOSITORY HOLDS THAT BARREL TO A
  WRITTEN-DOWN LIST. The community's instrument for the
  job is a generated `api-extractor` report, and it is adopted at the 1.0
  boundary, where a stability promise exists again. Before 1.0 a symbol quietly
  added to the barrel, or quietly dropped from it, reds nothing — which is what
  `0.x` already says out loud in [`docs/compatibility.md`](../docs/compatibility.md).

  What is held here is narrower, and is not about the surface's SHAPE.
  One symbol the barrel exports is exported for READING and cannot be
  CONSTRUCTED from outside it, and the evidence is the type-checker refusing the
  assignment rather than a list anyone maintains.

  Rule: the v1 barrel exposes QualityCheckReconciliation for reading, not construction

    @unit @SCN-API-002
    Scenario: an external consumer cannot construct a QualityCheckReconciliation
