@NTR
Feature: a fixture target that declared nothing and produced nothing

  A FIXTURE feature (NOT under features/) standing in for the modal `new-client`: a
  brownfield repository on the day it installs spec-controller. It has a corpus
  directory and it is EMPTY OF SCENARIOS — no scenario is declared here, so no
  evidence obligation is raised — and the target supplies no evidence report, so no
  evidence observation is posted either. A GUARDLESS package.json and no --ci keep the
  suspense row empty: no static check is running, so nothing is uncited.

  The ledger that reconcile() emits over this target therefore carries ZERO Scenario
  Reconciliation rows, which is the one shape `isBalanced` cannot speak about:
  `.every()` over `[]` is VACUOUSLY TRUE, so before @SCN-CLI-019 this target was told
  "BALANCED — every Scenario Reconciliation balances … (exit 0)".

  The file deliberately declares NO scenario. That absence IS the fixture — adding one
  here would give the run a row and destroy the shape under test.

  This file lives under tests/fixtures/ (NOT features/), so neither the feature-code
  registry lint nor the scenario-to-sub-issue gate sees @NTR — they scan
  features/*.feature only.
