@CPX
Feature: Reconcile the complexity and module-size thresholds over the real tree

  Mechanism over honour. entity-owns-its-behaviour, small-modules and DRY are honour
  rules until something reds — this is the static check that reds. eslint's
  complexity / max-lines / max-lines-per-function over the REAL source, wired as a
  BLOCKING per-push CI step beside the existing static checks (3F-2177).

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

  THE CHECK NO LONGER HAS A SCRIPT NAME, AND THAT IS THE CONVERSION (3F-3151, under 3F-3138).
  It used to be `lint:complexity`, named with an observed prefix so `runningStaticChecks` would
  discover it — a real quality check kept off the books is exactly where a watermelon hides, so
  being discovered was the entire point of the name. That prefix set is retired (3F-3343) and no
  name is a hook any more. Discovery by SCRIPT NAME is what converting retired. The
  check is now a row of `specController.fitnessChecks` naming SCN-FIT-001, the
  characteristic it asserts and the command that returns a violation; the fitness cucumber pass
  runs that command and reports the scenario, and the credit arrives citing the @SCN off the
  scenario's own tag line rather than being resolved onto it through a handle. The script, its
  registry entry and its CI step went with the seam — kept, the check would be discovered a
  second time, and one Evidence Obligation would answer to two credits.

  Rule: code the change touches reds when it exceeds the external standard; code it does not touch is reported

    tidy-kiwi, MECHANISED AT THE GATE (3F-3408). "You make the mess, you tidy it" stayed an
    honour rule while the gate held the whole tree absolutely, because the only way to keep a
    tree carrying existing debt green was a hand-written register of everything already over
    the line. THE MEASUREMENT DOES NOT NARROW HERE. The whole measured population is still
    analysed on every run and every violation in it is still reported; what narrows is the
    PASS/FAIL. A file the change touched must meet the standard; a violation in a file nobody
    touched is reported and does not red. The industry calls the same mechanism clean as you
    code — SonarSource's term, named because the concept is theirs — and the principle is ours
    and predates it.

    SEVERITY IS THE WHOLE DISCRIMINATOR, WHICH IS WHY EVERY EXAMPLE BELOW NAMES ONE. eslint's
    own vocabulary carries the split: an error exits 1, a warning is reported at exit 0. So
    nothing reconciles a changed set against a population by hand — the report is the rules over
    the measured globs at warning, and the gate is the same rules restated over the intersection
    of those globs with what the change touched, at error. It also means an assertion on the
    mere PRESENCE of a finding now proves nothing: a config emitting all three rules at warning
    everywhere would satisfy every example this Rule carried before today and gate nothing at
    all. Below, "reds" means error, "is reported" means warning, and "is not reported at all"
    means no finding of any severity.

    THE PAIR IS CHANGED VERSUS UNTOUCHED, AND IT IS WHAT PINS THE WORD "TOUCHES". The third and
    fourth examples plant the SAME over-standard module at two paths differing in nothing but
    changedness. The reding half alone would pass just as well against a gate still held over
    the whole tree; the reported half alone would pass against a gate switched off. Neither half
    is decoration — which is the same reason the pairing existed when its axis was the exception
    list.

    THE TWO LINE RULES COUNT CODE, NOT DOCUMENTATION (3F-2395). 40 and 400 are held
    against the code a reader has to hold in their head, not against the file's bytes:
    comments and blank lines are skipped. Counting documentation put the cheapest route
    under a ceiling on DELETING the comment that explains why the code is the shape it
    is — a fitness function pushing against the thing it exists to protect, and one this
    tree has already paid: two of the largest reductions ever banked here were partly
    comment compactions counted as line count. Under this counting the pressure
    inverts: explaining the code is free, growing the code is not.

    The last example below is the half that pins it, and it is not decoration. A module
    can now be three times the file ceiling long and still green, provided the length is
    explanation; the same length in code reds. Both halves are stated, because a rule
    that only ever shows what it rejects leaves what it permits to be inferred. Under the
    severity split it says the stronger thing: documentation past the ceiling is not
    reported at all, so it is absent from the report as well as from the gate.

    @integration @SCN-CPX-001
    Scenario: a changed file over the external standard reds the build, and an untouched one is reported
      Given the thresholds are the external standard, not a measurement of this tree
      When the complexity fitness function scans the real tree
      Then a changed function over complexity 10 reds
      And a changed function over 40 code lines reds
      And a changed module over 400 code lines reds
      And an untouched module over 400 code lines is reported without reding
      And a module of pure documentation past the file ceiling is not reported at all

  Rule: the module-size ceiling does not govern the domain's concept modules

    THE GUARD STATES ITS SCOPE, RATHER THAN THE MODEL BENDING TO IT (3F-2416; canon:
    functional-domain-modelling.md → "The aggregate root outgrows the module ceiling",
    and the fitness-functions.md ruling of 2026-08-05). A concept module co-locates a
    type with the pure functions over it, and it grows WITH the concept — that is the
    model working, not bloat. A file-size ceiling assumes the opposite, and the only
    move that satisfies it is hiving the concept's behaviour into an *-operations layer:
    the anemic shape the model forbids, arrived at not by anyone's bad instinct but
    because the gate forced it. For an entity module coherence IS the tractability —
    read one module, see the whole concept — so max-lines yields to it.

    WHETHER A FINDING REDS IS @SCN-CPX-001'S CLAIM, NOT THIS RULE'S (3F-3463). This Rule
    says which of the three rules reach a concept module AT ALL, and max-lines reaching
    one at severity off is the whole of the exclusion. What a finding then DOES — red, or
    be reported at exit 0 — turns on whether the change touched the file, which is the
    Rule above's subject and not this one's. So every example below is stated as found or
    not found, at any severity: an entity root nobody touched produces a warning, and
    saying "still reds" here would be this Rule asserting the other one's mechanism.

    NOT A BLANKET DOMAIN EXEMPTION, AND NOT A PER-FILE ONE. The excluded set names the
    concept modules; a value object, a composition or a helper living in the same
    directory stays under the ceiling, because nothing adds it to the set by living
    there. And the set carries no measured value and no date, which is what always
    separated it from the per-file allowance list that sat beside it until 3F-3466: an
    allowance entry said "this file measures 575 today", a fact about debt; this says
    "this module is a concept root", a fact about kind.

    ONLY MODULE SIZE YIELDS. complexity and max-lines-per-function apply to a concept
    module exactly as they do anywhere else, and that is what makes the exclusion safe
    to grant: a long module of small, simple, well-named functions is coherent, while a
    fat or complex FUNCTION is debt whatever module holds it. "Its ceiling" in the last
    two examples is each module's own, READ OFF eslint's OWN RESOLVED CONFIG for that
    path and never re-derived. Every ceiling resolves to the standard from today
    (3F-3466), so that read is now observationally identical to naming 10 and 40 here —
    and it stays the read, because a number written into this Rule would be wrong the
    moment a ceiling diverged again and would look right until someone measured. Asking
    eslint is the one reading that cannot disagree with the check it is testing; that it
    currently cannot disagree with a constant either is a fact about today's tree.

    The last three examples are the fence, and they are stated in the same scenario as
    the permission — a permitting rule whose limits live nowhere is indistinguishable
    from a hole, and this is precisely the rule that could become a hiding place.

    @integration @SCN-CPX-004
    Scenario: a domain entity root outgrows the file ceiling with no finding, and every per-unit rule still bites
      Given the concept modules the module-size rule does not govern
      When the complexity fitness function scans the real tree
      Then an entity root far past the file ceiling produces no module-size finding
      And a non-root module in the same directory past the file ceiling is still found
      And a function past its length ceiling in an entity root is still found
      And a function past its complexity ceiling in an entity root is still found

  Rule: the run says which population it gated and which it only reported

    THE DENOMINATOR, STATED BY THE RUN RATHER THAN INFERRED FROM IT. A gate over a subset
    has two ways to report nothing, and they mean opposite things: the subset was clean, or
    the subset was empty. On a trunk push it is always the second. Neither eslint's summary
    line nor the step's recorded outcome can tell them apart, so the run states the sizes.

    IT IS A STATEMENT, NOT A SECOND VERDICT. Nothing here changes the exit code and nothing
    here reds. Whether a finding reds is @SCN-CPX-001's claim; this Rule is only that the
    run is readable.

    @integration @SCN-CPX-005
    Scenario: the run states the size of the gated population and of the reported one
      Given a changed set holding a file the complexity rules measure
      When the complexity fitness function scans the real tree
      Then the run states how many files it held to the standard
      And it states that every other measured file is reported only
      And a run whose changed set touches no measured file says so rather than staying silent
      And neither statement changes the run's exit code
