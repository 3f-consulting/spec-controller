@EPG
Feature: The reconciliation engine is pure and self-contained

  The engine-purity guard turns "the reconciliation engine is pure and
  self-contained" from a folder convention into a proof — the same discipline the barrel
  guard (SCN-API-001) applies to the exported surface one level up.

  The pure core lives under packages/core/src; the impure app layers
  (ingest/, cli-balance/, run-management/) and the product quality checks (tests/checks/)
  live outside it. Two properties make the core worth carving: it stays testable with data
  alone (no IO), and analyse/migrate (and any external consumer) can embed it without
  dragging IO along (no imports from the app layers). Both hold by folder convention only
  until an executable guard reds on the drift.

  The guard is a pure checker (checkEnginePurity — given the engine's source files as data,
  it returns the violations) driven over the real tree by a unit test. It lives in
  tests/checks/ (product-not-app) precisely because it reads the tree via fs — it cannot
  live inside the pure engine it checks. Unit-only: Vitest is the observed evidence, and
  Cucumber skips it.

  THE APP PACKAGE AND THE CHECK TREE ARE TWO TERMS NOW, AND THEY HAVE TO BE (3F-3188). The rule is
  enforced by matching an import specifier, and until 3F-3187 one match covered everything outside
  the core: every app layer AND every check module lived under the spec-controller package, so
  refusing that one package name refused them all. Moving check code to tests/checks/ took it out
  of that name. The step above reads like a list of directories and never was one — so the list
  said static-checks/ while the rule said spec-controller, and packages/core/src could have
  imported a relocated check module with this scenario staying green. Measured, not assumed: a
  planted import from packages/core/src to tests/checks/ passed this scenario before the rule was
  widened and reds it after. Each home is spelled in exactly one place, because two spellings agree
  until one of them is edited — which is the edit that just happened.

  Rule: the reconciliation engine imports nothing impure and references no IO

    @unit @SCN-EPG-001
    Scenario: the reconciliation engine imports nothing impure and references no IO
      Given every production file under packages/core/src (excluding *.test.ts)
      When the engine-purity guard scans each file
      Then no file imports from the spec-controller app package (ingest/, cli-balance/, run-management/) or from the check tree at tests/checks/
      And no file imports node:fs / node:child_process / node:process, nor references the process global
