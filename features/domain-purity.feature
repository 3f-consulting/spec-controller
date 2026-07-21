@DPG
Feature: A domain module imports nothing outside the domain layer

  The domain-purity guard turns "the reconciliation domain is pure and self-contained" from a
  folder convention into a proof — the INNER analogue of the engine-purity guard (SCN-EPG-001,
  the package edge) one level down. Engine-purity keeps the whole core free of the app and IO;
  this keeps the domain (packages/core/src/domain) free of the core's own ADAPTERS: a domain
  module reconciles, it does not parse, render, assemble, or census, and it never reaches the app.

  The reconciliation concepts live under packages/core/src/domain, each module co-locating its
  type with its pure free functions (the DDD retrofit, 3F-1994). They import only the domain layer
  and pure standard types; the moment one reaches into parse/, render/, assemble/, or census/ — or
  the spec-controller app package — behaviour has begun draining out of the concept, which is
  CC's failure mode. A convention would be reasoned past; a guard reds the build.

  The guard is a pure checker (checkDomainPurity — given the domain's source files as data, it
  returns the violations) driven over the real tree by a unit test. It lives in static-guards/
  (product-not-app) precisely because it reads the tree via fs — it cannot live inside the pure
  domain it checks. Unit-only, mirroring engine-purity EXACTLY: Vitest is the observed evidence,
  Cucumber skips it, and CI enforces it via pnpm test — no @lint corpus tag, no npm script, no
  added CI step.

  Rule: a domain module imports only the domain layer and pure standard types

    @unit @SCN-DPG-001
    Scenario: a domain module reaching outside the domain layer reds the build
      Given every production file under packages/core/src/domain (excluding *.test.ts)
      When the domain-purity guard scans each file
      Then no file imports from parse/, render/, assemble/, or census/
      And no file imports the spec-controller app package
      And the guard passes clean over the real packages/core/src/domain tree
