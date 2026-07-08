/**
 * @SCN-CLI-001 — `spec-controller balance` runs standalone (core + app, no engine)
 * and emits the Evidence Reconciliation.
 * @SCN-CLI-002 — a supplied input path that does not exist is a hard error (non-zero
 * exit, stderr naming the flag + the missing path, nothing reconciled), not the
 * silent zero-evidence all-red report a mistyped path used to produce.
 *
 * Bidirectional evidence: the Given/When/Then carry the SCN-CLI-001 / SCN-CLI-002
 * ids, matching features/cli-balance.feature.
 *
 * @e2e: both scenarios spawn the REAL `spec-controller` binary as a subprocess — the
 * top-level `cli.ts` dispatcher, which routes the `balance` subcommand through the
 * whole pipeline (parse → validate → reconcile → render) with only the public core +
 * app layer present. Asserting the real subprocess's exit code, stdout and stderr —
 * not an in-process call — is what proves the command behaves standalone.
 *
 * The invocation is built from `invocationArgs`, which each Given populates, so the
 * single When step is shared across both scenarios (the .feature reuses its wording).
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

/** The `--flag value` pairs the shared When passes to `balance` (set by each Given). */
let invocationArgs: string[] = [];
/** The path CLI-002's Given points a flag at — asserted verbatim in stderr. */
let missingPath = "";
let cliResult: SpawnSyncReturns<string>;

// @SCN-CLI-001
Given("a target with declared scenarios and a Vitest report of what ran", function () {
  const root = process.cwd();
  assert.ok(existsSync(join(root, FIXTURE.features)), `missing fixture features: ${FIXTURE.features}`);
  assert.ok(existsSync(join(root, FIXTURE.vitest)), `missing fixture vitest report: ${FIXTURE.vitest}`);
  invocationArgs = ["--features", FIXTURE.features, "--vitest", FIXTURE.vitest];
});

// @SCN-CLI-002
Given("a target, and {word} pointing at a path that does not exist", function (flag: string) {
  const root = process.cwd();
  // A real reconcilable target — the ONLY problem is the one supplied bad flag, so a
  // green run would otherwise reconcile. The missing path is unique per flag and must
  // not exist on disk.
  missingPath = `tests/fixtures/does-not-exist/${flag.replace(/^--/, "")}.missing`;
  assert.ok(!existsSync(join(root, missingPath)), `fixture invariant: ${missingPath} must not exist`);
  const args: Record<string, string> = {
    "--features": FIXTURE.features,
    "--vitest": FIXTURE.vitest,
  };
  // Override / add the flag under test with the non-existent path.
  args[flag] = missingPath;
  invocationArgs = Object.entries(args).flatMap(([k, v]) => [k, v]);
});

When("{string} is invoked over that target through the CLI binary", function (command: string) {
  assert.equal(command, "spec-controller balance");
  const root = process.cwd();
  // Spawn the REAL top-level binary entry (packages/spec-controller/src/cli.ts) with
  // the `balance` subcommand — the standalone path, core + app only, no engine.
  cliResult = spawnSync(
    join(root, "node_modules", ".bin", "tsx"),
    [join(root, "packages", "spec-controller", "src", "cli.ts"), "balance", ...invocationArgs],
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

// @SCN-CLI-002
Then("the command exits non-zero", function () {
  assert.notEqual(cliResult.status, 0, `expected a non-zero exit; got ${cliResult.status}\n${cliResult.stdout}`);
});

Then("stderr names {word} and the missing path", function (flag: string) {
  assert.ok(
    cliResult.stderr.includes(flag),
    `expected stderr to name the flag ${flag}; got:\n${cliResult.stderr}`,
  );
  assert.ok(
    cliResult.stderr.includes(missingPath),
    `expected stderr to name the missing path ${missingPath}; got:\n${cliResult.stderr}`,
  );
});

Then("nothing is reconciled", function () {
  // The predicate halts BEFORE runReconcile, so no report is emitted — the terrifying
  // all-red zero-evidence report never appears on stdout.
  assert.doesNotMatch(cliResult.stdout, /Evidence Reconciliation/);
});
