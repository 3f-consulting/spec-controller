# spec-controller

**One command, `balance`, that checks the behaviour your scenarios name against the evidence that actually ran.**

You give it your Gherkin scenarios and the reports your tools already write: a Vitest report, a Cucumber report, and your CI run's own record of what its steps did. It prints one report. The report shows which scenarios have evidence from this run that holds, which do not, and which evidence ran that no scenario asked for.

It runs nothing itself. It only reads what your pipeline wrote.

It requires Node ≥ 22.12. It is ESM only.

## Install

```
npm install -g spec-controller
```

Or run it without installing anything:

```
npx spec-controller balance --help
```

## Your first run

Point it at your scenarios and give it no test reports:

```
spec-controller balance --features ./features
```

Every scenario gets a Claim Reconciliation, whether or not any evidence exists for it. You have supplied no test reports. So every scenario that names a test reads **missing**, and the run is out-of-balance. (By default, `balance` still reads your CI workflows in `.github/workflows` and your `package.json`. So a scenario that a CI step answers can balance.) This is by design. It is not a fault in your repository. The tool starts from what you specified, not from what a tool happened to find. No input makes saying nothing the right answer.

**`balance` fails your build by default.** An out-of-balance run exits `1`, so the run above fails any pipeline you put it in. Two tools used alongside it do the opposite. Stryker's `thresholds.break` defaults to `null` (*"never let your build fail"*). The Sonar scanner exits `0` whatever its quality gate says, unless you set `sonar.qualitygate.wait`. Both make you opt in to gating. `balance` makes you opt out.

### Report first, gate later

To add it to an existing pipeline without failing that pipeline on day one, add `--exit-zero`:

```
spec-controller balance --features ./features --unit vitest:vitest:./vitest-report.json --exit-zero
```

The report is the same one a run without the flag prints. It has the same Claim Reconciliations, the same counts and the same run verdict. Only the exit status changes:

- Out-of-balance (`1`) exits `0`.
- Usage (`2`), not reconciled (`3`) and an unexpected error (`4`) still fail. Each one means the run could not be relied on, or reached no verdict. A flag that relaxes a verdict does not relax these.

Work through the out-of-balance rows, then delete `--exit-zero`. The gate is then on. To gate on the scenarios you have written before every test cites one, replace `--exit-zero` with `--written-claims-only`: the run verdict then counts only the executable claims. Do not wrap the step in `continue-on-error` or `|| true` instead. Those swallow the codes that mean the run could not be trusted. They also leave nothing in the command to show that the gate is off.

### Give it the evidence

```
spec-controller balance \
  --features ./features \
  --unit vitest:vitest:./vitest-report.json \
  --integration cucumber-js:cucumber:./cucumber-report.json
```

`--unit` and `--integration` each name a runner of that layer, in the long form `<runner>:<format>:<report>`: the runner, the format of the report it writes, and the report's path. Each result in the report is evidence of the runner's layer. When the CI step that runs the runner writes its report, name the runner alone, as `--unit vitest`: `balance` finds the report from that step, in the workflows in `.github/workflows` or the ones `--ci` names.

The same settings can live in `spec-controller.yml` at the top of your repository, keyed by the flags' names (`features: ./features`, `unit: [vitest]`), so the command is `spec-controller balance` alone. A setting given on the command line replaces the file's.

A scenario tagged `@unit` raises an evidence obligation: a unit test must exist and pass. The evidence answers it by citing the scenario's claim code in its test name. Where the two agree, the Claim Reconciliation is **balanced**. Where they do not, it says how: evidence missing, evidence failing, or evidence that cites a scenario nobody wrote.

## Exit codes

| Exit | What it says |
| --- | --- |
| `0` | balanced — every obligation has evidence, and that evidence holds |
| `1` | out-of-balance — the scenarios and the evidence disagree, and the report says where |
| `2` | usage — the invocation was wrong, or an input could not be read |
| `3` | not reconciled — the run could not be relied on. Its run verdict says why: `unsound`, when some evidence never ran; `claim-code-errors`, when a claim code is misfiled (the report lists it under `## Errors in the inputs`); or `nothing-to-reconcile`, when there is no Claim Reconciliation the run verdict counts |
| `4` | unexpected error — the run stops on an error that no refusal names, and gives no verdict. One line on stderr names the error |

The tool writes the whole report before it sets the exit code. So a failing run still tells you why.

**Design your pipeline for new codes.** The list can grow. A state that is none of the above gets a **new** code, above the highest, not the nearest existing one. The highest is `4`. **Treat an unrecognised non-zero code as a failure you have not seen before**, not as a synonym for `1`. A new code does not affect a pipeline that matches `1` exactly. A pipeline that treats any non-zero code as a failed build is correct, only less precise about why.

**Node's default exit code is never one of these.** A run that cannot reconcile ends on one of the codes above. It never ends by crashing out of the process. A crash that exits `1` would have the same exit status as an honest disagreement.

**An input it cannot read is a usage error (`2`)**, never a verdict about your code. This covers:

- a mistyped path, or a path it is not permitted to read;
- a file where a directory belongs, or the reverse;
- an unparseable report, or a report that parses but is not in the shape its runner writes;
- a corpus the Gherkin parser rejects.

The refusal names the input, the path, and what was wrong with it. A well-formed report with nothing in it is read, not refused. A runner's report with no file at its path, named in a long form or by the CI step that runs the runner, is not refused either: the report names the path under `## Errors in the inputs` as `runner-report-not-read`, and the run goes on. An example is a Vitest run that matched no test file.

**An output location it cannot write is also `2`.** This covers a `--format` path that is read-only, is a directory, is under a regular file, or is in a directory that does not exist. The tool refuses it before it prints any report. The refusal names the location and the reason.

`--exit-zero` changes `1` to `0` and leaves every other code alone (see *Report first, gate later*).

### `allocate`

`spec-controller allocate` prints the next claim code for a feature code. It reaches no verdict. It exits `0` when it answers, and `2` for a usage error or an unknown feature code. A file or directory it cannot read, directly or through git, is a usage error. The tool refuses it, names the path and the reason, and gives no code.

## On CI

```
spec-controller balance --features ./features \
  --unit vitest:vitest:./vitest-report.json \
  --format md:$GITHUB_STEP_SUMMARY \
  --format json:reconciliation.json
```

You can repeat `--format`. It takes an optional `:<path>`. On GitHub Actions, writing Markdown to `$GITHUB_STEP_SUMMARY` puts the reconciliation on the run's summary page. GitHub provides that page for showing a table. Writing there needs no action, no plugin and no permission.

`spec-controller balance --help` lists every flag, one line each.

## Where to go next

- **Full flags, worked examples and CI wiring**: [`docs/user-guide.md`](https://github.com/3f-consulting/spec-controller/blob/main/docs/user-guide.md)
- **Why `0.x` promises nothing, and what changes at `1.0`**: [`docs/compatibility.md`](https://github.com/3f-consulting/spec-controller/blob/main/docs/compatibility.md)
- **Building your own tooling on the engine instead of running a command**: [`@3f-consulting/spec-controller-core`](https://www.npmjs.com/package/@3f-consulting/spec-controller-core), the same reconciliation logic as a pure library with no CLI and no I/O.

Source, issues and history: [github.com/3f-consulting/spec-controller](https://github.com/3f-consulting/spec-controller).

## Licence

MIT — see [`LICENSE`](https://github.com/3f-consulting/spec-controller/blob/main/packages/spec-controller/LICENSE) in this package. © 2026 3F Consulting Ltd.
