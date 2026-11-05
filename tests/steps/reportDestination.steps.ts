import { Given, Then, When } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmodSync, closeSync, copyFileSync, existsSync, linkSync, lstatSync, mkdirSync, openSync, readFileSync, readlinkSync, symlinkSync, writeFileSync } from "node:fs";
import { basename, dirname, join, relative } from "node:path";
import { NODE, SPEC_CONTROLLER_ARGV } from "./support/builtCli.js";
import { entryText, shownEntry, showsEntry } from "./support/catalogue.js";
import { showsHeading } from "./support/reportLines.js";
import { entriesUnder } from "./support/entriesUnder.js";
import { assertTargetOutOfBalance, BALANCED_ARGS, TARGET_ARGS } from "./support/outOfBalanceTarget.js";
import { REASON_CODE } from "./support/refusalReason.js";
import { FORMAT_FLAG } from "./support/reportFormat.js";
import { BALANCED, OUT_OF_BALANCE, RUN_ID, specController, USAGE } from "./support/specControllerRun.js";
import { temporaryDirectory } from "./support/temporaryDirectory.js";
import type { CommandRun, InputRow, PointedAt, SpecControllerWorld } from "./support/world.js";

const FIXTURE = {
  features: "tests/fixtures/evidence-observation/features",
  vitest: "tests/fixtures/evidence-observation/vitest.json",
  cucumber: "tests/fixtures/evidence-observation/cucumber.json",
};

function balanceTheFixtureFromTheCorpus(world: SpecControllerWorld, formatArgs: readonly string[]): void {
  const abs = (p: string): string => join(process.cwd(), p);
  world.balanceResult = spawnSync(
    NODE,
    [
      ...SPEC_CONTROLLER_ARGV,
      "balance",
      "--features", abs(FIXTURE.features),
      "--vitest", abs(FIXTURE.vitest),
      "--cucumber", abs(FIXTURE.cucumber),
      "--target", "evidence observation-fixture",
      ...formatArgs,
    ],
    { cwd: world.corpusCwd, encoding: "utf8" }
  );
}

When("the operator asks for the markdown report in a file", function (this: SpecControllerWorld) {
  this.markdownDestination = join(this.corpusCwd, "spec-reconciliation.md");
  balanceTheFixtureFromTheCorpus(this, ["--format", `md:${this.markdownDestination}`]);
});

Then("the markdown report is in that file, and nothing else is reported", function (this: SpecControllerWorld) {
  assert.equal(this.balanceResult.error, undefined, `the CLI subprocess failed to spawn: ${this.balanceResult.error?.message}`);
  assert.equal(
    this.balanceResult.status,
    1,
    `expected exit 1 (the fixture is out of balance); got ${this.balanceResult.status}\n${this.balanceResult.stderr}`
  );
  assert.ok(existsSync(this.markdownDestination), `expected the markdown report at ${this.markdownDestination}; it does not exist`);
  const report = readFileSync(this.markdownDestination, "utf8");
  assert.ok(showsHeading(report, 2, "run-provenance-heading"), `expected the markdown report in the file; got:\n${report}`);
  assert.ok(report.split("\n").some((line) => line.startsWith(`| ${entryText("claim-column")} |`)), `expected the claim table in the file; got:\n${report}`);
  assert.equal(this.balanceResult.stdout, "", `expected nothing on stdout; got:\n${this.balanceResult.stdout}`);
});

Given("a target corpus to reconcile", function (this: SpecControllerWorld) {
  this.corpusCwd = temporaryDirectory(this, "spec-controller-corpus-");
  assert.ok(
    existsSync(join(process.cwd(), FIXTURE.features)),
    "the reconcilable fixture features dir is missing"
  );
});

When("the operator asks for the markdown report and the json report, neither given a file of its own", function (this: SpecControllerWorld) {
  balanceTheFixtureFromTheCorpus(this, ["--format", "md", "--format", "json"]);
});

Then("the run is rejected", function (this: SpecControllerWorld) {
  assert.equal(
    this.balanceResult.error,
    undefined,
    `expected the CLI subprocess to run; it failed to spawn: ${this.balanceResult.error?.message}`
  );
  assert.notEqual(
    this.balanceResult.status,
    0,
    `expected a non-zero exit rejecting two outputs both routed to stdout; got exit ${this.balanceResult.status}\n` +
      `stdout:\n${this.balanceResult.stdout}\nstderr:\n${this.balanceResult.stderr}`
  );
});

Then("the rejection hints to give one of the outputs a path of its own", function (this: SpecControllerWorld) {
  const stderr = this.balanceResult.stderr ?? "";
  assert.ok(
    showsEntry(stderr, "more-than-one-to-stdout"),
    `expected stderr to explain the stdout collision and hint at giving one output a :<path>; got:\n${stderr}`
  );
});

Given("a target corpus to reconcile with a destination for the legacy json option", function (this: SpecControllerWorld) {
  this.corpusCwd = temporaryDirectory(this, "spec-controller-fmt006-");
  this.jsonDestination = join(this.corpusCwd, "out.json");
  assert.ok(
    existsSync(join(process.cwd(), FIXTURE.features)),
    "the reconcilable fixture features dir is missing"
  );
});

When("the operator asks for the json report through the removed legacy json option", function (this: SpecControllerWorld) {
  balanceTheFixtureFromTheCorpus(this, ["--json", this.jsonDestination]);
});

Then("the run is rejected and does not create that destination", function (this: SpecControllerWorld) {
  assert.equal(
    this.balanceResult.error,
    undefined,
    `expected the CLI subprocess to run; it failed to spawn: ${this.balanceResult.error?.message}`
  );
  assert.notEqual(
    this.balanceResult.status,
    0,
    `expected a non-zero exit rejecting the removed --json flag; got exit ${this.balanceResult.status}\n` +
      `stdout:\n${this.balanceResult.stdout}\nstderr:\n${this.balanceResult.stderr}`
  );
  assert.ok(
    !existsSync(this.jsonDestination),
    `expected the removed --json flag NOT to write ${this.jsonDestination}; the file exists (the legacy write path is still live)`
  );
});

Then("the rejection hints to use the format option to write the json report to a file", function (this: SpecControllerWorld) {
  const stderr = this.balanceResult.stderr ?? "";
  assert.ok(
    showsEntry(stderr, "legacy-json-removed"),
    `expected stderr to hint at using --format json:<path>; got:\n${stderr}`
  );
});

Given("a target corpus to reconcile with an unsupported report format", function (this: SpecControllerWorld) {
  this.corpusCwd = temporaryDirectory(this, "spec-controller-fmt007-");
  assert.ok(
    existsSync(join(process.cwd(), FIXTURE.features)),
    "the reconcilable fixture features dir is missing"
  );
});

When("the operator asks for the xml report", function (this: SpecControllerWorld) {
  balanceTheFixtureFromTheCorpus(this, ["--format", "xml"]);
});

Then("the run is rejected for the unknown format", function (this: SpecControllerWorld) {
  assert.equal(
    this.balanceResult.error,
    undefined,
    `expected the CLI subprocess to run; it failed to spawn: ${this.balanceResult.error?.message}`
  );
  assert.notEqual(
    this.balanceResult.status,
    0,
    `expected a non-zero exit rejecting the unknown format xml; got exit ${this.balanceResult.status}\n` +
      `stdout:\n${this.balanceResult.stdout}\nstderr:\n${this.balanceResult.stderr}`
  );
});

Then("the rejection lists the supported formats md and json", function (this: SpecControllerWorld) {
  const stderr = this.balanceResult.stderr ?? "";
  const supported = shownEntry(stderr, "unknown-format", { formats: "xml" })?.["supported"] ?? "";
  assert.match(
    supported,
    /\bmd\b/,
    `expected stderr to list md as a supported format; got:\n${stderr}`
  );
  assert.match(
    supported,
    /\bjson\b/,
    `expected stderr to list json as a supported format; got:\n${stderr}`
  );
});

const BALANCED_FIXTURE_DIR = join(process.cwd(), "tests", "fixtures", "balanced");

const WORKFLOW = "name: ci\non: [push]\njobs:\n  build:\n    runs-on: ubuntu-latest\n    steps:\n      - run: pnpm test\n";

const MANIFEST = `${JSON.stringify({ name: "input-overwrite-target", private: true, scripts: { test: "vitest run" }, specController: { runners: { unit: "vitest" } } })}\n`;

const REPORTS = ["--vitest", "vitest.json", "--cucumber", "cucumber.json", "--ci-steps", "ci-steps.json", "--target", "input-overwrite"];

const POINTED: PointedAt = { features: "features", manifest: "package.json", workflows: "ci.yml" };

// An input is named mid-sentence, so its entry's opening capital is lowered.
function inputNamed(code: string, flag?: string): string {
  const text = entryText(code, flag === undefined ? {} : { flag });
  return text.charAt(0).toLowerCase() + text.slice(1);
}

const INPUT: Readonly<Record<string, InputRow>> = {
  "the unit test report": { file: "vitest.json", pointedAt: POINTED, subject: inputNamed("flagged-report", "--vitest") },
  "the cucumber report": { file: "cucumber.json", pointedAt: POINTED, subject: inputNamed("flagged-report", "--cucumber") },
  "the record of the CI steps": { file: "ci-steps.json", pointedAt: POINTED, subject: inputNamed("flagged-record", "--ci-steps") },
  "the manifest it was pointed at": { file: "package.json", pointedAt: POINTED, subject: inputNamed("flagged-manifest", "--package-json") },
  "the manifest it reads by default": { file: "package.json", pointedAt: { ...POINTED, manifest: undefined }, subject: inputNamed("default-package-json") },
  "a feature file of the corpus it was pointed at": { file: "features/target.feature", pointedAt: POINTED, subject: entryText("flagged-corpus-feature-file") },
  "a feature file of the corpus it reads by default": {
    file: "features/target.feature",
    pointedAt: { ...POINTED, features: undefined },
    subject: entryText("default-corpus-feature-file"),
  },
  "the workflow file it was pointed at": { file: "ci.yml", pointedAt: POINTED, subject: entryText("flagged-ci-workflow") },
  "a .yml workflow of the folder it was pointed at": { file: "cidir/ci.yml", pointedAt: { ...POINTED, workflows: "cidir" }, subject: entryText("flagged-ci-folder-workflow") },
  "a .yaml workflow of the folder it was pointed at": { file: "cidir/other.yaml", pointedAt: { ...POINTED, workflows: "cidir" }, subject: entryText("flagged-ci-folder-workflow") },
  "a workflow of the folder it reads by default": {
    file: ".github/workflows/ci.yml",
    pointedAt: { ...POINTED, workflows: undefined },
    subject: entryText("default-ci-workflow"),
  },
  "the unit test report, named through a symbolic link": {
    file: "vitest.json",
    pointedAt: { ...POINTED, vitest: "vitest-link.json" },
    subject: inputNamed("flagged-report", "--vitest"),
    arrange: (target) => symlinkSync(join(target, "vitest.json"), join(target, "vitest-link.json")),
  },
  "a feature file of the corpus, named through a linked folder": {
    file: "features/target.feature",
    pointedAt: { ...POINTED, features: "features-link" },
    subject: entryText("flagged-corpus-feature-file"),
    arrange: (target) => symlinkSync(join(target, "features"), join(target, "features-link")),
  },
};

const APPENDED_STDOUT = "where the default report destination is appended";

const ALIAS: Readonly<Record<string, (file: string, target: string) => string>> = {
  "its own path": (file) => file,
  "the path spelled from the current folder": (file) => `./${file}`,
  "its absolute path": (file, target) => join(target, file),
  "a path through a sibling folder and back": (file, target) => {
    mkdirSync(join(target, "sibling"));
    return `sibling/../${file}`;
  },
  "a symbolic link to it": (file, target) => {
    symlinkSync(join(target, file), join(target, "link.out"));
    return "link.out";
  },
  "a hard link to it": (file, target) => {
    linkSync(join(target, file), join(target, "hard.out"));
    return "hard.out";
  },
  "a path through a link to its folder": (file, target) => {
    symlinkSync(join(target, dirname(file)), join(target, "folder-link"));
    return join("folder-link", basename(file));
  },
  [APPENDED_STDOUT]: (file) => file,
};

// A memo across scenarios, not scenario state: a target built the same way reconciles the same way, so it is judged once.
const verdicts = new Map<string, number | null>();

function pointedArgs(pointedAt: PointedAt): string[] {
  const args = [...REPORTS];
  if (pointedAt.vitest !== undefined) args[1] = pointedAt.vitest;
  if (pointedAt.features !== undefined) args.push("--features", pointedAt.features);
  if (pointedAt.manifest !== undefined) args.push("--package-json", pointedAt.manifest);
  if (pointedAt.workflows !== undefined) args.push("--ci", pointedAt.workflows);
  return args;
}

function buildTarget(dir: string, verdict: string): void {
  mkdirSync(join(dir, "features"));
  copyFileSync(join(BALANCED_FIXTURE_DIR, "features", "target.feature"), join(dir, "features", "target.feature"));
  const vitest = readFileSync(join(BALANCED_FIXTURE_DIR, "vitest.json"), "utf8");
  writeFileSync(join(dir, "vitest.json"), verdict === "out-of-balance" ? vitest.replace('"passed"', '"failed"') : vitest);
  writeFileSync(join(dir, "cucumber.json"), "[]\n");
  writeFileSync(join(dir, "ci-steps.json"), "{}\n");
  writeFileSync(join(dir, "package.json"), MANIFEST);
  writeFileSync(join(dir, "ci.yml"), WORKFLOW);
  mkdirSync(join(dir, "cidir"));
  writeFileSync(join(dir, "cidir", "ci.yml"), WORKFLOW);
  writeFileSync(join(dir, "cidir", "other.yaml"), WORKFLOW);
  mkdirSync(join(dir, ".github", "workflows"), { recursive: true });
  writeFileSync(join(dir, ".github", "workflows", "ci.yml"), WORKFLOW);
}

function specControllerInTarget(world: SpecControllerWorld, args: readonly string[], stdout: "pipe" | number = "pipe"): CommandRun {
  const result = spawnSync(NODE, [...SPEC_CONTROLLER_ARGV, ...args], { cwd: world.destinationTargetDir, encoding: "utf8", stdio: ["ignore", stdout, "pipe"] });
  assert.equal(result.error, undefined, `the CLI failed to spawn: ${result.error?.message}`);
  return { status: result.status, stdout: result.stdout ?? "", stderr: result.stderr };
}

Given(/^a (balanced|out-of-balance) target the run reads (.+) from$/, function (this: SpecControllerWorld, verdict: string, input: string) {
  const inputRow = INPUT[input];
  assert.ok(inputRow, `no input is arranged for "${input}"`);
  this.inputRow = inputRow;
  this.destinationTargetDir = join(temporaryDirectory(this, "spec-controller-input-overwrite-"), "target");
  mkdirSync(this.destinationTargetDir);
  buildTarget(this.destinationTargetDir, verdict);
  this.inputRow.arrange?.(this.destinationTargetDir);
  const args = ["balance", ...pointedArgs(this.inputRow.pointedAt)];
  const key = `${verdict} ${args.join(" ")}`;
  if (!verdicts.has(key)) verdicts.set(key, specControllerInTarget(this, args).status);
  assert.equal(verdicts.get(key), verdict === "balanced" ? BALANCED : OUT_OF_BALANCE, `the target does not reconcile ${verdict} on its own`);
});

Given(/^a path to that input that is (.+)$/, function (this: SpecControllerWorld, alias: string) {
  const spell = ALIAS[alias];
  assert.ok(spell, `no path is arranged for "${alias}"`);
  this.aimedAt = spell(this.inputRow.file, this.destinationTargetDir);
  this.throughStdout = alias === APPENDED_STDOUT;
});

When(
  /^the operator (runs|stores a run of) it and asks for the (json|markdown) report at that path, and a second report at a file of its own$/,
  function (this: SpecControllerWorld, runs: string, format: string) {
    const flag = FORMAT_FLAG[format]!;
    const second = flag === "json" ? "md:second.md" : "json:second.json";
    const spec = this.throughStdout ? flag : `${flag}:${this.aimedAt}`;
    this.namedOutput = this.throughStdout ? entryText("format-on-standard-output", { fmt: flag }) : spec;
    const store = runs === "runs" ? [] : ["--store", join(this.destinationTargetDir, "store"), "--run-id", "r1"];
    const args = [...store, "balance", ...pointedArgs(this.inputRow.pointedAt), "--format", spec, "--format", second];
    this.destinationInputsBefore = entriesUnder(this.destinationTargetDir);
    if (!this.throughStdout) {
      this.run = specControllerInTarget(this, args);
      return;
    }
    const fd = openSync(join(this.destinationTargetDir, this.inputRow.file), "a");
    try {
      this.run = specControllerInTarget(this, args, fd);
    } finally {
      closeSync(fd);
    }
  },
);

Then("the run is refused as a usage error, not a verdict, naming the report and the input it would overwrite", function (this: SpecControllerWorld) {
  assert.equal(this.run.status, USAGE, `expected the usage code; got ${this.run.status}\n${this.run.stderr}`);
  assert.ok(
    showsEntry(this.run.stderr, "output-overwrites-input", { output: this.namedOutput, subject: this.inputRow.subject }),
    `the refusal does not name ${this.namedOutput} as overwriting ${this.inputRow.subject}:\n${this.run.stderr}`,
  );
});

Then("the refusal is a single line with no stack trace", function (this: SpecControllerWorld) {
  assert.equal(this.run.stderr.trimEnd().split("\n").length, 1, `the refusal is not one line:\n${this.run.stderr}`);
  assert.doesNotMatch(this.run.stderr, /^\s+at /m, "the refusal carries a stack trace");
});

Then("nothing is reported", function (this: SpecControllerWorld) {
  assert.equal(this.run.stdout, "", `something was printed:\n${this.run.stdout.slice(0, 400)}`);
});

Then("every file of the target is left exactly as it was", function (this: SpecControllerWorld) {
  assert.deepEqual(entriesUnder(this.destinationTargetDir), this.destinationInputsBefore, "the refused run added, changed or removed a file of the target");
});

const DESTINATION: Readonly<Record<string, (dir: string) => string>> = {
  "a read-only file": (dir) => {
    const path = join(dir, "read-only.json");
    writeFileSync(path, "earlier\n");
    chmodSync(path, 0o444);
    return path;
  },
  "a path under a regular file": (dir) => {
    writeFileSync(join(dir, "regular"), "");
    return join(dir, "regular", "report.json");
  },
  "a file in a directory it may not write": (dir) => {
    const readOnly = join(dir, "read-only");
    mkdirSync(readOnly);
    chmodSync(readOnly, 0o555);
    return join(readOnly, "report.json");
  },
  "an existing directory": (dir) => {
    const path = join(dir, "a-directory");
    mkdirSync(path);
    return path;
  },
  "a file whose parent directory does not exist": (dir) => join(dir, "missing", "report.json"),
};

Given(/^an out-of-balance target and a report destination that is (.+)$/, function (this: SpecControllerWorld, location: string) {
  assertTargetOutOfBalance();
  const arrange = DESTINATION[location];
  assert.ok(arrange, `no destination is arranged for "${location}"`);
  this.destinationScratch = temporaryDirectory(this, "spec-controller-unwritable-");
  this.destination = arrange(this.destinationScratch);
});

When(/^the operator asks for the (json|markdown) report to be written to that destination$/, function (this: SpecControllerWorld, format: string) {
  this.run = specController(["balance", ...TARGET_ARGS, "--format", `${FORMAT_FLAG[format]}:${this.destination}`]);
});

Then("the run is refused as a usage error, never reported as a verdict", function (this: SpecControllerWorld) {
  assert.equal(this.run.status, USAGE, `expected the usage code; got ${this.run.status}\n${this.run.stderr}`);
});

Then(/^the refusal names the destination and says (.+)$/, function (this: SpecControllerWorld, reason: string) {
  const code = REASON_CODE[reason];
  assert.ok(code, `no operating-system code is named for "${reason}"`);
  const refusal = shownEntry(this.run.stderr, "report-not-written", { path: this.destination });
  assert.ok(refusal, `the refusal does not name ${this.destination}:\n${this.run.stderr}`);
  assert.ok(refusal["reason"]?.includes(code), `the refusal does not give ${code}:\n${this.run.stderr}`);
});

Then("the refusal carries no stack trace", function (this: SpecControllerWorld) {
  assert.doesNotMatch(this.run.stderr, /^\s+at /m, `a stack trace reached stderr:\n${this.run.stderr}`);
  assert.equal(this.run.stderr.trimEnd().split("\n").length, 1, `the refusal is not one line:\n${this.run.stderr}`);
});

Then("no report is produced", function (this: SpecControllerWorld) {
  assert.equal(this.run.stdout, "", `a report reached stdout:\n${this.run.stdout.slice(0, 400)}`);
});

Given("an out-of-balance target and a json report destination under a regular file", function (this: SpecControllerWorld) {
  assertTargetOutOfBalance();
  this.destinationScratch = temporaryDirectory(this, "spec-controller-unwritable-");
  this.destination = DESTINATION["a path under a regular file"]!(this.destinationScratch);
});

Given(/^a markdown report destination that is (the terminal|a file that does not exist|a file holding an earlier run)$/, function (this: SpecControllerWorld, markdown: string) {
  const dir = this.destinationScratch;
  this.markdownPath = markdown === "the terminal" ? null : join(dir, "report.md");
  this.markdownSpec = this.markdownPath === null ? "md" : `md:${this.markdownPath}`;
  this.markdownBefore = null;
  if (markdown === "a file holding an earlier run" && this.markdownPath !== null) {
    this.markdownBefore = "an earlier run's report\n";
    writeFileSync(this.markdownPath, this.markdownBefore);
  }
});

When(/^the operator asks for both reports, the (markdown|json) one named first$/, function (this: SpecControllerWorld, first: string) {
  const json = `json:${this.destination}`;
  const formats = first === "markdown" ? [this.markdownSpec, json] : [json, this.markdownSpec];
  this.run = specController(["balance", ...TARGET_ARGS, ...formats.flatMap((spec) => ["--format", spec])]);
});

Then("the markdown report destination is left exactly as it was", function (this: SpecControllerWorld) {
  if (this.markdownPath === null) return;
  if (this.markdownBefore === null) {
    assert.equal(existsSync(this.markdownPath), false, `${this.markdownPath} was created by a refused run`);
  } else {
    assert.equal(readFileSync(this.markdownPath, "utf8"), this.markdownBefore, `${this.markdownPath} was overwritten by a refused run`);
  }
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

Given(/^an out-of-balance target whose default report destination is (a pipe|a file)$/, function (this: SpecControllerWorld, connectedTo: string) {
  assertTargetOutOfBalance();
  this.destinationScratch = temporaryDirectory(this, "spec-controller-stdout-path-");
  this.stdoutFile = connectedTo === "a file" ? join(this.destinationScratch, "stdout.txt") : null;
});

function specAt(world: SpecControllerWorld, fmt: string, destination: string): string {
  if (destination === "standard output") return fmt;
  if (destination === "a link to /dev/stdout") {
    const link = join(world.destinationScratch, "to-stdout");
    if (!existsSync(link)) symlinkSync("/dev/stdout", link);
    return `${fmt}:${link}`;
  }
  return `${fmt}:${destination}`;
}

const STDOUT_DESTINATION = "(standard output|/dev/stdout|/dev/fd/1|a link to /dev/stdout)";

When(new RegExp(`^the operator asks for the markdown report at ${STDOUT_DESTINATION} and the json report at ${STDOUT_DESTINATION}$`), function (this: SpecControllerWorld, first: string, second: string) {
  const args = ["balance", ...TARGET_ARGS, "--format", specAt(this, "md", first), "--format", specAt(this, "json", second)];
  if (this.stdoutFile === null) {
    this.run = specController(args);
    return;
  }
  writeFileSync(this.stdoutFile, "");
  this.run = specControllerInto(this.stdoutFile, args);
});

Then("the refusal says more than one output goes to the same place", function (this: SpecControllerWorld) {
  assert.ok(showsEntry(this.run.stderr, "more-than-one-to-stdout"), `the refusal does not say so:\n${this.run.stderr}`);
});

Then("nothing reaches the default report destination", function (this: SpecControllerWorld) {
  const printed = this.stdoutFile === null ? this.run.stdout : readFileSync(this.stdoutFile, "utf8");
  assert.equal(printed, "", `a report reached standard output:\n${printed.slice(0, 400)}`);
});

Given("a balanced target and a link to a report file that does not exist yet", function (this: SpecControllerWorld) {
  this.destinationScratch = temporaryDirectory(this, "spec-controller-link-");
  this.linkTargetPath = join(this.destinationScratch, "report.json");
  this.linkPath = join(this.destinationScratch, "link.json");
  symlinkSync(this.linkTargetPath, this.linkPath);
});

When("the operator asks for the json report to be written at the link", function (this: SpecControllerWorld) {
  this.run = specController(["balance", ...BALANCED_ARGS, "--format", `json:${this.linkPath}`]);
});

Then("the run succeeds and nothing is refused", function (this: SpecControllerWorld) {
  assert.equal(this.run.status, BALANCED, `expected the balanced code; got ${this.run.status}\n${this.run.stderr}`);
  assert.equal(this.run.stderr, "", `something reached stderr:\n${this.run.stderr}`);
});

Then("the json report is written into the file the link points to, and the link still points there", function (this: SpecControllerWorld) {
  assert.ok(existsSync(this.linkTargetPath), `${this.linkTargetPath} was not written`);
  assert.match(readFileSync(this.linkTargetPath, "utf8"), /^\{/, `${this.linkTargetPath} does not hold the json report`);
  assert.ok(lstatSync(this.linkPath).isSymbolicLink(), `${this.linkPath} is no longer a link`);
  assert.equal(readlinkSync(this.linkPath), this.linkTargetPath, `${this.linkPath} no longer points at ${this.linkTargetPath}`);
});

When(/^the operator makes (a bare run|a run stored under another run id) of it and also asks for the (markdown|json) report at that link$/, function (this: SpecControllerWorld, how: string, format: string) {
  const storeArgs = how === "a bare run" ? [] : ["--store", this.storeRoot, "--run-id", RUN_ID];
  this.run = specController([...storeArgs, "balance", ...TARGET_ARGS, "--format", `${FORMAT_FLAG[format]}:${this.earlierRunLink}`]);
});
