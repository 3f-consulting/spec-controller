# Changelog

Each line says what a change means for someone using spec-controller.

- This changelog starts: from now on, every change to spec-controller is told here in a line, except a dependency update.
- Each release's notes on GitHub are now the lines this changelog gained since the release before.
- balance posts a fitness function's CI step as passed only when the step record says it passed: a step the record does not name is posted as not recorded and credits no claim, and continue-on-error set to anything but false, an expression included, allows failure.
- balance posts a step-record entry that no workflow has with the result its record gives: a failure as failed, a skipped step as never ran, and a success as passed-on-error, since without the workflow it cannot read whether failure was allowed. A report now gives such a step its result alone, and the JSON report's Evidence Observations have no `notes` field.
- What balance does is unchanged: the specification's scenario on continue-on-error is now worded for a step in a workflow balance read, the only steps whose setting balance can read.
- Each published package names its source repository, 3f-consulting/spec-controller, on npm; the link opens once the repository is public.
- No change to the packages: the first release from spec-controller's new repository.
- spec-controller's repository is public, with every commit of its history, and from this release on each release carries its provenance on npm.
- What balance does is unchanged: two specification files read more plainly, one describing reconciliation in fewer words and one with its Rules in the order the report shows them.

## 0.1.330 — 2026-11-20 — Easier adoption

- **Runners are named on the command line.** `--unit`, `--integration`, `--e2e` and `--performance` each name a runner for their layer, and each can be given several times. `--not-check` names a step that is not a check. `--deferral-tag` names a deferral tag.
- **balance finds each runner's report itself.** It looks for the report option on the command of the CI step that runs the runner, or in a `package.json` script that step runs, and reads the path from the step's working directory. This works for Vitest, Jest, pytest, cucumber-js, RSpec, Playwright and gotestsum. For Maven and Gradle it reads their default folders, `target/surefire-reports` and `build/test-results/test`. So `--unit vitest` is the whole setting of a Vitest suite whose CI step writes a report. Name any other report with the long form `<runner>:<format>:<report>`. A runner whose report balance cannot find reads `runner-report-not-named`. A named report with no file at its path reads `runner-report-not-read`.
- **Breaking: the old configuration is gone.** balance reads `package.json` only for its scripts, never a `specController` block. It stops at `--vitest`, `--jest`, `--pytest`, `--junit`, `--rspec` and `--cucumber`, as flags it does not take: move each runner to its layer's flag. The configuration errors `configuration-unknown-key` and `runner-key-not-a-layer` are retired.
- **Gate on the scenarios you have written.** `--written-claims-only` counts only the executable claims in the run verdict. Tests that cite no scenario, or one nobody wrote, are still listed and do not turn the run red. The report's provenance says when the verdict counted only those claims.
- **One step record per CI job.** `--ci-steps` can be given once for each job's record. balance posts a fitness function's step from every record that names it.
- **Broken reports are refused by name.** A Vitest, Jest, Cucumber or RSpec report in which any field its reader reads is missing, null, of the wrong kind, or a status its runner never writes stops the run at exit 2. The error names the report and where it first breaks. A fault in spec-controller's own code stops the run at exit 4, naming the fault.
- **Outcomes are stricter.**
  - A recorded success reads `cannot-fail` when any workflow step carrying its id allows failure.
  - A row of an Examples block with no clm column, in an Outline where another block has one, reads `no-claim-code`.
  - Two of a claim's checks that tie are listed in the order of their tests' titles.
- **The report counts the scenarios a deferral tag set aside.** The Summary has a line for them, and the JSON report's totals carry `deferredScenarios`.
- **The JSON report names its schema's version** in `schemaVersion`. The version rises with every change to the report's structure, and it is 5 in this release.
- **allocate takes `--features <dir>`**, as balance does, and counts only codes written under CLM.
- **Every merge to main publishes under `next`.** A release publishes under `latest`, with one git tag and one GitHub release. `npm i spec-controller` installs the latest release.
- **@3f-consulting/spec-controller-core's API changed.** At 0.x it promises no compatibility.
  - Added: `reconcile`, which turns what the readers gave into the Evidence Reconciliation in one call.
  - Changed: `CiStep` names its fields in the tool's own words and holds its working directory and environment. A `Runner` is a name with an optional `ReportLocation`.
  - Removed: `RunnerEntry`, `layersServing`, `configurationSettingsFrom` and `targetConfigurationFrom`.
  - Newly exported: `JsonReport`, `jsonReportFrom`, `CreditJournal` and `InputDoesNotParse`.
- **The readers are tested against real output.** The Vitest, Cucumber and JUnit readers are tested against reports copied from those tools' own repositories. CI type-checks every TypeScript example in the READMEs.

- What balance does is unchanged: the comment on spec-controller's own duplicate-code CI step states its rule and names no source file, so it cannot name one the tree does not have.
- What balance does is unchanged: spec-controller's own CI refuses a comment in a code, workflow or configuration file that names a TypeScript or JavaScript file, since such a comment goes stale when the file moves.
