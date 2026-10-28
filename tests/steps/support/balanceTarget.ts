import assert from "node:assert/strict";
import { spawnSync, type SpawnSyncReturns } from "node:child_process";
import { NODE, SPEC_CONTROLLER_ARGV } from "./builtCli.js";
import type { SpecControllerWorld } from "./world.js";

export const OUT_OF_BALANCE_INPUTS = {
  features: "tests/fixtures/evidence-observation/features",
  vitest: "tests/fixtures/evidence-observation/vitest.json",
};

export const BALANCED_INPUTS = {
  features: "tests/fixtures/balanced/features",
  vitest: "tests/fixtures/balanced/vitest.json",
  packageJson: "tests/fixtures/balanced/package.json",
};

export const NO_WORKFLOWS = (fixtureDir: string): string[] => ["--ci", fixtureDir];

export function spawnBalance(world: SpecControllerWorld, args: string[]): SpawnSyncReturns<string> {
  const root = process.cwd();
  const cwd = world.invocationCwd ?? root;
  world.invocationCwd = undefined;
  const result = spawnSync(
    NODE,
    [...SPEC_CONTROLLER_ARGV, "balance", ...args],
    { cwd, encoding: "utf8" },
  );
  assert.equal(result.error, undefined, `CLI failed to spawn: ${result.error?.message}`);
  return result;
}
