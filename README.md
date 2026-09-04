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

## Your CI is green. That is not the same as your checks running.

Every analyser in the JavaScript quality stack reports what it **found**. None reports what it **examined**.

- **ESLint** — a clean run prints nothing and exits 0. A config that matches zero source files prints nothing and exits 0. The two are byte-identical; ESLint's own tracker carries the case ([eslint/eslint#16701](https://github.com/eslint/eslint/issues/16701)).
- **dependency-cruiser** — its default reporter is defined by its documentation as printing nothing and exiting 0 when there are no violations. Point it at the wrong path and the build is green.
- **Stryker** escapes this only by refusing — it errors with *"No tests found"* rather than reporting an empty success. **Sonar** escapes it only on its dashboard, where a human can see the file count. Neither your exit code nor your build says anything.

So a green step cannot distinguish *this check ran and passed* from *this check ran over nothing*. Silence is the success signal, and silence is also what a renamed script, a retargeted glob, or a job that quietly stopped triggering produces. Nobody finds out from CI. They find out from the bug, months later.

`spec-controller` cannot emit that silence. It does not start from what a tool found — it starts from your declared scenarios, and **every one is a row in the report whether or not any evidence exists for it**. A check that examined nothing comes back `missing`: a named, out-of-balance row. There is no input for which the correct output is nothing.

That is the answer to *"why, when CI already works?"* — `spec-controller` is not asking you to care about something other than a red build. **It makes the build red when it should be.**

### What it costs

You are already doing the ceremony. A fitness check today means writing the check, adding the script, and wiring it into CI. The register adds a scenario and a tag on top of work you were doing anyway — a slightly more elaborate version of a ceremony that already existed, in exchange for the check being *observable* rather than merely present.

## How it works

Each `@`-tag on a scenario names one **evidence obligation** — naming one **quality-check**'s evidence. A quality-check is a flat, bare tag: a set of peers, never a grid, and never a tag that carries its own group.

**Behavioural checks** sit on a *stepped* scenario — an example of one behaviour:

`@unit` · `@integration` · `@e2e` · `@performance`

**Fitness checks** sit on a *stepless* scenario — a whole-system characteristic against a threshold, exercising no product behaviour:

`@complexity` · `@typecheck` · `@mutation` · `@coverage` · `@ci-run-time` · `@lint` (style and form) · …

The fitness set is **open** — a new gate is a new bare tag, not a change to this list. A tag names the **characteristic**, never the tool and never one specific check: several checks of one characteristic are several stepless scenarios sharing the tag, told apart by their `@SCN` ids.

So a stepped scenario tagged `@unit @integration` names two obligations; a stepless one tagged `@complexity` names one. Each tag asserts *"to prove this, evidence of this quality-check must exist and hold"* — for a behavioural test, that it exists and passes; for a fitness check, that the check is wired into CI and green over the real source, or that its measurement is inside its threshold.

**Every credit posts the same way**: the evidence cites its scenario's `@SCN`. A behavioural test cites the stepped scenario it exercises; a static check or a measurement cites the stepless scenario that raised its obligation. One rule, one direction — a check running uncited posts to the suspense scenario and is surfaced, never dropped.

`spec-controller` reconciles those obligations against the evidence that actually ran, and catches the **watermelon**: a check that is green but enforces nothing.

## How this relates to coverage and mutation testing

Coverage tells you a line ran; mutation testing tells you your tests would notice if that line were wrong. Both grade the tests you have against the code you have — and `spec-controller` consumes their verdicts rather than competing with them. What it adds is the question neither can ask: does every behaviour your scenarios *name* have living, attributed evidence, and is any of the green fake?

Mutation testing has no notion of your specification — a requirement with no test and no code is invisible to it, and it only grades the code it can mutate, saying nothing about whether a static check enforces anything over the real source or whether an integration check is wired at all. `spec-controller` reconciles the whole evidence apparatus against your scenarios: strong *and* complete *and* attributed, not just strong. Keep your coverage gate and your mutation ratchet — `spec-controller` is the ledger they post into.

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

On GitHub Actions, `--format md:$GITHUB_STEP_SUMMARY` writes the reconciliation straight onto the run's summary page — the report is a table, and that is the channel GitHub provides for one. No action, no plugin, no permission.

Full flags, examples, and CI wiring: [`doc/how_to_use.md`](./doc/how_to_use.md).

Running a check on a schedule and gating every push on its result — a nightly mutation sweep, a long soak — see [`doc/scheduled-checks.md`](./doc/scheduled-checks.md).

## The library

The reconciliation engine ships separately as the pure, embeddable library **`@3f-consulting/spec-controller-core`** — same logic, no CLI, no I/O — so you can build your own tooling on top of it.

## License

MIT — see [`LICENSE`](./LICENSE). © 2026 3F Consulting Ltd.
