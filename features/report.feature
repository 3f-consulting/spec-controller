@RPT
Feature: The report renders the ledger as sectioned facts

  The report renders the reconciled ledger as facts, in sections: the run provenance first,
  then the summary views, opening with the run verdict, and the Claim Reconciliations last.

  It states facts only: no interpretation, editorial or cross-run comparison.

  Rule: the markdown report opens with a run-provenance header

    A "## Run provenance" section comes ahead of the per-scenario table. It states the target
    repo, the input paths and flags used, the run-start time in UTC, the target's source SHA,
    and the tool's own SHA and version.

    A missing source SHA reads "unknown (non-git target)". A missing tool SHA reads
    "unknown (not a git checkout)", and the version still shows.

    The "Target repo:" line is the --target value verbatim, never resolved or guessed from a
    path. Without --target it reads "unknown-target", with the target's git origin beside it,
    never in its place. The origin omits any user, password, token, query or fragment its
    remote carries. Only a URL, a transport to a URL, an scp remote or a local path is named.
    Any other form, and a remote whose user part can only be guessed at, names no origin. A
    local path, and a file: URL holding no user, are named as given.

    @unit @SCN-RPT-001
    Scenario: the markdown report opens with a Run provenance header whose Target repo is the --target value verbatim, defaulting to unknown-target and naming the git origin beside it

  Rule: the JSON report carries a provenance object

    A top-level run provenance object sits beside the reconciliation body, its summary and
    ledger. It holds the same run facts as the markdown header: the target, the source SHA, the
    tool's own SHA and version, the UTC run timestamp, and the input paths and flags used.

    @unit @SCN-RPT-002
    Scenario: the JSON report carries a provenance object stating target, source SHA, tool SHA, tool version, UTC timestamp, and inputs, with the reconciliation body intact

  Rule: an explicit source SHA wins, and a non-git target resolves to unknown

    An explicit, non-empty source SHA from the override flag wins over any git read.

    With no override and a target that is not a git repository, the source SHA is recorded as
    unknown and the run completes.

    @unit @SCN-RPT-003
    Scenario: an explicit source SHA overrides the git read, and a non-git target with no override resolves to unknown

  Rule: the markdown report renders the evidence reconciliation as a subjects-rows table with balanced and out-of-balance columns

    Under "## Summary views", the "### Evidence reconciliation" section renders one table. Its
    rows are the subjects, Claim Reconciliation and Reconciliation line, each with its own
    Total. Its columns are balanced and out-of-balance. Nothing in it is bold.

    The Claim Reconciliation row counts each scenario, each phantom claim and the unnamed claim.
    A phantom claim's row and the unnamed claim's row are always out of balance, so a run whose
    only out-of-balance row is the unnamed claim's reads N+1 | N | 1. This out-of-balance count
    agrees with the balance verdict and the exit code.

    The Reconciliation line row counts every Reconciliation line on every row, phantom claims
    and the unnamed claim included, so it is not a count of evidence obligations.

    Its out-of-balance count breaks down in place into cause rows, one per outcome, each reading
    the outcome's sentence alone. The cause rows fill only the out-of-balance column, always
    show even at zero, and sum to that count.

    The missing cause row's Detail splits the missing Reconciliation lines by kind of quality
    check, fitness first: a layer by its tag word, fitness as "fitness".

    The two out-of-balance counts differ in granularity: a scenario with two missing arms is one
    out-of-balance Claim Reconciliation and two out-of-balance Reconciliation lines.

    @unit @SCN-RPT-004
    Scenario: the markdown report renders the evidence reconciliation as subjects-rows with balanced and out-of-balance columns

  Rule: the evidence reconciliation section defines its terms before its table

    Four definitions come before the table, one each for a Claim Reconciliation, a
    Reconciliation line, an Evidence Obligation and an Evidence Observation. Every run prints the
    same four, and none states a figure from the run. Each states what its term is, and what each
    term it uses means unless the report says so elsewhere. A sentence about which rows or lines
    a term covers holds for every kind of row the report can show, or the definition leaves it
    out.

    The second definition also says why the two totals differ: no Reconciliation line stands in
    for another, so a scenario whose one obligation two passing tests answer adds one to the
    Claim Reconciliation total and two to the Reconciliation line total.

    @unit @SCN-RPT-071
    Scenario: the evidence reconciliation section says what a Claim Reconciliation, a Reconciliation line, an Evidence Obligation and an Evidence Observation are before its table

  Rule: the markdown report groups out-of-balance scenarios by feature

    Under "## Summary views", the "### Out-of-balance by feature" section shows which features
    hold the out-of-balance scenarios. It opens with a total line that starts
    "N of M Claim Reconciliation(s) of scenarios out of balance", says which are grouped by
    feature, and names any that are not, "(no feature file names them)". A table headed
    "| Feature | Count | Out-of-balance `@SCN` ids |" follows, one row per feature with its count.
    Balanced scenarios are left out.

    A scenario's feature is the feature code in its @SCN code. The Feature cell reads
    "<file> (<code>)", where the file is the path under the corpus of the feature file carrying
    that code. A code no feature file carries shows bare. Every code shows bare when the report
    is re-rendered from saved JSON that carries no feature files.

    The total line accounts for every out-of-balance row. A phantom claim's row and the unnamed
    claim's row name no feature file, so the total line states each of their out-of-balance
    counts as not grouped by feature. Its numbers add up to the header's out-of-balance count and
    total.

    The section is left out only when no Claim Reconciliation is out of balance. When only
    ungrouped rows are out of balance, it states them and has no table.

    A scenario with no @SCN code counts on the row of the feature file it sits in: under the
    file's header code when it has one, and under the file's name when it has none. Its cell
    states how many such scenarios the row holds rather than naming them; the list of scenarios
    with no @SCN code names each one. A re-render from saved JSON groups them the same way.

    @unit @SCN-RPT-006
    Scenario: the by-feature cut names each out-of-balance feature by its feature file and code, falling back to the bare code for a foreign-scn-code

    @unit @SCN-RPT-030
    Scenario: the by-feature total line counts the out-of-balance rows no feature can group, even when they are the only ones

    @unit @SCN-RPT-031
    Scenario: a feature file's scenarios carrying no @SCN code count together on one row named by that file, never one row each

    @unit @SCN-RPT-032
    Scenario: a scenario carrying no @SCN code in a file headed by a feature code counts on that feature's row

  Rule: the ledger's scenario count is the corpus census, and the report has no census section

    The report has no census section under any name.

    Every scenario is a ledger row, and a scenario with no obligation is a both-missing row, so
    the ledger's scenario count ("- N Claim Reconciliation(s): …") is the corpus census.

    The excluded-occurrence bullet sits in the ledger summary.

    @unit @SCN-RPT-007
    Scenario: the corpus census is recoverable from the ledger summary alone

  Rule: the report outcomes the excluded non-tag @SCN occurrences on both surfaces

    The report states "N @SCN ids seen in non-tag context, excluded": the raw @SCN code
    occurrences in the feature source (in prose, comments and step text) minus the codes written
    as tags. A code written as a tag counts once, on whatever it tags, however many scenarios
    inherit it, so the figure is never negative. It appears as a bullet in the markdown ledger
    summary and in the JSON evidence-obligations object.

    @unit @SCN-RPT-008
    Scenario: the report outcomes the excluded non-tag @SCN occurrences on both surfaces

  Rule: the report renders summary-first, ledger-last

    The report is titled "# Evidence Reconciliation", never "Ledger". "## Run provenance" comes
    first. "## Summary views" holds the derived cuts: Run verdict first, followed by one line
    stating its codes are clean on a run whose judged corpus holds no scenario code error, then
    Evidence reconciliation and Evidence observations, and Out-of-balance by feature last.
    "## Claim Reconciliations" comes last, with its summary lines on top: the verdict tally and
    the excluded-occurrence bullet.

    Every reconciling item is labelled by its tag: the bare tag word for a layer (unit,
    integration, …) and "fitness" for fitness, never an internal kind.

    @unit @SCN-RPT-009
    Scenario: the markdown report renders summary-first with the Claim Reconciliations last

  Rule: the report reconciles the evidence observations — raw = attributed + phantom claim + unnamed claim

    Under "## Summary views", the "### Evidence observations" cut counts the evidence
    observations of every kind of quality check, fitness included. It opens with the identity
    "N evidence observations = a on scenarios + b on cited scenario ids with no real scenario + c citing no scenario",
    which always balances.

    A phantom claim is an @SCN code no scenario carries. The unnamed claim holds observations
    with no @SCN code.

    A table by kind of quality check follows, always listing all five: fitness last at the count
    of fitness functions that ran, and a kind with no evidence observation at zero.

    The JSON also holds the counts per kind of quality check and the three per-account counts.
    The identity line is markdown only.

    @unit @SCN-RPT-010
    Scenario: the report renders the Evidence observations cut over every kind of quality check, fitness included, and the evidence observation identity balances by construction

  Rule: the evidence observations table names, beside each kind of quality check's count, its runner, if it has one, and for a layer the CI steps counted as running its declared runner, or for fitness how many steps run its fitness functions

    Under "### Evidence observations", the table has a row per kind of quality check with its
    count, its runner and its CI step. A layer's runner is the one the target declares for it,
    whatever its count. Its CI step cell names the steps the summary names for that layer, or
    says no step counted as its runner runs it.

    The fitness row counts the steps that run its fitness functions, each named on its fitness
    function's row of Claim Reconciliations. Its runner and CI step cells are blank when no
    fitness function ran.

    A layer the target gives no runner's name reads `no runner` in its runner cell where the
    target declares the layer has none. It reads `unnamed` where the target leaves the layer out,
    gives it a value of the wrong kind, or has no runners block or one of the wrong kind. Its CI
    step cell is blank.

    Each cell holds its text whole, so a runner or a step name holding a pipe stays in its cell.
    A step name holding one of the row's separators sits in its code span, so the cell reads it
    as one step.

    There is no Behavioural runners section.

    @unit @SCN-RPT-074
    Scenario: each layer's row names its runner and the CI steps the summary names for it, whatever its count, says when no step counted as a runner runs a declared runner, and the fitness row counts the steps that run its fitness functions, each named on its row of Claim Reconciliations

    @unit @SCN-RPT-051
    Scenario: a layer the target gives no runner's name says in its runner cell whether the target declared that the layer has none or left its runner undeclared, and where a target names a layer's runner, whatever its count

    @unit @SCN-RPT-079
    Scenario: every cell of the evidence observations table holds its text whole, a runner or a step name holding a pipe included

  Rule: the per-scenario ledger shows the evidence backing each evidence obligation

    Each ledger row has evidence columns between Scenario and Verdict: Fitness, Unit,
    Integration, E2e and Performance, in that order. A column is present only when some scenario
    in the run obligates or observes that kind of quality check.

    Each cell is two-sided, `<obligation>/<observation>`. The left side is the kind's letter
    (F, U, I, E or P) when the scenario obligates that kind, else `-`. The right side is the
    number of evidence observations posted at that kind, passing or failing, else `-`. So
    `letter/N` is obligated and observed, `letter/-` is obligated and missing, `-/N` is observed
    at a kind the scenario never named, and a cell with neither is blank.

    The cell counts backing, not quality: a failing observation still counts, and its failure
    shows in the Verdict and Reconciling-items columns.

    The Fitness cell's left side is a single F, since a scenario names at most one fitness
    function. Its right side counts the fitness evidence observations posted.

    A key to the cells precedes the table wherever it has an evidence column. The columns are
    markdown only.

    A `-/N` cell counts every observation that ran at that kind for the scenario, duplicate
    citations included. An observation citing a pending obligation, such as @unitpending,
    reconciles the same way and also renders `-/N`.

    Each scenario sharing a code has its own row, lettered from its own obligations. Evidence
    citing a shared code credits neither scenario and shows on the unnamed claim.

    Wherever the table has an evidence column, its last column, CI steps, follows Reconciling
    items. It names the CI steps behind each kind of quality check the row obligates or observes,
    in column order, each step once. A layer's steps are the ones the summary names for it. A
    layer the row observes only through broken evidence counts as observed, so its steps are
    named. A fitness function's step is the one its evidence observation names, a broken
    observation's included. The rule is the same on every row: a scenario, each scenario sharing
    a code, a phantom claim and the unnamed claim.

    A kind of quality check with no known step adds none: a layer no CI step is found running, a
    fitness obligation with no evidence observation, and a fitness observation that names no
    step. A row with no known step, and a scenario with no @SCN, has a blank CI steps cell. A step
    name holding one of the row's separators sits in its code span, so the cell reads it as one
    step.

    @unit @SCN-RPT-011
    Scenario: the ledger row shows corpus-driven evidence columns with the two-sided cell encoding, and a shared code's row is lettered from its obligations alone, its citing evidence on the unnamed claim

    @unit @SCN-RPT-054
    Scenario: a fitness function whose step ran and failed shows as one observation in its Fitness cell, as a failed test does in its column

    @unit @SCN-RPT-080
    Scenario: each Claim Reconciliation names, after its reconciling items, the CI steps behind each kind of quality check it obligates or observes, each step once, the step of a fitness function it observes only through broken evidence included

    @unit @SCN-RPT-081
    Scenario: a kind of quality check with no known step adds no CI step to any Claim Reconciliation, and a Claim Reconciliation with none has a blank cell

  Rule: the evidence grid counts the evidence observations that ran

    An evidence observation that never ran, such as a test that failed at import, is not backing.
    It adds nothing to its cell's right side and no column to the grid. Its failure shows in the
    Verdict and Reconciling-items columns. An observation that ran beside it at the same check is
    counted.

    @unit @SCN-RPT-069
    Scenario: the evidence grid counts only the evidence observations that ran, so a broken observation fills no cell and adds no column

  Rule: the ledger summary counts the scenarios with no @SCN code, and each is listed once, on its own ledger row

    The ledger summary states how many scenarios carry no @SCN code. Each is named once, by its
    `feature-file : scenario` locator, on its own ledger row.

    Every scenario header counts, including outlines, templates and examples. An Examples data
    table does not.

    The JSON evidence-obligations object carries these scenarios beside the excluded occurrences.

    @unit @SCN-RPT-014
    Scenario: the ledger summary counts the scenarios with no @SCN code, and each is listed once, on its own ledger row

  Rule: a cross-repo reconcile relativises paths against the target repo root, not the run cwd

    Provenance inputs and evidence-observation locators are relative to the target repo's root,
    never to the directory the run started from, so neither surface carries the target's absolute
    paths.

    The root is the git top level of the parent of the --features path when the target is a git
    repository; else that parent directory itself; else, with no --features, the run's working
    directory.

    @unit @integration @SCN-RPT-016
    Scenario: a cross-repo reconcile run from a foreign cwd yields zero absolute paths on both surfaces
      Given a target repo outside the run's working directory whose Vitest and Cucumber reports carry absolute test-file locators under that repo
      When balance reconciles it from a foreign working directory and saves the reconciliation in markdown and JSON
      Then the saved reconciliation, in both markdown and JSON, carries none of the target's absolute paths — the evidence-observation locators are repo-relative and the input paths record relative to the target root

  Rule: the report's evidence-observation views level a behavioural observation at each layer it was posted at

    The report's views level a behavioural observation as the reconciliation does. A Cucumber run
    of an @e2e scenario counts at e2e in Evidence observations and in the scenario's E2e cell. A
    Cucumber run of a scenario tagged both @integration and @e2e counts in both layers.

    @unit @SCN-RPT-017
    Scenario: an @e2e-via-cucumber observation is counted at e2e across the report views

    @unit @SCN-RPT-018
    Scenario: an @integration @e2e-via-cucumber observation is counted in both layers across the views

  Rule: the Quality Check Reconciliation out-of-balance decomposes into a flat list of the ten leaf outcomes, with no group-side subtotal rows

    The Reconciliation line out-of-balance count in the Evidence reconciliation table breaks down
    into a flat list of the ten out-of-balance outcomes. Each is a counted row that reads the
    outcome's sentence alone, in this order: missing, failing, watermelon, no-scn-code,
    duplicate-scn-code, cites-unknown-scenario, cites-no-scenario, no-evidence-obligation, broken,
    both-missing. Their counts sum to the out-of-balance total.

    Every outcome except satisfied has a row. No debit-side, credit-side or neither-side subtotal
    row appears.

    @unit @SCN-RPT-019
    Scenario: the Quality Check Reconciliation summary lists the ten leaf outcomes summing to the out-of-balance total, with no group rows

  Rule: the markdown renders each outcome's sentence in place of the bare handle

    Wherever an outcome reaches a reader, the markdown shows its sentence in place of its handle:
    the cause rows of the Evidence reconciliation summary and each scenario's reconciling items,
    a fitness function's included.

    The "missing" cause row reads "Evidence Observation is missing". A reconciling item for a
    missing unit observation reads "unit: Evidence Observation is missing". A reconciling item for
    a "watermelon" fitness observation opens with "fitness: " and the watermelon outcome's
    sentence, and its fitness function follows.

    The Detail column shows no sentence. The JSON keeps the bare handle.

    @unit @SCN-RPT-020
    Scenario: the markdown renders each outcome's sentence, not the bare handle

  Rule: the markdown states each verdict and each reconciling item in words, with no glyph

    A ledger row's Verdict cell reads "balanced" or "out-of-balance" alone.

    A reconciling item reads its kind of quality check, a colon and its outcome's sentence, as
    "unit: Evidence Observation is missing" or "fitness: Evidence Observation is missing". An item
    with no kind of quality check reads the sentence alone. Where an item names what the run
    reported, such as the test that failed, that follows in parentheses, quoted as the run gave it.

    The report puts no symbol of its own beside a verdict or an outcome.

    @unit @SCN-RPT-066
    Scenario: a verdict reads balanced or out-of-balance, and a reconciling item reads its kind of quality check and its outcome's sentence, with no symbol beside either

  Rule: the markdown report's own words carry no symbol

    The report's own words are the wording it writes itself: headings, labels, verdicts, outcome
    sentences, tallies and notes. A Pending Item reads "pending", or "pending" and its kind of
    quality check. The Pending Items tally and the outstanding note open with their words. The
    unsound stamp opens "This run is unsound.". Each cause row of the Evidence reconciliation
    summary reads its outcome's sentence alone.

    A symbol is any character that is not a letter, a number, punctuation, a space, a tab or
    printable ASCII. An arrow, a dingbat or an emoji is a symbol, with no exception for one the
    report has printed before.

    Text the report quotes from a run or a corpus is not its own words, so the rule does not reach
    it: a runner's error message, a test's name, a scenario title, a locator or a fitness
    function's name.

    @unit @SCN-RPT-067
    Scenario: the markdown report's own words hold no symbol character, whatever its outcomes, Pending Items or run integrity

  Rule: the report surfaces broken evidence as a proof that never ran, and stamps the run unsound

    A broken observation is a proof that never ran, such as a Vitest suite that failed to collect
    or a Cucumber step that two step definitions match. The markdown does three things for it that
    a missing row cannot.

    First, it names the broken evidence by the locator the runner gave it: a test file or a
    feature file.

    Second, it prints what broke. The message appears verbatim, in a fenced block, in the
    run-integrity section, and the broken item on the ledger carries the same locator and the
    message's first line. Where the runner gives its own message, the report shows it unchanged.
    Where it gives none, as for an ambiguous Cucumber step, the report shows a diagnosis built from
    what the runner reported. Either way it names what failed and where, in one shape, and never
    reports one kind of break as the other. The block's fence is longer than any run of backticks
    in the message, so the message sits whole inside it. A message that is empty or holds only
    whitespace reads as no message.

    Third, it stamps the run "unsound" under a "## Run integrity: unsound" heading. It tells the
    reader that a broken proof sits on the row of the claim it names, where an Evidence Obligation
    of its kind of quality check that no other proof answers reads as missing. A broken proof on
    the row of a phantom claim or of the unnamed claim may be the proof behind any missing item of
    its kind of quality check, on any row, rather than a test still to write.

    The report prescribes no cure beyond its one remedy: fix what stopped each proof from running,
    such as its test, the code it loads, its step definitions, its runner or the CI job that runs
    it, and regenerate.

    A run with no broken evidence has no run-integrity section. The section is markdown only.

    @unit @SCN-RPT-021
    Scenario: the markdown names the broken evidence and its error, and stamps the run unsound

    @unit @SCN-RPT-065
    Scenario: a check step that did not run is worded by what the record said, skipped, ended with another outcome or carrying none, prefixed by the code it cites

  Rule: the summary opens with the run's verdict

    The summary always opens with the run's verdict in one line, so a run that exits non-zero
    never opens with a line that reads as a pass.

    The verdict agrees with the "## Run integrity: unsound" stamp and with the Pending Items line.
    It is decided in the same order as the exit code: broken evidence first, then out of balance,
    then pending items.

    Unsound names exit 4, out-of-balance names exit 1, and balanced names exit 0. Under --strict,
    a balanced run carrying pending items reads pending and names exit 3. Without --strict, it
    reads balanced and names exit 3 only conditionally, as "exit 3 under --strict".

    @unit @SCN-RPT-022
    Scenario: the summary opens with the run verdict and the exit code it maps to

  Rule: Evidence observations counts each evidence observation on the kind of claim its row reconciles, a broken behavioural one included, and each fitness function that ran

    A behavioural evidence observation counts whether it passed, failed or is broken. A fitness
    evidence observation counts when its fitness function ran, on the kind of row it sits on, so
    an uncited one counts on the unnamed claim. A broken fitness evidence observation does not
    count. The total is the sum of the counts of the five kinds of quality check and the sum of
    the counts on each kind of claim.

    @unit @SCN-RPT-023
    Scenario: Evidence observations counts each evidence observation by the kind of claim its row reconciles, a broken behavioural one included, and each fitness function that ran

  Rule: the reconciliation collection renders as "Claim Reconciliation(s)", never "Scenario Reconciliation(s)" or "scenario(s)", on every surface that names it

    The name holds in both places it appears: the Subject cell of the collection's row in the
    Evidence reconciliation table, and the verdict tally under "## Claim Reconciliations".

    The tally counts every row: scenario, phantom claim and unnamed claim.

    @unit @SCN-RPT-024
    Scenario: the reconciliation collection is named "Claim Reconciliation(s)" on every surface, never "Scenario Reconciliation(s)" or "scenario(s)"

  Rule: the tool identity is the tool's OWN checkout — an installed tool has none, whatever repository it is sitting inside

    The tool SHA is the HEAD of the tool's own checkout, never the target's.

    A tool installed under node_modules has no checkout of its own, so it reports no tool SHA,
    even inside a git repository. A tool reached through a node_modules symlink to a checkout of
    itself reports that checkout's HEAD.

    The version, read from the tool's own package manifest, always shows, so a run stays
    attributable without a SHA.

    @unit @SCN-RPT-026
    Scenario: the tool names its own checkout's commit, and where it is not a git checkout names no commit and still names its version

    @unit @integration @SCN-RPT-029
    Scenario: a spec-controller resolved out of node_modules reports no tool SHA though the tree it sits in is a git repository, while one running from a checkout of itself still reports that checkout's HEAD
      Given this release's packages installed into a directory that is a git repository, into a directory that is not one, and reached from a third through a node_modules symlink to a checkout of the tool
      When each one runs a reconcile and the provenance it renders is read
      Then the one installed inside a git repository reports no tool SHA, and does not name that repository's commit
      And the one installed outside any repository reports no tool SHA
      And the one reached from a checkout of the tool reports that checkout's commit, not the consumer's
      And all three still report the tool's version

  Rule: the Run provenance names every stream the run was handed, and every one it was not

    The Run provenance Inputs block lists the canonical inputs the run received, in canonical
    order, with the optional fitness stream last, after --package-json. A run lists exactly the
    inputs it received, and both surfaces show the same inputs the reconcile consumed.

    A run handed no inputs reads "Inputs: none specified".

    @unit @SCN-RPT-027
    Scenario: the Inputs block names the optional fitness stream when the run received it

    @unit @SCN-RPT-028
    Scenario: a canonical input the run did not receive is named as absent rather than omitted, so silence is never the answer
      The canonical inputs the run did not receive are named on a line of their own,
      separate from the Inputs list. That line appears only when an input is absent. The
      JSON provenance object carries nothing for it.

  Rule: an evidence observation that answers no evidence obligation shows its own result

    On a phantom claim's row, and on a scenario's row at a kind of quality check where the
    scenario holds no obligation, each observation is listed by its outcome and where it ran, and
    a test also by its test name. After its kind of quality check and the outcome's sentence, it
    shows its own result, failed or passed.

    The unnamed claim's row counts its results by file instead, under the Rule below.

    @SCN-RPT-034 @unit @e2e
    Scenario: a test that cites a scenario no feature carries shows on its phantom claim's row as failed or passed, as it ran
      Given a target with two tests that cite a scenario no feature carries, one that failed and one that passed
      When the target's evidence is reconciled into a report
      Then the phantom claim's row shows the test that failed as failed
      And the phantom claim's row shows the test that passed as passed

    @SCN-RPT-035 @unit @e2e
    Scenario: a test observed at a check its scenario holds no obligation for shows as failed or passed, as it ran
      Given a target with two tests that cite a scenario holding no obligation at the check they ran at, one that failed and one that passed
      When the target's evidence is reconciled into a report
      Then the scenario's row shows the test that failed as failed
      And the scenario's row shows the test that passed as passed

    @unit @SCN-RPT-086
    Scenario: a test that answers no evidence obligation is named by its file and its test name, so two such tests in one file read as two items

  Rule: a failing or watermelon reconciling item names the evidence observation it carries

    A failing item names, after its outcome's sentence, the test that failed by its file and its
    name, or the fitness function that failed by its name. A watermelon item names its fitness
    function. So two failing tests on one scenario read as two different items.

    @unit @SCN-RPT-082
    Scenario: each failing test on a scenario's row is named by its file and its test name, so two failing tests read as two items

    @unit @SCN-RPT-083
    Scenario: a failing or watermelon fitness evidence observation on a scenario's row is named by its fitness function

  Rule: every reconciling item quotes what the run reported whole in its cell

    What an item quotes sits whole in its cell: a file, a test's name, a fitness function's name,
    a CI step's name, a message, and a scenario's feature file and title. A pipe, a backslash or a
    line break in it never splits the row or changes what it says. A part the run did not give
    leaves no empty part or separator behind. A part that holds one of the row's separators, a
    semicolon, a colon or a comma followed by a space, or a slash with a space on each side, sits
    in its code span, so it reads as one item and one part. One that holds none reads as written.

    @unit @SCN-RPT-084
    Scenario: every reconciling item quotes what the run reported whole in its cell, a pipe, a backslash or a line break included, and leaves out a part the run did not give

  Rule: the unnamed claim's row groups what ran by where it ran, counting what passed and naming what failed

    The row groups its observations that cite no scenario by the file they ran in. The CI steps
    form one group of their own, listed after the files.

    Each group counts what ran, passed and failed. It names each failed test, by its test title or
    Cucumber scenario name, and each CI step by its workflow, job and step, which holds no result.
    Broken items are listed individually.

    Evidence citing an @SCN code that more than one scenario carries is grouped apart from evidence
    citing nothing. In one file, the tests citing such a code form a group of their own, and the CI
    steps citing it are listed apart from the CI steps citing nothing. Each such group names the
    code once, whatever its tests' messages say, and says that evidence citing it credits none of
    the scenarios that carry it.

    The grouping is not stored; the JSON carries each observation's test name.

    @SCN-RPT-033 @unit @e2e
    Scenario: tests that cite no scenario are grouped on the unnamed claim's row by the file they ran in, each group counting how many ran, passed and failed
      Given a target whose tests that cite no scenario ran in two files, one file holding a test that failed and a test that passed
      When the target's evidence is reconciled into a report
      Then the unnamed claim's row lists each of the two files once
      And each file's entry counts how many of its tests ran, how many passed and how many failed
      And the counts of tests that ran add up to the count of evidence observations that cite no scenario

    @SCN-RPT-036 @unit @e2e
    Scenario: a failed test that cites no scenario is named on the unnamed claim's row by its test title
      Given a target whose tests that cite no scenario ran in two files, one file holding a test that failed and a test that passed
      When the target's evidence is reconciled into a report
      Then the file's entry on the unnamed claim's row names the test that failed by its title
      And the file's entry does not name the test that passed

    @SCN-RPT-037 @unit @e2e
    Scenario: a failed Cucumber scenario that cites no scenario is named on the unnamed claim's row by its scenario name
      Given a target whose Cucumber scenarios that cite no scenario ran in one feature file, one that failed and one that passed
      When the target's evidence is reconciled into a report
      Then the feature file's entry on the unnamed claim's row names the Cucumber scenario that failed by its name
      And the feature file's entry does not name the Cucumber scenario that passed

    @SCN-RPT-038 @unit @e2e
    Scenario: the CI steps that cite no scenario are grouped together on the unnamed claim's row, each named
      Given a target whose CI runs two checks that cite no scenario, beside a test that cites no scenario
      When the target's evidence is reconciled into a report
      Then the unnamed claim's row lists the CI steps together once, after the test's file
      And the CI steps' entry names each of the two checks
      And what the unnamed claim's row counts adds up to the count of evidence observations that cite no scenario

    @unit @SCN-RPT-075
    Scenario: in one file, the tests citing a code more than one scenario carries are grouped apart from the tests citing no scenario, and only their group names the code, once, whatever its tests' messages say, even where the runner names no file

    @unit @SCN-RPT-076
    Scenario: a CI step citing a code more than one scenario carries is listed apart from the CI steps citing no scenario, and its entry names the code

  Rule: an item quoting what an evidence observation said states the first line of its message and every note it carries

    Where a reconciling item quotes what an evidence observation said, as a broken item does and
    as a file's group on the unnamed claim's row does, it states the first line of the message that
    holds text, then the words of each note the observation carries, however many lines the message
    runs to. A file's group states each such line once, however the run spaced it.

    @unit @SCN-RPT-085
    Scenario: an item quoting what an evidence observation said states the first line of its message and every note, however many lines the message runs to

  Rule: the markdown names each reconciling item in plain words, and the JSON keeps the evidence model's terms

    The Markdown names a phantom claim's row as a cited scenario id with no real scenario, and the
    unnamed claim's row as evidence observations citing no scenario.

    A balanced run's gloss quotes the satisfied outcome's sentence. Wherever the Markdown's prose
    refers to an outcome, it quotes the outcome's sentence, never its handle.

    The JSON keeps the terms `phantom-claim` and `unnamed-claim` as the rows' kinds.

    @unit @SCN-RPT-039
    Scenario: the markdown counts phantom-claim and unnamed-claim rows by the reconciliation model's definitions of them, while the JSON keeps the terms

    @unit @SCN-RPT-040
    Scenario: the markdown's prose refers to an outcome by its sentence, never by its handle

  Rule: the markdown shows each Pending Item, labelled apart from a Reconciling Item and tallied apart from the verdict counts

    @unit @SCN-RPT-041
    Scenario: a row's exceptions cell labels each Pending Item, naming its kind of quality check when it has one, after the row's Reconciling Items

    @unit @SCN-RPT-042
    Scenario: the evidence reconciliation summary tallies the Pending Items on a line of their own after its table, and shows no tally line when there are none

    @unit @SCN-RPT-043
    Scenario: a balanced row carrying a Pending Item reads differently from a clean-balanced row

  Rule: the markdown report explains the Claim Reconciliations table's cells in a key under its heading

    After the section's tally lines and before its table, a key reads each evidence cell as
    obligation/observations: what the letter, the number, a `-`, a blank cell and `—` mean. It also
    reads the Reconciling items and CI steps cells. Where a row's item says its CI step or its job
    sets `continue-on-error`, the key says the name in parentheses after it is its fitness function,
    and what the reader removes or sets to false so the check's red fails the CI run. Each line of
    the key holds for every kind of row the table can show.

    A table with no evidence column carries no key.

    @unit @SCN-RPT-044
    Scenario: a reader finds a key to the evidence cells before the Claim Reconciliations table, and none where the table has no evidence cell

  Rule: the report states every fault in its inputs in one section after its provenance, only when there is one

    Right after "## Run provenance", "## Errors in the inputs" holds the scenario code errors under
    "### Scenario code errors", then the configuration the run could not use under
    "### Configuration not read", in the order the JSON's errors hold them. Each part keeps its own
    introduction and prints only when it holds a fault, and the section prints only when one part
    does.

    @unit @SCN-RPT-077
    Scenario: every fault in the inputs is stated under one Errors in the inputs section after the run provenance, scenario code errors first, and the section is absent when the inputs hold none

  Rule: the report names each specController entry it could not read, before any cut of the reconciliation

    Each line under "### Configuration not read" names its entry by its specController path and
    says what this run did with it. Every account in the report is the one the target gives without
    it. Each entry and workflow name the report quotes, here and in the step accounting, is shown
    whole in its code span: as written, or as its quoted string where a code span cannot hold it as
    written.

    @unit @SCN-RPT-045
    Scenario: each specController entry of a kind its reader does not take is named on a line of its own, after the run provenance and before any cut of the reconciliation

    @unit @SCN-RPT-046
    Scenario: each key the specController block does not read is named in one sentence, after the entries of the wrong kind

    @unit @SCN-RPT-053
    Scenario: each runners key outside the four layers is named under Configuration not read, after the keys the specController block does not read

    @unit @SCN-RPT-078
    Scenario: a notChecks entry that matches no step of a workflow the run read is named by its key under Configuration not read, and an entry naming a workflow the run did not read is not, whatever its workflow file's name holds

    @unit @SCN-RPT-087
    Scenario: a notChecks entry that does not name a workflow, a job and a step is named under Configuration not read as not naming a step

    @unit @SCN-RPT-088
    Scenario: each configuration entry and workflow name the report quotes is shown whole in its code span: a backtick as written, and a line break, spaces at both edges, nothing but spaces, an empty value or enclosing quotes as its quoted string

  Rule: the step-accounting section is the one account of the CI steps read, a row per workflow and job read, with the steps behind its Runners, Reconciler, Excluded and GitHub plumbing counts listed beneath

    Under "## Summary views", the "### Step accounting" section is the report's one section about
    the CI steps the run read. Its table has a row per workflow and job read, in the step
    accounting's order, with the columns Workflow, Job, Steps read, Candidates, Runners, Reconciler,
    Excluded, GitHub plumbing and Accounted for. When more than one job was read, a Total row
    follows. Each Workflow and Job cell holds its name whole, a pipe or a backslash escaped and a
    run of whitespace read as one space.

    Beneath the table, each column other than Candidates that counts a step lists the steps behind
    it, under the column's name: Runners, Reconciler, Excluded and GitHub plumbing, in that order. A
    list follows the table's rows, and each job's steps in the order they were read. A reconciler
    step says what it does. An excluded step says the target names it a non-check, one line for each
    step an entry matches. A column that counts no step lists nothing. After the excluded steps,
    each notChecks entry naming a workflow the run did not read is listed as not applied, under a
    label naming the workflows the run read. Each step a list names is shown whole in its code span:
    as written, or as its quoted string where a code span cannot hold it as written.

    When the run reads no CI step, the section holds the not-applied list alone, with no table. Its
    label names the workflows the run read, or says it read none. The section is absent when the run
    reads no CI step and has nothing to list as not applied.

    @unit @SCN-RPT-052
    Scenario: the step-accounting section tables a row per workflow and job read, and a total row when more than one job was read

    @unit @SCN-RPT-072
    Scenario: the step-accounting section lists each step that runs a declared runner beneath its table, and lists none when no step runs one

    @unit @SCN-RPT-050
    Scenario: the step-accounting section lists each reconciler step beneath its table with what it does, and lists none for a pipeline that runs no reconciliation

    @unit @SCN-RPT-048
    Scenario: the step-accounting section lists each excluded step beneath its table with its reason, and lists none when the target names no non-check

    @unit @SCN-RPT-090
    Scenario: a notChecks entry naming a workflow whose name holds a colon excludes that workflow's step

    @unit @SCN-RPT-089
    Scenario: a well-formed notChecks entry naming a workflow the run did not read is listed beneath the step accounting's table as not applied, with every workflow the run read named beside it, one whose jobs only call another workflow included, and none is listed when every entry names a workflow the run read

    @unit @SCN-RPT-091
    Scenario: a run that reads no CI step lists each notChecks entry naming a workflow it did not read under the step accounting as not applied, with no table, under a label naming the workflows it read or saying it read none

    @unit @SCN-RPT-073
    Scenario: the step-accounting section lists each GitHub plumbing step beneath its table, and lists none when no step is plumbing

    @unit @SCN-RPT-092
    Scenario: the step-accounting section defines its Candidates, Reconciler, Excluded, GitHub plumbing and Accounted for columns before its table, and prints no definition when it prints no table

  Rule: the report lists each scenario code error under Scenario code errors, only when the corpus holds one, worded from the error's own values

    @unit @SCN-RPT-055
    Scenario: a foreign-scn-code is listed by its handle under Scenario code errors, worded from its values with the one file or the several files carrying the named code, before the summary views

    @unit @SCN-RPT-056
    Scenario: a duplicate-feature-code is listed by its handle, worded from the shared code and the files that carry it

    @unit @SCN-RPT-057
    Scenario: a no-feature-code is listed by its handle, worded from the file that carries no feature code

    @unit @SCN-RPT-058
    Scenario: a foreign-scn-code whose named code no file carries is worded with no file to move to, naming no header tag or file the corpus lacks

    @unit @SCN-RPT-059
    Scenario: a several-scn-codes error is listed by its handle, worded from its file, its scenario and its codes

    @unit @SCN-RPT-060
    Scenario: the section counts its errors, one in the singular and several with their number, then lists each on its own line in the order judged

    @unit @SCN-RPT-061
    Scenario: a scenario carrying several codes is framed in the section and the run verdict as a scenario no account was raised for, never as a misfiling whose accounts reconcile

  Rule: the report states a corpus's scenario codes clean only over the files it judged, with the counts the run recorded

    @unit @SCN-RPT-062
    Scenario: clean scenario codes are stated after the run verdict under the summary views, with the run's count of feature files and of feature codes, no scenario code errors section prints, and nothing is stated when no corpus was judged

    @unit @SCN-RPT-063
    Scenario: a corpus with no feature file is stated, after the run verdict, as no feature file judged, never as clean

    @unit @SCN-RPT-064
    Scenario: the report states how many scenarios the corpus holds and how many codes more than one carries, and names the scenarios sharing each code

  Rule: a shared code's Claim Reconciliations each name their scenario

    Two scenarios sharing one @SCN code have a row each under that code. Each row's reconciling item
    names the feature file and title of the scenario it reconciles, so the two rows differ only in
    that name.

    @unit @SCN-RPT-070
    Scenario: each Claim Reconciliation of a shared code names, in its reconciling items, the feature file and title of the scenario it reconciles
