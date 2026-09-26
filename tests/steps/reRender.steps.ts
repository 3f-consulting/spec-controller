/**
 * Step definitions for the re-render Rules of features/cli-balance.feature: a live run over a
 * fixture target saves its report, and the real binary re-renders it.
 *
 * Each live run stands in its fixture's own directory and names only the inputs that directory
 * holds, so no default resolved against the cwd reaches this tree's own CI or manifest.
 */

import { Given, When, Then, After } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { spawnSync, type SpawnSyncReturns } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { NODE, SPEC_CONTROLLER_ARGV } from "./support/builtCli.js";

/** Each verdict a saved report can carry: the fixture that reconciles to it, and any live flag. */
const SAVED_VERDICTS: Record<string, { fixture: string; flags: string[] }> = {
  "all-balanced": { fixture: "balanced", flags: [] },
  "out-of-balance": { fixture: "evidence-observation", flags: [] },
  "balanced-with-scenario-code-errors": { fixture: "scenario-code-error", flags: [] },
  unsound: { fixture: "broken", flags: [] },
  "nothing to reconcile": { fixture: "nothing-to-reconcile", flags: [] },
  "only-Pending-Items under --strict": { fixture: "pending-only", flags: ["--strict"] },
};

let scratch: string | undefined;
let savedReport = "";
let reRendered: SpawnSyncReturns<string>;

function spawnController(args: string[], cwd: string): SpawnSyncReturns<string> {
  const result = spawnSync(NODE, [...SPEC_CONTROLLER_ARGV, "balance", ...args], { cwd, encoding: "utf8" });
  assert.equal(result.error, undefined, `CLI failed to spawn: ${result.error?.message}`);
  return result;
}

/** The inputs a fixture directory holds, named relative to it. */
function fixtureInputs(dir: string): string[] {
  const args = ["--features", "features"];
  for (const [flag, file] of [["--vitest", "vitest.json"], ["--cucumber", "cucumber.json"], ["--package-json", "package.json"]]) {
    if (existsSync(join(dir, file as string))) args.push(flag as string, file as string);
  }
  return args;
}

/** Run the fixture live and save its report as JSON; the saved path is what the re-render reads. */
function saveLiveRun(fixture: string, flags: string[]): string {
  const dir = join(process.cwd(), "tests", "fixtures", fixture);
  scratch ??= mkdtempSync(join(tmpdir(), "spec-controller-rerender-"));
  const path = join(scratch, `${fixture}${flags.join("")}.json`);
  const live = spawnController([...fixtureInputs(dir), ...flags, "--format", `json:${path}`], dir);
  assert.ok(existsSync(path), `the live run saved no report (exit ${live.status}):\n${live.stderr}`);
  return path;
}

/** The `(exit N)` that ends the first non-empty line under the verdict heading, and nowhere else. */
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

/** The same report as the live run saved it, less the strictness record a report saved before it lacks. */
function withoutStrictRecord(path: string): string {
  const report = JSON.parse(readFileSync(path, "utf8")) as { runProvenance: Record<string, unknown> };
  assert.ok("strict" in report.runProvenance, "the live run recorded no strictness to remove");
  delete report.runProvenance["strict"];
  const older = path.replace(/\.json$/, "-unrecorded.json");
  writeFileSync(older, JSON.stringify(report, null, 2));
  return older;
}

Given(
  /^a saved reconciliation of a target whose only exception is Pending Items, saved (under --strict|without --strict|before strictness was recorded)$/,
  function (saved: string) {
    const strict = saved === "under --strict" ? ["--strict"] : [];
    const path = saveLiveRun("pending-only", strict);
    savedReport = saved === "before strictness was recorded" ? withoutStrictRecord(path) : path;
  },
);

When(
  /^"spec-controller balance --render-from-json" is invoked (with no flags|with --strict) over the saved reconciliation through the CLI binary$/,
  function (given: string) {
    const flags = given === "with --strict" ? ["--strict"] : [];
    reRendered = spawnController(["--render-from-json", savedReport, ...flags], process.cwd());
  },
);

When(
  '"spec-controller balance --render-from-json" is invoked over the saved reconciliation through the CLI binary',
  function () {
    reRendered = spawnController(["--render-from-json", savedReport], process.cwd());
  },
);

Then("the re-render exits with status {int}", function (code: number) {
  assert.equal(reRendered.status, code, `expected the re-render to exit ${code}; got ${reRendered.status}:\n${reRendered.stderr}`);
});

Then("the re-render's verdict headline names exit {int}", function (code: number) {
  assert.equal(headlineExit(reRendered.stdout), code);
});

let exitZeroPair: { without: SpawnSyncReturns<string>; with: SpawnSyncReturns<string> } | undefined;

When(
  '"spec-controller balance --render-from-json" is invoked over the saved reconciliation through the CLI binary, once without --exit-zero and once with it',
  function () {
    exitZeroPair = {
      without: spawnController(["--render-from-json", savedReport], process.cwd()),
      with: spawnController(["--render-from-json", savedReport, "--exit-zero"], process.cwd()),
    };
  },
);

Then("without --exit-zero the re-render exits with status {int}", function (code: number) {
  assert.equal(exitZeroPair?.without.status, code, `without --exit-zero:\n${exitZeroPair?.without.stderr}`);
});

Then("with --exit-zero the re-render exits with status {int}", function (code: number) {
  assert.equal(exitZeroPair?.with.status, code, `with --exit-zero:\n${exitZeroPair?.with.stderr}`);
});

Then("the two re-renders print the same report, byte for byte", function () {
  assert.ok(exitZeroPair && exitZeroPair.without.stdout.includes("### Run verdict"), "the re-render printed no report");
  assert.equal(exitZeroPair.with.stdout, exitZeroPair.without.stdout);
});

let refusalCwd = "";

When(
  /^"spec-controller balance --render-from-json" is invoked with (--[a-z-]+) (\S+) over the saved reconciliation through the CLI binary$/,
  function (flag: string, value: string) {
    refusalCwd = mkdtempSync(join(scratch ?? tmpdir(), "cwd-"));
    reRendered = spawnController(["--render-from-json", savedReport, flag, value], refusalCwd);
  },
);

Then("stderr names the flag {word}", function (flag: string) {
  assert.ok(reRendered.stderr.includes(flag), `expected stderr to name ${flag}; got:\n${reRendered.stderr}`);
});

Then("nothing is re-rendered", function () {
  assert.equal(reRendered.stdout, "", `expected no report on stdout; got:\n${reRendered.stdout}`);
  assert.equal(existsSync(join(refusalCwd, "out.json")), false, "a refused re-render wrote a report file");
});

After(function () {
  if (scratch !== undefined) rmSync(scratch, { recursive: true, force: true });
  scratch = undefined;
});
