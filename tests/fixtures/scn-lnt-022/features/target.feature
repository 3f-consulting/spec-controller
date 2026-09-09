@CVT
Feature: a converted target's fitness corpus, one static check and one measured, both run by the pipeline recorded beside it

  A FIXTURE feature standing in for ANOTHER repository, read cross-repo by spec-controller via
  --features. Both of its scenarios carry the bare fitness axis tag and their own @SCN, and a row
  of that repository's specController.fitnessChecks names each of them. The two rows differ in
  exactly one thing: the second names a bar, which is the whole of what makes it measured.

  BOTH CHECKS RAN AS STEPS OF THAT PIPELINE, and its run's record says so about both. What the
  record cannot say is the second one's NUMBER, which is why only one of these two rows is credited
  from it.

  NEITHER CHECK IS ONE OF THAT REPOSITORY'S SCRIPTS, which is what leaves the run's record and the
  measurement artefact as the only things observing these rows. A script handle behind a guard
  prefix would be DISCOVERED from the workflow file, and the derivation's own credit would be the
  one the ledger matched — so the reading under test would be untested while its arm stayed green.

  ITS fitness.json IS GONE, WITH THE FLAG THAT READ IT (3F-3272). @SCN-RPT-027 and its siblings run
  the REAL binary over this directory as a corpus self-consistent with both its optional streams,
  and they now hand the ci-steps.json beside this file as the second one. What crosses is the run's
  own record of its steps, which is the same two rows read the same two ways.

  This file lives under tests/fixtures/ (NOT features/), so neither the feature-code registry
  check nor the scenario-to-sub-issue gate sees the CVT code — they scan features/*.feature only.

  Rule: the tree stays inside its thresholds

    @fitness @SCN-CVT-001
    Scenario: the codebase stays under its complexity threshold

    @fitness @SCN-CVT-003
    Scenario: the domain's mutation score stays above its floor
