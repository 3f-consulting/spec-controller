import { Given, When, Then } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { spawnSync, type SpawnSyncReturns } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";
import { NODE, SPEC_CONTROLLER_ARGV } from "./support/builtCli.js";
import { temporaryDirectory } from "./support/temporaryDirectory.js";

const FIXTURE = {
  features: "tests/fixtures/evidence-observation/features",
  vitest: "tests/fixtures/evidence-observation/vitest.json",
};
const TARGET = "demo-store";
const RUN_ID = "r1";

let storeRoot: string;
let storeResult: SpawnSyncReturns<string>;
let runDir: string;
Given("a reconcilable target and a run store outside the repo", function () {
  const root = process.cwd();
  assert.ok(existsSync(join(root, FIXTURE.features)), `missing fixture features: ${FIXTURE.features}`);
  assert.ok(existsSync(join(root, FIXTURE.vitest)), `missing fixture vitest report: ${FIXTURE.vitest}`);
  storeRoot = temporaryDirectory("spec-controller-rmg004-");
});

When("the operator runs balance under the store modifier and the run-name modifier", function () {
  const root = process.cwd();
  storeResult = spawnSync(
    NODE,
    [
      ...SPEC_CONTROLLER_ARGV,
      "--store",
      storeRoot,
      "--run-id",
      RUN_ID,
      "balance",
      "--features",
      FIXTURE.features,
      "--vitest",
      FIXTURE.vitest,
      "--target",
      TARGET,
    ],
    { cwd: root, encoding: "utf8" },
  );
  assert.equal(storeResult.error, undefined, `CLI failed to spawn: ${storeResult.error?.message}`);
  runDir = join(storeRoot, TARGET, RUN_ID);
});

Then("the stored run ends on the out-of-balance verdict", function () {
  assert.equal(storeResult.status, 1, `expected exit 1 (out-of-balance); got ${storeResult.status}\n${storeResult.stderr}`);
});

Then("a run directory named for the target and run-id exists under the run store", function () {
  assert.ok(existsSync(runDir), `expected run directory at ${runDir}`);
});

Then("that run directory holds the saved reconciliation, in markdown and in JSON, and the run manifest", function () {
  for (const name of ["spec-reconciliation.md", "spec-reconciliation.json", "run.yaml"]) {
    assert.ok(existsSync(join(runDir, name)), `expected ${name} in ${runDir}`);
  }
});

Then("the run manifest reads mode balance, the target, and the run-id", function () {
  const manifest = parse(readFileSync(join(runDir, "run.yaml"), "utf8")) as Record<string, unknown>;
  assert.equal(manifest["schema_version"], 2);
  assert.equal(manifest["mode"], "balance");
  assert.equal(manifest["target"], TARGET);
  assert.equal(manifest["run_id"], RUN_ID);
});
