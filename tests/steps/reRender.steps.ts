import { Given, Then, When } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { spawnSync, type SpawnSyncReturns } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { optionFlag } from "./support/balanceOption.js";
import { spawnBalance } from "./support/balanceTarget.js";
import { NODE, SPEC_CONTROLLER_ARGV } from "./support/builtCli.js";
import { entryText, shownEntry, showsEntry } from "./support/catalogue.js";
import { headingLine, showsHeading, verdictLineOn } from "./support/reportLines.js";
import { exitOn, RUN_OUTCOME } from "./support/runExit.js";
import { RUN_ID, specController, USAGE } from "./support/specControllerRun.js";
import { temporaryDirectory } from "./support/temporaryDirectory.js";
import type { SpecControllerWorld } from "./support/world.js";

When("balance is asked to re-render that saved report", function (this: SpecControllerWorld) {
  this.balanceResult = spawnBalance(this, this.invocationArgs);
});

Given(
  "the re-render option pointing at a saved report that is {word}",
  function (this: SpecControllerWorld, defect: string) {
    if (defect === "missing") {
      this.unreadableSavedReport = join(temporaryDirectory(this, "clm-cli-015-"), "missing-saved-report.json");
      assert.ok(
        !existsSync(this.unreadableSavedReport),
        "the missing-path fixture must NOT exist on disk",
      );
    } else {
      this.unreadableSavedReport = join(temporaryDirectory(this, "clm-cli-015-"), "bad-saved-report.json");
      writeFileSync(this.unreadableSavedReport, "not a saved report at all {{{");
      assert.ok(existsSync(this.unreadableSavedReport), "the unparseable fixture must EXIST");
    }
    this.invocationArgs = ["--render-from-json", this.unreadableSavedReport];
  },
);

Then("the refusal names the unreadable saved report", function (this: SpecControllerWorld) {
  assert.ok(
    this.balanceResult.stderr.includes(this.unreadableSavedReport),
    `expected stderr to NAME the unreadable saved report ${this.unreadableSavedReport}; got:\n${this.balanceResult.stderr}`,
  );
  assert.doesNotMatch(
    this.balanceResult.stderr,
    /^\s+at .*:\d+:\d+\)?$/m,
    `expected a TYPED usage error, but the process crashed with a stack trace:\n${this.balanceResult.stderr}`,
  );
});

Then("nothing is rendered", function (this: SpecControllerWorld) {
  assert.ok(!this.balanceResult.stdout.includes(entryText("report-title")), `expected nothing rendered; got:\n${this.balanceResult.stdout}`);
});

const SAVED_VERDICTS: Record<string, { fixture: string; flags: string[] }> = {
  "all-balanced": { fixture: "balanced", flags: [] },
  "out-of-balance": { fixture: "evidence-observation", flags: [] },
  "balanced-with-claim-code-errors": { fixture: "claim-code-error", flags: [] },
  unsound: { fixture: "never-ran", flags: [] },
  "nothing to reconcile": { fixture: "nothing-to-reconcile", flags: [] },
  "only-Pending-Items under the strict option": { fixture: "pending-only", flags: ["--strict"] },
};

function spawnController(args: string[], cwd: string): SpawnSyncReturns<string> {
  const result = spawnSync(NODE, [...SPEC_CONTROLLER_ARGV, "balance", ...args], { cwd, encoding: "utf8" });
  assert.equal(result.error, undefined, `CLI failed to spawn: ${result.error?.message}`);
  return result;
}

function fixtureInputs(dir: string): string[] {
  const args = ["--features", "features"];
  for (const [flag, file] of [["--vitest", "vitest.json"], ["--cucumber", "cucumber.json"], ["--package-json", "package.json"]]) {
    if (existsSync(join(dir, file as string))) args.push(flag as string, file as string);
  }
  return args;
}

function saveLiveRun(world: SpecControllerWorld, fixture: string, flags: string[]): string {
  const dir = join(process.cwd(), "tests", "fixtures", fixture);
  const path = join(temporaryDirectory(world, "spec-controller-rerender-"), `${fixture}${flags.join("")}.json`);
  const live = spawnController([...fixtureInputs(dir), ...flags, "--format", `json:${path}`], dir);
  assert.ok(existsSync(path), `the live run saved no report (exit ${live.status}):\n${live.stderr}`);
  return path;
}

function headlineExit(stdout: string): number {
  const after = stdout.split(headingLine(3, "run-verdict-heading"))[1] ?? "";
  const line = after.split("\n").find((l) => l.trim() !== "") ?? "";
  const verdict = verdictLineOn(line);
  assert.ok(verdict, `expected a verdict headline naming an exit; got:\n${line}`);
  return verdict.exit;
}

Given(/^a saved reconciliation of a target that reconciles (.+)$/, function (this: SpecControllerWorld, verdict: string) {
  const target = SAVED_VERDICTS[verdict];
  assert.ok(target, `no fixture reconciles "${verdict}"`);
  this.savedReport = saveLiveRun(this, target.fixture, target.flags);
});

function withoutStrictRecord(path: string): string {
  const report = JSON.parse(readFileSync(path, "utf8")) as { runProvenance: Record<string, unknown> };
  assert.ok("strict" in report.runProvenance, "the live run recorded no strictness to remove");
  delete report.runProvenance["strict"];
  const older = path.replace(/\.json$/, "-unrecorded.json");
  writeFileSync(older, JSON.stringify(report, null, 2));
  return older;
}

Given(
  /^a saved reconciliation of a target whose only exception is Pending Items, saved (under the strict option|without the strict option|before strictness was recorded)$/,
  function (this: SpecControllerWorld, saved: string) {
    const strict = saved === "under the strict option" ? ["--strict"] : [];
    const path = saveLiveRun(this, "pending-only", strict);
    this.savedReport = saved === "before strictness was recorded" ? withoutStrictRecord(path) : path;
  },
);

When(
  /^balance is asked to re-render the saved reconciliation (with no options|under the strict option)$/,
  function (this: SpecControllerWorld, given: string) {
    const flags = given === "under the strict option" ? ["--strict"] : [];
    this.reRendered = spawnController(["--render-from-json", this.savedReport, ...flags], process.cwd());
  },
);

When(
  "balance is asked to re-render the saved reconciliation",
  function (this: SpecControllerWorld) {
    this.reRendered = spawnController(["--render-from-json", this.savedReport], process.cwd());
  },
);

Then(new RegExp(`^the re-render ends on (${RUN_OUTCOME})$`), function (this: SpecControllerWorld, outcome: string) {
  const code = exitOn(outcome);
  assert.equal(this.reRendered.status, code, `expected the re-render to exit ${code}; got ${this.reRendered.status}:\n${this.reRendered.stderr}`);
});

Then("the re-render is refused as a usage error", function (this: SpecControllerWorld) {
  const code = exitOn("a usage error");
  assert.equal(this.reRendered.status, code, `expected the re-render to exit ${code}; got ${this.reRendered.status}:\n${this.reRendered.stderr}`);
});

Then(new RegExp(`^the re-render's verdict headline names the exit for (${RUN_OUTCOME})$`), function (this: SpecControllerWorld, outcome: string) {
  assert.equal(headlineExit(this.reRendered.stdout), exitOn(outcome));
});

When(
  "balance is asked to re-render the saved reconciliation, once without the report-only option and once under it",
  function (this: SpecControllerWorld) {
    this.exitZeroPair = {
      without: spawnController(["--render-from-json", this.savedReport], process.cwd()),
      with: spawnController(["--render-from-json", this.savedReport, "--exit-zero"], process.cwd()),
    };
  },
);

Then(new RegExp(`^without the report-only option the re-render ends on (${RUN_OUTCOME})$`), function (this: SpecControllerWorld, outcome: string) {
  assert.equal(this.exitZeroPair?.without.status, exitOn(outcome), `without --exit-zero:\n${this.exitZeroPair?.without.stderr}`);
});

Then(new RegExp(`^under the report-only option the re-render ends on (${RUN_OUTCOME})$`), function (this: SpecControllerWorld, outcome: string) {
  assert.equal(this.exitZeroPair?.with.status, exitOn(outcome), `with --exit-zero:\n${this.exitZeroPair?.with.stderr}`);
});

Then("the two re-renders report the same, byte for byte", function (this: SpecControllerWorld) {
  assert.ok(this.exitZeroPair && showsHeading(this.exitZeroPair.without.stdout, 3, "run-verdict-heading"), "the re-render printed no report");
  assert.equal(this.exitZeroPair.with.stdout, this.exitZeroPair.without.stdout);
});

const OPTION_VALUE: Record<string, string> = {
  "the json report in a file": "json:out.json",
};

When(
  /^balance is asked to re-render the saved reconciliation with the (.+ option) given (.+)$/,
  function (this: SpecControllerWorld, option: string, given: string) {
    const flag = optionFlag(option);
    const value = OPTION_VALUE[given] ?? given;
    this.refusalCwd = temporaryDirectory(this, "spec-controller-rerender-cwd-");
    this.reRendered = spawnController(["--render-from-json", this.savedReport, flag, value], this.refusalCwd);
  },
);

Then(/^the refusal names the (.+ option)$/, function (this: SpecControllerWorld, option: string) {
  const flag = optionFlag(option);
  assert.ok(
    showsEntry(this.reRendered.stderr, "re-render-reads-only", { ignored: flag }),
    `expected stderr to name ${flag} as what a re-render does not read; got:\n${this.reRendered.stderr}`,
  );
});

Then("nothing is re-rendered", function (this: SpecControllerWorld) {
  assert.equal(this.reRendered.stdout, "", `expected no report on stdout; got:\n${this.reRendered.stdout}`);
  assert.equal(existsSync(join(this.refusalCwd, "out.json")), false, "a refused re-render wrote a report file");
});

const BESIDE: Readonly<Record<string, readonly string[]>> = {
  "with nothing else": [],
  strictly: ["--strict"],
  "with a failing verdict zeroed": ["--exit-zero"],
};

Given(/^a saved reconciliation that is (of an out-of-balance run|at a path that is missing)$/, function (this: SpecControllerWorld, saved: string) {
  const scratch = temporaryDirectory(this, "spec-controller-stored-rerender-");
  this.storeRoot = join(scratch, "store");
  this.savedReport = join(scratch, "saved.json");
  if (saved === "at a path that is missing") return;
  const live = specController(["balance", "--features", "tests/fixtures/balanced/features", "--format", `json:${this.savedReport}`]);
  assert.equal(live.status, 1, `expected the saved run out of balance; got ${live.status}\n${live.stderr}`);
});

When(/^the operator asks for it to be re-rendered under a run store (.+)$/, function (this: SpecControllerWorld, beside: string) {
  const flags = BESIDE[beside];
  assert.ok(flags !== undefined, `no flags for "${beside}"`);
  this.invocation = ["--store", this.storeRoot, "--run-id", RUN_ID, "balance", "--render-from-json", this.savedReport, ...flags];
  this.run = specController(this.invocation);
});

Then("the re-render is refused as a usage error, naming the store as what it cannot take", function (this: SpecControllerWorld) {
  assert.equal(this.run.status, USAGE, `expected the usage code; got ${this.run.status}\n${this.run.stderr}`);
  const given = shownEntry(this.run.stderr, "re-render-not-stored")?.["modifiers"] ?? "";
  assert.match(given, /--store\b/, `the refusal does not name --store as what a re-render cannot take:\n${this.run.stderr}`);
});

Then("the refusal names no flag the operator did not give", function (this: SpecControllerWorld) {
  const named = this.run.stderr.match(/--[a-z][a-z-]*/g) ?? [];
  const notGiven = named.filter((flag) => !this.invocation.includes(flag));
  assert.deepEqual(notGiven, [], `the refusal names flags the operator did not give:\n${this.run.stderr}`);
});

Then("the stored re-render produces no report", function (this: SpecControllerWorld) {
  assert.equal(this.run.stdout, "", `a report reached stdout:\n${this.run.stdout.slice(0, 400)}`);
});

Then("no run store is made", function (this: SpecControllerWorld) {
  assert.ok(!existsSync(this.storeRoot), `the store root was made: ${this.storeRoot}`);
});
