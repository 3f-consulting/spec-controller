# @3f-consulting/spec-controller-core

**The reconciliation engine behind `spec-controller`, as a pure library.**

Scenarios and evidence observations go in; a ledger comes out. Nothing in this package reads a file, spawns a process, looks at the clock or writes to a stream. File reading, git-derived provenance, output routing and the command line live in the [`spec-controller`](https://www.npmjs.com/package/spec-controller) package, which is built on this one.

**Use this package** to build your own tooling around the reconciliation: a service, an editor integration, a different front end, or a pipeline that already holds the reports in memory. **Use `spec-controller`** when you want a command to put in CI.

Requires Node ≥ 22. ESM only.

## Install

```
npm install @3f-consulting/spec-controller-core
```

## Your first call

```ts
import {
  parseFeatureCorpus,
  scenariosOf,
  parseVitestEvidenceObservations,
  reconcile,
  isBalanced,
} from "@3f-consulting/spec-controller-core";

// One .feature file's text, and one already-parsed Vitest JSON report.
const corpus = parseFeatureCorpus([{ file: "features/checkout.feature", source: featureSource }]);
if (corpus.kind === "unparseable") throw new Error(corpus.faults[0].message);
const scenarios = corpus.parsed.flatMap((feature) => scenariosOf(feature));
const observed = parseVitestEvidenceObservations(vitestReport);

const ledger = reconcile(scenarios, observed);
isBalanced(ledger); // false while any scenario names evidence that did not arrive
```

- `parseFeatureCorpus` parses each feature file once. It returns every file parsed or, if any file does not parse, each file's fault in the parser's own words. `scenariosOf` reads the `@SCN` code and the tags naming its kinds of quality check off each parsed scenario and turns them into the **obligations** the scenario names.
- `parseVitestEvidenceObservations` turns a test report into the **observations** that posted back, each citing the `@SCN` it claims.
- `reconcile` sets the two sides against each other and gives an answer per scenario.

Everything else the package exports is a variation on these three steps.

## What it exports

The package publishes exactly one entrypoint, a barrel that exports the following.

- **Parse**:
  - scenarios: `parseFeatureCorpus`, which parses the feature files once; `scenariosOf`, `untaggedScenariosOf` and `featureCountsOf` over a parsed file; `corpusCountsOfFeatures` over the parsed files; and `countScnOccurrences` over a file's text;
  - evidence: `parseVitestEvidenceObservations`; `parseJunitEvidenceObservations` and `parsePytestEvidenceObservations`, both over a JUnit XML report you have already parsed into objects, from pytest, gotestsum or another runner; `parseRspecEvidenceObservations`, over RSpec's JSON report; and `parseCucumberEvidenceObservations`;
  - workflows: `parseWorkflows`, which parses the CI workflows once;
  - the readers for fitness functions, and for what a pipeline's steps actually ran.

  The two JUnit readers differ in how they read an `<error>` on an ordinary test: `parseJunitEvidenceObservations` reads it as a failing observation, and `parsePytestEvidenceObservations` reads it as broken, as pytest's setup error.
- **Reconcile**: `reconcile` for the ledger, `evidenceReconciliationOf` for the ledger plus its summary, and `evidenceReconciliationFromSources` for the whole composition over the parsed feature files, the parsed workflows and the other sources you have already read.
- **Ask the ledger**: `isBalanced`, `hasPendingItems`, `hasBrokenEvidence` and `hasNothingToReconcile`, the four questions a caller decides on. The run verdict itself is on the report: `assembleRenderInput` names it at `summary.runVerdict`, and the CLI reads its exit code from there.
- **Render**: `renderMarkdown`, `renderJson`, `renderReport`, `renderReportFromJson`, and `assembleRenderInput` if you want the payload rather than a string. `assembleSavedReport` turns a saved JSON report back into a report and works its run verdict out afresh. A report saved without a verdict, or re-rendered under `--strict`, therefore states the verdict a run would.
- **Provenance**: the pure subset, which records what a run was without asking the filesystem what it is.

The types these functions take and return are exported alongside them, so a consumer can name any value it holds.

## Stability

What the entrypoint exports is the whole public surface, and the contract you build on. **Nothing checks it for drift.** The surface is not checked against a written list, so adding a symbol to the barrel or dropping one turns no build red. A generated API report will be adopted at `1.0`, with a compatibility promise. The package is at a `0.x` version and makes no compatibility promise; see [`doc/compatibility.md`](https://github.com/3f-consulting/spec-controller/blob/main/doc/compatibility.md). Pin an exact version.

Source, issues and history: [github.com/3f-consulting/spec-controller](https://github.com/3f-consulting/spec-controller).

## Licence

MIT — see [`LICENSE`](https://github.com/3f-consulting/spec-controller/blob/main/LICENSE) in the repository. © 2026 3F Consulting Ltd.
