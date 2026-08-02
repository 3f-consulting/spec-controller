@CPX
Feature: Reconcile the complexity and module-size thresholds over the real tree

  Mechanism over honour. entity-owns-its-behaviour, small-modules and DRY are honour
  rules until something reds — this is the static check that reds. eslint's
  complexity / max-lines / max-lines-per-function over the REAL source, wired as a
  BLOCKING per-push CI step beside the existing lint family (3F-2177).

  THE THRESHOLD COMES FROM OUTSIDE THE TREE (3F-2286, superseding 3F-2177's seeding
  rule). complexity 10 is NIST / McCabe's stated refactor line; max-lines-per-function
  40 is Google's; max-lines 400 is a reasoned chosen ceiling, named as a choice because
  no industry body publishes a hard file-length cap. 3F-2177 seeded each threshold at
  this tree's OWN measured maximum instead — complexity 25, function 261 lines, file
  1024 — which is "measure the current state, call it good". Those maxima sit well
  inside the industry high-risk band, so a threshold seeded there certifies whatever
  the code already does. A fitness function's line must be stated independently of the
  code it judges, or it is not a fitness function.

  TWO SCOPES, ONE STANDARD. Production and test code are held to the SAME numbers —
  complexity 10, max-lines 400 — because an external standard does not bend to the
  population it is applied to. Identical numbers over two populations that differ by
  2.4x at the file level and 3.5x at the function level is itself the evidence that
  nothing here was measured off this tree. The single asymmetry is that
  max-lines-per-function is OFF for test files: that rule measures production-function
  tractability, and a describe/it callback is a CONTAINER, not a function in the sense
  the rule addresses. No substitute number is invented for it, because none exists
  outside this tree — and inventing one from the tree's own maximum (the retired 221)
  is the exact self-certification this feature just removed. Not a carve-out: test
  scope stays held to the two metrics that genuinely apply.

  TODAY'S EXCEEDANCES ARE DATED DEBT, NOT A RAISED CEILING. Every file already over the
  standard is enumerated per rule in complexityExceptions.mjs, carrying the value
  measured on the day it was recorded. The list reads as a refactor backlog rather than
  as headroom, and it can only shrink.

  WHY THE CHECK IS NAMED `lint:complexity`. `runningStaticChecks` observes a script only
  when its name carries an observed prefix (`lint:` / `guard:`). A name outside that set
  would run in CI while being structurally invisible to the ledger — a real quality
  check kept off the books, which is exactly where a watermelon hides. Named so it IS
  observed; the `@lint=lint:complexity` tag below is then what keeps it out of the
  suspense row as an uncited static check. Observed AND declared is the balanced state.

  Rule: code outside the exception list reds when it exceeds the external standard

    @unit @integration @lint=lint:complexity @SCN-CPX-001
    Scenario: a function or module over the external standard reds the build
      Given the thresholds are the external standard, not a measurement of this tree
      When the complexity fitness function scans the real tree
      Then a function over complexity 10 outside the exception list reds
      And a function over 40 lines outside the exception list reds
      And a module over 400 lines outside the exception list reds
