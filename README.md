# spec-controller

**Your build goes red when a behaviour you named has no passing proof.**

You name each behaviour of your software as a scenario in a Gherkin `.feature` file, with a claim code of the form `@CLM-<FFF>-<NNN>`. Each test and each CI check cites the code of the behaviour it proves. On every CI run, `spec-controller balance` reads the reports your tools already write and checks every named behaviour against them. Each proof it asks for must have run, passed and been able to fail. A CI step set to `continue-on-error` cannot fail. If a proof falls short, the build goes red.

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

The `@unit` tag says this behaviour needs a unit test. A scenario like this needs no step definitions and no Cucumber: its title and tags are all there is to it. Delete that test, and the run is out of balance and exits `1`. Its row says a unit test was asked for (`U/-`) and none answered:

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
npx spec-controller balance --vitest ./vitest-report.json --exit-zero
```

For other test reports, use `--jest`, `--pytest`, `--junit`, `--rspec` or `--cucumber`.

With no scenarios yet, the report lists every test that ran, and `--exit-zero` keeps your build green. Give it your workflow and the run's step record (GitHub Actions' own record of how each step ended), as the quickstart shows, and it lists your CI checks too. Then name a few behaviours, cite them from their tests, and watch those rows balance. When the ones you care about balance, remove `--exit-zero`. `balance` then gates your build.

[`docs/quickstart.md`](./docs/quickstart.md) takes you from here to a first run in CI. [`docs/user-guide.md`](./docs/user-guide.md) has every flag and runner.

## Learn more

- [`docs/how-it-works.md`](./docs/how-it-works.md): what each kind of disagreement reports, how to read the full report, its limits, and why coverage and mutation testing don't do this.
- [`docs/ubiquitous-language.md`](./docs/ubiquitous-language.md): the words the report uses.
- [`@3f-consulting/spec-controller-core`](./packages/core/README.md): the same engine as a library, with no CLI.

At `0.x`, nothing is promised between versions ([`docs/compatibility.md`](./docs/compatibility.md)). Pin an exact version.

## Who maintains it

spec-controller is maintained by Steven Thomas at 3F Consulting and written with Claude Code. [`CONTRIBUTING.md`](./CONTRIBUTING.md) says how each change an agent writes is reviewed before it merges, and how to report a problem.

MIT licence, see [`LICENSE`](./LICENSE). © 2026 3F Consulting Ltd.
