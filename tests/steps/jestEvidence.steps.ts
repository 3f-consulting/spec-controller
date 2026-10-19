import { Given, When, Then } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { spawnSync, type SpawnSyncReturns } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { NODE, SPEC_CONTROLLER_ARGV } from "./support/builtCli.js";

const JEST_TARGET = {
  features: "tests/fixtures/jest/features",
  packageJson: "tests/fixtures/jest/package.json",
  ci: "tests/fixtures/jest",
  report: "tests/fixtures/jest/report.json",
};

const CITED = "SCN-JSF-001";
const CITING_TEST = `[${CITED}] a passing test cites its scenario`;

let targetArgs: string[] = [];
let reportArgs: string[] = [];
let result: SpawnSyncReturns<string>;

interface JestReport {
  readonly testResults: ReadonlyArray<{
    readonly assertionResults: ReadonlyArray<{ readonly title: string; readonly status: string }>;
  }>;
}

interface ScenarioRow {
  readonly scnId: string;
  readonly qualityCheckReconciliations: ReadonlyArray<{
    readonly qualityCheck: string;
    readonly outcome: string;
    readonly evidenceObservation?: { readonly locator?: string; readonly testName?: string };
  }>;
}

Given("a target whose unit tests are a Jest suite and whose scenario raises a unit evidence obligation", function () {
  const feature = readFileSync(`${JEST_TARGET.features}/target.feature`, "utf8");
  assert.match(feature, new RegExp(`@unit @${CITED}\\b`), `fixture invariant: ${CITED} raises a unit obligation`);
  targetArgs = ["--features", JEST_TARGET.features, "--package-json", JEST_TARGET.packageJson, "--ci", JEST_TARGET.ci];
});

Given("a Jest report in which a passing test cites that scenario in its title", function () {
  assert.ok(existsSync(JEST_TARGET.report), `missing the real Jest report: ${JEST_TARGET.report}`);
  const report = JSON.parse(readFileSync(JEST_TARGET.report, "utf8")) as JestReport;
  const citing = report.testResults.flatMap((file) => file.assertionResults).filter((a) => a.title === CITING_TEST);
  assert.deepEqual(
    citing.map((a) => a.status),
    ["passed"],
    `fixture invariant: exactly one test titled "${CITING_TEST}", and it passed`,
  );
  reportArgs = ["--jest", JEST_TARGET.report];
});

When("balance is asked to reconcile that target with the Jest report", function () {
  result = spawnSync(NODE, [...SPEC_CONTROLLER_ARGV, "balance", ...targetArgs, ...reportArgs, "--format", "json"], {
    encoding: "utf8",
  });
  assert.equal(result.error, undefined, `CLI failed to spawn: ${result.error?.message}`);
});

Then("the scenario that Jest test cites reconciles satisfied, by that test", function () {
  let rows: ScenarioRow[];
  try {
    rows = (JSON.parse(result.stdout) as { ledger: { claimReconciliations: ScenarioRow[] } }).ledger.claimReconciliations;
  } catch {
    assert.fail(`expected the reconciliation as JSON; got exit ${result.status}\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`);
  }
  const unit = rows.find((row) => row.scnId === CITED)?.qualityCheckReconciliations.find((q) => q.qualityCheck === "unit");
  assert.equal(unit?.outcome, "satisfied", `expected ${CITED}'s unit obligation satisfied; got ${JSON.stringify(unit)}`);
  assert.equal(
    unit?.evidenceObservation?.testName,
    CITING_TEST,
    `expected the satisfying observation to be the Jest test "${CITING_TEST}"; got ${JSON.stringify(unit)}`,
  );
});
