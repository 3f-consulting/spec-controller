/**
 * @SCN-CLI-001 — `spec-controller balance` runs standalone (core + app, no engine)
 * and emits the Evidence Reconciliation.
 *
 * Bidirectional evidence: the Given/When/Then carry the SCN-CLI-001 id, matching
 * features/cli-balance.feature.
 *
 * @e2e: it spawns the REAL `spec-controller` binary as a subprocess — the top-level
 * `cli.ts` dispatcher, which routes the `balance` subcommand through the whole
 * pipeline (parse → reconcile → render) with only the public core + app layer
 * present. Asserting the real subprocess's exit code and stdout — not an in-process
 * call — is what proves the command works standalone.
 */

import { Given, When, Then } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { spawnSync, type SpawnSyncReturns } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

/** The reconcilable fixture target — declared scenarios + a Vitest report. */
const FIXTURE = {
  features: "tests/fixtures/evidence-observation/features",
  vitest: "tests/fixtures/evidence-observation/vitest.json",
};

let cliResult: SpawnSyncReturns<string>;

Given("a target with declared scenarios and a Vitest report of what ran", function () {
  const root = process.cwd();
  assert.ok(existsSync(join(root, FIXTURE.features)), `missing fixture features: ${FIXTURE.features}`);
  assert.ok(existsSync(join(root, FIXTURE.vitest)), `missing fixture vitest report: ${FIXTURE.vitest}`);
});

When("{string} is invoked over that target through the CLI binary", function (command: string) {
  assert.equal(command, "spec-controller balance");
  const root = process.cwd();
  // Spawn the REAL top-level binary entry (packages/spec-controller/src/cli.ts) with
  // the `balance` subcommand — the standalone path, core + app only, no engine.
  cliResult = spawnSync(
    join(root, "node_modules", ".bin", "tsx"),
    [
      join(root, "packages", "spec-controller", "src", "cli.ts"),
      "balance",
      "--features",
      FIXTURE.features,
      "--vitest",
      FIXTURE.vitest,
    ],
    { cwd: root, encoding: "utf8" },
  );
  assert.equal(cliResult.error, undefined, `CLI failed to spawn: ${cliResult.error?.message}`);
});

Then("the command exits zero", function () {
  assert.equal(cliResult.status, 0, `expected exit 0; got ${cliResult.status}\n${cliResult.stderr}`);
});

Then("it prints the Evidence Reconciliation to stdout", function () {
  assert.match(cliResult.stdout, /^# Evidence Reconciliation/m);
});

Then("the reconciliation reports the target's scenarios", function () {
  // The fixture declares SCN-TGT-001 / SCN-TGT-002; the Summary's Scenario row must
  // count them — proof the whole reconcile ran end-to-end through the binary.
  assert.match(cliResult.stdout, /\| Scenario \| 2 \|/);
});
