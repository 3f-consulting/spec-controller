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

The whole report is written before the code is set, so a failing run still tells you why.

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
- **What is supported today, and what would break you** — [`doc/compatibility.md`](https://github.com/3f-consulting/spec-controller/blob/main/doc/compatibility.md)
- **Building your own tooling on the engine instead of running a command** — [`@3f-consulting/spec-controller-core`](https://www.npmjs.com/package/@3f-consulting/spec-controller-core), the same reconciliation logic as a pure library with no CLI and no I/O.

Source, issues and history: [github.com/3f-consulting/spec-controller](https://github.com/3f-consulting/spec-controller).

## Licence

MIT — see `LICENSE`, which travels in this package. © 2026 3F Consulting Ltd.
