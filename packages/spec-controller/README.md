# spec-controller

**One command, `balance`, that reconciles the behaviour your scenarios name against the evidence that actually ran.**

You hand it your Gherkin scenarios and the reports your tools already produce — a Vitest report, a Cucumber report, your CI run's own record of what its steps did — and it prints one table: which scenarios have living evidence, which do not, and which evidence ran that no scenario asked for.

It runs nothing itself. It reads what your pipeline already wrote.

Requires Node ≥ 22. ESM only.

## Install

```
npm install -g spec-controller
```

Or without installing anything:

```
npx spec-controller balance --help
```

## Your first run

Point it at your scenarios and give it nothing else:

```
spec-controller balance --features ./features
```

Every scenario comes back as a row whether or not any evidence exists for it, so on this first run the ones you have supplied no reports for read **missing** and the run comes back out-of-balance. That is the shape of the tool rather than a fault in your repository: the reconciliation starts from what you specified, not from what a tool happened to find, and there is no input for which the right answer is silence.

**`balance` fails your build out of the box.** An out-of-balance run exits `1`, so the first run above reds any pipeline you put it in. That is a deliberate departure from two tools it sits beside: Stryker's `thresholds.break` defaults to `null` (*"never let your build fail"*), and the Sonar scanner exits `0` whatever its quality gate says unless you set `sonar.qualitygate.wait`. Both make you opt in to gating. `balance` makes you opt out.

### Report first, gate later

To bring it into a pipeline you already have without redding it on day one, add `--exit-zero`:

```
spec-controller balance --features ./features --vitest ./vitest-report.json --exit-zero
```

The report is byte for byte the one the gate prints: the same rows, the same out-of-balance count, and the same headline naming the code the gate would give. Only the exit status moves. Out-of-balance (`1`) and pending under `--strict` (`3`) exit `0`. Usage (`2`), unsound (`4`) and nothing to reconcile (`5`) still fail, because each means the run could not give a verdict at all, and a flag that suppresses verdicts does not suppress that.

Work the out-of-balance rows down, then delete `--exit-zero`, and the gate is on. Don't wrap the step in `continue-on-error` or `|| true` instead: those swallow the codes that mean the run could not be trusted, and they leave nothing in the command to say the gate is off.

Now give it the evidence:

```
spec-controller balance \
  --features ./features \
  --vitest ./vitest-report.json \
  --cucumber ./cucumber-report.json
```

A scenario tagged `@unit` names an obligation — a unit test must exist and pass — and the evidence posts back by citing the scenario's `@SCN` code in its test name. Where the two agree the row is **balanced**. Where they do not, the row says which way: evidence missing, evidence failing, or evidence that cites a scenario nobody wrote.

## What the exit code tells your pipeline

| Exit | What it says |
| --- | --- |
| `0` | balanced — every obligation has evidence, and it holds |
| `1` | out-of-balance — the two records disagree, and the report says where |
| `2` | usage — the invocation was wrong |
| `3` | balanced, but carrying Pending Items, and you asked for `--strict` |
| `4` | unsound — a proving suite failed to collect, so the ledger could not be trusted to disagree |
| `5` | nothing to reconcile — no scenario was declared and no evidence was produced, so the run had no basis for a verdict |

The whole report is written before the code is set, so a failing run still tells you why.

`--exit-zero` moves `1` and `3` to `0` and leaves every other code alone: see *Report first, gate later*.

**Node's default is never one of these.** A run that cannot reconcile ends on an enumerated code of
its own rather than falling out of the process — a crash that exits `1` would be indistinguishable,
by status, from an honest disagreement. **An input the tool cannot read is part of `2`**: a mistyped
path, an unparseable report or a corpus the Gherkin parser rejects are all the invocation being
wrong, never a verdict about your code.

**The enumeration is open at the top, and that is the one thing to design your pipeline around.** A
state that is genuinely none of the above gets a **new** code rather than being folded into the
nearest one — `5` is the most recent, added when a run over a target that had declared nothing and
produced nothing was found reporting `0`. So **treat an unrecognised non-zero code as a failure you
have not seen before**, not as a synonym for `1`. Matching `1` exactly is unaffected by a code being
added; treating *non-zero* as a red build is already correct, and only imprecise about why.

## On CI

```
spec-controller balance --features ./features \
  --vitest ./vitest-report.json \
  --format md:$GITHUB_STEP_SUMMARY \
  --format json:reconciliation.json
```

`--format` is repeatable and takes an optional `:<path>`. On GitHub Actions, writing Markdown to `$GITHUB_STEP_SUMMARY` puts the reconciliation on the run's summary page — the report is a table and that is the channel GitHub provides for one. No action, no plugin, no permission.

`spec-controller balance --help` lists every flag with a line each.

## Where to go next

- **Full flags, worked examples and CI wiring** — [`doc/how_to_use.md`](https://github.com/3f-consulting/spec-controller/blob/main/doc/how_to_use.md)
- **Bringing a check you already have under the reconciliation** — [`doc/converting-a-fitness-check.md`](https://github.com/3f-consulting/spec-controller/blob/main/doc/converting-a-fitness-check.md)
- **Why `0.x` promises nothing, and what changes at `1.0`** — [`doc/compatibility.md`](https://github.com/3f-consulting/spec-controller/blob/main/doc/compatibility.md)
- **Building your own tooling on the engine instead of running a command** — [`@3f-consulting/spec-controller-core`](https://www.npmjs.com/package/@3f-consulting/spec-controller-core), the same reconciliation logic as a pure library with no CLI and no I/O.

Source, issues and history: [github.com/3f-consulting/spec-controller](https://github.com/3f-consulting/spec-controller).

## Licence

MIT — see `LICENSE`, which travels in this package. © 2026 3F Consulting Ltd.
