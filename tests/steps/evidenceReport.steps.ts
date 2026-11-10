import { Given, Then, When } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { spawnSync, type SpawnSyncReturns } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { NODE, SPEC_CONTROLLER_ARGV } from "./support/builtCli.js";
import { entryText, showsEntry } from "./support/catalogue.js";
import { temporaryDirectory } from "./support/temporaryDirectory.js";
import type { ArrangedTarget, SpecControllerWorld } from "./support/world.js";

// A row may hold several inputs; each is read on its own.
function eachReading(world: SpecControllerWorld): readonly (readonly [ArrangedTarget, SpawnSyncReturns<string>])[] {
  return [[world.target, world.balanceResult], ...world.moreBalanceResults];
}

Given("a target whose working directory has since been removed", function (this: SpecControllerWorld) {
  const parent = temporaryDirectory(this, "unreadable-input-");
  const removed = join(parent, "removed");
  mkdirSync(removed);
  this.target = { dir: removed, args: [], named: "features", where: entryText("default-feature-corpus") };
});

When("balance is asked to reconcile it with no feature corpus given", function (this: SpecControllerWorld) {
  const script = 'cd "$1" && rmdir "$1" && shift && exec "$@"';
  this.balanceResult = spawnSync("/bin/sh", ["-c", script, "sh", this.target.dir, NODE, ...SPEC_CONTROLLER_ARGV, "balance", ...this.target.args], {
    encoding: "utf8",
  });
  assert.equal(this.balanceResult.error, undefined, `CLI failed to spawn: ${this.balanceResult.error?.message}`);
  assert.equal(existsSync(this.target.dir), false, "the working directory should have been removed before the binary ran");
});

Then("the input is refused as one the tool cannot read, never read as a verdict", function (this: SpecControllerWorld) {
  for (const [, result] of eachReading(this)) {
    assert.equal(result.status, 2, `expected the usage exit; got ${result.status}\n${result.stderr}${result.stdout}`);
    assert.ok(!result.stdout.includes(entryText("report-title")), "a refused input must not reach a report");
    assert.doesNotMatch(result.stderr, /^\s+at .*:\d+:\d+\)?$/m, `a refusal is typed, never a stack trace:\n${result.stderr}`);
  }
});

Then("the refusal names the feature corpus read by default and the working directory's read failure", function (this: SpecControllerWorld) {
  assert.ok(
    showsEntry(this.balanceResult.stderr, "could-not-be-read", { subject: this.target.where, path: this.target.named }),
    `expected the could-not-be-read refusal of ${this.target.where}; got:\n${this.balanceResult.stderr}`,
  );
  assert.match(this.balanceResult.stderr, /uv_cwd/, `expected the working directory's read failure; got:\n${this.balanceResult.stderr}`);
});
