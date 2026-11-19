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
- [Configuration — runners, non-checks and deferral tags](#configuration--runners-non-checks-and-deferral-tags)
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

**Your evidence, as reports.** Before you run `balance`, generate whichever of these reports apply to your project. Step 1 of [Every report, and the whole command](#every-report-and-the-whole-command) gives the command that writes each one. You name each runner under the flag of the layer it serves: `--unit`, `--integration`, `--e2e` or `--performance`. Named alone, as `--unit vitest`, a runner has its report found from the CI step that runs it. A report `balance` cannot find that way, you name in the runner's long form, `<runner>:<format>:<report>` (see [Naming your runners](#naming-your-runners)).

| Input | What it is | Flag |
|---|---|---|
| Gherkin `.feature` files | your scenarios and their evidence-obligation tags | `--features` |
| A Vitest JSON report | runtime test evidence | `--<layer> vitest`, or `--<layer> <runner>:vitest:<report>` |
| A Cucumber JSON report | runtime test evidence | `--<layer> cucumber-js`, or `--<layer> <runner>:cucumber:<report>` |
| A pytest JUnit XML report, written by `pytest --junitxml` | runtime test evidence | `--<layer> pytest`, or `--<layer> <runner>:pytest:<report>` |
| A Jest JSON report, written by `jest --json --outputFile=<path>` | runtime test evidence | `--<layer> jest`, or `--<layer> <runner>:jest:<report>` |
| A JUnit XML report, or a folder of them, from any other runner, such as Go's, written by `gotestsum --junitfile <path>` | runtime test evidence | `--<layer> gotestsum` or `--<layer> playwright`, or `--<layer> <runner>:junit:<report>` |
| An RSpec JSON report, written by `rspec --format json --out <path>` | runtime test evidence | `--<layer> rspec`, or `--<layer> <runner>:rspec:<report>` |
| Each CI job's step record: the `toJSON(steps)` dump that job writes | evidence for every fitness function whose step's `id:` is its claim code (see [Wiring into CI](#wiring-into-ci)) | `--ci-steps` |
| Your CI config (`ci.yml`) | the scope discovery ranges over | `--ci` |
| `package.json` | its `scripts`, which runner recognition follows; nothing else in it is read | `--package-json` |

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
  --unit vitest:vitest:reports/vitest.json \
  --integration cucumber-js:cucumber:reports/cucumber.json \
  --unit pytest:pytest:reports/pytest.xml \
  --unit jest:jest:reports/jest.json \
  --unit gotestsum:junit:reports/go.xml \
  --unit rspec:rspec:reports/rspec.json \
  --ci .github/workflows/ci.yml \
  --package-json package.json
```

- **Leave out any input you don't have.**
- **Each runner flag names a layer's runner.** `balance` reads the step that runs the runner as that layer's suite, and each result in the runner's report as evidence of that layer. Here each runner is in its long form, `<runner>:<format>:<report>`, which names the report wherever it was written. When the step of `ci.yml` that runs a runner writes its report with the options of step 1, name the runner alone, as `--unit vitest`: `balance` finds the report from that step. See [Naming your runners](#naming-your-runners).
- **`--target` names the project in the report.** Without `--target`, when the project is a git checkout with an `origin` remote, the report names the target by that origin, as in `owner/repo`. Otherwise the report reads `unknown-target`. When the name comes from the origin:
  - It leaves out any user, password, token, query or fragment in the remote.
  - An `https` or `ssh` URL is named `owner/repo`, and so is an scp remote such as `git@github.com:owner/repo.git`.
  - A local path is named by the repository's folder, as in `web` for `/srv/git/web.git`, and so is a `file:` URL with no user.
  - Any other form names no origin. A `git://` URL and a bare name such as `foo` are among them.

For the smallest form of the command, and for every flag, see [Command reference](#command-reference--balance).

### Expect your first run to fail — use `--exit-zero`

Your first run against an unannotated pipeline fails, and the report is right to fail it: the corpus raises no evidence obligations yet. [A first run, report only](./quickstart.md#a-first-run-report-only) explains why, and shows how `--exit-zero` lets you watch before you gate.

### Name your first non-checks

`balance` lists every CI step as a check, except a step that runs a runner you name (see [Naming your runners](#naming-your-runners)) and GitHub's own checkout, setup, cache and artifact actions. Some steps do work but check nothing, such as a step that publishes a package or bumps a version. Name each of these steps once with `--not-check`, by the step's own name:

```sh
npx spec-controller balance \
  --not-check "ci.yml:ci:Publish to npm" \
  --not-check "release.yml:release:Bump version"
```

The full rules are in [Naming your non-checks](#naming-your-non-checks).

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
| `@integration`, `@e2e`, `@performance` | a Cucumber run of the scenario, or a test in any report a runner of that layer names | for Cucumber, nothing to add: the report carries the scenario's own claim code, and a row of an Outline with a `clm` column is credited by Cucumber's result for that row. For any other runner, the test cites the code as that runner's format does (above). Name each layer's runner, a Cucumber runner too, under that layer's flag (see [Naming your runners](#naming-your-runners)) |
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

A pytest test's name is a Python function name, and a function name cannot hold `[CLM-…]`. So a pytest test cites its scenario with a marker, and a hook you add once copies the marker into the report. When the CI step that runs pytest writes the report, name the runner alone:

```yaml
- name: Unit tests
  run: python -m pytest --junitxml=reports/pytest.xml
```

```sh
spec-controller balance --unit pytest
```

`balance` reads the report the step's `--junitxml` or `--junit-xml` names. A report the step does not name, name in the runner's long form: `--unit pytest:pytest:reports/pytest.xml`.

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

A Jest test cites its scenario exactly as a Vitest test does: with the claim code in square brackets in its title. Jest's own JSON report records each test's title, so you need no reporter package and no setup file. When the CI step that runs Jest writes the report, name the runner alone:

```yaml
- name: Unit tests
  run: npx jest --json --outputFile=reports/jest.json
```

```sh
spec-controller balance --unit jest
```

`balance` reads the report the step's `--json --outputFile=<path>` names. A report the step does not name, name in the runner's long form: `--unit jest:jest:reports/jest.json`.

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

`balance` reads the claim code in the test's own title first. It reads a claim code in an enclosing `describe` title only when the test's own title has none. The runner's name is `jest`, so a step that runs `jest` is your unit suite (see [Naming your runners](#naming-your-runners)).

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

A Go function name cannot hold brackets. So a Go test cites its scenario through a **subtest**: the claim code goes in square brackets in the name passed to `t.Run`. Run the suite through [gotestsum](https://github.com/gotestyourself/gotestsum), which writes a JUnit XML report. When the CI step that runs gotestsum writes the report, name the runner alone:

```yaml
- name: Install gotestsum
  run: go install gotest.tools/gotestsum@v1.13.0
- name: Unit tests
  run: gotestsum --junitfile reports/go.xml ./...
```

```sh
spec-controller balance --unit gotestsum
```

`balance` reads the report the step's `--junitfile` names, or the step's `env` names as `GOTESTSUM_JUNITFILE`. A report the step does not name, name in the runner's long form, in the `junit` format: `--unit gotestsum:junit:reports/go.xml`.

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

A nested subtest's name also includes the name of every enclosing subtest. `balance` reads the claim code in the subtest's own segment, after the last `/`, first. Only when that segment has none does it read a claim code in an enclosing subtest's segment, nearest first. The runner's name is `gotestsum`, so a step that runs `gotestsum` is your unit suite (see [Naming your runners](#naming-your-runners)).

**What a gotestsum report posts:**

| The subtest | What it posts |
|---|---|
| passing, citing one scenario | answers that scenario |
| failing | answers that scenario as failing |
| skipped | nothing, so the scenario it cites reads `missing` |
| two or more codes in its own name | **credits none of them**; it lands on the unnamed claim, naming every code |
| in a package that failed to compile | never ran its proof: the package posts a `never-ran` Evidence Observation, and the run is not reconciled, as `unsound` (exit `3`) |

### Citing a scenario from Java

A Java method name cannot hold brackets. So a JUnit 5 test cites its scenario through its **display name**: the claim code goes in square brackets in `@DisplayName`. Run the suite with Maven, and name the runner alone, as `mvn test`. `balance` reads the reports from where Maven Surefire writes them by default, `target/surefire-reports`, joined with the working directory of the CI step that runs `mvn test`, as a folder of JUnit XML reports:

```sh
mvn test
spec-controller balance --unit "mvn test"
```

`balance` reads every `.xml` file at the top of that directory, one `TEST-*.xml` for each test class, and ignores the `.txt` summaries beside them. You can give a single report file instead.

In a build with several modules, each module writes its own `target/surefire-reports/`, and `balance` reads only the one at the step's working directory. A step that moves Maven to another folder, with `-pl` or `-f`, still has `balance` look at the step's own `target/surefire-reports`, where Maven writes none, and a step that puts an option before `test`, as `mvn -B test`, does not run the runner `mvn test` at all. Name each module's directory in a long form of its own, as `--unit "mvn test:junit:app/target/surefire-reports"`, and `balance` reads every one.

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

Name the runner with its test task, in the words your pipeline's test step opens with: `mvn test`, as above, or `./mvnw test` for the Maven wrapper (see [Naming your runners](#naming-your-runners)). Only these two take Surefire's default directory. A step that runs another task, such as `mvn verify` or `mvn clean test`, or a Surefire configured to write elsewhere, takes the long form, naming the directory in the `junit` format: `--unit "mvn verify:junit:target/surefire-reports"`. If you name the runner as `mvn` alone, `balance` recognises it in every step that runs Maven. It would then take a `mvn checkstyle:check` step for the test suite, instead of reporting that step as a check.

**`balance` reads old reports as well.** Surefire does not clear the directory before a run, so `balance` reads a report an earlier run left in an uncleaned `target/` beside the new ones. Run `mvn test` from a fresh checkout, as a CI job does, or run `mvn clean` before it, as `mvn clean && mvn test`. A test that does not compile stops the build before Surefire writes any report. When the directory is missing, `balance` names its path under `## Errors in the inputs` as `runner-report-not-read`, and reads no result for that runner.

### Citing a scenario from Kotlin

A JUnit 5 test in Kotlin cites its scenario as a Java test does: with the claim code in square brackets in `@DisplayName`. A backticked function name cannot carry the claim code, because the JVM forbids brackets in a name and the build fails with *Name contains illegal characters*. Run the suite with Gradle, and name the runner alone, as `./gradlew test`. `balance` reads the reports from where Gradle's `test` task writes them by default, `build/test-results/test`, joined with the working directory of the CI step that runs `./gradlew test`, as a folder of JUnit XML reports:

```sh
./gradlew test
spec-controller balance --unit "./gradlew test"
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

In a build with several modules, each module writes its own `build/test-results/test/`, and `balance` reads only the one at the step's working directory. Name each module's directory in a long form of its own, as `--unit "./gradlew test:junit:app/build/test-results/test"`, and `balance` reads every one.

Name the runner with its test task, in the words your pipeline's test step opens with: `./gradlew test`, as above, or `gradle test` if your pipeline runs Gradle directly (see [Naming your runners](#naming-your-runners)). Only these two take the `test` task's default directory. A step that runs another task, such as `./gradlew check` or `./gradlew :app:test`, takes the long form, naming the directory in the `junit` format. If you name the runner as `./gradlew` alone, `balance` recognises it in every step that runs the wrapper. It would then take a `./gradlew detekt` step for the test suite, instead of reporting that step as a check.

### Citing a scenario from RSpec

An RSpec example cites its scenario with the claim code in square brackets in its description, the string passed to `it`. RSpec's own JSON formatter keeps each example's description apart from its groups' descriptions, so you need no extra gem and no `spec_helper` change. When the CI step that runs RSpec writes the report, name the runner alone:

```yaml
- name: Unit tests
  run: bundle exec rspec --format progress --format json --out reports/rspec.json
```

```sh
spec-controller balance --unit rspec
```

The first `--format` keeps RSpec's usual console output. The second writes the JSON report to the file `--out` names: an `--out` applies to the `--format` before it, and `balance` reads the path of the `--out` that follows `--format json`. A report the step does not name, name in the runner's long form: `--unit rspec:rspec:reports/rspec.json`.

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

The runner's name is `rspec`, so a step that runs `rspec`, or `bundle exec rspec`, is your unit suite (see [Naming your runners](#naming-your-runners)).

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

**One `toJSON(steps)` dump step in each job** lets the reconciler read what each step did. Give `--ci-steps` once for each dump; `balance` reads every one. This is wiring, not part of the evidence obligation. [Wiring into CI](#wiring-into-ci) covers it, with the `if: always()` rule that goes with it.

### A converted check is still a command you can run

Converting a check does not move it inside anything. Many of the converted checks in spec-controller's own pipeline are commands you can paste into a terminal, such as `pnpm typecheck`. Exit 0 means the check passed, and neither Cucumber nor `spec-controller` is involved. The other converted checks read what an earlier step left behind: a report, a count, or the files a test run wrote.

The scenario and the `id:` make the run **observable**: the report can say that the check ran, and against what.

---

## Configuration — runners, non-checks and deferral tags

`balance` takes its configuration from its own command line. Each setting is a flag, and each flag may repeat:

```sh
npx spec-controller balance \
  --unit vitest \
  --integration cucumber-js \
  --e2e cucumber-js \
  --not-check "ci.yml:build:Install dependencies" \
  --not-check "ci.yml:build:Publish the package" \
  --deferral-tag deferred
```

Each runner here is named alone, so `balance` finds the report it writes from the CI step that runs it (see [Naming your runners](#naming-your-runners)).

`package.json` is read only for its `scripts`, which runner recognition and report finding follow. `--package-json` points at it, and defaults to `package.json` in the working directory. A `specController` block in it is not read.

### How discovery works

**You do not name a list of checks.** You name the commands that run your behavioural suites, each under the flag of its layer: a closed set of four. **Every other step of the workflows `--ci` names is a fitness function**, whatever it invokes, whether a `run:` step or a `uses:` action.

Discovery does not depend on Node: it does not match `package.json` script names against prefixes. `balance` discovers a pipeline with a bare `run: ruff` and no `package.json` script like any other pipeline.

### Naming your runners

- **Each layer has its own flag:** `--unit`, `--integration`, `--e2e` and `--performance`. Each names a runner of that layer, and may repeat, so one layer may have several runners. A layer you name no runner for has none.
- **A runner named alone, as `--unit vitest`, has its report found from the CI step that runs it.** `balance` reads the step's command for the option that names the report, in the spellings below. A step that runs a `package.json` script is read through the script, and any words after the script's name count as the words of the script's last command. Scripts come only from the `--package-json` file; a script in a subfolder's `package.json` is not followed. Each result in the report is evidence of the runner's layer.
- **A path a step names is read from the step's folder:** the target's folder, the top of its git repository, joined with the step's `working-directory`, or else its job's `defaults.run.working-directory`. An absolute path is read as written.
- **Where no step that runs the runner names a report, `balance` reads where the runner writes its reports by default**, joined with the step's working directory as a named path is. Only these runners have one, each read as a folder of JUnit XML reports:

  | Runner | Its default location | Format |
  |---|---|---|
  | `mvn test`, `./mvnw test` | `target/surefire-reports` | `junit` |
  | `gradle test`, `./gradlew test` | `build/test-results/test` | `junit` |

  Any other task of the build tool, such as `mvn verify`, `./gradlew check` or `./gradlew :app:test`, has no default location. A default location with no folder at it is named as `runner-report-not-read`, with the path.
- **Every step that runs the runner names a report**, whatever else the step is, so a step whose `id:` is a claim code counts too. A runner that several steps run has a report from each, and `balance` reads every one. A report written in another job must be downloaded to the same path before `balance` runs.
- **These are the spellings `balance` reads:**

  | Runner | The step names its report with | Format |
  |---|---|---|
  | `vitest` | `--reporter=json --outputFile=<path>`, or `--reporter=json --outputFile.json=<path>` | `vitest` |
  | `jest` | `--json --outputFile=<path>` | `jest` |
  | `pytest` | `--junitxml=<path>` or `--junit-xml=<path>` | `pytest` |
  | `cucumber-js` | `--format json:<path>` or `-f json:<path>` | `cucumber` |
  | `rspec` | `--format json --out <path>`, where `--out` applies to the `--format` before it | `rspec` |
  | `playwright` | `--reporter=junit`, with the step's `env` setting `PLAYWRIGHT_JUNIT_OUTPUT_FILE`, or `PLAYWRIGHT_JUNIT_OUTPUT_DIR` and `PLAYWRIGHT_JUNIT_OUTPUT_NAME`, or `PLAYWRIGHT_JUNIT_OUTPUT_NAME` alone | `junit` |
  | `gotestsum` | `--junitfile <path>`, or the step's `env` setting `GOTESTSUM_JUNITFILE` | `junit` |

- **The long form names the runner's report itself:** `<runner>:<format>:<report>`, as in `--e2e cypress:junit:out/cypress.xml`. `balance` then looks no further. Use it for a report `balance` cannot find from a step or a default location, such as one a build tool's other task writes, or one written to a folder moved from its default. It splits at its first two colons, so the report's path may hold a colon. The format is one of `vitest`, `jest`, `pytest`, `junit`, `rspec` and `cucumber`; a `junit` report may be a folder of JUnit XML files. `balance` reads the report at that path, from where it runs, in that format, and each result in it is evidence of the runner's layer. So a Cypress suite's JUnit report named under `--e2e` answers `@e2e` claims.
- **One report may serve several layers.** Name its runner under each layer's flag; `balance` reads the report once. A Cucumber result then takes the layers among them that its scenario's tags name, or every one when its tags name none; a result from any other report takes every one.
- **A runner named alone whose report `balance` cannot find** is named in `## Errors in the inputs` as `runner-report-not-named`. That is a runner `balance` has no spelling and no default location for, a runner whose steps name no report and that has no default location, or a runner no step runs. A step names no report when the report is set only in the runner's own configuration file, or by an expression such as `${{ env.OUT }}/x.json`. The runner is kept, so its step is still a runner, but no result of it is read. Name its report in the long form.
- **A report with no file at its path**, a long form's, a step's or a default location, is named in `## Errors in the inputs` as `runner-report-not-read`, with the path. The run goes on: the runner is kept, so its step is still a runner, and no result of that report is read. Any other report that cannot be read, such as one that does not parse, refuses the run at exit `2`.
- **A runner `balance` cannot read** is left out, and named as `configuration-wrong-kind`: an empty one, or a long form with no runner, no report, or a format `balance` does not read.
- **No runner at all is not an error.** Every step that is not a reconciler step, a non-check or a plumbing step becomes a fitness function. That is the zero-annotation report.
- **`balance` recognises a runner only as the command a step runs**: the command a line of the step opens with, or a command after `&&` or `;` in that line, past any `NAME=value` settings. So a runner is recognised after a line that sets a variable, after a shell function's definition, and after an `if … fi` block. A runner named anywhere else, as an argument or a path, leaves the step a check. So does a step that pipes the runner's output onward, into another command or into a compound command such as a `while` loop, an `if` block or a subshell.
- **A launcher or a wrapper may hand on to a runner.** The launchers are `npx`, `pnpm exec`, `pnpm <bin>`, `yarn <bin>`, `bunx`, `python -m`, `python3 -m`, `uv run`, `poetry run`, `pipenv run`, `coverage run -m` and `bundle exec`. Launchers chain, so `uv run python -m pytest` reaches `pytest`. The wrappers `xvfb-run` and `timeout <duration>` hand on too, past their options and the values those options take (`xvfb-run`'s `-n`, `-s`, `-e`, `-f`, `-p` and `-w` each take one value). So `timeout 75 pnpm test` runs `test`.
- **A `package.json` script may run a runner.** A step runs a script as `npm test`, `npm run <script>`, `pnpm <script>`, `pnpm run <script>`, `pnpm -r <script>`, `pnpm --filter <name> <script>`, `yarn <script>`, `yarn run <script>` or `yarn workspace <name> <script>`, when the target's own `package.json` has a script by that name. `balance` follows the script through any scripts it runs in turn, however deep. A script that runs itself ends as a check.
- **A runner named in several words is recognised where a command opens with all of those words.** This covers `mvn test`, `./mvnw test`, `./gradlew test`, `./gradlew check`, `./gradlew :app:test` and `gotestsum`. A build tool runs more than its tests, so name it with its test task. Then only the step that runs the tests is the runner, and every other task the tool runs is a check. Name a runner without its launcher: `rspec` covers `bundle exec rspec`.
- **Any other variant is a check.** A launcher, script runner or wrapper not listed here leaves the step a check that runs the runner. Name such a step with `--not-check`, or run the runner in one of the variants above.

These variants are the only ones `balance` reads, one list per claim, in [`packages/core/src/inputs/shell.variants.json`](../packages/core/src/inputs/shell.variants.json). The spellings that name a runner's report are listed in [`runners.variants.json`](../packages/core/src/inputs/runners.variants.json). The plumbing actions, which are neither checks nor runners, are listed beside the workflow reader in [`workflows.variants.json`](../packages/core/src/inputs/workflows.variants.json). [Naming your non-checks](#naming-your-non-checks) lists them and says how they are matched.

### Naming your non-checks

`--not-check` names a non-check: a step that is neither a runner nor a check. It may repeat.

- **Each one is `<workflow file>:<job id>:<step name>`.** The workflow file ends `.yml` or `.yaml`, and may itself hold a colon. A bare step name is not a non-check, and is named as `not-checks-entry-not-a-step-name`.
- **To take a whole workflow out, narrow `--ci`** instead of listing its steps.
- **The report counts a non-check. It does not drop it.** The report's **Step account** counts it under *Non-checks*, in the row of its workflow and job.
- **The report names a non-check that matches no step of a workflow the run read**, in `## Errors in the inputs`, as `not-checks-entry-matches-no-step`. The run does not judge a non-check that names a workflow the run did not read.
- **Never list `balance` itself or its `toJSON(steps)` dump.** `balance` always leaves them out of the checks.

**`balance` always leaves GitHub plumbing out of the checks too.** Plumbing is a step whose only work is an action in one of these repositories: `actions/checkout`, `actions/setup-*`, `actions/cache`, `actions/upload-artifact` and `actions/download-artifact`. Each is matched on the action's owner and repository, whatever path or ref follows. So `actions/cache/save` is plumbing, as `actions/cache` is, and `actions/setup-*` matches every repository whose name begins `actions/setup-`. Such a step moves code, tools and files, and judges nothing, so the **Step account** counts it under *Plumbing*, never as a check. The list is closed: every other action stays a fitness function, including `actions/dependency-review-action`, which is a check. A plumbing step you also name with `--not-check` is a non-check, as you named it.

### Deferring a scenario

Put a deferral tag on a scenario you have written but deliberately not yet evidenced. Without the tag, each quality check the scenario asks for reads `missing`.

- **A scenario that carries a recognised deferral tag is not an executable claim.** It raises no evidence obligation and has no Claim Reconciliation, so it posts nothing and does not affect the verdict.
- **Evidence that still cites a deferred scenario's claim code lands on a phantom claim**, as `cites-unknown-claim`, because no executable claim carries the code.
- **The tag defers the scenario it is on, every scenario of the Rule it is on, or every scenario of the Feature it is on.**

The built-in set is `@wip`, `@ignore`, `@skip`, `@todo` and `@pending`. Add your own with `--deferral-tag`, once for each tag:

```sh
npx spec-controller balance --deferral-tag deferred --deferral-tag @blocked
```

- **Your tags extend the built-in set and never replace it.** `@wip` defers a scenario whatever you name.
- **You may write a tag bare or with its `@`.** `balance` ignores whitespace around it.
- **An empty tag, or `@` alone,** is left out, not refused. The report names it in `## Errors in the inputs` as `configuration-wrong-kind`.
- **A tag in neither list never defers the scenario**, however much it looks like a deferral tag.

**A deferral tag applies to the whole scenario. `@<quality-check-kind>pending` does not.** `balance` ignores `@integrationpending`: it raises no integration evidence obligation. So a passing `@unit` beside it still reconciles `satisfied`, and an integration test that cites the scenario reads `not-asked-for`.

**`--strict` reads every claim as if nothing were put off.** It ignores a deferral tag, so the scenario is an executable claim again, and it reads `@<quality-check-kind>pending` as `@<quality-check-kind>`, which raises that evidence obligation. It changes no exit code.

### Configuration the run cannot use is named, never dropped

A run names each configuration setting it cannot use, with one of these codes:

| Code | The setting |
| --- | --- |
| `configuration-wrong-kind` | a setting in a form its flag does not take (an empty runner, non-check or deferral tag, or a runner with a colon that is not a long form naming a runner, a format `balance` reads and a report) is left out |
| `runner-report-not-named` | a runner named alone whose report no step names, and that has no default location, is kept, so its step is still a runner, but no result of it is read |
| `runner-report-not-read` | a report, named in a long form or by a step, or a default location, that has no file at its path keeps its runner, and no result of that report is read |
| `not-checks-entry-matches-no-step` | a `--not-check` that matches no step of a workflow the run read makes no step a non-check |
| `not-checks-entry-not-a-step-name` | a `--not-check` that does not name a step as `<workflow file>:<job id>:<step name>` makes no step a non-check |

None of these codes refuses the run. Each is a line in `## Errors in the inputs`, right after the run provenance, giving its code, then the setting as written: the runner for `runner-report-not-named`, and the report's path for `runner-report-not-read`. The rest of the report is the one you would get without that entry. The JSON lists them under `errorsInTheInputs.configurationErrors`.

### Limits

- **The configuration does not depend on Node.** Every setting is a flag on `balance`'s command line, so a repository with no `package.json` names its runners as any other does. What `balance` can discover does not depend on Node either.
- **Annotating steps does not depend on Node.** An `id:` is a key of the step mapping, the command below it can be any command in any language, and nothing in the resolution reads a manifest.
- **Runner recognition has a false positive that you can see.** `balance` reports a suite run through an action, or a runner inside a quoted argument to a wrapper, as a fitness function. It does not silently exclude it. Fix each with one `--not-check`.
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
            --unit vitest \
            --not-check "ci.yml:build:Install dependencies" \
            --ci-steps ci-steps.json \
            --ci .github/workflows/ci.yml \
            --package-json package.json \
            --format md:$GITHUB_STEP_SUMMARY \
            --exit-zero
```

`--unit vitest` makes the Test step your unit suite, and `balance` reads the report that step's `--outputFile` names, `reports/vitest.json`; `--not-check` makes the install a step that is not a check. Checkout and setup-node are GitHub's own setup actions. The last two steps are the reconciler's own. The Complexity step is the one fitness function. In your own repository, pin the actions to commit SHAs, and pin spec-controller to an exact version.

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
# after your test steps have written their reports,
# and the dump step has written ci-steps.json
spec-controller balance --features ./features \
  --unit vitest \
  --integration cucumber-js \
  --ci-steps ./ci-steps.json \
  --ci ./.github/workflows/ci.yml \
  --package-json ./package.json \
  --format md:reconciliation.md \
  --format json:reconciliation.json
```

Drop `--ci-steps` if you have converted nothing. `balance` reads each runner's report at the path its test step names. When a test step runs in another job, download its report to that path before `balance` runs.

**Keep the reports as build artefacts, but do not commit them to the repository.** An Evidence Reconciliation lists a codebase's gaps, phantom claims and passes that cannot fail. That makes it more sensitive than the code itself, so it belongs outside version control.

### GitHub Actions — put the report on the run summary

A reconciliation is a table, not a list of line-level findings, and GitHub has a channel built for tables: the **job summary**. `$GITHUB_STEP_SUMMARY` names a file the runner sets up for each step. GitHub renders anything appended to that file as GitHub-Flavoured Markdown on the workflow run's summary page.

`balance` writes Markdown to any path `--format` is given, so this needs nothing extra from the tool:

```yaml
- name: Reconcile
  run: |
    spec-controller balance --features ./features \
      --unit vitest:vitest:./vitest-report.json \
      --integration cucumber-js:cucumber:./cucumber-report.json \
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

**The JSON uses the glossary's words, on purpose.** It is the Evidence Reconciliation written out, so its keys and values are the terms of [`ubiquitous-language.md`](./ubiquitous-language.md), as the Markdown's headings are. When a term changes, the JSON changes with it and its schema's version rises. CI refuses any change to the schema that does not raise `schemaVersion`. Read a report against the schema its version names.

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

- **`### Claim Reconciliations`**: the total, balanced and out of balance. When some claim codes are written where no claim reads them, in a title, a step or a comment, a line under the table counts them. When a deferral tag sets some scenarios aside, a line under the table counts them, after the line for claim codes when both are shown.
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
| `input-not-in-its-shape` | a report, the step record or the manifest parses, but is not in its shape, a manifest that is not a JSON object included; the line says where it first breaks |

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
  --unit vitest \
  --integration cucumber-js:cucumber:./cucumber-report.json
```

Run `spec-controller --help`, or `-h`, for the top-level summary of the commands. Run `spec-controller balance --help` for the full list of `balance`'s flags. After a command, `--help` or `-h` gives that command's own help.

Help answers only when nothing else on the command line is refused. A usage error wins, even beside `--help`: the tool prints the complaint, then the help for what was asked for, and exits `2`.

### Flags

| Flag | Purpose |
|---|---|
| `--features <dir>` | A directory of Gherkin `.feature` files: the scenarios. The tool reads every `.feature` file under it, at any depth, and names each one in the report by its path within the directory. |
| `--unit <runner>[:<format>:<report>]` | A unit runner. Named alone, the runner has its report found from the CI step that runs it, else read from where the runner writes it by default (Maven's and Gradle's `test`), and reads `runner-report-not-named` when it has neither. In its long form, the format of the report it writes, one of `vitest`, `jest`, `pytest`, `junit`, `rspec` and `cucumber`, and the report's path: a `junit` report may be a folder of JUnit XML files. `balance` reads each report the runner has, and each result in it is unit evidence. Repeatable. See [Naming your runners](#naming-your-runners). |
| `--integration <runner>[:<format>:<report>]` | An integration runner, as `--unit` names a unit one. Repeatable. |
| `--e2e <runner>[:<format>:<report>]` | An e2e runner, as `--unit` names a unit one. Repeatable. |
| `--performance <runner>[:<format>:<report>]` | A performance runner, as `--unit` names a unit one. Repeatable. |
| `--not-check <workflow>:<job>:<step>` | A CI step that is not a check, as its workflow file, job id and step name. Repeatable. See [Naming your non-checks](#naming-your-non-checks). |
| `--deferral-tag <tag>` | A tag that defers the scenarios it is on, beside the built-in set. Repeatable. See [Deferring a scenario](#deferring-a-scenario). |
| `--ci <workflow.yml\|dir>` | Your CI workflows: a file, or a directory of them (default `.github/workflows`). **This is the scope of discovery.** The tool reads every step of every job it resolves; narrow it to leave a whole workflow out. It is also where a check step's `id:` supplies the claim code its result cites, and where a runner named alone has its report found. |
| `--package-json <path>` | The target's `package.json`, read only for its `scripts`, which runner recognition and report finding follow (see [Configuration](#configuration--runners-non-checks-and-deferral-tags)). A fitness function is named by its `@fitness` scenario and by the CI step whose `id:` is that scenario's claim code; no setting names one. Defaults to `package.json` in the working directory. |
| `--ci-steps <record.json>` | A CI job's record of what each of its steps did: the `toJSON(steps)` dump, which is the evidence for fitness functions. See [Wiring into CI](#wiring-into-ci). Omit it if you have converted none. Repeatable: `balance` reads every record you name. |
| `--target <name>` | A name recorded verbatim in the report's provenance: the project this run reconciled. |
| `--source-sha <sha>` | Override the git commit SHA recorded in provenance (defaults to the resolved HEAD). |
| `--format <fmt>[:<path>]` | Where to send output (`md` or `json`, optionally `:<path>` to write to a file). Repeatable. See [`--format`](#--format--routing-the-output). |
| `--strict` | Read every claim as if nothing were put off: a deferral tag is ignored, and `@<quality-check-kind>pending` is read as `@<quality-check-kind>`. See [Deferring a scenario](#deferring-a-scenario). |
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

- each report a runner's long form names, or a step names for a runner named alone, and each report in a `junit` folder it names;
- the `--ci-steps` or `--package-json` file;
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

The tool writes the code under `CLM`. Its number is one past the highest number a claim code in the repository has **ever** carried for that feature code. So the tool never hands out a number again once a claim code has used it, even one whose claim has since been deleted, and every old reference to a code, in history, a chat or a stale document, keeps the meaning it had. The number has at least three digits, zero-padded, and grows past three digits (`999` is followed by `1000`).

- **The argument** is the feature code, `<FFF>`: two to five characters, each `A`–`Z` or `0`–`9`. A feature code is known when a feature file in the features folder is headed with it. The features folder is the one `--features` names. When `--features` is left out, it is `features/` at the top of the repository, the corpus `balance` reads by default. A feature code that only history or a test fixture carries is not known.
- **`--features <dir>`** names the features folder, as it does for `balance`: a path from the folder you run the tool in. Give it once. Outside a repository, the folder must be inside the one you run the tool in.
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
2. Name your runners, name your non-checks, or narrow `--ci`. See [Configuration](#configuration--runners-non-checks-and-deferral-tags).
3. To keep the report while you work through it, without failing the build, add `--exit-zero`. Delete it when you are ready to gate.

**A step I know is my test suite is reported as a check.** Runner recognition did not reach it. `balance` recognises the runner only as the command a step runs, directly or behind one of the listed launchers, in the step's command or in the `package.json` script the step invokes. It does not reach a suite:

- run through a `uses:` action;
- started by a launcher not on the list (`tox`, `nox`);
- run as a project script (`hatch run test`);
- with an option between a launcher and the runner (`uv run --frozen pytest`);
- behind a wrapper not on the list (`nice`, or `timeout` with no duration);
- whose output is piped into another command (`pnpm test | tee test.log`).

Name the step with `--not-check`. The failure direction is deliberate: a step wrongly reported is one line to fix, but a step wrongly excluded would be invisible.

**The run verdict reads *not reconciled, for claim code errors*.** One of these is true: the corpus files a claim code under the wrong feature file, or in a file that declares no feature code; two files declare one feature code; a scenario carries more than one claim code; or an Outline carries a claim code beside a `clm` column. `## Errors in the inputs` names each error by its handle and the files it is about. A misfiled code leaves every Claim Reconciliation reconciling, so the rest of the report is unchanged. A scenario that carries several claim codes, or an Outline that carries a claim code beside a `clm` column, has no Claim Reconciliation under any of them. The run exits `3` until the codes are filed correctly. See [Claim code errors](#claim-code-errors).

**A row reads `duplicate-claim-code`.** Two scenarios carry that claim code. Each has a Claim Reconciliation of its own, and its row is named by the code and its feature file. Give one of them a code of its own. While two scenarios share the code, the run exits `1`.

---

## What spec-controller assumes, and what it does not do

**It reconciles automated tests and fitness functions in CI.** It covers unit, integration, e2e and performance tests, and fitness functions. It is not a task tracker, and it is not a document specification.

**Your tracker keeps the work.** A ticket is a change. A scenario is behaviour the system has now. The two meet only where one piece of work creates, reads, updates or deletes one scenario.

**spec-controller assumes that each test is valid.** It reconciles a result to the test that claimed it. You make sure the test reflects the behaviour the business wants, as you do under CI, TDD and BDD. The tool does not try to establish that a test is a good test.

**A title can stop matching its check. spec-controller states this gap and does not solve it.** Where the runner is not Cucumber (usually for `@unit`, `@performance` and `@fitness`), a scenario's given, when and then are lowercase description that no runner executes, so no unexecuted step reads as a test. But its title is still prose that nothing reads against the check that answers it. The title and the check can come to say different things, and nothing goes red. The report proves that a scenario is linked to evidence and that the evidence passed. **It does not prove that the evidence tests what the title says.**

**Its readers are tested against reports the tools themselves wrote, where a tool publishes one.** The Vitest, Cucumber and JUnit readers are tested against reports copied from the repositories of Vitest, cucumber-js, Maven Surefire, Gradle, gotestsum and go-junit-report. They sit in [`packages/core/src/inputs/real-reports/`](../packages/core/src/inputs/real-reports/), and each tool's `SOURCE.md` names where its reports came from, how they were taken, and their licence. Jest, pytest and RSpec publish no report of their own, so the forms they write are tested against reports written by hand from each tool's documentation. Jest's report is read by the Vitest reader, pytest's by the JUnit reader, and RSpec's by a reader of its own. Playwright's JUnit report is read by the JUnit reader.

**It keeps a reconciled codebase reconciled.** Getting a codebase with no scenarios to that point is not part of this package.
