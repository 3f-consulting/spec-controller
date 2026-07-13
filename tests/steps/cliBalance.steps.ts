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
import { cliRegistry } from "../../packages/spec-controller/src/cli-registry.js";

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

/**
 * The PENDING-ONLY fixture target (@SCN-CLI-010) — two declared scenarios whose SOLE
 * obligation is a deferred `<quality-check>pending` one, so each partitions off to a
 * one-sided Pending Item (run-neutral by default — slice 2 / @SCN-PND-008), leaving ZERO
 * reconciled rows; no observation, no phantom, no uncited credit, and a GUARDLESS
 * --package-json so no suspense row. The WHOLE reconciliation is balanced-with-pending, so
 * `balance` exits 0 when --strict is NOT given (the lenient default this scenario pins).
 */
const PENDING_ONLY = {
  features: "tests/fixtures/pending-only/features",
  packageJson: "tests/fixtures/pending-only/package.json",
};

/**
 * The BROKEN fixture target (@SCN-CLI-012) — one declared @unit scenario whose proving
 * suite FAILED TO COLLECT: the vitest report carries that file with `status: "failed"`,
 * a collection-error `message` and ZERO assertionResults (an adopter's repository dogfood fault,
 * 3F-1642). The reader posts a `broken` suspense item; the scenario reads `missing`. A
 * GUARDLESS --package-json so the ONLY suspense item is the broken one. The run is BOTH
 * out-of-balance AND unsound — the exact collision the exit-4 pre-emption resolves.
 */
const BROKEN = {
  features: "tests/fixtures/broken/features",
  vitest: "tests/fixtures/broken/vitest.json",
  packageJson: "tests/fixtures/broken/package.json",
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
  // The fixture declares SCN-TGT-001 / SCN-TGT-002; the Summary's Scenario Reconciliation
  // row must count them — proof the whole reconcile ran end-to-end through the binary.
  // (Subject label renamed by 3F-1726; the fixture is declared-only, so the COUNT is
  // unchanged — the same fact, the manifesto's spelling.)
  assert.match(cliResult.stdout, /\| Scenario Reconciliation \| 2 \|/);
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
  // omitted --cucumber did not short-circuit the pipeline. (Subject label renamed by
  // 3F-1726; declared-only fixture, so the COUNT is unchanged — the same fact.)
  assert.match(cliResult.stdout, /^# Evidence Reconciliation/m);
  assert.match(cliResult.stdout, /\| Scenario Reconciliation \| 2 \|/);
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

// @SCN-CLI-005
Given("a target that reconciles all-balanced", function () {
  const root = process.cwd();
  // The POSITIVE BOUNDARY (@SCN-CLI-005) that keeps CLI-004 honest: the ALL-BALANCED
  // fixture — two @unit declared scenarios BOTH satisfied by --vitest, no phantom, no
  // uncited credit, and a GUARDLESS --package-json so no suspense-row watermelon. The
  // WHOLE reconciliation is balanced, so the new fail-on-out-of-balance gate must NOT
  // over-fire: it leaves process.exitCode at its default 0. Reuses the shared When and
  // the `exits with status {int}` Then (CLI-004, byte-untouched) — only the target shape
  // is distinct from CLI-004's out-of-balance Given.
  assert.ok(existsSync(join(root, BALANCED.features)), `missing fixture features: ${BALANCED.features}`);
  assert.ok(existsSync(join(root, BALANCED.vitest)), `missing fixture vitest report: ${BALANCED.vitest}`);
  invocationArgs = ["--features", BALANCED.features, "--vitest", BALANCED.vitest, "--package-json", BALANCED.packageJson];
});

// @SCN-CLI-012
Given("a target whose vitest report carries a collection-failed suite", function () {
  const root = process.cwd();
  // The BROKEN fixture (3F-1642): the declared scenario's proving suite FAILED TO COLLECT —
  // the vitest report carries the file with `status: "failed"` and ZERO assertionResults, so
  // the reader posts a `broken` suspense item and the scenario itself reads `missing`. The run
  // is therefore BOTH out-of-balance (the broken item is a suspense-row reconciling item) and
  // UNSOUND — which is precisely the trap: under the old dominance order it exited 1 and the
  // collection failure was indistinguishable from an honest disagreement. A guardless
  // --package-json keeps the ONLY suspense item the broken one, so exit 4 can only come from
  // the broken evidence.
  assert.ok(existsSync(join(root, BROKEN.features)), `missing fixture features: ${BROKEN.features}`);
  assert.ok(existsSync(join(root, BROKEN.vitest)), `missing fixture vitest report: ${BROKEN.vitest}`);
  invocationArgs = [
    "--features",
    BROKEN.features,
    "--vitest",
    BROKEN.vitest,
    "--package-json",
    BROKEN.packageJson,
  ];
});

// @SCN-CLI-010
Given("a target whose only exception is Pending Items", function () {
  const root = process.cwd();
  // The PENDING-ONLY fixture: every declared scenario's sole obligation is a deferred
  // `<quality-check>pending` one, so each partitions off to a one-sided Pending Item
  // (run-neutral by default — slice 2 / @SCN-PND-008), leaving ZERO reconciled rows. No
  // observation, no phantom, no uncited credit, and a GUARDLESS --package-json so no
  // suspense-row watermelon — the WHOLE reconciliation is balanced-with-pending. The
  // lenient default (@SCN-CLI-010) must NOT escalate: with no --strict, `isBalanced` sees
  // no reconciling item anywhere, so process.exitCode stays 0. Distinct from CLI-005's
  // all-balanced target (that one carries NO Pending Item) — this pins that Pending Items
  // specifically are run-neutral without --strict, not merely that a clean run exits 0.
  assert.ok(existsSync(join(root, PENDING_ONLY.features)), `missing fixture features: ${PENDING_ONLY.features}`);
  assert.ok(
    existsSync(join(root, PENDING_ONLY.packageJson)),
    `missing fixture package.json: ${PENDING_ONLY.packageJson}`,
  );
  invocationArgs = ["--features", PENDING_ONLY.features, "--package-json", PENDING_ONLY.packageJson];
});

// @SCN-CLI-010
Then("the reconciliation reports a Pending Item", function () {
  // Keeps the scenario honest: exit 0 must come from a balanced-WITH-pending run, not a
  // trivially empty one. The markdown tally line (renderPendingItem / the summary Pending
  // Items line, @SCN-PND-010/011) proves the fixture genuinely carried a deferred
  // obligation the lenient default declined to escalate.
  assert.match(cliResult.stdout, /Pending Item/);
});

// @SCN-CLI-011
// The --strict ESCALATION over the SAME pending-only fixture as CLI-010: with --strict the
// otherwise-balanced-with-pending run exits the DISTINCT code 3 (taxonomy 0/1/2/3 — a
// Pending Item is not out-of-balance, so it must never share 1). Distinct step wording
// ("invoked with --strict over …") from CLI-010's shared When so the two never cross-match;
// appends --strict to the pending-only invocationArgs the shared CLI-010 Given built, and
// spawns the real binary. Reuses the exact-code Then (`exits with status 3`, @SCN-CLI-004)
// and the `prints … to stdout` / `reports a Pending Item` Thens — the report must flush IN
// FULL before the exit code is set (process.exitCode, never process.exit), exactly the
// 3F-1414 pattern the CLI-004 exact-code Then relies on.
When(
  "{string} is invoked with --strict over that target through the CLI binary",
  function (command: string) {
    assert.equal(command, "spec-controller balance");
    cliResult = spawnBalance([...invocationArgs, "--strict"]);
  },
);

// @SCN-CLI-006
Given("the spec-controller binary", function () {
  // No fixture target needed: `balance --help` is answered from the registry BEFORE any
  // reconcile, so there is nothing to reconcile. The shared When spawns the real binary.
  invocationArgs = ["--help"];
});

// @SCN-CLI-006
When("{string} is invoked", function (command: string) {
  assert.equal(command, "spec-controller balance --help");
  cliResult = spawnBalance(invocationArgs);
});

// @SCN-CLI-006
Then("it exits 0 and prints each registered balance flag with its description", function () {
  assert.equal(cliResult.status, 0, `expected exit 0; got ${cliResult.status}\n${cliResult.stderr}`);
  const balanceFlags = cliRegistry.commands.find((c) => c.name === "balance")?.flags ?? [];
  // Non-vacuous: the registry must register balance's whole flag scope (9 flags + --help/-h),
  // else there is nothing to prove appeared. This reds in Discovery (empty registry stub) and
  // greens when the Implementation phase populates the registry.
  assert.ok(
    balanceFlags.length >= 10,
    `registry must register balance's flags; got ${balanceFlags.length}`,
  );
  // The real binary's stdout lists every registered flag with its description — proof the
  // registry is the single source `balance --help` renders from, over the actual subprocess.
  for (const flag of balanceFlags) {
    assert.ok(
      cliResult.stdout.includes(flag.name),
      `expected stdout to list ${flag.name}; got:\n${cliResult.stdout}`,
    );
    assert.ok(
      cliResult.stdout.includes(flag.description),
      `expected stdout to describe ${flag.name}; got:\n${cliResult.stdout}`,
    );
  }
});

// @SCN-CLI-007
/**
 * The top-level surface: `spec-controller --help` (no subcommand) must list the
 * registered COMMANDS and document the GLOBAL host modifiers (`--store` / `--run-id`),
 * rendered from the registry's global scope — not the hand-kept USAGE string. Spawns the
 * real binary WITHOUT the `balance` subcommand (distinct from CLI-006's `spawnBalance`),
 * and asserts the registry's exact command summaries + global-modifier descriptions appear
 * verbatim — the registry-SOURCED proof (the wrapped hand-kept USAGE breaks those exact
 * strings across lines, so this reds until the top-level help renders from the registry).
 */
let topLevelArgs: string[] = [];
let controllerResult: SpawnSyncReturns<string>;

/** Spawn the real top-level binary with NO subcommand — the `spec-controller <flags>` path. */
function spawnController(args: string[]): SpawnSyncReturns<string> {
  const root = process.cwd();
  const result = spawnSync(
    join(root, "node_modules", ".bin", "tsx"),
    [join(root, "packages", "spec-controller", "src", "cli.ts"), ...args],
    { cwd: root, encoding: "utf8" },
  );
  assert.equal(result.error, undefined, `CLI failed to spawn: ${result.error?.message}`);
  return result;
}

// @SCN-CLI-007
Given("the spec-controller top-level binary", function () {
  // No subcommand, no fixture: `--help` is answered by the dispatcher BEFORE any command.
  topLevelArgs = ["--help"];
});

// @SCN-CLI-007
When("{string} is run", function (command: string) {
  assert.equal(command, "spec-controller --help");
  controllerResult = spawnController(topLevelArgs);
});

// @SCN-CLI-007
Then(
  "it exits 0, lists each registered command, and documents the global --store and --run-id modifiers",
  function () {
    assert.equal(
      controllerResult.status,
      0,
      `expected exit 0; got ${controllerResult.status}\n${controllerResult.stderr}`,
    );
    const out = controllerResult.stdout;
    // Registry-SOURCED: every registered command appears by name AND with its EXACT
    // registry summary as one contiguous string. The wrapped hand-kept USAGE breaks the
    // summary across a newline, so this is the genuine red the registry rendering closes.
    assert.ok(cliRegistry.commands.length > 0, "registry must register at least one command");
    for (const command of cliRegistry.commands) {
      assert.ok(out.includes(command.name), `expected top-level --help to list ${command.name}; got:\n${out}`);
      assert.ok(
        out.includes(command.summary),
        `expected top-level --help to carry ${command.name}'s exact registry summary; got:\n${out}`,
      );
    }
    // The global host-modifier scope: both `--store` and `--run-id` documented, each with
    // its EXACT registry description contiguous (the wrapped USAGE breaks --store's).
    assert.ok(cliRegistry.global.length >= 2, "registry must register the global --store/--run-id modifiers");
    for (const flag of cliRegistry.global) {
      assert.ok(out.includes(flag.name), `expected top-level --help to document ${flag.name}; got:\n${out}`);
      assert.ok(
        out.includes(flag.description),
        `expected top-level --help to carry ${flag.name}'s exact registry description; got:\n${out}`,
      );
    }
    assert.ok(out.includes("--store"), `expected top-level --help to document --store; got:\n${out}`);
    assert.ok(out.includes("--run-id"), `expected top-level --help to document --run-id; got:\n${out}`);
  },
);

// @SCN-CLI-009
// The registry-bounded parser: `balance` accepts ONLY its registered flags; an
// unregistered flag (a typo `--bogus`) is a usage error — exit 2 (3F-1414's 0/1/2
// taxonomy), stderr naming the flag, BEFORE any reconcile. Distinct step wording from
// CLI-006's `--help` steps (which assert `spec-controller balance --help`), so the two
// scenarios never cross-match. Reuses the shared `spawnBalance` real-subprocess helper.
Given("the spec-controller balance command", function () {
  // The unregistered flag under test — a bare typo, no other args needed: the bounded
  // parser rejects it before any reconcile, so no fixture target is required.
  invocationArgs = ["--bogus"];
});

// @SCN-CLI-009
When("{string} is run through the CLI binary", function (command: string) {
  assert.equal(command, "spec-controller balance --bogus");
  cliResult = spawnBalance(invocationArgs);
});

// @SCN-CLI-009
Then("it exits with status 2 naming the unrecognised flag --bogus on stderr", function () {
  // EXACTLY 2 — the usage code (3F-1414 / 3F-1405): an unregistered flag must never
  // masquerade as the out-of-balance verdict (1) nor be silently swallowed (0). stderr
  // names the offending flag so the operator sees the typo.
  assert.equal(
    cliResult.status,
    2,
    `expected exit 2; got ${cliResult.status}\nstdout:\n${cliResult.stdout}\nstderr:\n${cliResult.stderr}`,
  );
  assert.ok(
    cliResult.stderr.includes("--bogus"),
    `expected stderr to name the unknown flag --bogus; got:\n${cliResult.stderr}`,
  );
});

// @SCN-CLI-009
Then("nothing is reconciled to stdout", function () {
  // The bounded parser rejects BEFORE runReconcile, so no Evidence Reconciliation is
  // emitted — the unregistered flag never runs balance against zero evidence.
  assert.doesNotMatch(cliResult.stdout, /Evidence Reconciliation/);
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
