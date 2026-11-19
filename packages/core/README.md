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
  featureAsWrittenFrom,
  resultsByFileFrom,
  executableClaimsOf,
  observationsOfTestResults,
  claimReconciliationsOf,
  claimCodeErrorsOf,
  provenanceOf,
  repositoryOfOrigin,
  evidenceReconciliationOf,
  markdownReportOf,
  stepAccountOf,
} from "@3f-consulting/spec-controller-core";

// One feature file's text, and one Vitest JSON report parsed from its text, both read from the target's folder.
// The target's folder: a path the report records below it is shown relative to it.
const targetFolder = "/work/shop";
const featureSource = readFileSync(`${targetFolder}/features/checkout.feature`, "utf8");
const vitestReport: unknown = JSON.parse(readFileSync(`${targetFolder}/vitest-report.json`, "utf8"));
const features = [featureAsWrittenFrom("checkout.feature", featureSource)];
const debitJournal = executableClaimsOf(features, { deferralTags: [], strict: false });
const creditJournal = observationsOfTestResults(resultsByFileFrom(vitestReport), targetFolder, "unit");

const evidenceReconciliation = evidenceReconciliationOf({
  claimReconciliations: claimReconciliationsOf(debitJournal, creditJournal),
  claimCodeErrors: claimCodeErrorsOf(features),
  configurationErrors: [],
  features,
  stepAccount: stepAccountOf([]),
  provenance: provenanceOf(
    { givenTarget: "acme/shop", toolVersion: "0.1.0", runTime: "2026-01-01T00:00:00Z" },
    [{ name: "features", path: "/work/shop/features" }],
    targetFolder,
    repositoryOfOrigin,
  ),
});

evidenceReconciliation.runVerdict; // { verdict: "balanced" } while every claim's evidence arrived and passed
markdownReportOf(evidenceReconciliation);
```

- `featureAsWrittenFrom` reads one feature file into its scenarios: its tags, and each scenario's tags, title and Examples, including each Outline row's `clm` cell. It throws if the Gherkin parser rejects the file.
- `executableClaimsOf` reads the executable claims off the feature files, and the **Evidence Obligations** that each claim's tags raise. It takes the deferral tags you configure and whether the run is strict.
- `resultsByFileFrom` reads a Vitest or Jest JSON report into test results. `observationsOfTestResults` posts them as **Evidence Observations**. Each observation cites the claim codes its test cites, and is placed relative to the target's folder.
- `claimReconciliationsOf` takes the executable claims as the debit journal and the Evidence Observations as the credit journal. It posts each observation to its claim, to a phantom claim or to the unnamed claim. Then it reconciles each claim into a **Claim Reconciliation**.
- `evidenceReconciliationOf` gives the whole: the Claim Reconciliations, the run verdict, the totals and the provenance. It also gives the step account, the errors in the inputs and the run integrity when the run has them. With no CI the step account is empty, as here: `stepAccountOf([])`.

Everything else the package exports is a variation on these steps.

## What it exports

The package publishes exactly one entrypoint: a barrel that exports the following.

- **Read the inputs.** Each reader translates its tool's format into the domain's words. A test's status becomes passed, failed or never ran. A CI step's `continue-on-error` becomes whether the run may allow its failure. The step record's outcomes become each step's result. Beside each report's reader is a `where…Break`. It says where the report first breaks the shape its tool writes, or gives nothing if the report matches that shape.
  - feature files: `featureAsWrittenFrom`;
  - test reports: `resultsByFileFrom` (Vitest and Jest JSON), `resultsBySuiteFrom` (JUnit XML, from pytest, gotestsum, Maven Surefire or Gradle, given as text, with `whyXmlDoesNotParse`), `resultsByExampleFrom` (RSpec JSON) and `scenarioResultsFrom` (Cucumber JSON);
  - evidence report formats: `EVIDENCE_REPORT_FORMATS` lists the six report formats above, one entry for each. An entry gives the format's flag and its value, whether it parses as JSON or as XML, its `where…Break` and its reader, the endings it reads in a folder if it reads one, whether its results need the feature files, and its default layer;
  - CI: `workflowStepsFrom` reads one workflow's steps, and `stepRecordFrom` reads a run's `toJSON(steps)` record;
  - the target's `package.json`: `targetConfigurationFrom` reads its `specController` block, and `scriptsFrom` reads its scripts;
  - `shellAnswers` says whether a step's command runs a runner, through the target's scripts, and whether it runs `spec-controller balance`. `repositoryOfOrigin` names the repository a git origin points to.

  `resultsBySuiteFrom` takes the tool that wrote the report. JUnit and pytest differ in one way: how an `<error>` on an ordinary test reads. From JUnit it posts as failed. From pytest it posts as never ran, because pytest writes an `<error>` for an error in a test's setup or teardown.
- **Post the claims and the evidence**: `executableClaimsOf`; `observationsOfTestResults`, which posts a report's test results at its format's default layer, unless the layers its report serves are given; and `fitnessObservationsOf`, which posts the CI steps that are fitness functions. For a Cucumber report, `observationsOfTestResults` also takes the feature files, where an Outline row's claim code is. `stepDispositionOf` says what a CI step is: the reconciler, a non-check, plumbing, a runner or a fitness function. `disposedStepsOf` gives each of a run's CI steps with what it is, once. `fitnessObservationsOf` and `stepAccountOf` both take its answer.
- **Reconcile**: `claimReconciliationsOf`, then `evidenceReconciliationOf`, which gives the whole Evidence Reconciliation. Its `runVerdict` is one of `balanced`, `out-of-balance`, or `not-reconciled`. A `not-reconciled` verdict has a `why` of `unsound`, `claim-code-errors` or `nothing-to-reconcile`. `stepAccountOf` works out the step account from each CI step and what it is, as `disposedStepsOf` gives them. The CLI takes its exit code from the run verdict.
- **Claim codes**: `isFeatureCode`, `featureCodeOfFile`, `writtenClaimCode`, `claimCodeErrorsOf`, and `allocationOf`. `allocationOf` gives the next claim code for a feature code, from the code occurrences you read.
- **Report**: `markdownReportOf` and `jsonReportOf`, and `textFor`, which fills a message catalogue's text for a code.
- **Plan output**: `outputPlanOf` takes the requested reports, with the identity of each place, and the inputs' identities. It refuses more than one report on standard output, two reports on one file, or a report on a file the run reads.
- **Provenance**: `provenanceOf` settles what a run used from what was read. A target given wins over the origin's repository. A source SHA given wins over the commit checked out. A tool installed as a package has no commit of its own. `targetFolderOf` picks the target's folder: the top of the git repository; outside git, the named corpus's parent; with no corpus named, the working folder.

The package also exports the types these functions take and return. A type nested inside one of them, such as a Claim Reconciliation inside an Evidence Reconciliation, is reached through its parent.

## Stability

The entrypoint's exports are the whole public surface, and the contract you build on. **Nothing checks it for drift.** Nothing compares the surface with a written list, so adding or dropping a symbol in the barrel turns no build red. The package is at a `0.x` version and makes no compatibility promise; see [`docs/compatibility.md`](https://github.com/3f-consulting/spec-controller/blob/main/docs/compatibility.md). A generated API report, with a compatibility promise, will be adopted at `1.0`. Pin an exact version.

Source, issues and history: [github.com/3f-consulting/spec-controller](https://github.com/3f-consulting/spec-controller).

## Licence

MIT — see [`LICENSE`](https://github.com/3f-consulting/spec-controller/blob/main/packages/core/LICENSE) in this package. © 2026 3F Consulting Ltd.
