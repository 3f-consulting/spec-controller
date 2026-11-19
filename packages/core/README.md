# @3f-consulting/spec-controller-core

**The reconciliation engine behind `spec-controller`, as a pure library.**

You give it feature files and the facts from each evidence report. It gives back an Evidence Reconciliation. It never reads a file, spawns a process, looks at the clock or writes to a stream. The [`spec-controller`](https://www.npmjs.com/package/spec-controller) package is built on this one, and does those jobs: file reading, git, the run's time, output routing and the command line.

**Use this package** to build your own tooling around the reconciliation: a service, an editor integration, a different front end, or a pipeline that already has the reports in memory. **Use `spec-controller`** when you want a command to put in CI.

Requires Node ≥ 22.12. ESM only.

## Install

```
npm install @3f-consulting/spec-controller-core
```

## Your first call

```ts
import { readFileSync } from "node:fs";
import {
  configurationSettingsNamed,
  featureAsWrittenFrom,
  markdownReportOf,
  reconcile,
  repositoryOfOrigin,
  resultsByFileFrom,
  scriptsFrom,
  shellAnswers,
} from "@3f-consulting/spec-controller-core";

// One feature file's text, one Vitest JSON report and the target's package.json, each parsed from its text, all read
// from the target's folder. A path the report records below that folder is shown relative to it.
const targetFolder = "/work/shop";
const featureSource = readFileSync(`${targetFolder}/features/checkout.feature`, "utf8");
const vitestReport: unknown = JSON.parse(readFileSync(`${targetFolder}/vitest-report.json`, "utf8"));
const manifest: unknown = JSON.parse(readFileSync(`${targetFolder}/package.json`, "utf8"));

const evidenceReconciliation = reconcile({
  features: [featureAsWrittenFrom("checkout.feature", featureSource)],
  reports: [{ results: resultsByFileFrom(vitestReport), layers: ["unit"], needsFeatures: false }],
  steps: [],
  stepRecord: [],
  settings: configurationSettingsNamed({ runners: { unit: ["vitest:vitest:vitest-report.json"] }, nonChecks: [], deferralTags: [] }),
  scripts: scriptsFrom(manifest),
  shell: shellAnswers,
  repositoryOf: repositoryOfOrigin,
  identity: { givenTarget: "acme/shop", toolVersion: "0.1.0", runTime: "2026-01-01T00:00:00Z" },
  provenanceInputs: [{ name: "features", path: "/work/shop/features" }],
  targetFolder,
  strict: false,
});

evidenceReconciliation.runVerdict; // { verdict: "balanced" } while every claim's evidence arrived and passed
markdownReportOf(evidenceReconciliation);
```

- `featureAsWrittenFrom` reads one feature file into its scenarios: its tags, and each scenario's tags, title and Examples, including each Outline row's `clm` cell. It throws if the Gherkin parser rejects the file.
- `resultsByFileFrom` reads a Vitest or Jest JSON report into test results. Each report goes to `reconcile` with two things: the layers of the runners whose report it is, and whether its results need the feature files, as a Cucumber report's do.
- `configurationSettingsNamed` reads the runners, non-checks and deferral tags a run names on its command line into its settings, and `scriptsFrom` reads the scripts in the target's `package.json`.
- `reconcile` gives the whole **Evidence Reconciliation**: the Claim Reconciliations, the run verdict, the totals, the step account, the provenance, the errors in the inputs and the run integrity. It checks the settings against the CI steps and the reports, and says what each CI step is. It reads the executable claims and their **Evidence Obligations** off the feature files. It posts each report's results and each fitness function's step as **Evidence Observations**. It reconciles each claim into a **Claim Reconciliation**. With no CI, as here, the steps, the step record and the step account are empty.

Everything else the package exports is a variation on these steps.

## What it exports

The package publishes exactly one entrypoint: a barrel that exports the following.

- **Read the inputs.** Each reader translates its tool's format into the domain's words. A test's status becomes passed, failed or never ran. A CI step's `continue-on-error` becomes whether the run may allow its failure. The step record's outcomes become each step's result. Beside each report's reader is a `where…Break`. It says where the report first breaks the shape its tool writes, or gives nothing if the report matches that shape.
  - feature files: `featureAsWrittenFrom`;
  - test reports: `resultsByFileFrom` (Vitest and Jest JSON), `resultsBySuiteFrom` (JUnit XML, from pytest, gotestsum, Maven Surefire or Gradle, given as text, with `whyXmlDoesNotParse`), `resultsByExampleFrom` (RSpec JSON) and `scenarioResultsFrom` (Cucumber JSON);
  - evidence report formats: `EVIDENCE_REPORT_FORMATS` lists the six report formats above, one entry for each. An entry gives the format's name, as a runner's long form names it, whether it parses as JSON or as XML, its `where…Break` and its reader, the endings it reads in a folder if it reads one, and whether its results need the feature files;
  - CI: `workflowStepsFrom` reads one workflow's steps, each with its working directory and the variables its `env` sets, and `stepRecordFrom` reads a run's `toJSON(steps)` record;
  - the settings a run names: `configurationSettingsNamed` reads its runners, non-checks and deferral tags, and `reportsLocatedOf` gives each runner named alone the evidence reports the CI steps that run it name, read through `shellAnswers.reportsNamed`, each path joined with its step's working directory;
  - the target's `package.json`: `scriptsFrom` reads its scripts;
  - `shellAnswers` says whether a step's command runs a runner, through the target's scripts, and whether it runs `spec-controller balance`; its `reportsNamed` gives the evidence reports the command names for a runner, from its options and the variables the step sets. `repositoryOfOrigin` names the repository a git origin points to.

  `resultsBySuiteFrom` takes the tool that wrote the report. JUnit and pytest differ in one way: how an `<error>` on an ordinary test reads. From JUnit it posts as failed. From pytest it posts as never ran, because pytest writes an `<error>` for an error in a test's setup or teardown.
- **Post the claims and the evidence**: `executableClaimsOf`; `observationsOfTestResults`, which posts a report's test results at the layers the report serves; and `fitnessObservationsOf`, which posts the CI steps that are fitness functions. For a Cucumber report, `observationsOfTestResults` also takes the feature files, where an Outline row's claim code is. `stepDispositionOf` says what a CI step is: the reconciler, a non-check, plumbing, a runner or a fitness function. `disposedStepsOf` gives each of a run's CI steps with what it is, once. `fitnessObservationsOf` and `stepAccountOf` both take its answer.
- **Reconcile**: `reconcile` takes what the readers gave and gives the whole Evidence Reconciliation in one call. The steps it runs are exported too: `claimReconciliationsOf`, then `evidenceReconciliationOf`, which assembles the whole from its parts. The Evidence Reconciliation's `runVerdict` is one of `balanced`, `out-of-balance`, or `not-reconciled`. A `not-reconciled` verdict has a `why` of `unsound`, `claim-code-errors` or `nothing-to-reconcile`. `stepAccountOf` works out the step account from each CI step and what it is, as `disposedStepsOf` gives them. The CLI takes its exit code from the run verdict.
- **Claim codes**: `isFeatureCode`, `featureCodeOfFile`, `writtenClaimCode`, `claimCodeErrorsOf`, and `allocationOf`. `allocationOf` gives the next claim code for a feature code, from the code occurrences you read.
- **Report**: `markdownReportOf` and `jsonReportOf`, and `textFor`, which fills a message catalogue's text for a code.
- **Plan output**: `outputPlanOf` takes the requested reports, with the identity of each place, and the inputs' identities. It refuses more than one report on standard output, two reports on one file, or a report on a file the run reads.
- **Provenance**: `provenanceInputsOf` names each input kind the run could read, once for each path it read for it, or once with no path when it read none. `provenanceOf` settles what a run used from what was read, and shows each input's path relative to the target's folder. A target given wins over the origin's repository. A source SHA given wins over the commit checked out. A tool installed as a package has no commit of its own. `targetFolderOf` picks the target's folder: the top of the git repository; outside git, the named corpus's parent; with no corpus named, the working folder.

The package also exports the types these functions take and return. A type nested inside one of them, such as a Claim Reconciliation inside an Evidence Reconciliation, is reached through its parent.

## Stability

The entrypoint's exports are the whole public surface, and the contract you build on. **Nothing checks it for drift.** Nothing compares the surface with a written list, so adding or dropping a symbol in the barrel turns no build red. The package is at a `0.x` version and makes no compatibility promise; see [`docs/compatibility.md`](https://github.com/3f-consulting/spec-controller/blob/main/docs/compatibility.md). A generated API report, with a compatibility promise, will be adopted at `1.0`. Pin an exact version.

Source, issues and history: [github.com/3f-consulting/spec-controller](https://github.com/3f-consulting/spec-controller).

## Licence

MIT — see [`LICENSE`](https://github.com/3f-consulting/spec-controller/blob/main/packages/core/LICENSE) in this package. © 2026 3F Consulting Ltd.
