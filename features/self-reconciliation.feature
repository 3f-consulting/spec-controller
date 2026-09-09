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
    artefact, the FITNESS PASS'S report, the WORKFLOW DIRECTORY, `package.json`. A path
    enters the books only by entering one of the seven, which is what makes the boundary
    deliberate rather than inherited.

    A PRECONDITION IS NOT AN EIGHTH SURFACE, AND THIS PARAGRAPH USED TO SAY OTHERWISE
    (@SCN-SLF-005, 3F-3193). The gate also READS files it never reconciles: whether the
    two runtime reports were emitted at all, and whether the fitness axis still holds the
    rows `quality-thresholds.yml` banks. Neither answer is handed to the balance command,
    and the distinction is real — whether this run can be believed is a different question
    from what it reconciles. But it went unwritten while every precondition happened to
    read a file already among the seven, and the record is the first one that does not. A
    boundary stated in a scenario and qualified only in a docblock is two spellings that
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

    TWO CUCUMBER REPORTS, BECAUSE THERE ARE TWO PASSES. The behavioural pass's report
    carries runtime credits levelled by a tier tag; the fitness pass's carries static-check
    credits named by a configured row. One document cannot be read both ways without the
    gate guessing which half of it is which, so the second pass is told apart by being
    named separately rather than by a rule buried inside one file.

    A TARGET THAT HAS CONVERTED NOTHING EMITS NO FITNESS REPORT, AND THAT IS NOT A BROKEN
    RUN. The two suite reports carry a precondition check — an unemitted one means the
    suite did not run, which would leave every obligation unobserved — and the fitness
    report carries none, for the reason the measurement artefact carries none: its absence
    leaves exactly the converted rows unanswered, and those rows reconciling missing is a
    verdict the ledger is entitled to reach.

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

  Rule: the fitness axis's size is a number the repository banked, not one anybody typed

    THE AXIS ONCE HAD ONE AUTHOR FOR BOTH ITS BOOKS, AND THAT IS THE FAULT THIS RULE WAS
    BUILT FOR. A converted check's Evidence Obligation is raised from a configured row and
    its Evidence Observation is produced by running that same row's command; while the
    corpus was EMITTED from the rows as well, one edit to the manifest moved every side
    together and no surviving side was left to disagree. Mistype the key that holds the
    rows and the manifest read empty, the corpus was regenerated empty, the fitness pass
    ran nothing, and the report said nothing about any of it (3F-3180, measured cold).

    SO THE SECOND SOURCE IS A COUNT THE REPOSITORY BANKED, AND IT LIVES WHERE THE TYPO
    CANNOT REACH. `quality-thresholds.yml` sits at the repository root and outside the
    manifest block a target writes to configure the tool — that placement is the whole
    reason this cure was chosen over the alternatives, because a number kept inside the
    block would have gone empty in the same edit and inherited the fault it is here to
    cure.

    BANKED, NEVER TYPED, WHICH IS THE RULE THAT FILE ALREADY STATES ABOUT ITSELF. The
    count is read upward off the tree by a command, exactly as the mutation record's two
    figures are, and the command refuses to write a fall: a record that must come down
    comes down by hand, with the reason in the commit. There is no flag for it,
    deliberately — an escape hatch a tool holds open is one nobody ever has to justify.

    THE CORPUS IS AUTHORED NOW, AND THIS NUMBER IS A CARDINALITY BELT (3F-3244). An
    emptied manifest leaves its scenarios standing, so the pass reds on each and the
    ledger's census names them; what the banked figure adds is one line stating the fall
    in numbers, including where a row and its scenario leave together.

    THE COUNT IS READ FROM THE MANIFEST AND NEVER FROM THE CORPUS. Two authored sides are
    two sides to count, and counting the one this bar is not held against would answer a
    different question from the one the refusal states.

    @integration @SCN-SLF-004
    Scenario: banking reads the row count off the tree and writes it upward, refusing to record a fall
      Given a repository whose record banks fewer fitness rows than its manifest holds
      When the repository banks the fitness-row count its manifest states
      Then the record states the count read from the manifest, and stands otherwise byte for byte as it was
      And banking over a manifest that has since lost rows is refused, naming both counts and leaving the record as it stood

    @integration @SCN-SLF-005
    Scenario: a run whose fitness axis holds fewer rows than the banked figure reds the gate, naming the figure and the count
      WHERE THE COMPARISON RUNS IS THE LOAD-BEARING DECISION, AND IT IS NOT A FITNESS
      ROW. A comparison held as a row would go with the rows it is there to notice the
      loss of — rebuilding, inside the cure, the exact recursion this repository already
      documents one level down. It runs in the
      self-reconciliation gate instead, which is already its own pipeline step, outside
      the corpus, and is where a bar is read.

      BOTH NUMBERS, IN THE LINE ITSELF. A reader meeting this red is told what the record
      banks and what the manifest now holds, in one sentence, without going to look. A
      line saying only that the axis is smaller would send them off to find the two
      figures the sentence was the right place to state.

      THE BAR IS ANSWERED BEFORE THE BOOKS ARE OPENED. Every obligation on this axis is
      raised FROM the rows, so a reconciliation over an emptied axis reports on a
      population that is no longer there — which is the healthy-looking page a reader
      could not tell from a healthy one. The count is compared first and the run stops on
      a fall, rather than a verdict being printed over it.

      TWO REPOSITORIES DIFFERING IN ONE NUMERAL, which is what makes the red attributable
      to the count rather than to some other flaw in a differently-built plant. Both hold
      the same manifest and the same evidence; only the figure their record banks differs.

      Given a repository whose manifest has lost fitness rows since its record was banked
      When the self-reconciliation gate reconciles that repository, and one whose manifest still holds every row its record banks
      Then the gate fails over the repository that has lost rows, naming both the figure the record banks and the count the manifest now holds
      And the gate says nothing about the axis over the repository whose rows are all still there

    @integration @SCN-SLF-006
    Scenario: a repository that banked no fitness figure is not redded by a bar it never set, and one that banked a figure is still held to it
      ABSENT IS NOT ZERO, AND THEY ARE DIFFERENT FACTS ABOUT A REPOSITORY. A record that banks
      no count for the axis has set no bar at all; a record banking zero has set one that every
      count on earth clears. Read as the same thing, the reader answers a figure nobody wrote
      and holds the tree to it forever after — which is @SCN-MUT-003's rule one axis over: an
      entry naming no comparison it recognises raises an obligation with no bar at all, rather
      than one the engine picked a direction for.

      EVERY CONSUMER OF THIS TOOL ARRIVES HERE, AND ARRIVES HERE FIRST. A repository that has
      converted no checks has never run the banking command, so it files no figure, and a
      mechanism that redded it would be one that reds on first use. It is the same standing this
      feature already gives the fitness report itself: a target that has converted nothing emits
      none, and its absence is a verdict the ledger is entitled to reach rather than a broken run.

      A SILENCE ASSERTION ALONE CANNOT SEE THE DEFAULTING, WHICH IS WHY THE READER'S OWN ANSWER
      IS NAMED IN A STEP OF ITS OWN. A bar of zero is cleared by every count, so a defaulted
      reading is silent over exactly the repositories this scenario watches — from outside the
      gate the fault and the cure look identical, and a scenario that only watched for quiet
      would pass over both. The distinction survives only where it is made, so the record that
      banks nothing is read as banking none, and that is asserted rather than inferred from the
      quiet.

      NEVER BANKED COMES IN TWO FORMS AND BOTH ARE ORDINARY. A repository may file no record
      at all, which is where a consumer starts, or file one that banks its other bars and has
      never banked this one, which is where a consumer arrives the day it adopts any other gate
      here. Neither has set a figure, so neither is held to one.

      REPOSITORIES DIFFERING IN WHETHER THE RECORD BANKS A FIGURE AT ALL, where the pair in the
      scenario above differ in one numeral inside a record they both write. All of them hold the
      same manifest and the same evidence. Without the last, silence over the others says
      nothing that a gate which had stopped looking would not also say.

      Given a repository filing no record at all, one whose record files no block for the axis, and one whose record banks more rows than its manifest holds
      When the self-reconciliation gate reconciles each of them
      Then the gate says nothing about the axis over the repositories that banked no figure
      And a record filing no block for the axis is read as banking none at all, rather than as banking zero
      And the gate fails over the repository whose record does bank a figure, so the silence is the absent figure's and not the gate's
