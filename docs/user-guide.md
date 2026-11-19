# spec-controller — how to use

This guide is for anyone who runs `spec-controller balance` against a project: a developer who wires it into CI, a tech lead who adopts the reconciliation discipline, or an auditor who checks whether a codebase's scenarios have evidence behind them. The tool behaves the same whoever runs it.

`balance` reconciles two sides, as double-entry bookkeeping does:

- **The debit side: what is specified.** Your Gherkin scenarios. The tags on each scenario say what evidence it needs. These are **evidence obligations**.
- **The credit side: what actually ran.** The reports your test tools and CI already write. These are **evidence observations**.

`balance` matches each evidence observation to the evidence obligation it answers, one scenario at a time, and reports anything that does not match.

`spec-controller` does not run your tests. It reads the reports your tools already write.

You do not need feature files to start. With no feature files, or with feature files not tagged for spec-controller's model, `balance` still reports every check the pipeline ran. Tagged scenarios are not the first step.

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

If your project uses pnpm, install pnpm yourself (`npm install -g pnpm`). Node 25 and later do not bundle corepack.

**Your evidence, as reports.** Before you run `balance`, generate whichever of these reports apply to your project. Step 1 of [Every report, and the whole command](#every-report-and-the-whole-command) gives the command that writes each one.

| Input | What it is | Flag |
|---|---|---|
| Gherkin `.feature` files | your scenarios and their evidence-obligation tags | `--features` |
| A Vitest JSON report | runtime test evidence | `--vitest` |
| A Cucumber JSON report | runtime test evidence | `--cucumber` |
| A pytest JUnit XML report, written by `pytest --junitxml` | runtime test evidence | `--pytest` |
| A Jest JSON report, written by `jest --json --outputFile=<path>` | runtime test evidence | `--jest` |
| A JUnit XML report from any other runner, such as Go's, written by `gotestsum --junitfile <path>` | runtime test evidence | `--junit` |
| An RSpec JSON report, written by `rspec --format json --out <path>` | runtime test evidence | `--rspec` |
| Each CI job's step record: the `toJSON(steps)` dump that job writes | evidence for every fitness function whose step's `id:` is its claim code (see [Wiring into CI](#wiring-into-ci)) | `--ci-steps` |
| Your CI config (`ci.yml`) | the scope discovery ranges over | `--ci` |
| `package.json` | its `scripts`, which runner recognition follows, and your configuration | `--package-json` |

---

## Install

```sh
npm install -g spec-controller
```

Or run it without installing:

```sh
npx spec-controller balance --features ./features …
```

---

## Every report, and the whole command

[The quickstart](./quickstart.md) takes a first run from nothing to CI, with Vitest. This section adds what the quickstart leaves out: the command that writes each runner's report, and the one command that reads them all. Run them from the repository you reconcile, with the published CLI.

```
cd ~/code/your-project

# 1. Produce the evidence your tools already write.
npx vitest run --reporter=json --outputFile=reports/vitest.json
npx cucumber-js --format summary --format json:reports/cucumber.json
python -m pytest --junitxml=reports/pytest.xml     # if you use pytest
npx jest --json --outputFile=reports/jest.json     # if you use Jest
gotestsum --junitfile reports/go.xml ./...         # if you use Go
bundle exec rspec --format progress --format json --out reports/rspec.json   # if you use RSpec

# 2. Reconcile it.
npx spec-controller balance \
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
- **`--target` names the project in the report.** Without `--target`, when the project is a git checkout with an `origin` remote, the report names the target by that origin, as in `owner/repo`. Otherwise the report reads `unknown-target`. When the name comes from the origin:
  - It leaves out any user, password, token, query or fragment in the remote.
  - An `https` or `ssh` URL is named `owner/repo`, and so is an scp remote such as `git@github.com:owner/repo.git`.
  - A local path is named by the repository's folder, as in `web` for `/srv/git/web.git`, and so is a `file:` URL with no user.
  - Any other form names no origin. A `git://` URL and a bare name such as `foo` are among them.

For the smallest form of the command, and for every flag, see [Command reference](#command-reference--balance).

### Expect your first run to fail — use `--exit-zero`

Your first run against an unannotated pipeline fails, and the report is right to fail it: the corpus raises no evidence obligations yet. [A first run, report only](./quickstart.md#a-first-run-report-only) explains why, and shows how `--exit-zero` lets you watch before you gate.

### Write your first `notChecks`

`balance` lists every CI step as a check, except a declared runner (see [Naming your runners](#naming-your-runners--runners)) and GitHub's own checkout, setup, cache and artifact actions. Some steps do work but check nothing, such as a step that publishes a package or bumps a version. Name each of these steps once in `package.json`, by the step's own name:

```jsonc
"specController": {
  "notChecks": [
    "ci.yml:ci:Publish to npm",
    "release.yml:release:Bump version"
  ]
}
```

The full rules are in [Naming your non-checks](#naming-your-non-checks--notchecks).

### When a row reads `not-asked-for`

A test cites a scenario, and the scenario asks for no evidence of the test's kind of quality check. Move the test's citation to the scenario it really proves, or split off a new scenario for it. Never re-point a citation just to turn a row green.

---

## How your evidence finds its scenario

A scenario's tag line says what the scenario needs proved. `@CLM-<FFF>-<NNN> @unit @e2e` asks for a unit test and an end-to-end run, and both answer `CLM-<FFF>-<NNN>`. A kind-of-quality-check tag says which kind of run answers the evidence obligation. Whether that run really is end-to-end is decided by the test, not the tag.

A feature file declares its feature code on the line above `Feature:`, then its Rules and scenarios. Each scenario has its own claim code:

```gherkin
@<FFF>
Feature: Allocate the next claim code for a feature code

  Rule: the next code is one past the highest the repository has ever carried

    @unit @CLM-<FFF>-<NNN>
    Scenario: a feature code whose highest live claim code is below a deleted one is offered one past the deleted claim code
```

Each evidence observation names the scenario it answers **in the one form its runner's report records**:

| The scenario asks for | The evidence | How it names the scenario |
|---|---|---|
| `@unit` | a Vitest test | `[CLM-…]` in square brackets in the test's `it` title, or in an enclosing `describe` title. The most specific one wins. |
| `@unit` | a Jest test | `[CLM-…]` in square brackets in the test's title, or in an enclosing `describe` title, as for Vitest (see [Citing a scenario from Jest](#citing-a-scenario-from-jest)) |
| `@unit` | a Go test | `[CLM-…]` in square brackets in a subtest's name, given to `t.Run` (see [Citing a scenario from Go](#citing-a-scenario-from-go)) |
| `@unit` | a JUnit 5 test in Java | `[CLM-…]` in square brackets in the test's `@DisplayName`, carried into the report by Surefire's phrased reporter (see [Citing a scenario from Java](#citing-a-scenario-from-java)) |
| `@unit` | a JUnit 5 test in Kotlin | `[CLM-…]` in square brackets in the test's `@DisplayName`, which Gradle writes into the report (see [Citing a scenario from Kotlin](#citing-a-scenario-from-kotlin)) |
| `@unit` | an RSpec example | `[CLM-…]` in square brackets in the example's description, given to `it`, or in an enclosing `describe` or `context` description (see [Citing a scenario from RSpec](#citing-a-scenario-from-rspec)) |
| `@unit` | a pytest test | one claim code in a `clm` property on its `<testcase>` in the JUnit XML report, written by `@pytest.mark.clm("CLM-…")` (see [Citing a scenario from pytest](#citing-a-scenario-from-pytest)) |
| `@integration`, `@e2e`, `@performance` | a Cucumber run of the scenario, or a test in any report the layer's `runners` entry names | for Cucumber, nothing to add: the report carries the scenario's own claim code, and a row of an Outline with a `clm` column is credited by Cucumber's result for that row. For any other runner, the test cites the code as that runner's format does (above). Name the report under the layer's runner (see [Naming your runners](#naming-your-runners--runners)) |
| `@fitness` | a CI step | the step's `id:` is the code (see [Fitness functions](#fitness-functions)) |

A Vitest citation:

```ts
describe("[CLM-<FFF>-<NNN>] a feature code whose highest live claim code is below a deleted one is offered one past the deleted claim code", () => {
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

The table above lists the only four forms that name a scenario:

- a bracketed code in a test's title or name, or in an enclosing title where the table allows it;
- a `clm` property on a pytest test;
- a Cucumber scenario's own claim code;
- a CI step's `id:`.

These name nothing:

- `CLM-<FFF>-<NNN>` or `@CLM-<FFF>-<NNN>` in a test title without the square brackets;
- a code in a comment, including a `// @CLM-…` line in a step-definition file;
- a code anywhere else.

A test that names nothing still runs, and `balance` still reports it. It lands on the **unnamed claim** (see [Report rows to know](#report-rows-to-know)) and reads `cites-no-claim`. The scenario it was meant for reads `missing`. **When a `@unit` scenario reads `missing` while its test passes, check the brackets first.**

### Citing a scenario from pytest

A pytest test's name is a Python function name, and a function name cannot hold `[CLM-…]`. So a pytest test cites its scenario with a marker, and a hook you add once copies the marker into the report. Pass the report with `--pytest`:

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

**2. Register the marker once**, in `pytest.ini`. pytest raises a warning for an unregistered marker, and an error under `--strict-markers`:

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

`pytest --junitxml` then writes the claim code as a property of that test. `balance` reads this:

```xml
<testcase classname="test_cases" name="test_offers_the_next_code" time="0.001"><properties><property name="clm" value="CLM-<FFF>-<NNN>" /></properties></testcase>
```

**No hook?** A call to `record_property("clm", "CLM-<FFF>-<NNN>")` inside the test writes the same element. But under pytest's default `junit_family`, each such test raises a `PytestWarning`, so a suite that runs with `filterwarnings = error` fails those tests.

**What a pytest report posts:**

| The test | What it posts |
|---|---|
| `clm` properties naming exactly one claim code | answers that scenario: passing, or failing when it has a `<failure>` |
| skipped | nothing, as a skipped Vitest test posts nothing |
| a code no feature file carries | makes a [phantom claim](#report-rows-to-know) |
| no `clm` property, or a value that is not a claim code | lands on the unnamed claim |
| `clm` properties naming two or more different codes | **credits none of them**; it lands on the unnamed claim, naming every code, because one test proves exactly one scenario |
| a module that fails to collect, or a test whose setup errors | never ran its proof: it posts a `never-ran` Evidence Observation, the run is not reconciled, as `unsound` (exit `3`), and the scenario it cites reads `missing` |

### Citing a scenario from Jest

A Jest test cites its scenario exactly as a Vitest test does: with the claim code in square brackets in its title. Jest's own JSON report records each test's title, so you need no reporter package and no setup file. Pass the report with `--jest`:

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

`jest --json` writes that test into the report with its title and its result. `balance` reads this:

```json
{
  "ancestorTitles": ["allocating the next number"],
  "title": "[CLM-<FFF>-<NNN>] offers one past the highest number already used",
  "fullName": "allocating the next number [CLM-<FFF>-<NNN>] offers one past the highest number already used",
  "status": "passed"
}
```

`balance` reads the claim code in the test's own title first. It reads a claim code in an enclosing `describe` title only when the test's own title has none. Name the runner in the `specController` block as `"unit": "jest"` (see [Naming your runners](#naming-your-runners--runners)).

**A todo test never proves a scenario.** `test.todo` names a test that nobody has written yet, so nothing can pass. Jest's JSON report marks it `todo`, and `balance` reads it as no evidence at all, as it reads a skipped test. A scenario whose only test is a todo reads `missing`. This is why `balance` reads Jest's JSON report and not JUnit XML: `jest-junit` writes a todo test exactly as it writes a passing one, so a todo would read as proof.

**What a Jest report posts:**

| The test | What it posts |
|---|---|
| passing, citing one scenario | answers that scenario |
| failing | answers that scenario as failing |
| todo or skipped | nothing, so the scenario it cites reads `missing` |
| two or more codes in its title | **credits none of them**; it lands on the unnamed claim, naming every code |
| a test file that failed to run | never ran its proof: it posts a `never-ran` Evidence Observation, and the run is not reconciled, as `unsound` (exit `3`) |

### Citing a scenario from Go

A Go function name cannot hold brackets. So a Go test cites its scenario through a **subtest**: the claim code goes in square brackets in the name passed to `t.Run`. Run the suite through [gotestsum](https://github.com/gotestyourself/gotestsum), which writes a JUnit XML report, and pass the report with `--junit`:

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

gotestsum writes the subtest into the report under its full name: the test function's name and the subtest's name, joined by `/`, with every space turned into `_`. The claim code keeps its brackets. `balance` reads this:

```xml
<testcase classname="example.com/allocate" name="TestNextNumber/[CLM-&lt;FFF&gt;-&lt;NNN&gt;]_offers_one_past_the_highest_number_already_used" time="0.000000"></testcase>
```

A nested subtest's name also includes the name of every enclosing subtest. `balance` reads the claim code in the subtest's own segment, after the last `/`, first. Only when that segment has none does it read a claim code in an enclosing subtest's segment, nearest first. Name the runner in the `specController` block as `"unit": "gotestsum"` (see [Naming your runners](#naming-your-runners--runners)).

**What a gotestsum report posts:**

| The subtest | What it posts |
|---|---|
| passing, citing one scenario | answers that scenario |
| failing | answers that scenario as failing |
| skipped | nothing, so the scenario it cites reads `missing` |
| two or more codes in its own name | **credits none of them**; it lands on the unnamed claim, naming every code |
| in a package that failed to compile | never ran its proof: the package posts a `never-ran` Evidence Observation, and the run is not reconciled, as `unsound` (exit `3`) |

### Citing a scenario from Java

A Java method name cannot hold brackets. So a JUnit 5 test cites its scenario through its **display name**: the claim code goes in square brackets in `@DisplayName`. Run the suite with Maven, and pass the directory Maven Surefire writes its reports into with `--junit`:

```sh
mvn test
spec-controller balance --junit target/surefire-reports
```

`balance` reads every `.xml` file at the top of that directory, one `TEST-*.xml` for each test class, and ignores the `.txt` summaries beside them. You can give a single report file instead.

**Surefire drops the display name by default.** It writes the method name into the report, so no test cites anything: every test lands on the unnamed claim, and every `@unit` scenario reads `missing`. Surefire's phrased reporter writes the display name instead. Set it on the Surefire plugin in your `pom.xml`:

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

Surefire writes that test into `TEST-example.allocate.NextNumberTest.xml` under its display name. `balance` reads this:

```xml
<testcase name="[CLM-&lt;FFF&gt;-&lt;NNN&gt;] offers one past the highest number already used" classname="example.allocate.NextNumberTest" time="0.004"/>
```

Name the runner in the `specController` block with its test task, in the words your pipeline's test step opens with: `"unit": "mvn clean test"` for the `mvn clean test` recommended below, `"unit": "mvn test"` if the step runs `mvn test`, or `"unit": "./mvnw clean test"` for the Maven wrapper (see [Naming your runners](#naming-your-runners--runners)). If you declare the runner as `"mvn"` alone, `balance` recognises it in every step that runs Maven. It would then take a `mvn checkstyle:check` step for the test suite, instead of reporting that step as a check.

**`balance` reads old reports as well.** Surefire does not clear the directory before a run, so `balance` reads a report an earlier run left in an uncleaned `target/` beside the new ones. Run `mvn clean test` in CI, or start from a fresh checkout. A test that does not compile stops the build before Surefire writes any report. When the directory is missing, `balance` refuses `--junit` as a path that does not exist.

### Citing a scenario from Kotlin

A JUnit 5 test in Kotlin cites its scenario as a Java test does: with the claim code in square brackets in `@DisplayName`. A backticked function name cannot carry the claim code, because the JVM forbids brackets in a name and the build fails with *Name contains illegal characters*. Run the suite with Gradle, and pass the directory its test task writes its reports into with `--junit`:

```sh
./gradlew test
spec-controller balance --junit build/test-results/test
```

Gradle writes the display name into the report with no configuration (measured with Gradle 9.8.1 and JUnit Jupiter 5.11.4). `balance` reads every `.xml` file at the top of that directory, one `TEST-*.xml` for each test class, and ignores the `binary/` directory beside them.

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

Gradle writes that test into `TEST-example.allocate.NextNumberTest.xml` under its display name. `balance` reads this:

```xml
<testcase name="[CLM-&lt;FFF&gt;-&lt;NNN&gt;] offers one past the highest number already used" classname="example.allocate.NextNumberTest" time="0.004"/>
```

Gradle's report differs from Surefire's in two ways:

- **A class's display name cites nothing.** Gradle writes the class's own name as the test's `classname`, so a claim code in a class's `@DisplayName` never reaches a test. Cite the scenario on each test.
- **A class whose setup before all its tests fails posts a failing evidence observation that cites no claim.** Gradle writes the failure as one test named `initializationError`, and the class's own tests do not appear. The evidence observation lands on the unnamed claim, and the scenarios the class's tests cite read `missing`. `balance` does not mark the run unsound.

In a build with several modules, each module writes its own `build/test-results/test/`. Give `--junit` once for each, and `balance` reads every one.

Name the runner in the `specController` block with its test task, in the words your pipeline's test step opens with: `"unit": "./gradlew test"`, or `"unit": "gradle test"` if your pipeline runs Gradle directly (see [Naming your runners](#naming-your-runners--runners)). If you declare the runner as `"./gradlew"` alone, `balance` recognises it in every step that runs the wrapper. It would then take a `./gradlew detekt` step for the test suite, instead of reporting that step as a check.

### Citing a scenario from RSpec

An RSpec example cites its scenario with the claim code in square brackets in its description, the string passed to `it`. RSpec's own JSON formatter keeps each example's description apart from its groups' descriptions, so you need no extra gem and no `spec_helper` change. Pass the report with `--rspec`:

```sh
bundle exec rspec --format progress --format json --out reports/rspec.json
spec-controller balance --rspec reports/rspec.json
```

The first `--format` keeps RSpec's usual console output. The second writes the JSON report to the file `--out` names.

A complete spec file:

```ruby
RSpec.describe "allocating the next number" do
  it "[CLM-<FFF>-<NNN>] offers one past the highest number already used" do
    expect(next_number([1, 3])).to eq(4)
  end
end
```

`rspec --format json` writes that example into the report with its own description, its full description and its result. `balance` reads this:

```json
{
  "description": "[CLM-<FFF>-<NNN>] offers one past the highest number already used",
  "full_description": "allocating the next number [CLM-<FFF>-<NNN>] offers one past the highest number already used",
  "status": "passed",
  "file_path": "./spec/allocate_spec.rb"
}
```

**Put the claim code on the example, not on its group.** `balance` reads the claim code in the example's own description first. Only when that description has none does it read a claim code in an enclosing `describe` or `context` description. One claim code on each example is the form that cannot go wrong.

`balance` reads RSpec's JSON report and not JUnit XML because `rspec_junit_formatter` joins an example's description to its groups' descriptions. In that report, a claim code on an example cannot be told apart from a claim code on its group.

Name the runner in the `specController` block as `"unit": "rspec"` (see [Naming your runners](#naming-your-runners--runners)).

**A pending example proves nothing.** RSpec reports a `pending` example that fails as pending. `balance` reads no evidence from it, as it reads none from `skip` and `xit`.

**What an RSpec report posts:**

| The example | What it posts |
|---|---|
| passing, citing one scenario | answers that scenario |
| failing | answers that scenario as failing |
| skipped or pending (`skip`, `xit`, `pending`) | nothing, so the scenario it cites reads `missing` |
| two or more codes in its own description | **credits none of them**; it lands on the unnamed claim, naming every code |
| in a spec file that failed to load | never ran its proof: the file posts a `never-ran` Evidence Observation, and the run is not reconciled, as `unsound` (exit `3`) |

---

## Fitness functions

A **fitness function** checks a whole-system property, such as complexity, mutation score, type soundness, vocabulary or suite run time.

A fitness function is **converted** when its CI step has its `@fitness` scenario's claim code as its `id:`. `balance` then credits the step's result, read from the step record, to that scenario. A fitness function whose CI step has no claim code as its `id:` is **unconverted**, and its result lands on the unnamed claim. If the step has an `id:`, that result is read from the step record. If it has no `id:`, the result is posted as not recorded, because the step record names steps by their `id:`.

### Turn a fitness function into an evidence obligation

To convert a fitness function, you write two artefacts and no third. There is no fitness profile to configure, no manifest list and no Cucumber step definition to write.

**1. A scenario, tagged `@fitness`, with a claim code.** Write it exactly as you write a scenario tagged only `@unit`: a kind-of-quality-check tag, a title, and its given, when and then in lowercase. Cucumber does not select it, so its steps are description that no step definition answers. Its title and steps are the specification. The command your CI already runs is the evidence.

```gherkin
  @fitness @CLM-<FFF>-<NNN>
  Scenario: every function the push touches measures inside the external complexity standard, and no dead suppression survives
    given the push touched functions
    when CI runs the fitness function over them
    then each will measure inside the external complexity standard, and no dead suppression will survive
```

**2. That scenario's claim code as the `id:` of the CI step that already runs the check.** The check stays exactly where it is in your pipeline. You add only a citation.

```yaml
      - name: Complexity
        id: CLM-<FFF>-<NNN>
        if: always()
        run: eslint
```

- **One `@fitness` scenario is one check.** Its claim code identifies the check, and its title describes it. Nothing else says what the check is about.
- **Nothing names a threshold.** The threshold is in the tool's own configuration or in its step's `env:`, such as a suite's `timeout`, and the step fails below it. A check that runs on a schedule enforces its threshold in its own run and has no step here, as a mutation sweep with Stryker's own `thresholds.break` does (see [Wiring into CI](#wiring-into-ci)).
- **The check's evidence observation is its step's `outcome`.** Whatever the tool measures, its exit code on its own CI step decides whether the check passed.

**Neither artefact is derived from the other, on purpose.** So the two can disagree, and the run reports each disagreement as a fault:

- A `@fitness` scenario whose claim code no recorded CI step states reconciles as **missing**, and the run is out of balance, exactly as for a `@unit` scenario with no test.
- A recorded step that states a claim code no scenario carries posts to a **phantom claim**.
- A step that states no claim code posts to the **unnamed claim**.
- A step no step record names is posted as **not recorded**, citing no code, and so is every step when no step record is given. It posts to the unnamed claim, whatever its `id:`. It is never reported as passed, never credited to a scenario, and never posted to a phantom claim.
- A step a step record names, but that no workflow `balance` read contains, is posted with the result its record gives, at the `id:` that record names it by. A failure posts as failed, a skipped step as never ran, and a success as passed-on-error, because without the workflow `balance` cannot read whether failure was allowed. The posting cites that `id:` when it is a claim code, and no code otherwise.

**`balance` does not read `specController.fitnessChecks`.** The report names it in `## Errors in the inputs` as `configuration-unknown-key`, as it does a misspelling and any other key this tool does not read (see [Configuration the run cannot use is named, never dropped](#configuration-the-run-cannot-use-is-named-never-dropped)).

**One `toJSON(steps)` dump step in each job** lets the reconciler read what each step did. Give `--ci-steps` once for each dump; `balance` reads every one. This is wiring, not part of the evidence obligation. [Wiring into CI](#wiring-into-ci) covers it, with the `if: always()` rule that goes with it.

### A converted check is still a command you can run

Converting a check does not move it inside anything. Many of the converted checks in spec-controller's own pipeline are commands you can paste into a terminal, such as `pnpm typecheck`. Exit 0 means the check passed, and neither Cucumber nor `spec-controller` is involved. The other converted checks read what an earlier step left behind: a report, a count, or the files a test run wrote.

The scenario and the `id:` make the run **observable**: the report can say that the check ran, and against what.

---

## Configuration — the `specController` block

All configuration sits under `specController` in the target's `package.json`. `--package-json` points at that file, and defaults to `package.json` in the working directory.

```jsonc
"specController": {
  "runners": {
    "unit": "vitest",             // the command your CI runs for @unit
    "integration": { "runner": "cucumber-js", "reports": ["cucumber.json"] }, // its runner, and the report it writes
    "e2e": { "runner": "cucumber-js", "reports": ["cucumber.json"] },         // two layers, one runner, which is normal
    "performance": null           // we have no performance runner
  },
  "notChecks": [
    "ci.yml:build:Install dependencies",
    "ci.yml:build:Publish the package"
  ]
}
```

### How discovery works

**You do not name a list of checks.** You name the commands that run your behavioural suites: a closed set of four, one for each layer. **Every other step of the workflows `--ci` names is a fitness function**, whatever it invokes, whether a `run:` step or a `uses:` action.

Discovery does not depend on Node: it does not match `package.json` script names against prefixes. `balance` discovers a pipeline with a bare `run: ruff` and no `package.json` script like any other pipeline.

### Naming your runners — `runners`

- **`runners` is keyed by the four layers and nothing else:** `unit`, `integration`, `e2e`, `performance`.
- **A value is a runner's name, `null`, or the runner with the reports it writes:** `{ "runner": "playwright", "reports": ["playwright.xml"] }`. `null` is a statement, not a blank: it says *we have no runner for this layer*. A key you leave out says nothing about its layer.
- **A report's results are evidence of the layer whose entry names it.** A report is matched by its file name, wherever the run read it from, so a report written outside the target, or one file of a `--junit` folder, is matched as well. A Playwright or Cypress suite's JUnit report named under `e2e` answers `@e2e` claims.
- **One report may serve several layers.** Name it under each. A Cucumber result then takes the layers among them that its scenario's tags name, or every one when its tags name none; a result from any other report takes every one.
- **A report no entry names takes its format's default:** a Cucumber report is integration evidence, whatever its scenarios' tags, and every other report is unit evidence. So name your Cucumber report under each layer it serves.
- **A report name that matches no report the run read** is named in `## Errors in the inputs` as `runner-report-not-read`. The name is left out; the runner is kept, so its step is still a runner.
- **An entry with no runner, no `reports`, or `reports` that is not a list of file names** is read as absent, and named as `configuration-wrong-kind`.
- **A key outside the four** is named in `## Errors in the inputs` as `runner-key-not-a-layer`. It excludes nothing, and it does not stop the run.
- **No `runners` block at all is not an error.** Every step that is not a reconciler step, a non-check or a plumbing step becomes a fitness function. That is the zero-annotation report.
- **`balance` recognises a runner only as the command a step runs**: the command a line of the step opens with, or a command after `&&` or `;` in that line, past any `NAME=value` settings. So a runner is recognised after a line that sets a variable, after a shell function's definition, and after an `if … fi` block. A runner named anywhere else, as an argument or a path, leaves the step a check. So does a step that pipes the runner's output onward, into another command or into a compound command such as a `while` loop, an `if` block or a subshell.
- **A launcher or a wrapper may hand on to a runner.** The launchers are `npx`, `pnpm exec`, `pnpm <bin>`, `yarn <bin>`, `bunx`, `python -m`, `python3 -m`, `uv run`, `poetry run`, `pipenv run`, `coverage run -m` and `bundle exec`. Launchers chain, so `uv run python -m pytest` reaches `pytest`. The wrappers `xvfb-run` and `timeout <duration>` hand on too, past their options and the values those options take (`xvfb-run`'s `-n`, `-s`, `-e`, `-f`, `-p` and `-w` each take one value). So `timeout 75 pnpm test` runs `test`.
- **A `package.json` script may run a runner.** A step runs a script as `npm test`, `npm run <script>`, `pnpm <script>`, `pnpm run <script>`, `pnpm -r <script>`, `pnpm --filter <name> <script>`, `yarn <script>`, `yarn run <script>` or `yarn workspace <name> <script>`, when the target's own `package.json` has a script by that name. `balance` follows the script through any scripts it runs in turn, however deep. A script that runs itself ends as a check.
- **A runner named in several words is recognised where a command opens with all of those words.** This covers `mvn test`, `./mvnw test`, `./gradlew test`, `./gradlew check`, `./gradlew :app:test` and `gotestsum`. A build tool runs more than its tests, so name it with its test task. Then only the step that runs the tests is the runner, and every other task the tool runs is a check. Name a runner without its launcher: `"rspec"` covers `bundle exec rspec`.
- **Any other variant is a check.** A launcher, script runner or wrapper not listed here leaves the step a check that runs the runner. Add such a step to `notChecks`, or run the runner in one of the variants above.

These variants are the only ones `balance` reads, one list per claim, in [`packages/core/src/inputs/shell.variants.json`](../packages/core/src/inputs/shell.variants.json). The plumbing actions, which are neither checks nor runners, are listed beside the workflow reader in [`workflows.variants.json`](../packages/core/src/inputs/workflows.variants.json). [Naming your non-checks](#naming-your-non-checks--notchecks) lists them and says how they are matched.

### Naming your non-checks — `notChecks`

`notChecks` lists the non-checks: the steps that are neither runners nor checks.

- **Each entry is `<workflow file>:<job id>:<step name>`.** A bare step name is not an entry.
- **To take a whole workflow out, narrow `--ci`** instead of listing its steps.
- **The report counts a non-check. It does not drop it.** The report's **Step account** counts it under *Non-checks*, in the row of its workflow and job.
- **The report names an entry that matches no step of a workflow the run read**, in `## Errors in the inputs`, as `not-checks-entry-matches-no-step`. The run does not judge an entry that names a workflow the run did not read.
- **Never list `balance` itself or its `toJSON(steps)` dump.** `balance` always leaves them out of the checks.

**`balance` always leaves GitHub plumbing out of the checks too.** Plumbing is a step whose only work is an action in one of these repositories: `actions/checkout`, `actions/setup-*`, `actions/cache`, `actions/upload-artifact` and `actions/download-artifact`. Each is matched on the action's owner and repository, whatever path or ref follows. So `actions/cache/save` is plumbing, as `actions/cache` is, and `actions/setup-*` matches every repository whose name begins `actions/setup-`. Such a step moves code, tools and files, and judges nothing, so the **Step account** counts it under *Plumbing*, never as a check. The list is closed: every other action stays a fitness function, including `actions/dependency-review-action`, which is a check. A plumbing step you also name in `notChecks` is a non-check, as you named it.

### Deferring a scenario — `deferralTags`

Put a deferral tag on a scenario you have written but deliberately not yet evidenced. Without the tag, each quality check the scenario asks for reads `missing`.

- **A scenario that carries a recognised deferral tag is not an executable claim.** It raises no evidence obligation and has no Claim Reconciliation, so it posts nothing and does not affect the verdict.
- **Evidence that still cites a deferred scenario's claim code lands on a phantom claim**, as `cites-unknown-claim`, because no executable claim carries the code.
- **The tag defers the scenario it is on, every scenario of the Rule it is on, or every scenario of the Feature it is on.**

The built-in set is `@wip`, `@ignore`, `@skip`, `@todo` and `@pending`. Add your own:

```jsonc
"specController": {
  "deferralTags": ["deferred", "@blocked"]
}
```

- **Your list extends the built-in set and never replaces it.** `@wip` defers a scenario whatever you configure.
- **You may write an entry bare or with its `@`.** `balance` ignores whitespace around it.
- **An entry that is not a string** is read as absent, not refused. The report names it in `## Errors in the inputs` as `configuration-wrong-kind`.
- **A tag in neither list never defers the scenario**, however much it looks like a deferral tag.

**A deferral tag applies to the whole scenario. `@<quality-check-kind>pending` does not.** `balance` ignores `@integrationpending`: it raises no integration evidence obligation. So a passing `@unit` beside it still reconciles `satisfied`, and an integration test that cites the scenario reads `not-asked-for`.

**`--strict` reads every claim as if nothing were put off.** It ignores a deferral tag, so the scenario is an executable claim again, and it reads `@<quality-check-kind>pending` as `@<quality-check-kind>`, which raises that evidence obligation. It changes no exit code.

### Configuration the run cannot use is named, never dropped

A run names each configuration entry it cannot use, with one of these codes:

| Code | The entry |
| --- | --- |
| `configuration-wrong-kind` | an entry of a kind its reader does not take (a `notChecks` written as one string, a runner written as a number) is read as absent |
| `configuration-unknown-key` | a key the block does not read at all (a misspelling, or a key an older version read) is passed over |
| `runner-key-not-a-layer` | a `runners` key that is not one of the four layers excludes nothing |
| `runner-report-not-read` | a report name in a `runners` entry that matches no report the run read is left out, and its runner kept |
| `not-checks-entry-matches-no-step` | a `notChecks` entry that matches no step of a workflow the run read makes no step a non-check |
| `not-checks-entry-not-a-step-name` | a `notChecks` entry that does not name a step as `<workflow file>:<job id>:<step name>` makes no step a non-check |

None of these codes refuses the run. Each is a line in `## Errors in the inputs`, right after the run provenance, giving its code, then the entry as written. The rest of the report is the one you would get without that entry. The JSON lists them under `errorsInTheInputs.configurationErrors`.

### Limits

- **The configuration's location depends on Node.** `runners` and `notChecks` sit under `specController` in a `package.json`, so a repository with no `package.json` adds a stub file. What `balance` can discover does not depend on Node.
- **Annotating steps has no such limit.** An `id:` is a key of the step mapping, the command below it can be any command in any language, and nothing in the resolution reads a manifest.
- **Runner recognition has a false positive that you can see.** `balance` reports a suite run through an action, or a runner inside a quoted argument to a wrapper, as a fitness function. It does not silently exclude it. Fix each with one line of `notChecks`.
- **`balance` does not serve a check that legitimately applies to only some platforms.** A matrix build uses `if:` to skip such a step, and in the step record that skip reads `never-ran`, so the run is not reconciled. *"The command examined nothing"* and *"this row was not obliged on this run"* are different claims, and `balance` models only the first.

---

## Wiring into CI

`spec-controller` exists for continuous reconciliation, so `balance` belongs in CI, after your tests have written their reports.

### A whole workflow

This workflow has one job. It is for a project with Vitest tests and one fitness function whose step's `id:` is its claim code. The sections below explain each part. `mkdir -p reports` makes the folder the report is written to, so the step does not depend on the test runner to create it.

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

Put `"runners": { "unit": "vitest" }` and `"notChecks": ["ci.yml:build:Install dependencies"]` in `package.json`. Then the Test step is your unit suite, and the install is not a check. Checkout and setup-node are GitHub's own setup actions. The last two steps are the reconciler's own. The Complexity step is the one fitness function. In your own repository, pin the actions to commit SHAs, and pin spec-controller to an exact version.

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

- **Put `if: always()` on every check step, not just on the dump.** Without it, the first red stops the job and every later check is skipped. The report then shows one `failing` and N `never-ran`, and the run is not reconciled, as `unsound`. The mechanism has worked correctly, but the report is worse.
- **The dump must be `toJSON(steps)`.** It is the only place where a step's `id` and its `outcome` appear together. `outcome` is the field that survives `continue-on-error`; `conclusion` does not.
- **Pass the dump through an environment variable.** Never write `${{ toJSON(steps) }}` into the command itself: a step's output can hold a quote, and the shell would then run whatever follows that quote.
- **A check that runs on a schedule stays on its own schedule, and no push step records it.** A check too slow for every push, such as a mutation sweep, enforces its threshold in its own run: a scope's nightly job concludes `failure` below the threshold. No push step reads that result, so the check has no Claim Reconciliation in a push's report. Its red needs a stop of its own where work starts, not in CI: while the newest full sweep is red, has lapsed or measured nothing, no new work starts except the fix, which merges on its own CI. Without that stop, a red sweep blocks nothing.

### Reconcile once, over the reports and the record

One `balance` run reads the test reports and the CI step records together.

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

**Keep the reports as build artefacts, but do not commit them to the repository.** An Evidence Reconciliation lists a codebase's gaps, phantom claims and passes that cannot fail. That makes it more sensitive than the code itself, so it belongs outside version control.

### GitHub Actions — put the report on the run summary

A reconciliation is a table, not a list of line-level findings, and GitHub has a channel built for tables: the **job summary**. `$GITHUB_STEP_SUMMARY` names a file the runner sets up for each step. GitHub renders anything appended to that file as GitHub-Flavoured Markdown on the workflow run's summary page.

`balance` writes Markdown to any path `--format` is given, so this needs nothing extra from the tool:

```yaml
- name: Reconcile
  run: |
    spec-controller balance --features ./features \
      --vitest ./vitest-report.json \
      --cucumber ./cucumber-report.json \
      --format md:$GITHUB_STEP_SUMMARY \
      --format json:reconciliation.json
```

You can then read the reconciliation on the run page itself, instead of scrolling a monospace job log. The JSON stays a build artefact for anything downstream.

Two limits:

- **Each step's summary is capped at 1 MiB.** Above that size, GitHub drops the summary and raises an error annotation. A reconciliation over a large corpus can come close. If it does, route the Markdown to a file, upload it as an artefact, and put a shorter form on the summary.
- **GitHub displays at most 20 step summaries for each job.**

`$GITHUB_STEP_SUMMARY` is set only inside GitHub Actions. Elsewhere the variable is empty and the shell expands it to nothing, so keep it out of commands you run locally.

---

## Reading the report

The output is the **Evidence Reconciliation**: the whole reconciliation. It comes in two renderings of the same model:

- **Markdown**, for people. It opens with its title, `# Evidence Reconciliation`. Its sections then come in a fixed order: `## Run provenance`; `## Errors in the inputs`, when there are any; `## Run integrity`, when some evidence never ran; `## Summary`, with the run verdict and the totals; and `## Claim Reconciliations`. It also has `## Step account` when the run read a step from its CI workflows. Every table has a key above it that says what each column means. The Markdown leaves out a section the run had nothing for, except `## Claim Reconciliations`, which reads *None.* when there are none.
- **JSON**, for machines: the same model, for comparing two runs, feeding a dashboard, or building automation on top. Its top-level keys are `schemaVersion`, `claimReconciliations`, `runVerdict`, `totals`, `stepAccount`, `provenance`, `errorsInTheInputs` and `runIntegrity`. Every one is present, and a part the run had nothing for is empty. `runVerdict.verdict` is the run verdict (`balanced`, `out-of-balance` or `not-reconciled`). A `not-reconciled` verdict has `runVerdict.why` (`unsound`, `claim-code-errors` or `nothing-to-reconcile`), so automation reads the reason there instead of working it out from the Claim Reconciliations. The JSON gives every count, zero included.

Both include a **provenance** that records what was reconciled: the target, the source SHA, the tool's commit when the tool runs from its own checkout, the tool version, the time the run started, and each input the run read, with its path. So a reconciliation is reproducible and attributable. The Markdown gives a line of its own to each input the run read, including one read by default, and leaves out an input the run did not read. The JSON lists every input, with a `path` only for one the run read.

The package ships a JSON Schema that states the JSON's structure: `dist/spec-reconciliation.schema.json` inside the installed `spec-controller` package (in a local install, `node_modules/spec-controller/dist/`). The schema names every key the JSON may carry and refuses any other. The report names the version of the schema it follows in `schemaVersion`, and a change to the JSON's structure raises it. Validate a report you are handed against the schema of the version that wrote it, which the report's provenance names.

### How a run works

1. It reads your Gherkin scenarios and their `@`-tags into **evidence obligations**: the debit side, what is specified.
2. It reads the evidence reports you passed and the steps of your CI workflows, with the step record when you pass one, into **evidence observations**: the credit side, what actually ran.
3. It reconciles evidence obligations against evidence observations, claim by claim, one kind of quality check at a time.
4. It assembles the **Evidence Reconciliation** and renders it.

### The summary

`## Summary` opens with the **run verdict**:

| Run verdict, in the Markdown | In the JSON | Exit | What it says |
| --- | --- | --- | --- |
| balanced | `balanced` | `0` | every Claim Reconciliation balances |
| out of balance | `out-of-balance` | `1` | at least one Claim Reconciliation is out of balance |
| not reconciled, as unsound | `not-reconciled`, `unsound` | `3` | some evidence never ran, so the run cannot be relied on to show a disagreement |
| not reconciled, for claim code errors | `not-reconciled`, `claim-code-errors` | `3` | a claim code is misfiled (see [Claim code errors](#claim-code-errors)) |
| not reconciled, with nothing to reconcile | `not-reconciled`, `nothing-to-reconcile` | `3` | there is no Claim Reconciliation at all, so the run has no basis for a verdict |

The totals follow, in groups:

- **`### Claim Reconciliations`**: the total, balanced and out of balance. When some claim codes are written where no claim reads them, in a title, a step or a comment, a line under the table counts them.
- **`### Quality Check Reconciliations, by kind`**: a row for each kind of quality check, with its Evidence Obligations, its Evidence Observations, and a column for each outcome. A row with no kind counts what a scenario that asks for no kind of quality check gives. The *All* row sums every row. The columns of a row do not add up: one evidence obligation answered by two passing tests counts as 1 Evidence Obligation, 2 Evidence Observations and 2 *Satisfied*.
- **`### Evidence Observations, by where they were filed`**: how many evidence observations landed on an executable claim, on a phantom claim and on the unnamed claim, and their total.
- **`### Out of balance by feature`**, when any claim is out of balance: each feature file with an out-of-balance claim, and how many it has. A phantom claim and the unnamed claim are counted in the totals, on no feature's row.

The Markdown leaves out a kind that no claim asks for and no evidence answers, an outcome no row has, the row with no kind when it is empty, and a place nothing was filed on. The JSON's `totals` gives every kind, the row with no kind under `noKind`, the *All* row under `all`, and every outcome under each, at `0` where there is none.

**`## Step account`** is in the Markdown when the run read a step from its CI workflows. It has a row for each workflow and job the run read. The row counts the steps read, then the runners, reconciler steps, non-checks, plumbing steps and fitness functions. Each step read is counted once, so a row's last five counts add up to its steps read. A *Total* row sums the jobs when there is more than one job.

### The Claim Reconciliations

`## Claim Reconciliations` is one table, with a row for each **Claim Reconciliation**. The executable claims come first, in the order they were read, then the phantom claims, then the unnamed claim. Each row has:

- **The claim**, named by its claim code. When another claim shares the code, the claim is named by its code and feature file. When it has no claim code, it is named by its feature file and title. A phantom claim is named by the claim code its evidence cites, and the unnamed claim reads *(unnamed claim)*.
- **A column for each kind of quality check** that some claim asks for or some evidence answers. A cell first gives the kind's letter when the claim asks for that kind, and `-` when it does not. Then it gives how many of its checks of that kind ran, or `-` for none. `U/2` is a unit test asked for and two that ran. `-/1` is one unit test that ran for a claim that asked for none. A cell is blank when the claim asks for no check of that kind and none ran for it. A phantom claim's and the unnamed claim's cells read `—`.
- **The verdict**: **balanced** or **out-of-balance**.
- **The reconciling items**: each **Quality Check Reconciliation** whose **outcome** is not `satisfied`. Each shows its kind of quality check and outcome, then where to look and what it said, or `—` for none. Where to look is the file or CI step the evidence came from, and the test's name where it has one. What it said is the first line of its message, and every note `balance` added.

On the unnamed claim's row, each reconciling item is a group of its evidence, by kind of quality check, file and shared claim code. The group shows how many ran, passed and failed, how many were not recorded where any were, and the name of each that failed, so you can tell which file to fix.

The report quotes text the inputs gave, such as a title or a path, as written, in a code span, so an odd character breaks no table.

### Report rows to know

Both reports name each outcome by its handle.

| Outcome | What it says | Note |
|---|---|---|
| `satisfied` | the evidence asked for arrived, and passed | |
| `missing` | no evidence that ran answers the obligation | |
| `failing` | the evidence asked for arrived, and failed | a swallowed red also reads `failing`, given `--ci-steps` |
| `cannot-fail` | the evidence passed, but its CI step or its job sets `continue-on-error`, or `balance` cannot read whether it does, so its red might not fail the build | see below |
| `not-asked-for` | the evidence is of a kind of quality check its claim did not ask for | see [When a row reads `not-asked-for`](#when-a-row-reads-not-asked-for) |
| `never-ran` | the evidence never reached its assertions | the run is not reconciled, as `unsound`, and the evidence is listed under `## Run integrity` too |
| `no-claim-code` | the claim has no claim code for evidence to cite | |
| `duplicate-claim-code` | the claim's claim code is carried by another claim | see below |
| `no-quality-check` | the claim asks for no quality check, and nothing cites it | |
| `cites-unknown-claim` | the evidence cites a code no executable claim carries: a **phantom claim** | |
| `cites-no-claim` | the evidence cites no single claim: the **unnamed claim** | this includes evidence citing no code, several codes, or a code several scenarios share, and each step the step record does not name, posted as not recorded |

Evidence that never ran lands on the unnamed claim when it names no claim, or names a claim code several scenarios share. Evidence that never ran and names one scenario's claim code lands on that scenario's Claim Reconciliation, where it reads `never-ran`. The evidence obligation it would have answered reads `missing`, unless other evidence of its kind ran.

A step the step record does not name lands on the unnamed claim as not recorded, whatever its `id:`. The evidence obligation it would have answered reads `missing`, unless other evidence of its kind credits it. Evidence that was not recorded is no failure, and does not make the run `unsound`.

### Passes that cannot fail

The outcome to watch for is **cannot-fail**. It marks a fitness function that passes, but whose red might not fail the CI run: its CI step or job sets `continue-on-error` to anything but `false`, or no workflow `balance` read has its step. A green CI run then does not mean that the check passed. The row is read from the run's step record (`--ci-steps`), and the step's own outcome decides it: a swallowed red reads `failing`, and a green under `continue-on-error` still reads `cannot-fail`.

### What counts as a claim code

A claim code has the form `CLM-<FFF>-<NNN>`: the prefix `CLM`, a feature code of two to five uppercase letters or digits, then a number of any width. `balance` reads every code with this one grammar, wherever it finds one: a scenario tag, a `[CLM-…]` citation in a test's title, a Cucumber scenario's tag, a CI step's `id:`, or a mention in prose.

So a code such as `@CLM-TOOLONGCODE-001` is not a claim code. It opens no Claim Reconciliation and cites nothing. A scenario tagged only with it has no claim code, and reconciles as `no-claim-code`.

The tool judges claim code errors only over the corpus it reads.

**An Outline can make each of its rows a claim of its own.** Give its Examples table a column named `clm`, and put each row's claim code in it. Each row is then a claim under its own claim code. It raises the evidence obligations its Outline's tags name, and evidence cites the row's claim code as it would cite a scenario's. Such an Outline has no claim code of its own. A row whose `clm` cell is empty, or is not a claim code, has no claim code. Two rows with one claim code are duplicates, as two scenarios would be. An Outline with no `clm` column is one claim, under the claim code its tags carry.

When Cucumber runs an Outline with a `clm` column, Cucumber's own result for each row credits that row, so a passing row and a failing row reconcile apart. `balance` finds the row from the line and the feature file the Cucumber report names, whichever folder Cucumber ran from.

### Duplicate claim codes

**A claim code identifies one claim. Two scenarios with one claim code are two claims that cannot reconcile.** A shared claim code arises when the same code is written twice:

- Each scenario has a Claim Reconciliation of its own. Each Quality Check Reconciliation for a quality check the scenario asks for reads `duplicate-claim-code`. A scenario that asks for no quality check reads `no-quality-check`. The Markdown names each row by the claim code and its feature file. The JSON gives each claim its file and title.
- `balance` cannot attribute evidence that cites the code to either scenario, so both claims are out of balance whatever the evidence says. An evidence observation that cites the code credits neither claim and posts to the unnamed claim.
- The rest of the report is unaffected. Every other Claim Reconciliation reconciles exactly as it would without the duplicate.
- The run exits `1`, the out-of-balance run verdict, and prints the report.

### Claim code errors

**A feature file's feature code is the class its scenarios' claim codes are filed under. A misfiled claim code is a claim code error.** Every `balance` run judges the corpus it read. When the corpus has an error, the run lists it in `## Errors in the inputs`, right after the run provenance (`errorsInTheInputs.claimCodeErrors` in the JSON). Each line gives the error's code, then the files, feature codes, scenario and claim codes it is about. There are five errors:

| Handle | The fault | The fix |
| --- | --- | --- |
| `foreign-claim-code` | a scenario's code names a feature its file does not carry, e.g. `@CLM-<FFF>-<NNN>` in a file headed with a code other than `@<FFF>` | re-code the scenario for its file, or move it to the file whose header carries the code its id names, when exactly one does; the line names the files with that feature code, or none |
| `no-feature-code` | a feature file declares no feature code while its scenarios carry claim codes (a code longer than five characters is no feature code) | give the file a feature code, and code its scenarios for it |
| `duplicate-feature-code` | two feature files declare one feature code | give one of them a code of its own |
| `several-claim-codes` | one scenario carries more than one distinct claim code, so it has no Claim Reconciliation under any of them, and a test citing one of them cites a code no scenario carries | give the scenario one code |
| `claim-code-beside-clm-column` | an Outline carries a claim code, on its own tag line or an Examples block's, and has a `clm` column, so it has no Claim Reconciliation under its code or any row's | take the code off the Outline, or drop its `clm` column |

- The first three errors misfile a claim code without making any posting ambiguous. So every Claim Reconciliation still reconciles exactly as it would if the code were filed correctly.
- **Any claim code error leaves the run not reconciled.** Its run verdict is *not reconciled, for claim code errors*, and it exits `3`, even under `--exit-zero`.
- A run that carries both a claim code error and an out-of-balance Claim Reconciliation is also not reconciled, because of the claim code errors. A run where some evidence never ran is `unsound` first.
- The report shows a duplicated claim code on the Claim Reconciliations of the claims that carry it, never in this section.
- When neither the corpus nor the configuration has an error, the report leaves out `## Errors in the inputs`.

### Exit codes

| Exit | Meaning |
|---|---|
| `0` | balanced; or out of balance under `--exit-zero` |
| `1` | out of balance |
| `2` | usage error |
| `3` | not reconciled: `unsound`, `claim-code-errors` or `nothing-to-reconcile` |
| `4` | unexpected error: the run stops before a verdict, and one line on stderr names the error |

When several reasons apply, this order decides: unsound, then claim code errors, then nothing to reconcile, all before out of balance. `--exit-zero` changes only `1`, to `0`.

An unexpected error (`4`) is not in that order. A run exits `4` only when it meets the error before it has an exit code. An error after the run has its exit code does not change that code: one line goes to stderr, `[unexpected-error] spec-controller hit an unexpected error: <name>: <message>`, the run keeps its code, and the report stands as written. A run writes at most one such line.

### Error codes

**A refusal of a flag, a command, an argument, an input or an output carries its error code in square brackets**, at the start of its line on stderr, as in `[unknown-flag] balance does not take the flag --nope`. The code names what went wrong, and it stays the same when the words change. So quote it, and look it up here.

Every error below refuses the command as given. That is a usage error, and the run exits `2`. After a refusal of the command line, the tool prints the help for what was asked for, which lists what was allowed.

An error in the inputs is not a refusal. Its line in the report's `## Errors in the inputs` gives its code. Those codes are listed under [Configuration the run cannot use is named, never dropped](#configuration-the-run-cannot-use-is-named-never-dropped) and [Claim code errors](#claim-code-errors).

**The command line:**

| Code | Meaning |
|---|---|
| `unknown-command` | the tool has no command of the name given |
| `unknown-flag` | the command does not take the flag given |
| `missing-value` | a flag that takes a value was given none |
| `unwanted-value` | a flag that takes no value was given one |
| `stray-argument` | an argument is neither a flag nor the value of the flag before it |
| `repeated-flag` | a flag that is read once was given more than once |
| `equals-form` | a flag and its value were joined by `=`; give them as two arguments |
| `flag-before-command` | a command's own flag was given before the command; it goes after it |
| `unknown-format` | `--format` was given a format the tool does not write |
| `no-feature-code` | `allocate` was given no feature code |
| `extra-argument` | `allocate` was given an argument past its one feature code |

**`balance`'s inputs.** Each line names the input, its path and what is wrong:

| Code | Meaning |
|---|---|
| `input-absent` | a named input does not exist |
| `input-not-permitted` | the tool may not read an input, named or read by default |
| `input-wrong-kind-of-path` | a named path is a file where its flag reads a folder, or the reverse |
| `input-does-not-parse` | an input does not parse: a JSON or JUnit XML report, a feature file or a workflow; each feature file that does not parse has a line of its own |
| `input-not-in-its-shape` | a report, the step record or the manifest parses, but is not in its shape, a `specController` block that is not an object included; the line says where it first breaks |

**`balance`'s reports:**

| Code | Meaning |
|---|---|
| `more-than-one-to-stdout` | more than one report would go to stdout; at most one may |
| `outputs-share-file` | two reports would go in one file |
| `output-overwrites-input` | a report would overwrite a file the run reads |
| `report-not-written` | a report could not be written to the path its `--format` names |

**`allocate`:**

| Code | Meaning |
|---|---|
| `not-a-feature-code` | `allocate` was given a feature code not in its form: two to five characters, each `A`–`Z` or `0`–`9` |
| `unknown-feature-code` | `allocate` was given a feature code no feature file's header carries, without `--new`; the line lists the feature codes the feature files carry |
| `feature-file-does-not-parse` | a feature file `allocate` reads does not parse |
| `unreadable-in-tree` | `allocate` could not read a file or folder in the tree |
| `unreadable-history` | `allocate` could not read the repository's history |
| `damaged-repository` | `allocate` could not read the repository |

An unexpected error is not a refusal, but its line carries the code `unexpected-error` all the same: `[unexpected-error] spec-controller hit an unexpected error: <name>: <message>`.

---

## Command reference — `balance`

```sh
spec-controller balance --features ./features \
  --vitest ./vitest-report.json \
  --cucumber ./cucumber-report.json
```

Run `spec-controller --help`, or `-h`, for the top-level summary of the commands. Run `spec-controller balance --help` for the full list of `balance`'s flags. After a command, `--help` or `-h` gives that command's own help.

Help answers only when nothing else on the command line is refused. A usage error wins, even beside `--help`: the tool prints the complaint, then the help for what was asked for, and exits `2`.

### Flags

| Flag | Purpose |
|---|---|
| `--features <dir>` | A directory of Gherkin `.feature` files: the scenarios. The tool reads every `.feature` file under it, at any depth, and names each one in the report by its path within the directory. |
| `--vitest <report.json>` | A Vitest JSON report: runtime test evidence. Repeatable: `balance` reads every report you name. |
| `--pytest <report.xml>` | A pytest JUnit XML report (`pytest --junitxml`): runtime unit test evidence. Use it with `--vitest`, instead of it, or not at all. See [Citing a scenario from pytest](#citing-a-scenario-from-pytest). Repeatable: `balance` reads every report you name. |
| `--jest <report.json>` | A Jest JSON report (`jest --json --outputFile=<path>`): runtime unit test evidence. Use it with `--vitest`, instead of it, or not at all. See [Citing a scenario from Jest](#citing-a-scenario-from-jest). Repeatable: `balance` reads every report you name. |
| `--junit <report.xml\|dir>` | A JUnit XML report, or a directory of them, from any runner that writes one: runtime unit test evidence. For example, for Go, `gotestsum --junitfile <path>` writes one; Maven Surefire writes the `target/surefire-reports` directory for a Java suite; Gradle writes `build/test-results/test` for a Kotlin one. A test cites its scenario with the code in square brackets in its name. Use it with `--vitest`, instead of it, or not at all. See [Citing a scenario from Go](#citing-a-scenario-from-go), [Citing a scenario from Java](#citing-a-scenario-from-java) and [Citing a scenario from Kotlin](#citing-a-scenario-from-kotlin). Repeatable: `balance` reads every report you name. |
| `--rspec <report.json>` | An RSpec JSON report (`rspec --format json --out <path>`): runtime unit test evidence. An example cites its scenario with the code in square brackets in its description. Use it with `--vitest`, instead of it, or not at all. See [Citing a scenario from RSpec](#citing-a-scenario-from-rspec). Repeatable: `balance` reads every report you name. |
| `--cucumber <report.json>` | A Cucumber JSON report: runtime test evidence. Repeatable: `balance` reads every report you name. |
| `--ci <workflow.yml\|dir>` | Your CI workflows: a file, or a directory of them (default `.github/workflows`). **This is the scope of discovery.** The tool reads every step of every job it resolves; narrow it to leave a whole workflow out. It is also where a check step's `id:` supplies the claim code its result cites. |
| `--package-json <path>` | The target's `package.json`: its `scripts`, and its `specController.runners`, `specController.notChecks` and `specController.deferralTags` (see [Configuration](#configuration--the-speccontroller-block)). A fitness function is named by its `@fitness` scenario and by the CI step whose `id:` is that scenario's claim code; no manifest key names one. Defaults to `package.json` in the working directory. |
| `--ci-steps <record.json>` | A CI job's record of what each of its steps did: the `toJSON(steps)` dump, which is the evidence for fitness functions. See [Wiring into CI](#wiring-into-ci). Omit it if you have converted none. Repeatable: `balance` reads every record you name. |
| `--target <name>` | A name recorded verbatim in the report's provenance: the project this run reconciled. |
| `--source-sha <sha>` | Override the git commit SHA recorded in provenance (defaults to the resolved HEAD). |
| `--format <fmt>[:<path>]` | Where to send output (`md` or `json`, optionally `:<path>` to write to a file). Repeatable. See [`--format`](#--format--routing-the-output). |
| `--strict` | Read every claim as if nothing were put off: a deferral tag is ignored, and `@<quality-check-kind>pending` is read as `@<quality-check-kind>`. See [Deferring a scenario](#deferring-a-scenario--deferraltags). |
| `--exit-zero` | Print the same report, but exit `0` on an out-of-balance (`1`) verdict. Usage (`2`), not reconciled (`3`) and an unexpected error before the verdict (`4`) still fail. Use it as the on-ramp before gating. |
| `--help`, `-h` | Show `balance`'s help and exit. |

### `--format` — routing the output

`--format` takes a format (`md` or `json`), optionally followed by `:<path>`:

- `--format md` sends Markdown to stdout. This is the default when you give no `--format`.
- `--format json:out.json` sends JSON to a file.
- Repeat the flag to write several outputs at once: `--format md:report.md --format json:report.json`.

`balance` checks all the rules below before it writes anything. A run that breaks one is refused at exit `2`: it prints no report and writes no file.

**At most one output may go to stdout.** A path that names stdout itself (`/dev/stdout`, or a link to it) counts as stdout. So `balance` refuses `--format md --format json:/dev/stdout`, as it refuses `--format md --format json`.

**No two outputs may share one file.** That covers the same path given twice, a symbolic link to the other output's file, and the file stdout is redirected into. `balance` recognises a file by the operating system's identity for it, so on a case-insensitive volume, `report.md` and `REPORT.MD` are one file. The refusal names both outputs. A destination that is not a regular file, such as `/dev/stderr` or `/dev/null`, may be given more than once, because writing it twice loses nothing.

**No output may land on a file the run reads.** The run reads these files:

- the `--vitest`, `--cucumber`, `--pytest`, `--jest`, `--junit`, `--rspec`, `--ci-steps` or `--package-json` file, and each report in a `--junit` folder;
- the `package.json` read by default;
- any feature file of the `--features` corpus, or of the `features/` read by default;
- the `--ci` workflow, any workflow of the `--ci` folder, or of the `.github/workflows` read by default.

`balance` recognises the file by its identity, as above, so stderr redirected into an input counts when a report goes to stderr. The refusal names the output and the input. A file the run does not read, beside an input or inside one of its folders, is written as asked.

**A path is written as given.** The directory it names must already exist, because `--format` creates no directory. A path that is a symbolic link to a file that does not exist yet is written through the link, which creates the file it points to. `balance` refuses a path that cannot be written, and names the path and why: an empty path, a file the tool may not write, an existing directory, a path in a directory that does not exist, or a link that leads back to itself.

---

## Allocating the next claim code — `spec-controller allocate`

Ask the tool for the next claim code instead of inventing one:

```bash
spec-controller allocate <FFF>
# CLM-<FFF>-<NNN>
```

For a feature code that no feature file carries yet, add `--new`:

```bash
spec-controller allocate <FFF> --new
# CLM-<FFF>-001
```

The tool writes the code under `CLM`. Its number is one past the highest number a code in the repository has **ever** carried for that feature code, whether written under `CLM` or under the retired `SCN`. So the tool never hands out a number again once a claim code has used it, a retired number included, and every old reference to a code, in history, a chat or a stale document, keeps the meaning it had. The number has at least three digits, zero-padded, and grows past three digits (`999` is followed by `1000`).

- **The argument** is the feature code, `<FFF>`: two to five characters, each `A`–`Z` or `0`–`9`. A feature code is known when a feature file in `features/` at the top of the repository is headed with it. That folder is the corpus `balance` reads by default. A feature code that only history or a test fixture carries is not known.
- **`--new`** starts a feature code that no feature file's header carries yet, such as a first code in a tree with no feature files. Its first code is `001`, or one past any number the repository already carries for the feature code. If you give `--new` for a feature code a header already carries, the tool answers as usual and says so on stderr.
- **stdout** gives the code and nothing else, so a script or an agent can use it.
- **stderr** says what the answer rests on:
  - `the highest code seen: <claim code>, <file>:<line>`, the code as written, with `@<commit>` after the line when it was read from history; nothing, for a first code;
  - with `--new` for a feature code a header already carries, `a feature file already has the feature code: <FFF>` instead;
  - when history is short, `no history was read: this is not a git repository` or `history was not read before the clone's first commit: <commit>`.
- **Exit codes:**
  - `0` when it answers.
  - `2` for a usage error (no feature code given, a feature code that is not two to five uppercase letters or digits, a second feature code, a flag it does not take, or a file, folder or history it cannot read) or an unknown feature code. The error code says which it was (see [Error codes](#error-codes)), and the tool gives no claim code. An unknown feature code's refusal lists the feature codes the feature files carry.
  - It never refuses because history is short.
  - `--help` or `-h` among its arguments gives its help at `0`, unless another argument is refused. Then it gives the refusal and its help, at `2`.

**What it reads.**

- Every text file in the repository, wherever you run it from: tracked files, and untracked files the repository does not ignore, because you allocate a code just after you write a scenario.
- The lines every commit on any branch or tag added. It reads a merge against its first parent, so a code written in a conflict's resolution counts. It never reads commit messages: a code that only ever appeared in a message was never a scenario, and a message cannot be unwritten.

**Limits.**

- **Prose counts.** A code cited in a document or a comment retires its number. You can see this happen, because stderr names where the highest code was seen.
- **The tool reads only reachable history.** It does not see a code that only ever lived outside that history, on a branch you never fetched or before a shallow clone's edge. stderr says so where it can.

---

## Troubleshooting

**No scenarios found, or an empty report.** Check that `--features` points at the directory that holds your `.feature` files, and that the scenarios carry `@CLM-…` claim codes and evidence-obligation tags.

**A `@unit` scenario reads `missing` while its test passes.** First check the square brackets around the claim code in the test title. See [Only these four forms are read](#only-these-four-forms-are-read).

**A fitness function shows `missing` or `cannot-fail` when you didn't expect it.** Both are real findings, not tool errors.

- `missing` means that no CI step the step record names carries that scenario's claim code as its `id:`. A step the step record does not name is posted as not recorded, to the unnamed claim, and credits nothing. `package.json` scripts play no part in it.
- `cannot-fail` means that the step passed, and either the step that cites it, or its job, sets `continue-on-error` to anything but `false`, or no workflow `balance` read has that step.

**My first run fails with many checks that cite nothing.** This is expected, not a misconfiguration. Every step of the workflows `--ci` names is a fitness function until something says otherwise. A fitness function that cites no claim posts to the unnamed claim, so `balance` exits `1`.

1. Read the report's **Step account**. It names each workflow and job, how many steps were read, and what became of each one. GitHub's own checkout, setup, cache and artifact actions are already counted out as plumbing.
2. Name your runners, name your non-checks, or narrow `--ci`. See [Configuration](#configuration--the-speccontroller-block).
3. To keep the report while you work through it, without failing the build, add `--exit-zero`. Delete it when you are ready to gate.

**A step I know is my test suite is reported as a check.** Runner recognition did not reach it. `balance` recognises the runner only as the command a step runs, directly or behind one of the listed launchers, in the step's command or in the `package.json` script the step invokes. It does not reach a suite:

- run through a `uses:` action;
- started by a launcher not on the list (`tox`, `nox`);
- run as a project script (`hatch run test`);
- with an option between a launcher and the runner (`uv run --frozen pytest`);
- behind a wrapper not on the list (`nice`, or `timeout` with no duration);
- whose output is piped into another command (`pnpm test | tee test.log`).

Add the step to `specController.notChecks`. The failure direction is deliberate: a step wrongly reported is one line to fix, but a step wrongly excluded would be invisible.

**The run verdict reads *not reconciled, for claim code errors*.** One of these is true: the corpus files a claim code under the wrong feature file, or in a file that declares no feature code; two files declare one feature code; a scenario carries more than one claim code; or an Outline carries a claim code beside a `clm` column. `## Errors in the inputs` names each error by its handle and the files it is about. A misfiled code leaves every Claim Reconciliation reconciling, so the rest of the report is unchanged. A scenario that carries several claim codes, or an Outline that carries a claim code beside a `clm` column, has no Claim Reconciliation under any of them. The run exits `3` until the codes are filed correctly. See [Claim code errors](#claim-code-errors).

**A row reads `duplicate-claim-code`.** Two scenarios carry that claim code. Each has a Claim Reconciliation of its own, and its row is named by the code and its feature file. Give one of them a code of its own. While two scenarios share the code, the run exits `1`.

---

## What spec-controller assumes, and what it does not do

**It reconciles automated tests and fitness functions in CI.** It covers unit, integration, e2e and performance tests, and fitness functions. It is not a task tracker, and it is not a document specification.

**Your tracker keeps the work.** A ticket is a change. A scenario is behaviour the system has now. The two meet only where one piece of work creates, reads, updates or deletes one scenario.

**spec-controller assumes that each test is valid.** It reconciles a result to the test that claimed it. You make sure the test reflects the behaviour the business wants, as you do under CI, TDD and BDD. The tool does not try to establish that a test is a good test.

**A title can stop matching its check. spec-controller states this gap and does not solve it.** Where the runner is not Cucumber (usually for `@unit`, `@performance` and `@fitness`), a scenario's given, when and then are lowercase description that no runner executes, so no unexecuted step reads as a test. But its title is still prose that nothing reads against the check that answers it. The title and the check can come to say different things, and nothing goes red. The report proves that a scenario is linked to evidence and that the evidence passed. **It does not prove that the evidence tests what the title says.**

**It keeps a reconciled codebase reconciled.** Getting a codebase with no scenarios to that point is not part of this package.
