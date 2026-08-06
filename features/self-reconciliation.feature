@SLF
Feature: spec-controller reconciles its own tree, and the build depends on the answer

  THE COBBLER'S SHOES, THE WHOLE PAIR. spec-controller exists to report a codebase's
  one-way evidence claims — a tier named and never observed, an observation citing
  nothing, a guard that runs while no scenario names it. It has been able to report
  those about ITSELF since the reconciler shipped, and nobody ran it: no CI step invoked
  `balance` over spec-controller's own tree. So the defect class the tool is built to
  catch had to be found twice, by accident, in this very repository.

  A report nobody is obliged to read is not a check. This feature makes the tool's own
  verdict LOAD-BEARING: spec-controller's own tree is reconciled on every push and every
  pull request, and the build depends on the answer. It is the same adopt → respond →
  gate path the tool asks a real target to walk, walked first here — the credibility
  argument, made mechanical.

  Rule: the self-reconciliation gate's verdict is the build's verdict

    The gate is `lint:self-balance`: the product's own `balance` command, run over
    spec-controller's own tree, exiting on the verdict rather than merely printing it.
    Both arms belong to ONE scenario, the @SCN-NCR-001 shape — a gate that reds is only
    half a gate, because a check that reds on everything is as useless as one that reds
    on nothing, and only the pair says the verdict is being read.

    WHAT THE @lint TAG DOES HERE. `@lint=lint:self-balance` is not decoration. It raises
    the Evidence Obligation this gate's own CI run settles, so the run is credited to
    THIS scenario instead of folding onto the suspense row as an uncited static check —
    the @SCN-NCR-001 / @SCN-CPX-003 / @SCN-SSM-006 precedent. Without it the gate would
    red on its own introduction, which is the tool grading its own homework and finding
    it wanting: correct behaviour, and the reason the obligation and the wiring land
    together. Self-citation is a property of the tagging, not a second behaviour, so
    there is no second @SCN here.

    WHAT THE GATE SCANS is stated once, in `SELF_BALANCE_SCOPE`, and is the whole of it:
    `features/`, the Vitest report, the Cucumber report, the CI config, `package.json`.
    Five surfaces resolved against one root — the repository in CI, a planted tree under
    test. A path reaches the gate only by entering one of the five, which is what makes
    the boundary deliberate rather than inherited.

    @unit @integration @lint=lint:self-balance @SCN-SLF-001
    Scenario: the self-reconciliation gate reds an out-of-balance tree and passes over a balanced one
      Given the self-balance gate, wired over spec-controller's own source
      When the gate reconciles a tree whose named evidence is all observed, and a tree naming evidence that nothing observes
      Then the gate passes over the tree whose accounts agree
      And the gate fails over the tree carrying an obligation nothing settles, naming that obligation

  Rule: a static check nothing names reds the gate, on the gate's own books

    THE CREDIT SIDE OF THE SAME GATE. @SCN-SLF-001 proves the gate reds an obligation
    nothing settles — a tier named, never observed. Its planted trees carry no static
    check at all, so the mirror case reaches the gate nowhere: a check that RUNS while
    no scenario names it, the unposted credit.

    That the reconciler NOTICES such a check is @SCN-USG-001's, proven over a fixture
    target through `balance`. That the GATE reds this repository's build over one is
    nobody's until here — and it is the case a new quality check actually arrives as:
    added to package.json and ci.yml, named by nothing, passing green and off the books.
    The two halves were proven piecewise and nowhere as the claim itself.

    THE TWO TREES DIFFER IN EXACTLY ONE TAG. Both run the same check; only the named
    arm carries @lint= on the planted scenario. So the red arm's ONLY out-of-balance
    item is the check, which is what makes the red attributable to it rather than to
    some other flaw in a differently-built fixture, and the green arm is its control.
    Both arms belong to ONE scenario, the @SCN-NCR-001 / @SCN-SLF-001 shape — a gate
    that reds is only half a gate.

    @integration @SCN-SLF-002
    Scenario: the gate reds a tree running a static check no scenario names, and passes when the check is named
      Given the self-balance gate, wired over spec-controller's own source
      When the gate reconciles a tree running a static check no scenario names, and a tree naming the check it runs
      Then the gate fails over the tree whose static check nothing names, naming that check
      And the gate passes over the tree whose static check is named
