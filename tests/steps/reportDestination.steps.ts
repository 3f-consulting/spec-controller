import { Given, Then, When } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { closeSync, existsSync, linkSync, mkdirSync, openSync, readFileSync, symlinkSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { NODE, SPEC_CONTROLLER_ARGV } from "./support/builtCli.js";
import { entryText, showsEntry } from "./support/catalogue.js";
import { assertTargetOutOfBalance, TARGET_ARGS } from "./support/outOfBalanceTarget.js";
import { FORMAT_FLAG } from "./support/reportFormat.js";
import { specController, USAGE } from "./support/specControllerRun.js";
import { temporaryDirectory } from "./support/temporaryDirectory.js";
import type { CommandRun, SpecControllerWorld } from "./support/world.js";

Then("the run is refused as a usage error, never reported as a verdict", function (this: SpecControllerWorld) {
  assert.equal(this.run.status, USAGE, `expected the usage code; got ${this.run.status}\n${this.run.stderr}`);
});

Then("the refusal carries no stack trace", function (this: SpecControllerWorld) {
  assert.doesNotMatch(this.run.stderr, /^\s+at /m, `a stack trace reached stderr:\n${this.run.stderr}`);
  assert.equal(this.run.stderr.trimEnd().split("\n").length, 1, `the refusal is not one line:\n${this.run.stderr}`);
});

Then("no report is produced", function (this: SpecControllerWorld) {
  assert.equal(this.run.stdout, "", `a report reached stdout:\n${this.run.stdout.slice(0, 400)}`);
});

const SECOND_PATH: Readonly<Record<string, (file: string, dir: string, world: SpecControllerWorld) => { first: string; second: string }>> = {
  "the same path": (file) => ({ first: file, second: file }),
  "the path spelled from the current folder": (file) => ({ first: file, second: `./${relative(process.cwd(), file)}` }),
  "its absolute path": (file) => ({ first: relative(process.cwd(), file), second: file }),
  "a path through a sibling folder and back": (file, dir) => {
    mkdirSync(join(dir, "sibling"));
    return { first: file, second: `${dir}/sibling/../shared.out` };
  },
  "a symbolic link to it": (file, dir) => {
    symlinkSync(file, join(dir, "link.out"));
    return { first: file, second: join(dir, "link.out") };
  },
  "a path through a link to its folder": (file, _dir, world) => {
    symlinkSync(join(world.destinationScratch, "dir"), join(world.destinationScratch, "dir-link"));
    return { first: file, second: join(world.destinationScratch, "dir-link", "shared.out") };
  },
  "a hard link to it": (file, dir) => {
    linkSync(file, join(dir, "hard.out"));
    return { first: file, second: join(dir, "hard.out") };
  },
  "where the default report destination is redirected": (file) => ({ first: file, second: file }),
};

Given(/^an out-of-balance target and a report file that (does not exist|holds an earlier run)$/, function (this: SpecControllerWorld, state: string) {
  assertTargetOutOfBalance();
  this.destinationScratch = temporaryDirectory(this, "spec-controller-shared-");
  mkdirSync(join(this.destinationScratch, "dir"));
  this.sharedFile = join(this.destinationScratch, "dir", "shared.out");
  this.thirdPath = join(this.destinationScratch, "dir", "third.json");
  this.sharedBefore = state === "holds an earlier run" ? "an earlier run's report\n" : null;
  if (this.sharedBefore !== null) writeFileSync(this.sharedFile, this.sharedBefore);
});

Given(/^a second path to that file that is (.+)$/, function (this: SpecControllerWorld, alias: string) {
  const arrange = SECOND_PATH[alias];
  assert.ok(arrange, `no second path is arranged for "${alias}"`);
  ({ first: this.firstPath, second: this.secondPath } = arrange(this.sharedFile, join(this.destinationScratch, "dir"), this));
  this.throughStdout = alias === "where the default report destination is redirected";
});

When(
  /^the operator asks for the (markdown|json) report at the file and the (markdown|json) report at the second path, and a third report at a file of its own$/,
  function (this: SpecControllerWorld, first: string, second: string) {
    const firstFlag = FORMAT_FLAG[first]!;
    const firstSpec = this.throughStdout ? firstFlag : `${firstFlag}:${this.firstPath}`;
    const secondSpec = `${FORMAT_FLAG[second]}:${this.secondPath}`;
    this.namedOutputs = [this.throughStdout ? entryText("format-on-standard-output", { fmt: firstFlag }) : firstSpec, secondSpec];
    const args = ["balance", ...TARGET_ARGS, ...[firstSpec, secondSpec, `json:${this.thirdPath}`].flatMap((spec) => ["--format", spec])];
    this.run = this.throughStdout ? specControllerInto(this.sharedFile, args) : specController(args);
  },
);

function specControllerInto(file: string, args: readonly string[]): CommandRun {
  const fd = openSync(file, "a");
  try {
    const result = spawnSync(NODE, [...SPEC_CONTROLLER_ARGV, ...args], { cwd: process.cwd(), encoding: "utf8", stdio: ["ignore", fd, "pipe"] });
    assert.equal(result.error, undefined, `the CLI failed to spawn: ${result.error?.message}`);
    return { status: result.status, stdout: "", stderr: result.stderr };
  } finally {
    closeSync(fd);
  }
}

Then("the refusal names both outputs that share the file", function (this: SpecControllerWorld) {
  const [first, second] = this.namedOutputs;
  assert.ok(
    showsEntry(this.run.stderr, "outputs-share-file", { first: first ?? "", second: second ?? "" }),
    `the refusal does not name ${this.namedOutputs.join(" and ")}:\n${this.run.stderr}`,
  );
});

Then("every destination is left exactly as it was", function (this: SpecControllerWorld) {
  if (this.sharedBefore === null) {
    assert.equal(existsSync(this.sharedFile), false, `${this.sharedFile} was created by a refused run`);
  } else {
    assert.equal(readFileSync(this.sharedFile, "utf8"), this.sharedBefore, `${this.sharedFile} was overwritten by a refused run`);
  }
  assert.equal(existsSync(this.thirdPath), false, `${this.thirdPath} was created by a refused run`);
});
