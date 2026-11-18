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

A pull request adds a line to [`CHANGELOG.md`](CHANGELOG.md) saying what it changes for someone using spec-controller, unless Dependabot opened it.

Name a test file for the behaviour it proves, and put the code of the scenario it proves in its test titles, in brackets: `[CLM-<FFF>-<NNN>]`.

If your change alters the JSON report's schema, raise `schemaVersion` in [`packages/core/src/reports/json.ts`](packages/core/src/reports/json.ts), run `pnpm build`, and copy the schema the build generates in the `spec-controller` package's build output over [`schema/spec-reconciliation.schema.json`](schema/spec-reconciliation.schema.json). CI fails a schema change that does neither.

To see a scenario's tests fail before its code is written, run the *Red proof* workflow by hand on your branch, with the scenario's code and its evidence layer.

Put a helper that more than one unit test file uses in a `*.test-utils.ts` file beside them. Do not copy it into each file. No check refuses a copied helper; review finds it.

To count the clones in the unit test and test-utils files, the step files, and the step helpers under [`tests/steps/support/`](tests/steps/support/) for that review, run `pnpm test-clones`. It reads its settings from [`.jscpd-tests.json`](.jscpd-tests.json), counts at jscpd's default thresholds, and names each clone by its path from the repository root. It never fails on the count. It exits non-zero only when it cannot run or finds no file to read.

Before you push a change that touches only [`docs/`](docs/), [`README.md`](README.md), [`CONTRIBUTING.md`](CONTRIBUTING.md) or [`LICENSE`](LICENSE), run `pnpm docs:check`. It runs every documentation check and exits non-zero if any fails. It needs [Vale](https://vale.sh) on your `PATH`, at the version [`.github/workflows/ci.yml`](.github/workflows/ci.yml) installs.

A review checks spec-controller against [`docs/ubiquitous-language.md`](docs/ubiquitous-language.md). A review or a vocabulary sweep checks each use of the words in a term's **Double-check** entry by its sense: renamed to the term where it means the term, kept where it means something else. The entry is never a gate and never closed; a newly found synonym is added to it.

How a release goes out is [`docs/releasing.md`](docs/releasing.md).

## How a change is reviewed

Claude Code writes each change, and it is checked before it merges:

1. **The maintainer decides what is built.** Each change starts as a scenario, or a set of them, that the maintainer reads and endorses before any code is written.
2. **The agent proves each scenario red, then green.** Each scenario's tests are committed failing first, then the code that makes them pass. CI on the pull request must be green to merge; [`features/fitness-functions.feature`](./features/fitness-functions.feature) lists every gate it runs.
3. **The agent reviews its own diff,** and fixes or records what that review finds.
4. **A second agent session reviews the delivery** against the scenarios the maintainer endorsed. It reads the merged code, not the agent's report of it, and takes anything that departs from what was endorsed back to the maintainer.

Branch names, pull-request titles and commit titles carry an ID in the form `[KEY-123]`. It refers to the maintainers' private tracker, which links the work to its ticket. You will not be able to open it.

## Report a problem

Open an issue at https://github.com/3f-consulting/spec-controller/issues. Say what you ran, what you expected and what happened. If `balance` produced a report, attach it.
