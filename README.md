# spec-controller

**Your build goes red when a behaviour you named has no passing proof.**

You name each behaviour of your software as a scenario in a Gherkin `.feature` file, with a claim code of the form `@CLM-<FFF>-<NNN>`. Each test and each CI check cites the code of the behaviour it proves. On every CI run, `spec-controller balance` reads the reports your tools already write and checks every named behaviour against them. Each proof it asks for must have run and passed. A CI check must also have been able to fail its build: a step set to `continue-on-error` cannot. Whether a test asserts anything is not checked. If a proof falls short, the build goes red.

So when an agent deletes a test to make CI pass, or a lint step is quietly set never to fail, the build goes red instead of staying quietly green.

<div class="sample-report">

```gherkin
@CHK
Feature: Checkout

  @unit @CLM-CHK-001
  Scenario: an empty basket cannot be checked out
```

```ts
import { it } from "vitest";

it("[CLM-CHK-001] refuses an empty basket", () => { /* … */ });
```

The `@unit` tag says this behaviour needs a unit test. A scenario like this needs no step definitions and no Cucumber: its title and tags are all there is to it. With the test, the row balances: a unit test was asked for and one answered (`U/1`):

```markdown
| Claim | Unit | Verdict | Reconciling items |
| --- | --- | --- | --- |
| CLM-CHK-001 | U/1 | balanced | — |
```

Delete that test, and the run is out of balance and exits `1`. The row says a unit test was asked for (`U/-`) and none answered:

```markdown
| Claim | Unit | Verdict | Reconciling items |
| --- | --- | --- | --- |
| CLM-CHK-001 | U/- | out-of-balance | unit: missing |
```

</div>

## Does it fit your project?

- **CI:** GitHub Actions.
- **Tests:** Vitest, Jest, pytest, Go, JUnit (Java, Kotlin), RSpec, or any Cucumber.
- **CI checks:** any step your pipeline runs, such as lint, type checks or a complexity limit.
- **You:** willing to name your behaviours as scenarios. `balance` checks the names you write; it does not write them for you.

## Start with nothing named

```sh
npm install --save-dev spec-controller@<version>
npx spec-controller balance --unit vitest:vitest:./vitest-report.json --exit-zero
```

`--unit vitest:vitest:./vitest-report.json` names the unit layer's runner, the format of the report it writes, and that report's path. For other test reports, give the format `jest`, `pytest`, `junit`, `rspec` or `cucumber`, under the flag of the layer the runner serves: `--unit`, `--integration`, `--e2e` or `--performance`. When the CI step that runs the runner writes its report, name the runner alone, as `--unit vitest`: `balance` finds the report from that step. The settings can also live in `spec-controller.yml` at the top of your repository, keyed by the flags' names, such as `unit: [vitest]`.

With no scenarios yet, the report lists every test that ran, and `--exit-zero` keeps your build green. Give it your workflow and the run's step record (GitHub Actions' own record of how each step ended), as the quickstart shows, and it lists your CI checks too. Then name a few behaviours, cite them from their tests, and watch those rows balance. When the ones you care about balance, replace `--exit-zero` with `--written-claims-only`. `balance` then gates your build on the scenarios you have written, and the tests that cite none are still listed but do not turn it red. When every test cites a scenario, drop `--written-claims-only` too.

[`docs/quickstart.md`](./docs/quickstart.md) takes you from here to a first run in CI. [`docs/user-guide.md`](./docs/user-guide.md) has every flag and runner.

## What comes next

`balance` keeps a codebase that can reconcile from drifting again. Two modes will follow it, once `balance` is stable:

- **`analyse`** will read an existing codebase and judge its specification against its quality checks: which claims are met, unmet, unstated or in conflict.
- **`migrate`** will write the `.feature` files and the scenario-tagged tests the specification calls for, so a team starts from the tests it already has, not from a blank page.

## Learn more

- [`docs/how-it-works.md`](./docs/how-it-works.md): what each kind of disagreement reports, how to read the full report, its limits, and why coverage and mutation testing don't do this.
- [`docs/ubiquitous-language.md`](./docs/ubiquitous-language.md): the words the report uses.
- [`@3f-consulting/spec-controller-core`](./packages/core/README.md): the same engine as a library, with no CLI.

At `0.x`, nothing is promised between versions ([`docs/compatibility.md`](./docs/compatibility.md)). Pin an exact version.

## Built with Claude Code, and kept honest

spec-controller is maintained by Steven Thomas at 3F Consulting, who does not write TypeScript. Claude Code writes the code. The maintainer endorses each change's scenarios before any code is written, and each scenario is proved red, then green.

The repository holds itself to the discipline it asks of you. Its own CI reconciles its own scenarios with `balance` on every run, and gates on dependency boundaries, complexity, duplication, package and workflow security, and a ceiling on test code against production code; a nightly mutation sweep stops new work when any scope falls below 95%. Each gate is a scenario in [`features/fitness-functions.feature`](./features/fitness-functions.feature), whose Rule says what it checks and why.

The agent has been caught. Claude Code once re-pointed two live tests at scenarios they did not prove, to clear this tool's own red. Review caught it, and the change was reverted. [`CONTRIBUTING.md`](./CONTRIBUTING.md) says how to build, make a change and report a problem.

MIT licence, see [`LICENSE`](./LICENSE). © 2026 3F Consulting Ltd.
