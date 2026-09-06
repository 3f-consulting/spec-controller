@FIT
Feature: The fitness checks this repository configures, one scenario per row

  GENERATED FILE — DO NOT EDIT. Every scenario below is emitted from a row of
  `specController.fitnessChecks` in package.json. Edit the row, then regenerate with
  `pnpm fitness:corpus`; an edit made here is reverted the next time anybody does.

  WHY THE SCENARIOS EXIST AT ALL, given the rows already carry everything. A check reports its
  findings and says nothing when it finds none, so its silence cannot be told from its absence.
  Cucumber reports every scenario it ran, pass or fail — that enumeration is what the fitness axis
  was missing, and these scenarios are how a configured check acquires it. Reading the rows alone
  would put the axis back to single-entry.

  THE CODE IS STORED, NEVER POSITIONAL. Each scenario's `@SCN` is read off its row, so inserting a
  row renumbers nothing and every citation elsewhere in the tree stays true. The numbering below is
  not contiguous for that reason, and that is the rule working rather than a gap.

  A ROW MAY ALSO CARRY A CODE MINTED UNDER ANOTHER FEATURE, and that is the same rule. A code, once
  allocated, is stable forever: it survives a feature-file rename and is never reused. A check whose
  code is cited by something outside this repository's corpus — a nightly producer's sweep record,
  say — therefore keeps that code while its scenario moves here, and is re-minted only by the change
  that can move every citing surface with it.

  THE TAG NAMES THE AXIS AND THE ROW NAMES THE SUBJECT. Every scenario here carries `@fitness` and
  no characteristic tag: which characteristic a check asserts, and which bar it is held to, are read
  from its row by the ledger. One sentence for a static check and one for a measured one, so the
  step-definition count is two however many rows arrive.

  THE FITNESS PASS RUNS LAST, AND THAT IS LOAD-BEARING RATHER THAN CONVENTIONAL. Reader-shaped rows
  read what an earlier step produced — a mutation sweep's record, the behavioural suite's timing —
  so a pipeline that runs this pass first meets absent artefacts and a wall of unsettled rows while
  doing exactly what it was told.

  THIS FILE IS ITS OWN GUARD. One row below runs the generator and diffs the result, so a corpus
  that has drifted from the rows it came from reds the pass it is part of.

  @fitness @SCN-FIT-001
  Scenario: complexity — `eslint`
    Then the check this scenario names finds no violations

  @fitness @SCN-FIT-003
  Scenario: complexity — `pnpm lint:complexity-exceptions`
    Then the check this scenario names finds no violations

  @fitness @SCN-FIT-004
  Scenario: vocab — `pnpm lint:blocked-vocabulary`
    Then the check this scenario names finds no violations

  @fitness @SCN-FIT-005
  Scenario: vocab — `pnpm lint:adopted-vocabulary`
    Then the check this scenario names finds no violations

  @fitness @SCN-FIT-006
  Scenario: vocab — `pnpm lint:exempt-data-floor`
    Then the check this scenario names finds no violations

  @fitness @SCN-FIT-007
  Scenario: traceability — `pnpm lint:feature-codes`
    Then the check this scenario names finds no violations

  @fitness @SCN-FIT-008
  Scenario: traceability — `pnpm lint:scn-tags`
    Then the check this scenario names finds no violations

  @fitness @SCN-FIT-009
  Scenario: tech-conformance — `pnpm lint:anemic-domain`
    Then the check this scenario names finds no violations

  @fitness @SCN-FIT-010
  Scenario: traceability — `pnpm lint:scn-subissues`
    Then the check this scenario names finds no violations

  @fitness @SCN-FIT-011
  Scenario: typecheck — `pnpm typecheck`
    Then the check this scenario names finds no violations

  @fitness @SCN-FIT-012
  Scenario: ci-run-time — `pnpm --silent timing:score --scn SCN-FIT-012`
    Then the check this scenario names reports its measurement

  @fitness @SCN-FIT-013
  Scenario: ci-run-time — `pnpm --silent timing:score --scn SCN-FIT-013`
    Then the check this scenario names reports its measurement

  @fitness @SCN-FIT-002
  Scenario: mutation — `pnpm --silent mutation:score --supersedes SCN-MUT-011`
    Then the check this scenario names reports its measurement

  @fitness @SCN-FIT-014
  Scenario: traceability — `pnpm --silent fitness:corpus && git diff --exit-code -- features/fitness-checks.feature`
    Then the check this scenario names finds no violations

  @fitness @SCN-FIT-015
  Scenario: doc-accuracy — `pnpm --silent doc:compatibility-examples`
    Then the check this scenario names finds no violations

  @fitness @SCN-FIT-016
  Scenario: doc-accuracy — `pnpm doc:paths`
    Then the check this scenario names finds no violations
