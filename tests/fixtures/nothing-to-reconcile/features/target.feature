@NTR
Feature: a fixture target that carried no scenario and produced nothing

  A FIXTURE feature (NOT under features/) standing in for the modal `new-client`: a
  brownfield repository on the day it installs spec-controller. It has a corpus
  directory and it is EMPTY OF SCENARIOS — the corpus carries no scenario, so no
  evidence obligation is raised — and the target supplies no evidence report, so no
  evidence observation is posted either. A GUARDLESS package.json and no --ci keep the
  unnamed claim's row empty: no fitness function is running, so nothing is uncited.

  The ledger that reconcile() emits over this target therefore carries ZERO Claim
  Reconciliation rows, which is the one shape `isBalanced` cannot speak about:
  `.every()` over `[]` is VACUOUSLY TRUE, so before @SCN-CLI-019 this target was told
  "BALANCED — every Claim Reconciliation balances … (exit 0)".

  The file deliberately carries NO scenario. That absence IS the fixture — adding one
  here would give the run a row and destroy the shape under test.

  This file lives under tests/fixtures/ (NOT features/), so neither the feature-code
  registry lint nor the scenario-to-sub-issue gate sees @NTR — they scan
  features/*.feature only.
