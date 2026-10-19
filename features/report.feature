@RPT
Feature: The report renders the ledger as sectioned facts

  The report renders the reconciled ledger as facts, in sections: the run provenance first, the
  summary views opening with the run verdict, and the scenario reconciliations last.
  It states facts only, with no interpretation, editorial or cross-run comparison.

  Rule: the markdown report opens with a run-provenance header

    The markdown report opens with a "## Run provenance" section, ahead of the per-scenario
    table. It states the target repo, the input paths and flags actually used, the run-start
    time in UTC, the target's source SHA, and the tool's own SHA and version. A missing
    source SHA reads "unknown (non-git target)". A missing tool SHA reads "unknown (not a
    git checkout)", and the version is still shown.

    The "Target repo:" line is the --target value verbatim, never resolved and never guessed
    from a path. Without --target it reads "unknown-target" and also names the target's git
    origin beside it, never in place of it.

    @unit @SCN-RPT-001
    Scenario: the markdown report opens with a Run provenance header whose Target repo is the --target value verbatim, defaulting to unknown-target and naming the git origin beside it

  Rule: the JSON report carries a provenance object

    The JSON report carries a top-level run provenance object beside the reconciliation body,
    its summary and ledger. It holds the same run facts as the
    markdown header: the target, the source SHA, the tool's own SHA and version, the UTC run
    timestamp, and the input paths and flags actually used.

    @unit @SCN-RPT-002
    Scenario: the JSON report carries a provenance object stating target, source SHA, tool SHA, tool version, UTC timestamp, and inputs, with the reconciliation body intact

  Rule: an explicit source SHA wins, and a non-git target resolves to unknown

    An explicit, non-empty source SHA given by the override flag wins over any git read.
    With no override and a target that is not a git repository, the source SHA is recorded
    as unknown and the run completes.

    @unit @SCN-RPT-003
    Scenario: an explicit source SHA overrides the git read, and a non-git target with no override resolves to unknown

  Rule: the markdown report renders the evidence reconciliation as a subjects-rows table with balanced and out-of-balance columns

    Under "## Summary views", the "### Evidence reconciliation" section renders one table.
    Its rows are the subjects, Scenario Reconciliation and Quality Check Reconciliation,
    each with its own Total. Its columns are balanced and out-of-balance. Nothing in it is
    bold.

    The Scenario Reconciliation row counts every row of the collection: real, phantom and
    suspense. Phantom and suspense rows are always out of balance, so a run whose only
    out-of-balance row is the suspense row reads N+1 | N | 1. This out-of-balance count
    agrees with the balance verdict and with the exit code.

    The Quality Check Reconciliation row counts every quality check reconciliation on every
    row, phantom and suspense included, and an evidence observation that answers no evidence
    obligation included. It is therefore not a count of evidence obligations. Its
    out-of-balance count is broken down in place into nested "↳" cause rows that fill the
    out-of-balance column only, are always shown even at zero, and sum to it. The missing
    row's Detail splits the missing quality check reconciliations by quality check, fitness
    first: a behavioural check by its bare level, a fitness check as "fitness".

    The two out-of-balance counts differ by granularity. A scenario with two missing arms is
    one out-of-balance Scenario Reconciliation and two out-of-balance Quality Check
    Reconciliations.

    @unit @SCN-RPT-004
    Scenario: the markdown report renders the evidence reconciliation as subjects-rows with balanced and out-of-balance columns

  Rule: the markdown report surfaces the fitness evidence obligations as their own section

    Under "## Summary views", the "### Fitness evidence obligations" section lists the
    fitness evidence obligations on their own. It opens with a total line, "N of M fitness
    evidence obligations reconcile satisfied.", then a table listing each fitness evidence
    obligation by its scenario and its outcome, including any 🍉 watermelon. The section has
    no check column, and it labels obligations by the quality check, fitness, never by an
    internal kind. When no scenario raises a fitness evidence obligation, the section is
    left out entirely.

    @unit @SCN-RPT-005
    Scenario: the markdown report lists the fitness evidence obligations as their own section

  Rule: the markdown report groups out-of-balance scenarios by feature

    Under "## Summary views", the "### Out-of-balance by feature" section shows which
    features hold the out-of-balance scenarios. It opens with a total line, "N of M scenario
    rows out of balance, grouped by feature.", then a "Feature | Count | Out-of-balance @SCN ids"
    table with one row per feature and its count. Balanced scenarios are left out. A
    scenario's feature is the feature code in its @SCN code. The Feature cell reads "<full
    name> (<code>)", where the full name is the name of the feature file carrying that code.
    A code that no feature file carries shows as the bare code, and every code does when a
    report is re-rendered from saved JSON that carries no feature names.

    The total line accounts for every out-of-balance row. Phantom-claim and
    unnamed-claim rows name no feature file, so they are not grouped; the sentence
    states each of their out-of-balance counts as not grouped by feature, and its numbers
    add up to the header's out-of-balance count and total. The section is left out only when
    no Scenario Reconciliation is out of balance. When only ungrouped rows are, it states
    them and has no table.

    A scenario with no @SCN code counts on the row of the feature file it sits in: under the
    file's header code when the file has one, and under the file's name when it has none.
    Its cell states how many such scenarios the row holds rather than naming them; the
    untagged-scenario list names each one. A re-render from the saved JSON groups them the
    same way.

    @unit @SCN-RPT-006
    Scenario: the by-feature cut names each out-of-balance feature in full, falling back to the bare code for a foreign-scn-code

    @unit @SCN-RPT-030
    Scenario: the by-feature total line counts the out-of-balance rows no feature can group, even when they are the only ones

    @unit @SCN-RPT-031
    Scenario: a feature file's scenarios carrying no @SCN code count together on one row named by that file, never one row each

    @unit @SCN-RPT-032
    Scenario: a scenario carrying no @SCN code in a file headed by a feature code counts on that feature's row

  Rule: the ledger's scenario count is the corpus census, and the report has no census section

    The report has no census section under any name. Every scenario is a ledger row, and a
    scenario with no obligation is a both-missing row, so the ledger's scenario count ("- N
    Scenario Reconciliation(s): …") is the corpus census. The excluded-occurrence bullet
    sits in the ledger summary.

    @unit @SCN-RPT-007
    Scenario: the corpus census is recoverable from the ledger summary alone

  Rule: the report outcomes the excluded non-tag @SCN occurrences on both surfaces

    The report states "N @SCN ids seen in non-tag context, excluded": the difference between
    the raw @SCN code occurrences in the feature source, in prose, comments and step text,
    and the codes read as scenarios. It appears on both surfaces, as a bullet in the
    markdown ledger summary and in the JSON evidence-obligations object.

    @unit @SCN-RPT-008
    Scenario: the report outcomes the excluded non-tag @SCN occurrences on both surfaces

  Rule: the report renders summary-first, ledger-last

    The report is titled "# Evidence Reconciliation", never "Ledger". "## Run provenance"
    comes first. "## Summary views" holds the derived cuts, opening with Run verdict, then
    Evidence reconciliation and Test volume, and ending with Fitness evidence obligations and
    Out-of-balance by feature. "## Scenario Reconciliations" comes last, with its summary lines
    on top: the verdict tally and the excluded-occurrence bullet. The layout is markdown only; the
    JSON is unaffected. Every reconciling item is labelled by its tag, the bare level for a
    behavioural check (unit, integration, …) and "fitness" for a fitness check, never by an
    internal kind.

    @unit @SCN-RPT-009
    Scenario: the markdown report renders summary-first with the scenario reconciliations last

  Rule: the report reconciles the test evidence observation — raw = attributed + suspense

    Under "## Summary views", the "### Test volume" cut counts the observed test evidence
    observations. It opens with the identity "N evidence observations = a on scenarios + b
    on cited scenario ids with no real scenario + c citing no scenario", which always
    balances. A phantom scenario is an @SCN code no scenario carries; the suspense scenario
    holds observations with no @SCN code. A table by level follows, always listing all four
    levels, with e2e and performance shown at zero when empty. The raw per-level totals and the three
    per-account counts are also on the JSON; the identity line is markdown only.

    @unit @SCN-RPT-010
    Scenario: the report renders the Test volume cut and the evidence observation identity balances by construction

  Rule: the per-scenario ledger shows the evidence backing each evidence obligation

    Each ledger row has evidence columns between Scenario and Verdict: Fitness first, then
    Unit, Integration, E2e and Performance, each present only when some scenario in the run
    obligates or observes that check. Each cell is two-sided,
    `<obligation>/<observation>`. The left side is the check's letter (F, U, I, E or P) when
    the scenario obligates that check, else `-`. The right side is the number of evidence
    observations posted at that check, passing or failing, else `-`. So `letter/N` is
    obligated and observed, `letter/-` is obligated and missing, `-/N` is observed at a
    check the scenario never named, and a cell with neither is blank.

    The cell counts backing, not quality: a failing observation still counts, and its
    failure shows in the Verdict and Reconciling-items columns. The Fitness cell's left side
    is a single F, since a scenario names at most one fitness function; its right side
    counts the fitness evidence observations posted, as the other cells do. A key to the cells
    precedes the table wherever it has an evidence column.
    The columns are markdown only.

    A `-/N` cell counts every observation the scenario received at that check, duplicate
    citations included. An observation citing a pending obligation, such
    as @unitpending, reconciles the same way and also renders `-/N`.

    @unit @SCN-RPT-011
    Scenario: the ledger row shows corpus-driven evidence columns with the two-sided cell encoding

    @unit @SCN-RPT-054
    Scenario: a fitness function whose step ran and failed shows as one observation in its Fitness cell, as a failed test does in its column

  Rule: the ledger summary counts the untagged scenarios, and each is listed once, on its own ledger row

    The ledger summary states how many scenarios carry no @SCN code. Each one is named once,
    by its `feature-file : scenario` locator, on its own ledger row. Every scenario header
    counts, including outlines, templates and examples, but an Examples data table does not.
    The JSON evidence-obligations object carries the untagged scenarios beside the excluded
    occurrences.

    @unit @SCN-RPT-014
    Scenario: the ledger summary counts the untagged scenarios, and each is named once, on its own ledger row

  Rule: a cross-repo reconcile relativises paths against the target repo root, not the run cwd

    Provenance inputs and evidence-observation locators are relative to the target repo's
    root, never to the directory the run was started from, so neither surface carries the
    target's absolute paths. The root is the git top level of the parent of the --features
    path when the target is a git repository, else that parent directory itself, else the
    run's working directory for a self-reconcile with no --features.

    @unit @integration @SCN-RPT-016
    Scenario: a cross-repo reconcile run from a foreign cwd yields zero absolute paths on both surfaces
      Given a target repo outside the run's working directory whose Vitest and Cucumber reports carry absolute test-file locators under that repo
      When balance reconciles it from a foreign working directory and saves the reconciliation in markdown and JSON
      Then the saved reconciliation, in both markdown and JSON, carries none of the target's absolute paths — the evidence-observation locators are repo-relative and the input paths record relative to the target root

  Rule: the report's evidence-observation views level a behavioural observation by the cited scenario's tag

    A behavioural observation is levelled by the cited scenario's own tier tag, in the
    report's views as in the reconciliation. A Cucumber run of an @e2e scenario counts at
    e2e in Test volume and in the scenario's E2e cell, and one tagged both @integration
    and @e2e counts in both tiers.

    @unit @SCN-RPT-017
    Scenario: an @e2e-via-cucumber observation is counted at e2e across the report views

    @unit @SCN-RPT-018
    Scenario: an @integration @e2e-via-cucumber observation is counted in both tiers across the views

  Rule: the Quality Check Reconciliation out-of-balance decomposes into a flat list of the ten leaf outcomes, with no group-side subtotal rows

    The Quality Check Reconciliation out-of-balance count in the Evidence reconciliation
    table breaks down into a flat list of the ten out-of-balance outcomes, each a counted "↳
    <outcome>" row, in this order: missing, failing, watermelon, no-scn-code,
    duplicate-scn-code, cites-unknown-scenario, cites-no-scenario, no-evidence-obligation,
    broken, both-missing. Their counts sum to the out-of-balance total. No debit-side,
    credit-side or neither-side subtotal row appears. Every outcome except satisfied has a
    row.

    @unit @SCN-RPT-019
    Scenario: the Quality Check Reconciliation summary lists the ten leaf outcomes summing to the out-of-balance total, with no group rows

  Rule: the markdown renders each outcome's sentence in place of the bare handle

    The markdown shows each outcome's sentence in place of its handle wherever an outcome
    reaches a reader: the "↳" rows of the Evidence reconciliation summary, each scenario's
    reconciling items, and the Outcome column of the fitness evidence obligations table. "↳
    missing" reads "↳ Evidence Observation is missing". The glyph stays: "unit ∅ missing"
    reads "unit ∅ Evidence Observation is missing", and "🍉 watermelon" reads "🍉 Evidence
    Observation is passing but its check could not fail its job". The Detail column
    shows no sentence. The JSON keeps the bare handle.

    @unit @SCN-RPT-020
    Scenario: the markdown renders each outcome's sentence, not the bare handle

  Rule: the gloss for every outcome is its sentence, verbatim

    Every outcome has a gloss, and the gloss is the outcome's sentence, verbatim.

    @unit @SCN-RPT-025
    Scenario Outline: the <handle> outcome glosses as its sentence, verbatim

      Examples:
        | handle                 | sentence                                                                                                                 |
        | satisfied              | Evidence Observation satisfies its Evidence Obligation                                                                    |
        | missing                | Evidence Observation is missing                                                                                          |
        | failing                | Evidence Observation is failing                                                                                          |
        | watermelon             | Evidence Observation is passing but its check could not fail its job                                                      |
        | no-scn-code            | Evidence Obligation has no @SCN code for an Evidence Observation to link to                                               |
        | duplicate-scn-code     | Evidence Obligation's @SCN code is carried by another Scenario                                                            |
        | cites-unknown-scenario | Evidence Observation cites an unknown Scenario                                                                            |
        | cites-no-scenario      | Evidence Observation cites no Scenario                                                                                    |
        | no-evidence-obligation             | Evidence Observation cites a Scenario with no matching Evidence Obligation                                                |
        | broken                 | Evidence Observation ATTEMPT errored before its proof ran (behaviour never exercised)                                     |
        | both-missing           | Evidence Obligation and Evidence Observation are both missing — the Scenario is untagged and uncited                     |

  Rule: the report surfaces broken evidence as a harness failure, and stamps the run unsound

    A broken observation is a proof that never ran, such as a Vitest suite that failed to
    collect or a Cucumber step that two step definitions match. The markdown does three
    things for it that a missing row cannot.

    It names the broken evidence by the locator the runner gave it, a test file or a feature
    file. It prints what broke: the message appears verbatim, in a fenced block, in the
    run-integrity section, and the suspense row's broken item carries the same locator and
    the message's first line. Where the runner gives its own message, the report shows it
    unchanged. Where it gives none, as for an ambiguous Cucumber step, the report shows a
    diagnosis built from what the runner reported. Either way it names what failed and
    where, in one shape, and never reports one kind of break as the other.

    It stamps the run "unsound" under a "## Run integrity: unsound" heading. It tells the reader
    that any missing outcome in the run may be a proof that exists but did not run, not a
    test still to write.

    The report names what broke and prints the message without prescribing a cure. The one
    remedy it gives is to fix the harness and regenerate. A run with no broken evidence has
    no run-integrity section. The section is markdown only.

    @unit @SCN-RPT-021
    Scenario: the markdown names the broken evidence and its error, and stamps the run unsound

    @unit @SCN-RPT-065
    Scenario: a check step that did not run is worded by what the record said, skipped, ended with another outcome or carrying none, prefixed by the code it cites

  Rule: the summary opens with the run's verdict

    The summary opens with the run's verdict in one line, so a run that exits non-zero never
    opens with a line that reads as a pass. The verdict agrees with the "## Run integrity:
    unsound" stamp and with the Pending Items line. It is decided in the same order as the
    exit code: broken evidence first, then out of balance, then pending items. Unsound names
    exit 4, out-of-balance names exit 1, and balanced names exit 0. Under --strict, a
    balanced run carrying pending items reads pending and names exit 3. Without --strict, it
    reads balanced and names exit 3 only conditionally, as "exit 3 under --strict". The verdict
    line is always present.

    @unit @SCN-RPT-022
    Scenario: the summary opens with the run verdict and the exit code it maps to

  Rule: a proof that never ran is attributed to no scenario, even when it cites one

    A broken observation discharges and fails no obligation, even when it cites a real
    scenario, as an ambiguous Cucumber step does. It is posted to suspense and counted
    there, not as attributed to that scenario. Fitness observations are not counted in Test
    volume.

    @unit @SCN-RPT-023
    Scenario: a broken observation citing a real scenario counts as suspense, not attributed to that scenario

  Rule: the reconciliation collection renders as "Scenario Reconciliation(s)", never "scenario(s)", on every surface that names it

    The report names the reconciled collection "Scenario Reconciliation(s)", never
    "scenario(s)", in both places it appears: the Subject cell of the collection's row in
    the Evidence reconciliation table, and the verdict tally under "## Scenario
    Reconciliations". The tally counts every row, real, phantom and suspense.

    @unit @SCN-RPT-024
    Scenario: the reconciliation collection is named "Scenario Reconciliation(s)" on every surface, never "scenario(s)"

  Rule: the tool identity is the tool's OWN checkout — an installed tool has none, whatever repository it is sitting inside

    The tool SHA is the HEAD of the tool's own checkout, never the target's. A tool
    installed under node_modules has no checkout of its own, so it reports no tool SHA, even
    when it sits inside a git repository. A tool reached through a node_modules symlink to a
    checkout of itself reports that checkout's HEAD. The version, read from the tool's own
    package manifest, is always shown, so a run stays attributable without a SHA.

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

    The Run provenance Inputs block lists the canonical inputs the run was handed, in
    canonical order. The optional fitness stream comes last, after --package-json. A run
    lists exactly the inputs it was handed. Both surfaces show the same inputs the reconcile
    consumed. A run handed no inputs reads "Inputs: none specified".

    @unit @SCN-RPT-027
    Scenario: the Inputs block names the optional fitness stream when the run received it

    @unit @SCN-RPT-028
    Scenario: a canonical input the run did not receive is named as absent rather than omitted, so silence is never the answer
      The canonical inputs the run did not receive are named on a line of their own,
      separate from the Inputs list. That line appears only when an input is absent. The
      JSON provenance object carries nothing for it.

  Rule: an evidence observation that answers no evidence obligation shows its own result

    On a phantom row, and on a scenario's row at a check where the scenario holds no
    obligation, each observation is listed by its outcome and where it ran, with its own
    result, failed or passed, beside the outcome's glyph and sentence. The suspense row
    counts its results by file instead, under the Rule below.

    @SCN-RPT-034 @unit @e2e
    Scenario: a test that cites a scenario no feature carries shows on its phantom row as failed or passed, as it ran
      Given a target with two tests that cite a scenario no feature carries, one that failed and one that passed
      When the target's evidence is reconciled into a report
      Then the phantom row shows the test that failed as failed
      And the phantom row shows the test that passed as passed

    @SCN-RPT-035 @unit @e2e
    Scenario: a test observed at a check its scenario holds no obligation for shows as failed or passed, as it ran
      Given a target with two tests that cite a scenario holding no obligation at the check they ran at, one that failed and one that passed
      When the target's evidence is reconciled into a report
      Then the scenario's row shows the test that failed as failed
      And the scenario's row shows the test that passed as passed

  Rule: the suspense row groups what ran by where it ran, counting what passed and naming what failed

    The suspense row groups its observations that cite no scenario by the file they ran in,
    with the CI steps as one group of their own, listed after the files. Each group counts
    what ran, passed and failed. It names each failed test, by its test title or Cucumber
    scenario name, and each CI step, which holds no result. Broken items are listed
    individually. The grouping is not stored; the JSON carries each observation's test name.

    @SCN-RPT-033 @unit @e2e
    Scenario: tests that cite no scenario are grouped on the suspense row by the file they ran in, each group counting how many ran, passed and failed
      Given a target whose tests that cite no scenario ran in two files, one file holding a test that failed and a test that passed
      When the target's evidence is reconciled into a report
      Then the suspense row lists each of the two files once
      And each file's entry counts how many of its tests ran, how many passed and how many failed
      And the counts of tests that ran add up to the count of evidence observations that cite no scenario

    @SCN-RPT-036 @unit @e2e
    Scenario: a failed test that cites no scenario is named on the suspense row by its test title
      Given a target whose tests that cite no scenario ran in two files, one file holding a test that failed and a test that passed
      When the target's evidence is reconciled into a report
      Then the file's entry on the suspense row names the test that failed by its title
      And the file's entry does not name the test that passed

    @SCN-RPT-037 @unit @e2e
    Scenario: a failed Cucumber scenario that cites no scenario is named on the suspense row by its scenario name
      Given a target whose Cucumber scenarios that cite no scenario ran in one feature file, one that failed and one that passed
      When the target's evidence is reconciled into a report
      Then the feature file's entry on the suspense row names the Cucumber scenario that failed by its name
      And the feature file's entry does not name the Cucumber scenario that passed

    @SCN-RPT-038 @unit @e2e
    Scenario: the CI steps that cite no scenario are grouped together on the suspense row, each named
      Given a target whose CI runs two checks that cite no scenario, beside a test that cites no scenario
      When the target's evidence is reconciled into a report
      Then the suspense row lists the CI steps together once, after the test's file
      And the CI steps' entry names each of the two checks
      And what the suspense row counts adds up to the count of evidence observations that cite no scenario

  Rule: the markdown names each reconciling item in plain words, and the JSON keeps the evidence model's terms

    The Markdown names phantom-claim rows as cited scenario ids with no real scenario, and
    the unnamed-claim row as evidence observations citing no scenario. A balanced run's
    gloss quotes the satisfied outcome's sentence. Where the Markdown's prose refers to an
    outcome, it quotes the outcome's sentence, never its handle. The JSON keeps the terms
    `phantom-claim` and `unnamed-claim` as the rows' kinds.

    @unit @SCN-RPT-039
    Scenario: the markdown counts phantom-claim and unnamed-claim rows by the reconciliation model's definitions of them, while the JSON keeps the terms

    @unit @SCN-RPT-040
    Scenario: the markdown's prose refers to an outcome by its sentence, never by its handle

  Rule: the markdown shows each Pending Item, labelled apart from a Reconciling Item and tallied apart from the verdict counts

    @unit @SCN-RPT-041
    Scenario: a row's exceptions cell labels each Pending Item, naming its quality check when it has one, after the row's Reconciling Items

    @unit @SCN-RPT-042
    Scenario: the evidence reconciliation summary tallies the Pending Items on a line of their own after its table, and shows no tally line when there are none

    @unit @SCN-RPT-043
    Scenario: a balanced row carrying a Pending Item reads differently from a clean-balanced row

  Rule: the markdown report explains its evidence cells in a key under the Scenario Reconciliations heading

    After the section's tally lines and before its table, a key reads each evidence cell as
    obligation/observations: what the letter, the number, a `-`, a blank cell and `—` mean.
    A table with no evidence column carries no key.

    @unit @SCN-RPT-044
    Scenario: a reader finds a key to the evidence cells before the Scenario Reconciliations table, and none where the table has no evidence cell

  Rule: the report names each specController entry it could not read, before any cut of the reconciliation

    @unit @SCN-RPT-045
    Scenario: each specController entry of a kind its reader does not take is named on a line of its own, after the run provenance and before any cut of the reconciliation

    @unit @SCN-RPT-046
    Scenario: each key the specController block does not read is named in one sentence, after the entries of the wrong kind

  Rule: the report accounts for fitness-function discovery, each account in a section of its own that is absent when it has nothing to say

    @unit @SCN-RPT-047
    Scenario: the discovery-scope section tables each workflow and job read with its steps and candidates, and is absent for a target with no pipeline

    @unit @SCN-RPT-048
    Scenario: the excluded-steps section lists each step the target names a non-check with its reason, and is absent when the target names none

    @unit @SCN-RPT-049
    Scenario: the fitness-functions section counts the fitness functions that run and those no scenario cites, and is absent when the report carries no fitness-function axis

    @unit @SCN-RPT-050
    Scenario: the reconciler section names each reconciler step with what it does, and is absent for a pipeline that runs no reconciliation

    @unit @SCN-RPT-051
    Scenario: the runner-tier account says a tier the target names null has no runner and a tier it omits is unnamed, and is absent when every tier is named

    @unit @SCN-RPT-052
    Scenario: the step-accounting section tables each count and states that every step read is accounted for, a saved run with no plumbing count reading nought in that cell

    @unit @SCN-RPT-053
    Scenario: the unrecognised-runner-key section names each runners key outside the four tiers, beneath the tiers the target recognises

  Rule: the report lists each scenario code error in a section of its own, before the summary views, worded from the error's own values

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
    Scenario: clean scenario codes are stated with the run's count of feature files and of feature codes, with no count for a saved report that recorded none, and the section is absent when no corpus was judged

    @unit @SCN-RPT-063
    Scenario: a corpus with no feature file is stated as no feature file judged, never as clean

    @unit @SCN-RPT-064
    Scenario: the report states how many scenarios the corpus holds in how many accounts and names the scenarios sharing each code, a code to a line, and says nothing of sharing when no code is shared
