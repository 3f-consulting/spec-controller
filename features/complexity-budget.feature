@CPX
Feature: Reconcile the complexity and module-size budgets over the real tree

  Mechanism over honour. entity-owns-its-behaviour, small-modules and DRY are honour
  rules until something reds — this is the static guard that reds. eslint's
  complexity / max-lines / max-lines-per-function over the REAL source, wired as a
  BLOCKING per-push CI step beside the existing lint family (3F-2177).

  TWO SCOPES, because one set of numbers would be dishonest. Production and test code
  have genuinely different distributions in BOTH directions: test files run 2.4x longer
  at the file level (2419 vs 1024 lines) yet are 3.5x SIMPLER at the function level
  (complexity 7 vs 25). A single shared budget would take the max of each pair, making
  max-lines vacuous for production while leaving complexity slack for tests.

  SEEDED AT TODAY'S MEASURED MAX, not the 90th percentile. The two are not
  interchangeable: a p90 seed reds the top decile BY CONSTRUCTION (measured: 33
  functions, 4 files), so it cannot also "not redden the existing tree". eslint reds on
  `value > max`, so seeding AT the max is the strictest seed that leaves the tree green
  — zero headroom, so any growth past today's worst reds immediately. The p90 survives
  as the recorded RATCHET TARGET in the budget module: a stated destination, not a
  silent ceiling.

  WHY THE GUARD IS NAMED `lint:complexity`. `runningStaticGuards` observes a script only
  when its name carries a guard prefix (`lint:` / `guard:`). A name outside that set
  would run in CI while being structurally invisible to the ledger — a real quality
  check kept off the books, which is exactly where a watermelon hides. Named so it IS
  observed; the `@lint=lint:complexity` tag below is then what keeps it out of the
  suspense row as an uncited static guard. Observed AND declared is the balanced state.

  Rule: a module or function over its complexity or size budget reds the build

    @unit @integration @lint=lint:complexity @SCN-CPX-001
    Scenario: a function or module over its complexity or size budget reds the build
      Given each scope declares a complexity, module-size and function-size budget
      When the complexity guard scans the real tree
      Then no production or test module exceeds its scope's budget
      And a function pushed past its scope's complexity budget is reported against that rule
      And a module pushed past its scope's size budget is reported against that rule
