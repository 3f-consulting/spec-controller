import { Given, Then, When } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { NODE, SPEC_CONTROLLER_ARGV } from "./support/builtCli.js";
import { entryText, shownEntry } from "./support/catalogue.js";
import { temporaryDirectory } from "./support/temporaryDirectory.js";
import type { SpecControllerWorld } from "./support/world.js";

// The corpus balance reads when no --features is given, relative to the working directory.
const DEFAULT_CORPUS = "features";

Given(
  "the run met the corpus read by default that sits under a working directory that has been removed",
  function (this: SpecControllerWorld) {
    this.removedWorkingDirectory = join(temporaryDirectory(this, "spec-controller-removed-cwd-"), "removed");
    mkdirSync(this.removedWorkingDirectory);
  },
);

// The shell enters the directory, removes it, then becomes the CLI, so the CLI starts in a directory that is gone.
When("it stops", function (this: SpecControllerWorld) {
  const script = 'cd "$1" && rmdir "$1" && shift && exec "$@"';
  const result = spawnSync("/bin/sh", ["-c", script, "sh", this.removedWorkingDirectory, NODE, ...SPEC_CONTROLLER_ARGV, "balance"], {
    encoding: "utf8",
  });
  assert.equal(result.error, undefined, `the CLI failed to spawn: ${result.error?.message}`);
  assert.equal(existsSync(this.removedWorkingDirectory), false, "the working directory should have been removed before the CLI ran");
  this.run = { status: result.status, stdout: result.stdout, stderr: result.stderr };
});

Then("it will give no verdict, and will exit {int}", function (this: SpecControllerWorld, code: number) {
  assert.equal(this.run.status, code, `expected exit ${code}; got ${this.run.status}\n${this.run.stderr}`);
  assert.equal(this.run.stdout, "", `a report reached standard output:\n${this.run.stdout}`);
  assert.ok(!this.run.stderr.includes(entryText("report-title")), `a report reached standard error:\n${this.run.stderr}`);
});

Then("it will complain about the error, with the corpus read by default, and what is wrong", function (this: SpecControllerWorld) {
  const shown = shownEntry(this.run.stderr, "could-not-be-read", { subject: entryText("default-feature-corpus"), path: DEFAULT_CORPUS });
  assert.ok(shown, `expected a complaint that the corpus read by default could not be read; got:\n${this.run.stderr}`);
  assert.match(shown.reason ?? "", /uv_cwd/, `expected the complaint to say the working directory could not be read; got:\n${this.run.stderr}`);
});
