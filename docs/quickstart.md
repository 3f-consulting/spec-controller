# Quickstart

This guide takes you from nothing to a first `spec-controller balance` run on your own project. At the end, the run is wired into CI, one test cites the scenario it proves, and one CI check cites a different scenario that it proves.

## What spec-controller does

You write each behaviour of your software as a scenario in a Gherkin `.feature` file. The scenario's tags say what proof it needs, such as `@unit` or `@e2e`. These needs are its **evidence obligations**.

Your test tools and CI already write reports of what ran. Each result in those reports is an **evidence observation**. An evidence observation that never ran to a result is `never-ran`.

The `balance` command matches each evidence observation to the evidence obligation it answers, scenario by scenario, as double entry does. When the two sides disagree, the build goes red. `spec-controller` does not run your tests. It reads the reports your tools already produce.

## What you need

- **Node 22.12 or later.** Check it:

  ```sh
  node --version   # must be v22.12 or higher
  ```

  Node 25 and later do not bundle corepack, so if your project uses pnpm, install pnpm yourself (`npm install -g pnpm`).

- **GitHub Actions.** This is the real requirement: a CI check becomes evidence through the CI run's own step record.
- **Your evidence, as reports.** Pass whichever of these you have: a Vitest, Jest or RSpec JSON report, a pytest or other JUnit XML report, or a Cucumber JSON report.
- **Feature files, which are optional at first.** A project with no feature files still gets a report of every check its pipeline ran.

[What you need](./user-guide.md#what-you-need) in the user guide has the full table of inputs and flags.

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

- **Every path you pass must exist.** Each report flag points at a file your tools have already written. Leave out any input you don't have. The command refuses a folder that does not exist, so if you have no `features/` folder yet, leave out `--features`.
- **`--target` names the project in the report.** Without `--target`, the report uses the name of the git checkout's `origin`. With no `origin`, the report reads `unknown-target`.
- **`--exit-zero` stops the build going red while you watch.** A first run against a pipeline with no citations goes red, because every fitness function (each CI step treated as a check) cites nothing. Every evidence observation then posts to the **unnamed claim**, which holds the evidence that names no scenario. Without `--exit-zero`, `balance` exits `1`. With it, you get the same report, but an out-of-balance run verdict exits `0`. Remove the flag when you are ready to gate.

For the report command of every other runner, see [Every report, and the whole command](./user-guide.md#every-report-and-the-whole-command).

**Before you name anything, `balance` lists what ran.** Each test and fitness function that cites no code goes to the unnamed claim. The report groups them by kind of quality check and by file. Each group says how many ran, how many passed and how many failed, and names each one that failed. A test or fitness function that cites a code no scenario has goes to a phantom claim.

`balance` lists every CI step as a check, except these, which post nothing:

- a step that runs a declared runner;
- GitHub's own checkout, setup, cache and artifact actions;
- the reconciler's own steps: the steps that write the step record and run `balance`;
- a non-check.

This list is a starting inventory. The value begins when you name the behaviours.

### Tell it which steps are your tests, and which check nothing

Two settings in `package.json` make the list shorter:

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
- **`notChecks`** lists steps that do work but check nothing, such as publishing. Each entry is `<workflow file>:<job id>:<step name>`, and must match exactly.

See [Naming your runners — `runners`](./user-guide.md#naming-your-runners--runners) and [Naming your non-checks — `notChecks`](./user-guide.md#naming-your-non-checks--notchecks).

## Cite one scenario from one test

A scenario's tag line says what it needs proved. `@CLM-<FFF>-<NNN> @unit @e2e` asks for a unit test and an end-to-end run, and both must answer `CLM-<FFF>-<NNN>`. A `@unit` scenario needs no step definitions: its title and its tags are the whole scenario.

`CLM-<FFF>-<NNN>` is the scenario's **claim code**. `<FFF>` is a feature code of two to five uppercase letters or digits. `<NNN>` is a number. Each feature file declares its feature code, `@<FFF>`, on the line above `Feature:`, and the claim codes of its scenarios must match it. A misfiled code leaves the run not reconciled. [Claim code errors](./user-guide.md#claim-code-errors) explains the feature code and the five claim code errors.

Ask the tool for each code. Do not invent one. The tool knows a feature code only when a feature file in `features/`, at the top of the repository, is headed with that code. So in a project with no feature files yet, run `allocate` with `--new` to get your first code. After that, `allocate <FFF>` gives the next one:

```bash
spec-controller allocate <FFF>
# CLM-<FFF>-<NNN>
```

A Vitest test cites the scenario by putting the code **in square brackets**, in the test's `it` title or in the title of an enclosing `describe`. The most specific one wins:

```ts
describe("[CLM-<FFF>-<NNN>] a feature code whose highest live claim code is below a deleted one is offered one past the deleted claim code", () => {
  it("offers the next code", () => { /* … */ });
});
```

For Vitest, Jest, Go, JUnit 5 and RSpec tests, only the bracketed form counts. A code without brackets, or a code in a comment, names nothing. The test still runs, but its evidence observation goes to the unnamed claim, and the scenario reads `missing`. **When a `@unit` scenario reads `missing` while its test passes, check the brackets first.**

Other evidence cites a scenario in other ways. A pytest test cites it with a `clm` property. A Cucumber run cites it with the scenario's own claim code. A CI check cites it with its step's `id:`. See [Only these four forms are read](./user-guide.md#only-these-four-forms-are-read).

For how each other runner cites a scenario, see [Citing a scenario from pytest](./user-guide.md#citing-a-scenario-from-pytest), [Citing a scenario from Jest](./user-guide.md#citing-a-scenario-from-jest), [Citing a scenario from Go](./user-guide.md#citing-a-scenario-from-go), [Citing a scenario from Java](./user-guide.md#citing-a-scenario-from-java), [Citing a scenario from Kotlin](./user-guide.md#citing-a-scenario-from-kotlin) and [Citing a scenario from RSpec](./user-guide.md#citing-a-scenario-from-rspec).

## Turn one CI check into a fitness function

A **fitness function** checks a whole-system property, such as complexity, mutation score, type soundness, vocabulary or suite run time. Any check your pipeline runs, in any language, can prove one. You need only two things.

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

The step's outcome is the evidence, and the check's exit code, on its own CI step, decides that outcome. The outcome reaches `balance` only through the CI run's step record, which you pass with `--ci-steps`. Only a CI run writes that record, so a local run has none.

A step the record does not name, and every step when no record is given, is posted as not recorded, citing no code. It is never reported as passed, never credited to a claim, and never posted to a phantom claim.

If no recorded step has the scenario's code, the scenario reads `missing`. A recorded step that cites a code no scenario has posts to a **phantom claim**: a claim the evidence names and nobody wrote. See [Turn a fitness function into an evidence obligation](./user-guide.md#turn-a-fitness-function-into-an-evidence-obligation).

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

The dump must be `toJSON(steps)`, because it is the only place that has a step's `id` and its `outcome` together. Pass it to the command through an environment variable, never inline in the command itself: a step's output can contain a quote, and the shell would run whatever follows that quote.

A single Reconcile step then reads the reports and the record. It is the command from the first run, plus the step record. `--format md:$GITHUB_STEP_SUMMARY` puts the report on the run's summary page. `--format json:reconciliation.json` saves the JSON for any later step or tool:

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

A run is not reconciled when you cannot rely on it. Its run verdict says why:

- `unsound` when some evidence never ran.
- `claim-code-errors` when a claim code is misfiled.
- `nothing-to-reconcile` when there is nothing to reconcile at all.

See [Exit codes](./user-guide.md#exit-codes).

The [README's sample report](../README.md) shows every kind of Claim Reconciliation in one small example. Read it as double entry:

- **The run verdict**, under `## Summary`, says what the whole run comes to: balanced, out of balance, or not reconciled with its reason.
- **A Claim Reconciliation** is the evidence reconciled for one claim: one row of the `## Claim Reconciliations` table. A claim is usually a scenario. The Claim Reconciliation sets the evidence the claim asks for against the results reported for it.
- **Each Quality Check Reconciliation** pairs one evidence obligation, one evidence observation, or both, and has an outcome. `satisfied` means the evidence arrived and passed.
- **The verdict** of a Claim Reconciliation is **balanced** or **out-of-balance**.
- **A reconciling item** is a Quality Check Reconciliation whose outcome is not `satisfied`, such as `missing` (no proof arrived) or `failing` (the proof failed). A row lists each reconciling item with its kind of quality check, where to look, and what was said.
- **A phantom claim** receives evidence that cites a code no scenario has. The cause is usually a typo, or the code of a deleted scenario. Each unknown code gets its own phantom claim, named by that code. The sample has one, and its row reads `cites-unknown-claim`.
- **The unnamed claim** receives evidence that cites no code, several codes, or a code several scenarios share. It also receives each step the step record does not name, and its fitness group shows how many were not recorded.

Watch for a **cannot-fail** check. It is green, but its CI step or job sets `continue-on-error` to anything but `false`, so its red might not fail the CI run. It is read from the step record that `--ci-steps` passes, and the step's own outcome answers the row: a swallowed red reads `failing`, and a green still reads `cannot-fail`.

If your first run lists many checks that cite nothing, read the report's **Step account**. It names each workflow and job, how many steps were read, and what happened to each step.

See [Reading the report](./user-guide.md#reading-the-report), [Report rows to know](./user-guide.md#report-rows-to-know) and [Passes that cannot fail](./user-guide.md#passes-that-cannot-fail).

## Where to go next

- Every flag: [Command reference — `balance`](./user-guide.md#command-reference--balance).
- All configuration: [Configuration — the `specController` block](./user-guide.md#configuration--the-speccontroller-block).
- When something reads wrong: [Troubleshooting](./user-guide.md#troubleshooting).
