# spec-controller balance — how to use

This document is for anyone running `spec-controller balance` against a project — a developer wiring it into CI, a tech lead adopting the reconciliation discipline, or an auditor checking whether a codebase's scenarios are actually backed by evidence. The tool behaves the same regardless of who runs it.

---

## Prerequisites

**Node ≥ 22**

```sh
node --version   # must be v22.x or higher
```

**Your evidence, as reports**

`spec-controller` does not run your tests — it reconciles the *reports* your tools already produce. Before running `balance`, generate whichever of these apply to your project:

- Gherkin `.feature` files (your scenarios and their evidence-obligation tags).
- A Vitest JSON report (runtime test evidence).
- A Cucumber JSON report (runtime test evidence).
- Your CI config (`ci.yml`) and `package.json` — used to check that `@lint` static checks are actually wired into CI over the real source.

---

## Install

```sh
npm install -g spec-controller
```

Or run without installing:

```sh
npx spec-controller balance --features ./features …
```

---

## Running `spec-controller balance`

```sh
spec-controller balance --features ./features \
  --vitest ./vitest-report.json \
  --cucumber ./cucumber-report.json
```

### What it does

1. Parses your Gherkin scenarios and their `@`-tags into **evidence obligations** — the debit (what's specified).
2. Parses the evidence reports you passed — Vitest, Cucumber, and the CI/`package.json` static-check checks — into **evidence observations** — the credit (what actually ran).
3. Reconciles evidence obligations against evidence observations, per scenario, quality-check by quality-check.
4. Assembles the **Evidence Reconciliation** and renders it.

### Flags

| Flag | Purpose |
|---|---|
| `--features <dir>` | Directory of Gherkin `.feature` files — the scenarios. |
| `--vitest <report.json>` | A Vitest JSON report — runtime test evidence. |
| `--cucumber <report.json>` | A Cucumber JSON report — runtime test evidence. |
| `--ci <ci.yml>` | Your CI workflow — used to check whether `@lint` static checks actually run over the real source. |
| `--package-json <path>` | `package.json` — used to check a named static check's script exists. |
| `--measurements <report.json>` | A measurement report — the number each measured check posted, evidence for the measured fitness checks (`@ci-run-time` and its family). |
| `--target <name>` | A name recorded verbatim in the report's provenance (which project this run reconciled). |
| `--source-sha <sha>` | Override the git commit SHA recorded in provenance (defaults to the resolved HEAD). |
| `--format <fmt>[:<path>]` | Where to send output (`md` or `json`, optionally `:<path>` to write to a file). Repeatable. See below. |
| `--render-from-json <path>` | Re-render Markdown from a previously saved Evidence Reconciliation JSON — no reconcile, no live inputs. |
| `--help`, `-h` | Show `balance`'s help and exit. |

### `--format` — routing the output

`--format` takes a format (`md` or `json`), optionally followed by `:<path>`:

- `--format md` → Markdown to stdout (this is the default when no `--format` is given).
- `--format json:out.json` → JSON to a file.
- Repeat the flag to emit several at once: `--format md:report.md --format json:report.json`.

At most one output may go to stdout in a single invocation. (The legacy `--json <path>` flag has been removed; use `--format json:<path>` instead.)

### Host modifiers — storing a run (`--store` / `--run-id`)

`--store` and `--run-id` are **host modifiers**: they go *before* the command, not among `balance`'s own flags.

```sh
spec-controller [--store <root>] [--run-id <id>] balance [options]
```

Storage is a cross-cutting concern of the host, not of `balance`. A leading `--store` turns any run into a **stored** run — the host writes `<root>/<target>/<run-id>/` with the reconciliation outputs plus a `run.yaml` manifest, and hands `balance` its own clean args unchanged (so a bare, no-`--store` run stays emit-only and byte-identical). Without `--store`, nothing is written to disk beyond what `--format …:<path>` requests.

| Modifier | Purpose |
|---|---|
| `--store <root>` | Store the run: write `<root>/<target>/<run-id>/` with the reconciliation outputs + a `run.yaml` manifest. Required to store; there is no default (a default would write inside the repo). |
| `--run-id <id>` | Name the stored run (default: an ISO-8601 UTC timestamp). |

```sh
spec-controller --store ./runs --run-id 2026-07-09-ci balance \
  --features ./features \
  --vitest ./vitest-report.json \
  --target my-project
# → ./runs/my-project/2026-07-09-ci/  (reconciliation outputs + run.yaml)
```

Run `spec-controller --help` for the top-level summary of commands and host modifiers, or `spec-controller balance --help` for `balance`'s full flag list.


---

## Run against an adopter's repository

```
cd ./projects/3f/an-adopters-repository
git pull --ff-only
pnpm install --frozen-lockfile
npx cucumber-js --format summary --format json:reports/cucumber.json
npx vitest run --reporter=json --outputFile=reports/vitest.json


cd .
node_modules/.bin/tsx packages/spec-controller/src/cli.ts \
  --store . \
  balance \
  --target an-adopters-repository \
  --features ./projects/3f/an-adopters-repository/features \
  --vitest ./projects/3f/an-adopters-repository/reports/vitest.json \
  --cucumber ./projects/3f/an-adopters-repository/reports/cucumber.json \
  --ci ./projects/3f/an-adopters-repository/.github/workflows/ci.yml \
  --package-json ./projects/3f/an-adopters-repository/package.json
```

---

## What you get

The **Evidence Reconciliation** — the whole reconciliation — in two renderings of the same model:

- **Markdown** — human-readable. One **Scenario Reconciliation** per scenario, each carrying a **verdict** (**balanced** or **out-of-balance**) and broken into per-quality-check **Quality Check Reconciliations**, each carrying an **outcome** (`satisfied`, `missing`, `failing`, `watermelon`, …). The non-`satisfied` sub-rows are the **reconciling items**. A **Summary** gives the totals.
- **JSON** — the same model, machine-readable, for diffing two runs, feeding a dashboard, or building automation on top.

Both carry a **provenance** header recording what was reconciled (target, source SHA, input paths), so a reconciliation is reproducible and attributable.

The outcome you are watching for is the **watermelon**: a static check that is green but enforces nothing over the real source — the fabricated credit that makes a green CI lie.

---

## Wiring into CI

The point of `spec-controller` is continuous reconciliation, so `balance` belongs in CI, after your tests have produced their reports:

```sh
# after your test steps have written vitest-report.json / cucumber-report.json
spec-controller balance --features ./features \
  --vitest ./vitest-report.json \
  --cucumber ./cucumber-report.json \
  --ci ./.github/workflows/ci.yml \
  --package-json ./package.json \
  --format md:reconciliation.md \
  --format json:reconciliation.json
```

Keep the reports as build artefacts — but do **not** commit them into the repo. An Evidence Reconciliation enumerates a codebase's gaps, phantom scenarios, and watermelons; it is more sensitive than the code itself, so it belongs outside version control.

---

## Troubleshooting

**No scenarios found / empty report** — check `--features` points at the directory holding your `.feature` files, and that the scenarios carry `@SCN-…` ids and evidence-obligation tags.

**A guard shows as `missing` or `watermelon` you didn't expect** — `missing` means a named `@lint` guard's script isn't in `package.json`; `watermelon` means the script exists but no CI `run:` step actually invokes it over the real source. Both are real findings, not tool errors — that is the point.

**`--json` rejected** — the legacy flag was removed; use `--format json:<path>`.

---

## What's not in this tool

`spec-controller balance` is the reconciliation half of the product. The `analyse` and `migrate` capabilities — retrofitting Gherkin scenarios onto an existing test suite — are a separate, closed offering built on the same reconciliation core; they are not part of this package.
