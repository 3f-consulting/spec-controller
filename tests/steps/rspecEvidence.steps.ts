import { Given, When, Then } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { spawnSync, type SpawnSyncReturns } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { NODE, SPEC_CONTROLLER_ARGV } from "./support/builtCli.js";

const RSPEC_TARGET = {
  features: "tests/fixtures/rspec/features",
  packageJson: "tests/fixtures/rspec/package.json",
  ci: "tests/fixtures/rspec",
  report: "tests/fixtures/rspec/report.json",
};

const CITED = "SCN-RSF-001";
const CITING_EXAMPLE = `[${CITED}] a passing example cites its scenario`;

let targetArgs: string[] = [];
let reportArgs: string[] = [];
let result: SpawnSyncReturns<string>;

interface RspecReport {
  readonly examples: ReadonlyArray<{ readonly description: string; readonly full_description: string; readonly status: string }>;
}

interface ScenarioRow {
  readonly scnId: string;
  readonly qualityCheckReconciliations: ReadonlyArray<{
    readonly qualityCheck: string;
    readonly outcome: string;
    readonly evidenceObservation?: { readonly locator?: string; readonly testName?: string };
  }>;
}

Given("a target whose unit tests are an RSpec suite and whose scenario raises a unit evidence obligation", function () {
  const feature = readFileSync(`${RSPEC_TARGET.features}/target.feature`, "utf8");
  assert.match(feature, new RegExp(`@unit @${CITED}\\b`), `fixture invariant: ${CITED} raises a unit obligation`);
  targetArgs = ["--features", RSPEC_TARGET.features, "--package-json", RSPEC_TARGET.packageJson, "--ci", RSPEC_TARGET.ci];
});

Given("an RSpec report in which a passing example cites that scenario in its description", function () {
  assert.ok(existsSync(RSPEC_TARGET.report), `missing the real RSpec report: ${RSPEC_TARGET.report}`);
  const report = JSON.parse(readFileSync(RSPEC_TARGET.report, "utf8")) as RspecReport;
  const citing = report.examples.filter((example) => example.description === CITING_EXAMPLE);
  assert.deepEqual(
    citing.map((example) => example.status),
    ["passed"],
    `fixture invariant: exactly one example described "${CITING_EXAMPLE}", and it passed`,
  );
  reportArgs = ["--rspec", RSPEC_TARGET.report];
});

When("balance is asked to reconcile that target with the RSpec report", function () {
  result = spawnSync(NODE, [...SPEC_CONTROLLER_ARGV, "balance", ...targetArgs, ...reportArgs, "--format", "json"], {
    encoding: "utf8",
  });
  assert.equal(result.error, undefined, `CLI failed to spawn: ${result.error?.message}`);
});

Then("the scenario that RSpec example cites reconciles satisfied, by that example", function () {
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
    `An RSpec fixture suite ${CITING_EXAMPLE}`,
    `expected the satisfying observation to be the RSpec example "${CITING_EXAMPLE}"; got ${JSON.stringify(unit)}`,
  );
});
