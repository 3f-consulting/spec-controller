@CVT
Feature: a converted target's fitness corpus, two checks run by the pipeline whose record lies beside it

  A FIXTURE feature standing in for ANOTHER repository, read cross-repo by spec-controller via
  --features. Both of its scenarios carry the bare fitness axis tag and their own @SCN, and that
  repository's CI states each @SCN as the `id:` of the step that runs its check. Its run's record
  says both checks' steps succeeded, so each scenario is answered by its own step's outcome and the
  run balances.

  WHAT THIS DIRECTORY IS FOR IS THE STREAMS IT HANDS OVER, NOT THE VERDICT. The report's
  provenance scenarios, @SCN-RPT-027 and @SCN-RPT-028, run the REAL binary over it as a corpus
  self-consistent with the one optional stream they name — the ci-steps.json record beside this
  corpus — so the run exits clean and their assertions are about the provenance block alone.

  This file lives under tests/fixtures/ (NOT features/), so this repository's own checks,
  which scan features/*.feature only, never see the CVT code.

  Rule: the tree stays inside its thresholds

    @fitness @SCN-CVT-001
    Scenario: the codebase stays under its complexity threshold

    @fitness @SCN-CVT-003
    Scenario: the domain's mutation check holds
