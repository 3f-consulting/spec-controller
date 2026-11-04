@RMD
Feature: The reconciliation is one whole-document report model, serialised to spec-reconciliation.json

  The reconciliation is ONE whole-document report model — the ordered sections of the
  document as data — and the machine file is that model serialised glue-free:
  the JSON file is the assembled model handed straight to the serialiser, with no per-key hand-assembly.
  Its top-level keys, in document order, are runProvenance, then errors when the inputs hold a
  fault, then summary and claimReconciliations. The scenario codes sit in the summary, straight
  after its run verdict. There is no
  `warnings` key: a zero-evidence scenario is a both-missing row on the ledger, not a separate
  axis. The machine file is spec-reconciliation.json, the machine form of the WHOLE document
  beside spec-reconciliation.md, and the markdown renderer reads the same assembled model, so
  the JSON key names live in the assembler and nowhere else.

  Rule: the reconciliation publishes as one glue-free whole-document report model

    The foundation. One report model, assembled from the reconciliation and the facts of the
    run, is serialised glue-free as spec-reconciliation.json. Its summary is materialised: the
    totals the markdown's trial-balance table shows. There is no `warnings` key: a zero-evidence scenario is a both-missing row on
    the ledger. Each fact is stated once: a fault in the inputs only under errors, a fact of the
    corpus only under scenarioCodes, and the summary carries no fault. Its unit tests
    hold the assembly and the glue-free serialisation in isolation.

    And its summary totals count EVERY Claim Reconciliation. The Evidence
    Reconciliation is all Claim Reconciliations assembled, and the summary is its
    totals (docs/ubiquitous-language.md, The evidence model). Three claim kinds — scenario, phantom
    claim, unnamed claim — and a phantom claim's or the unnamed claim's reconciliation is ALWAYS
    out-of-balance, so they count into the total and into out-of-balance; `phantomClaim` /
    `unnamedClaim` survive as sub-counts, a BREAKDOWN of the total rather than a bucket outside it
    (scenarios = total − phantomClaim − unnamedClaim). Tallying scenario rows only would let a run
    whose unnamed claim's row is out of balance, and so exits 1, show a tally reading 0
    out-of-balance: a headline that reads as a pass. Counting every row keeps the tally and the
    exit code in agreement.

    @unit @SCN-RMD-001
    Scenario: the reconciliation publishes as spec-reconciliation.json, one glue-free serialisation of a single whole-document report model that states each fact once, whose summary totals count every Claim Reconciliation

    @unit @SCN-RMD-029
    Scenario: the JSON report's summary states the run verdict first, on a fresh run and on a saved report concluded again

  Rule: the ledger is the detail beside the summary's totals

    The document is the Evidence Reconciliation, and its detail is the Ledger, the Claim
    Reconciliations: the summary has the totals and the Claim Reconciliations the detail. They
    are not called scenarios, because a phantom claim or the unnamed claim is not a scenario.

    @unit @SCN-RMD-002
    Scenario: the Claim Reconciliations sit at the report's top level beside the Summary

    @unit @SCN-RMD-030
    Scenario: each Claim Reconciliation carries its claim, kind, verdict, Quality Check Reconciliations and pending items and nothing else

  Rule: a Claim Reconciliation carries each of its entries once, inside its Quality Check Reconciliations, named by the claim it reconciles

    A Claim Reconciliation carries its claim, its kind, its verdict, its Quality Check
    Reconciliations and its pending items, and nothing else. Its claim names what the row
    reconciles: a scenario's @SCN code, the unknown code a phantom claim's evidence cites, the
    unnamed claim, or, for a scenario carrying no @SCN, its feature file and title.

    @unit @SCN-RMD-020
    Scenario: each Claim Reconciliation names the claim it reconciles: a scenario's @SCN, a phantom claim's cited code, the unnamed claim, and a scenario with no @SCN by its feature and title

  Rule: the summary states its evidence reconciliation, and its evidence observations over every kind of quality check

    The numbers the markdown prints are model data, not renderer arithmetic. The summary states
    the evidence reconciliation as one section: the Claim Reconciliations counted by verdict and
    by kind of claim, the Quality Check Reconciliations counted by outcome with the missing ones
    by kind of quality check, and the pending items counted. No fitness-only tally stands beside it: the
    fitness Quality Check Reconciliations are counted there with the rest. The summary states
    its evidence observations as one section: the total, the
    counts on each kind of claim, and a count for each of the five kinds of quality check, fitness last.
    A behavioural count is every evidence observation of that layer, a broken one
    included; the fitness count is every fitness function that ran. The total is the sum of the
    five counts and the sum of the counts on each kind of claim, on the persisted file too. A layer
    names the steps the step accounting counts as runners of the runner the target declares for it,
    one entry for each step and in the step accounting's order, whatever its count. A step the
    target names a non-check, and the reconciler's own step, is never one of them, whatever it
    runs. Fitness names the step behind each fitness function that ran, where one step runs it, in
    the same order; a fitness observation that did not run names no step here. A layer names the runner the
    target declares for it, whatever its count and whatever steps were found: null where the
    target names none, and no runner where it has not said. Its unit tests hold the assembled summary and the persisted
    file in isolation.

    @unit @SCN-RMD-005
    Scenario: the summary states its evidence reconciliation: its Claim Reconciliations, Quality Check Reconciliations and pending items counted

    @unit @SCN-RMD-003
    Scenario: the summary counts the evidence observations of each of the five kinds of quality check, fitness included, by the kind of claim each posts to, and their total is the five counts' sum

    @unit @SCN-RMD-015
    Scenario: each kind of quality check in the summary's evidence observations names its CI steps in the step accounting's order, one entry for each step: a layer the steps the step accounting counts as its runners, never a non-check or the reconciler's own, and the runner the target declares for it, or none where the target names none, whatever its count; fitness the step behind each fitness function that ran

    @unit @SCN-RMD-027
    Scenario: each fitness evidence observation names the CI step it was observed at, as workflow, job and step, and names none where no single step carries its code

  Rule: the summary states the out-of-balance view by feature, each feature named by its feature file

    The summary groups each out-of-balance scenario under its feature, in ledger order. An entry
    names its feature by the feature code, or by the feature file for a scenario with no @SCN in
    a file that carries no code. It carries its feature file, the file's path under the corpus as
    the rest of the report names a file, where its file has a code, the out-of-balance @SCN codes,
    the count of scenarios with no @SCN where there are any, and its total. A phantom claim and
    the unnamed claim belong to no feature and sit in no entry. The view is absent when no
    scenario is out of balance. Its unit tests hold the assembled summary and the JSON the CLI
    writes.

    @unit @SCN-RMD-006
    Scenario: the summary's out-of-balance view groups each out-of-balance scenario under its feature, named by its code and feature file

  Rule: the markdown regenerates from a saved spec-reconciliation.json alone

    The load-bearing proof that the JSON IS the model. A seam reads a saved
    spec-reconciliation.json, parses it back into the report model, and renders the human markdown
    through the markdown renderer — no run context, no live inputs, the JSON alone: the package's
    exported render-from-JSON function, and the CLI's "--render-from-json <path>" mode, which reads the
    file, prints the regenerated markdown to stdout, and exits before any reconcile, on the code
    the saved verdict names. Drift-equality is the acceptance: the markdown regenerated from the
    saved JSON EQUALS the markdown rendered directly from the same run, the by-feature feature
    files included. Its unit tests hold the parse→render drift-equality over a corpus spanning
    the whole document (the three-way evidence observations line, the materialised summary totals, and a coded
    out-of-balance feature, so the by-feature feature files have teeth), and the CLI, run over a
    fixture whose by-feature cut names a coded feature, reconciles, saves the JSON, and regenerates
    from it the markdown it rendered directly, exiting the code the saved run exited.

    @unit @SCN-RMD-007
    Scenario: the markdown regenerates from a saved spec-reconciliation.json byte-identical to the direct render, and exits the code its saved verdict names

  Rule: each evidence sub-row is keyed by one flat coordinate, its kind of quality check

    The evidence coordinate is ONE flat kind of quality check ∈ {fitness, unit, integration, e2e,
    performance}: fitness is one kind of quality check, not a second axis. So each sub-row of
    claimReconciliations[].qualityCheckReconciliations[] is keyed by qualityCheckKind alone,
    and the summary's missing split, missingByQualityCheckKind under the reconciliationLines
    of the summary's evidence reconciliation, counts the missing Reconciliation lines by the same flat
    kind of quality check: an obligation answered only by a broken observation is one missing line
    beside the broken one, so it counts once. One reconcile function
    serves every kind of quality check, and the fitness value is what tells a watermelon apart. The
    glossary names the kind of quality check fitness, and lint is on its Double-check line
    (docs/ubiquitous-language.md, Kind of quality check). The markdown labels each item by its tag word, which IS the kind of quality check
    value, so the round-trip holds. Its unit tests hold the reconcile → assemble shape in
    isolation.

    @unit @SCN-RMD-008
    Scenario: each quality-check reconciliation carries a single kind of quality check as its coordinate, and the missing split counts the missing Reconciliation lines by it

  Rule: a row reads its evidence in one order, whatever order the runner reported it in

    A runner decides the order its report lists files in, and vitest's changes between two runs
    over one unchanged tree. So the books read the evidence in an order the evidence itself
    fixes: kind of quality check in layer order with fitness last, then location, then the scenario cited,
    then everything else the evidence observation says. A row's posted evidence observations, and the evidence observation a reconciliation
    names (the first FAILED evidence observation in evidence order or, where none failed, the first), are then
    a function of what was observed, never of the order it arrived in.

    @unit @SCN-RMD-009
    Scenario: two runs whose runner listed its files in different orders write the same report, each row's evidence ordered by kind of quality check then by location

  Rule: a behavioural evidence observation carries the name its runner gave the test

    The unnamed claim's row names what failed, and it regenerates from the saved JSON alone, so the name
    travels on the evidence observation itself. Each parser translates its runner's name for the
    test into one neutral field at the edge: a Vitest test's full name, or its title where it has
    none, and a Cucumber scenario's name. No runner's shape reaches the domain. The JSON serialises
    the report model as it is, so the name reaches spec-reconciliation.json with no JSON-side code.
    Its unit tests parse a Vitest report and a Cucumber report, reconcile them and read each
    observation's name back off the JSON; the CLI, run over a target that ran both, saves the JSON
    with each observation named.

    @SCN-RMD-010 @unit @e2e
    Scenario: the JSON report carries each test's name on its evidence observation, from Vitest and Cucumber alike
      Given a target whose tests that cite no scenario ran under Vitest and under Cucumber
      When the target's evidence is reconciled and saved as the JSON report
      Then the JSON report's evidence observation for the Vitest test carries the test's title as its name
      And the JSON report's evidence observation for the Cucumber scenario carries the scenario's name as its name

  Rule: the summary's step accounting holds a row per workflow and job read, with the steps behind its runners, reconciler, non-check and plumbing counts

    The summary's step accounting states every CI step the run read, and what it counted each
    step as. It holds one row per workflow and job, ordered by workflow and then by job, each
    compared character by character. Each row carries the steps read, and how many of them are
    candidates, runners, reconciler steps, non-checks and plumbing. Its total sums each of
    those counts over the rows.
    It names each reconciler step with its role, each step the target calls a non-check, and
    the steps behind its runners and plumbing counts, each list holding exactly the steps its
    count counts. Each list of steps follows the rows' order, and each job's steps the order
    they were read. The summary states the CI steps the run read there alone.
    A run that reads no CI step has a step accounting only when a notChecks entry names a workflow
    it did not read. It then holds those entries, the workflows read, no row and a zero total.

    @unit @SCN-RMD-012
    Scenario: the step accounting carries a row per workflow and job read, with its steps read and each disposition's count, ordered by workflow and then job compared character by character whatever the locale, and none for a run that reads no CI step and has no notChecks entry naming a workflow it did not read

    @unit @SCN-RMD-028
    Scenario: a run that reads no CI step carries each notChecks entry naming a workflow it did not read in its step accounting, with every workflow it read, no row and a zero total

    @unit @SCN-RMD-023
    Scenario: the step accounting's total sums each count over its rows, one per workflow and job

    @unit @SCN-RMD-013
    Scenario: the step accounting names the steps the target calls non-checks, and none for a target that names no step a non-check

    @unit @SCN-RMD-014
    Scenario: the step accounting names each reconciler step with its role, and none for a pipeline that runs no reconciliation

    @unit @SCN-RMD-024
    Scenario: the step accounting names the steps behind its runners and plumbing counts, each list holding exactly the steps its count counts

    @unit @SCN-RMD-025
    Scenario: the summary states the CI steps the run read in its step accounting alone, carrying no discovery scope, reconciler or non-check steps beside it

    @unit @SCN-RMD-026
    Scenario: every list of the steps behind a count follows the step accounting's rows, so reading the workflows in another order changes neither the rows nor the lists

  Rule: the summary carries scenario code errors beside the ledger, and they never alter it

    @unit @SCN-RMD-016
    Scenario: a corpus with a misfiled code reconciles to the same ledger and summary as its correctly filed twin, and differs only in its scenario code errors

  Rule: the JSON report carries the run's conclusions as the Markdown states them

    The JSON report is the run's result, so it names the run verdict. A machine reading it
    never works the verdict out from the ledger.

    @unit @SCN-RMD-017
    Scenario Outline: the JSON report's summary names the <verdict> run verdict, the one the Markdown's verdict headline states

      Examples:
        | verdict              |
        | balanced             |
        | out-of-balance       |
        | unsound              |
        | pending              |
        | nothing-to-reconcile |
        | scenario-code-errors |

  Rule: the JSON report's structure is stated by a JSON Schema the published package ships

    The published package carries spec-reconciliation.schema.json, which states every key the JSON report may carry. A report balance writes validates against it with a JSON Schema validator, whichever outcomes, claims and accounts its inputs give it. A report missing a key the schema requires, or carrying a key it does not name, does not.

    @e2e @SCN-RMD-019
    Scenario Outline: real balance runs' JSON reports validate against the JSON Schema the package ships, the every-outcome corpus's and a pipeline target's, and one missing a required key or carrying an unnamed one does not
      Given <target>
      When the target's evidence is reconciled and saved as the JSON report
      Then the JSON report validates against the JSON Schema the published package ships
      And the JSON report with its ledger removed is refused because the schema requires the ledger
      And the JSON report with a key the schema does not name added is refused because the schema does not name that key

      Examples:
        | target                                                                                                                       |
        | a target whose tests that cite no scenario ran under Vitest and under Cucumber                                               |
        | a target whose evidence reconciles to every outcome there is                                                                 |
        | a target whose pipeline runs its unit tests and a fitness check, under its named runner, two of whose scenarios share a code |

  Rule: the JSON report states every fault in its inputs in one place, present only when there is one, and the corpus's own facts in another

    @unit @SCN-RMD-021
    Scenario: the JSON report carries a top-level errors key only when its inputs hold a fault, with the scenario code errors and each kind of configuration fault beneath it

    @unit @SCN-RMD-022
    Scenario: the JSON report carries the corpus's own facts in one place: its feature files and codes, the @SCN occurrences it excludes, the scenarios carrying no code and the codes scenarios share
