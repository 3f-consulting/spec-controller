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

  TODAY'S EXCEEDANCES ARE DATED DEBT, NOT A RAISED CEILING. Every file already over the
  standard is enumerated per rule in complexityExceptions.mjs, carrying the value
  measured on the day it was recorded. The list reads as a refactor backlog rather than
  as headroom, and it can only shrink.

  WHY THE CHECK IS NAMED `lint:complexity`. `runningStaticChecks` observes a script only
  when its name carries an observed prefix (`lint:` / `guard:`). A name outside that set
  would run in CI while being structurally invisible to the ledger — a real quality
  check kept off the books, which is exactly where a watermelon hides. Named so it IS
  observed; the bare `@complexity` tag on the fitness scenario at the foot of this file is
  then what keeps it out of the suspense row as an uncited static check. Observed AND
  required is the balanced state.

  Rule: code outside the exception list reds when it exceeds the external standard

    THE TWO LINE RULES COUNT CODE, NOT DOCUMENTATION (3F-2395). 40 and 400 are held
    against the code a reader has to hold in their head, not against the file's bytes:
    comments and blank lines are skipped. Counting documentation put the cheapest route
    under a ceiling on DELETING the comment that explains why the code is the shape it
    is — a fitness function pushing against the thing it exists to protect, and one this
    tree has already paid (vocabWordSets.ts 443→400, vocabAudit.test.ts 815→797 were
    partly comment compactions banked as line count). Under this counting the pressure
    inverts: explaining the code is free, growing the code is not.

    The last example below is the half that pins it, and it is not decoration. A module
    can now be three times the file ceiling long and still green, provided the length is
    explanation; the same length in code reds. Both halves are stated, because a rule
    that only ever shows what it rejects leaves what it permits to be inferred.

    @unit @integration @SCN-CPX-001
    Scenario: a function or module over the external standard reds the build
      Given the thresholds are the external standard, not a measurement of this tree
      When the complexity fitness function scans the real tree
      Then a function over complexity 10 outside the exception list reds
      And a function over 40 code lines outside the exception list reds
      And a module over 400 code lines outside the exception list reds
      And a module of pure documentation past the file ceiling does not red

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

    NOT A BLANKET DOMAIN EXEMPTION, AND NOT A PER-FILE ONE. The excluded set names the
    concept modules; a value object, a composition or a helper living in the same
    directory stays under the ceiling, because nothing adds it to the set by living
    there. And the set carries no measured value and no date — an exception entry says
    "this file measures 575 today", a fact about debt; this says "this module is a
    concept root", a fact about kind. The two never overlap, which is pinned.

    ONLY MODULE SIZE YIELDS. complexity and max-lines-per-function apply to a concept
    module exactly as they do anywhere else, and that is what makes the exclusion safe
    to grant: a long module of small, simple, well-named functions is coherent, while a
    fat or complex FUNCTION is debt whatever module holds it. "Its ceiling" in the last
    two examples is each module's own — the standard, or the frozen value where the debt
    list already records one, since three of these modules do. Planting at the standard
    alone would sit under those frozen ceilings and read as the gate having stopped
    biting, when it is biting at exactly the number @SCN-CPX-002 froze.

    The last three examples are the fence, and they are stated in the same scenario as
    the permission — a permitting rule whose limits live nowhere is indistinguishable
    from a hole, and this is precisely the rule that could become a hiding place.

    @unit @integration @SCN-CPX-004
    Scenario: a domain entity root outgrows the file ceiling without reding
      Given the concept modules the module-size rule does not govern
      When the complexity fitness function scans the real tree
      Then an entity root far past the file ceiling does not red
      And a non-root module in the same directory past the file ceiling still reds
      And a function past its length ceiling in an entity root still reds
      And a function past its complexity ceiling in an entity root still reds

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

    @unit @integration @SCN-CPX-002
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
    check kept off the books, which is exactly where a watermelon hides. The bare
    `@complexity-exceptions` tag on its own fitness scenario at the foot of this file is
    then what keeps it out of the suspense row as an uncited static check. Observed AND
    required is the balanced state.

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

    @unit @integration @SCN-CPX-003
    Scenario: an exception list that disagrees with the measured tree reds the build
      Given an exception list recording each exempt file's measured value
      When the exception list is reconciled against the real tree
      Then a file measuring above its recorded value reds as a regression
      And a file measuring below its recorded value reds as an improvement not banked
      And a file no longer over the standard reds as a stale entry

  Rule: this tree stays inside the external standard, and its exception list stays honest

    TWO CHECKS, SO TWO SCENARIOS, and resisting the tidier single tag is the point. Both
    steps run eslint over this tree and both live in this file, which makes one `@complexity`
    tag covering the pair look like a saving. It would cost the thing the seam is for: the
    exception-list reconciliation reds on `value < recorded`, a case eslint cannot express at
    all, so a run of one check would post credit to a scenario naming the other and neither
    would be attributable. The tag names the CHECK, not the subject the checks share.

    NEITHER CARRIES STEPS. Every Rule above is an example of a check deciding over a planted
    file; these two are the whole-system characteristics held over the real tree — a
    threshold has nothing to exemplify. Their bare tags raise the Evidence Obligations the
    two CI runs settle.

    @complexity @SCN-CPX-005
    Scenario: every function and module measures inside the external standard, or inside its recorded exception

    @complexity-exceptions @SCN-CPX-006
    Scenario: every exception entry states the value the tree currently measures
