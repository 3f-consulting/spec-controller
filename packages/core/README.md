# @3f-consulting/spec-controller-core

**The reconciliation engine behind `spec-controller`, as a pure library.**

Feature files and the facts each evidence report gives go in. An Evidence Reconciliation comes out. This package never reads a file, spawns a process, looks at the clock or writes to a stream. The [`spec-controller`](https://www.npmjs.com/package/spec-controller) package is built on this one. File reading, git, the run's time, output routing and the command line live there.

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
const creditJournal = observationsOfTestResults(resultsByFileFrom(vitestReport), targetFolder);

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

- `featureAsWrittenFrom` reads one feature file as written: its tags, and each scenario's tags, title and Examples. It throws on a file the Gherkin parser rejects.
- `executableClaimsOf` reads the executable claims off the feature files, and the **Evidence Obligations** each claim's tags raise, under the deferral tags you configure and whether the run is strict.
- `resultsByFileFrom` reads a Vitest or Jest JSON report as its test results, and `observationsOfTestResults` posts them as **Evidence Observations**. Each cites the claim codes its test cites, and is placed relative to the target's folder.
- `claimReconciliationsOf` takes the executable claims as the debit journal and the Evidence Observations as the credit journal, posts each observation to its claim, a phantom claim or the unnamed claim, and reconciles each claim into a **Claim Reconciliation**.
- `evidenceReconciliationOf` gives the whole: the Claim Reconciliations, the run verdict, the totals, the provenance, and the step account, the errors in the inputs and the run integrity when the run has them. With no CI, the step account is empty, as here: `stepAccountOf([])`.

Everything else the package exports is a variation on these steps.

## What it exports

The package publishes exactly one entrypoint. It is a barrel that exports the following.

- **Read the inputs as written.** Each reader returns what its input says. Each report's reader has a `where…Break` beside it, which says where the report first breaks the shape its tool writes, or nothing when it holds:
  - feature files: `featureAsWrittenFrom`;
  - test reports: `resultsByFileFrom` (Vitest and Jest JSON), `resultsBySuiteFrom` (JUnit XML, from pytest, gotestsum, Maven Surefire or Gradle, given as text, with `whyXmlDoesNotParse`), `resultsByExampleFrom` (RSpec JSON) and `scenarioResultsFrom` (Cucumber JSON);
  - CI: `workflowStepsFrom`, which reads one workflow's steps, and `stepRecordFrom`, which reads a run's `toJSON(steps)` record;
  - the target's `package.json`: `targetConfigurationFrom`, which reads its `specController` block, and `scriptsFrom`, its scripts;
  - `shellAnswers`, which says whether a step's command runs a given command, and `repositoryOfOrigin`, which names the repository a git origin points to.

  `resultsBySuiteFrom` takes which tool wrote the report. The two differ in one way: how an `<error>` on an ordinary test reads. From JUnit it posts as failed. From pytest it posts as never ran, because pytest writes an `<error>` for an error in a test's setup or teardown.
- **Post the claims and the evidence**: `executableClaimsOf`; `observationsOfTestResults`, which posts a report's test results, and `observationsByExample` and `observationsOfScenarios`, which post an RSpec or Cucumber report as written; and `fitnessObservationsOf`, which posts the CI steps that are fitness functions. `stepDispositionOf` says what a CI step is: the reconciler, a non-check, plumbing, a runner or a fitness function.
- **Reconcile**: `claimReconciliationsOf`, then `evidenceReconciliationOf`, which gives the whole Evidence Reconciliation. Its `runVerdict` is one of `balanced`, `out-of-balance`, or `not-reconciled`. A `not-reconciled` verdict has a `why` of `unsound`, `claim-code-errors` or `nothing-to-reconcile`. `stepAccountOf` works out the step account from each CI step and what it is. The CLI takes its exit code from the run verdict.
- **Claim codes**: `isFeatureCode`, `featureCodeOfFile`, `writtenClaimCode`, `claimCodeErrorsOf`, and `allocationOf`, which gives the next claim code for a feature code from the code occurrences you read.
- **Report**: `markdownReportOf` and `jsonReportOf`, and `textFor`, which fills a message catalogue's text for a code.
- **Plan output**: `outputPlanOf`, which takes the requested reports with the identity of each place, and the inputs' identities, and refuses more than one report on standard output, two reports on one file, or a report on a file the run reads.
- **Provenance**: `provenanceOf`, which settles what a run used from what was read: a target given wins over the origin's repository, and a source SHA given wins over the commit checked out; a tool installed as a package has no commit of its own. `targetFolderOf` picks the target's folder: the top of the git repository, or outside git the named corpus's parent, or with none named the working folder.

The package also exports the types these functions take and return. A type nested inside one of them, such as a Claim Reconciliation inside an Evidence Reconciliation, is reached through its parent.

## Stability

The entrypoint's exports are the whole public surface, and the contract you build on. **Nothing checks it for drift.** Nothing compares the surface with a written list, so adding a symbol to the barrel or dropping one turns no build red. A generated API report will be adopted at `1.0`, with a compatibility promise. The package is at a `0.x` version and makes no compatibility promise; see [`docs/compatibility.md`](https://github.com/3f-consulting/spec-controller/blob/main/docs/compatibility.md). Pin an exact version.

Source, issues and history: [github.com/3f-consulting/spec-controller](https://github.com/3f-consulting/spec-controller).

## Licence

MIT — see [`LICENSE`](https://github.com/3f-consulting/spec-controller/blob/main/packages/core/LICENSE) in this package. © 2026 3F Consulting Ltd.
