@EPG
Feature: The reconciliation engine is pure and self-contained

  The engine-purity guard turns "the reconciliation engine is pure and
  self-contained" from a folder convention into a proof — the same discipline the barrel
  guard (SCN-API-001) applies to the exported surface one level up.

  The pure core lives under src/reconciliation-engine/; the impure app layers
  (ingest/, cli-balance/, run-management/) and the product quality checks (static-guards/)
  live outside it. Two properties make the core worth carving: it stays testable with data
  alone (no IO), and analyse/migrate (and any external consumer) can embed it without
  dragging IO along (no imports from the app layers). Both hold by folder convention only
  until an executable guard reds on the drift.

  The guard is a pure checker (checkEnginePurity — given the engine's source files as data,
  it returns the violations) driven over the real tree by a unit test. It lives in
  static-guards/ (product-not-app) precisely because it reads the tree via fs — it cannot
  live inside the pure engine it checks. Unit-only: Vitest is the observed evidence, and
  Cucumber skips it.

  Rule: the reconciliation engine imports nothing impure and references no IO

    @unit @SCN-EPG-001
    Scenario: the reconciliation engine imports nothing impure and references no IO
      Given every production file under src/reconciliation-engine/ (excluding *.test.ts)
      When the engine-purity guard scans each file
      Then no file imports from ingest/, cli-balance/, run-management/, or static-guards/
      And no file imports node:fs / node:child_process / node:process, nor references the process global
