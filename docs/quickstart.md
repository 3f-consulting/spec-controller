# Quickstart

This guide takes you from nothing to a first `spec-controller balance` run on your own project. By the end, the run is wired into CI, and one test and one CI check are linked to the scenarios they prove.

## What spec-controller does

You write each behaviour of your software as a scenario in a Gherkin `.feature` file. The scenario's tags say what proof it needs, such as `@unit` or `@e2e`. These needs are its **evidence obligations**.

Your test tools and CI already write reports of what ran. Each result in those reports is an **evidence observation**. An observation that never ran to a result is `never-ran`.

The `balance` command matches each observation to the obligation it answers, scenario by scenario, as double entry does. When the two sides disagree, the build goes red. `spec-controller` does not run your tests. It reads the reports your tools already produce.

## What you need

- **Node 22.12 or later.** Check it:

  ```sh
  node --version   # must be v22.12 or higher
  ```

  If your project uses pnpm: Node 25 and later do not bundle corepack, so install pnpm yourself (`npm install -g pnpm`).

- **GitHub Actions.** This is the real requirement: a CI check becomes evidence through the run's own step record.
- **Your evidence, as reports.** A Vitest, Jest or RSpec JSON report, a pytest or other JUnit XML report, or a Cucumber JSON report. Pass whichever you have.
- **Feature files are optional at first.** A project with none still gets a report of every check its pipeline ran.

See [What you need](./user-guide.md#what-you-need) for the full table of inputs and flags.

## Install

At `0.x`, nothing is promised between versions, so pin an exact version. Replace `<version>` with the release you choose:

```sh
npm install --save-dev spec-controller@<version>
```

Then run it as `npx spec-controller`. See [Install](./user-guide.md#install).

## A first run, report only

This example is for a project whose tests run on Vitest. Run these commands from the repository you want to reconcile. First, write the Vitest report:

```sh
npx vitest run --reporter=json --outputFile=reports/vitest.json
```

Then reconcile it:

```sh
npx spec-controller balance \
  --target your-project \
  --features features \
  --vitest reports/vitest.json \
  --ci .github/workflows/ci.yml \
  --package-json package.json \
  --exit-zero
```

- **Every path you pass must exist.** Each report flag points at a file your tools have already written. Leave out any input you don't have. If you have no `features/` folder yet, leave out `--features`: the command refuses a folder that does not exist.
- **`--target` names the project in the report.** Without it, the report uses the name of the git checkout's `origin`. With no `origin`, it reads `unknown-target`.
- **`--exit-zero` stops the build going red while you watch.** A first run against a pipeline with no citations goes red. This is because every fitness function's step (each CI step treated as a check) cites nothing. Every observation then posts to the **unnamed claim**: the Claim Reconciliation for evidence that names no scenario. Without the flag, `balance` exits `1`. With it, you get the same report, but the out-of-balance verdict exits `0`. Remove the flag when you are ready to gate.

For the report command of every other runner, see [Every report, and the whole command](./user-guide.md#every-report-and-the-whole-command).

**Before you name anything, `balance` lists what ran.** Each test and CI step it reads goes to the unnamed claim, in groups by kind of quality check and file. Each group says how many ran, passed and failed, and names each that failed. This list is a starting inventory. The value begins when you name the behaviours.

### Tell it which steps are your tests, and which check nothing

`balance` lists every CI step as a check, except a declared runner, GitHub's own checkout, setup, cache and artifact actions, and the steps that write the step record and run `balance`. Two settings in `package.json` cut the list down:

```jsonc
"specController": {
  "runners": {
    "unit": "vitest",             // the command your CI runs for @unit
    "integration": "cucumber-js", // for @integration
    "e2e": "cucumber-js",         // two layers, one runner, which is normal
    "performance": null           // we have no performance runner
  },
  "notChecks": [
    "ci.yml:build:Install dependencies",
    "ci.yml:build:Publish the package"
  ]
}
```

- **`runners`** declares the command that runs each layer of tests. `balance` then reads that step as your test suite, not as a check. `null` means *we have no runner for this layer*.
- **`notChecks`** lists steps that do work but check nothing, such as publishing. Each entry is `<workflow file>:<job id>:<step name>`, matched exactly.

See [Naming your runners — `runners`](./user-guide.md#naming-your-runners--runners) and [Naming your non-checks — `notChecks`](./user-guide.md#naming-your-non-checks--notchecks).

## Cite one scenario from one test

A scenario's tag line says what it needs proved. `@CLM-<FFF>-<NNN> @unit @e2e` asks for a unit test and an end-to-end run, and both must answer `CLM-<FFF>-<NNN>`. A `@unit` scenario needs no step definitions: a title and its tags are the whole scenario.

`CLM-<FFF>-<NNN>` is the scenario's **claim code**. `<FFF>` is a feature code of two to five uppercase letters or digits, and `<NNN>` is a number. Each feature file has a header code, `@<FFF>`, and the codes of its scenarios must match it. A misfiled code leaves the run not reconciled. [Claim code errors](./user-guide.md#claim-code-errors) explains the header code and the five claim code errors.

Ask the tool for each code instead of inventing one. The tool knows a feature code only when a feature file in `features/`, at the top of the repository, is headed with it. So in a project with no feature files yet, run `allocate` with `--new` for your first code. After that, `allocate <FFF>` gives the next one:

```bash
spec-controller allocate <FFF>
# CLM-<FFF>-<NNN>
```

A Vitest test cites the scenario with the code **in square brackets**, in its `it` title or in the title of an enclosing `describe`. The most specific one wins:

```ts
describe("[CLM-<FFF>-<NNN>] a feature code whose highest live claim code is below a deleted one is offered one past the deleted claim code", () => {
  it("offers the next code", () => { /* … */ });
});
```

For Vitest, Jest, Go, JUnit 5 and RSpec tests, only the bracketed form counts. A code without brackets, or in a comment, names nothing. The test still runs, but it goes to the unnamed claim, and the scenario reads `missing`. **When a `@unit` scenario reads `missing` while its test passes, check the brackets first.**

Other evidence cites in other ways: a pytest test through a `clm` property, a Cucumber run through the scenario's own claim code, and a CI check through its step's `id:`. See [Only these four forms are read](./user-guide.md#only-these-four-forms-are-read).

For how each other runner cites a scenario, see [Citing a scenario from pytest](./user-guide.md#citing-a-scenario-from-pytest), [Citing a scenario from Jest](./user-guide.md#citing-a-scenario-from-jest), [Citing a scenario from Go](./user-guide.md#citing-a-scenario-from-go), [Citing a scenario from Java](./user-guide.md#citing-a-scenario-from-java), [Citing a scenario from Kotlin](./user-guide.md#citing-a-scenario-from-kotlin) and [Citing a scenario from RSpec](./user-guide.md#citing-a-scenario-from-rspec).

## Turn one CI check into a fitness function

A **fitness function** is a whole-system property: complexity, mutation score, type soundness, vocabulary, suite run time. Any check your pipeline runs, in any language, can prove one. You need only two things.

**1. A scenario, tagged `@fitness`, with a code.** Write it the same way as a `@unit`-only scenario: tags, a title, and no Given/When/Then. Its title is the specification.

```gherkin
  @fitness @CLM-<FFF>-<NNN>
  Scenario: every function the push touches measures inside the external complexity standard, and no dead suppression survives
```

**2. That code as the `id:` of the CI step that already runs the check.** The check stays where it is. You add only a citation.

```yaml
      - name: Complexity
        id: CLM-<FFF>-<NNN>
        if: always()
        run: eslint
```

The step's outcome is the evidence: its exit code on its own CI step is the verdict. That outcome reaches `balance` only through the CI run's step record, which you pass with `--ci-steps`. Only a CI run writes that record, so a local run has none. Without it, `balance` reads the step from the workflow alone, and posts it as passed, or as passed-on-error when the step or its job sets `continue-on-error: true`.

If no step has the scenario's code, the scenario reads `missing`. A step that cites a code no scenario has posts to a **phantom claim**: a claim the evidence names and nobody wrote. See [Turn a fitness function into an evidence obligation](./user-guide.md#turn-a-fitness-function-into-an-evidence-obligation).

## Wire the run into CI

`balance` belongs in CI, after your tests have written their reports. spec-controller's own CI workflow runs its steps in this order:

1. Set up Node 22, then install dependencies.
2. Run the test steps, which write the reports.
3. Run the check steps, each with `if: always()`.
4. Dump the run's step record, with `if: always()`.
5. Run `balance`, with `if: always()`.

`if: always()` matters. Without it, the first failing step stops the job, and every later check is skipped. Here are the check steps and the step that dumps the record:

```yaml
- run: eslint
  id: CLM-<FFF>-<NNN>
  if: always()
- run: pnpm typecheck
  id: CLM-<FFF>-<MMM>
  if: always()
- if: always()
  env:
    STEPS_JSON: ${{ toJSON(steps) }}
  run: printf '%s' "$STEPS_JSON" > ci-steps.json
```

The dump must be `toJSON(steps)`. It is the only place that has a step's `id` and its `outcome` together. Pass it to the command through an environment variable, never inline in the command itself. A step's output can contain a quote, and the shell would run whatever follows that quote.

A single Reconcile step then reads the reports and the record. It is the command from the first run, plus the step record. `--format md:$GITHUB_STEP_SUMMARY` puts the report on the run's summary page, and `--format json:reconciliation.json` saves the JSON for any later step or tool:

```yaml
- name: Reconcile
  if: always()
  run: |
    npx spec-controller balance \
      --target your-project \
      --features features \
      --vitest reports/vitest.json \
      --ci-steps ci-steps.json \
      --ci .github/workflows/ci.yml \
      --package-json package.json \
      --format md:$GITHUB_STEP_SUMMARY \
      --format json:reconciliation.json \
      --exit-zero
```

Add `--cucumber reports/cucumber.json` if you have a Cucumber report. Drop `--ci-steps` if you have converted no check. Remove `--exit-zero` when you are ready to gate.

Save the reports as build artefacts, but do not commit them: a report lists the gaps in your codebase. See [Wiring into CI](./user-guide.md#wiring-into-ci) and [GitHub Actions — put the report on the run summary](./user-guide.md#github-actions--put-the-report-on-the-run-summary).

## Read the report

`balance` is a gate. A balanced run exits `0`, and an out-of-balance run exits `1`. Three more exit codes fail even under `--exit-zero`:

- `2` for a usage error.
- `3` when the run is not reconciled.
- `4` when the run stops on an unexpected error before its verdict.

A run is not reconciled when you cannot rely on it. Its run verdict says why: `unsound` when some evidence never ran, `claim-code-errors` when a claim code is misfiled, and `nothing-to-reconcile` when there is nothing to reconcile at all. See [Exit codes](./user-guide.md#exit-codes).

The [README's sample report](../README.md) shows every kind of Claim Reconciliation in one small example. Read it as double entry:

- **The run verdict**, in the report's opening sentence and under `## Summary`, says what the whole run comes to: balanced, out of balance, or not reconciled with its reason.
- **A Claim Reconciliation** is the evidence reconciled for one claim, one row of the `## Claim Reconciliations` table. A claim is usually a scenario. The Claim Reconciliation sets the evidence the claim asks for against the results reported for it.
- **Each Quality Check Reconciliation** pairs one obligation, one piece of evidence, or both, and has an outcome. `satisfied` means the evidence arrived and passed.
- **The verdict** of a Claim Reconciliation is **balanced** or **out-of-balance**.
- **A reconciling item** is a Quality Check Reconciliation whose outcome is not `satisfied`, such as `missing` (no proof arrived) or `failing` (the proof failed). A row lists each one with its kind of quality check, where to look, and what was said.
- **A phantom claim** receives evidence that cites a code no scenario has. This is usually a typo, or the code of a deleted scenario. Each unknown code gets its own phantom claim, named by that code, like the one in the sample whose row reads `cites-unknown-claim`.
- **The unnamed claim** receives evidence that cites no code, several, or a code several scenarios share.

Watch for a **cannot-fail** check. This is a check that is green, but whose CI step or job sets `continue-on-error: true`, so its red might not fail the CI run. Given `--ci-steps`, the step's own outcome answers the row: a swallowed red reads `failing`, and a green still reads `cannot-fail`.

If your first run shows a wall of checks that cite nothing, read the report's **Step account**. It names each workflow and job, how many steps were read, and what happened to each one.

See [Reading the report](./user-guide.md#reading-the-report), [Report rows to know](./user-guide.md#report-rows-to-know) and [Passes that cannot fail](./user-guide.md#passes-that-cannot-fail).

## Where to go next

- Every flag: [Command reference — `balance`](./user-guide.md#command-reference--balance).
- All configuration: [Configuration — the `specController` block](./user-guide.md#configuration--the-speccontroller-block).
- When something reads wrong: [Troubleshooting](./user-guide.md#troubleshooting).
