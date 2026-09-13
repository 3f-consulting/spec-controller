/**
 * @SCN-CLI-001 — `spec-controller balance` runs standalone (core + app, no engine)
 * and emits the Evidence Reconciliation.
 * @SCN-CLI-002 — a supplied input path that does not exist is a hard error (non-zero
 * exit, stderr naming the flag + the missing path, nothing reconciled), not the
 * silent zero-evidence all-red report a mistyped path used to produce.
 * @SCN-CLI-003 — the positive boundary that keeps CLI-002 honest: an OMITTED optional
 * flag (here --cucumber) is not an error — the binary exits zero and reconciles the
 * scenarios against whatever evidence WAS supplied.
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
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { cliRegistry } from "../../packages/spec-controller/src/cli-registry.js";

/** The reconcilable fixture target — scenarios + a Vitest report. */
const FIXTURE = {
  features: "tests/fixtures/evidence-observation/features",
  vitest: "tests/fixtures/evidence-observation/vitest.json",
};

/**
 * The ALL-BALANCED fixture target ([3F-1460] fix-to-canon, 3F-1414) — two @unit scenarios
 * BOTH satisfied by the Vitest report, no phantom, no uncited credit, and a GUARDLESS
 * --package-json so the tool's own lint:* guards don't post a no-evidence-obligation suspense row.
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
 * The PENDING-ONLY fixture target (@SCN-CLI-010) — two scenarios whose SOLE
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
 * The BROKEN fixture target (@SCN-CLI-012) — one @unit scenario whose proving
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

/**
 * The SUSPENSE-ONLY fixture target (@SCN-CLI-013) — an adopter's repository `17-36-50Z` shape, the run that
 * started 3F-1703. EVERY SCENARIO BALANCES (both @unit obligations satisfied by the
 * vitest report; no phantom; no collection failure, so the run is SOUND and exit 4 never
 * pre-empts). The ONE reconciling item in the whole run sits on the SUSPENSE row: the target's
 * CI runs `lint:uncited` and no scenario NAMES `@lint=lint:uncited`, so the guard
 * is an uncited static-check — an uncited credit posted to the `(no scenario)` row.
 *
 * The shape no other fixture in the suite has, and the ONLY one that can catch the drift: the
 * SCENARIO-ONLY tally reads a clean `2 | 2 | 0` while the run genuinely exits 1. That is the
 * false green the operator and Cowork both read as a clean board. Unlike BALANCED, it needs
 * BOTH a guardFUL --package-json and a --ci that runs the guard — the guard must be RUNNING
 * (present as a script AND invoked by a CI step) to post its uncited credit.
 */
const SUSPENSE_ONLY = {
  features: "tests/fixtures/suspense-only/features",
  vitest: "tests/fixtures/suspense-only/vitest.json",
  packageJson: "tests/fixtures/suspense-only/package.json",
  ci: "tests/fixtures/suspense-only/ci.yml",
};


/**
 * `--ci` NAMED AT THE FIXTURE'S OWN DIRECTORY, WHICH HOLDS NO WORKFLOW — the isolation these
 * targets used to get by accident (@SCN-USG-004, 3F-3343). The flag defaults to
 * `.github/workflows` resolved against the cwd, and these runs stand in THIS tree, so a run that
 * omits it reads spec-controller's own pipeline. That was harmless while discovery keyed on a
 * script prefix: none of those steps invokes a script of a FIXTURE's manifest, so nothing was
 * found. Every step is a candidate now, so the default would bank this repository's own checks on
 * a fixture's ledger — and a guardless `--package-json` no longer buys the silence it was chosen
 * for. Naming the fixture is what makes the run about the fixture.
 */
const NO_WORKFLOWS = (fixtureDir: string): string[] => ["--ci", fixtureDir];

/** The `--flag value` pairs the shared When passes to `balance` (set by each Given). */
let invocationArgs: string[] = [];
/** The path CLI-002's Given points a flag at — asserted verbatim in stderr. */
let missingPath = "";
/** The directory the next spawn runs IN, set by a Given whose target is not this tree (CLI-017). */
let invocationCwd: string | undefined;
let cliResult: SpawnSyncReturns<string>;

/**
 * Spawn the REAL top-level binary entry (packages/spec-controller/src/cli.ts) with the
 * `balance` subcommand and the given `--flag value` args — the standalone path, core +
 * app only, no engine. Shared by every When so each scenario asserts the real
 * subprocess's exit code / stdout / stderr, not an in-process call.
 */
function spawnBalance(args: string[]): SpawnSyncReturns<string> {
  const root = process.cwd();
  // The target the run STANDS IN, which is not always the tool's own tree: every flag `balance`
  // reads has a default resolved against the cwd, so the target-shaped defaults (--features,
  // --package-json, --ci) are only reachable by running somewhere else (@SCN-CLI-017). Consumed
  // here rather than read, so one Given's target can never leak into the next scenario's run.
  const cwd = invocationCwd ?? root;
  invocationCwd = undefined;
  const result = spawnSync(
    join(root, "node_modules", ".bin", "tsx"),
    [join(root, "packages", "spec-controller", "src", "cli.ts"), "balance", ...args],
    { cwd, encoding: "utf8" },
  );
  assert.equal(result.error, undefined, `CLI failed to spawn: ${result.error?.message}`);
  return result;
}

// @SCN-CLI-001
Given("a target with scenarios and a Vitest report of what ran", function () {
  const root = process.cwd();
  // [3F-1460] fix-to-canon (3F-1414): repointed to the ALL-BALANCED fixture so this clean
  // standalone run genuinely exits 0 under the new gate (was the deliberately out-of-balance
  // fixture, which exited 0 only pre-gate). --package-json is guardless so no suspense row.
  assert.ok(existsSync(join(root, BALANCED.features)), `missing fixture features: ${BALANCED.features}`);
  assert.ok(existsSync(join(root, BALANCED.vitest)), `missing fixture vitest report: ${BALANCED.vitest}`);
  invocationArgs = ["--features", BALANCED.features, "--vitest", BALANCED.vitest, "--package-json", BALANCED.packageJson, ...NO_WORKFLOWS("tests/fixtures/balanced")];
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
  // The fixture carries SCN-TGT-001 / SCN-TGT-002; the Summary's Scenario Reconciliation
  // row must count them — proof the whole reconcile ran end-to-end through the binary.
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
Given("a target with scenarios and a Vitest report", function () {
  const root = process.cwd();
  // A real reconcilable target: scenarios (--features) + one evidence report
  // (--vitest). --cucumber is DELIBERATELY omitted — the positive boundary under test.
  // [3F-1460] fix-to-canon (3F-1414): repointed to the ALL-BALANCED fixture so omitting
  // --cucumber stays a clean exit-0 run under the gate (both scenarios are @unit,
  // satisfied by --vitest; guardless --package-json so no suspense row). The omitted flag
  // is still not an error — the point of this scenario.
  assert.ok(existsSync(join(root, BALANCED.features)), `missing fixture features: ${BALANCED.features}`);
  assert.ok(existsSync(join(root, BALANCED.vitest)), `missing fixture vitest report: ${BALANCED.vitest}`);
  invocationArgs = ["--features", BALANCED.features, "--vitest", BALANCED.vitest, "--package-json", BALANCED.packageJson, ...NO_WORKFLOWS("tests/fixtures/balanced")];
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
Then("it reconciles the scenarios against the supplied evidence", function () {
  // Exit-zero alone isn't enough — the reconcile must actually have RUN against the
  // supplied evidence. The Evidence Reconciliation renders to stdout and its Summary
  // counts the fixture's two scenarios (SCN-TGT-001 / SCN-TGT-002), proof the
  // omitted --cucumber did not short-circuit the pipeline.
  assert.match(cliResult.stdout, /^# Evidence Reconciliation/m);
  assert.match(cliResult.stdout, /\| Scenario Reconciliation \| 2 \|/);
});

// @SCN-CLI-004
Given("a target that reconciles out-of-balance", function () {
  const root = process.cwd();
  // The shared out-of-balance fixture: it NAMES SCN-TGT-002 at @integration but the
  // run supplies only --vitest (no --cucumber), so that obligation reconciles as MISSING;
  // it also carries a phantom (SCN-PHANTOM-999) and uncited credits (the suspense row) —
  // so the whole reconciliation is out-of-balance many times over. Reconcilable end-to-end:
  // the ONLY thing wrong is the balance itself, which is exactly what the gate must red.
  assert.ok(existsSync(join(root, FIXTURE.features)), `missing fixture features: ${FIXTURE.features}`);
  assert.ok(existsSync(join(root, FIXTURE.vitest)), `missing fixture vitest report: ${FIXTURE.vitest}`);
  invocationArgs = [
    "--features",
    FIXTURE.features,
    "--vitest",
    FIXTURE.vitest,
    ...NO_WORKFLOWS("tests/fixtures/evidence-observation"),
  ];
});

// @SCN-CLI-005
Given("a target that reconciles all-balanced", function () {
  const root = process.cwd();
  // The POSITIVE BOUNDARY (@SCN-CLI-005) that keeps CLI-004 honest: the ALL-BALANCED
  // fixture — two @unit scenarios BOTH satisfied by --vitest, no phantom, no
  // uncited credit, and a GUARDLESS --package-json so no suspense-row watermelon. The
  // WHOLE reconciliation is balanced, so the new fail-on-out-of-balance gate must NOT
  // over-fire: it leaves process.exitCode at its default 0. Reuses the shared When and
  // the `exits with status {int}` Then (CLI-004, byte-untouched) — only the target shape
  // is distinct from CLI-004's out-of-balance Given.
  assert.ok(existsSync(join(root, BALANCED.features)), `missing fixture features: ${BALANCED.features}`);
  assert.ok(existsSync(join(root, BALANCED.vitest)), `missing fixture vitest report: ${BALANCED.vitest}`);
  invocationArgs = ["--features", BALANCED.features, "--vitest", BALANCED.vitest, "--package-json", BALANCED.packageJson, ...NO_WORKFLOWS("tests/fixtures/balanced")];
});

// @SCN-CLI-012
Given("a target whose vitest report carries a collection-failed suite", function () {
  const root = process.cwd();
  // The BROKEN fixture (3F-1642): the scenario's proving suite FAILED TO COLLECT —
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
    ...NO_WORKFLOWS("tests/fixtures/broken"),
  ];
});

// @SCN-CLI-010
Given("a target whose only exception is Pending Items", function () {
  const root = process.cwd();
  // The PENDING-ONLY fixture: every scenario's sole obligation is a deferred
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
  invocationArgs = [
    "--features",
    PENDING_ONLY.features,
    "--package-json",
    PENDING_ONLY.packageJson,
    ...NO_WORKFLOWS("tests/fixtures/pending-only"),
  ];
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

/**
 * @SCN-CLI-006 — `<command> --help` is per-command (3F-3298). The command token is read
 * out of the invocation the scenario names, the spawn is built from it, and the expected
 * flag scope is looked up BY it — so nothing in this block is `balance` by construction.
 * Ask it about a second registered command and it asks the binary about that command;
 * the old block spelt `balance` in the spawn, in the assertion and in the step wording.
 */
let helpCommand = "";

// @SCN-CLI-006
Given("the spec-controller binary", function () {
  // No fixture target: `<command> --help` is answered from the registry BEFORE the command
  // does any work of its own, so there is nothing to reconcile. The When names the command.
  helpCommand = "";
});

// @SCN-CLI-006
When("{string} is invoked", function (invocation: string) {
  const [binary, command, ...rest] = invocation.split(" ");
  assert.equal(binary, "spec-controller");
  assert.ok(command, `expected a command token in the invocation; got "${invocation}"`);
  assert.deepEqual(rest, ["--help"], `expected a <command> --help invocation; got "${invocation}"`);
  helpCommand = command;
  cliResult = spawnController([helpCommand, "--help"]);
});

// @SCN-CLI-006
Then(
  "it exits 0 and prints each flag the registry gives that command, with its description",
  function () {
    assert.equal(cliResult.status, 0, `expected exit 0; got ${cliResult.status}\n${cliResult.stderr}`);
    const entry = cliRegistry.commands.find((c) => c.name === helpCommand);
    // Non-vacuous twice over: the registry must REGISTER the command the scenario invoked,
    // and give it a flag scope — else there is nothing to prove appeared and the loop below
    // would pass over an empty list.
    assert.ok(entry, `the registry must register the command "${helpCommand}"`);
    assert.ok(
      entry.flags.length > 0,
      `the registry must give "${helpCommand}" a flag scope; got ${entry.flags.length}`,
    );
    // The real binary's stdout lists every flag the registry gives THAT command, with its
    // description — proof the registry is the single source `<command> --help` renders
    // from, over the actual subprocess.
    for (const flag of entry.flags) {
      assert.ok(
        cliResult.stdout.includes(flag.name),
        `expected stdout to list ${flag.name}; got:\n${cliResult.stdout}`,
      );
      assert.ok(
        cliResult.stdout.includes(flag.description),
        `expected stdout to describe ${flag.name}; got:\n${cliResult.stdout}`,
      );
    }
  },
);

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

// @SCN-CLI-013
// THE ANTI-DRIFT INVARIANT — the guard that would have CAUGHT 3F-1703 rather than fixed it.
//
// The bug was THREE VIEWS OF ONE RUN DISAGREEING. Each view was internally consistent, and
// NOTHING pinned them together, so they drifted: the tally said `141 | 141 | 0` (a pass), the
// verdict was out-of-balance, and the process exited 1. A failing run read as a clean board for
// as long as anyone cared to look. The three views are:
//
//   1. THE TALLY      — the Evidence reconciliation table's Scenario Reconciliation row
//                       (`summary.scenarioReconciliations.outOfBalance`, assemble/report.ts),
//   2. THE HEADLINE   — the `### Run verdict` line and the exit code it NAMES
//                       (`runVerdictSection`, render/markdown.ts),
//   3. THE EXIT CODE  — what the PROCESS actually returns (the dominance ladder in
//                       cli-balance/cli.ts).
//
// Three INDEPENDENT derivations, deliberately left independent — unifying them would make drift
// impossible by construction but would also make this guard unable to see it. Pinning them
// TOGETHER is the point: no future change can move one without moving the others.
//
// THE EXIT CODE IS CAPTURED DIRECTLY OFF THE CLI PROCESS — `spawnSync(...).status` is the status
// of the `spec-controller` process ITSELF (see `spawnBalance`). It is NEVER read off a pipeline:
// `cmd | head; echo $?` reports HEAD's status and reads 0 on a failing run, laundering a failure
// into a pass (lived while verifying 3F-1642 — a piped check reported exit 0 for a run that
// genuinely exits 4). A guard that cannot see a failure is the very thing this scenario exists
// to prevent, so there is no pipe, no `tee`, no `grep` between the CLI and the status read.

// @SCN-CLI-013
Given("a target whose only out-of-balance row is the suspense reconciliation", function () {
  const root = process.cwd();
  // The SUSPENSE-ONLY fixture (an adopter's repository 17-36-50Z shape): every scenario balances, and
  // the run's ONLY reconciling item is the uncited static-check's uncited credit on the
  // `(no scenario)` suspense row. --ci and --package-json are BOTH required: a guard posts its
  // uncited credit only when it is RUNNING (a package.json script that a CI step invokes).
  for (const path of Object.values(SUSPENSE_ONLY)) {
    assert.ok(existsSync(join(root, path)), `missing fixture input: ${path}`);
  }
  invocationArgs = [
    "--features",
    SUSPENSE_ONLY.features,
    "--vitest",
    SUSPENSE_ONLY.vitest,
    "--package-json",
    SUSPENSE_ONLY.packageJson,
    "--ci",
    SUSPENSE_ONLY.ci,
  ];
});

/**
 * VIEW 1 — the tally. The Evidence reconciliation table's Scenario Reconciliation row, parsed out
 * of the REAL binary's stdout: `| Scenario Reconciliation | <total> | <balanced> | <outOfBalance> |`.
 */
function tallyOutOfBalance(stdout: string): number {
  const row = stdout.match(/^\| Scenario Reconciliation \| (\d+) \| (\d+) \| (\d+) \|/m);
  assert.ok(row, `expected a Scenario Reconciliation tally row in stdout; got:\n${stdout}`);
  return Number(row[3]);
}

/**
 * VIEW 2 — the headline. The `### Run verdict` line: its VERDICT WORD and the EXIT CODE IT NAMES
 * (`**OUT-OF-BALANCE** — … (exit 1)`). Both halves are parsed, because the drift this guard
 * catches can move either one.
 */
function verdictHeadline(stdout: string): { word: string; exit: number } {
  const headline = stdout.match(/^\*\*(BALANCED|OUT-OF-BALANCE|UNSOUND)\*\* — .*\(exit (\d+)\)$/m);
  assert.ok(headline, `expected a run-verdict headline in stdout; got:\n${stdout}`);
  return { word: String(headline[1]), exit: Number(headline[2]) };
}

// @SCN-CLI-013
Then("the trial-balance table counts {int} out-of-balance Scenario Reconciliation", function (count: number) {
  // The tally counts EVERY Scenario Reconciliation (@SCN-RMD-001, 3F-1724), so the suspense row
  // — always out-of-balance — is IN the count. It reads 1, never the 0 the retracted scenario-only
  // tally gave, which is what made a failing run look like a pass.
  assert.equal(
    tallyOutOfBalance(cliResult.stdout),
    count,
    `expected the tally to count ${count} out-of-balance Scenario Reconciliation; got:\n${cliResult.stdout}`,
  );
});

// @SCN-CLI-013
Then("the verdict headline reads {word} and names exit {int}", function (word: string, exit: number) {
  const headline = verdictHeadline(cliResult.stdout);
  assert.equal(headline.word, word, `expected the headline to read ${word}; got ${headline.word}`);
  assert.equal(headline.exit, exit, `expected the headline to name exit ${exit}; got exit ${headline.exit}`);
});

// @SCN-CLI-013
Then("the tally, the verdict headline and the process exit code agree", function () {
  // THE INVARIANT ITSELF — the cross-check the three literal assertions above cannot make. Each of
  // them pins ONE view against a constant; this pins the views against EACH OTHER, so the guard
  // reds if any ONE of the three is changed without the others (the drift it exists to catch).
  const tally = tallyOutOfBalance(cliResult.stdout);
  const headline = verdictHeadline(cliResult.stdout);
  // `status` is the status of the CLI PROCESS ITSELF — spawnSync, never a pipeline (see the block
  // comment above; a piped `$?` reads the LAST command's status and launders a failure into a pass).
  const exitCode = cliResult.status;

  // The headline names the code the process actually returns. Drift here is the 3F-1642 shape: a
  // report saying exit 1 while the process exits 4.
  assert.equal(
    exitCode,
    headline.exit,
    `the headline names exit ${headline.exit} but the process exited ${exitCode}`,
  );
  // The tally agrees with the verdict: a run with a non-zero exit has an out-of-balance count that
  // is non-zero, and a run that exits 0 has a tally of 0. Drift here is the 3F-1703 shape itself: a
  // `141 | 141 | 0` tally on a run that exits 1.
  assert.equal(
    tally > 0,
    exitCode !== 0,
    `the tally counts ${tally} out-of-balance but the process exited ${exitCode} — the tally and the exit code disagree`,
  );
  // And the headline WORD agrees with the tally: a pass word ("BALANCED") can never sit above a
  // non-zero out-of-balance count — the false green a reader takes at face value.
  assert.equal(
    headline.word === "BALANCED",
    tally === 0,
    `the headline reads ${headline.word} but the tally counts ${tally} out-of-balance`,
  );
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

/**
 * @SCN-CLI-014 — a present-but-UNPARSEABLE report is a usage error (exit 2), never the
 * out-of-balance verdict (exit 1). Sibling of CLI-002's missing path: existence was
 * already guarded, READABILITY was not, so the reader threw mid-parse and Node's default
 * exit 1 made a crashed invocation indistinguishable from an honest disagreement (3F-1742).
 *
 * @e2e: spawns the REAL binary (the shared When), because the process exit code is the ONLY
 * place the collision is observable — an in-process call cannot see it.
 */

/** The unparseable report CLI-014's Given writes — asserted verbatim in stderr. */
let unparseablePath = "";

// @SCN-CLI-014
Given(
  "a target, and --vitest pointing at a report that exists but is not valid JSON",
  function () {
    const root = process.cwd();
    // A real reconcilable target — the ONLY problem is that the supplied report, though
    // PRESENT (so CLI-002's existence guard passes it), holds content that is not JSON.
    unparseablePath = join(tmpdir(), `scn-cli-014-${process.pid}.json`);
    writeFileSync(unparseablePath, "not valid json at all {{{");

    assert.ok(existsSync(unparseablePath), "the fixture report must EXIST — this is not the missing-path case");
    invocationArgs = [
      "--features",
      join(root, BALANCED.features),
      "--vitest",
      unparseablePath,
    ];
  },
);

/**
 * @SCN-CLI-016 — the OBLIGATION side of the same rule (3F-1767). The feature corpus is an input
 * too: the ledger's DEBIT side. It was read by a hand-rolled TAG-LINE SCAN that never looked
 * for a `Scenario:` header, so a malformed tag line stopped being a tag line and its scenario
 * CEASED TO EXIST. One stray character — in a file cucumber itself rejects — deleted a failing
 * row and turned an out-of-balance run (exit 1) into a clean BALANCED (exit 0).
 *
 * @e2e is the TEETH: only the subprocess EXIT CODE shows the false-green flipping to a refusal.
 * A unit test on the validator cannot see it — the bug was that the corpus reader never
 * consulted a parser at all.
 */

/** The corrupt feature file CLI-016's Given writes — asserted verbatim in stderr. */
let unparseableFeature = "";

// @SCN-CLI-016
Given(
  "--features containing a feature file that is a corrupt tag line",
  function () {
    // THE HEADLINE PROOF: one stray character. Valid to the old tag scan's eyes (it simply
    // stopped seeing a tag line); a PARSE ERROR to cucumber ("A tag may not contain whitespace").
    writeCorruptFeature(
      "@AAA\nFeature: alpha\n\n  @unit @SCN-AAA-001\n  Scenario: alpha works\n    Given a thing\n\n" +
        "  @unit @SCN-AAA-002 x\n  Scenario: beta works\n    Given another thing\n",
    );
  },
);

// @SCN-CLI-016
Given(
  "--features containing a feature file that is a corrupt scenario keyword",
  function () {
    // The old scan had no notion of a Scenario: header, so this was invisible ENTIRELY.
    writeCorruptFeature(
      "@AAA\nFeature: alpha\n\n  @unit @SCN-AAA-001\n  Scenario: alpha works\n    Given a thing\n\n" +
        "  @unit @SCN-AAA-002\n  Scenari0: beta works\n    Given another thing\n",
    );
  },
);

// @SCN-CLI-016
Given(
  "--features containing a feature file that is wholly unparseable",
  function () {
    writeCorruptFeature("not gherkin at all {{{\n");
  },
);

/**
 * Write a corrupt feature file into a throwaway target, alongside a vitest report that PASSES
 * for the surviving scenario. That pairing is what makes the fixture teeth-bearing: with the
 * corpus corrupted, the run would otherwise reconcile clean and exit 0 — the false-green.
 */
function writeCorruptFeature(featureSource: string): void {
  const dir = mkdtempSync(join(tmpdir(), `scn-cli-016-${process.pid}-`));
  mkdirSync(join(dir, "features"), { recursive: true });
  unparseableFeature = join(dir, "features", "target.feature");
  writeFileSync(unparseableFeature, featureSource);

  const vitestReport = join(dir, "vitest.json");
  writeFileSync(
    vitestReport,
    JSON.stringify({
      testResults: [
        {
          name: "/x/a.test.ts",
          status: "passed",
          assertionResults: [
            { fullName: "[SCN-AAA-001] alpha works", title: "alpha works", status: "passed" },
          ],
        },
      ],
    }),
  );
  const packageJson = join(dir, "package.json");
  writeFileSync(packageJson, JSON.stringify({ name: "fixture", scripts: {} }));

  invocationArgs = [
    "--features",
    join(dir, "features"),
    "--vitest",
    vitestReport,
    "--package-json",
    packageJson,
  ];
}

// @SCN-CLI-016
Then("stderr names the unparseable feature file and the parse failure", function () {
  assert.ok(
    cliResult.stderr.includes(unparseableFeature),
    `expected stderr to NAME the unparseable feature file ${unparseableFeature}; got:\n${cliResult.stderr}`,
  );
  // The operator must be told WHAT broke, in the parser's own words — a bare exit code sends
  // them hunting through a corpus for a single stray character.
  assert.ok(
    cliResult.stderr.trim().length > unparseableFeature.length,
    `expected stderr to carry the PARSE FAILURE alongside the file name; got:\n${cliResult.stderr}`,
  );
  // A usage error is a TYPED message, never an uncaught stack trace.
  assert.doesNotMatch(
    cliResult.stderr,
    /^\s+at .*:\d+:\d+\)?$/m,
    `expected a TYPED usage error, but the process crashed with a stack trace:\n${cliResult.stderr}`,
  );
});

/**
 * @SCN-CLI-015 — the same rule on the one flag the guard lane never reached.
 * `--render-from-json` returns at cli.ts:233, BEFORE the input guards at :242, so it
 * honoured neither: a missing path crashed to ENOENT and a malformed file to SyntaxError,
 * both landing on Node's default exit 1. The missing-path case was a live violation of
 * @SCN-CLI-002's own shipped principle — enforced for the five evidence flags, not for this
 * one. Missing and unparseable are two Examples of ONE boundary rule (3F-1764).
 */

/** The unreadable saved report CLI-015's Given points at — asserted verbatim in stderr. */
let unreadableSavedReport = "";

// @SCN-CLI-015
Given(
  "--render-from-json pointing at a saved report that is {word}",
  function (defect: string) {
    if (defect === "missing") {
      // Never written — the ENOENT case. @SCN-CLI-002 already promises exit 2 for a
      // supplied-but-absent input path; this flag simply never reached that guard.
      unreadableSavedReport = join(tmpdir(), `scn-cli-015-missing-${process.pid}.json`);
      assert.ok(
        !existsSync(unreadableSavedReport),
        "the missing-path fixture must NOT exist on disk",
      );
    } else {
      // Written, but not JSON — the SyntaxError case, the same fault as CLI-014.
      unreadableSavedReport = join(tmpdir(), `scn-cli-015-bad-${process.pid}.json`);
      writeFileSync(unreadableSavedReport, "not a saved report at all {{{");
      assert.ok(existsSync(unreadableSavedReport), "the unparseable fixture must EXIST");
    }
    invocationArgs = ["--render-from-json", unreadableSavedReport];
  },
);

// @SCN-CLI-015
Then("stderr names the unreadable saved report", function () {
  assert.ok(
    cliResult.stderr.includes(unreadableSavedReport),
    `expected stderr to NAME the unreadable saved report ${unreadableSavedReport}; got:\n${cliResult.stderr}`,
  );
  // A usage error is a typed message, NOT an uncaught stack trace — the crash is the bug.
  assert.doesNotMatch(
    cliResult.stderr,
    /^\s+at .*:\d+:\d+\)?$/m,
    `expected a TYPED usage error, but the process crashed with a stack trace:\n${cliResult.stderr}`,
  );
});

// @SCN-CLI-015
Then("nothing is rendered", function () {
  // The guard halts BEFORE the rehydrate-and-render branch, so no report reaches stdout.
  assert.doesNotMatch(cliResult.stdout, /Evidence Reconciliation/);
});

// @SCN-CLI-014
Then("stderr names the unparseable report and the parse failure", function () {
  assert.ok(
    cliResult.stderr.includes(unparseablePath),
    `expected stderr to NAME the unparseable report ${unparseablePath}; got:\n${cliResult.stderr}`,
  );
  // The operator must be told WHY it could not be read — "is not valid JSON" is the
  // actionable half. A bare exit code sends them hunting.
  assert.match(
    cliResult.stderr,
    /not valid JSON|JSON/i,
    `expected stderr to name the PARSE failure, not merely the file; got:\n${cliResult.stderr}`,
  );
  // A usage error is a typed message, NOT an uncaught stack trace — the crash is the bug.
  assert.doesNotMatch(
    cliResult.stderr,
    /^\s+at .*:\d+:\d+\)?$/m,
    `expected a TYPED usage error, but the process crashed with a stack trace:\n${cliResult.stderr}`,
  );
});

/**
 * @SCN-CLI-019 — a run with NOTHING TO RECONCILE. The @e2e half: the real binary over a
 * target that declared no scenario and produced no evidence, asserting the status of the
 * `spec-controller` PROCESS ITSELF (spawnSync, never a pipeline — see the @SCN-CLI-013 block:
 * a piped `$?` reads the LAST command's status and launders a failure into a pass).
 *
 * The @unit halves are `[SCN-CLI-019]` in packages/core/src/domain/isBalanced.test.ts (the
 * predicate), packages/spec-controller/src/cli-balance/cli.test.ts (the ladder's first branch)
 * and packages/core/src/render/markdown.test.ts (the headline). A grep of SCN-CLI-019 returns
 * the scenario and every arm.
 */

/**
 * The NOTHING-TO-RECONCILE fixture target (@SCN-CLI-019) — the modal `new-client`: a corpus
 * directory EMPTY OF SCENARIOS (no obligation raised), no evidence report (no observation
 * posted), and a GUARDLESS --package-json with no --ci (no static check running, so nothing is
 * uncited and the suspense row stays empty). The ledger reconcile() emits carries ZERO Scenario
 * Reconciliation rows — the one shape `isBalanced` cannot speak about, since `.every()` over
 * `[]` is vacuously TRUE. Measured before the fix: `**BALANCED** … (exit 0)` over 0 rows.
 */
const NOTHING_TO_RECONCILE = {
  features: "tests/fixtures/nothing-to-reconcile/features",
  packageJson: "tests/fixtures/nothing-to-reconcile/package.json",
};

// @SCN-CLI-019
Given("a target that declared no scenario and produced no evidence", function () {
  const root = process.cwd();
  for (const path of Object.values(NOTHING_TO_RECONCILE)) {
    assert.ok(existsSync(join(root, path)), `missing fixture input: ${path}`);
  }
  // No --vitest and no --cucumber: the target produced nothing, which is half the
  // shape. The guardless --package-json is the other half — a RUNNING static check would
  // post an uncited credit to the suspense row and give the run a row after all (which is
  // @SCN-CLI-020's target, an ordinary out-of-balance report at exit 1, not this one's).
  invocationArgs = [
    "--features",
    NOTHING_TO_RECONCILE.features,
    "--package-json",
    NOTHING_TO_RECONCILE.packageJson,
    ...NO_WORKFLOWS("tests/fixtures/nothing-to-reconcile"),
  ];
});

// @SCN-CLI-019
Then("the verdict headline says the run had nothing to reconcile, never that it balanced", function () {
  // THE HEADLINE HALF of the scenario — the printed verdict, beside the exit code the shared
  // `exits with status {int}` Then pins. Both are asserted because @SCN-CLI-013's invariant is
  // that they name the SAME outcome: a fifth exit code with a fourth headline word keeps that
  // claim true only if the renderer's dominance chain and the CLI's ladder gained the branch in
  // the same position. The negative is the load-bearing half: the fault was not a missing
  // sentence, it was the WRONG one — a vacuous green over silence.
  const headline = cliResult.stdout.match(/^\*\*(.+?)\*\* — .*\(exit (\d+)\)$/m);
  assert.ok(headline, `expected a run-verdict headline in stdout; got:\n${cliResult.stdout}`);
  assert.equal(
    headline[1],
    "NOTHING TO RECONCILE",
    `expected the headline word to say the run had nothing to reconcile; got **${headline[1]}**`,
  );
  assert.equal(
    Number(headline[2]),
    5,
    `expected the headline to name exit 5; got exit ${headline[2]}`,
  );
  assert.doesNotMatch(
    cliResult.stdout,
    /\*\*BALANCED\*\*/,
    `a run with no accounts must NEVER read as balanced; got:\n${cliResult.stdout}`,
  );
});

/**
 * @SCN-CLI-017 — a target with NO `features/` DIRECTORY AT ALL is reported on, never crashed over.
 *
 * @e2e IS THE ONLY ARM THAT CAN SEE THIS ONE, and not merely by convention. The fault is on the
 * DEFAULT corpus path — `join(process.cwd(), "features")` — so reproducing it means running the
 * tool from a directory that has no `features/`. A Vitest arm cannot: `process.chdir` throws in a
 * worker, and passing the absent directory as `--features` is a DIFFERENT case, guarded by
 * `checkInputsExist` and refused at exit 2 (@SCN-CLI-002, the bystander this slice must not move).
 * So the @unit halves prove the typed absence and each reader's translation of it
 * (`[SCN-CLI-017]` in ingest/ingestScenarios.test.ts and ingest/absentFeatureCorpus.test.ts), and
 * this arm proves the only thing they cannot reach: the real binary, standing in a real
 * new-client target, ending on a status of its own rather than on Node's default.
 *
 * Measured before the fix, from a scratch target with no `features/`:
 *   Error: ENOENT: no such file or directory, scandir '<cwd>/features'
 *       at discoverFeatures (ingest/ingestScenarios.ts:113:17)
 *   EXIT=1  — the OUT-OF-BALANCE code, reached by crashing.
 */

/** The exit codes `balance` enumerates. Node's uncaught-throw default (1) is INSIDE this set,
 * which is the whole reason the collision exists — so membership alone proves nothing, and the
 * Then below pairs it with the report's own headline and a stderr free of stack frames. */
const ENUMERATED_STATUSES = [0, 1, 2, 3, 4, 5];

// @SCN-CLI-017
Given("a target with no Gherkin corpus at all — no features directory on disk", function () {
  // The modal `new-client`: a brownfield repository on the day it installs spec-controller. It
  // has unit tests and a manifest; it has no `features/` and never had one. NOTHING is supplied
  // on the command line — an absent DEFAULT corpus is the shape under test, and a supplied path
  // would be @SCN-CLI-002's case instead.
  const dir = mkdtempSync(join(tmpdir(), `scn-cli-017-${process.pid}-`));
  writeFileSync(
    join(dir, "package.json"),
    JSON.stringify({ name: "new-client-target", private: true, scripts: { test: "vitest run" } }),
  );
  assert.ok(
    !existsSync(join(dir, "features")),
    `fixture invariant: ${join(dir, "features")} must NOT exist — this is the ABSENT corpus case`,
  );
  invocationArgs = [];
  invocationCwd = dir;
});

// @SCN-CLI-017
Then("the run ends on an enumerated status rather than a stack trace", function () {
  // A CRASH IS WHAT THIS REFUSES, and the exit code alone cannot say so: Node's default for an
  // uncaught throw IS 1, which the taxonomy already spends on out-of-balance. So the three
  // halves together — no stack frames on stderr, a status the taxonomy enumerates, and that
  // status being the one the report's OWN headline names — are what separate "the tool decided"
  // from "the process died".
  assert.doesNotMatch(
    cliResult.stderr,
    /^\s+at .+:\d+:\d+\)?$/m,
    `expected no stack trace on stderr; got:\n${cliResult.stderr}`,
  );
  assert.doesNotMatch(
    cliResult.stderr,
    /ENOENT/,
    `the absent corpus escaped as a raw filesystem error; got:\n${cliResult.stderr}`,
  );
  assert.ok(
    ENUMERATED_STATUSES.includes(cliResult.status ?? -1),
    `expected an enumerated status; got ${cliResult.status}\nstderr:\n${cliResult.stderr}`,
  );
  const headline = cliResult.stdout.match(/^\*\*(.+?)\*\* — .*\(exit (\d+)\)$/m);
  assert.ok(headline, `expected a run-verdict headline in stdout; got:\n${cliResult.stdout}`);
  assert.equal(
    cliResult.status,
    Number(headline[2]),
    `the report says exit ${headline[2]} (**${headline[1]}**) but the process exited ${cliResult.status} — a status the REPORT did not choose is Node's, not the tool's`,
  );
});

/**
 * @SCN-CLI-020 — the MODAL `new-client`, and the load-bearing guard of this slice: a target with
 * NO Gherkin corpus whose unit tests cite nothing is an ordinary OUT-OF-BALANCE report at exit 1,
 * never a run with nothing to reconcile.
 *
 * WHAT IT DISCRIMINATES. @SCN-CLI-019 keys nothing-to-reconcile on the EMPTY LEDGER; the natural
 * shortcut while fixing @SCN-CLI-017 is to key it on the EMPTY CORPUS instead, since that is the
 * fact in hand at the moment the absence is caught. Both scenarios stay green under that shortcut
 * — CLI-019's fixture has no evidence either, and CLI-017's asserts only that the run ends on an
 * enumerated status the report itself names, which exit 5 satisfies. This run is the one that
 * separates them: its corpus is empty AND its ledger is not, so the two keyings disagree here and
 * nowhere else. Under the shortcut the whole report — the suspense row, the two uncited credits,
 * the out-of-balance verdict that IS the product's argument — disappears behind exit 5.
 *
 * THE DIRECTORY IS ABSENT, NOT EMPTY, and that is the fixture rather than a detail: a shortcut
 * keyed on the caught `MissingFeatureCorpusError` never fires over a directory that exists, so an
 * empty-directory fixture would sit green through the exact fault this scenario is named for.
 *
 * @e2e IS THE ONLY ARM THAT REACHES THAT FORM, for @SCN-CLI-017's reason: the absence is on the
 * DEFAULT corpus path — `join(process.cwd(), "features")` — so it needs a process standing in a
 * directory that has no `features/`, which a Vitest worker cannot produce (`process.chdir` throws)
 * and a supplied `--features` cannot mean (that is @SCN-CLI-002's exit 2). The @unit half is
 * `[SCN-CLI-020]` in packages/core/src/domain/isBalanced.test.ts — the predicate pair over the
 * ledger this shape produces. A grep of SCN-CLI-020 returns the scenario and both arms.
 */

/** The MODAL `new-client` target: no `features/`, a manifest, and a vitest report whose passing
 * tests cite no scenario. Nothing is declared, so nothing is owed; the credits have nowhere to
 * post but the suspense row. */
const NEW_CLIENT_UNCITED = "tests/fixtures/new-client-uncited";

// @SCN-CLI-020
Given("a target with no Gherkin corpus whose unit evidence cites no scenario", function () {
  const dir = join(process.cwd(), NEW_CLIENT_UNCITED);
  assert.ok(
    !existsSync(join(dir, "features")),
    `fixture invariant: ${join(dir, "features")} must NOT exist — an EMPTY corpus directory is a
     different shape and would sit green through the very shortcut this scenario guards`,
  );
  // The run STANDS IN the target, so the absent corpus is reached as the DEFAULT it is. Only
  // --vitest is supplied; --package-json and --ci take their target-relative defaults, which is
  // what a consumer's first invocation actually looks like.
  invocationArgs = ["--vitest", "vitest.json"];
  invocationCwd = dir;
});

// @SCN-CLI-020
Then("the uncited credits are posted to the suspense reconciliation", function () {
  // Read off the report's OWN test-volume sentence — the binary's statement of where every credit
  // landed, never a re-derivation here. Both halves matter: the credits are ON the suspense row,
  // and NONE of them reached a scenario or a phantom, because nothing was declared for them to
  // cite. That is the row whose existence makes the ledger non-empty.
  const volume = cliResult.stdout.match(
    /^(\d+) evidence observations = (\d+) on scenarios \+ (\d+) on phantom scenarios \+ (\d+) on the suspense scenario\.$/m,
  );
  assert.ok(volume, `expected the test-volume sentence in stdout; got:\n${cliResult.stdout}`);
  assert.deepEqual(
    [volume[1], volume[2], volume[3], volume[4]].map(Number),
    [2, 0, 0, 2],
    `expected both uncited credits on the suspense scenario and none anywhere else; got: ${volume[0]}`,
  );
  assert.match(
    cliResult.stdout,
    /^\| ↳ Evidence Observation cites no Scenario \| +\| +\| 2 \|/m,
    `expected the two credits reconciled as cites-no-scenario; got:\n${cliResult.stdout}`,
  );
});

// @SCN-CLI-020
Then("the run is never read as one with nothing to reconcile", function () {
  // THE NEGATIVE THIS SCENARIO EXISTS FOR. The fault is not a missing sentence — it is the WRONG
  // one, the whole report replaced by the fifth code because the keying asked about the corpus
  // rather than the accounts. Asserted on both statements of the verdict, the printed word and
  // the process status, because a shortcut may be planted at either end.
  assert.doesNotMatch(
    cliResult.stdout,
    /NOTHING TO RECONCILE/,
    `a corpus-less run WITH accounts has something to reconcile — its suspense row; got:\n${cliResult.stdout}`,
  );
  assert.notEqual(
    cliResult.status,
    5,
    `expected an ordinary out-of-balance verdict; the run exited 5, so nothing-to-reconcile was keyed on the empty CORPUS rather than the empty LEDGER\nstdout:\n${cliResult.stdout}`,
  );
});

/**
 * @SCN-CLI-018 — an absent corpus and a corpus holding no scenario reach the SAME verdict by the
 * SAME sentence, and that sentence names the corpus directory it examined.
 *
 * WHY THIS SCENARIO EXISTS AFTER ITS SIBLINGS RATHER THAN INSTEAD OF THEM. @SCN-CLI-017 stops the
 * absent corpus crashing and @SCN-CLI-019 supplies the verdict all three now land on, so the three
 * shapes ALREADY agree the moment this arm is written — measured on the branch tip before a line of
 * it existed, three reports byte-identical but for their timestamps. What is written here is not a
 * fix, it is the thing that stops them drifting apart later: absence and emptiness are one answer
 * in the product's argument, and nothing in the tree said so.
 *
 * THE ASSERTION COMPARES THE RUNS AGAINST EACH OTHER, NEVER AGAINST A SENTENCE WRITTEN HERE. A
 * literal expected verdict in this file is a second copy of the renderer's wording: it drifts the
 * day someone rewords the gloss, and — worse — it passes while all three are wrong in the same way.
 * Sameness alone, though, is satisfied by three identical SILENCES, so it is paired with exactly one
 * positive pin on the shared sentence: it names the corpus directory. The directory literal that pin
 * uses is `CORPUS_DIR` below, which is what BUILDS the fixtures — a fact about the targets, not a
 * transcription of the renderer.
 *
 * @e2e IS WHERE THE THREE SHAPES CAN STAND SIDE BY SIDE. Shape 1's absence is on the DEFAULT corpus
 * path (`join(process.cwd(), "features")`), which needs a process standing somewhere with no
 * `features/` — a Vitest worker cannot produce it (`process.chdir` throws) and a supplied
 * `--features` would mean @SCN-CLI-002's exit 2 instead. The @unit half is `[SCN-CLI-018]` in
 * packages/spec-controller/src/ingest/noCorpusVerdict.test.ts, which reaches the other three
 * quarters of the claim through `runReconcile` + `renderMarkdown` over real directories. A grep of
 * SCN-CLI-018 returns the scenario and both arms.
 */

/** The corpus directory every one of the three targets uses — the DEFAULT, unsupplied, which is why
 * all three name the same one. It builds the fixtures below AND is the literal the naming pin
 * asserts, so that pin is derived from the targets rather than transcribed from the renderer. */
const CORPUS_DIR = "features";

/** A target with nothing to reconcile, in one of the three shapes "no corpus" comes in. */
let noCorpusTargets: { shape: string; root: string }[] = [];
/** What the binary said in each of them, in the same order. */
let noCorpusRuns: { shape: string; stdout: string }[] = [];

/** The run-verdict headline line, as a reader meets it — the ONE line this scenario compares. */
function verdictLineOf(stdout: string, shape: string): string {
  const line = stdout.match(/^\*\*.+\*\* — .*\(exit \d+\)$/m)?.[0];
  assert.ok(line, `expected a run-verdict headline for the target with ${shape}; got:\n${stdout}`);
  return line;
}

/** The run this scenario reads, by position — every arm below wants one of the three, and an
 * absent one is a harness fault rather than a verdict, so it is named as one. */
function noCorpusRun(index: number): { shape: string; stdout: string } {
  const run = noCorpusRuns[index];
  assert.ok(run, `expected all three shapes to have been run; run ${index} is missing`);
  return run;
}

// @SCN-CLI-018
Given(
  "a target with no corpus directory, a target whose corpus is empty, and a target whose corpus declares no scenario",
  function () {
    const root = mkdtempSync(join(tmpdir(), `scn-cli-018-${process.pid}-`));
    // A GUARDLESS manifest and no evidence report in all three, so the CORPUS is the only thing
    // that differs between them. A running static check would post an uncited credit, give the run
    // a suspense row, and turn all three into @SCN-CLI-020's shape instead of this one's.
    const manifest = JSON.stringify({ name: "new-client-target", private: true, scripts: {} });
    const shapes: { shape: string; build: (dir: string) => void }[] = [
      // Shape 1 — the modal `new-client`: no corpus directory was ever created.
      { shape: "no corpus directory", build: () => {} },
      // Shape 2 — a corpus directory that exists and holds nothing.
      { shape: "an empty corpus", build: (dir) => mkdirSync(join(dir, CORPUS_DIR)) },
      // Shape 3 — a corpus directory holding a feature file that declares no scenario at all. NOT
      // an untagged scenario, which is a different fact about the target (something WAS declared,
      // and it is owed an @SCN); this file declares nothing to be owed anything.
      {
        shape: "a corpus declaring no scenario",
        build: (dir) => {
          mkdirSync(join(dir, CORPUS_DIR));
          writeFileSync(
            join(dir, CORPUS_DIR, "target.feature"),
            "Feature: a corpus that declares nothing\n\n  Prose only. No scenario is declared in this file.\n",
          );
        },
      },
    ];
    noCorpusTargets = shapes.map(({ shape, build }, i) => {
      const dir = join(root, `shape-${i}`);
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, "package.json"), manifest);
      build(dir);
      return { shape, root: dir };
    });
    const [first] = noCorpusTargets;
    assert.ok(first && !existsSync(join(first.root, CORPUS_DIR)),
      `fixture invariant: the first target must have NO ${CORPUS_DIR}/ — that is the shape under test`,
    );
  },
);

// @SCN-CLI-018
When(
  '"spec-controller balance" is invoked over each of those targets through the CLI binary',
  function () {
    // NOTHING IS SUPPLIED, in any of the three. The corpus is reached as the DEFAULT it is, which
    // is both the only way shape 1's absence is reachable at all and what a consumer's very first
    // invocation actually looks like.
    noCorpusRuns = noCorpusTargets.map(({ shape, root }) => {
      invocationCwd = root;
      return { shape, stdout: spawnBalance([]).stdout };
    });
  },
);

// @SCN-CLI-018
Then("every one of them is told the same verdict by the same sentence", function () {
  assert.equal(noCorpusRuns.length, 3, "expected all three shapes to have been run");
  const first = noCorpusRun(0);
  const firstLine = verdictLineOf(first.stdout, first.shape);
  for (const index of [1, 2]) {
    const other = noCorpusRun(index);
    const otherLine = verdictLineOf(other.stdout, other.shape);
    // COMPARED AGAINST THE OTHER RUNS, never against a sentence written here. "Absent and empty
    // are the same answer, not two" is a claim about the runs agreeing, and that is what is read.
    assert.equal(
      otherLine,
      firstLine,
      `absent and empty are ONE answer, not two: the target with ${other.shape} was told something the target with ${first.shape} was not.\n  ${first.shape}: ${firstLine}\n  ${other.shape}: ${otherLine}`,
    );
  }
});

// @SCN-CLI-018
Then("that sentence names the corpus directory it examined", function () {
  // THE POSITIVE PIN, once, on the sentence the Then above has just established is shared. Three
  // identical silences satisfy sameness; only this says the report told the reader WHERE it looked.
  // Asserted on the verdict LINE rather than on stdout, because the provenance block above it
  // already carries the flag name and would green this over a verdict that says nothing at all.
  const { shape, stdout } = noCorpusRun(0);
  const line = verdictLineOf(stdout, shape);
  assert.ok(
    line.includes(CORPUS_DIR),
    `"I found no record" and "I found no regression" must not wear one word: the verdict never names the corpus directory (${CORPUS_DIR}) it examined.\n  ${line}`,
  );
});
