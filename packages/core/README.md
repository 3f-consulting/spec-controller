# @3f-consulting/spec-controller-core

**The reconciliation engine behind `spec-controller`, as a pure library.**

Scenarios and Evidence Observations go in. An Evidence Reconciliation comes out. This package never reads a file, spawns a process, looks at the clock or writes to a stream. The [`spec-controller`](https://www.npmjs.com/package/spec-controller) package is built on this one. File reading, git-derived provenance, output routing and the command line live there.

**Use this package** to build your own tooling around the reconciliation: a service, an editor integration, a different front end, or a pipeline that already has the reports in memory. **Use `spec-controller`** when you want a command to put in CI.

Requires Node ≥ 22.12. ESM only.

## Install

```
npm install @3f-consulting/spec-controller-core
```

## Your first call

```ts
import {
  parseFeatureCorpus,
  parseVitestEvidenceObservations,
  evidenceReconciliationOf,
  targetConfigurationFrom,
  provenanceFrom,
  shellReading,
  renderMarkdown,
} from "@3f-consulting/spec-controller-core";

// One .feature file's text, and one already-parsed Vitest JSON report.
// The target's folder: a test file the report records at an absolute path below it is placed relative to it.
const root = "/work/shop";
const corpus = parseFeatureCorpus([{ file: "checkout.feature", source: featureSource }]);
if (corpus.kind === "unparseable") throw new Error(corpus.faults[0].message);

const evidenceReconciliation = evidenceReconciliationOf({
  features: corpus.parsed,
  testObservations: parseVitestEvidenceObservations(vitestReport, root),
  steps: [],
  readings: { scripts: {}, shell: shellReading },
  configuration: targetConfigurationFrom({}, []),
  strict: false,
  provenance: provenanceFrom({ target: "acme/shop", toolVersion: "0.1.0" }, [], root),
});

evidenceReconciliation.runVerdict; // { verdict: "balanced" } while every scenario's evidence arrived and passed
renderMarkdown(evidenceReconciliation);
```

- `parseFeatureCorpus` parses each feature file once. It returns every file, parsed. If any file does not parse, it returns instead the fault of each file that did not, in the parser's own words. `evidenceReconciliationOf` reads two things off the parsed files: the executable claims, and the **Evidence Obligations** that each claim's tags raise.
- `parseVitestEvidenceObservations` turns a test report into the **Evidence Observations** it reports. Each observation cites the claim codes its test cites, and gives its place relative to the target's folder.
- `evidenceReconciliationOf` sets the two sides against each other. It returns a **Claim Reconciliation** per claim, the totals, the run verdict and the provenance. `steps`, `readings` and `configuration` pass in the CI workflows' steps and the target's `specController` block. With no CI, they are empty, as here.

Everything else the package exports is a variation on these steps.

## What it exports

The package publishes exactly one entrypoint. It is a barrel that exports the following.

- **Parse**:
  - scenarios: `parseFeatureCorpus`, which parses the feature files once; and `claimCodesAtOf`, which maps a Cucumber report's lines back to the claim codes the corpus has at those lines;
  - evidence: `parseVitestEvidenceObservations`; `parseJunitEvidenceObservations` and `parsePytestEvidenceObservations`, which both read a JUnit XML report that you have already parsed into objects, from pytest, gotestsum or another runner; `parseRspecEvidenceObservations`, which reads RSpec's JSON report; and `parseCucumberEvidenceObservations`;
  - workflows and steps: `parseWorkflows`, which parses the CI workflows once; `pipelineStepsOf`, which reads the parsed workflows; `recordedCheckStepsOf`, which reads a run's step record; and `shellReading`, which says whether a step's command runs a given command;
  - configuration: `targetConfigurationFrom`, which reads a `package.json`'s `specController` block.

  The two JUnit readers differ in one way: how they read an `<error>` on an ordinary test. `parseJunitEvidenceObservations` reads it as a failing Evidence Observation. `parsePytestEvidenceObservations` reads it as never-ran, because pytest writes an `<error>` for an error in a test's setup or teardown.
- **Reconcile**: `evidenceReconciliationOf`, which gives the whole Evidence Reconciliation. Its `runVerdict` is one of `balanced`, `out-of-balance`, or `not-reconciled`. A `not-reconciled` verdict has a `why` of `unsound`, `claim-code-errors` or `nothing-to-reconcile`. The CLI takes its exit code from the run verdict.
- **Claim codes**: `isFeatureCode`, `featureCodeOfFile`, `claimCodeMarksFor` and `nextClaimCode`. These read claim codes and allocate the next one.
- **Render**: `renderMarkdown` and `renderJson`, and `messagesFrom` for a message catalogue of your own.
- **Plan output**: `outputPlanOf`, which turns the requested reports into a plan, refusing a format the tool does not write or more than one report on standard output; and `outputClashOf`, which refuses a plan that puts two reports on one file, or a report on a file the run reads.
- **Provenance**: `runIdentityOf`, which settles a run's identity from what was read (a source SHA the run was given wins over the commit checked out; a tool installed as a package has no commit of its own); `provenanceFrom`, which records what a run was without asking the filesystem what it is; and `targetFolderOf`, which picks the target's folder: the working folder when no corpus is named, else the top of the git repository the corpus's folder is in, else that folder.

The package also exports the types the CLI names. A type nested inside one of them, such as a Claim Reconciliation inside an Evidence Reconciliation, is reached through its parent.

## Stability

The entrypoint's exports are the whole public surface, and the contract you build on. **Nothing checks it for drift.** Nothing compares the surface with a written list, so adding a symbol to the barrel or dropping one turns no build red. A generated API report will be adopted at `1.0`, with a compatibility promise. The package is at a `0.x` version and makes no compatibility promise; see [`docs/compatibility.md`](https://github.com/3f-consulting/spec-controller/blob/main/docs/compatibility.md). Pin an exact version.

Source, issues and history: [github.com/3f-consulting/spec-controller](https://github.com/3f-consulting/spec-controller).

## Licence

MIT — see [`LICENSE`](https://github.com/3f-consulting/spec-controller/blob/main/packages/core/LICENSE) in this package. © 2026 3F Consulting Ltd.
