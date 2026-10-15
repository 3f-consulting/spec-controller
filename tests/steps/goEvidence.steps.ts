import { Given, When, Then } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { spawnSync, type SpawnSyncReturns } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { NODE, SPEC_CONTROLLER_ARGV } from "./support/builtCli.js";

const GO_TARGET = {
  features: "tests/fixtures/go/features",
  packageJson: "tests/fixtures/go/package.json",
  ci: "tests/fixtures/go",
  report: "tests/fixtures/go/report.xml",
};

const CITED = "SCN-GOF-001";
const CITING_SUBTEST = `example.com/gofixture/cited::TestCited/[${CITED}]_a_passing_subtest_cites_its_scenario`;

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

Given("a target whose unit tests are a Go suite and whose scenario raises a unit evidence obligation", function () {
  const feature = readFileSync(`${GO_TARGET.features}/target.feature`, "utf8");
  assert.match(feature, new RegExp(`@unit @${CITED}\\b`), `fixture invariant: ${CITED} raises a unit obligation`);
  targetArgs = ["--features", GO_TARGET.features, "--package-json", GO_TARGET.packageJson, "--ci", GO_TARGET.ci];
});

Given("a gotestsum report in which a passing subtest cites that scenario in its name", function () {
  assert.ok(existsSync(GO_TARGET.report), `missing the real gotestsum report: ${GO_TARGET.report}`);
  const [classname, name] = CITING_SUBTEST.split("::");
  const passingTestcase = new RegExp(
    `<testcase classname="${classname}" name="${name!.replace(/[[\]]/g, "\\$&")}" time="[^"]*"></testcase>`,
  );
  assert.match(readFileSync(GO_TARGET.report, "utf8"), passingTestcase, `fixture invariant: the subtest citing ${CITED} passed`);
  reportArgs = ["--junit", GO_TARGET.report];
});

When("balance is asked to reconcile that target with the gotestsum report", function () {
  result = spawnSync(NODE, [...SPEC_CONTROLLER_ARGV, "balance", ...targetArgs, ...reportArgs, "--format", "json"], {
    encoding: "utf8",
  });
  assert.equal(result.error, undefined, `CLI failed to spawn: ${result.error?.message}`);
});

Then("the scenario that Go subtest cites reconciles satisfied, by that subtest", function () {
  let rows: ScenarioRow[];
  try {
    rows = (JSON.parse(result.stdout) as { ledger: { scenarioReconciliations: ScenarioRow[] } }).ledger.scenarioReconciliations;
  } catch {
    assert.fail(`expected the reconciliation as JSON; got exit ${result.status}\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`);
  }
  const unit = rows.find((row) => row.scnId === CITED)?.qualityCheckReconciliations.find((q) => q.qualityCheck === "unit");
  assert.equal(unit?.outcome, "satisfied", `expected ${CITED}'s unit obligation satisfied; got ${JSON.stringify(unit)}`);
  assert.equal(
    unit?.evidenceObservation?.locator,
    CITING_SUBTEST,
    `expected the satisfying observation to be the Go subtest "${CITING_SUBTEST}"; got ${JSON.stringify(unit)}`,
  );
});
