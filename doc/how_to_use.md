# spec-controller balance — how to use

This document is for anyone running `spec-controller balance` against a project — a developer wiring it into CI, a tech lead adopting the reconciliation discipline, or an auditor checking whether a codebase's scenarios are actually backed by evidence. The tool behaves the same regardless of who runs it.

---

## What spec-controller assumes

**Not a task tracker. Not a documentation spec. Automated tests — unit, integration, e2e, performance — and fitness functions in CI.**

Feature files are not a precondition. You need none to start: a project that has none, or has some that are not tagged to spec-controller's model, is a `new-client`, and `balance` already reports every check its pipeline ran. Scenarios tagged to the model are what the `conformant` state adds; they are not what you need first.

**Your tracker keeps the work.** A ticket is a change; a scenario is behaviour the system has now. The two meet only where one piece of work creates, reads, updates or deletes one scenario.

**Test validity is assumed.** spec-controller reconciles a result to the test that claimed it. Whether that test reflects the behaviour the business wants is yours to ensure, as it is under CI, TDD and BDD; the tool does not try to establish that a test is a good test.

**A title can drift from its check, and that gap is stated rather than solved.** Wherever the runner is not Cucumber — usually `@unit`, `@performance` and `@fitness` — a scenario carries no Given/When/Then, so no unexecuted step reads as a test; its title is still prose that nothing reads against the check that answers it, and the two can drift without anything going red. The ledger proves a scenario is linked to evidence and that the evidence passed. **It does not prove the evidence tests what the title says.**

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
- Your CI run's own step record — the `toJSON(steps)` dump your pipeline writes, evidence for every converted fitness function (see *Wiring into CI*).
- Your CI config (`ci.yml`) and `package.json` — the CI config is the scope discovery ranges over, and both are read to check that an UNCONVERTED fitness function is wired into CI over the real source.

---

## How your evidence finds its scenario

A scenario's tag line says what it needs proved: `@SCN-<FFF>-<NNN> @unit @e2e` asks for a unit test and an end-to-end run, both answering `SCN-<FFF>-<NNN>`. Each piece of evidence then names the scenario it answers, **in the one form its runner's report carries**:

| the scenario asks for | the evidence | how it names the scenario |
|---|---|---|
| `@unit` | a Vitest test | `[SCN-…]` in square brackets in the test's `it` title, or in an enclosing `describe` title — the most specific one wins |
| `@integration`, `@e2e`, `@performance` | a Cucumber run of the scenario | nothing to add: the Cucumber report carries the scenario's own `@SCN` tag |
| `@fitness` | a CI step | the step's `id:` is the code (see *Naming a fitness function*, below) |

```ts
describe("[SCN-<FFF>-<NNN>] a feature part whose highest live code is below a deleted one is offered one past the deleted code", () => {
  it("offers the next code", () => { /* … */ });
});
```

```yaml
      - name: Test
        id: SCN-<FFF>-<NNN>
        run: pnpm test
```

**Only these three forms are read.** `SCN-<FFF>-<NNN>` or `@SCN-<FFF>-<NNN>` in a test title without the square brackets, a code in a comment — including a `// @SCN-…` line in a step-definition file — or a code anywhere else names nothing. A test that names nothing still runs and is still reported: it lands on the **suspense** row, *Evidence Observation cites no Scenario*, and the scenario it was meant for reads `missing`. When a `@unit` scenario reads `missing` while its test passes, check the brackets first.

---

## Naming a fitness function

A **fitness function** is a whole-system property — complexity, mutation score, type
soundness, vocabulary, suite run time. **There are two artefacts and no third**, and **neither of
them is a cucumber step definition**. There is no fitness profile to configure, no manifest list,
and no step to write.

**1. A scenario, tagged `@fitness`, carrying an `@SCN`.** You write it exactly as you write a
`@unit`-only one — a tag naming its axis and a title, and no Given/When/Then, because Cucumber
does not select it. Its title is the specification; the command your CI already runs is the
evidence:

```gherkin
  @fitness @SCN-<FFF>-<NNN>
  Scenario: every function the push touches measures inside the external complexity standard, and no dead suppression survives
```

**2. That scenario's `@SCN` as the `id:` of the CI step that already runs the check.** The check
stays exactly where it is in your pipeline; what you add is a citation. That is the whole of the
second artefact — there is no manifest list:

```yaml
      - name: Complexity
        id: SCN-<FFF>-<NNN>
        if: always()
        run: eslint
```

**That is the whole of naming it.** **One `@fitness` scenario is one check**, identified by its
`@SCN` and described by its title: nothing else says what the check is about. **Nothing names a
bar** either — the mutation bar is Stryker's own `thresholds.break`, and its scenario is answered by
one push step that reads the newest nightly sweep's verdict (*Wiring into CI*, below). The check's credit is its step's `outcome`: the
tool's exit code on its own CI step is the verdict, whatever the tool measures.

**Neither artefact is derived from the other, and that is deliberate** — it is what lets the two
disagree. A `@fitness` scenario whose `@SCN` no CI step states reconciles **missing** and the run is
out of balance, exactly as a `@unit` scenario with no test does; a step stating an `@SCN` no
scenario carries posts to a **phantom** row, and a step stating none posts to **suspense**. All
three are faults a run says out loud.

**`specController.fitnessChecks` is not read.** Until an operator ruling of 2026-09-20 (no
backward compatibility), a run over a tree carrying the key printed one line under `### Static checks`
naming it as retired. That account is gone: the key is now treated exactly as any other key this tool
does not read, named under `## Configuration not read` in the same words as a misspelling, with
nothing said about what it once did. The two artefacts above are the whole of what you author.

**One `toJSON(steps)` dump step per job** is what lets the reconciler read what each step did, and
`--ci-steps` is what points `balance` at it. That is wiring rather than naming, so it is under
*Wiring into CI* below, with the `if: always()` rule that goes with it.

This page is the flags and the CLI.

### A converted check is still a command you can run

Converting a check does not move it inside anything. Most of the converted checks in this
repository's own pipeline are a command you can paste into a terminal — `pnpm typecheck`, `pnpm lint:boundaries`, bare
`eslint` — and exit 0 is the check passing, with no cucumber and no `spec-controller` involved. The
rest read a number an earlier step, or a scheduled sweep, already left behind. What the scenario and
the `id:` add is that the run becomes **observable**: the ledger can say the check ran, and against
what.

### Naming your runners, and the one limit that remains

**The zero-annotation state is not Node-shaped.** It does not match `package.json` script names
against prefixes, so a pipeline with a bare `run: ruff` and no `package.json` script is discovered
like any other, and **what you name is not a list of check names**: you name the commands that run your behavioural suites — a closed set of four, one per
tier — and **every other step of the workflows `--ci` names is a candidate fitness function**, whatever
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
`package.json` script it invokes, following aliases three deep — and never as a substring. It is
matched only in the last stage of a pipeline: a step that pipes the runner's output into another
command is a check that uses the runner, and is reported as one.

**`notChecks` is your list of steps that are neither runners nor checks.** Entries are
`<workflow file>:<job id>:<step name>`, matched **exactly**: no prefix form, no glob, no bare name.
**To take a whole workflow out, narrow `--ci`** rather than listing its steps. An excluded step is
named on the report rather than dropped, and an entry matching no step is reported as stale.
`balance` itself and its `toJSON(steps)` dump are excluded **by construction** — never write them.

**Configuration the run cannot use is named, never dropped.** A `specController` entry of a kind its
reader does not take (a `notChecks` written as one string, a runner written as a number) is read as
absent, and a key the block does not read at all (a misspelling, or a key an older version read) is
passed over. Neither refuses the run, and each is named under `## Configuration not read`, right
after the run provenance, so the rest of the report is the one you would get without it.

**What stays Node-shaped is where the configuration lives**, not what can be discovered: `runners`
and `notChecks` sit under `specController` in a `package.json`, so a repository that has none adds a
stub file. And the residue of the recognition rule is a **false positive you can see**: a suite run
through an action, or a runner buried in a quoted argument to a wrapper, is reported as a candidate
check rather than silently excluded — one line of `notChecks` each. **Annotating the steps has no such shape at
all**: an `id:` is a key of the step mapping, the command below it is any command in any language,
and nothing in the resolution reads a manifest.

**Your first run against an unannotated pipeline reds.** Every candidate cites nothing, so every
credit posts to suspense and `balance` exits 1 — the ledger being right about a corpus that raises
nothing yet. To adopt by observing rather than by redding the build, run it with `--exit-zero`. You get
the same report, and the out-of-balance verdict exits `0`. Remove the flag when you are ready to gate.

**A check that legitimately applies to only some platforms is not served.** A matrix build uses
`if:` to skip such a step, and that skip reds. *"The command examined nothing"* and *"this row was
not obliged on this run"* are different claims, and only the first is modelled.

### Deferring a scenario — `deferralTags`

**A scenario you have written but deliberately not yet evidenced is deferred with a tag, not left to
read as missing.** A scenario carrying a recognised deferral tag has **every** one of its evidence
obligations deferred to a **Pending Item** — whatever the observed side says, including a scenario
filtered out of the run or reporting a pending step. A deferred scenario that raises no obligations
at all is one Pending Item for the whole scenario. The tag counts whether it sits on the scenario or
is inherited from its `Rule:` or `Feature:`. A Pending Item is shown and tallied on the report, apart
from the out-of-balance rows, and it does not affect the verdict or the exit code unless you pass
`--strict`, which fails the run at exit `3`.

The recognised set starts as `@wip`, `@ignore`, `@skip`, `@todo` and `@pending`. Add your own under
`specController` in the target's `package.json`:

```jsonc
"specController": {
  "deferralTags": ["deferred", "@blocked"]
}
```

**Your list extends the built-in set and never replaces it** — `@wip` defers whatever you configure.
An entry may be written bare or with its `@`, and surrounding whitespace is ignored. A value that is
not an array, or an entry that is not a string, is read as absent rather than refused, and named under
`## Configuration not read`. A tag in neither
list never defers the whole scenario, however much it looks like a deferral tag.

**This is scenario scope, and it differs from `@<check>pending`.** `@integrationpending` defers only
the integration obligation on its scenario, so a passing `@unit` beside it still reconciles
satisfied. A deferral tag defers them all. The two compose: a scenario carrying both raises a Pending
Item from each. `balance --help` prints the key and the built-in set.


---

## Install

```sh
npm install -g spec-controller@alpha
```

`@alpha` is not optional until `0.1.0` publishes: a bare install resolves `latest`, which npm set to `0.1.0-alpha.1` on the first publish, and that version has no `--ci-steps` and no scenario code errors.

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
2. Parses the evidence reports you passed — Vitest, Cucumber, and the fitness functions in CI and `package.json` — into **evidence observations** — the credit (what actually ran).
3. Reconciles evidence obligations against evidence observations, per scenario, quality-check by quality-check.
4. Assembles the **Evidence Reconciliation** and renders it.

### Flags

| Flag | Purpose |
|---|---|
| `--features <dir>` | Directory of Gherkin `.feature` files — the scenarios. |
| `--vitest <report.json>` | A Vitest JSON report — runtime test evidence. |
| `--cucumber <report.json>` | A Cucumber JSON report — runtime test evidence. |
| `--ci <ci.yml>` | Your CI workflows — a file, or a directory of them (default `.github/workflows`). **This is the scope of discovery**: every step of every job it resolves is read, and narrowing it is how a whole workflow comes out. Also where an UNCONVERTED fitness function is found running over the real source, and where a check step's `id:` supplies the `@SCN` its result cites. |
| `--package-json <path>` | The target's `package.json` — its `scripts`, and its `specController.runners`, `specController.notChecks` and `specController.deferralTags` (see *Naming your runners* and *Deferring a scenario*). A fitness function is named by its `@fitness` scenario and the CI step whose `id:` is that scenario's `@SCN`; no manifest key names one. Defaults to `package.json` at the working directory. |
| `--ci-steps <record.json>` | Your CI run's own record of what each of its steps did — the `toJSON(steps)` dump, evidence for the converted fitness functions. See *Wiring into CI*. Omit it if you have converted none. |
| `--target <name>` | A name recorded verbatim in the report's provenance (which project this run reconciled). |
| `--source-sha <sha>` | Override the git commit SHA recorded in provenance (defaults to the resolved HEAD). |
| `--format <fmt>[:<path>]` | Where to send output (`md` or `json`, optionally `:<path>` to write to a file). Repeatable. See below. |
| `--render-from-json <path>` | Re-render Markdown from a saved Evidence Reconciliation JSON — no reconcile, no live inputs. The re-render exits the code the saved verdict names, and is strict if the saved run was or `--strict` is given beside it; `--exit-zero` composes as it does live. Every other flag beside it (a live input, `--target`, `--source-sha`, `--format`) is refused at exit `2`. A re-render keeps no run, so under `--store` it is refused at exit `2`, naming `--store`, and no store root is made. |
| `--strict` | Fail the run (exit `3`) when it carries Pending Items, which are otherwise run-neutral. |
| `--exit-zero` | Print the same report, but exit `0` on an out-of-balance or scenario-code-error (`1`) or `--strict` pending (`3`) verdict. Usage (`2`), unsound (`4`) and nothing-to-reconcile (`5`) still fail. The on-ramp before gating. |
| `--help`, `-h` | Show `balance`'s help and exit. |

### `--format` — routing the output

`--format` takes a format (`md` or `json`), optionally followed by `:<path>`:

- `--format md` → Markdown to stdout (this is the default when no `--format` is given).
- `--format json:out.json` → JSON to a file.
- Repeat the flag to emit several at once: `--format md:report.md --format json:report.json`.

At most one output may go to stdout in a single invocation. A path that names stdout itself (`/dev/stdout`, `/dev/fd/1`, or a link to either) counts as stdout, so `--format md --format json:/dev/stdout` is refused at exit `2` like `--format md --format json`. (There is no `--json <path>` flag; use `--format json:<path>`.)

No two outputs may share one regular file, however the file is named: the same path twice, the same format twice, `./` or an absolute spelling beside a relative one, a path through `..`, a symbolic link, a path through a linked directory, a hard link, or the file stdout is redirected into. The file is recognised by the operating system's identity for it, so on a case-insensitive volume `report.md` and `REPORT.MD` are one file. Such a run is refused at exit `2`, naming both outputs, before anything is written. A destination that is not a regular file, such as `/dev/stderr` or `/dev/null`, may be given more than once, because writing it twice loses nothing.

No output may land on a file the run reads, however the file is named: the `--vitest`, `--cucumber`, `--ci-steps` or `--package-json` file, the `package.json` read by default, any feature file of the `--features` corpus or of the `features/` read by default, and the `--ci` workflow or any workflow of the `--ci` folder or of the `.github/workflows` read by default. The file is recognised by its identity, as above, so a link, a hard link or another spelling of an input counts, and so does stdout appended (`>>`) into one. Such a run is refused at exit `2`, naming the output and the input, before anything is written. A file the run does not read, beside an input or inside one of its folders, is written as asked.

A path is written as given: the directory it names must already exist, since `--format` creates none. A path that is a symbolic link to a file that does not exist yet is written through the link, creating the file it points to. A path that cannot be written (read-only, an existing directory, under a regular file, or in a directory that does not exist) is refused at exit `2`, naming the path and the operating system's reason. Every path is checked before anything is emitted, so a refused run prints no report and writes no other file.

### Host modifiers — storing a run (`--store` / `--run-id`)

`--store` and `--run-id` are **host modifiers**: they go *before* the command, not among `balance`'s own flags. A host modifier needs a command, or `--help`, after it: given with nothing after it, it is refused at exit 2 and nothing runs. A `--help` or `-h` among the tokens before the command answers the top-level help at exit 0, whatever else is given there, even a token that would otherwise be refused; after the command it is that command's own help.

```sh
spec-controller [--store <root>] [--run-id <id>] balance [options]
```

Storage is a cross-cutting concern of the host, not of `balance`. A leading `--store` turns any run into a **stored** run — the host writes `<root>/<target>/<run-id>/` with the reconciliation outputs plus a `run.yaml` manifest, and hands `balance` its own clean args unchanged (so a bare, no-`--store` run stays emit-only and byte-identical). Without `--store`, nothing is written to disk beyond what `--format …:<path>` requests. `--run-id` names a stored run, so given without `--store` it is refused at exit 2 and nothing runs; a re-render given it is refused the same way, because a re-render is never stored. Missing parents of the root are created. A root the run directory cannot be created under (a regular file, a path under one, or a directory the tool may not write) is refused at exit `2`, naming the run directory and the operating system's reason, and no run directory is printed. A command's `--help` or `-h` is answered before the store is touched: nothing is written under the root, even one that cannot be written. A `--format` given beside `--store` may not name a file the stored run writes itself (its `spec-reconciliation.md`, its `spec-reconciliation.json` or its `run.yaml`), however the path is spelled: such a run is refused at exit `2`, naming the file, with no run directory printed and an earlier run under the same run-id left as it was. Nor may the stored run's own files land on a file the run reads: a stored run whose report or `run.yaml` would be written over one of its inputs is refused the same way.

| Modifier | Purpose |
|---|---|
| `--store <root>` | Store the run: write `<root>/<target>/<run-id>/` with the reconciliation outputs + a `run.yaml` manifest. Required to store; there is no default (a default would write inside the repo). |
| `--run-id <id>` | Name the stored run (default: an ISO-8601 UTC timestamp). Read only with `--store`: given without it, the run is refused at exit 2, because no run would be kept under the name. |

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

The outcome you are watching for is the **watermelon**: a fitness function that is green but enforces nothing over the real source — the fabricated credit that makes a green CI lie.

**An `@SCN` code is an account number, and two scenarios carrying one code are one account.** The ledger is keyed by the code, so a code two scenarios carry — the same id written twice, or an `@SCN` on a `Feature:` or `Rule:` line that every scenario beneath inherits — reconciles as **one** Scenario Reconciliation, and every quality check on it reads `duplicate-scn-code`: *Evidence Obligation's @SCN code is carried by another Scenario*. No evidence citing that code can be attributed to either scenario, so the account is out of balance whatever the evidence says, and every credit citing the code posts to it once. The rest of the report is unaffected: every other account reconciles exactly as it would without the duplicate. The report states the corpus's scenarios against its accounts, and names each shared code with the file and the name of every scenario carrying it (`evidenceObligations.sharedScnCodes` in the JSON). The run exits `1`, the out-of-balance verdict, and the report is printed.

**A feature file is the account class its scenarios' codes are filed under, and a misfiled code is a scenario code error.** Every `balance` run judges the corpus it read and says what it found under `## Scenario code errors` (`scenarioCodeErrors` in the JSON), just after `## Run integrity`. There are three errors:

| Handle | The fault | The fix |
| --- | --- | --- |
| `foreign-scn-code` | a scenario's code names a feature its file does not carry, e.g. `@SCN-<FFF>-<NNN>` in a file headed with a code other than `@<FFF>` | re-code the scenario for its file, or move it to the file whose header carries the code its id names, when exactly one does; the finding names that file, or says no file carries the code |
| `no-feature-code` | a feature file carries no header code while its scenarios carry `@SCN` codes (a header longer than five characters is no header code) | give the file a header code, and code its scenarios for it |
| `duplicate-feature-code` | two feature files carry one header code | give one of them a code of its own |

Each one misfiles a code without making any posting ambiguous, so every account still reconciles exactly as it would if it were filed correctly. What a misfiled code falsifies is the by-feature cut, which groups on the code. So any scenario code error fails the run at exit `1`. The ladder is: nothing to reconcile (`5`), then unsound (`4`), then scenario code errors (`1`), then out of balance (`1`), then pending under `--strict` (`3`). A run carrying both a scenario code error and an out-of-balance account exits `1`, and its verdict names both. When the codes are clean the section says so, with how many feature files it judged, coded or not, and how many feature codes they carry, each counted on its own. Over a corpus with no feature file it says that no feature file was judged, and states nothing clean. It always says that a duplicated `@SCN` is reported on its account's rows, never here.

**What it judges.** An `@SCN` is `SCN-<FFF>-<NNN>`: a feature part of two to five uppercase letters or digits, and a number of any width. `balance` reads an id by that one grammar wherever it meets one — a scenario tag, a Vitest title's `[SCN-…]` citation, a Cucumber scenario's tag, a CI step's `id:` and a prose mention — so an id such as `@SCN-TOOLONGCODE-001` is no `@SCN` at all: it opens no account and cites nothing, and a scenario tagged only with it carries no `@SCN` code and reconciles `no-scn-code`. The errors are judged over the corpus `--features` names, and no other.

---

## Wiring into CI

The point of `spec-controller` is continuous reconciliation, so `balance` belongs in CI, after your tests have produced their reports.

**If you have converted any fitness function, each check step carries its `@SCN` as its `id:` and the job ends with one dump step:**

```yaml
- run: eslint
  id: SCN-<FFF>-<NNN>
  if: always()
- run: pnpm typecheck
  id: SCN-<FFF>-<MMM>
  if: always()
- if: always()
  run: echo '${{ toJSON(steps) }}' > ci-steps.json
```

**The `if: always()` goes on every check step, not just the dump.** Without it the first red aborts the job and every later check is skipped, so the ledger reports one `failing` and N `broken` — a worse account from a correct mechanism. **The dump must be `toJSON(steps)`**: it is the only place a step's `id` and its `outcome` travel together, and `outcome` is the field that survives `continue-on-error` where `conclusion` does not.

**A check that runs on a schedule is still one step here.** A nightly mutation sweep, say: the push step reads the newest scheduled run's conclusion with stock `gh` and carries the scenario's `@SCN` as its `id:`, like any other check step. Nothing is carried across from the scheduled run.

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

Drop `--ci-steps` if you have converted nothing.

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

## Allocating the next scenario code — `spec-controller allocate`

Ask the tool for the next scenario code instead of inventing one:

```bash
spec-controller allocate <FFF>
# SCN-<FFF>-<NNN>
```

The code is one past the highest the repository has **ever** carried for that feature part, so a
retired code is never handed out again: every old reference to it, in history, a chat or a
stale document, keeps meaning what it meant. The number is at least three digits, zero-padded, and
grows past them (`999` is followed by `1000`).

- **The argument** is the feature part, `<FFF>`: two to five characters, each `A`–`Z` or `0`–`9`.
  A part is known when a feature file in `features/` at the top of the repository is headed with
  it — the corpus `balance` reads by default. A part only history or a test fixture carries is not
  known.
- **`--new`** starts a part no feature file's header carries yet, such as a first code in a tree with
  no feature files. Its first code is `001`, or one past any number the repository already carries
  for the part. Given for a part a header already carries, it answers as usual and says so on stderr.
- **stdout** carries the code and nothing else, so a script or an agent can consume it.
- **stderr** says what the answer rests on: `highest seen: SCN-<FFF>-<NNN>, features/<file>.feature:40`, with
  ` in <commit>` when only history carries it; `highest seen: none` for a first code; and, when
  history is short, `history: not a git repository — none read` or `history: shallow clone — history
  before <commit> unread`, each followed by what that risks.
- **Exit codes:** `0` when it answers; `2` for a usage error (no part, a part not in canon's form,
  a second part, a flag it does not take, or a host modifier such as `--store` before it) or an
  unknown part. The message says which of the two it was, and an unknown part's refusal lists the
  parts the feature files carry. It never refuses because history is short. `--help` or `-h`
  anywhere among its arguments answers its help at `0`, even with a host modifier before it.

**What it reads.** Every text file in the repository — tracked, and untracked files the repository
does not ignore, since you allocate because you have just written a scenario — wherever you run it
from. And the added and removed lines of every reachable commit, never commit messages: a code that
only ever appeared in a message was never a scenario, and a message cannot be unwritten. Outside a
git repository it walks the working tree, skipping `node_modules` and hidden directories, whose
packages carry codes of their own.

**Stated limits.**

- **Prose counts.** A code cited in a document or a comment retires its number. It does so visibly,
  because stderr names where the highest code was seen.
- **Only reachable history is read.** A code that only ever lived outside it — on a branch you never
  fetched, or before a shallow clone's edge — is not seen, and stderr says so where it can.
- **Merge resolutions are not read.** `git log -p` shows no diff for a merge commit, so a code that
  existed only in a merge's conflict resolution is invisible to the history read.

---

## Troubleshooting

**No scenarios found / empty report** — check `--features` points at the directory holding your `.feature` files, and that the scenarios carry `@SCN-…` ids and evidence-obligation tags.

**A fitness function shows as `missing` or `watermelon` you didn't expect** — `missing` means the script named for that check isn't in `package.json`; `watermelon` means the script exists but no CI `run:` step actually invokes it over the real source. Both are real findings, not tool errors — that is the point.

**My first run reds with a wall of uncited checks** — expected, and not a misconfiguration. Every step of the workflows `--ci` names is a candidate fitness function until something says otherwise, and a candidate that cites no scenario posts to suspense, so `balance` exits 1. Read the **Discovery scope** and **Step accounting** sections of the report: they name each workflow and job, how many steps were read, and what became of every one of them. Then name your runners, name your non-checks, or narrow `--ci` — see *Naming your runners, and the one limit that remains*. To keep the report while you work it down without redding the build, add `--exit-zero`; delete it when you are ready to gate.

**A step I know is my test suite is reported as a check** — the runner recognition did not reach it. It matches a whole shell token of the step's command or of the `package.json` script the step invokes; a suite run through a `uses:` action, one buried in a quoted argument to a wrapper, or one whose output is piped into another command (`pnpm test | tee test.log`), is not reached. Add the step to `specController.notChecks`. The failure direction is deliberate: a step wrongly reported is one line to fix, a step wrongly excluded would be invisible.

**The verdict reads SCENARIO CODE ERRORS** — the corpus files a scenario code under the wrong feature file, or in a file with no header code, or two files share one. `## Scenario code errors` names each by its handle and file, and says which fix it wants. Every account still reconciles, so the rest of the report is as it would be; the run exits `1` until the codes are filed correctly.

**A row reads `duplicate-scn-code`** — two scenarios carry that `@SCN` code, and the report names them under *The corpus holds N scenarios in M accounts*. Give one of them a code of its own; an `@SCN` hoisted onto a `Feature:` or `Rule:` line is inherited by every scenario beneath it, so move it onto the scenario. While two scenarios share it, the run exits `1`.

**`--json` rejected** — there is no such flag; use `--format json:<path>`.

---

## What's not in this tool

`spec-controller balance` is the reconciliation half of the product. The `analyse` and `migrate` capabilities — retrofitting Gherkin scenarios onto an existing test suite — are a separate, closed offering built on the same reconciliation core; they are not part of this package.
