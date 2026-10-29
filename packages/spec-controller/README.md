# spec-controller

**One command, `balance`, that checks the behaviour your scenarios name against the evidence that actually ran.**

You give it your Gherkin scenarios and the reports your tools already write: a Vitest report, a Cucumber report, and your CI run's own record of what its steps did. It prints one table showing which scenarios have living evidence, which do not, and which evidence ran that no scenario asked for.

It runs nothing itself; it only reads what your pipeline wrote.

Requires Node ≥ 22. ESM only.

## Install

```
npm install -g spec-controller
```

Or run it without installing anything:

```
npx spec-controller balance --help
```

## Your first run

Point it at your scenarios and nothing else:

```
spec-controller balance --features ./features
```

Every scenario gets a row, whether or not any evidence exists for it. You have supplied no reports, so every scenario that names evidence reads **missing** and the run is out-of-balance. That is by design, not a fault in your repository: the tool starts from what you specified, not from what a tool happened to find, and no input makes silence the right answer.

**`balance` fails your build by default.** An out-of-balance run exits `1`, so the run above reds any pipeline you put it in. Two tools it sits beside do the opposite: Stryker's `thresholds.break` defaults to `null` (*"never let your build fail"*), and the Sonar scanner exits `0` whatever its quality gate says unless you set `sonar.qualitygate.wait`. Both make you opt in to gating. `balance` makes you opt out.

### Report first, gate later

To add it to an existing pipeline without redding it on day one, add `--exit-zero`:

```
spec-controller balance --features ./features --vitest ./vitest-report.json --exit-zero
```

The report is byte for byte the one the gate prints: the same rows, the same out-of-balance count, and the same headline naming the code the gate would give. Only the exit status changes:

- Out-of-balance and scenario code errors (`1`), and pending under `--strict` (`3`), exit `0`.
- Usage (`2`), unsound (`4`), nothing to reconcile (`5`) and an unexpected error before the verdict (`6`) still fail. Each means the run could not reach a verdict, and a flag that suppresses verdicts does not suppress that.

Work the out-of-balance rows down, then delete `--exit-zero`, and the gate is on. Do not wrap the step in `continue-on-error` or `|| true` instead. Those swallow the codes that mean the run could not be trusted, and leave nothing in the command to show the gate is off.

### Give it the evidence

```
spec-controller balance \
  --features ./features \
  --vitest ./vitest-report.json \
  --cucumber ./cucumber-report.json
```

A scenario tagged `@unit` names an obligation: a unit test must exist and pass. The evidence answers it by citing the scenario's `@SCN` code in its test name. Where the two agree, the row is **balanced**. Where they do not, the row says how: evidence missing, evidence failing, or evidence that cites a scenario nobody wrote.

## Exit codes

| Exit | What it says |
| --- | --- |
| `0` | balanced — every obligation has evidence, and it holds |
| `1` | out-of-balance — the two records disagree, and the report says where; or a scenario code is misfiled, listed under `## Scenario code errors` |
| `2` | usage — the invocation was wrong |
| `3` | balanced, but carrying Pending Items, and you asked for `--strict` |
| `4` | unsound — a proving suite failed to collect, so the ledger could not be trusted to disagree |
| `5` | nothing to reconcile — no scenario was carried and no evidence was produced, so the run had no basis for a verdict |
| `6` | unexpected error — the run stopped on an error no refusal names, and gave no verdict; one line on stderr names it. `--exit-zero` never moves it |

The whole report is written before the exit code is set, so a failing run still tells you why.

**Design your pipeline for new codes.** The list is open at the top: a state that is none of the above gets a **new** code, not the nearest existing one. The highest is `6`. **Treat an unrecognised non-zero code as a failure you have not seen before**, not as a synonym for `1`. Matching `1` exactly is not affected when a code is added. Treating any non-zero code as a red build is correct, only less precise about why.

**Node's default exit code is never one of these.** A run that cannot reconcile ends on one of its own codes, never by falling out of the process: a crash that exits `1` would look, by status, exactly like an honest disagreement.

**An input it cannot read is a usage error (`2`)**, never a verdict about your code. This covers:

- a mistyped path, or a path it is not permitted to read;
- a file where a directory belongs, or the reverse;
- an unparseable report, or a report that parses but is not in the shape its runner writes;
- a saved reconciliation it cannot render;
- a corpus the Gherkin parser rejects.

The refusal names the input, the path, and what was wrong with it. A well-formed report that holds nothing, such as a Vitest run that matched no test file, is read, not refused.

**An output location it cannot write is also `2`**: a `--format` path that is read-only, a directory, under a regular file or in a directory that does not exist, or a `--store` root the run directory cannot be created under. It is refused before any report is printed, naming the location and the operating system's reason.

`--exit-zero` changes `1` and `3` to `0` and leaves every other code alone (see *Report first, gate later*).

### Re-rendering a saved report

`balance --render-from-json <saved.json>` re-renders a saved report from the same table and exits with the code its verdict names, so a saved run that failed fails again when read back. A report saved under `--strict` records that, so its re-render exits `3` too. `--strict` and `--exit-zero` work beside the re-render as they do on a live run. Any other flag beside it is refused with `2`, because a re-render reads no live input and writes only to stdout.

### `allocate`

`spec-controller allocate` prints the next scenario code for a feature part. It reaches no verdict: it exits `0` when it answers, and `2` for a usage error or an unknown part. A file or directory it cannot read, directly or through git, is a usage error: it is refused, naming the path and the reason, and no code is given.

## On CI

```
spec-controller balance --features ./features \
  --vitest ./vitest-report.json \
  --format md:$GITHUB_STEP_SUMMARY \
  --format json:reconciliation.json
```

`--format` can be repeated and takes an optional `:<path>`. On GitHub Actions, writing Markdown to `$GITHUB_STEP_SUMMARY` puts the reconciliation on the run's summary page, the channel GitHub provides for a table. No action, no plugin, no permission.

`spec-controller balance --help` lists every flag, one line each.

## Where to go next

- **Full flags, worked examples and CI wiring**: [`doc/how_to_use.md`](https://github.com/3f-consulting/spec-controller/blob/main/doc/how_to_use.md)
- **Why `0.x` promises nothing, and what changes at `1.0`**: [`doc/compatibility.md`](https://github.com/3f-consulting/spec-controller/blob/main/doc/compatibility.md)
- **Building your own tooling on the engine instead of running a command**: [`@3f-consulting/spec-controller-core`](https://www.npmjs.com/package/@3f-consulting/spec-controller-core), the same reconciliation logic as a pure library with no CLI and no I/O.

Source, issues and history: [github.com/3f-consulting/spec-controller](https://github.com/3f-consulting/spec-controller).

## Licence

MIT — see [`LICENSE`](https://github.com/3f-consulting/spec-controller/blob/main/packages/spec-controller/LICENSE) in this package. © 2026 3F Consulting Ltd.
