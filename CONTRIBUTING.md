# Contributing to spec-controller

## Build and test

You need Node ≥ 22 and pnpm.

```sh
pnpm install --frozen-lockfile
pnpm build       # both packages
pnpm typecheck
pnpm test        # unit tests (Vitest)
pnpm cucumber    # integration and end-to-end scenarios (Cucumber)
```

## Make a change

Open a pull request against `main`. It merges when CI is green.

Add a line to [`CHANGELOG.md`](CHANGELOG.md) saying what your change means for someone using spec-controller. A pull request Dependabot opened needs none.

### Tests

Name a test file for the behaviour it proves. Put the code of the scenario it proves in its test titles, in brackets: `[CLM-<FFF>-<NNN>]`.

Commit a scenario's tests failing first, then the code that makes them pass. To see a scenario's tests fail before its code is written, run the *Red proof* workflow by hand on your branch. Give it the scenario's code and its evidence layer.

Put a helper that more than one unit test file uses in a `*.test-utils.ts` file beside them. Do not copy it into each file. No check refuses a copied helper; review finds it.

To count copied code for that review, run `pnpm test-clones`. It reads the unit test and test-utils files, the step files, and the step helpers under [`tests/steps/support/`](tests/steps/support/). It takes its settings from [`.jscpd-tests.json`](.jscpd-tests.json), counts at jscpd's default thresholds, and names each clone by its path from the repository root. It never fails on the count. It exits non-zero only when it cannot run or finds no file to read.

### The JSON report's schema

If your change alters the JSON report's schema:

1. Raise `schemaVersion` in [`packages/core/src/reports/json.ts`](packages/core/src/reports/json.ts).
2. Run `pnpm build`.
3. Copy the schema the build generates in the `spec-controller` package's build output over [`schema/spec-reconciliation.schema.json`](schema/spec-reconciliation.schema.json).

CI fails a schema change that skips these steps.

### Documentation

Before you push a change that touches only [`docs/`](docs/), [`README.md`](README.md), [`CONTRIBUTING.md`](CONTRIBUTING.md) or [`LICENSE`](LICENSE), run `pnpm docs:check`. It runs every documentation check and exits non-zero if any fails. It needs [Vale](https://vale.sh) on your `PATH`, at the version [`.github/workflows/ci.yml`](.github/workflows/ci.yml) installs.

Use the words [`docs/ubiquitous-language.md`](docs/ubiquitous-language.md) defines. Where a term has a **Double-check** entry, check each use of the words it lists by its sense: rename it to the term where it means the term, and keep it where it means something else. If you find a new synonym, add it to the entry. The entry is never a gate and never closed.

## Report a problem

Open an issue at https://github.com/3f-consulting/spec-controller/issues. Say what you ran, what you expected and what happened. If `balance` produced a report, attach it.
