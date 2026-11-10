import { After, When } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { NODE, SPEC_CONTROLLER_ARGV } from "./support/builtCli.js";
import type { SpecControllerWorld } from "./support/world.js";

After(function (this: SpecControllerWorld) {
  while (this.permissionsTaken.length > 0) this.permissionsTaken.pop()?.();
});

When("balance reconciles that target", function (this: SpecControllerWorld) {
  const { cwd, inputs } = this.reconciledTarget;
  const result = spawnSync(NODE, [...SPEC_CONTROLLER_ARGV, "balance", ...inputs, "--format", "json"], { cwd, encoding: "utf8" });
  assert.equal(result.error, undefined, `CLI failed to spawn: ${result.error?.message}`);
  try {
    this.reconciledRun = { status: result.status, report: JSON.parse(result.stdout) as unknown };
  } catch {
    assert.fail(`expected a JSON reconciliation on stdout; exit ${result.status}\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`);
  }
});
