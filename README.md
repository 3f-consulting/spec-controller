# spec-controller

**Reconciliation-driven development for the age of AI-generated code.**

`spec-controller` reconciles the behaviour your scenarios *name* against the evidence that actually *ran* — surfacing what's missing, failing, or fabricated — so correctness comes from mechanical agreement between independent representations, not from any single artefact an AI can quietly corrupt.

Give it your Gherkin scenarios plus the reports from the tools that ran (Vitest, Cucumber, your CI lint gates) and it produces one report: which scenarios are **balanced** (the required evidence exists and holds), which are **out-of-balance** (evidence missing, failing, or a green-but-fake *watermelon*), and which evidence ran that no scenario asked for.

## Why

Automated testing aspires to be the software equivalent of **double-entry accounting**: overhead in exchange for verifiable safety. Every scenario names the evidence it requires (the **debit** — specification); every observed test or static check is attributed to a scenario (the **credit** — reality); and the report — the **Evidence Reconciliation** — shows whether the two records agree. Neither record is authoritative alone; a claim is trustworthy only where the two match.

The failure mode it exists to prevent, from a real first experience of AI-assisted coding:

> I created an app with automated tests. After a few prompt iterations the AI solved the failing tests by deleting them — which I didn't notice. On the next iteration it started removing the functionality those tests had protected. I ended up with nothing useful, just going in a circle.

That is not a bug in the AI. It optimises for the observable objective — *"tests pass"* — and *"delete the failing test"* is a valid satisfying move when nothing prevents it. Every fix that lives *inside* the AI's loop — better prompts, smarter agents, more guardrails — inherits the same loophole.

`spec-controller` puts the constraint *outside* the loop. A scenario tagged `@unit` names an **evidence obligation**: a unit test must exist and pass. Delete it and the reconciliation goes out of balance — *required: unit; observed: none* — and CI rejects the change. The AI cannot edit its way out, because the obligation lives in the scenario's tags and is checked by machinery the generation loop doesn't control.

That is the difference from spec-driven development. A spec is a *moment* of discipline that expires the instant code evolves past it — and the spec is itself AI-touched, subject to the same failure mode it is meant to defend against. Reconciliation is a *continuous* discipline that holds at every CI run.

## How it works

Each `@`-tag on a scenario names one **evidence obligation** — naming one **quality-check**'s evidence. Quality-check is a single flat, mutually-exclusive key, not a grid:

`@lint` · `@unit` · `@integration` · `@e2e` · `@performance`

`@unit` / `@integration` / `@e2e` / `@performance` are runtime tests; `@lint` is a **static check** over the source artefact. `@lint` isn't a second axis — it's one quality-check value, the one whose evidence is *enforcement over the real source* rather than a passing test. So a scenario tagged `@lint @unit @integration` names three obligations, not one combined thing. Each tag asserts *"to prove this scenario, evidence of this quality-check must exist and hold"* — for a runtime test, that it exists and passes; for `@lint`, that the guard is wired into CI and green over the real source, not merely fixture-green. `spec-controller` reconciles those obligations against the evidence that actually ran and catches the **watermelon**: a guard that is green but enforces nothing.

## Install

```
npm install -g spec-controller
```

Requires Node ≥ 22.

## Quick start

```
spec-controller balance \
  --features ./features \
  --vitest ./vitest-report.json \
  --cucumber ./cucumber-report.json
```

By default the reconciliation report prints to stdout as Markdown. Route it to files, or emit JSON, with `--format` (repeatable):

```
spec-controller balance --features ./features \
  --format md:reconciliation.md \
  --format json:reconciliation.json
```

Full flags, examples, and CI wiring: [`doc/how_to_use.md`](./doc/how_to_use.md).

## The library

The reconciliation engine ships separately as the pure, embeddable library **`@3f-consulting/spec-controller-core`** — same logic, no CLI, no I/O — so you can build your own tooling on top of it.

## License

MIT — see [`LICENSE`](./LICENSE). © 2026 3F Consulting Ltd.
