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

  Rule: an exempt file reds when it worsens past its recorded value

    An exception excuses the debt a file already carries and buys not one line of
    headroom. @SCN-CPX-001 recorded each exceedance's measured value but switched the
    rule OFF for that file, so an exempt file could grow without limit; here each entry
    becomes a FROZEN CEILING at exactly the recorded number. Both halves of the rule are
    load-bearing: the file AT its recorded value must stay green — if the generated
    ceilings were wrong the whole tree would red, and that is what the green half
    catches — and one line past it must red naming that file and that rule.

    THE GUARANTEE, STATED AT ITS ACTUAL STRENGTH. eslint applies max-lines-per-function
    per FILE, not per function, so a per-function ceiling is not expressible and each
    entry carries that file's WORST offender for the rule. The guarantee is therefore
    precisely: an exempt file reds when its WORST offender for that rule grows past the
    recorded value — NOT that any function in it reds when it grows. A file frozen at 72
    is frozen at 72 for every function in it, so a 41-line function there can reach 72
    unnoticed. Said plainly because a gate must not certify more than it checks, which is
    the whole point of 3F-2286. Closing that gap needs a different mechanism (a custom
    rule, or the reconciliation reading per-function values) and is a separate behaviour
    with its own @SCN — deliberately not folded in here.

    An exempt file UNDER its recorded value stays green at this stage. Banking that
    improvement is @SCN-CPX-003's behaviour, and implementing it here would leave that
    scenario with no genuine red to drive it.

    @unit @integration @lint=lint:complexity @SCN-CPX-002
    Scenario: an exempt file that grows past its recorded value reds the build
      Given a file on the exception list at its recorded value
      When the complexity fitness function scans the real tree
      Then the file at its recorded value does not red
      And the same file one line past its recorded value reds against that rule

  Rule: the exception list must state the measured truth, so it can only tighten

    THE RATCHET. @SCN-CPX-002 froze each exempt file at its recorded value, which stops
    the debt growing. It does not stop the LIST going stale: a file improves, nobody
    edits the entry, and the recorded number silently becomes headroom again. This Rule
    makes the list a claim that must stay true — reconciled against the real tree, in
    BOTH directions.

    THREE REDS, THREE DIFFERENT SENTENCES. Measured ABOVE recorded is a regression, which
    the @SCN-CPX-002 frozen ceiling also reds — both firing is correct, and each names
    its own cause. Measured BELOW recorded is an improvement nobody banked, and it is the
    half that makes this a ratchet rather than a ceiling that quietly stops descending.
    No longer over the standard at all is a stale entry, and deleting it shrinks the list.
    Each red names the file, the rule, the recorded value and the measured value, so its
    stated cause IS its actual cause.

    WHY THIS IS A SECOND NAMED CHECK, NOT MORE eslint. eslint can only red on
    `value > max`; the load-bearing case here is `value < recorded`, which it cannot
    express at all. So the reconciliation is its own CI script, `lint:complexity-exceptions`.
    The `lint:` prefix is required rather than cosmetic: `runningStaticChecks` observes a
    CI script only when its name carries an observed prefix, so a name outside that set
    would run in CI while being invisible to spec-controller's own ledger — a real quality
    check kept off the books, which is exactly where a watermelon hides. The
    `@lint=lint:complexity-exceptions` tag below is then what keeps it out of the suspense
    row as an uncited static check. Observed AND declared is the balanced state.

    MEASURED WITH eslint, NEVER REIMPLEMENTED. The reconciliation runs the `ESLint` API at
    the BARE standard — the same scope blocks the config uses, with the exception blocks
    left off — and reads the actual values out of its messages. A second line/complexity
    counter would agree with eslint by coincidence and drift the moment either changed.
    The parse is PER RULE, because the three do not report uniformly: the two line rules
    emit "too many lines (575)" while `complexity` emits "has a complexity of 21" with no
    parenthesised number at all. A single parenthesis regex silently yields null for every
    complexity entry — a third of the list reconciled against nothing, and passing — so
    extraction is asserted non-null for every message.

    ONE ENTRY PER FILE PER RULE, at that file's WORST offender, because that is the shape
    that @SCN-CPX-002 froze. The reconciliation compares like with like: the worst measured
    value for a file and rule against the value recorded for that same file and rule.

    @unit @integration @lint=lint:complexity-exceptions @SCN-CPX-003
    Scenario: an exception list that disagrees with the measured tree reds the build
      Given an exception list recording each exempt file's measured value
      When the exception list is reconciled against the real tree
      Then a file measuring above its recorded value reds as a regression
      And a file measuring below its recorded value reds as an improvement not banked
      And a file no longer over the standard reds as a stale entry
