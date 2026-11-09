import { Given, Then, When } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import type { SpawnSyncReturns } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { BALANCED_INPUTS, NO_WORKFLOWS, OUT_OF_BALANCE_INPUTS, spawnBalance } from "./support/balanceTarget.js";
import { entryText, showsEntry, shownEntry } from "./support/catalogue.js";
import { showsHeading, verdictLineOf, type VerdictLine } from "./support/reportLines.js";
import { exitOn, headlineNamedBy, RUN_OUTCOME } from "./support/runExit.js";
import type { SpecControllerWorld } from "./support/world.js";

const PENDING_ONLY = {
  features: "tests/fixtures/pending-only/features",
  packageJson: "tests/fixtures/pending-only/package.json",
};

const BROKEN = {
  features: "tests/fixtures/never-ran/features",
  vitest: "tests/fixtures/never-ran/vitest.json",
  packageJson: "tests/fixtures/never-ran/package.json",
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
  assert.ok(showsHeading(this.balanceResult.stdout, 1, "report-title"), `expected the report's title; got:\n${this.balanceResult.stdout}`);
});

// The Reconciliation totals' Claim Reconciliation row, as its Total, Balanced and Out-of-balance cells.
function claimReconciliationTally(stdout: string): readonly number[] | undefined {
  const opening = `| ${entryText("claim-reconciliation-subject")} | `;
  const row = stdout.split("\n").find((line) => line.startsWith(opening));
  const cells = row?.slice(opening.length).split(" | ").slice(0, 3);
  return cells?.length === 3 && cells.every((cell) => /^\d+$/.test(cell)) ? cells.map(Number) : undefined;
}

Then("the reconciliation reports the target's scenarios", function (this: SpecControllerWorld) {
  assert.equal(claimReconciliationTally(this.balanceResult.stdout)?.[0], 2, `expected 2 Claim Reconciliations; got:\n${this.balanceResult.stdout}`);
});

Given("a target with scenarios and a Vitest report", aBalancedTargetWithAVitestReport);

When("balance is asked to reconcile that target without the Cucumber report option", function (this: SpecControllerWorld) {
  assert.ok(!this.invocationArgs.includes("--cucumber"), "fixture invariant: --cucumber must be omitted");
  this.balanceResult = spawnBalance(this, this.invocationArgs);
});

Then("it reconciles the scenarios against the supplied evidence", function (this: SpecControllerWorld) {
  assert.ok(showsHeading(this.balanceResult.stdout, 1, "report-title"), `expected the report's title; got:\n${this.balanceResult.stdout}`);
  assert.equal(claimReconciliationTally(this.balanceResult.stdout)?.[0], 2, `expected 2 Claim Reconciliations; got:\n${this.balanceResult.stdout}`);
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
    ...NO_WORKFLOWS("tests/fixtures/never-ran"),
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
  assert.ok(showsEntry(this.balanceResult.stdout, "pending-tally"), `expected the Pending Items tally; got:\n${this.balanceResult.stdout}`);
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
  const tally = claimReconciliationTally(stdout);
  assert.ok(tally, `expected a Claim Reconciliation tally row in stdout; got:\n${stdout}`);
  return tally[2] as number;
}

function verdictHeadline(stdout: string): VerdictLine {
  const verdict = verdictLineOf(stdout);
  assert.ok(verdict, `expected a run-verdict headline in stdout; got:\n${stdout}`);
  return verdict;
}

Then("the Reconciliation totals table counts {int} out-of-balance Claim Reconciliation", function (this: SpecControllerWorld, count: number) {
  assert.equal(
    tallyOutOfBalance(this.balanceResult.stdout),
    count,
    `expected the tally to count ${count} out-of-balance Claim Reconciliation; got:\n${this.balanceResult.stdout}`,
  );
});

Then("the verdict headline reads {word} and names the exit it ends with", function (this: SpecControllerWorld, word: string) {
  const named = headlineNamedBy(word);
  const headline = verdictHeadline(this.balanceResult.stdout);
  assert.equal(headline.headline, named.headline, `expected the headline to read ${word}; got ${headline.line}`);
  assert.equal(headline.exit, named.exit, `expected the headline to name exit ${named.exit}; got exit ${headline.exit}`);
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
    headline.headline === "balanced-headline",
    tally === 0,
    `the headline reads ${headline.line} but the tally counts ${tally} out-of-balance`,
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
  const headline = verdictHeadline(this.balanceResult.stdout);
  assert.equal(
    headline.headline,
    "nothing-to-reconcile-headline",
    `expected the headline word to say the run had nothing to reconcile; got ${headline.line}`,
  );
  assert.equal(
    headline.exit,
    5,
    `expected the headline to name exit 5; got exit ${headline.exit}`,
  );
  assert.ok(
    !this.balanceResult.stdout.includes(entryText("balanced-headline")),
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

function maskRunTimestamp(stdout: string, label: string): string {
  const stamped = (line: string): boolean =>
    line.startsWith("- ") && (shownEntry(line, "provenance-run-timestamp")?.["runStartUtc"] ?? "") !== "";
  const lines = stdout.split("\n");
  assert.ok(lines.some(stamped), `${label} printed no run-timestamp line to mask`);
  const masked = `- ${entryText("provenance-run-timestamp", { runStartUtc: "<masked>" })}`;
  return lines.map((line) => (stamped(line) ? masked : line)).join("\n");
}

Then(
  "the two runs report the same Evidence Reconciliation, byte for byte but for the run timestamp each stamps for itself",
  function (this: SpecControllerWorld) {
    const { without, with: withFlag } = exitZeroRuns(this);
    assert.ok(showsHeading(without.stdout, 1, "report-title"), `expected the report's title; got:\n${without.stdout}`);
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
  "a target whose corpus misfiles a claim code and whose ledger has an account out of balance",
  function (this: SpecControllerWorld) {
    this.invocationArgs = [
      "--features", `${CODE_ERROR_OUT_OF_BALANCE}/features`,
      "--vitest", `${CODE_ERROR_OUT_OF_BALANCE}/vitest.json`,
      "--package-json", `${CODE_ERROR_OUT_OF_BALANCE}/package.json`,
      ...NO_WORKFLOWS(CODE_ERROR_OUT_OF_BALANCE),
    ];
  },
);

function assertListsMisfiled(report: string, claimCode: string): void {
  assert.ok(
    showsEntry(report, "foreign-claim-code-carried", { file: "two.feature", claimCode, carrierCount: "1" }),
    `expected ${claimCode} in two.feature listed as misfiled; got:\n${report}`,
  );
}

Then("the report lists the claim code error", function (this: SpecControllerWorld) {
  assert.ok(showsHeading(this.balanceResult.stdout, 3, "claim-code-errors-heading"), `expected the heading over the misfiled codes; got:\n${this.balanceResult.stdout}`);
  assertListsMisfiled(this.balanceResult.stdout, "CLM-CEA-002");
});

Then("the report carries the out-of-balance account", function (this: SpecControllerWorld) {
  assert.match(this.balanceResult.stdout, /\| CLM-CEB-001 \|[^\n]*out-of-balance/);
});

Then("the verdict headline names both the claim code error and the accounts out of balance", function (this: SpecControllerWorld) {
  const headline = verdictHeadline(this.balanceResult.stdout);
  assert.equal(headline.headline, "claim-code-errors-headline", `expected the headline of a corpus that misfiles a code; got ${headline.line}`);
  assert.ok(headline.line.includes(entryText("also-out-of-balance")), `expected the headline to carry the also-out-of-balance entry; got ${headline.line}`);
  assert.equal(headline.exit, 1);
});

const CLAIM_CODE_ERROR = "tests/fixtures/claim-code-error";

Given("a target that reconciles balanced-with-claim-code-errors", function (this: SpecControllerWorld) {
  this.invocationArgs = [
    "--features", `${CLAIM_CODE_ERROR}/features`,
    "--vitest", `${CLAIM_CODE_ERROR}/vitest.json`,
    "--package-json", `${CLAIM_CODE_ERROR}/package.json`,
    ...NO_WORKFLOWS(CLAIM_CODE_ERROR),
  ];
});

const UNSOUND_CODE_ERROR = "tests/fixtures/unsound-code-error";

Given("a target whose collection-failed suite sits beside a misfiled claim code", function (this: SpecControllerWorld) {
  this.invocationArgs = [
    "--features", `${UNSOUND_CODE_ERROR}/features`,
    "--vitest", `${UNSOUND_CODE_ERROR}/vitest.json`,
    "--package-json", `${UNSOUND_CODE_ERROR}/package.json`,
    ...NO_WORKFLOWS(UNSOUND_CODE_ERROR),
  ];
});

Then("the report still lists the claim code error", function (this: SpecControllerWorld) {
  assert.ok(showsHeading(this.balanceResult.stdout, 3, "claim-code-errors-heading"), `expected the heading over the misfiled codes; got:\n${this.balanceResult.stdout}`);
  assertListsMisfiled(this.balanceResult.stdout, "CLM-UCA-002");
});
