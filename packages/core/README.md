# @3f-consulting/spec-controller-core

**The reconciliation engine behind `spec-controller`, as a pure library.**

Scenarios in, evidence observations in, a ledger out. Nothing in this package reads a file, spawns a process, looks at the clock or writes to a stream — file reading, git-derived provenance, output routing and the command line all live in the [`spec-controller`](https://www.npmjs.com/package/spec-controller) package, which is built on this one.

**Reach for this package** when you are building your own tooling around the reconciliation — a service, an editor integration, a different front end, a pipeline that already has the reports in memory. **Reach for `spec-controller`** when what you want is a command to put in CI.

Requires Node ≥ 22. ESM only.

## Install

```
npm install @3f-consulting/spec-controller-core@alpha
```

`@alpha` is not optional until `0.1.0` publishes: a bare install resolves `latest`, which npm set to `0.1.0-alpha.1` on the first publish — a version from before the fitness axis was reworked.

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

`parseScenarios` reads the `@SCN` code and the quality-check tags off each scenario and turns them into the **obligations** it names. `parseVitestEvidenceObservations` turns a test report into the **observations** that posted back, each citing the `@SCN` it proves. `reconcile` puts the two sides against each other and answers per scenario. Everything else on the barrel is a variation on those three moves.

## What is on the barrel

- **Parse** — `parseScenarios` and its untagged/prose-only companions; `parseVitestEvidenceObservations`, `parseCucumberEvidenceObservations`; the readers for static checks and for what a pipeline's steps actually ran.
- **Reconcile** — `reconcile` for the ledger itself, `evidenceReconciliationOf` for the ledger plus its summary, and `evidenceReconciliationFromSources` for the whole composition over sources you have already read.
- **Ask the ledger** — `isBalanced`, `hasPendingItems`, `hasBrokenEvidence`, `hasNothingToReconcile`. These are the four questions a caller decides on: the CLI's own balanced / out-of-balance / unsound / pending-under-strict / nothing-to-reconcile verdicts are built out of these four and nothing else.
- **Render** — `renderMarkdown`, `renderJson`, `renderReport`, `renderReportFromJson`, and `assembleRenderInput` if you want the payload rather than a string.
- **Provenance** — the pure subset: what a run was, without asking the filesystem what it is.

The types these functions take and return are exported alongside them, so a consumer can name any value it holds.

## The surface is a contract

This barrel is the whole public surface — the package publishes exactly one entrypoint, and what that entrypoint exports is the contract you build on. **Nothing checks it for drift.** A symbol quietly added to the barrel, or quietly dropped from it, reds no build today: the surface is not held against a written-down list, and a generated API report will be adopted at `1.0`, where the compatibility promise comes back. Until then: the package is at a `0.x` version and makes no compatibility promise — see [`doc/compatibility.md`](https://github.com/3f-consulting/spec-controller/blob/main/doc/compatibility.md). Pin an exact version.

Source, issues and history: [github.com/3f-consulting/spec-controller](https://github.com/3f-consulting/spec-controller).

## Licence

MIT — see `LICENSE`, which travels in this package. © 2026 3F Consulting Ltd.
