import { Given, Then, When } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { spawnSync, type SpawnSyncReturns } from "node:child_process";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { optionFlag } from "./support/balanceOption.js";
import { OUT_OF_BALANCE_INPUTS, spawnBalance } from "./support/balanceTarget.js";
import { NODE, SPEC_CONTROLLER_ARGV } from "./support/builtCli.js";
import { entryText, firstShown, showsEntry } from "./support/catalogue.js";
import { allocate } from "./support/codeAllocation.js";
import { exitOn } from "./support/runExit.js";
import { temporaryDirectory } from "./support/temporaryDirectory.js";
import type { SpecControllerWorld } from "./support/world.js";

Given("a target, and the {} pointing at a path that does not exist", function (this: SpecControllerWorld, option: string) {
  const flag = optionFlag(option);
  const root = process.cwd();
  this.missingPath = `tests/fixtures/does-not-exist/${flag.replace(/^--/, "")}.missing`;
  assert.ok(!existsSync(join(root, this.missingPath)), `fixture invariant: ${this.missingPath} must not exist`);
  const args: Record<string, string> = {
    "--features": OUT_OF_BALANCE_INPUTS.features,
    "--vitest": OUT_OF_BALANCE_INPUTS.vitest,
  };
  args[flag] = this.missingPath;
  this.invocationArgs = Object.entries(args).flatMap(([k, v]) => [k, v]);
});

Then("the run is rejected for the missing path", function (this: SpecControllerWorld) {
  assert.notEqual(this.balanceResult.status, 0, `expected a non-zero exit; got ${this.balanceResult.status}\n${this.balanceResult.stdout}`);
  assert.ok(
    showsEntry(this.balanceResult.stderr, "input-path-missing", { path: this.missingPath }),
    `expected the input-path-missing refusal of ${this.missingPath}; got:\n${this.balanceResult.stderr}`,
  );
});

Then("the rejection names the {} and the missing path", function (this: SpecControllerWorld, option: string) {
  const flag = optionFlag(option);
  assert.ok(
    this.balanceResult.stderr.includes(flag),
    `expected stderr to name the flag ${flag}; got:\n${this.balanceResult.stderr}`,
  );
  assert.ok(
    this.balanceResult.stderr.includes(this.missingPath),
    `expected stderr to name the missing path ${this.missingPath}; got:\n${this.balanceResult.stderr}`,
  );
});

const MISSING = ["input-path-missing", "feature-corpus-directory-missing"] as const;

const MISSING_OR_UNREADABLE = [...MISSING, "could-not-be-read", "working-directory-unreadable"] as const;

Then("nothing is reconciled", function (this: SpecControllerWorld) {
  assert.ok(!this.balanceResult.stdout.includes(entryText("report-title")), `expected no report; got:\n${this.balanceResult.stdout}`);
});

function spawnController(args: string[]): SpawnSyncReturns<string> {
  const root = process.cwd();
  const result = spawnSync(
    NODE,
    [...SPEC_CONTROLLER_ARGV, ...args],
    { cwd: root, encoding: "utf8" },
  );
  assert.equal(result.error, undefined, `CLI failed to spawn: ${result.error?.message}`);
  return result;
}

Given("the spec-controller host", function (this: SpecControllerWorld) {});

const PIN = ["pin-drifted"];

const PIN_OR_UNKNOWN = [...PIN, "unknown-flag", "unknown-command", "unknown-format", "unknown-part-refused"];

const BEFORE_THE_COMMAND = ["flag-before-command"];

const UNKNOWN_COMMAND_REQUESTS: Record<string, { argv: string[]; command: string }> = {
  "a typo of a command": { argv: ["blance"], command: "blance" },
  "a name that is no command": { argv: ["nosuchcommand"], command: "nosuchcommand" },
  "a name that is no command, with the report-only option after the command": {
    argv: ["nosuchcommand", "--exit-zero"],
    command: "nosuchcommand",
  },
};

When("it is asked for {}", function (this: SpecControllerWorld, request: string) {
  const known = UNKNOWN_COMMAND_REQUESTS[request];
  assert.ok(known !== undefined, `no request row named "${request}"`);
  this.unknownCommand = known.command;
  this.hostResult = spawnController(known.argv);
});

Then("the invocation is refused as a usage error", function (this: SpecControllerWorld) {
  assert.equal(
    this.hostResult.status,
    2,
    `expected the usage status 2; got ${this.hostResult.status}\n${this.hostResult.stderr}`,
  );
});

Then("it names the command it does not know", function (this: SpecControllerWorld) {
  assert.ok(
    showsEntry(this.hostResult.stderr, "unknown-command", { command: this.unknownCommand }),
    `expected stderr to name "${this.unknownCommand}" as an unknown command; got:\n${this.hostResult.stderr}`,
  );
});

Then("it produces nothing a pipeline could read as a report", function (this: SpecControllerWorld) {
  assert.equal(this.hostResult.stdout, "", `expected nothing on stdout; got:\n${this.hostResult.stdout}`);
});

Given("a flag balance has never registered", function (this: SpecControllerWorld) {
  this.invocationArgs = ["--bogus"];
});

When("balance is asked to run with that unregistered flag", function (this: SpecControllerWorld) {
  this.balanceResult = spawnBalance(this, this.invocationArgs);
});

Then("the run is refused as a usage error", function (this: SpecControllerWorld) {
  assert.equal(
    this.balanceResult.status,
    exitOn("a usage error"),
    `expected exit 2; got ${this.balanceResult.status}\nstdout:\n${this.balanceResult.stdout}\nstderr:\n${this.balanceResult.stderr}`,
  );
});

Then("the run is refused as a usage error, naming the unrecognised flag", function (this: SpecControllerWorld) {
  assert.equal(
    this.balanceResult.status,
    2,
    `expected exit 2; got ${this.balanceResult.status}\nstdout:\n${this.balanceResult.stdout}\nstderr:\n${this.balanceResult.stderr}`,
  );
  assert.ok(
    this.balanceResult.stderr.includes("--bogus"),
    `expected stderr to name the unknown flag --bogus; got:\n${this.balanceResult.stderr}`,
  );
});

Then(
  "the refusal names the version that refused it and the bump that cures a pinned skew",
  function (this: SpecControllerWorld) {
    const manifest = JSON.parse(
      readFileSync(join(process.cwd(), "packages", "spec-controller", "package.json"), "utf8"),
    ) as { version?: unknown };
    assert.equal(
      typeof manifest.version,
      "string",
      "the spec-controller package manifest must carry a version for the refusal to name",
    );
    const toolVersion = manifest.version as string;
    assert.notEqual(toolVersion, "", "an empty version would make the version claim vacuous");

    assert.ok(
      this.balanceResult.stderr.includes(toolVersion),
      `expected the refusal to name the version that refused (${toolVersion}); got:\n${this.balanceResult.stderr}`,
    );
    assert.ok(
      showsEntry(this.balanceResult.stderr, "pin-drifted"),
      `expected the refusal to name the bump as the cure; got:\n${this.balanceResult.stderr}`,
    );
  },
);

function withoutFlag(args: readonly string[], flag: string): string[] {
  const kept: string[] = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === flag) {
      i++;
      continue;
    }
    kept.push(args[i] ?? "");
  }
  return kept;
}

function standBesideAFileNamedTrue(world: SpecControllerWorld, args: readonly string[]): string[] {
  const root = process.cwd();
  const dir = temporaryDirectory(world, "clm-cli-058-");
  writeFileSync(join(dir, "true"), readFileSync(join(root, OUT_OF_BALANCE_INPUTS.vitest), "utf8"));
  world.invocationCwd = dir;
  return args.map((arg) => (arg.startsWith("--") ? arg : join(root, arg)));
}

const MISSING_VALUE_SHAPES: Record<string, (args: string[], flag: string, world: SpecControllerWorld) => string[]> = {
  "at the end of the arguments": (args, flag) => [...args, flag],
  "followed by the report-only option": (args, flag) => [...args, flag, "--exit-zero"],
  "with an empty value": (args, flag) => [...args, flag, ""],
  "at the end, with a file named true in the working directory": (args, flag, world) => [
    ...standBesideAFileNamedTrue(world, args),
    flag,
  ],
};

When(/^balance is asked to run with (.+) given no value, (.+)$/, function (this: SpecControllerWorld, option: string, shape: string) {
  const flag = optionFlag(option);
  const shapeOf = MISSING_VALUE_SHAPES[shape];
  assert.ok(shapeOf !== undefined, `no missing-value shape named "${shape}"`);
  const args = shapeOf(withoutFlag(this.invocationArgs, flag), flag, this);
  this.balanceResult = spawnBalance(this, args);
});

Then("balance refuses the run as a usage fault, with nothing reconciled", function (this: SpecControllerWorld) {
  assert.equal(this.balanceResult.status, 2, `expected the usage status 2; got ${this.balanceResult.status}\n${this.balanceResult.stderr}`);
  assert.equal(this.balanceResult.stdout, "", `expected nothing on stdout; got:\n${this.balanceResult.stdout}`);
});

Then(/^the refusal names (.+) as a flag missing its value$/, function (this: SpecControllerWorld, option: string) {
  const flag = optionFlag(option);
  const { stderr } = this.balanceResult;
  assert.ok(showsEntry(stderr, "missing-value", { flag }), `expected the missing-value refusal of ${flag}; got:\n${stderr}`);
  assert.doesNotMatch(stderr, /\btrue\b/, `stderr names the word a missing value used to become:\n${stderr}`);
  assert.equal(firstShown(stderr, MISSING_OR_UNREADABLE), undefined, `stderr names a fault other than the missing value:\n${stderr}`);
  assert.equal(firstShown(stderr, ["unknown-command", "pin-drifted"]), undefined, `stderr names a fault other than the missing value:\n${stderr}`);
});

const FLAG_BEFORE_COMMAND: Record<string, { before: string[]; command: string }> = {
  "the report-only option, before balance": { before: ["--exit-zero"], command: "balance" },
  "the format option given md, before balance": { before: ["--format", "md"], command: "balance" },
  "an unknown flag, before balance": { before: ["--bogus"], command: "balance" },
  "the report-only option, before no known command": { before: ["--exit-zero"], command: "nosuchcommand" },
};

When(/^a run is asked for with (.+, before (?:balance|no known command))$/, function (this: SpecControllerWorld, row: string) {
  const known = FLAG_BEFORE_COMMAND[row];
  assert.ok(known !== undefined, `no row named "${row}"`);
  this.flagOutOfPlace = known.before[0] ?? "";
  const root = process.cwd();
  const target = this.invocationArgs.map((arg) => (arg.startsWith("--") ? arg : join(root, arg)));
  this.workingDirectory = temporaryDirectory(this, "clm-cli-060-");
  const result = spawnSync(NODE, [...SPEC_CONTROLLER_ARGV, ...known.before, known.command, ...target], {
    cwd: this.workingDirectory,
    encoding: "utf8",
  });
  assert.equal(result.error, undefined, `CLI failed to spawn: ${result.error?.message}`);
  this.hostResult = result;
  this.balanceResult = result;
});

Then("nothing is written to the working directory", function (this: SpecControllerWorld) {
  assert.deepEqual(readdirSync(this.workingDirectory), [], "expected the working directory to stay empty");
});

Then("the refusal names the flag as given before the command, never as an unknown command", function (this: SpecControllerWorld) {
  const { stderr } = this.balanceResult;
  assert.ok(
    showsEntry(stderr, "flag-before-command", { flag: this.flagOutOfPlace }),
    `expected the flag-before-command refusal of ${this.flagOutOfPlace}; got:\n${stderr}`,
  );
  assert.equal(firstShown(stderr, ["unknown-command"]), undefined, `stderr calls the flag a command:\n${stderr}`);
});

const NOT_A_FLAG: Record<string, (target: string[]) => { args: string[]; token: string }> = {
  "the target's features directory alone, with no flag before it": (target) => {
    const dir = target[target.indexOf("--features") + 1] ?? "";
    return { args: [dir], token: dir };
  },
  "a stray word after the target's flags, under the report-only option": (target) => ({
    args: [...target, "extra", "--exit-zero"],
    token: "extra",
  }),
  "a single-dash token after the target's flags, under the report-only option": (target) => ({
    args: [...target, "-x", "--exit-zero"],
    token: "-x",
  }),
  "the command given twice": (target) => ({
    args: ["balance", ...target],
    token: "balance",
  }),
};

When("balance is asked to run with an argument that is no flag, {}", function (this: SpecControllerWorld, shape: string) {
  const rowOf = NOT_A_FLAG[shape];
  assert.ok(rowOf !== undefined, `no row named "${shape}"`);
  const { args, token } = rowOf(this.invocationArgs);
  this.argumentNamed = token;
  this.balanceResult = spawnBalance(this, args);
});

Then("the refusal names that argument as one balance does not take", function (this: SpecControllerWorld) {
  const { stderr } = this.balanceResult;
  assert.ok(
    showsEntry(stderr, "not-a-flag", { token: this.argumentNamed }),
    `expected the not-a-flag refusal of ${this.argumentNamed}; got:\n${stderr}`,
  );
  assert.equal(firstShown(stderr, PIN_OR_UNKNOWN), undefined, `stderr names another fault:\n${stderr}`);
});

const VALUE_TO_A_FLAG_THAT_TAKES_NONE: Record<string, (target: string[], given: string[]) => string[]> = {
  "after the target's flags": (target, given) => [...target, ...given],
};

When(/^balance is asked to run with (.+) given the value (\S+), (.+)$/, function (this: SpecControllerWorld, option: string, value: string, shape: string) {
  const flag = optionFlag(option);
  const argsOf = VALUE_TO_A_FLAG_THAT_TAKES_NONE[shape];
  assert.ok(argsOf !== undefined, `no shape named "${shape}"`);
  this.balanceResult = spawnBalance(this, argsOf(this.invocationArgs, [flag, value]));
});

Then(
  /^the refusal names (.+) as a flag that takes no value, and (\S+) as the value it was given$/,
  function (this: SpecControllerWorld, option: string, value: string) {
    const flag = optionFlag(option);
    const { stderr } = this.balanceResult;
    assert.ok(
      showsEntry(stderr, "takes-no-value", { flag, value }),
      `expected the takes-no-value refusal of ${flag} given ${value}; got:\n${stderr}`,
    );
  },
);

const GIVEN_TWICE: Record<string, (target: string[], world: SpecControllerWorld) => string[]> = {
  "the feature corpus option at a path that does not exist, then at the target, under the report-only option": (target, world) => [
    ...withoutFlag(target, "--features"),
    "--features",
    join(temporaryDirectory(world, "clm-cli-064-"), "no-such-dir"),
    "--features",
    target[target.indexOf("--features") + 1] ?? "",
    "--exit-zero",
  ],
  "the target-name option as two different names": (target) => [...target, "--target", "a", "--target", "b"],
  "the strict option with no value either time": (target) => [...target, "--strict", "--strict"],
};

When(/^a run is asked for with (.+?) given twice, (.+)$/, function (this: SpecControllerWorld, option: string, shape: string) {
  const argsOf = GIVEN_TWICE[`${option} ${shape}`];
  assert.ok(argsOf !== undefined, `no row for ${option} ${shape}`);
  const result = spawnBalance(this, argsOf(this.invocationArgs, this));
  this.hostResult = result;
  this.balanceResult = result;
});

Then(/^the refusal names (.+) as given more than once$/, function (this: SpecControllerWorld, option: string) {
  const flag = optionFlag(option);
  const { stderr } = this.balanceResult;
  assert.ok(showsEntry(stderr, "given-twice", { flag }), `expected the given-twice refusal of ${flag}; got:\n${stderr}`);
});

const EQUALS_FORM: Record<string, (target: string[], written: string) => string[]> = {
  "after the target's flags": (target, written) => ["balance", ...target, written],
  "after the target's flags, under the report-only option": (target, written) => ["balance", ...target, written, "--exit-zero"],
  "before the command": (target, written) => [written, "balance", ...target],
};

const WRITTEN_FORM: Record<string, string> = {
  "the format option and json joined by an equals sign": "--format=json",
  "the feature corpus option and nothing joined by an equals sign": "--features=",
};

const SPELLING_READ: Record<string, string> = {
  "the format option and json as two arguments": "--format json",
  "the feature corpus option and a directory as two arguments": "--features <dir>",
};

function argumentsFor(table: Record<string, string>, intent: string): string {
  const literal = table[intent];
  assert.ok(literal !== undefined, `no arguments are named "${intent}"`);
  return literal;
}

When(/^a run is asked for with (.+? joined by an equals sign), (.+)$/, function (this: SpecControllerWorld, intent: string, shape: string) {
  const written = argumentsFor(WRITTEN_FORM, intent);
  const argvOf = EQUALS_FORM[shape];
  assert.ok(argvOf !== undefined, `no shape named "${shape}"`);
  const result = spawnController(argvOf(this.invocationArgs, written));
  this.hostResult = result;
  this.balanceResult = result;
});

Then(/^the refusal names (.+? joined by an equals sign) as a form that is not read, and (.+) as the spelling that is$/, function (this: SpecControllerWorld, writtenIntent: string, spellingIntent: string) {
  const written = argumentsFor(WRITTEN_FORM, writtenIntent);
  const spelling = argumentsFor(SPELLING_READ, spellingIntent);
  const { stderr } = this.balanceResult;
  assert.ok(
    showsEntry(stderr, "equals-form", { token: written, spelling }),
    `expected the equals-form refusal of ${written}, spelt '${spelling}'; got:\n${stderr}`,
  );
});

Then("the refusal advises no pin, and calls the flag neither unknown nor out of place", function (this: SpecControllerWorld) {
  const { stderr } = this.balanceResult;
  assert.equal(firstShown(stderr, [...PIN_OR_UNKNOWN, ...BEFORE_THE_COMMAND]), undefined, `stderr gives other advice:\n${stderr}`);
});

When("spec-controller is asked for nothing at all", function (this: SpecControllerWorld) {
  this.workingDirectory = temporaryDirectory(this, "clm-cli-068-");
  const result = spawnSync(NODE, [...SPEC_CONTROLLER_ARGV], { cwd: this.workingDirectory, encoding: "utf8" });
  assert.equal(result.error, undefined, `CLI failed to spawn: ${result.error?.message}`);
  this.hostResult = result;
});

const COMMAND_SUMMARIES: Record<string, string> = {
  balance: "balance-summary",
  allocate: "allocate-summary",
};

Then("it answers with the top-level help, listing the commands, and succeeds", function (this: SpecControllerWorld) {
  const { status, stdout, stderr } = this.hostResult;
  assert.equal(status, 0, `expected exit 0; got ${status}\n${stderr}`);
  assert.equal(stderr, "", `expected nothing on stderr; got:\n${stderr}`);
  const lines = stdout.split("\n");
  assert.equal(lines[0], entryText("help-title"), `expected the top-level help's title; got:\n${stdout}`);
  const commandsAt = lines.indexOf(entryText("help-commands"));
  assert.ok(commandsAt > 0, `expected the commands heading; got:\n${stdout}`);
  const listed = lines.slice(commandsAt + 1);
  for (const [command, summary] of Object.entries(COMMAND_SUMMARIES)) {
    assert.ok(
      listed.some((line) => line.trim().startsWith(`${command} `) && line.endsWith(entryText(summary))),
      `expected ${command} listed under the commands with its summary; got:\n${stdout}`,
    );
  }
});

const HELP_BEFORE_THE_COMMAND: Record<string, string[]> = {
  "help by its long name after a flag out of place": ["--exit-zero", "--help"],
  "help by its long name after a flag out of place, before a command": ["--exit-zero", "balance", "--help"],
};

function spawnInWorkingDirectory(world: SpecControllerWorld, argv: string[]): SpawnSyncReturns<string> {
  const result = spawnSync(NODE, [...SPEC_CONTROLLER_ARGV, ...argv], { cwd: world.workingDirectory, encoding: "utf8" });
  assert.equal(result.error, undefined, `CLI failed to spawn: ${result.error?.message}`);
  return result;
}

When("spec-controller is given {}", function (this: SpecControllerWorld, request: string) {
  const argv = HELP_BEFORE_THE_COMMAND[request];
  assert.ok(argv !== undefined, `no request row named "${request}"`);
  this.workingDirectory = temporaryDirectory(this, "clm-cli-073-");
  this.hostResult = spawnInWorkingDirectory(this, argv);
});

Then("it answers with the same top-level help as a bare invocation, and succeeds", function (this: SpecControllerWorld) {
  const bare = spawnInWorkingDirectory(this, []);
  const help = spawnInWorkingDirectory(this, ["--help"]);
  assert.equal(this.hostResult.status, 0, `expected exit 0; got ${this.hostResult.status}\n${this.hostResult.stderr}`);
  assert.equal(this.hostResult.stderr, "", `expected nothing on stderr; got:\n${this.hostResult.stderr}`);
  assert.equal(bare.status, 0, `expected the bare run to exit 0; got ${bare.status}`);
  assert.equal(bare.stdout, help.stdout, "expected the bare run's stdout to be --help's");
  assert.ok(help.stdout.length > 0, "expected --help to print the top-level help");
  assert.equal(this.hostResult.stdout, bare.stdout, `expected the top-level help; got:\n${this.hostResult.stdout}`);
});

const MALFORMED_REQUEST: Record<string, readonly string[]> = {
  "no part": [],
  "the part fit, in lower case": ["fit"],
  "the part F, one character long": ["F"],
  "the part TOOLONG, seven characters long": ["TOOLONG"],
  "two parts, ONE and TWO": ["ONE", "TWO"],
  "the part ONE and a flag it does not take": ["ONE", "--bogus"],
};

When("the author asks for the next code giving {}", function (this: SpecControllerWorld, request: string) {
  const args = MALFORMED_REQUEST[request];
  assert.ok(args !== undefined, `no arguments for: ${request}`);
  this.answer = allocate(this.repository, args);
});

Then("it is refused as a usage error, never as an unknown part, and no code is given", function (this: SpecControllerWorld) {
  assert.equal(this.answer.status, 2, `expected the usage status, got ${this.answer.status}\n${this.answer.stderr}`);
  assert.equal(this.answer.stdout, "");
  assert.ok(showsEntry(this.answer.stderr, "coded-usage-error"), this.answer.stderr);
  assert.equal(firstShown(this.answer.stderr, ["unknown-part-refused"]), undefined, this.answer.stderr);
});

const HELP_REQUEST: Record<string, readonly string[]> = {
  alone: ["--help"],
  "by its short name, alone": ["-h"],
  "after a part": ["ONE", "--help"],
  "after a part not in the claim-code form": ["fit", "--help"],
  "beside a flag the command does not take": ["--bogus", "--help"],
};

function opensWithAllocateHelpTitle(stdout: string): boolean {
  return stdout.startsWith(`${entryText("help-command-title", { command: "allocate", summary: entryText("allocate-summary") })}\n`);
}

When("the author asks allocate for its help {}", function (this: SpecControllerWorld, request: string) {
  const args = HELP_REQUEST[request];
  assert.ok(args !== undefined, `no arguments for: ${request}`);
  this.answer = allocate(this.repository, args);
});

Then("it answers with allocate's help, naming the feature part it takes and the new-part option, and gives no code", function (this: SpecControllerWorld) {
  assert.equal(this.answer.status, 0, `expected success, got ${this.answer.status}\n${this.answer.stderr}`);
  assert.ok(opensWithAllocateHelpTitle(this.answer.stdout), this.answer.stdout);
  assert.match(this.answer.stdout, /<FFF>/);
  assert.match(this.answer.stdout, /--new/);
  assert.doesNotMatch(this.answer.stdout, /^CLM-/m);
});
