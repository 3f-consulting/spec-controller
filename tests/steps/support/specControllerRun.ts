import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { NODE, SPEC_CONTROLLER_ARGV } from "./builtCli.js";
import type { CommandRun } from "./world.js";

export const USAGE = 2;

export function specController(args: readonly string[]): CommandRun {
  const result = spawnSync(NODE, [...SPEC_CONTROLLER_ARGV, ...args], { cwd: process.cwd(), encoding: "utf8" });
  assert.equal(result.error, undefined, `the CLI failed to spawn: ${result.error?.message}`);
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
}

export const BALANCED = 0;

export const OUT_OF_BALANCE = 1;
