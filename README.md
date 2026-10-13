# spec-controller

**Reconciliation-driven development for the age of AI-generated code.**

`spec-controller` reconciles the behaviour your scenarios *name* against the evidence that actually *ran* — surfacing what's missing, failing, or green over a check whose job could not fail — so correctness comes from mechanical agreement between independent representations, not from any single artefact an AI can quietly corrupt.

Give it your Gherkin scenarios plus the reports from the tools that ran (Vitest, Cucumber, your CI lint gates) and it produces one report: which scenarios are **balanced** (the evidence answering each Evidence Obligation exists and holds), which are **out-of-balance** (evidence missing, failing, or a *watermelon*: green from a check whose red its job would have survived), and which evidence ran that no scenario asked for.

## Why

Automated testing aspires to be the software equivalent of **double-entry accounting**: overhead in exchange for verifiable safety. Every scenario raises an Evidence Obligation naming the evidence (the **debit** — specification); every observed test or fitness function is attributed to a scenario (the **credit** — reality); and the report — the **Evidence Reconciliation** — shows whether the two records agree. Neither record is authoritative alone; a claim is trustworthy only where the two match.

The failure mode it exists to prevent, from a real first experience of AI-assisted coding:

> I created an app with automated tests. After a few prompt iterations the AI solved the failing tests by deleting them — which I didn't notice. On the next iteration it started removing the functionality those tests had protected. I ended up with nothing useful, just going in a circle.

That is not a bug in the AI. It optimises for the observable objective — *"tests pass"* — and *"delete the failing test"* is a valid satisfying move when nothing prevents it. Every fix that lives *inside* the AI's loop — better prompts, smarter agents, more guardrails — inherits the same loophole.

`spec-controller` puts the constraint *outside* the loop. A scenario tagged `@unit` names an **evidence obligation**: only a unit test that exists and passes answers it. Delete it and the reconciliation goes out of balance — *Evidence Obligation: unit; Evidence Observation: none* — and CI rejects the change. Deleting the test does not get past *that*, because the obligation lives in the scenario's tags and is checked by machinery the generation loop doesn't control. Deleting the scenario as well does: with no obligation left, the reconciliation balances, and only the diff and its review show what went.

**And here is where that stops, said plainly rather than left to be found.** The constraint holds for behaviour a scenario names. Code that arrives with *no* scenario raises no obligation, so nothing goes out of balance and the reconciliation is green — correctly, because there is no claim to check it against. Deleting a test is what an agent does when it is cornered; writing new code is what it does all day, and this closes the first direction, not the second. And a balanced scenario means its evidence exists and holds, not that the evidence tests what the scenario says: where the runner is not Cucumber — usually `@unit`, `@performance` and `@fitness` — the scenario carries no Given/When/Then, and nothing reds if its title drifts from the check. Whether a test is a good test is assumed, and is yours. That narrowness is what makes the rest of the claim worth anything: what `spec-controller` guarantees, it guarantees mechanically, and it says where the guarantee stops.

That is the difference from spec-driven development. A spec is a *moment* of discipline that expires the instant code evolves past it — and the spec is itself AI-touched, subject to the same failure mode it is meant to defend against. Reconciliation is a *continuous* discipline that holds at every CI run.

## Your CI is green. That is not the same as your checks running.

Every analyser in the JavaScript quality stack reports what it **found**. None reports what it **examined**.

- **ESLint** — a clean run prints nothing and exits 0. A config that matches zero source files prints nothing and exits 0. The two are byte-identical; ESLint's own tracker carries the case ([eslint/eslint#16701](https://github.com/eslint/eslint/issues/16701)).
- **dependency-cruiser** — its default reporter is defined by its documentation as printing nothing and exiting 0 when there are no violations. Point it at the wrong path and the build is green.
- **Stryker** escapes this only by refusing — it errors with *"No tests found"* rather than reporting an empty success. **Sonar** escapes it only on its dashboard, where a human can see the file count. Neither your exit code nor your build says anything.

So a green step cannot distinguish *this check ran and passed* from *this check ran over nothing*. Silence is the success signal, and silence is also what a renamed script, a retargeted glob, or a job that quietly stopped triggering produces. Nobody finds out from CI. They find out from the bug, months later.

`spec-controller` cannot emit that silence. It does not start from what a tool found — it starts from the scenarios you wrote, and **every one is a row in the report whether or not any evidence exists for it**. A scenario no step runs a check for comes back `missing`: a named, out-of-balance row. There is no input for which the correct output is nothing.

What a row checks is that the check **ran** and what it **reported**, read from the step's outcome in your CI run's record — so a red that `continue-on-error` swallowed still reds its row. Read from the workflow file alone, without that record, a check whose job would survive its red comes back `watermelon`. Neither checks what the check examined. A step that lints zero files and exits 0 reads `satisfied`: what a tool examined is in the tool's own output, and `spec-controller` reads none of it.

That is the answer to *"why, when CI already works?"* — `spec-controller` is not asking you to care about something other than a red build. **It makes the build red when it should be.**

### What it costs

You are already doing the ceremony. A fitness function means writing the check, adding the script, and wiring it into CI — and you have done all three. **Start by installing it and changing nothing**: every check your pipeline ran comes back listed, with the fact that nothing raised an Evidence Obligation for any of them. Put an id on a check's CI step and that Evidence Observation becomes attributable. Write a scenario for it, tagged as you already tag `@unit`, and it reconciles. Three states, and you stop where the value stops for you. Nothing is translated, generated into a workflow, or moved out of your pipeline.

## How it works

Each `@`-tag on a scenario names one **evidence obligation** — naming one **quality-check**'s evidence. A quality-check is a flat, bare tag: a set of peers, never a grid, and never a tag that carries its own group.

**Behavioural checks** sit on a *stepped* scenario — an example of one behaviour:

`@unit` · `@integration` · `@e2e` · `@performance`

**Fitness functions** sit under **one** tag — `@fitness` — because there is one runner and one evidence stream behind all of them:

`@fitness`

A fitness function is a whole-system property — complexity, mutation score, type soundness, vocabulary, suite run time — and it is **two things**: the `@fitness` scenario, and its `@SCN` on the CI step that already runs the check:

```yaml
      - name: Complexity
        id: SCN-<FFF>-<NNN>
        if: always()
        run: eslint
```

You write nothing of ours. There is no manifest list of fitness functions, and nothing carries a bar: the mutation bar is Stryker's own `thresholds.break`, and its scenario is answered by one push step that reads the newest nightly sweep's verdict: see [`doc/how_to_use.md`](./doc/how_to_use.md) → *Wiring into CI*.

**One `@fitness` scenario is one check.** The tag says *how the claim is proved*; the scenario's **title** says what the check is about, and its `@SCN` is its identity — so several checks are several scenarios, and nothing classifies them further: no word, no roster, no roll-up. A `package.json` of yours that still carries the retired `specController.fitnessChecks` key reconciles to the same ledger and the same exit code as the same tree without it; the report names the key under `## Configuration not read`, in the words it uses for any key the `specController` block does not read, and says nothing of what it once did.

So a stepped scenario tagged `@unit @integration` names two obligations; a `@fitness` scenario names one. Each tag asserts *"to prove this, evidence of this quality-check must exist and hold"* — for a behavioural test, that it exists and passes; for a fitness function, that its command ran, and that any number it produced is inside its bar.

**Every Evidence Observation posts the same way**: the evidence cites its scenario's `@SCN`. A behavioural test cites the stepped scenario it exercises; a fitness function cites the scenario its CI step's `id:` names. One rule, one direction — a check running uncited posts to the suspense scenario and is surfaced, never dropped, and a `@fitness` scenario nothing cites reconciles **missing**, exactly as a `@unit` scenario with no test does.

### Your pipeline keeps every check exactly where it already is

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

**Your checks are already commands in your pipeline, and a run of that pipeline is already a record of what each one did — written by your CI provider, for its own purposes.** So `spec-controller` reads that record, and runs nothing itself. What you write is an `id:` per check step — the `@SCN` of the scenario that names it, a **citation**, never a definition of the check — and one dump step per job.

**The `if: always()` is on every check step, not just the dump.** Without it the first red aborts the job and every later check is skipped, so the ledger reports one failure and N never-rans — a worse account from a correct mechanism.

**The record must carry `outcome`, never `conclusion`.** `conclusion` is post-`continue-on-error`: a step marked with it that actually failed reports `success` there. `outcome` is the step's real result, and `toJSON(steps)` is the only place `outcome` and `id` travel together.

**Nothing moves out of your pipeline.** Your steps keep their names, their order, their matrix, their caching, and their language — the citation is an attribute, and it works over `ruff` as well as over `eslint`.

`spec-controller` reconciles those obligations against the evidence that actually ran, and a red your pipeline swallowed still reds its scenario, because the record carries the step's own outcome.

## How this relates to coverage and mutation testing

Coverage tells you a line ran; mutation testing tells you your tests would notice if that line were wrong. Both grade the tests you have against the code you have — and `spec-controller` consumes their verdicts rather than competing with them. What it adds is the question neither can ask: does every behaviour your scenarios *name* have living, attributed evidence, and is any of the green fake?

Mutation testing has no notion of your specification — a scenario with no test and no code is invisible to it, and it only grades the code it can mutate, saying nothing about whether a fitness function enforces anything over the real source or whether an integration check is wired at all. `spec-controller` reconciles the whole evidence apparatus against your scenarios: strong *and* complete *and* attributed, not just strong. Keep your coverage gate and your mutation ratchet — `spec-controller` is the ledger they post into.

## Install

```
npm install -g spec-controller@alpha
```

`@alpha` is not optional until `0.1.0` publishes: a bare install resolves `latest`, which npm set to `0.1.0-alpha.1` on the first publish, and that version has no `--ci-steps` and no scenario code errors.

Requires Node ≥ 22.

## Quick start

```
spec-controller balance \
  --features ./features \
  --vitest ./vitest-report.json \
  --cucumber ./cucumber-report.json
```

`balance` is a gate: an out-of-balance run exits `1` and fails your build. That diverges from Stryker, whose `thresholds.break` defaults to `null`, and from the Sonar scanner, which exits `0` unless you set `sonar.qualitygate.wait`. To report first and gate later, add `--exit-zero`. You get the same report, and exit `0` on an out-of-balance verdict or a `--strict` pending one. A usage fault, an unsound run or a run with nothing to reconcile still fails. Remove the flag when the ledger balances.

By default the reconciliation report prints to stdout as Markdown. Route it to files, or emit JSON, with `--format` (repeatable):

```
spec-controller balance --features ./features \
  --format md:reconciliation.md \
  --format json:reconciliation.json
```

On GitHub Actions, `--format md:$GITHUB_STEP_SUMMARY` writes the reconciliation straight onto the run's summary page — the report is a table, and that is the channel GitHub provides for one. No action, no plugin, no permission.

Full flags, examples, and CI wiring: [`doc/how_to_use.md`](./doc/how_to_use.md).

Running a check on a schedule and gating every push on its result, such as a nightly mutation sweep: see [`doc/how_to_use.md`](./doc/how_to_use.md) → *Wiring into CI*.

Before you wire this into a repository you intend to keep: this package is at a `0.x` version, which under semantic versioning promises nothing — [`doc/compatibility.md`](./doc/compatibility.md) says so plainly, and says what changes at `1.0`. Pin an exact version.

## The library

The reconciliation engine ships separately as the pure, embeddable library **`@3f-consulting/spec-controller-core`** — same logic, no CLI, no I/O — so you can build your own tooling on top of it.

## License

MIT — see [`LICENSE`](./LICENSE). © 2026 3F Consulting Ltd.
