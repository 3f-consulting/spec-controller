import assert from "node:assert/strict";
import { spawnSync, type SpawnSyncReturns } from "node:child_process";
import { NODE, SPEC_CONTROLLER_ARGV } from "./builtCli.js";

export function git(repo: string, args: readonly string[]): string {
  const result = spawnSync(
    "git",
    ["-c", "user.name=fixture", "-c", "user.email=fixture@example.invalid", "-c", "commit.gpgsign=false", ...args],
    { cwd: repo, encoding: "utf8", env: { ...process.env, GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_NOSYSTEM: "1" } },
  );
  assert.equal(result.status, 0, `git ${args.join(" ")} failed in the fixture: ${result.stderr}`);
  return result.stdout;
}

export function allocate(cwd: string, args: readonly string[]): SpawnSyncReturns<string> {
  const result = spawnSync(NODE, [...SPEC_CONTROLLER_ARGV, "allocate", ...args], { cwd, encoding: "utf8" });
  assert.equal(result.error, undefined, `the binary failed to spawn: ${result.error?.message}`);
  return result;
}
