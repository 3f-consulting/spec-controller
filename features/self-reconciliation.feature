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

    The gate is `balance:self`: the product's own `balance` command, run over
    spec-controller's own tree, exiting on the verdict rather than merely printing it.
    Both arms belong to ONE scenario, the @SCN-ANM-001 shape — a gate that reds is only
    half a gate, because a check that reds on everything is as useless as one that reds
    on nothing, and only the pair says the verdict is being read.

    WHAT THE GATE RECONCILES is stated once, in `SELF_BALANCE_SCOPE`, and is the whole of
    it: `features/`, the Vitest report, the behavioural Cucumber report, the measurement
    artefact, the CI RUN'S OWN STEP RECORD, the WORKFLOW DIRECTORY, `package.json`. A path
    enters the books only by entering one of the seven, which is what makes the boundary
    deliberate rather than inherited.

    A PRECONDITION IS NOT AN EIGHTH SURFACE (3F-3292). The gate READS before it
    reconciles: whether the two runtime reports were emitted at all is answered first, and
    that answer is never handed to the balance command. The distinction is real — whether
    this run can be believed is a different question from what it reconciles — and it is
    easy to miss here, because the one precondition left reads files that are already
    among the seven. It is written in this feature rather than only in a docblock, because
    a boundary stated in a scenario and qualified only in a docblock is two spellings that
    agree until one is edited, which is the arrangement this feature exists to refuse.

    THE SEVEN RESOLVE AGAINST TWO BASES, AND WHICH ONE SEPARATES SOURCE FROM OUTPUT
    (3F-3099). `features/`, the workflow directory and `package.json` are the tree being
    judged, so they resolve against the target root. The four evidence reports are this
    run's own OUTPUT, so they resolve against an EVIDENCE ROOT instead — the named target
    root where a target was named, because a self-contained tree carries its own evidence,
    and a temporary directory where none was, never the working tree. spec-controller
    writing its output into its own source was the defect; a planted tree under `--root`
    never was one, which is why naming a root is the discriminator rather than a flag every
    planted arm would have had to start passing.

    TWO DOCUMENTS ABOUT THE PIPELINE, BECAUSE THERE ARE TWO QUESTIONS. The workflow
    DIRECTORY says a check is wired into this pipeline and which row its step cites, and is
    true between runs; the run's own step record says what each of those steps DID on one
    afternoon. Neither can be got from the other, so both are surfaces and neither is a
    second reading of the first.

    A TARGET WHOSE PIPELINE DUMPS NO STEP RECORD EMITS NONE, AND THAT IS NOT A BROKEN RUN.
    The two suite reports carry a precondition check — an unemitted one means the suite did
    not run, which would leave every obligation unobserved — and the step record carries
    none, for the reason the measurement artefact carries none: its absence leaves exactly
    the converted rows unanswered, and those rows reconciling missing is a verdict the
    ledger is entitled to reach.

    AND A LOCAL RUN OF THIS GATE IS EXACTLY THAT TARGET, WHICH IS SAID HERE RATHER THAN
    DISCOVERED (3F-3272). The record is dumped by a step of the pipeline; a developer's
    machine runs no pipeline, so a local `balance:self` is handed none and every configured
    fitness row reconciles missing — out of balance, and NOT unsound. The checks themselves
    still run locally, as gates of the derived ladder in their own right, and their teeth are
    their own exit codes. What a local run does not have is the credit journal, because the
    credit journal is the pipeline's.

    THE CI SURFACE IS THE DIRECTORY, NOT ONE FILE (3F-2500). The product's own default
    reads every workflow, because a check enforced from a sibling file is otherwise
    called a watermelon it is not, or leaves the books entirely. A gate that read fewer
    files than the product does would be spec-controller declining to use the capability
    it ships — the same shape @SCN-SLF-002 closed one level down.

    @integration @SCN-SLF-001
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

    THE TWO TREES DIFFER IN EXACTLY ONE TAG. Both run the same check and both register it,
    so the registry cannot be the difference; only the named arm carries that check's BARE
    TAG on the planted scenario. So the red arm's ONLY out-of-balance
    item is the check, which is what makes the red attributable to it rather than to
    some other flaw in a differently-built fixture, and the green arm is its control.
    Both arms belong to ONE scenario, the @SCN-ANM-001 / @SCN-SLF-001 shape — a gate
    that reds is only half a gate.

    @integration @SCN-SLF-002
    Scenario: the gate reds a tree running a static check no scenario names, and passes when the check is named
      Given the self-balance gate, wired over spec-controller's own source
      When the gate reconciles a tree running a static check no scenario names, and a tree naming the check it runs
      Then the gate fails over the tree whose static check nothing names, naming that check
      And the gate passes over the tree whose static check is named
