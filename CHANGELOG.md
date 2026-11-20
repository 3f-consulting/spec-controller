# Changelog

Each line says what a change means for someone using spec-controller. A line that changes what an adopter must do (a flag, a settings key, the JSON report's shape, an exit code) starts with **Breaking:** and says what to change. The newest release comes first.

**Not yet released:**

- What balance does is unchanged: three of the specification's claims (the Summary's deferral line, the JSON schema's version and a missing default settings file) each have a recorded failing run, proving their tests can fail.
- What balance does is unchanged: spec-controller's own build runs the community lint rule `vitest/expect-expect`, so a test in its packages that calls no assertion reds the build.

## 0.1.338 — 2026-11-20 — Easier adoption

- **balance finds the runners it knows.** For a layer the run names no runner for, a workflow step running Vitest, Jest, pytest, RSpec, gotestsum, Maven's or Gradle's test task is read as that layer's runner at its usual layer: unit, or integration for cucumber-js and e2e for Playwright. So one scenario, one test citing it and `--written-claims-only` gate a run with no settings. The report's provenance names each layer's runners and marks the ones balance found, and the JSON report's schema is version 7.
- **Breaking: @3f-consulting/spec-controller-core's `ShellAnswers` gains a required `knownRunners`**, each runner balance knows with its usual layer, and `Provenance` and `RunReconciled` gain a required `runners`. Code that builds them sets the field. `Runner` gains an optional `found`. Added: `runnersFoundOf`, and the types `KnownRunner`, `RunnerFinder` and `ProvenanceRunner`.

## 0.1.335 — 2026-11-20 — Easier adoption

- **balance reads its settings from a file in your repository.** It reads `spec-controller.yml` at the root of your git repository, or the file `--config` names. Its keys are the settings' long names, such as `unit: [vitest]` and `written-claims-only: true`. A setting given on the command line replaces the file's setting of the same name, and paths in the file are read from its folder. A key that names no setting is reported as `configuration-unknown-key`. A file that does not parse as YAML, or is not a mapping of settings, stops the run. An empty one sets nothing. The JSON report's schema version is 6.
- **A step skipped on purpose posts nothing.** Add `JOB_JSON: ${{ toJSON(job) }}` to the step-record dump and write `{"job":…,"steps":…}`, as the user guide's *Wiring into CI* shows. A fitness function's step skipped in a job that succeeded then posts nothing, as a skipped test posts nothing, so a matrix leg that skips a platform-only check reaches a verdict. A step skipped in a job that failed or was cancelled still reads never-ran, and so does a skipped step in a record that holds no job status. The user guide's diagram shows every case.
- **Breaking: @3f-consulting/spec-controller-core's `RecordedStep` gains a required `jobSucceeded`**, and its `result` may be `skipped`. Code that builds a `RecordedStep` sets the field. `stepRecordFrom` reads a record with or without the job.

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

**Before 0.1.330:**

- This changelog starts: from now on, every change to spec-controller is told here in a line, except a dependency update.
- Each release's notes on GitHub are now the lines this changelog gained since the release before.
- balance posts a fitness function's CI step as passed only when the step record says it passed: a step the record does not name is posted as not recorded and credits no claim, and continue-on-error set to anything but false, an expression included, allows failure.
- balance posts a step-record entry that no workflow has with the result its record gives: a failure as failed, a skipped step as never ran, and a success as passed-on-error, since without the workflow it cannot read whether failure was allowed. A report now gives such a step its result alone, and the JSON report's Evidence Observations have no `notes` field.
- What balance does is unchanged: the specification's scenario on continue-on-error is now worded for a step in a workflow balance read, the only steps whose setting balance can read.
- Each published package names its source repository, 3f-consulting/spec-controller, on npm; the link opens once the repository is public.
- No change to the packages: the first release from spec-controller's new repository.
- spec-controller's repository is public, with every commit of its history, and from this release on each release carries its provenance on npm.
- What balance does is unchanged: two specification files read more plainly, one describing reconciliation in fewer words and one with its Rules in the order the report shows them.
