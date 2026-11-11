import assert from "node:assert/strict";
import { spawnSync, type StdioOptions } from "node:child_process";
import { NODE, SPEC_CONTROLLER_ARGV } from "./builtCli.js";
import type { CommandRun } from "./world.js";

// A target that reconciles balanced, so a run that writes its reports exits 0.
export const BALANCED_ARGS: readonly string[] = [
  "--features",
  "tests/fixtures/balanced/features",
  "--vitest",
  "tests/fixtures/balanced/vitest.json",
  "--package-json",
  "tests/fixtures/balanced/package.json",
  "--ci",
  "tests/fixtures/balanced",
];

export function specController(args: readonly string[], stdio: StdioOptions = "pipe"): CommandRun {
  const result = spawnSync(NODE, [...SPEC_CONTROLLER_ARGV, ...args], { cwd: process.cwd(), encoding: "utf8", stdio });
  assert.equal(result.error, undefined, `the CLI failed to spawn: ${result.error?.message}`);
  return { status: result.status, stdout: result.stdout ?? "", stderr: result.stderr ?? "" };
}
