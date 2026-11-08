# spec-controller — how to use

This guide is for anyone who runs `spec-controller balance` against a project, such as a developer wiring it into CI, a tech lead adopting the reconciliation discipline, or an auditor checking whether a codebase's scenarios are backed by evidence. The tool behaves the same whoever runs it.

`balance` reconciles two sides, like a ledger:

- **The debit — what is specified.** Your Gherkin scenarios. Each scenario's tags say what evidence it needs. These are **evidence obligations**.
- **The credit — what actually ran.** The reports your test tools and CI already write. These are **evidence observations**.

`balance` matches each observation to the obligation it answers, scenario by scenario, and reports anything that does not match.

`spec-controller` does not run your tests. It reads the reports your tools already produce.

You do not need feature files to start. A project with none, or with feature files not tagged to spec-controller's model, is a `new-client`, and `balance` still reports every check its pipeline ran. Scenarios tagged to the model are what the `conformant` state adds, and they are not the first step.

**Contents**

- [What you need](#what-you-need)
- [Install](#install)
- [Every report, and the whole command](#every-report-and-the-whole-command)
- [How your evidence finds its scenario](#how-your-evidence-finds-its-scenario)
- [Fitness functions](#fitness-functions)
- [Configuration — the `specController` block](#configuration--the-speccontroller-block)
- [Wiring into CI](#wiring-into-ci)
- [Reading the report](#reading-the-report)
- [Command reference — `balance`](#command-reference--balance)
- [Allocating the next claim code — `spec-controller allocate`](#allocating-the-next-claim-code--spec-controller-allocate)
- [Troubleshooting](#troubleshooting)
- [What spec-controller assumes, and what it does not do](#what-spec-controller-assumes-and-what-it-does-not-do)

---

## What you need

**Node 22.12 or later.**

```sh
node --version   # must be v22.12 or higher
```

If your project uses pnpm: Node 25 and later do not bundle corepack, so install pnpm yourself (`npm install -g pnpm`).

**Your evidence, as reports.** Generate whichever of these apply to your project before you run `balance`. The commands that write them are step 1 of [Every report, and the whole command](#every-report-and-the-whole-command).

| Input | What it is | Flag |
|---|---|---|
| Gherkin `.feature` files | your scenarios and their evidence-obligation tags | `--features` |
| A Vitest JSON report | runtime test evidence | `--vitest` |
| A Cucumber JSON report | runtime test evidence | `--cucumber` |
| A pytest JUnit XML report, written by `pytest --junitxml` | runtime test evidence | `--pytest` |
| A Jest JSON report, written by `jest --json --outputFile=<path>` | runtime test evidence | `--jest` |
| A JUnit XML report from any other runner, such as Go's, written by `gotestsum --junitfile <path>` | runtime test evidence | `--junit` |
| An RSpec JSON report, written by `rspec --format json --out <path>` | runtime test evidence | `--rspec` |
| Your CI run's own step record: the `toJSON(steps)` dump your pipeline writes | evidence for every converted fitness function (see [Wiring into CI](#wiring-into-ci)) | `--ci-steps` |
| Your CI config (`ci.yml`) | the scope discovery ranges over | `--ci` |
| `package.json` | read with the CI config to check that an UNCONVERTED fitness function is wired into CI over the real source; also holds your configuration | `--package-json` |

---

## Install

```sh
npm install -g spec-controller
```

Or run without installing:

```sh
npx spec-controller balance --features ./features …
```

---

## Every report, and the whole command

[The quickstart](./quickstart.md) takes a first run from nothing to CI, using Vitest. This section adds what it leaves out: the command that writes each runner's report, and the command that reads them all. Run these from the repository being reconciled, using the published CLI.

```
cd ~/code/your-project
STORE=~/spec-controller-runs        # optional: kept runs, outside the repository

# 1. Produce the evidence your tools already write.
npx vitest run --reporter=json --outputFile=reports/vitest.json
npx cucumber-js --format summary --format json:reports/cucumber.json
python -m pytest --junitxml=reports/pytest.xml     # if you use pytest
npx jest --json --outputFile=reports/jest.json     # if you use Jest
gotestsum --junitfile reports/go.xml ./...         # if you use Go
bundle exec rspec --format progress --format json --out reports/rspec.json   # if you use RSpec

# 2. Reconcile it.
npx spec-controller --store "$STORE" balance \
  --target your-project \
  --features features \
  --vitest reports/vitest.json \
  --cucumber reports/cucumber.json \
  --pytest reports/pytest.xml \
  --jest reports/jest.json \
  --junit reports/go.xml \
  --rspec reports/rspec.json \
  --ci .github/workflows/ci.yml \
  --package-json package.json
```

- **Leave out any input you don't have.**
- **`STORE` is optional.** It sits outside the repository on purpose. A kept run lists a codebase's gaps, so it belongs in a store you chose, not under version control beside the code it describes. See [Storing a run](#storing-a-run----store----run-id).
- **`--target` names the project in the report.** Without it the report reads `unknown-target`. When the project is a git checkout with an `origin` remote, the report adds that origin beside it, as in `unknown-target (no --target given; origin is owner/repo)`.
  - The origin is named without any user, password, token, query or fragment its remote carries.
  - Only a URL, a transport to a URL, an scp remote or a local path is named. Any other form names no origin, and neither does a remote whose user part can only be guessed at.
  - A local path, and a `file:` URL holding no user, are named as given.

For the smallest form of the command and every flag, see [Command reference](#command-reference--balance).

### Expect your first run to fail — use `--exit-zero`

Your first run against an unannotated pipeline fails, and the ledger is right, because the corpus raises nothing yet. [A first run, report only](./quickstart.md#a-first-run-report-only) says why, and how `--exit-zero` lets you watch before you gate.

### Write your first `notChecks`

Every CI step is listed as a check, except a declared runner (see [Naming your runners](#naming-your-runners--runners)) and GitHub's own checkout, setup, cache and artifact actions. Some steps do work but check nothing, such as publishing or bumping a version. Name each of them once, by the step's own name, in `package.json`:

```jsonc
"specController": {
  "notChecks": [
    "ci.yml:ci:Publish to npm",
    "release.yml:release:Bump version"
  ]
}
```

The full rules are in [Naming your non-checks](#naming-your-non-checks--notchecks).

### When a row reads `no-evidence-obligation`

A test cites a scenario that asks for no evidence of its kind. Move the test's citation to the scenario it really proves, or split off a new scenario for it. Never re-point a citation just to turn a row green.

---

## How your evidence finds its scenario

A scenario's tag line says what it needs proved. `@CLM-<FFF>-<NNN> @unit @e2e` asks for a unit test and an end-to-end run, both answering `CLM-<FFF>-<NNN>`. A tag naming a kind of quality check says which kind of run answers the obligation. Whether that run really is end-to-end is the test's job.

A feature file has a header code on the line above `Feature:`, then its Rules and scenarios. Each scenario carries its own code:

```gherkin
@<FFF>
Feature: Allocate the next claim code for a feature part

  Rule: the next code is one past the highest the repository has ever carried

    @unit @CLM-<FFF>-<NNN>
    Scenario: a feature part whose highest live code is below a deleted one is offered one past the deleted code
```

Each piece of evidence names the scenario it answers, **in the one form its runner's report carries**:

| The scenario asks for | The evidence | How it names the scenario |
|---|---|---|
| `@unit` | a Vitest test | `[CLM-…]` in square brackets in the test's `it` title, or in an enclosing `describe` title. The most specific one wins. |
| `@unit` | a Jest test | `[CLM-…]` in square brackets in the test's title, or in an enclosing `describe` title, as for Vitest (see [Citing a scenario from Jest](#citing-a-scenario-from-jest)) |
| `@unit` | a Go test | `[CLM-…]` in square brackets in a subtest's name, given to `t.Run` (see [Citing a scenario from Go](#citing-a-scenario-from-go)) |
| `@unit` | a JUnit 5 test in Java | `[CLM-…]` in square brackets in the test's `@DisplayName`, carried into the report by Surefire's phrased reporter (see [Citing a scenario from Java](#citing-a-scenario-from-java)) |
| `@unit` | a JUnit 5 test in Kotlin | `[CLM-…]` in square brackets in the test's `@DisplayName`, which Gradle writes into the report (see [Citing a scenario from Kotlin](#citing-a-scenario-from-kotlin)) |
| `@unit` | an RSpec example | `[CLM-…]` in square brackets in the example's description, given to `it`, or in an enclosing `describe` or `context` description (see [Citing a scenario from RSpec](#citing-a-scenario-from-rspec)) |
| `@unit` | a pytest test | one claim code in a `clm` property on its `<testcase>` in the JUnit XML report, written by `@pytest.mark.clm("CLM-…")` (see [Citing a scenario from pytest](#citing-a-scenario-from-pytest)) |
| `@integration`, `@e2e`, `@performance` | a Cucumber run of the scenario | nothing to add: the Cucumber report carries the scenario's own claim code, and a row of an Outline with a `clm` column is credited by Cucumber's result for that row |
| `@fitness` | a CI step | the step's `id:` is the code (see [Fitness functions](#fitness-functions)) |

A Vitest citation:

```ts
describe("[CLM-<FFF>-<NNN>] a feature part whose highest live code is below a deleted one is offered one past the deleted code", () => {
  it("offers the next code", () => { /* … */ });
});
```

A CI step citation:

```yaml
      - name: Test
        id: CLM-<FFF>-<NNN>
        run: pnpm test
```

### Only these four forms are read

The table above holds the only four forms that name a scenario: a bracketed code in a test's title or name, or in an enclosing title where the table allows it, a `clm` property on a pytest test, a Cucumber scenario's own claim code, and a CI step's `id:`. These name nothing:

- `CLM-<FFF>-<NNN>` or `@CLM-<FFF>-<NNN>` in a test title without the square brackets;
- a code in a comment, including a `// @CLM-…` line in a step-definition file;
- a code anywhere else.

A test that names nothing still runs and is still reported. It lands on the **unnamed claim**'s row, *Evidence Observation cites no Scenario*, and the scenario it was meant for reads `missing`. **When a `@unit` scenario reads `missing` while its test passes, check the brackets first.**

### Citing a scenario from pytest

A pytest test's name is a Python function name, which cannot hold `[CLM-…]`. So a pytest test cites its scenario with a marker, and a hook you add once copies the marker into the report. Pass the report with `--pytest`:

```sh
pytest --junitxml=reports/pytest.xml
spec-controller balance --pytest reports/pytest.xml
```

**1. Add the hook once**, in `conftest.py` beside your tests:

```python
def pytest_collection_modifyitems(items):
    for item in items:
        for marker in item.iter_markers("clm"):
            for code in marker.args:
                item.user_properties.append(("clm", code))
```

**2. Register the marker once**, in `pytest.ini`. An unregistered marker raises a warning, and an error under `--strict-markers`:

```ini
[pytest]
markers =
    clm(code): the scenario this test proves
```

**3. Mark each test** with the one scenario it proves:

```python
import pytest

@pytest.mark.clm("CLM-<FFF>-<NNN>")
def test_offers_the_next_code():
    ...
```

`pytest --junitxml` then writes the code as a property of that test. This is what `balance` reads:

```xml
<testcase classname="test_cases" name="test_offers_the_next_code" time="0.001"><properties><property name="clm" value="CLM-<FFF>-<NNN>" /></properties></testcase>
```

**No hook?** Calling `record_property("clm", "CLM-<FFF>-<NNN>")` inside the test writes the same element. Under pytest's default `junit_family`, though, each such test raises a `PytestWarning`, so a suite run with `filterwarnings = error` fails them.

**What a pytest report posts:**

| The test | What it posts |
|---|---|
| `clm` properties naming exactly one claim code | answers that scenario: passing, or failing when it carries a `<failure>` |
| skipped | nothing, as a skipped Vitest test posts nothing |
| a code no feature file carries | makes a phantom claim |
| no `clm` property, or a value that is not a claim code | lands on the unnamed claim |
| `clm` properties naming two or more different codes | **credits none of them**; the unnamed claim's row names every code, because one test proves exactly one scenario |
| a module that fails to collect, or a test whose setup or teardown errors | never ran its proof: it posts a broken item, the run is unsound (exit `4`), and the scenario it cites reads `missing` |

### Citing a scenario from Jest

A Jest test cites its scenario exactly as a Vitest test does: the code in square brackets in its title. Jest's own JSON report keeps each test's title, so you need no reporter package and no setup file. Pass the report with `--jest`:

```sh
npx jest --json --outputFile=reports/jest.json
spec-controller balance --jest reports/jest.json
```

A complete test file:

```js
describe("allocating the next number", () => {
  test("[CLM-<FFF>-<NNN>] offers one past the highest number already used", () => {
    expect(nextNumber([1, 3])).toBe(4);
  });
});
```

`jest --json` writes that test into the report with its title and its outcome. This is what `balance` reads:

```json
{
  "ancestorTitles": ["allocating the next number"],
  "title": "[CLM-<FFF>-<NNN>] offers one past the highest number already used",
  "fullName": "allocating the next number [CLM-<FFF>-<NNN>] offers one past the highest number already used",
  "status": "passed"
}
```

`balance` reads the code in the test's own title first. It reads a code in an enclosing `describe` title only when the test's title carries none. Name the runner in the `specController` block as `"unit": "jest"` (see [Naming your runners](#naming-your-runners--runners)).

**A todo test never proves a scenario.** `test.todo` names a test that has not been written, so nothing can pass. Jest's JSON report marks it `todo`, and `balance` reads it as no evidence at all, as it does a skipped test. A scenario whose only test is a todo reads `missing`. This is why `balance` reads Jest's JSON report rather than JUnit XML: `jest-junit` writes a todo test exactly as it writes a passing one, so a todo would read as proof.

**What a Jest report posts:**

| The test | What it posts |
|---|---|
| passing, citing one scenario | answers that scenario |
| failing, including a test under a `beforeAll` that threw | answers that scenario as failing |
| todo or skipped | nothing, so the scenario it cites reads `missing` |
| two or more codes in its title | **credits none of them**; the unnamed claim's row names every code |
| a test file that failed to run | never ran its proof: it posts a broken item and the run is unsound (exit `4`) |

### Citing a scenario from Go

A Go function name cannot hold brackets, so a Go test cites its scenario through a **subtest**: the code in square brackets in the name passed to `t.Run`. Run the suite through [gotestsum](https://github.com/gotestyourself/gotestsum), which writes a JUnit XML report, and pass the report with `--junit`:

```sh
go install gotest.tools/gotestsum@v1.13.0
gotestsum --junitfile reports/go.xml ./...
spec-controller balance --junit reports/go.xml
```

A complete test file:

```go
package allocate

import "testing"

func TestNextNumber(t *testing.T) {
	t.Run("[CLM-<FFF>-<NNN>] offers one past the highest number already used", func(t *testing.T) {
		if got := NextNumber([]int{1, 3}); got != 4 {
			t.Fatalf("NextNumber([1 3]) = %d, want 4", got)
		}
	})
}
```

gotestsum writes the subtest into the report under its full name: the test function's name and the subtest's, joined by `/`, with every space turned into `_`. The code survives in its brackets. This is what `balance` reads:

```xml
<testcase classname="example.com/allocate" name="TestNextNumber/[CLM-&lt;FFF&gt;-&lt;NNN&gt;]_offers_one_past_the_highest_number_already_used" time="0.000000"></testcase>
```

A nested subtest's name carries every enclosing subtest's name too. `balance` reads the code in the subtest's own segment, after the last `/`, first. Only when that segment carries none does it read a code in an enclosing subtest's segment, nearest first. Name the runner in the `specController` block as `"unit": "gotestsum"` (see [Naming your runners](#naming-your-runners--runners)).

**A panic stops the tests after it.** A panicking subtest posts a failing observation, and the panic ends that package's test binary. The tests it had not yet reached never appear in the report, and the scenarios they cite read `missing` until the panic is fixed.

**What a gotestsum report posts:**

| The subtest | What it posts |
|---|---|
| passing, citing one scenario | answers that scenario |
| failing, or panicking | answers that scenario as failing |
| skipped | nothing, so the scenario it cites reads `missing` |
| never started, because its enclosing test failed first, or a panic stopped its package | nothing, so the scenario it cites reads `missing` |
| two or more codes in its own name | **credits none of them**; the unnamed claim's row names every code |
| in a package that failed to compile | never ran its proof: the package posts a broken item and the run is unsound (exit `4`) |

### Citing a scenario from Java

A Java method name cannot hold brackets, so a JUnit 5 test cites its scenario through its **display name**: the code in square brackets in `@DisplayName`. Run the suite with Maven, and pass the directory Maven Surefire writes its reports into with `--junit`:

```sh
mvn test
spec-controller balance --junit target/surefire-reports
```

`balance` reads every `TEST-*.xml` file at the top of that directory, one per test class, and ignores the `.txt` summaries beside them. You can give a single report file instead.

**Surefire drops the display name by default.** It writes the method name into the report, so no test cites anything: every test lands on the unnamed claim's row, and every `@unit` scenario reads `missing`. Surefire's phrased reporter writes the display name instead. Set it on the Surefire plugin in your `pom.xml`:

```xml
<plugin>
  <groupId>org.apache.maven.plugins</groupId>
  <artifactId>maven-surefire-plugin</artifactId>
  <version>3.5.2</version>
  <configuration>
    <statelessTestsetReporter implementation="org.apache.maven.plugin.surefire.extensions.junit5.JUnit5Xml30StatelessReporter">
      <usePhrasedFileName>false</usePhrasedFileName>
      <usePhrasedTestSuiteClassName>true</usePhrasedTestSuiteClassName>
      <usePhrasedTestCaseClassName>true</usePhrasedTestCaseClassName>
      <usePhrasedTestCaseMethodName>true</usePhrasedTestCaseMethodName>
    </statelessTestsetReporter>
  </configuration>
</plugin>
```

A complete test file:

```java
package example.allocate;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class NextNumberTest {

  @Test
  @DisplayName("[CLM-<FFF>-<NNN>] offers one past the highest number already used")
  void offersOnePastTheHighest() {
    assertEquals(4, NextNumber.of(List.of(1, 3)));
  }
}
```

Surefire writes that test into `TEST-example.allocate.NextNumberTest.xml` under its display name. This is what `balance` reads:

```xml
<testcase name="[CLM-&lt;FFF&gt;-&lt;NNN&gt;] offers one past the highest number already used" classname="example.allocate.NextNumberTest" time="0.004"/>
```

Name the runner in the `specController` block with its test task, in the words your pipeline's test step opens with: `"unit": "mvn clean test"` for the `mvn clean test` recommended below, `"unit": "mvn test"` if the step runs `mvn test`, or `"unit": "./mvnw clean test"` for the Maven wrapper (see [Naming your runners](#naming-your-runners--runners)). Declared as `"mvn"` alone, the runner would be recognised in every step that runs Maven, and a `mvn checkstyle:check` step would be taken for the test suite instead of being reported as a check.

**Old reports are read as well.** Surefire does not clear the directory before a run, so a report an earlier run left in an uncleaned `target/` is read beside the new ones. Run `mvn clean test` in CI, or start from a fresh checkout. A test that does not compile stops the build before any report is written; when the directory is missing, `balance` refuses `--junit` as a path that does not exist.

### Citing a scenario from Kotlin

A JUnit 5 test in Kotlin cites its scenario as a Java one does, with the code in square brackets in `@DisplayName`. A backticked function name cannot carry the code: the JVM forbids brackets in a name, and the build fails with *Name contains illegal characters*. Run the suite with Gradle, and pass the directory its test task writes its reports into with `--junit`:

```sh
./gradlew test
spec-controller balance --junit build/test-results/test
```

Gradle writes the display name into the report with no configuration (measured with Gradle 9.8.1 and JUnit Jupiter 5.11.4). `balance` reads every `TEST-*.xml` file at the top of that directory, one per test class, and ignores the `binary/` directory beside them.

A complete test file:

```kotlin
package example.allocate

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Test

class NextNumberTest {

    @Test
    @DisplayName("[CLM-<FFF>-<NNN>] offers one past the highest number already used")
    fun offersOnePastTheHighest() {
        assertEquals(4, NextNumber.of(listOf(1, 3)))
    }
}
```

Gradle writes that test into `TEST-example.allocate.NextNumberTest.xml` under its display name. This is what `balance` reads:

```xml
<testcase name="[CLM-&lt;FFF&gt;-&lt;NNN&gt;] offers one past the highest number already used" classname="example.allocate.NextNumberTest" time="0.004"/>
```

Gradle's report differs from Surefire's in two ways:

- **A class's display name cites nothing.** Gradle writes the class's own name as the test's `classname`, so a code in a class's `@DisplayName` never reaches a test. Cite the scenario on each test.
- **A class whose setup before all its tests fails posts a failing item that cites no scenario.** Gradle writes the failure as one test named `initializationError`, and the class's own tests do not appear. That item lands on the unnamed claim's row, the scenarios the class's tests cite read `missing`, and the run is not marked unsound.

`--junit` names one directory. In a build with several modules, each module writes its own `build/test-results/test/`, and `balance` reads only the one given.

Name the runner in the `specController` block with its test task, in the words your pipeline's test step opens with: `"unit": "./gradlew test"`, or `"unit": "gradle test"` if your pipeline runs Gradle directly (see [Naming your runners](#naming-your-runners--runners)). Declared as `"./gradlew"` alone, the runner would be recognised in every step that runs the wrapper, and a `./gradlew detekt` step would be taken for the test suite instead of being reported as a check.

### Citing a scenario from RSpec

An RSpec example cites its scenario with the code in square brackets in its description, the string passed to `it`. RSpec's own JSON formatter keeps each example's description separate from its groups', so you need no extra gem and no `spec_helper` change. Pass the report with `--rspec`:

```sh
bundle exec rspec --format progress --format json --out reports/rspec.json
spec-controller balance --rspec reports/rspec.json
```

The first `--format` keeps RSpec's usual console output; the second writes the JSON report to the file `--out` names.

A complete spec file:

```ruby
RSpec.describe "allocating the next number" do
  it "[CLM-<FFF>-<NNN>] offers one past the highest number already used" do
    expect(next_number([1, 3])).to eq(4)
  end
end
```

`rspec --format json` writes that example into the report with its own description, its full description and its outcome. This is what `balance` reads:

```json
{
  "description": "[CLM-<FFF>-<NNN>] offers one past the highest number already used",
  "full_description": "allocating the next number [CLM-<FFF>-<NNN>] offers one past the highest number already used",
  "status": "passed",
  "file_path": "./spec/allocate_spec.rb"
}
```

**Put the code on the example, not on its group.** `balance` reads the code in the example's own description first. Only when that carries none does it read a code in an enclosing `describe` or `context` description, and then every group's code counts: if one group cites a scenario and a group nested inside it cites a second, an example in the inner group credits neither. One code on each example is the form that cannot go wrong.

`balance` reads RSpec's JSON report rather than JUnit XML because `rspec_junit_formatter` joins an example's description to its groups' descriptions, so a code on an example cannot be told from a code on its group.

Name the runner in the `specController` block as `"unit": "rspec"` (see [Naming your runners](#naming-your-runners--runners)).

**A pending example proves nothing until it passes.** RSpec runs a `pending` example and expects it to fail. If it fails, RSpec reports it pending and `balance` reads no evidence, as it does for `skip` and `xit`. If it passes, RSpec reports it failed, and the scenario it cites reads failing until the `pending` is removed.

**What an RSpec report posts:**

| The example | What it posts |
|---|---|
| passing, citing one scenario | answers that scenario |
| failing, including an example stopped by a `before` or `before(:context)` hook that raised | answers that scenario as failing |
| `pending` and passing | answers that scenario as failing |
| `skip`, `xit`, or `pending` and failing | nothing, so the scenario it cites reads `missing` |
| two or more codes in its own description | **credits none of them**; the unnamed claim's row names every code |
| in a spec file that failed to load | never ran its proof: the file posts a broken item and the run is unsound (exit `4`) |

---

## Fitness functions

A **fitness function** is a whole-system property: complexity, mutation score, type soundness, vocabulary, suite run time.

### Turn a fitness function into an evidence obligation

You write two artefacts and no third, and neither is a Cucumber step definition. There is no fitness profile to configure, no manifest list and no step to write.

**1. A scenario, tagged `@fitness`, carrying a claim code.** Write it exactly as you write a `@unit`-only scenario: a tag naming its kind of quality check, a title, and no Given/When/Then, because Cucumber does not select it. Its title is the specification; the command your CI already runs is the evidence.

```gherkin
  @fitness @CLM-<FFF>-<NNN>
  Scenario: every function the push touches measures inside the external complexity standard, and no dead suppression survives
```

**2. That scenario's claim code as the `id:` of the CI step that already runs the check.** The check stays exactly where it is in your pipeline; you add only a citation.

```yaml
      - name: Complexity
        id: CLM-<FFF>-<NNN>
        if: always()
        run: eslint
```

- **One `@fitness` scenario is one check.** Its claim code identifies the check and its title describes it. Nothing else says what the check is about.
- **Nothing names a bar.** The bar is in the tool's own configuration or its step's `env:`, such as a suite's `timeout`, and the step fails below it. A check run on a schedule, such as a mutation sweep with Stryker's own `thresholds.break`, holds its bar in its own run and has no step here (see [Wiring into CI](#wiring-into-ci)).
- **The check's evidence observation is its step's `outcome`.** Whatever the tool measures, its exit code on its own CI step is the verdict.

**Neither artefact is derived from the other, on purpose.** That lets the two disagree, and the run reports each disagreement as a fault:

- A `@fitness` scenario whose claim code no CI step states reconciles **missing**, and the run is out of balance, exactly as a `@unit` scenario with no test does.
- A step stating a claim code that no scenario carries posts to a **phantom claim**'s row.
- A step stating no claim code posts to the **unnamed claim**.

**`specController.fitnessChecks` is not read.** Like any other key this tool does not read, it is named under `### Configuration not read`, in the same words as a misspelling.

**One `toJSON(steps)` dump step per job** lets the reconciler read what each step did, and `--ci-steps` points `balance` at it. That is wiring, not part of the evidence obligation. [Wiring into CI](#wiring-into-ci) covers it, with the `if: always()` rule that goes with it.

### A converted check is still a command you can run

Converting a check does not move it inside anything. Many of the converted checks in spec-controller's own pipeline are commands you can paste into a terminal, such as `pnpm typecheck`: exit 0 is the check passing, with no Cucumber and no `spec-controller` involved. The rest read what an earlier step left behind: a report, a count, or the files a test run wrote.

The scenario and the `id:` make the run **observable**: the ledger can say the check ran, and against what.

---

## Configuration — the `specController` block

All configuration sits under `specController` in the target's `package.json`, which `--package-json` points at (default: `package.json` in the working directory).

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

### How discovery works

Discovery is not Node-shaped: it does not match `package.json` script names against prefixes. A pipeline with a bare `run: ruff` and no `package.json` script is discovered like any other.

**You do not name a list of checks.** You name the commands that run your behavioural suites, a closed set of four, one per layer. **Every other step of the workflows `--ci` names is a candidate fitness function**, whatever it invokes, whether a `run:` step or a `uses:` action.

### Naming your runners — `runners`

- **`runners` is keyed by the four layers and nothing else:** `unit`, `integration`, `e2e`, `performance`.
- **A value is a runner's name or `null`.** `null` is a statement, not a blank: *we have no runner for this layer*. The report tells it apart from an omitted key, which it reads as *you have not told us*.
- **A key outside the four** is reported as unrecognised, excludes nothing, and does not abort the run.
- **No `runners` block at all is not an error.** Every step becomes a candidate. That is the zero-annotation report.
- **A runner is recognised only as the command a step runs.** That is the first word of each command in an `&&`, `||` or `;` list, or its opening words for a runner named in several words (see below). `NAME=value` settings before it are passed over.
  - The word may also be the one a launcher hands on to. The launchers are `timeout` with its duration, `npx`, `npm exec`, `pnpm exec`, `pnpm dlx`, `pnpm`, `yarn`, `bunx`, `python -m`, `python3 -m`, `poetry run`, `uv run`, `pipenv run`, `hatch run`, `pdm run`, `coverage run -m` and `bundle exec`. Launchers chain, so `uv run python -m pytest` reaches `pytest`.
  - This holds in the step's own command and in the `package.json` script the step invokes, following aliases three deep.
  - A runner named anywhere else, as an argument, a path or a flag, leaves the step a check.
- **A step invokes a `package.json` script where a command runs it in a form its package manager documents.**
  - A command runs in any of these positions: at the head of each command in an `&&`, `||`, `;` or `|` list, or after a background `&`; after a shell word (`!`, `(`, `{`, `if`, `then`, `elif`, `else`, `while`, `until`, `do`); and after a command that runs the command after it, past that command's options and `NAME=value` settings.
  - The commands that run the command after them are the launchers above, `env`, `nice`, `nohup`, `time`, `command`, `exec`, `xargs`, `stdbuf`, `sudo`, `yarn exec`, `yarn dlx`, `cross-env`, `dotenv`, `xvfb-run`, `nyc`, `c8` and `flock`. So `env CI=1 pnpm test`, `sudo -u ci npm test`, `pnpm start & pnpm test` and `( cd pkg && pnpm test )` each run `test`.
  - The npm forms are `npm run <script>` or its aliases `run-script`, `rum` and `urn`, and npm's test shortcut `npm test`, `npm t` or `npm tst`.
  - The pnpm forms are `pnpm <script>`, `pnpm run <script>` and pnpm's `t` or `tst`, after any of the selections `--filter <selector>`, `-F <selector>`, `-r` and `--recursive`.
  - The yarn forms are `yarn <script>` and `yarn run <script>`, either of them optionally after `yarn workspace <name>`, and `yarn workspaces foreach <options> run <script>`. After `yarn workspaces foreach <options> exec`, the command after `exec` runs, never a script by that command's name.
  - Only the target's own `package.json` is read, so a selection is followed into its script of that name.
  - A script named anywhere else, as in `echo pnpm check`, is not run.
  - A runner is still recognised only through the launchers, as above.
- **A runner is matched only in the last stage of a pipeline.** A step that pipes the runner's output into another command is a check that uses the runner, and is reported as one.
- **Jest, RSpec, Go and Python work the same way:**
  - `"unit": "jest"` recognises a step that runs `jest …`, directly or behind `npx`, `pnpm` or another of the launchers above.
  - `"unit": "rspec"` recognises a step that runs `rspec …`, directly or through `bundle exec`.
  - `"unit": "gotestsum"` recognises a step that runs `gotestsum …`. A step that runs `go test` directly writes no report `balance` reads, so it is reported as a check.
  - `"unit": "pytest"` recognises a step that runs `pytest …`, directly or behind the Python launchers above. A launcher hands on to the word right after it, so these are reported as checks: an option between a launcher and the runner (`uv run --frozen pytest`), a project script (`hatch run test`, `pdm run test`), and a suite started by `tox` or `nox`. Add such a step to `notChecks`.
- **A runner named in several words is recognised where a command opens with all of them**, after any launchers. A build tool runs more than its tests, so name it with its test task: then only the step that runs the tests is the runner, and every other task the tool runs is a check. Name a runner without its launcher. The launcher is set aside before the words are compared, so `"rspec"` covers `bundle exec rspec`, and `"bundle exec rspec"` matches no step.
- **Java:** `"unit": "mvn test"` recognises a step that runs `mvn test …`, and `"unit": "./mvnw test"` one that runs it through the Maven wrapper. `mvn checkstyle:check` stays a check. Declare the words your test step opens with: a step running `mvn clean test` or `mvn -B test` is declared as `"mvn clean test"` or `"mvn -B test"`, and a step that runs the tests through a later phase, such as `mvn verify` or `mvn install`, is declared with those words. Otherwise the step is reported as a check.
- **Kotlin:** `"unit": "./gradlew test"` recognises a step that runs `./gradlew test …`, and `"unit": "gradle test"` one that runs `gradle test …`. `./gradlew detekt` stays a check. Declare the words your test step opens with: a step running `./gradlew clean test`, `./gradlew build`, `./gradlew check` or `./gradlew :app:test` is declared with those words, or it is reported as a check.

### Naming your non-checks — `notChecks`

`notChecks` lists the steps that are neither runners nor checks: the non-checks.

- **Each entry is `<workflow file>:<job id>:<step name>`**, matched **exactly**: no prefix form, no glob, no bare name.
- **To take a whole workflow out, narrow `--ci`** rather than listing its steps.
- **A non-check is named on the report**, not dropped. **Step accounting** counts it under *Non-checks* and lists it under `Non-checks:`, each line reading "— a non-check: the target names it under `specController.notChecks`."
- **An entry that matches no step of a workflow the run read is reported as stale**, under `### Configuration not read`. An entry naming a workflow the run did not read is not judged.
- **Never list `balance` itself or its `toJSON(steps)` dump.** They are excluded by construction.

**GitHub plumbing is excluded by construction too.** A step whose only work is one of these actions is excluded: `actions/checkout`, `actions/setup-*`, `actions/cache`, `actions/upload-artifact` and `actions/download-artifact`. They are matched on owner and repository, whatever ref or sub-path follows. Such a step moves code, tools and files and judges nothing, so the report counts it under *GitHub plumbing* in **Step accounting** and names it in that section's *GitHub plumbing* list, never as a check. The list is closed: every other action stays a candidate, including `actions/dependency-review-action`, which is a check. A plumbing step you also name in `notChecks` is a non-check, as you named it.

### Deferring a scenario — `deferralTags`

A scenario you have written but deliberately not yet evidenced is deferred with a tag, rather than left to read as `missing`.

- **A scenario carrying a recognised deferral tag has every one of its evidence obligations deferred to a Pending Item**, whatever the observed side says. This includes a scenario filtered out of the run, or one reporting a pending step.
- **A deferred scenario that raises no obligations at all** is one Pending Item for the whole scenario.
- **The tag counts** whether it sits on the scenario or is inherited from its `Rule:` or `Feature:`.
- **A Pending Item is shown and tallied on the report**, apart from the out-of-balance rows. It does not affect the verdict or the exit code, unless you pass `--strict`, which fails the run at exit `3`.

The built-in set is `@wip`, `@ignore`, `@skip`, `@todo` and `@pending`. Add your own:

```jsonc
"specController": {
  "deferralTags": ["deferred", "@blocked"]
}
```

- **Your list extends the built-in set and never replaces it.** `@wip` defers whatever you configure.
- **An entry may be written bare or with its `@`.** Surrounding whitespace is ignored.
- **A value that is not an array, or an entry that is not a string,** is read as absent rather than refused, and is named under `### Configuration not read`.
- **A tag in neither list never defers the whole scenario**, however much it looks like a deferral tag.

**A deferral tag is scenario scope. `@<quality-check-kind>pending` is not.** `@integrationpending` defers only the integration obligation on its scenario, so a passing `@unit` beside it still reconciles satisfied. A deferral tag defers them all. The two compose: a scenario carrying both raises a Pending Item from each.

**Neither defers anything on a scenario that shares its claim code with another.** It reads `duplicate-claim-code` at each kind of quality check it raises, deferred or not, or once when it raises none, and it has no Pending Item. Give it a code of its own before deferring it.

`balance --help` prints the key and the built-in set.

### Configuration the run cannot use is named, never dropped

| Code | The entry |
| --- | --- |
| `configuration-wrong-kind` | an entry of a kind its reader does not take (a `notChecks` written as one string, a runner written as a number) is read as absent |
| `configuration-unknown-key` | a key the block does not read at all (a misspelling, or a key an older version read) is passed over |
| `runner-key-not-a-layer` | a `runners` key that is not one of the four layers excludes nothing |
| `not-checks-entry-matches-no-step` | a `notChecks` entry that matches no step of a workflow the run read makes no step a non-check |
| `not-checks-entry-not-a-step-name` | a `notChecks` entry that does not name a step as `<workflow file>:<job id>:<step name>` makes no step a non-check |

None of them refuses the run. Each is named under `### Configuration not read`, in `## Errors in the inputs` right after the run provenance, so the rest of the report is the one you would get without it. Its entry opens with its code, as in `` - `configuration-wrong-kind` — … ``.

### Limits

- **The configuration's location is Node-shaped.** `runners` and `notChecks` sit under `specController` in a `package.json`. A repository that has no `package.json` adds a stub file. What can be discovered is not Node-shaped.
- **Runner recognition has a false positive you can see.** A suite run through an action, or a runner buried in a quoted argument to a wrapper, is reported as a candidate check rather than silently excluded. Fix each with one line of `notChecks`.
- **Annotating steps has no such limit.** An `id:` is a key of the step mapping, the command below it can be any command in any language, and nothing in the resolution reads a manifest.
- **A check that legitimately applies to only some platforms is not served.** A matrix build uses `if:` to skip such a step, and that skip reds. *"The command examined nothing"* and *"this row was not obliged on this run"* are different claims, and only the first is modelled.

---

## Wiring into CI

The point of `spec-controller` is continuous reconciliation, so `balance` belongs in CI, after your tests have produced their reports.

### A whole workflow

One job, for a project with Vitest tests and one converted fitness function. Each part is explained in the sections below. `mkdir -p reports` makes the folder the report is written to, so the step does not depend on the test runner creating it.

```yaml
name: ci
on: [push, pull_request]
permissions:
  contents: read
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - name: Install dependencies
        run: npm ci
      - name: Test
        run: mkdir -p reports && npx vitest run --reporter=json --outputFile=reports/vitest.json
      - name: Complexity
        id: CLM-<FFF>-<NNN>
        if: always()
        run: npx eslint .
      - name: Record the steps
        if: always()
        env:
          STEPS_JSON: ${{ toJSON(steps) }}
        run: printf '%s' "$STEPS_JSON" > ci-steps.json
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
            --exit-zero
```

With `"runners": { "unit": "vitest" }` and `"notChecks": ["ci.yml:build:Install dependencies"]` in `package.json`, the Test step is your unit suite, the install is not a check, checkout and setup-node are GitHub's own setup actions, the last two steps are the reconciler's own, and the Complexity step is the one fitness function. Pin the actions to commit SHAs, and spec-controller to an exact version, in your own repository.

### If you have converted any fitness function

Each check step carries its claim code as its `id:`, and the job ends with one dump step:

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

- **Put `if: always()` on every check step, not just the dump.** Without it, the first red aborts the job and every later check is skipped. The ledger then reports one `failing` and N `broken`: a worse account from a correct mechanism.
- **The dump must be `toJSON(steps)`.** It is the only place a step's `id` and its `outcome` travel together. `outcome` is the field that survives `continue-on-error`; `conclusion` does not.
- **Pass the dump through an environment variable,** never write `${{ toJSON(steps) }}` into the command itself. A step's output can hold a quote, and the shell would then run what follows it.
- **A check that runs on a schedule stays on its own schedule, and no push step records it.** A check too slow for every push, such as a mutation sweep, holds its bar in its own run: a scope's nightly job concludes `failure` below the bar. No push step reads that verdict, so it has no row in a push's ledger. Its red needs a stop of its own where work starts, not in CI: no new work starts while the newest full sweep is red, lapsed or measured nothing, other than the fix, which merges on its own CI. Without that stop, a red sweep blocks nothing.

### Reconcile once, over the reports and the record

```sh
# after your test steps have written vitest-report.json / cucumber-report.json,
# and the dump step has written ci-steps.json
spec-controller balance --features ./features \
  --vitest ./vitest-report.json \
  --cucumber ./cucumber-report.json \
  --ci-steps ./ci-steps.json \
  --ci ./.github/workflows/ci.yml \
  --package-json ./package.json \
  --format md:reconciliation.md \
  --format json:reconciliation.json
```

Drop `--ci-steps` if you have converted nothing.

**Keep the reports as build artefacts, but do not commit them to the repository.** An Evidence Reconciliation lists a codebase's gaps, phantom claims and watermelons. It is more sensitive than the code itself, so it belongs outside version control.

### GitHub Actions — put the report on the run summary

A reconciliation is a table, not a list of line-level findings. GitHub has a channel built for that: the **job summary**. `$GITHUB_STEP_SUMMARY` names a file the runner sets up for each step. Anything appended to it renders as GitHub-Flavoured Markdown on the workflow run's summary page.

`balance` emits Markdown to any path `--format` is given, so this needs nothing from the tool:

```yaml
- name: Reconcile
  run: |
    spec-controller balance --features ./features \
      --vitest ./vitest-report.json \
      --cucumber ./cucumber-report.json \
      --format md:$GITHUB_STEP_SUMMARY \
      --format json:reconciliation.json
```

The reconciliation is then readable on the run page itself, rather than by scrolling a monospace job log. The JSON stays a build artefact for anything downstream.

Two limits:

- **Each step's summary is capped at 1 MiB.** Exceeding it drops the summary and raises an error annotation. A reconciliation over a large corpus can approach this. If it does, route the Markdown to a file, upload it as an artefact, and put a shorter form on the summary.
- **At most 20 step summaries are displayed per job.**

`$GITHUB_STEP_SUMMARY` is set only inside GitHub Actions. Elsewhere the variable is empty and the shell expands it to nothing, so keep it out of commands you run locally.

---

## Reading the report

The output is the **Evidence Reconciliation**, the whole reconciliation, in two renderings of the same model:

- **Markdown**, for people. One **Claim Reconciliation** per claim. Each carries a **verdict**, **balanced** or **out-of-balance**, and is broken into **Quality Check Reconciliations**, one per kind of quality check, each holding its **Reconciliation lines**. Each line carries an **outcome** (`satisfied`, `missing`, `failing`, `watermelon`, …). The non-`satisfied` lines are the **reconciling items**. A **Summary** gives the totals.
- **JSON**, for machines: the same model, for diffing two runs, feeding a dashboard, or building automation on top. `summary.runVerdict` names the run verdict the Markdown's headline states (`balanced`, `out-of-balance`, `claim-code-errors`, `pending`, `unsound` or `nothing-to-reconcile`), so automation reads it instead of working it out from the ledger.

Both carry a **provenance** header recording what was reconciled (target, source SHA, input paths), so a reconciliation is reproducible and attributable.

The JSON's structure is stated by a JSON Schema the package ships, as `dist/spec-reconciliation.schema.json` inside the installed `spec-controller` package (in a local install, `node_modules/spec-controller/dist/`). It names every key the JSON may carry and refuses any other. So validate a report you are handed against the schema of the version that wrote it, which the report's provenance names, and read a change to the JSON's structure as a change to the schema.

### How a run works

1. It parses your Gherkin scenarios and their `@`-tags into **evidence obligations**: the debit, what is specified.
2. It parses the evidence reports you passed (Vitest, Cucumber, and the fitness functions in CI and `package.json`) into **evidence observations**: the credit, what actually ran.
3. It reconciles evidence obligations against evidence observations, per scenario, one kind of quality check at a time.
4. It assembles the **Evidence Reconciliation** and renders it.

### Report rows to know

The JSON names each outcome by its handle, and the Markdown prints the outcome's sentence in its place. This guide names outcomes by handle.

| Row or outcome | The Markdown prints | Note |
|---|---|---|
| unnamed claim | Claim Reconciliation(s) for evidence observations no one scenario can take | this includes evidence citing no code, several codes, or a code several scenarios share, and such evidence that never ran (`broken`); broken evidence that names one scenario's code sits on that scenario's row |
| phantom claim | Claim Reconciliation(s) for cited scenario ids with no real scenario | |
| `missing` | Evidence Observation is missing | |
| `failing` | Evidence Observation is failing | a swallowed red also reads `failing`, given `--ci-steps` |
| `watermelon` | Evidence Observation is passing but its CI step or its job sets `continue-on-error` so its red might not fail the CI run | see below |
| `no-evidence-obligation` | Evidence Observation cites a Scenario with no matching Evidence Obligation | see [When a row reads `no-evidence-obligation`](#when-a-row-reads-no-evidence-obligation) |
| `duplicate-claim-code` | Evidence Obligation's claim code is carried by another Scenario | see below |
| `no-claim-code` | Evidence Obligation has no claim code for an Evidence Observation to link to | |

### Watermelons

The outcome to watch for is the **watermelon**: a fitness function that is green, but whose CI step or job sets `continue-on-error`, so its red might not fail the CI run. That makes a green CI lie. A watermelon is what the workflow file shows on its own. Given the run's step record (`--ci-steps`), the step's own outcome answers the row instead, and a swallowed red reads `failing`.

### What counts as a claim code

A claim code has the form `CLM-<FFF>-<NNN>`: the prefix `CLM`, a feature part of two to five uppercase letters or digits, then a number of any width. `balance` reads every id with this one grammar, wherever it finds one: a scenario tag, a `[CLM-…]` citation in a Vitest title, a Cucumber scenario's tag, a CI step's `id:`, or a mention in prose.

So an id such as `@CLM-TOOLONGCODE-001` is not a claim code. It opens no account and cites nothing. A scenario tagged only with it has no claim code, and reconciles as `no-claim-code`.

The tool judges claim code errors only over the corpus that `--features` names.

**An Outline can make each of its rows a claim of its own.** Give its Examples table a column named `clm`, and put each row's claim code in it. Each row is then a claim under its own code, raising the Evidence Obligations its Outline's tags name, and evidence cites the row's code as it would a scenario's. Such an Outline carries no code of its own. A row whose `clm` cell is empty, or not a claim code, has no claim code, and two rows with one code are duplicates, as two scenarios would be. An Outline with no `clm` column is one claim, under the code its tags carry. When Cucumber runs an Outline with a `clm` column, each row is credited by Cucumber's own result for that row, so a passing row and a failing row reconcile apart. `balance` finds the row from the line and the feature file the Cucumber report names, whichever folder Cucumber ran from.

### Duplicate claim codes

**A claim code is an account number, and two scenarios carrying one code are two claims that cannot reconcile.** A code two scenarios carry can arise from the same id written twice, or from a claim code on a `Feature:` or `Rule:` line that every scenario beneath it inherits. Either way:

- Each scenario reconciles as a Claim Reconciliation of its own, under the code, and every Quality Check Reconciliation on it reads `duplicate-claim-code`: *Evidence Obligation's claim code is carried by another Scenario*. Each row's reconciling item names the scenario it reconciles (*this one is login.feature : a user with the right password is let in*), and the JSON carries it as `scenario: { feature, title }`.
- No evidence citing that code can be attributed to either scenario, so both claims are out of balance whatever the evidence says. An evidence observation citing the code credits neither and posts to the unnamed claim, naming the code.
- The rest of the report is unaffected. Every other account reconciles exactly as it would without the duplicate.
- The report names each shared code with the file and the name of every scenario carrying it (`summary.claimCodes.sharedClaimCodes` in the JSON).
- The run exits `1`, the out-of-balance verdict, and the report is printed.

### Claim code errors

**A feature file is the account class its scenarios' codes are filed under, and a misfiled code is a claim code error.** Every `balance` run judges the corpus it read. When the corpus holds an error, the run lists it under `### Claim code errors` (`errorsInTheInputs.claimCodeErrors` in the JSON), in `## Errors in the inputs` right after the run provenance. Its entry opens with its code, as in `` - `foreign-claim-code` — … ``. There are five errors:

| Handle | The fault | The fix |
| --- | --- | --- |
| `foreign-claim-code` | a scenario's code names a feature its file does not carry, e.g. `@CLM-<FFF>-<NNN>` in a file headed with a code other than `@<FFF>` | re-code the scenario for its file, or move it to the file whose header carries the code its id names, when exactly one does; the finding names that file, or says no file carries the code |
| `no-feature-code` | a feature file carries no header code while its scenarios carry claim codes (a header longer than five characters is no header code) | give the file a header code, and code its scenarios for it |
| `duplicate-feature-code` | two feature files carry one header code | give one of them a code of its own |
| `several-claim-codes` | one scenario carries more than one distinct claim code, so it opens no account under any of them, and a test citing one of them cites a code no scenario carries | give the scenario one code |
| `claim-code-beside-clm-column` | an Outline carries a claim code, its own, its Rule's, its Feature's or an Examples block's, and has a `clm` column, so it opens no account under its code or any row's | take the code off the Outline, or drop its `clm` column |

- The first three misfile a code without making any posting ambiguous, so every account still reconciles exactly as it would if the code were filed correctly.
- What a misfiled code falsifies is the by-feature cut, which groups on the code. So **any claim code error fails the run at exit `1`**.
- A run carrying both a claim code error and an out-of-balance account exits `1`, and its verdict names both.
- When the codes are clean, no section prints. The run verdict under `## Summary` is followed by one line saying so, with how many feature files the run judged, coded or not, and how many feature codes they carry, each counted on its own.
- Over a corpus with no feature file, no section prints either. The line after the run verdict says that no feature file was judged, and states nothing clean.
- The section always says that a duplicated claim code is reported on its account's rows, never in this section.

### Exit codes

| Exit | Meaning |
|---|---|
| `0` | balanced; or any `1` or `3` verdict under `--exit-zero` |
| `1` | out of balance, or claim code errors |
| `2` | usage error |
| `3` | Pending Items present under `--strict` |
| `4` | unsound run |
| `5` | nothing to reconcile |
| `6` | unexpected error: the run stops before a verdict, and one line on stderr names the error |

When several codes apply, this ladder decides: nothing to reconcile (`5`), then unsound (`4`), then claim code errors (`1`), then out of balance (`1`), then pending under `--strict` (`3`). An unexpected error (`6`) is not on the ladder. A run exits `6` only when it does not finish. A stored run that cannot write its `run.yaml` does not finish, so it exits `6`, and the reports it has already written stay in the run directory. A run already refused as a usage error keeps `2` if an error follows.

An error after the run reaches its verdict does not change the exit code. One line goes to stderr, `spec-controller hit an unexpected error [unexpected-error-after-verdict] after its verdict: <name>: <message>`, and the run exits with the verdict's code: the report stands as written. A run writes at most one such line, whichever kind it is.

### Error codes

**A refusal of a flag, a command, an argument or an input carries its error code in square brackets**, as in `spec-controller balance: usage error [unknown-flag] — …`. The code names what went wrong, and does not change when the words do, so quote it and look it up here. A pointer line after the error, such as the one naming `--help`, carries no code, and nothing that is not an error carries one. Each error below but the two unexpected errors refuses the command as given, a usage error, and the run exits `2`. An unexpected error's line carries its code too, as in `spec-controller stopped on an unexpected error [unexpected-error], and gives no verdict: …`. An error in the inputs is not a refusal: its entry in the report opens with its code, listed under [Configuration the run cannot use is named, never dropped](#configuration-the-run-cannot-use-is-named-never-dropped) and [Claim code errors](#claim-code-errors).

| Code | Meaning |
|---|---|
| `unknown-flag` | the command does not take the flag given |
| `retired-flag` | the flag given is retired: an earlier version took it, and this one does not |
| `unknown-command` | the tool has no command of the name given |
| `missing-value` | a flag that takes a value was given none |
| `given-twice` | a flag that is read once was given more than once |
| `equals-form` | a flag and its value were joined by `=`; give them as two arguments |
| `takes-no-value` | a flag that takes no value was given one |
| `extra-argument` | an argument is more than the command takes |
| `not-a-flag` | an argument is neither a flag nor the value of the flag before it |
| `misplaced-modifier` | a host modifier, such as `--store`, was given after the command; it goes before it |
| `flag-before-command` | a command's own flag was given before the command; it goes after it |
| `no-command-after-modifiers` | host modifiers were given with no command after them |
| `modifier-took-command` | a host modifier took a command's name as its value, and left no command to run |
| `modifiers-not-taken` | a command that keeps no run, such as `allocate`, was given a host modifier |
| `re-render-not-stored` | a re-render was given a host modifier; a re-render keeps no run |
| `run-id-without-store` | `--run-id` was given without `--store`, so no run is kept under it |
| `legacy-json-removed` | `--json <path>` was given; it is removed, and `--format json:<path>` writes the JSON report |
| `re-render-reads-only` | a re-render was given a flag it would ignore; it reads only `--strict` and `--exit-zero` |
| `unknown-format` | `--format` was given a format the tool does not write |
| `more-than-one-to-stdout` | more than one output routes to stdout; at most one may |
| `outputs-share-file` | two outputs name the same file |
| `output-overwrites-input` | an output names a file the run reads |
| `output-overwrites-stored-run` | an output names a file of an earlier stored run |
| `format-names-stored-run-manifest` | an output names the stored run's own `run.yaml` |
| `stored-run-reads-its-manifest` | a file the stored run reads is its own `run.yaml` |
| `unknown-part-refused` | `allocate` was given a feature part no feature file's header carries |
| `no-feature-part-given` | `allocate` was given no feature part |
| `not-a-feature-part` | `allocate` was given a feature part not in its form: two to five characters, each `A`–`Z` or `0`–`9` |
| `could-not-be-read` | an input could not be read: a file, a directory or a report the run reads, or the repository `allocate` reads |
| `working-directory-unreadable` | `allocate` could not read the working directory it was run in |
| `input-path-missing` | the path given to an input flag does not exist |
| `not-valid-json` | a report read as JSON is not valid JSON |
| `not-valid-json-in-shape` | a report read as JSON is not valid JSON, so not in the shape its tool writes |
| `not-valid-xml` | a report read as JUnit XML is not valid XML |
| `not-in-shape` | a report parses, but is not in the shape its tool writes |
| `not-a-saved-reconciliation` | the `--render-from-json` file is not a saved reconciliation |
| `not-renderable-as-saved` | the `--render-from-json` file could not be rendered as a saved reconciliation |
| `corpus-file-unparseable` | a feature file in the corpus could not be parsed as Gherkin; each such file has its own coded line, with the parser's words beneath it |
| `workflow-not-yaml` | a CI workflow is not valid YAML |
| `report-not-written` | a report could not be written to the path its `--format` names |
| `stored-run-directory-not-created` | the stored run's directory could not be created under the `--store` root |
| `unexpected-error` | the run stopped on an unexpected error before its verdict, and exits `6`, or keeps `2` if it was already refused as a usage error |
| `unexpected-error-after-verdict` | an unexpected error came after the run's verdict; the run exits with the verdict's code |

---

## Command reference — `balance`

```sh
spec-controller balance --features ./features \
  --vitest ./vitest-report.json \
  --cucumber ./cucumber-report.json
```

Run `spec-controller --help` for the top-level summary of the commands and host modifiers. Run `spec-controller balance --help` for the full list of `balance`'s flags.

### Flags

| Flag | Purpose |
|---|---|
| `--features <dir>` | A directory of Gherkin `.feature` files: the scenarios. The tool reads every `.feature` file under it, at any depth, and names each one in the report by its path within the directory. It does not enter a symbolically linked directory. |
| `--vitest <report.json>` | A Vitest JSON report: runtime test evidence. |
| `--pytest <report.xml>` | A pytest JUnit XML report (`pytest --junitxml`): runtime unit test evidence. Use it with `--vitest`, instead of it, or not at all. See [Citing a scenario from pytest](#citing-a-scenario-from-pytest). |
| `--jest <report.json>` | A Jest JSON report (`jest --json --outputFile=<path>`): runtime unit test evidence. Use it with `--vitest`, instead of it, or not at all. See [Citing a scenario from Jest](#citing-a-scenario-from-jest). |
| `--junit <report.xml>` | A JUnit XML report, or a directory of them, from any runner that writes one: runtime unit test evidence. For example, for Go, `gotestsum --junitfile <path>` writes one; Maven Surefire writes the `target/surefire-reports` directory for a Java suite; Gradle writes `build/test-results/test` for a Kotlin one. A test cites its scenario with the code in square brackets in its name. Use it with `--vitest`, instead of it, or not at all. See [Citing a scenario from Go](#citing-a-scenario-from-go), [Citing a scenario from Java](#citing-a-scenario-from-java) and [Citing a scenario from Kotlin](#citing-a-scenario-from-kotlin). |
| `--rspec <report.json>` | An RSpec JSON report (`rspec --format json --out <path>`): runtime unit test evidence. An example cites its scenario with the code in square brackets in its description. Use it with `--vitest`, instead of it, or not at all. See [Citing a scenario from RSpec](#citing-a-scenario-from-rspec). |
| `--cucumber <report.json>` | A Cucumber JSON report: runtime test evidence. |
| `--ci <ci.yml>` | Your CI workflows: a file, or a directory of them (default `.github/workflows`). **This is the scope of discovery.** The tool reads every step of every job it resolves; narrow it to leave a whole workflow out. It is also where the tool finds an UNCONVERTED fitness function running over the real source, and where a check step's `id:` supplies the claim code that its result cites. |
| `--package-json <path>` | The target's `package.json`: its `scripts`, and its `specController.runners`, `specController.notChecks` and `specController.deferralTags` (see [Configuration](#configuration--the-speccontroller-block)). A fitness function is named by its `@fitness` scenario and by the CI step whose `id:` is that scenario's claim code; no manifest key names one. Defaults to `package.json` in the working directory. |
| `--ci-steps <record.json>` | Your CI run's own record of what each of its steps did: the `toJSON(steps)` dump, which is the evidence for converted fitness functions. See [Wiring into CI](#wiring-into-ci). Omit it if you have converted none. |
| `--target <name>` | A name recorded verbatim in the report's provenance: the project this run reconciled. |
| `--source-sha <sha>` | Override the git commit SHA recorded in provenance (defaults to the resolved HEAD). |
| `--format <fmt>[:<path>]` | Where to send output (`md` or `json`, optionally `:<path>` to write to a file). Repeatable. See [`--format`](#--format--routing-the-output). |
| `--render-from-json <path>` | Re-render Markdown from a saved Evidence Reconciliation JSON, with no reconciliation and no live inputs. See [Re-rendering a saved run](#re-rendering-a-saved-run). |
| `--strict` | Fail the run (exit `3`) when it carries Pending Items. Otherwise, Pending Items do not affect the run's outcome. |
| `--exit-zero` | Print the same report, but exit `0` on an out-of-balance or claim-code-error (`1`) verdict, or a `--strict` pending (`3`) verdict. Usage (`2`), unsound (`4`), nothing-to-reconcile (`5`) and an unexpected error before the verdict (`6`) still fail. Use it as the on-ramp before gating. |
| `--help`, `-h` | Show `balance`'s help and exit. |

### `--format` — routing the output

`--format` takes a format (`md` or `json`), optionally followed by `:<path>`:

- `--format md` sends Markdown to stdout. This is the default when you give no `--format`.
- `--format json:out.json` sends JSON to a file.
- Repeat the flag to emit several outputs at once: `--format md:report.md --format json:report.json`.

There is no `--json <path>` flag. Use `--format json:<path>`.

The rules below are all checked before anything is emitted. A run that breaks one is refused at exit `2`, prints no report, and writes no file.

**At most one output may go to stdout.** A path that names stdout itself (`/dev/stdout`, `/dev/fd/1`, or a link to either) counts as stdout. So `--format md --format json:/dev/stdout` is refused, like `--format md --format json`.

**No two outputs may share one regular file, however the file is named.** That covers the same path twice, the same format twice, `./` or an absolute spelling beside a relative one, a path through `..`, a symbolic link, a path through a linked directory, a hard link, and the file stdout is redirected into. The file is recognised by the operating system's identity for it, so on a case-insensitive volume `report.md` and `REPORT.MD` are one file. The refusal names both outputs. A destination that is not a regular file, such as `/dev/stderr` or `/dev/null`, may be given more than once, because writing it twice loses nothing.

**No output may land on a file the run reads, however the file is named.** The files the run reads are:

- the `--vitest`, `--cucumber`, `--ci-steps` or `--package-json` file;
- the `package.json` read by default;
- any feature file of the `--features` corpus, or of the `features/` read by default;
- the `--ci` workflow, any workflow of the `--ci` folder, or of the `.github/workflows` read by default.

The file is recognised by its identity, as above. So a link, a hard link, or another spelling of an input counts, and so does stdout appended (`>>`) into one. The refusal names the output and the input. A file the run does not read, beside an input or inside one of its folders, is written as asked.

**A path is written as given.** The directory it names must already exist, since `--format` creates none. A path that is a symbolic link to a file that does not exist yet is written through the link, creating the file it points to. A path that cannot be written (read-only, an existing directory, under a regular file, or in a directory that does not exist) is refused, naming the path and the operating system's reason.

### Re-rendering a saved run

`--render-from-json <path>` re-renders Markdown from a saved Evidence Reconciliation JSON. It does not reconcile and reads no live inputs.

- The re-render exits the code the saved verdict names.
- It is strict if the saved run was strict, or if `--strict` is given beside it.
- `--exit-zero` composes with it as it does live.
- Every other flag beside it (a live input, `--target`, `--source-sha`, `--format`) is refused at exit `2`.
- A re-render keeps no run, so under `--store` it is refused at exit `2`, naming `--store`, and no store root is made. `--run-id` with a re-render is refused the same way.

### Storing a run — `--store` / `--run-id`

`--store` and `--run-id` are **host modifiers**. They go *before* the command, not among `balance`'s own flags:

```sh
spec-controller [--store <root>] [--run-id <id>] balance [options]
```

| Modifier | Purpose |
|---|---|
| `--store <root>` | Store the run: write `<root>/<target>/<run-id>/` with the reconciliation outputs plus a `run.yaml` manifest. Required to store. There is no default, because a default would write inside the repository. |
| `--run-id <id>` | Name the stored run (default: an ISO-8601 UTC timestamp). Read only with `--store`. |

```sh
spec-controller --store ~/spec-controller-runs --run-id 2026-07-09-ci balance \
  --features ./features \
  --vitest ./vitest-report.json \
  --target my-project
# → ~/spec-controller-runs/my-project/2026-07-09-ci/  (reconciliation outputs + run.yaml)
#
# The root is OUTSIDE the repository being reconciled, which is why there is no default.
# A report enumerates a codebase's gaps, dangling anchors and watermelons — more sensitive
# than the code itself — so a kept run belongs in a store you chose, not under version
# control alongside the thing it is about.
```

**How storing works.** Storage belongs to the host, not to `balance`. A leading `--store` turns any run into a **stored** run: the host writes the run directory and hands `balance` its own clean args unchanged. A run without `--store` stays emit-only and byte-identical, and writes nothing to disk beyond what `--format …:<path>` requests. Missing parents of the root are created.

**Host modifier rules:**

- **A host modifier needs a command, or `--help`, after it.** Given with nothing after it, it is refused at exit `2` and nothing runs.
- **`--help` or `-h` before the command** answers the top-level help at exit `0`, whatever else is given there, even a token that would otherwise be refused. After the command, it is that command's own help.
- **A command's `--help` or `-h` is answered before the store is touched.** Nothing is written under the root, even a root that cannot be written.
- **`--run-id` without `--store`** is refused at exit `2` and nothing runs, because no run would be kept under the name.

**Refusals, all at exit `2`:**

- **A root the run directory cannot be created under** (a regular file, a path under one, or a directory the tool may not write) is refused, naming the run directory and the operating system's reason. No run directory is printed.
- **A `--format` beside `--store` may not name a file the stored run writes itself** (its `spec-reconciliation.md`, its `spec-reconciliation.json` or its `run.yaml`), however the path is spelled. The refusal names the file. No run directory is printed, and an earlier run under the same run-id is left as it was.
- **The stored run's own files may not land on a file the run reads.** A stored run whose report or `run.yaml` would be written over one of its inputs is refused the same way.

---

## Allocating the next claim code — `spec-controller allocate`

Ask the tool for the next claim code instead of inventing one:

```bash
spec-controller allocate <FFF>
# CLM-<FFF>-<NNN>
```

For a feature part no feature file carries yet, add `--new`:

```bash
spec-controller allocate <FFF> --new
# CLM-<FFF>-001
```

The code is written under `CLM`, one past the highest number a claim code in the repository has **ever** carried for that feature part. So a number is never handed out again once a claim code has carried it, and every old reference to a code, in history, a chat or a stale document, keeps meaning what it meant. The number is at least three digits, zero-padded, and grows past them (`999` is followed by `1000`).

- **The argument** is the feature part, `<FFF>`: two to five characters, each `A`–`Z` or `0`–`9`. A part is known when a feature file in `features/` at the top of the repository is headed with it. That is the corpus `balance` reads by default. A part that only history or a test fixture carries is not known.
- **`--new`** starts a part no feature file's header carries yet, such as a first code in a tree with no feature files. Its first code is `001`, or one past any number the repository already carries for the part. Given for a part a header already carries, it answers as usual and says so on stderr.
- **stdout** carries the code and nothing else, so a script or an agent can consume it.
- **stderr** says what the answer rests on:
  - `highest seen: <claim code>, features/<file>.feature:40`, the code as written, with ` in <commit>` when only history carries it;
  - `highest seen: none` for a first code;
  - when history is short, `history: not a git repository — none read` or `history: shallow clone — history before <commit> unread`, each followed by what that risks.
- **Exit codes:**
  - `0` when it answers.
  - `2` for a usage error (no part, a part not in the claim-code form, a second part, a flag it does not take, or a host modifier such as `--store` before it) or an unknown part. The message says which of the two it was. An unknown part's refusal lists the parts the feature files carry.
  - It never refuses because history is short.
  - `--help` or `-h` anywhere among its arguments answers its help at `0`, even with a host modifier before it.

**What it reads.**

- Every text file in the repository, wherever you run it from: tracked files, and untracked files the repository does not ignore, since you allocate because you have just written a scenario.
- The added and removed lines of every reachable commit. Never commit messages: a code that only ever appeared in a message was never a scenario, and a message cannot be unwritten.
- Outside a git repository, it walks the working tree, skipping `node_modules` and hidden directories, whose packages carry codes of their own.

**Limits.**

- **Prose counts.** A code cited in a document or a comment retires its number. It does so visibly, because stderr names where the highest code was seen.
- **Only reachable history is read.** A code that only ever lived outside it, on a branch you never fetched or before a shallow clone's edge, is not seen. stderr says so where it can.
- **Merge resolutions are not read.** `git log -p` shows no diff for a merge commit, so a code that existed only in a merge's conflict resolution is invisible to the history read.

---

## Troubleshooting

**No scenarios found, or an empty report.** Check that `--features` points at the directory holding your `.feature` files, and that the scenarios carry `@CLM-…` ids and evidence-obligation tags.

**A `@unit` scenario reads `missing` while its test passes.** Check the square brackets around the code in the test title first. See [Only these four forms are read](#only-these-four-forms-are-read).

**A fitness function shows `missing` or `watermelon` when you didn't expect it.** `missing` means no CI step carries that scenario's claim code as its `id:`; `package.json` scripts play no part in it. `watermelon` means the step that cites it runs under `continue-on-error`, and no `--ci-steps` record answered it. Both are real findings, not tool errors.

**My first run fails with a wall of uncited checks.** This is expected, not a misconfiguration. Every step of the workflows `--ci` names is a candidate fitness function until something says otherwise. A candidate that cites no scenario posts to the unnamed claim, so `balance` exits `1`.

1. Read the report's **Step accounting** section. It names each workflow and job, how many steps were read, and what became of every one. GitHub's own checkout, setup, cache and artifact actions are already counted out as plumbing.
2. Name your runners, name your non-checks, or narrow `--ci`. See [Configuration](#configuration--the-speccontroller-block).
3. To keep the report while you work it down without failing the build, add `--exit-zero`. Delete it when you are ready to gate.

**A step I know is my test suite is reported as a check.** Runner recognition did not reach it. It recognises the runner only as the command a step runs, directly or behind one of the listed launchers, in the step's command or in the `package.json` script the step invokes. These are not reached: a suite run through a `uses:` action, one started by a launcher not on the list (`tox`, `nox`), one run as a project script (`hatch run test`), one with an option between a launcher and the runner (`uv run --frozen pytest`), one passed as an argument to a wrapper, or one whose output is piped into another command (`pnpm test | tee test.log`). Add the step to `specController.notChecks`. The failure direction is deliberate: a step wrongly reported is one line to fix, but a step wrongly excluded would be invisible.

**The verdict reads CLAIM CODE ERRORS.** The corpus files a claim code under the wrong feature file, or in a file with no header code, or two files share one header code, or a scenario carries more than one claim code, or an Outline carries a claim code beside a `clm` column. `### Claim code errors` names each by its handle and file, and says which fix it wants. A misfiled code leaves every account reconciling, so the rest of the report is as it would be. A scenario carrying several codes, or an Outline carrying a code beside a `clm` column, has no account raised for it under any of them, and the verdict says so. The run exits `1` until the codes are filed correctly. See [Claim code errors](#claim-code-errors).

**A row reads `duplicate-claim-code`.** Two scenarios carry that claim code, and each has a row of its own whose reconciling item names it by its file and title. Give one of them a code of its own. A claim code hoisted onto a `Feature:` or `Rule:` line is inherited by every scenario beneath it, so move it onto the scenario. While two scenarios share it, the run exits `1`.

**`--json` rejected.** There is no such flag. Use `--format json:<path>`.

---

## What spec-controller assumes, and what it does not do

**It reconciles automated tests and fitness functions in CI.** Unit, integration, e2e and performance tests, and fitness functions. It is not a task tracker, and it is not a documentation spec.

**Your tracker keeps the work.** A ticket is a change. A scenario is behaviour the system has now. The two meet only where one piece of work creates, reads, updates or deletes one scenario.

**Test validity is assumed.** spec-controller reconciles a result to the test that claimed it. Whether that test reflects the behaviour the business wants is yours to ensure, as it is under CI, TDD and BDD. The tool does not try to establish that a test is a good test.

**A title can drift from its check. This gap is stated, not solved.** Wherever the runner is not Cucumber (usually `@unit`, `@performance` and `@fitness`), a scenario carries no Given/When/Then, so no unexecuted step reads as a test. Its title is still prose that nothing reads against the check that answers it, and the two can drift without anything going red. The ledger proves a scenario is linked to evidence and that the evidence passed. **It does not prove the evidence tests what the title says.**

**It keeps a reconciled codebase reconciled.** Getting a codebase with no scenarios to that point is not part of this package.
