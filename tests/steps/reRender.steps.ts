import { Given, When, Then, After } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { spawnSync, type SpawnSyncReturns } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { optionFlag } from "./support/balanceOption.js";
import { NODE, SPEC_CONTROLLER_ARGV } from "./support/builtCli.js";
import { exitOn, RUN_OUTCOME } from "./support/runExit.js";
import { temporaryDirectory } from "./support/temporaryDirectory.js";

const SAVED_VERDICTS: Record<string, { fixture: string; flags: string[] }> = {
  "all-balanced": { fixture: "balanced", flags: [] },
  "out-of-balance": { fixture: "evidence-observation", flags: [] },
  "balanced-with-scenario-code-errors": { fixture: "scenario-code-error", flags: [] },
  unsound: { fixture: "broken", flags: [] },
  "nothing to reconcile": { fixture: "nothing-to-reconcile", flags: [] },
  "only-Pending-Items under the strict option": { fixture: "pending-only", flags: ["--strict"] },
};

let scratch: string | undefined;
let savedReport = "";
let reRendered: SpawnSyncReturns<string>;

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

function saveLiveRun(fixture: string, flags: string[]): string {
  const dir = join(process.cwd(), "tests", "fixtures", fixture);
  scratch ??= temporaryDirectory("spec-controller-rerender-");
  const path = join(scratch, `${fixture}${flags.join("")}.json`);
  const live = spawnController([...fixtureInputs(dir), ...flags, "--format", `json:${path}`], dir);
  assert.ok(existsSync(path), `the live run saved no report (exit ${live.status}):\n${live.stderr}`);
  return path;
}

function headlineExit(stdout: string): number {
  const after = stdout.split("### Run verdict")[1] ?? "";
  const line = after.split("\n").find((l) => l.trim() !== "") ?? "";
  const match = /\(exit (\d)\)$/.exec(line);
  assert.ok(match, `expected a verdict headline naming an exit; got:\n${line}`);
  return Number(match[1]);
}

Given(/^a saved reconciliation of a target that reconciles (.+)$/, function (verdict: string) {
  const target = SAVED_VERDICTS[verdict];
  assert.ok(target, `no fixture reconciles "${verdict}"`);
  savedReport = saveLiveRun(target.fixture, target.flags);
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
  function (saved: string) {
    const strict = saved === "under the strict option" ? ["--strict"] : [];
    const path = saveLiveRun("pending-only", strict);
    savedReport = saved === "before strictness was recorded" ? withoutStrictRecord(path) : path;
  },
);

When(
  /^balance is asked to re-render the saved reconciliation (with no options|under the strict option)$/,
  function (given: string) {
    const flags = given === "under the strict option" ? ["--strict"] : [];
    reRendered = spawnController(["--render-from-json", savedReport, ...flags], process.cwd());
  },
);

When(
  "balance is asked to re-render the saved reconciliation",
  function () {
    reRendered = spawnController(["--render-from-json", savedReport], process.cwd());
  },
);

Then(new RegExp(`^the re-render ends on (${RUN_OUTCOME})$`), function (outcome: string) {
  const code = exitOn(outcome);
  assert.equal(reRendered.status, code, `expected the re-render to exit ${code}; got ${reRendered.status}:\n${reRendered.stderr}`);
});

Then("the re-render is refused as a usage error", function () {
  const code = exitOn("a usage error");
  assert.equal(reRendered.status, code, `expected the re-render to exit ${code}; got ${reRendered.status}:\n${reRendered.stderr}`);
});

Then(new RegExp(`^the re-render's verdict headline names the exit for (${RUN_OUTCOME})$`), function (outcome: string) {
  assert.equal(headlineExit(reRendered.stdout), exitOn(outcome));
});

let exitZeroPair: { without: SpawnSyncReturns<string>; with: SpawnSyncReturns<string> } | undefined;

When(
  "balance is asked to re-render the saved reconciliation, once without the report-only option and once under it",
  function () {
    exitZeroPair = {
      without: spawnController(["--render-from-json", savedReport], process.cwd()),
      with: spawnController(["--render-from-json", savedReport, "--exit-zero"], process.cwd()),
    };
  },
);

Then(new RegExp(`^without the report-only option the re-render ends on (${RUN_OUTCOME})$`), function (outcome: string) {
  assert.equal(exitZeroPair?.without.status, exitOn(outcome), `without --exit-zero:\n${exitZeroPair?.without.stderr}`);
});

Then(new RegExp(`^under the report-only option the re-render ends on (${RUN_OUTCOME})$`), function (outcome: string) {
  assert.equal(exitZeroPair?.with.status, exitOn(outcome), `with --exit-zero:\n${exitZeroPair?.with.stderr}`);
});

Then("the two re-renders report the same, byte for byte", function () {
  assert.ok(exitZeroPair && exitZeroPair.without.stdout.includes("### Run verdict"), "the re-render printed no report");
  assert.equal(exitZeroPair.with.stdout, exitZeroPair.without.stdout);
});

let refusalCwd = "";

const OPTION_VALUE: Record<string, string> = {
  "the json report in a file": "json:out.json",
};

When(
  /^balance is asked to re-render the saved reconciliation with the (.+ option) given (.+)$/,
  function (option: string, given: string) {
    const flag = optionFlag(option);
    const value = OPTION_VALUE[given] ?? given;
    refusalCwd = temporaryDirectory("spec-controller-rerender-cwd-");
    reRendered = spawnController(["--render-from-json", savedReport, flag, value], refusalCwd);
  },
);

Then(/^the refusal names the (.+ option)$/, function (option: string) {
  const flag = optionFlag(option);
  assert.ok(reRendered.stderr.includes(flag), `expected stderr to name ${flag}; got:\n${reRendered.stderr}`);
});

Then("nothing is re-rendered", function () {
  assert.equal(reRendered.stdout, "", `expected no report on stdout; got:\n${reRendered.stdout}`);
  assert.equal(existsSync(join(refusalCwd, "out.json")), false, "a refused re-render wrote a report file");
});

After(function () {
  scratch = undefined;
});
