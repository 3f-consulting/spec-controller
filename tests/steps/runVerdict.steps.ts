import { Given, Then, When } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import type { SpawnSyncReturns } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { BALANCED_INPUTS, NO_WORKFLOWS, OUT_OF_BALANCE_INPUTS, spawnBalance } from "./support/balanceTarget.js";
import { showsEntry } from "./support/catalogue.js";
import { exitNamedBy, exitOn, RUN_OUTCOME } from "./support/runExit.js";
import type { SpecControllerWorld } from "./support/world.js";

const PENDING_ONLY = {
  features: "tests/fixtures/pending-only/features",
  packageJson: "tests/fixtures/pending-only/package.json",
};

const BROKEN = {
  features: "tests/fixtures/broken/features",
  vitest: "tests/fixtures/broken/vitest.json",
  packageJson: "tests/fixtures/broken/package.json",
};

const UNNAMED_CLAIM_ONLY = {
  features: "tests/fixtures/unnamed-claim-only/features",
  vitest: "tests/fixtures/unnamed-claim-only/vitest.json",
  packageJson: "tests/fixtures/unnamed-claim-only/package.json",
  ci: "tests/fixtures/unnamed-claim-only/ci.yml",
};

function aBalancedTargetWithAVitestReport(this: SpecControllerWorld): void {
  const root = process.cwd();
  assert.ok(existsSync(join(root, BALANCED_INPUTS.features)), `missing fixture features: ${BALANCED_INPUTS.features}`);
  assert.ok(existsSync(join(root, BALANCED_INPUTS.vitest)), `missing fixture vitest report: ${BALANCED_INPUTS.vitest}`);
  this.invocationArgs = ["--features", BALANCED_INPUTS.features, "--vitest", BALANCED_INPUTS.vitest, "--package-json", BALANCED_INPUTS.packageJson, ...NO_WORKFLOWS("tests/fixtures/balanced")];
}

Given("a target with scenarios and a Vitest report of what ran", aBalancedTargetWithAVitestReport);

When("balance is asked to reconcile that target", function (this: SpecControllerWorld) {
  this.balanceResult = spawnBalance(this, this.invocationArgs);
});

Then("it reports the Evidence Reconciliation", function (this: SpecControllerWorld) {
  assert.match(this.balanceResult.stdout, /^# Evidence Reconciliation/m);
});

Then("the reconciliation reports the target's scenarios", function (this: SpecControllerWorld) {
  assert.match(this.balanceResult.stdout, /\| Claim Reconciliation \| 2 \|/);
});

Given("a target with scenarios and a Vitest report", aBalancedTargetWithAVitestReport);

When("balance is asked to reconcile that target without the Cucumber report option", function (this: SpecControllerWorld) {
  assert.ok(!this.invocationArgs.includes("--cucumber"), "fixture invariant: --cucumber must be omitted");
  this.balanceResult = spawnBalance(this, this.invocationArgs);
});

Then("it reconciles the scenarios against the supplied evidence", function (this: SpecControllerWorld) {
  assert.match(this.balanceResult.stdout, /^# Evidence Reconciliation/m);
  assert.match(this.balanceResult.stdout, /\| Claim Reconciliation \| 2 \|/);
});

Given("a target that reconciles out-of-balance", function (this: SpecControllerWorld) {
  const root = process.cwd();
  assert.ok(existsSync(join(root, OUT_OF_BALANCE_INPUTS.features)), `missing fixture features: ${OUT_OF_BALANCE_INPUTS.features}`);
  assert.ok(existsSync(join(root, OUT_OF_BALANCE_INPUTS.vitest)), `missing fixture vitest report: ${OUT_OF_BALANCE_INPUTS.vitest}`);
  this.invocationArgs = [
    "--features",
    OUT_OF_BALANCE_INPUTS.features,
    "--vitest",
    OUT_OF_BALANCE_INPUTS.vitest,
    ...NO_WORKFLOWS("tests/fixtures/evidence-observation"),
  ];
});

Given("a target that reconciles all-balanced", aBalancedTargetWithAVitestReport);

Given("a target whose vitest report carries a collection-failed suite", function (this: SpecControllerWorld) {
  const root = process.cwd();
  assert.ok(existsSync(join(root, BROKEN.features)), `missing fixture features: ${BROKEN.features}`);
  assert.ok(existsSync(join(root, BROKEN.vitest)), `missing fixture vitest report: ${BROKEN.vitest}`);
  this.invocationArgs = [
    "--features",
    BROKEN.features,
    "--vitest",
    BROKEN.vitest,
    "--package-json",
    BROKEN.packageJson,
    ...NO_WORKFLOWS("tests/fixtures/broken"),
  ];
});

Given("a target whose only exception is Pending Items", function (this: SpecControllerWorld) {
  this.invocationArgs = pendingOnlyArgs();
});

function pendingOnlyArgs(): string[] {
  const root = process.cwd();
  assert.ok(existsSync(join(root, PENDING_ONLY.features)), `missing fixture features: ${PENDING_ONLY.features}`);
  assert.ok(
    existsSync(join(root, PENDING_ONLY.packageJson)),
    `missing fixture package.json: ${PENDING_ONLY.packageJson}`,
  );
  return [
    "--features",
    PENDING_ONLY.features,
    "--package-json",
    PENDING_ONLY.packageJson,
    ...NO_WORKFLOWS("tests/fixtures/pending-only"),
  ];
}

Then("the reconciliation reports a Pending Item", function (this: SpecControllerWorld) {
  assert.match(this.balanceResult.stdout, /Pending Item/);
});

When("balance is asked to reconcile that target under the strict option", function (this: SpecControllerWorld) {
  this.balanceResult = spawnBalance(this, [...this.invocationArgs, "--strict"]);
});

Given("a target whose only out-of-balance row is the unnamed claim's reconciliation", function (this: SpecControllerWorld) {
  const root = process.cwd();
  for (const path of Object.values(UNNAMED_CLAIM_ONLY)) {
    assert.ok(existsSync(join(root, path)), `missing fixture input: ${path}`);
  }
  this.invocationArgs = [
    "--features",
    UNNAMED_CLAIM_ONLY.features,
    "--vitest",
    UNNAMED_CLAIM_ONLY.vitest,
    "--package-json",
    UNNAMED_CLAIM_ONLY.packageJson,
    "--ci",
    UNNAMED_CLAIM_ONLY.ci,
  ];
});

function tallyOutOfBalance(stdout: string): number {
  const row = stdout.match(/^\| Claim Reconciliation \| (\d+) \| (\d+) \| (\d+) \|/m);
  assert.ok(row, `expected a Claim Reconciliation tally row in stdout; got:\n${stdout}`);
  return Number(row[3]);
}

function verdictHeadline(stdout: string): { word: string; exit: number } {
  const headline = stdout.match(/^\*\*(BALANCED|OUT-OF-BALANCE|UNSOUND|PENDING)\*\* — .*\(exit (\d+)\)$/m);
  assert.ok(headline, `expected a run-verdict headline in stdout; got:\n${stdout}`);
  return { word: String(headline[1]), exit: Number(headline[2]) };
}

Then("the trial-balance table counts {int} out-of-balance Claim Reconciliation", function (this: SpecControllerWorld, count: number) {
  assert.equal(
    tallyOutOfBalance(this.balanceResult.stdout),
    count,
    `expected the tally to count ${count} out-of-balance Claim Reconciliation; got:\n${this.balanceResult.stdout}`,
  );
});

Then("the verdict headline reads {word} and names the exit it ends with", function (this: SpecControllerWorld, word: string) {
  const exit = exitNamedBy(word);
  const headline = verdictHeadline(this.balanceResult.stdout);
  assert.equal(headline.word, word, `expected the headline to read ${word}; got ${headline.word}`);
  assert.equal(headline.exit, exit, `expected the headline to name exit ${exit}; got exit ${headline.exit}`);
});

Then("the tally, the verdict headline and the run's exit agree", function (this: SpecControllerWorld) {
  const tally = tallyOutOfBalance(this.balanceResult.stdout);
  const headline = verdictHeadline(this.balanceResult.stdout);
  const exitCode = this.balanceResult.status;

  assert.equal(
    exitCode,
    headline.exit,
    `the headline names exit ${headline.exit} but the process exited ${exitCode}`,
  );
  assert.equal(
    tally > 0,
    exitCode !== 0,
    `the tally counts ${tally} out-of-balance but the process exited ${exitCode} — the tally and the exit code disagree`,
  );
  assert.equal(
    headline.word === "BALANCED",
    tally === 0,
    `the headline reads ${headline.word} but the tally counts ${tally} out-of-balance`,
  );
});

Then(new RegExp(`^the run ends on (${RUN_OUTCOME})$`), function (this: SpecControllerWorld, outcome: string) {
  const code = exitOn(outcome);
  assert.equal(
    this.balanceResult.status,
    code,
    `expected exit ${code}; got ${this.balanceResult.status}\nstdout:\n${this.balanceResult.stdout}\nstderr:\n${this.balanceResult.stderr}`,
  );
});

const NOTHING_TO_RECONCILE = {
  features: "tests/fixtures/nothing-to-reconcile/features",
  packageJson: "tests/fixtures/nothing-to-reconcile/package.json",
};

Given("a target that carried no scenario and produced no evidence", function (this: SpecControllerWorld) {
  const root = process.cwd();
  for (const path of Object.values(NOTHING_TO_RECONCILE)) {
    assert.ok(existsSync(join(root, path)), `missing fixture input: ${path}`);
  }
  this.invocationArgs = [
    "--features",
    NOTHING_TO_RECONCILE.features,
    "--package-json",
    NOTHING_TO_RECONCILE.packageJson,
    ...NO_WORKFLOWS("tests/fixtures/nothing-to-reconcile"),
  ];
});

Then("the verdict headline says the run had nothing to reconcile, never that it balanced", function (this: SpecControllerWorld) {
  const headline = this.balanceResult.stdout.match(/^\*\*(.+?)\*\* — .*\(exit (\d+)\)$/m);
  assert.ok(headline, `expected a run-verdict headline in stdout; got:\n${this.balanceResult.stdout}`);
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
    this.balanceResult.stdout,
    /\*\*BALANCED\*\*/,
    `a run with no accounts must NEVER read as balanced; got:\n${this.balanceResult.stdout}`,
  );
});

Given("a target that reconciles only-Pending-Items", function (this: SpecControllerWorld) {
  this.invocationArgs = pendingOnlyArgs();
});

const EXIT_ZERO_FLAGS: Record<string, string[]> = {
  "with no options": [],
  "under the strict option": ["--strict"],
};

When(
  "balance is asked to reconcile that target {}, once without the report-only option and once under it",
  function (this: SpecControllerWorld, flags: string) {
    const extra = EXIT_ZERO_FLAGS[flags];
    assert.ok(extra !== undefined, `unrecognised <flags> cell: ${flags}`);
    const without = spawnBalance(this, [...this.invocationArgs, ...extra]);
    const withFlag = spawnBalance(this, [...this.invocationArgs, ...extra, "--exit-zero"]);
    this.exitZeroPair = { without, with: withFlag };
  },
);

function exitZeroRuns(world: SpecControllerWorld): { without: SpawnSyncReturns<string>; with: SpawnSyncReturns<string> } {
  assert.ok(world.exitZeroPair !== null, "the with/without --exit-zero pair was never run");
  return world.exitZeroPair;
}

function statusOf(run: SpawnSyncReturns<string>, label: string, code: number): void {
  assert.equal(
    run.status,
    code,
    `expected ${label} to exit ${code}; got ${run.status}\nstdout:\n${run.stdout}\nstderr:\n${run.stderr}`,
  );
}

Then(new RegExp(`^without the report-only option the run ends on (${RUN_OUTCOME})$`), function (this: SpecControllerWorld, outcome: string) {
  statusOf(exitZeroRuns(this).without, "the run without --exit-zero", exitOn(outcome));
});

Then(new RegExp(`^under the report-only option the run ends on (${RUN_OUTCOME})$`), function (this: SpecControllerWorld, outcome: string) {
  statusOf(exitZeroRuns(this).with, "the run with --exit-zero", exitOn(outcome));
});

const RUN_TIMESTAMP_LINE = /^- Run timestamp \(UTC\): .+$/m;

function maskRunTimestamp(stdout: string, label: string): string {
  assert.match(stdout, RUN_TIMESTAMP_LINE, `${label} printed no run-timestamp line to mask`);
  return stdout.replace(RUN_TIMESTAMP_LINE, "- Run timestamp (UTC): <masked>");
}

Then(
  "the two runs report the same Evidence Reconciliation, byte for byte but for the run timestamp each stamps for itself",
  function (this: SpecControllerWorld) {
    const { without, with: withFlag } = exitZeroRuns(this);
    assert.match(without.stdout, /^# Evidence Reconciliation/m);
    assert.equal(
      maskRunTimestamp(withFlag.stdout, "the run with --exit-zero"),
      maskRunTimestamp(without.stdout, "the run without --exit-zero"),
      "--exit-zero changed the report: only the exit status may move",
    );
  },
);

When("balance is asked to reconcile that target under the report-only option", function (this: SpecControllerWorld) {
  this.balanceResult = spawnBalance(this, [...this.invocationArgs, "--exit-zero"]);
});

const CODE_ERROR_OUT_OF_BALANCE = "tests/fixtures/code-error-out-of-balance";

Given(
  "a target whose corpus misfiles a scenario code and whose ledger has an account out of balance",
  function (this: SpecControllerWorld) {
    this.invocationArgs = [
      "--features", `${CODE_ERROR_OUT_OF_BALANCE}/features`,
      "--vitest", `${CODE_ERROR_OUT_OF_BALANCE}/vitest.json`,
      "--package-json", `${CODE_ERROR_OUT_OF_BALANCE}/package.json`,
      ...NO_WORKFLOWS(CODE_ERROR_OUT_OF_BALANCE),
    ];
  },
);

function assertListsMisfiled(report: string, scnId: string): void {
  assert.ok(
    showsEntry(report, "foreign-scn-code-carried", { file: "two.feature", scnId, carrierCount: "1" }),
    `expected ${scnId} in two.feature listed as misfiled; got:\n${report}`,
  );
}

Then("the report lists the scenario code error", function (this: SpecControllerWorld) {
  assert.match(this.balanceResult.stdout, /^#+ Scenario code errors$/m);
  assertListsMisfiled(this.balanceResult.stdout, "SCN-CEA-002");
});

Then("the report carries the out-of-balance account", function (this: SpecControllerWorld) {
  assert.match(this.balanceResult.stdout, /\| SCN-CEB-001 \|[^\n]*out-of-balance/);
});

Then("the verdict headline names both the scenario code error and the accounts out of balance", function (this: SpecControllerWorld) {
  const headline = this.balanceResult.stdout.split("\n").find((line) => line.startsWith("**SCENARIO CODE ERRORS**"));
  assert.ok(headline, `expected the SCENARIO CODE ERRORS headline; got:\n${this.balanceResult.stdout}`);
  assert.match(headline, /accounts do not agree/);
  assert.match(headline, /\(exit 1\)$/);
});

const SCENARIO_CODE_ERROR = "tests/fixtures/scenario-code-error";

Given("a target that reconciles balanced-with-scenario-code-errors", function (this: SpecControllerWorld) {
  this.invocationArgs = [
    "--features", `${SCENARIO_CODE_ERROR}/features`,
    "--vitest", `${SCENARIO_CODE_ERROR}/vitest.json`,
    "--package-json", `${SCENARIO_CODE_ERROR}/package.json`,
    ...NO_WORKFLOWS(SCENARIO_CODE_ERROR),
  ];
});

const UNSOUND_CODE_ERROR = "tests/fixtures/unsound-code-error";

Given("a target whose collection-failed suite sits beside a misfiled scenario code", function (this: SpecControllerWorld) {
  this.invocationArgs = [
    "--features", `${UNSOUND_CODE_ERROR}/features`,
    "--vitest", `${UNSOUND_CODE_ERROR}/vitest.json`,
    "--package-json", `${UNSOUND_CODE_ERROR}/package.json`,
    ...NO_WORKFLOWS(UNSOUND_CODE_ERROR),
  ];
});

Then("the report still lists the scenario code error", function (this: SpecControllerWorld) {
  assert.match(this.balanceResult.stdout, /^#+ Scenario code errors$/m);
  assertListsMisfiled(this.balanceResult.stdout, "SCN-UCA-002");
});
