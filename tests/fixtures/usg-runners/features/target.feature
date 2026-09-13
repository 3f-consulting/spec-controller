@TGR
Feature: a fixture target naming the binary its unit suite runs under

  A FIXTURE target (NOT under features/) standing in for the shape the whole recognition
  rule exists for: a pipeline that runs its unit suite through a package.json script alias,
  so the runner's own name is nowhere in the workflow.

  ci.yml runs `pnpm test` and the manifest's `test` script runs `vitest`. The string vitest
  therefore appears in package.json and NOWHERE in ci.yml — which is the fixture's whole
  point and is asserted by the arm rather than left to a reader to notice. A rule matching
  the step's command alone recognises nothing here, which is what 113 real run: steps in
  five portfolio pipelines measured: every one of them invokes its runner through an alias.

  ONE TIER ONLY, deliberately. What a null runner and an absent key report is a different
  question with its own scenario, and naming three more tiers here would have this target
  answering it silently.

  Rule: a rule with no static-check tag

    @unit @SCN-TGR-001
    Scenario: the target source is exercised
      Given the target source
