import { Given, When, Then } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { spawnSync, type SpawnSyncReturns } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { NODE, SPEC_CONTROLLER_ARGV } from "./support/builtCli.js";

const PYTEST_TARGET = {
  features: "tests/fixtures/pytest/features",
  packageJson: "tests/fixtures/pytest/package.json",
  ci: "tests/fixtures/pytest",
  report: "tests/fixtures/pytest/report.xml",
};

const CITED = "SCN-PYF-001";
const CITING_TEST = "test_passing_cited";

let targetArgs: string[] = [];
let reportArgs: string[] = [];
let result: SpawnSyncReturns<string>;

interface ScenarioRow {
  readonly scnId: string;
  readonly qualityCheckReconciliations: ReadonlyArray<{
    readonly qualityCheck: string;
    readonly outcome: string;
    readonly evidenceObservation?: { readonly locator?: string };
  }>;
}

Given("a target whose scenario raises a unit evidence obligation", function () {
  const feature = readFileSync(`${PYTEST_TARGET.features}/target.feature`, "utf8");
  assert.match(feature, new RegExp(`@unit @${CITED}\\b`), `fixture invariant: ${CITED} raises a unit obligation`);
  targetArgs = ["--features", PYTEST_TARGET.features, "--package-json", PYTEST_TARGET.packageJson, "--ci", PYTEST_TARGET.ci];
});

Given("a pytest report in which a passing test cites that scenario", function () {
  assert.ok(existsSync(PYTEST_TARGET.report), `missing the real pytest report: ${PYTEST_TARGET.report}`);
  const testcase = new RegExp(
    `<testcase classname="test_cases" name="${CITING_TEST}"[^>]*><properties><property name="scn" value="${CITED}" /></properties></testcase>`,
  );
  assert.match(readFileSync(PYTEST_TARGET.report, "utf8"), testcase, `fixture invariant: ${CITING_TEST} passes and cites ${CITED}`);
  reportArgs = ["--pytest", PYTEST_TARGET.report];
});

When("balance is asked to reconcile that target with the pytest report", function () {
  result = spawnSync(NODE, [...SPEC_CONTROLLER_ARGV, "balance", ...targetArgs, ...reportArgs, "--format", "json"], {
    encoding: "utf8",
  });
  assert.equal(result.error, undefined, `CLI failed to spawn: ${result.error?.message}`);
});

Then("the scenario reconciles satisfied", function () {
  let rows: ScenarioRow[];
  try {
    rows = (JSON.parse(result.stdout) as { ledger: { scenarioReconciliations: ScenarioRow[] } }).ledger.scenarioReconciliations;
  } catch {
    assert.fail(`expected the reconciliation as JSON; got exit ${result.status}\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`);
  }
  const unit = rows.find((row) => row.scnId === CITED)?.qualityCheckReconciliations.find((q) => q.qualityCheck === "unit");
  assert.equal(unit?.outcome, "satisfied", `expected ${CITED}'s unit obligation satisfied; got ${JSON.stringify(unit)}`);
  assert.match(
    unit?.evidenceObservation?.locator ?? "",
    new RegExp(CITING_TEST),
    `expected the satisfying observation to be the pytest test ${CITING_TEST}; got ${JSON.stringify(unit)}`,
  );
});
