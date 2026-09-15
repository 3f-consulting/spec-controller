/**
 * The @e2e arm of @SCN-RMG-004 — operator-reachability through the REAL binary.
 *
 * Bidirectional evidence: the step markers carry SCN-RMG-004, matching
 * features/run-management.feature. This is the arm the regression was missing: the
 * existing @RMG scenarios exercised keptRun in isolation (green in isolation), but none
 * proved the operator could reach a stored run by running the shipped tool. This spawns
 * `spec-controller --store <root> balance …` as a real subprocess and asserts the on-disk
 * run dir + artefacts + run.yaml.
 */

import { Given, When, Then } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { spawnSync, type SpawnSyncReturns } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parse } from "yaml";
import { NODE, SPEC_CONTROLLER_ARGV } from "./support/builtCli.js";

const FIXTURE = {
  features: "tests/fixtures/evidence-observation/features",
  vitest: "tests/fixtures/evidence-observation/vitest.json",
};
const TARGET = "demo-store";
const RUN_ID = "r1";

let storeRoot: string;
let storeResult: SpawnSyncReturns<string>;
let runDir: string;

// @SCN-RMG-004
Given("a reconcilable target and a store root outside the repo", function () {
  const root = process.cwd();
  assert.ok(existsSync(join(root, FIXTURE.features)), `missing fixture features: ${FIXTURE.features}`);
  assert.ok(existsSync(join(root, FIXTURE.vitest)), `missing fixture vitest report: ${FIXTURE.vitest}`);
  // The store root is a temp dir OUTSIDE the repo — the tool holds no default store, and a
  // real run must never write inside the repo (the committed-report leak).
  storeRoot = mkdtempSync(join(tmpdir(), "spec-controller-rmg004-"));
});

// @SCN-RMG-004
When("the operator runs balance under a store directive through the CLI binary", function () {
  const root = process.cwd();
  // The REAL binary with a leading --store host modifier: host wraps balance via keptRun.
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

// @SCN-RMG-004
// [3F-1460] fix-to-canon (3F-1414): balance is now an unconditional CI gate, and its
// store wrapper propagates the exit code. This target is out-of-balance (a --vitest-only
// run over the reconcilable fixture: a missing integration obligation + a phantom + a
// suspense row), so the stored run exits 1 — the run dir + artefacts + manifest are still
// written IN FULL first. Pure exit-expectation flip 0->1; every stored-artefact assertion
// that follows is unchanged.
Then("the store command exits with status 1", function () {
  assert.equal(storeResult.status, 1, `expected exit 1 (out-of-balance); got ${storeResult.status}\n${storeResult.stderr}`);
});

// @SCN-RMG-004
Then("a run directory named for the target and run-id exists under the store root", function () {
  assert.ok(existsSync(runDir), `expected run directory at ${runDir}`);
});

// @SCN-RMG-004
Then("that run directory holds spec-reconciliation.md, spec-reconciliation.json, and run.yaml", function () {
  for (const name of ["spec-reconciliation.md", "spec-reconciliation.json", "run.yaml"]) {
    assert.ok(existsSync(join(runDir, name)), `expected ${name} in ${runDir}`);
  }
});

// @SCN-RMG-004
Then("its run.yaml parses with mode balance, the target, and the run-id", function () {
  const manifest = parse(readFileSync(join(runDir, "run.yaml"), "utf8")) as Record<string, unknown>;
  assert.equal(manifest["schema_version"], 2);
  assert.equal(manifest["mode"], "balance");
  assert.equal(manifest["target"], TARGET);
  assert.equal(manifest["run_id"], RUN_ID);
});
