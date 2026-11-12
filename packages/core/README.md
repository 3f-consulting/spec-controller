# @3f-consulting/spec-controller-core

**The reconciliation engine behind `spec-controller`, as a pure library.**

Scenarios and Evidence Observations go in; an Evidence Reconciliation comes out. Nothing in this package reads a file, spawns a process, looks at the clock or writes to a stream. File reading, git-derived provenance, output routing and the command line live in the [`spec-controller`](https://www.npmjs.com/package/spec-controller) package, which is built on this one.

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

- `parseFeatureCorpus` parses each feature file once. It returns every file parsed or, if any file does not parse, each file's fault in the parser's own words. `evidenceReconciliationOf` reads the executable claims off the parsed files, and the **Evidence Obligations** each claim's tags raise.
- `parseVitestEvidenceObservations` turns a test report into the **Evidence Observations** it reports, each citing the claim code it cites, at its place relative to the target's folder.
- `evidenceReconciliationOf` sets the two sides against each other: a **Claim Reconciliation** per claim, the totals, the run verdict and the provenance. `steps`, `readings` and `configuration` carry the CI workflows' steps and the target's `specController` block; with no CI they are empty, as here.

Everything else the package exports is a variation on these steps.

## What it exports

The package publishes exactly one entrypoint, a barrel that exports the following.

- **Parse**:
  - scenarios: `parseFeatureCorpus`, which parses the feature files once, and `claimCodesAtOf`, which maps a Cucumber report's lines back to the claim codes the corpus carries there;
  - evidence: `parseVitestEvidenceObservations`; `parseJunitEvidenceObservations` and `parsePytestEvidenceObservations`, both over a JUnit XML report you have already parsed into objects, from pytest, gotestsum or another runner; `parseRspecEvidenceObservations`, over RSpec's JSON report; and `parseCucumberEvidenceObservations`;
  - workflows and steps: `parseWorkflows`, which parses the CI workflows once, `pipelineStepsOf` over them, `recordedCheckStepsOf` over a run's step record, and `shellReading`, which says whether a step's command runs a given command;
  - configuration: `targetConfigurationFrom`, over a `package.json`'s `specController` block.

  The two JUnit readers differ in how they read an `<error>` on an ordinary test: `parseJunitEvidenceObservations` reads it as a failing Evidence Observation, and `parsePytestEvidenceObservations` reads it as never-ran, as pytest's setup error.
- **Reconcile**: `evidenceReconciliationOf`, which gives the whole Evidence Reconciliation. Its `runVerdict` is `balanced`, `out-of-balance`, or `not-reconciled` with a `why` of `unsound`, `claim-code-errors` or `nothing-to-reconcile`; the CLI reads its exit code from there.
- **Claim codes**: `isFeatureCode`, `featureCodeOfFile`, `claimCodeMarksFor` and `nextClaimCode`, the reading of claim codes and the allocation of the next one.
- **Render**: `renderMarkdown` and `renderJson`, and `messagesFrom` for a message catalogue of your own.
- **Provenance**: `provenanceFrom`, the pure subset, which records what a run was without asking the filesystem what it is.

The types the CLI names are exported alongside them. A type nested inside one of them, such as a Claim Reconciliation inside an Evidence Reconciliation, is reached through its parent.

## Stability

What the entrypoint exports is the whole public surface, and the contract you build on. **Nothing checks it for drift.** The surface is not checked against a written list, so adding a symbol to the barrel or dropping one turns no build red. A generated API report will be adopted at `1.0`, with a compatibility promise. The package is at a `0.x` version and makes no compatibility promise; see [`docs/compatibility.md`](https://github.com/3f-consulting/spec-controller/blob/main/docs/compatibility.md). Pin an exact version.

Source, issues and history: [github.com/3f-consulting/spec-controller](https://github.com/3f-consulting/spec-controller).

## Licence

MIT — see [`LICENSE`](https://github.com/3f-consulting/spec-controller/blob/main/packages/core/LICENSE) in this package. © 2026 3F Consulting Ltd.
