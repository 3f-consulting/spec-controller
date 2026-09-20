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
- Your CI run's own step record — the `toJSON(steps)` dump your pipeline writes, evidence for every converted fitness check (see *Wiring into CI*).
- Your CI config (`ci.yml`) and `package.json` — the CI config is the scope discovery ranges over, and both are used to check that an UNCONVERTED static check is wired into CI over the real source.

---

## Declaring a fitness check

A **fitness check** is a whole-system property — complexity, mutation score, type
soundness, vocabulary, suite run time. **There are two artefacts and no third**, and **neither of
them is a cucumber step definition**. There is no fitness profile to configure, no manifest list,
and no step to write.

**1. A scenario, tagged `@fitness`, carrying an `@SCN`.** You write it exactly as you write a
`@unit` one — steps, and a tag naming its axis. Its steps are the specification; the command your
CI already runs is the evidence, and nothing here runs the steps:

```gherkin
  @fitness @SCN-FIT-001
  Scenario: every function the push touches measures inside the external complexity standard, and no dead suppression survives
    Given this repository's source as this push leaves it, and the files the push touched
    When the external complexity standard is applied across that source
    Then every function the push touched measures inside the standard
    And every other function over the standard is reported without failing the run
    And no suppression directive that suppresses nothing survives the run
```

**2. That scenario's `@SCN` as the `id:` of the CI step that already runs the check.** The check
stays exactly where it is in your pipeline; what you add is a citation. That is the whole of the
second artefact — there is no manifest list:

```yaml
      - name: Complexity
        id: SCN-FIT-001
        if: always()
        run: eslint
```

**That is the whole declaration.** **One `@fitness` scenario is one check**, identified by its
`@SCN` and described by its title: nothing else says what the check is about. **Nothing names a
bar** either — the mutation bar is Stryker's own `thresholds.break`, and its scenario is answered by
one push step that reads the newest nightly sweep's verdict:
[`scheduled-checks.md`](./scheduled-checks.md). The check's credit is its step's `outcome`: the
tool's exit code on its own CI step is the verdict, whatever the tool measures.

**Neither artefact is derived from the other, and that is deliberate** — it is what lets the two
disagree. A `@fitness` scenario whose `@SCN` no CI step states reconciles **missing** and the run is
out of balance, exactly as a `@unit` scenario with no test does; a step stating an `@SCN` no
scenario carries posts to a **phantom** row, and a step stating none posts to **suspense**. All
three are faults a run says out loud.

**`specController.fitnessChecks` is not read, and is no longer named on the report either.** Until
`3F-3606` (operator ruling 2026-09-20: no backward compatibility) a run over a tree carrying the key
printed one line under `### Static checks` naming it as retired. That line is gone, along with the
account behind it: the key is now passed over exactly as any other key this tool does not know, and
the two artefacts above are the whole of what you author.

**One `toJSON(steps)` dump step per job** is what lets the reconciler read what each step did, and
`--ci-steps` is what points `balance` at it. That is wiring rather than declaration, so it is under
*Wiring into CI* below, with the `if: always()` rule that goes with it.

**The three adoption states — what you author at each, and what the report says back — are in
[`adopting-fitness-checks.md`](./adopting-fitness-checks.md).** This page is the flags and the CLI.

### A converted check is still a command you can run

Converting a check does not move it inside anything. Most of the converted checks in this
repository's own pipeline are a command you can paste into a terminal — `pnpm spec-controller tags`, `pnpm typecheck`, bare
`eslint` — and exit 0 is the check passing, with no cucumber and no `spec-controller` involved. The
rest read a number an earlier step, or a scheduled sweep, already left behind. What the scenario and
the `id:` add is that the run becomes **observable**: the ledger can say the check ran, and against
what.

The worked before/after, the migration checklist, and the traps:
[`adopting-fitness-checks.md`](./adopting-fitness-checks.md).

### Naming your runners, and the one limit that remains

**The zero-annotation state is no longer Node-shaped.** It used to find the checks it could by
matching `package.json` script names against observed prefixes, so a pipeline with a bare `run: ruff`
and no `package.json` script derived nothing. That prefix set is gone, retired on 2026-09-12 by
[3F-3343](3F-3343), and **the replacement is not a longer list
of names**: you name the commands that run your behavioural suites — a closed set of four, one per
tier — and **every other step of the workflows `--ci` names is a candidate fitness check**, whatever
it invokes and whether it is a `run:` step or a `uses:` action.

```jsonc
"specController": {
  "runners": {
    "unit": "vitest",             // the command your CI runs for @unit
    "integration": "cucumber-js", // for @integration
    "e2e": "cucumber-js",         // two tiers, one runner, which is normal
    "performance": null           // we have no performance runner
  },
  "notChecks": [
    "ci.yml:build:actions/checkout@v5",
    "ci.yml:build:Install dependencies"
  ]
}
```

**`runners` is keyed by the four canon tiers and by nothing else.** A value is a runner's name or
`null`, and `null` is a statement rather than a blank — *we have no runner for this tier*, which the
report distinguishes from omitting the key, which it reads back as *you have not told us*. A key
outside the four is reported as unrecognised, excludes nothing, and does not abort the run. **No
block at all is not an error**: every step becomes a candidate, which is the report the free state is
sold on. A runner is matched as a **whole shell token** — of the step's own command, or of the
`package.json` script it invokes, following aliases three deep — and never as a substring.

**`notChecks` is your list of steps that are neither runners nor checks.** Entries are
`<workflow file>:<job id>:<step name>`, matched **exactly**: no prefix form, no glob, no bare name.
**To take a whole workflow out, narrow `--ci`** rather than listing its steps. An excluded step is
named on the report rather than dropped, and an entry matching no step is reported as stale.
`balance` itself and its `toJSON(steps)` dump are excluded **by construction** — never write them.

**What stays Node-shaped is where the configuration lives**, not what can be discovered: both keys
sit under `specController` in a `package.json`, so a repository that has none adds a stub file. And
the residue of the recognition rule is a **false positive you can see**: a suite run through an
action, or a runner buried in a quoted argument to a wrapper, is reported as a candidate check rather
than silently excluded — one line of `notChecks` each. **Annotating the steps has no such shape at
all**: an `id:` is a key of the step mapping, the command below it is any command in any language,
and nothing in the resolution reads a manifest.

**Your first run against an unannotated pipeline reds.** Every candidate cites nothing, so every
credit posts to suspense and `balance` exits 1 — the ledger being right about a corpus that demands
nothing yet. To adopt by observing rather than by redding the build, run it with `--exit-zero`. You get
the same report, and the out-of-balance verdict exits `0`. Remove the flag when you are ready to gate.

**A check that legitimately applies to only some platforms is not served.** A matrix build uses
`if:` to skip such a step, and that skip reds. *"The command examined nothing"* and *"this row was
not obliged on this run"* are different claims, and only the first is modelled.


---

## Install

```sh
npm install -g spec-controller@alpha
```

`@alpha` is not optional until `0.1.0` publishes: a bare install resolves `latest`, which npm set to `0.1.0-alpha.1` on the first publish, and that version has neither `tags` nor `--ci-steps`.

Or run without installing:

```sh
npx spec-controller@alpha balance --features ./features …
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
| `--ci <ci.yml>` | Your CI workflows — a file, or a directory of them (default `.github/workflows`). **This is the scope of discovery**: every step of every job it resolves is read, and narrowing it is how a whole workflow comes out. Also where an UNCONVERTED static check is found running over the real source, and where a check step's `id:` supplies the `@SCN` its result cites. |
| `--package-json <path>` | The target's `package.json` — its `scripts`, and its `specController.runners` / `specController.notChecks` (see *Naming your runners*). A fitness check is declared by its `@fitness` scenario and the CI step whose `id:` is that scenario's `@SCN`; no manifest key names one. Defaults to `package.json` at the working directory. |
| `--ci-steps <record.json>` | Your CI run's own record of what each of its steps did — the `toJSON(steps)` dump, evidence for the converted fitness checks. See *Wiring into CI*. Omit it if you have converted none. |
| `--target <name>` | A name recorded verbatim in the report's provenance (which project this run reconciled). |
| `--source-sha <sha>` | Override the git commit SHA recorded in provenance (defaults to the resolved HEAD). |
| `--format <fmt>[:<path>]` | Where to send output (`md` or `json`, optionally `:<path>` to write to a file). Repeatable. See below. |
| `--render-from-json <path>` | Re-render Markdown from a previously saved Evidence Reconciliation JSON — no reconcile, no live inputs. |
| `--strict` | Fail the run (exit `3`) when it carries Pending Items, which are otherwise run-neutral. |
| `--exit-zero` | Print the same report, but exit `0` on an out-of-balance (`1`) or `--strict` pending (`3`) verdict. Usage (`2`), unsound (`4`) and nothing-to-reconcile (`5`) still fail. The on-ramp before gating. |
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
spec-controller --store ~/spec-controller-runs --run-id 2026-07-09-ci balance \
  --features ./features \
  --vitest ./vitest-report.json \
  --target my-project
# → ~/spec-controller-runs/my-project/2026-07-09-ci/  (reconciliation outputs + run.yaml)
#
# The root is OUTSIDE the repository being reconciled, which is why there is no default.
# A report enumerates a codebase's gaps, dangling anchors and watermelons — more sensitive
# than the code itself — so a kept run belongs in a store you chose, not under version
# control alongside the thing it is about.
```

Run `spec-controller --help` for the top-level summary of commands and host modifiers, or `spec-controller balance --help` for `balance`'s full flag list.


---

## Run against a target — a worked example

Three locations, named once at the top and used throughout: the repository being reconciled, this checkout, and the store. Set them to your own and the rest of the block runs unchanged.

`STORE` sits outside both checkouts deliberately, for the reason given above — a kept run enumerates a codebase's gaps, dangling anchors and watermelons, so it belongs in a store you chose rather than under version control alongside the thing it is about.

```
TARGET=~/code/your-project           # the repository being reconciled
CONTROLLER=~/code/spec-controller    # this checkout
STORE=~/spec-controller-runs         # kept runs, OUTSIDE both

# 1. Produce the target's evidence.
cd "$TARGET"
git switch main
git pull --ff-only
pnpm install --frozen-lockfile
npx cucumber-js --format summary --format json:reports/cucumber.json
npx vitest run --reporter=json --outputFile=reports/vitest.json

# 2. Reconcile it. The controller checkout is refreshed too — the verdict is only
#    as trustworthy as the binary that produced it.
cd "$CONTROLLER"
git switch main
git pull --ff-only
pnpm install --frozen-lockfile
node_modules/.bin/tsx packages/spec-controller/src/cli.ts \
  --store "$STORE" \
  balance \
  --target your-project \
  --features "$TARGET/features" \
  --vitest "$TARGET/reports/vitest.json" \
  --cucumber "$TARGET/reports/cucumber.json" \
  --ci "$TARGET/.github/workflows/ci.yml" \
  --package-json "$TARGET/package.json"
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

The point of `spec-controller` is continuous reconciliation, so `balance` belongs in CI, after your tests have produced their reports.

**If you have converted any fitness check, each check step carries its `@SCN` as its `id:` and the job ends with one dump step:**

```yaml
- run: eslint
  id: SCN-FIT-001
  if: always()
- run: pnpm typecheck
  id: SCN-FIT-011
  if: always()
- if: always()
  run: echo '${{ toJSON(steps) }}' > ci-steps.json
```

**The `if: always()` goes on every check step, not just the dump.** Without it the first red aborts the job and every later check is skipped, so the ledger reports one `failing` and N `broken` — a worse account from a correct mechanism. **The dump must be `toJSON(steps)`**: it is the only place a step's `id` and its `outcome` travel together, and `outcome` is the field that survives `continue-on-error` where `conclusion` does not.

**A check that runs on a schedule is still one step here.** A nightly mutation sweep, say: the push step reads the newest scheduled run's conclusion with stock `gh` and carries the scenario's `@SCN` as its `id:`, like any other check step. Nothing is carried across from the scheduled run. The recipe is [`scheduled-checks.md`](./scheduled-checks.md).

Then reconcile, once, over the reports and the record:

```sh
# after your test steps have written vitest-report.json / cucumber-report.json,
# and the dump step has written ci-steps.json
spec-controller balance --features ./features \
  --vitest ./vitest-report.json \
  --cucumber ./cucumber-report.json \
  --ci-steps ./ci-steps.json \
  --ci ./.github/workflows/ci.yml \
  --package-json ./package.json \
  --format md:reconciliation.md \
  --format json:reconciliation.json
```

Drop `--ci-steps` if you have converted nothing. Converting checks you already have — with a worked before/after and the traps: [`adopting-fitness-checks.md`](./adopting-fitness-checks.md).

Keep the reports as build artefacts — but do **not** commit them into the repo. An Evidence Reconciliation enumerates a codebase's gaps, phantom scenarios, and watermelons; it is more sensitive than the code itself, so it belongs outside version control.

### GitHub Actions — put the report on the run summary

A reconciliation is a table, not a list of line-level findings, and GitHub has a channel built for exactly that: the **job summary**. `$GITHUB_STEP_SUMMARY` names a file the runner sets up for each step; anything appended to it renders as GitHub-Flavoured Markdown on the workflow run's summary page.

`balance` already emits Markdown to any path `--format` is given, so this needs nothing from the tool:

```yaml
- name: Reconcile
  run: |
    spec-controller balance --features ./features \
      --vitest ./vitest-report.json \
      --cucumber ./cucumber-report.json \
      --format md:$GITHUB_STEP_SUMMARY \
      --format json:reconciliation.json
```

The reconciliation is then readable from the run page itself, rather than by scrolling a monospace job log. The JSON stays a build artefact for anything downstream.

Two limits worth knowing. Each step's summary is capped at **1 MiB** — exceeding it drops the summary and raises an error annotation — and at most **20 step summaries are displayed per job**. A reconciliation over a large corpus can approach the first of those; if it does, route the Markdown to a file, upload it as an artefact, and put a shorter form on the summary.

`$GITHUB_STEP_SUMMARY` is set only inside GitHub Actions. Elsewhere the variable is empty and the shell would expand it to nothing, so keep it out of the command you run locally.

---

## Troubleshooting

**No scenarios found / empty report** — check `--features` points at the directory holding your `.feature` files, and that the scenarios carry `@SCN-…` ids and evidence-obligation tags.

**A static check shows as `missing` or `watermelon` you didn't expect** — `missing` means the script named for that check isn't in `package.json`; `watermelon` means the script exists but no CI `run:` step actually invokes it over the real source. Both are real findings, not tool errors — that is the point.

**My first run reds with a wall of uncited checks** — expected, and not a misconfiguration. Every step of the workflows `--ci` names is a candidate fitness check until something says otherwise, and a candidate that cites no scenario posts to suspense, so `balance` exits 1. Read the **Discovery scope** and **Step accounting** sections of the report: they name each workflow and job, how many steps were read, and what became of every one of them. Then name your runners, name your non-checks, or narrow `--ci` — see *Naming your runners, and the one limit that remains*. To keep the report while you work it down without redding the build, add `--exit-zero`; delete it when you are ready to gate.

**A step I know is my test suite is reported as a check** — the runner recognition did not reach it. It matches a whole shell token of the step's command or of the `package.json` script the step invokes; a suite run through a `uses:` action, or one buried in a quoted argument to a wrapper, is not reached. Add the step to `specController.notChecks`. The failure direction is deliberate: a step wrongly reported is one line to fix, a step wrongly excluded would be invisible.

**`--json` rejected** — the legacy flag was removed; use `--format json:<path>`.

---

## What's not in this tool

`spec-controller balance` is the reconciliation half of the product. The `analyse` and `migrate` capabilities — retrofitting Gherkin scenarios onto an existing test suite — are a separate, closed offering built on the same reconciliation core; they are not part of this package.
