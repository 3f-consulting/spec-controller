# Quickstart

This guide takes you from nothing to a first `spec-controller balance` run on your own project, wired into CI, with one test and one CI check linked to the scenarios they prove.

## What spec-controller does

You write each behaviour of your software as a scenario in a Gherkin `.feature` file. Its tags say what proof it needs, such as `@unit` or `@e2e`. These needs are its **evidence obligations**: the proofs a scenario asks for.

Your test tools and CI already write reports of what ran. Each result in them is an **evidence observation**: a proof that actually ran.

`balance` matches each observation to the obligation it answers, scenario by scenario, like a ledger. When the two sides disagree, the build goes red. `spec-controller` does not run your tests. It reads the reports your tools already produce.

## What you need

- **Node 22 or later.** Check it:

  ```sh
  node --version   # must be v22.x or higher
  ```

  If your project uses pnpm: Node 25 and later do not bundle corepack, so install pnpm yourself (`npm install -g pnpm`).

- **GitHub Actions.** This is the real requirement: a CI check becomes evidence through the run's own step record.
- **Your evidence, as reports.** A Vitest, Jest or RSpec JSON report, a pytest or other JUnit XML report, or a Cucumber JSON report. Pass whichever you have.
- **Feature files are optional at first.** A project with none still gets a report of every check its pipeline ran.

See [What you need](./how_to_use.md#what-you-need) for the full table of inputs and flags.

## Install

At `0.x`, nothing is promised between versions, so pin an exact version. Replace `<version>` with the release you choose:

```sh
npm install --save-dev spec-controller@<version>
```

Then run it as `npx spec-controller`. See [Install](./how_to_use.md#install).

## A first run, report only

This example is for a project whose tests run on Vitest. Run it from the repository you want to reconcile. First, write the Vitest report:

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

- **Every path you pass must exist.** Each report flag points at a file your tools have already written. Leave out any input you don't have: with no `features/` folder yet, leave out `--features`, because a folder that does not exist is refused.
- **`--target` names the project in the report.** Without it the report reads `unknown-target`.
- **`--exit-zero` keeps the build green while you watch.** Your first run against a pipeline with no citations goes red. Every candidate step cites nothing, so every observation posts to the **unnamed claim**, the row for evidence that names no scenario. Without the flag, `balance` exits `1`. With it, you get the same report, but the out-of-balance verdict exits `0`. Remove the flag when you are ready to gate.

For every other runner's report command, see [Quick start: run it on your project](./how_to_use.md#quick-start-run-it-on-your-project) and [Expect your first run to fail — use `--exit-zero`](./how_to_use.md#expect-your-first-run-to-fail--use---exit-zero).

**Before you name anything, it lists what ran.** It reports every test and CI step, grouped by file, with what passed and what failed. That is a starting inventory. The value begins when you name the behaviours.

### Tell it which steps are your tests, and which check nothing

Every CI step is listed as a check, except a declared runner and GitHub's own checkout, setup, cache and artifact actions. Two settings in `package.json` cut the list down:

```jsonc
"specController": {
  "runners": {
    "unit": "vitest",             // the command your CI runs for @unit
    "integration": "cucumber-js", // for @integration
    "e2e": "cucumber-js",         // two tiers, one runner, which is normal
    "performance": null           // we have no performance runner
  },
  "notChecks": [
    "ci.yml:build:Install dependencies",
    "ci.yml:build:Publish the package"
  ]
}
```

- **`runners`** declares the command each test tier runs, so that step is read as your test suite and not as a check. `null` means *we have no runner for this tier*.
- **`notChecks`** lists steps that do work but check nothing, such as publishing. Each entry is `<workflow file>:<job id>:<step name>`, matched exactly.

See [Naming your runners — `runners`](./how_to_use.md#naming-your-runners--runners) and [Excluding steps that are not checks — `notChecks`](./how_to_use.md#excluding-steps-that-are-not-checks--notchecks).

## Cite one scenario from one test

A scenario's tag line says what it needs proved. `@SCN-<FFF>-<NNN> @unit @e2e` asks for a unit test and an end-to-end run, both answering `SCN-<FFF>-<NNN>`.

`SCN-<FFF>-<NNN>` is the scenario's **code**. `<FFF>` is a feature part of two to five uppercase letters or digits, and `<NNN>` is a number. Each feature file carries a header code, `@<FFF>`, and its scenarios' codes must match it. A misfiled code fails the run. [Scenario code errors](./how_to_use.md#scenario-code-errors) explains the header code and the four ways a code can be misfiled.

A unit-level scenario needs no step definitions. A title and its tags are the whole scenario.

Ask the tool for each code instead of inventing one. A feature part is known only when a feature file in `features/` at the top of the repository is headed with it. So in a project with no feature files yet, run `allocate` with `--new` for your first code. After that, `allocate <FFF>` gives the next one:

```bash
spec-controller allocate <FFF>
# SCN-<FFF>-<NNN>
```

A Vitest test cites the scenario with the code **in square brackets** in its `it` title, or in an enclosing `describe` title. The most specific one wins:

```ts
describe("[SCN-<FFF>-<NNN>] a feature part whose highest live code is below a deleted one is offered one past the deleted code", () => {
  it("offers the next code", () => { /* … */ });
});
```

For Vitest, Jest, Go, JUnit 5 and RSpec tests, only the bracketed form counts. A code without brackets, or in a comment, names nothing. The test still runs, but it lands on the unnamed claim, and the scenario reads `missing`. **When a `@unit` scenario reads `missing` while its test passes, check the brackets first.** Other evidence cites differently: a pytest test through a `scn` property, a Cucumber run through the scenario's own `@SCN` tag, and a CI check through its step's `id:`. See [Only these four forms are read](./how_to_use.md#only-these-four-forms-are-read).

Other runners cite a scenario in their own way: see [Citing a scenario from pytest](./how_to_use.md#citing-a-scenario-from-pytest), [Citing a scenario from Jest](./how_to_use.md#citing-a-scenario-from-jest), [Citing a scenario from Go](./how_to_use.md#citing-a-scenario-from-go), [Citing a scenario from Java](./how_to_use.md#citing-a-scenario-from-java), [Citing a scenario from Kotlin](./how_to_use.md#citing-a-scenario-from-kotlin) and [Citing a scenario from RSpec](./how_to_use.md#citing-a-scenario-from-rspec).

## Turn one CI check into a fitness function

A **fitness function** is a whole-system property: complexity, mutation score, type soundness, vocabulary, suite run time. Any check your pipeline runs, in any language, can prove one. You need two things and no third.

**1. A scenario, tagged `@fitness`, carrying a code.** Write it as you write a `@unit`-only scenario: tags, a title, and no Given/When/Then. Its title is the specification.

```gherkin
  @fitness @SCN-<FFF>-<NNN>
  Scenario: every function the push touches measures inside the external complexity standard, and no dead suppression survives
```

**2. That code as the `id:` of the CI step that already runs the check.** The check stays where it is. You add only a citation.

```yaml
      - name: Complexity
        id: SCN-<FFF>-<NNN>
        if: always()
        run: eslint
```

The step's outcome is the evidence: its exit code on its own CI step is the verdict. That outcome reaches `balance` only through the CI run's step record, passed with `--ci-steps`. Only a CI run writes that record, so a local run has none. If no step carries the scenario's code, the scenario reads `missing`. A step citing a code no scenario carries posts to a **phantom claim**'s row: a claim the evidence names and nobody wrote. See [Turn a fitness function into an evidence obligation](./how_to_use.md#turn-a-fitness-function-into-an-evidence-obligation).

## Wire the run into CI

`balance` belongs in CI, after your tests have written their reports. spec-controller's own CI workflow runs its steps in this order:

1. Set up Node 22, then install dependencies.
2. Run the test steps, which write the reports.
3. Run the check steps, each with `if: always()`.
4. Dump the run's step record, with `if: always()`.
5. Run `balance`, with `if: always()`.

`if: always()` matters. Without it, the first red aborts the job, and every later check is skipped. Here are the check steps and the dump:

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

The dump must be `toJSON(steps)`. It is the only place a step's `id` and its `outcome` travel together.

Then one Reconcile step reads the reports and the record. It matches the first run, with the step record added. `--format md:$GITHUB_STEP_SUMMARY` puts the report on the run's summary page, and the JSON is kept for anything downstream:

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

Keep the reports as build artefacts, but do not commit them. A report lists your codebase's gaps, so it belongs outside version control. See [Wiring into CI](./how_to_use.md#wiring-into-ci) and [GitHub Actions — put the report on the run summary](./how_to_use.md#github-actions--put-the-report-on-the-run-summary).

## Read the report

`balance` is a gate. A balanced run exits `0`, and an out-of-balance run exits `1`. Three more exits fail even under `--exit-zero`: `2` for a usage error, `4` for an unsound run, and `5` when there is nothing to reconcile. See [Exit codes](./how_to_use.md#exit-codes).

The [README's sample report](../README.md) shows every kind of row on one small example. Read it as a ledger:

- **The run verdict** says whether the whole run balanced, and its exit code.
- **A Claim Reconciliation** is one row per claim, and a claim is usually a scenario. It sets the proofs the claim asked for against the proofs that ran.
- **Each evidence cell** reads *obligation*/*observations*. The letter marks an obligation of that kind, and the number counts the evidence posted. `U/1` is a unit obligation answered by one unit test.
- **The verdict** is **balanced** or **out-of-balance**.
- **A reconciling item** is a reason a row does not balance, such as `missing` (no proof arrived) or `failing` (the proof failed).
- **A phantom claim's row** holds evidence citing a code no scenario carries, usually a typo or a deleted scenario. There is one per unknown code, named by that code, like the sample's row whose item cites an unknown Scenario.
- **The unnamed claim's row**, `(unnamed claim)`, holds evidence that cites nothing.

Watch for a **watermelon**: a check that is green but could not have failed its job, because `continue-on-error` would have swallowed its red. Given `--ci-steps`, the step's own outcome answers the row instead, and a swallowed red reads `failing`.

If your first run shows a wall of uncited checks, read the report's **Discovery scope** and **Step accounting** sections. They name each workflow and job, and what became of every step.

See [Reading the report](./how_to_use.md#reading-the-report), [Report rows to know](./how_to_use.md#report-rows-to-know) and [Watermelons](./how_to_use.md#watermelons).

## Where to go next

- Every flag: [Command reference — `balance`](./how_to_use.md#command-reference--balance).
- All configuration: [Configuration — the `specController` block](./how_to_use.md#configuration--the-speccontroller-block).
- When something reads wrong: [Troubleshooting](./how_to_use.md#troubleshooting).
