/**
 * @SCN-CLI-001 — `spec-controller balance` runs standalone (core + app, no engine)
 * and emits the Evidence Reconciliation.
 * @SCN-CLI-002 — a supplied input path that does not exist is a hard error (non-zero
 * exit, stderr naming the flag + the missing path, nothing reconciled), not the
 * silent zero-evidence all-red report a mistyped path used to produce.
 * @SCN-CLI-003 — the positive boundary that keeps CLI-002 honest: an OMITTED optional
 * flag (here --cucumber) is not an error — the binary exits zero and reconciles the
 * declared scenarios against whatever evidence WAS supplied.
 *
 * Bidirectional evidence: the Given/When/Then carry the SCN-CLI-001 / SCN-CLI-002 /
 * SCN-CLI-003 ids, matching features/cli-balance.feature.
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

/**
 * The ALL-BALANCED fixture target ([3F-1460] fix-to-canon, 3F-1414) — two @unit scenarios
 * BOTH satisfied by the Vitest report, no phantom, no uncited credit, and a GUARDLESS
 * --package-json so the tool's own lint:* guards don't post an undemanded suspense row.
 * The whole reconciliation is balanced, so `balance` exits 0. Used by CLI-001/003, whose
 * intent is a CLEAN standalone run (exit 0) — now that the gate makes exit 0 mean
 * genuinely balanced, their target must actually be balanced (it used to exit 0 only
 * because balance was a reporter, not a gate).
 */
const BALANCED = {
  features: "tests/fixtures/balanced/features",
  vitest: "tests/fixtures/balanced/vitest.json",
  packageJson: "tests/fixtures/balanced/package.json",
};

/** The `--flag value` pairs the shared When passes to `balance` (set by each Given). */
let invocationArgs: string[] = [];
/** The path CLI-002's Given points a flag at — asserted verbatim in stderr. */
let missingPath = "";
let cliResult: SpawnSyncReturns<string>;

/**
 * Spawn the REAL top-level binary entry (packages/spec-controller/src/cli.ts) with the
 * `balance` subcommand and the given `--flag value` args — the standalone path, core +
 * app only, no engine. Shared by every When so each scenario asserts the real
 * subprocess's exit code / stdout / stderr, not an in-process call.
 */
function spawnBalance(args: string[]): SpawnSyncReturns<string> {
  const root = process.cwd();
  const result = spawnSync(
    join(root, "node_modules", ".bin", "tsx"),
    [join(root, "packages", "spec-controller", "src", "cli.ts"), "balance", ...args],
    { cwd: root, encoding: "utf8" },
  );
  assert.equal(result.error, undefined, `CLI failed to spawn: ${result.error?.message}`);
  return result;
}

// @SCN-CLI-001
Given("a target with declared scenarios and a Vitest report of what ran", function () {
  const root = process.cwd();
  // [3F-1460] fix-to-canon (3F-1414): repointed to the ALL-BALANCED fixture so this clean
  // standalone run genuinely exits 0 under the new gate (was the deliberately out-of-balance
  // fixture, which exited 0 only pre-gate). --package-json is guardless so no suspense row.
  assert.ok(existsSync(join(root, BALANCED.features)), `missing fixture features: ${BALANCED.features}`);
  assert.ok(existsSync(join(root, BALANCED.vitest)), `missing fixture vitest report: ${BALANCED.vitest}`);
  invocationArgs = ["--features", BALANCED.features, "--vitest", BALANCED.vitest, "--package-json", BALANCED.packageJson];
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
  cliResult = spawnBalance(invocationArgs);
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

// @SCN-CLI-003
Given("a target with declared scenarios and a Vitest report", function () {
  const root = process.cwd();
  // A real reconcilable target: declared scenarios (--features) + one evidence report
  // (--vitest). --cucumber is DELIBERATELY omitted — the positive boundary under test.
  // [3F-1460] fix-to-canon (3F-1414): repointed to the ALL-BALANCED fixture so omitting
  // --cucumber stays a clean exit-0 run under the gate (both declared scenarios are @unit,
  // satisfied by --vitest; guardless --package-json so no suspense row). The omitted flag
  // is still not an error — the point of this scenario.
  assert.ok(existsSync(join(root, BALANCED.features)), `missing fixture features: ${BALANCED.features}`);
  assert.ok(existsSync(join(root, BALANCED.vitest)), `missing fixture vitest report: ${BALANCED.vitest}`);
  invocationArgs = ["--features", BALANCED.features, "--vitest", BALANCED.vitest, "--package-json", BALANCED.packageJson];
});

// @SCN-CLI-003
When("{string} is invoked with no --cucumber flag through the CLI binary", function (command: string) {
  assert.equal(command, "spec-controller balance");
  // Invariant: the omission is real — --cucumber must not be among the args. An omitted
  // optional flag must not become a hard error (the CLI-002 predicate returns null for
  // an undefined path even when other flags are supplied and present).
  assert.ok(!invocationArgs.includes("--cucumber"), "fixture invariant: --cucumber must be omitted");
  cliResult = spawnBalance(invocationArgs);
});

// @SCN-CLI-003
Then("it reconciles the declared scenarios against the supplied evidence", function () {
  // Exit-zero alone isn't enough — the reconcile must actually have RUN against the
  // supplied evidence. The Evidence Reconciliation renders to stdout and its Summary
  // counts the fixture's two declared scenarios (SCN-TGT-001 / SCN-TGT-002), proof the
  // omitted --cucumber did not short-circuit the pipeline.
  assert.match(cliResult.stdout, /^# Evidence Reconciliation/m);
  assert.match(cliResult.stdout, /\| Scenario \| 2 \|/);
});

// @SCN-CLI-004
Given("a target that reconciles out-of-balance", function () {
  const root = process.cwd();
  // The shared out-of-balance fixture: it declares SCN-TGT-002 at @integration but the
  // run supplies only --vitest (no --cucumber), so that obligation reconciles as MISSING;
  // it also carries a phantom (SCN-PHANTOM-999) and uncited credits (the suspense row) —
  // so the whole reconciliation is out-of-balance many times over. Reconcilable end-to-end:
  // the ONLY thing wrong is the balance itself, which is exactly what the gate must red.
  assert.ok(existsSync(join(root, FIXTURE.features)), `missing fixture features: ${FIXTURE.features}`);
  assert.ok(existsSync(join(root, FIXTURE.vitest)), `missing fixture vitest report: ${FIXTURE.vitest}`);
  invocationArgs = ["--features", FIXTURE.features, "--vitest", FIXTURE.vitest];
});

// @SCN-CLI-004
Then("the command exits with status {int}", function (code: number) {
  // The EXACT code, not merely non-zero (@SCN-CLI-004): an out-of-balance run must exit
  // exactly 1 so it can't masquerade as the usage error (2, @SCN-CLI-002). The `And it
  // prints the Evidence Reconciliation to stdout` step that follows asserts the report was
  // emitted IN FULL before the exit code was set — the gate sets process.exitCode AFTER
  // writeOutputs and returns, so the report is never truncated by an abrupt process.exit.
  assert.equal(
    cliResult.status,
    code,
    `expected exit ${code}; got ${cliResult.status}\nstdout:\n${cliResult.stdout}\nstderr:\n${cliResult.stderr}`,
  );
});
