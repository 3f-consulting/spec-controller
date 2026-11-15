import { Given, Then, When } from "@cucumber/cucumber";
import { spawnSync } from "node:child_process";
import assert from "node:assert/strict";
import { resolve } from "node:path";
import { temporaryDirectory } from "./support/temporaryDirectory.js";

const CLI = resolve("packages/spec-controller/dist/cli.js");

interface StoppedRun {
  folder: string;
  status: number | null;
  output: string;
  error: string;
}

Given("the run met the corpus read by default that sits under a working directory that has been removed", function (this: StoppedRun) {
  this.folder = temporaryDirectory("removed-working-directory-");
});

// balance starts in a folder removed before it runs, so its working directory does not exist.
When("it stops", function (this: StoppedRun) {
  const run = spawnSync("sh", ["-c", 'cd "$0" && rmdir "$0" && exec "$1" "$2" balance', this.folder, process.execPath, CLI], { encoding: "utf8" });
  this.status = run.status;
  this.output = run.stdout;
  this.error = run.stderr;
});

Then("it will give no verdict, and will exit 2", function (this: StoppedRun) {
  assert.deepEqual({ status: this.status, output: this.output }, { status: 2, output: "" }, this.error);
});

Then("it will complain about the error, with the corpus read by default, and what is wrong", function (this: StoppedRun) {
  const complaint = this.error.split("\n").find((line) => line.includes("the feature corpus"));
  assert.ok(complaint?.includes("read by default") && complaint.includes("working directory"), this.error);
});
