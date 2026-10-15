# @3f-consulting/spec-controller-core

**The reconciliation engine behind `spec-controller`, as a pure library.**

Scenarios in, evidence observations in, a ledger out. Nothing in this package reads a file, spawns a process, looks at the clock or writes to a stream. File reading, git-derived provenance, output routing and the command line all live in the [`spec-controller`](https://www.npmjs.com/package/spec-controller) package, which is built on this one.

**Use this package** to build your own tooling around the reconciliation: a service, an editor integration, a different front end, or a pipeline that already holds the reports in memory. **Use `spec-controller`** when you want a command to put in CI.

Requires Node ≥ 22. ESM only.

## Install

```
npm install @3f-consulting/spec-controller-core
```

## Your first call

```ts
import {
  parseScenarios,
  parseVitestEvidenceObservations,
  reconcile,
  isBalanced,
} from "@3f-consulting/spec-controller-core";

// One .feature file's text, and one already-parsed Vitest JSON report.
const scenarios = parseScenarios(featureSource);
const observed = parseVitestEvidenceObservations(vitestReport, "unit");

const ledger = reconcile(scenarios, observed);
isBalanced(ledger); // false while any scenario names evidence that did not arrive
```

- `parseScenarios` reads the `@SCN` code and the quality-check tags off each scenario and turns them into the **obligations** it names.
- `parseVitestEvidenceObservations` turns a test report into the **observations** that posted back, each citing the `@SCN` it claims.
- `reconcile` sets the two sides against each other and answers per scenario.

Everything else the package exports is a variation on these three steps.

## What it exports

The package publishes exactly one entrypoint, a barrel that exports:

- **Parse**: `parseScenarios`, `parseUntaggedScenarios` and `countScnOccurrences`; `parseVitestEvidenceObservations`, `parseJunitEvidenceObservations` (over a JUnit XML report you have already parsed into objects, from pytest, gotestsum or another runner; `parsePytestEvidenceObservations` is the same function under its earlier name) and `parseCucumberEvidenceObservations`; and the readers for fitness functions and for what a pipeline's steps actually ran.
- **Reconcile**: `reconcile` for the ledger itself, `evidenceReconciliationOf` for the ledger plus its summary, and `evidenceReconciliationFromSources` for the whole composition over sources you have already read.
- **Ask the ledger**: `isBalanced`, `hasPendingItems`, `hasBrokenEvidence` and `hasNothingToReconcile`. These are the four questions a caller decides on. The CLI's balanced, out-of-balance, unsound, pending-under-strict and nothing-to-reconcile verdicts are built from these four and nothing else.
- **Render**: `renderMarkdown`, `renderJson`, `renderReport`, `renderReportFromJson`, and `assembleRenderInput` if you want the payload rather than a string.
- **Provenance**: the pure subset — what a run was, without asking the filesystem what it is.

The types these functions take and return are exported alongside them, so a consumer can name any value it holds.

## Stability

What the entrypoint exports is the whole public surface, and the contract you build on. **Nothing checks it for drift.** A symbol added to or dropped from the barrel reds no build, because the surface is not checked against a written-down list. A generated API report will be adopted at `1.0`, together with a compatibility promise. The package is at a `0.x` version and makes no compatibility promise; see [`doc/compatibility.md`](https://github.com/3f-consulting/spec-controller/blob/main/doc/compatibility.md). Pin an exact version.

Source, issues and history: [github.com/3f-consulting/spec-controller](https://github.com/3f-consulting/spec-controller).

## Licence

MIT — see `LICENSE` in the repository. © 2026 3F Consulting Ltd.
