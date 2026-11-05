import { Given, Then, When } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { spawnSync, type SpawnSyncReturns } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { optionFlag } from "./support/balanceOption.js";
import { NO_WORKFLOWS, OUT_OF_BALANCE_INPUTS, spawnBalance } from "./support/balanceTarget.js";
import { NODE, SPEC_CONTROLLER_ARGV } from "./support/builtCli.js";
import { entryText, firstShown, shownEntry, showsEntry } from "./support/catalogue.js";
import { allocate, git } from "./support/codeAllocation.js";
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

const PIN = ["pin-drifted", "do-not-pin-retired"];

const PIN_OR_UNKNOWN = [...PIN, "unknown-flag", "unknown-command", "unknown-format", "unknown-part-refused"];

const BEFORE_THE_COMMAND = ["flag-before-command", "misplaced-modifier"];

const OTHER_HOST_FAULTS = ["unknown-command", ...BEFORE_THE_COMMAND, "modifier-took-command", "missing-value"];

const UNKNOWN_COMMAND_REQUESTS: Record<string, { argv: string[]; command: string; stored: boolean }> = {
  "a typo of a command": { argv: ["blance"], command: "blance", stored: false },
  "a name that is no command": { argv: ["nosuchcommand"], command: "nosuchcommand", stored: false },
  "a name that is no command, as a stored run": { argv: ["nosuchcommand"], command: "nosuchcommand", stored: true },
  "a name that is no command, with the report-only option after the command": {
    argv: ["nosuchcommand", "--exit-zero"],
    command: "nosuchcommand",
    stored: false,
  },
};

When("it is asked for {}", function (this: SpecControllerWorld, request: string) {
  const known = UNKNOWN_COMMAND_REQUESTS[request];
  assert.ok(known !== undefined, `no request row named "${request}"`);
  this.unknownCommand = known.command;
  if (!known.stored) {
    this.hostResult = spawnController(known.argv);
    return;
  }
  const storeRoot = temporaryDirectory(this, "scn-cli-056-");
  this.hostResult = spawnController(["--store", storeRoot, ...known.argv]);
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

Given("a flag balance has retired", function (this: SpecControllerWorld) {
  this.invocationArgs = ["--measurements", "x.json"];
});

When("balance is asked to run with that flag", function (this: SpecControllerWorld) {
  this.retiredFlagResult = spawnBalance(this, this.invocationArgs);
});

Then("balance refuses the run as a usage fault and reconciles nothing", function (this: SpecControllerWorld) {
  assert.equal(
    this.retiredFlagResult.status,
    2,
    `expected exit 2; got ${this.retiredFlagResult.status}\nstderr:\n${this.retiredFlagResult.stderr}`,
  );
  assert.ok(!this.retiredFlagResult.stdout.includes(entryText("report-title")), `expected no report; got:\n${this.retiredFlagResult.stdout}`);
});

Then("the refusal names the flag as retired, with the version that retired it", function (this: SpecControllerWorld) {
  assert.ok(
    showsEntry(this.retiredFlagResult.stderr, "retired-flag", { flag: "--measurements", retiredIn: "0.1.0-alpha.5" }),
    `expected stderr to name --measurements as retired in 0.1.0-alpha.5; got:\n${this.retiredFlagResult.stderr}`,
  );
});

Then("the refusal names what replaced it", function (this: SpecControllerWorld) {
  assert.ok(
    showsEntry(this.retiredFlagResult.stderr, "measurements-replacement"),
    `expected stderr to name the step-outcome route through --ci-steps; got:\n${this.retiredFlagResult.stderr}`,
  );
});

Then("the refusal advises no pin toward a version that still accepts the flag", function (this: SpecControllerWorld) {
  assert.equal(firstShown(this.retiredFlagResult.stderr, ["pin-drifted"]), undefined, this.retiredFlagResult.stderr);
});

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
  const dir = temporaryDirectory(world, "scn-cli-058-");
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

Given("a target that reconciles out-of-balance, and an empty run store", function (this: SpecControllerWorld) {
  this.storeParent = temporaryDirectory(this, "scn-cli-059-");
  this.storeRoot = join(this.storeParent, "store");
  mkdirSync(this.storeRoot);
  const root = process.cwd();
  this.invocationArgs = [
    "--features",
    join(root, OUT_OF_BALANCE_INPUTS.features),
    "--vitest",
    join(root, OUT_OF_BALANCE_INPUTS.vitest),
    ...NO_WORKFLOWS(join(root, "tests/fixtures/evidence-observation")),
  ];
});

function spawnBesideStore(world: SpecControllerWorld, argv: string[]): SpawnSyncReturns<string> {
  const result = spawnSync(NODE, [...SPEC_CONTROLLER_ARGV, ...argv], { cwd: world.storeParent, encoding: "utf8" });
  assert.equal(result.error, undefined, `CLI failed to spawn: ${result.error?.message}`);
  return result;
}

function runBesideStore(world: SpecControllerWorld, argv: string[]): void {
  const result = spawnBesideStore(world, argv);
  world.hostResult = result;
  world.balanceResult = result;
}

const MISSING_MODIFIER_VALUE: Record<string, (store: string, target: string[]) => string[]> = {
  "the store modifier alone": () => ["--store"],
  "the store modifier followed by the run-name modifier": (_store, target) => ["--store", "--run-id", "r1", "balance", ...target],
  "the run-name modifier at the end, after the store modifier": (store) => ["--store", store, "--run-id"],
  "the run-name modifier with an empty value": (store, target) => ["--store", store, "--run-id", "", "balance", ...target],
  "the store modifier with an empty value": (_store, target) => ["--store", "", "balance", ...target],
};

When(/^a stored balance run is asked for with (.+) given no value, (.+)$/, function (this: SpecControllerWorld, modifier: string, shape: string) {
  const argvOf = MISSING_MODIFIER_VALUE[`${modifier} ${shape}`];
  assert.ok(argvOf !== undefined, `no row for ${modifier} ${shape}`);
  runBesideStore(this, argvOf(this.storeRoot, this.invocationArgs));
});

Then("nothing is written to the run store or the working directory", function (this: SpecControllerWorld) {
  assert.deepEqual(readdirSync(this.storeRoot), [], "expected the store root to stay empty");
  assert.deepEqual(readdirSync(this.storeParent), ["store"], "expected nothing beside the store root");
});

const FLAG_BEFORE_COMMAND: Record<string, { before: string[]; command: string }> = {
  "the report-only option, before balance": { before: ["--exit-zero"], command: "balance" },
  "the format option given md, before balance": { before: ["--format", "md"], command: "balance" },
  "an unknown flag, before balance": { before: ["--bogus"], command: "balance" },
  "the report-only option, before no known command": { before: ["--exit-zero"], command: "nosuchcommand" },
};

When("a stored run is asked for with {}", function (this: SpecControllerWorld, row: string) {
  const known = FLAG_BEFORE_COMMAND[row];
  assert.ok(known !== undefined, `no row named "${row}"`);
  this.flagOutOfPlace = known.before[0] ?? "";
  const argv = ["--store", this.storeRoot, ...known.before, known.command, ...this.invocationArgs];
  runBesideStore(this, argv);
});

Then("the refusal names the flag as given before the command, never as an unknown command", function (this: SpecControllerWorld) {
  const { stderr } = this.balanceResult;
  assert.ok(
    showsEntry(stderr, "flag-before-command", { flag: this.flagOutOfPlace }),
    `expected the flag-before-command refusal of ${this.flagOutOfPlace}; got:\n${stderr}`,
  );
  assert.equal(firstShown(stderr, ["unknown-command"]), undefined, `stderr calls the flag a command:\n${stderr}`);
});

When("balance is asked to run with the store modifier given after the command", function (this: SpecControllerWorld) {
  const argv = ["balance", ...this.invocationArgs, "--store", this.storeRoot];
  runBesideStore(this, argv);
});

Then("the refusal names the store modifier as one that goes before the command", function (this: SpecControllerWorld) {
  const { stderr } = this.balanceResult;
  assert.ok(
    showsEntry(stderr, "misplaced-modifier", { modifier: "--store" }),
    `expected the misplaced-modifier refusal of --store; got:\n${stderr}`,
  );
});

Then("the refusal advises no pin", function (this: SpecControllerWorld) {
  assert.equal(firstShown(this.balanceResult.stderr, PIN), undefined, `stderr advises a pin:\n${this.balanceResult.stderr}`);
});

const NOT_A_FLAG: Record<string, (store: string, target: string[]) => { argv: string[]; token: string }> = {
  "the target's features directory alone, with no flag before it": (_store, target) => {
    const dir = target[target.indexOf("--features") + 1] ?? "";
    return { argv: ["balance", dir], token: dir };
  },
  "a stray word after the target's flags, under the report-only option": (_store, target) => ({
    argv: ["balance", ...target, "extra", "--exit-zero"],
    token: "extra",
  }),
  "a single-dash token after the target's flags, under the report-only option": (_store, target) => ({
    argv: ["balance", ...target, "-x", "--exit-zero"],
    token: "-x",
  }),
  "the command given twice, in a stored run": (store, target) => ({
    argv: ["--store", store, "--run-id", "r1", "balance", "balance", ...target],
    token: "balance",
  }),
};

When("balance is asked to run with an argument that is no flag, {}", function (this: SpecControllerWorld, shape: string) {
  const rowOf = NOT_A_FLAG[shape];
  assert.ok(rowOf !== undefined, `no row named "${shape}"`);
  const { argv, token } = rowOf(this.storeRoot, this.invocationArgs);
  this.argumentNamed = token;
  runBesideStore(this, argv);
});

Then("the refusal names that argument as one balance does not take", function (this: SpecControllerWorld) {
  const { stderr } = this.balanceResult;
  assert.ok(
    showsEntry(stderr, "not-a-flag", { token: this.argumentNamed }),
    `expected the not-a-flag refusal of ${this.argumentNamed}; got:\n${stderr}`,
  );
  assert.equal(firstShown(stderr, PIN_OR_UNKNOWN), undefined, `stderr names another fault:\n${stderr}`);
});

Then("the run store holds no record of a run", function (this: SpecControllerWorld) {
  const manifests = readdirSync(this.storeRoot, { recursive: true }).filter((entry) =>
    String(entry).endsWith("run.yaml"),
  );
  assert.deepEqual(manifests, [], `expected no run.yaml under the store root; found ${manifests.join(", ")}`);
});

const VALUE_TO_A_FLAG_THAT_TAKES_NONE: Record<string, (store: string, target: string[], given: string[]) => string[]> = {
  "after the target's flags": (_store, target, given) => ["balance", ...target, ...given],
  "after the target's flags, in a stored run": (store, target, given) => [
    "--store",
    store,
    "--run-id",
    "r1",
    "balance",
    ...target,
    ...given,
  ],
};

When(/^balance is asked to run with (.+) given the value (\S+), (.+)$/, function (this: SpecControllerWorld, option: string, value: string, shape: string) {
  const flag = optionFlag(option);
  const argvOf = VALUE_TO_A_FLAG_THAT_TAKES_NONE[shape];
  assert.ok(argvOf !== undefined, `no shape named "${shape}"`);
  const argv = argvOf(this.storeRoot, this.invocationArgs, [flag, value]);
  runBesideStore(this, argv);
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

const GIVEN_TWICE: Record<string, (store: string, target: string[], world: SpecControllerWorld) => string[]> = {
  "the feature corpus option at a path that does not exist, then at the target, under the report-only option": (_store, target, world) => [
    "balance",
    ...withoutFlag(target, "--features"),
    "--features",
    join(temporaryDirectory(world, "scn-cli-064-"), "no-such-dir"),
    "--features",
    target[target.indexOf("--features") + 1] ?? "",
    "--exit-zero",
  ],
  "the target-name option as two different names": (_store, target) => ["balance", ...target, "--target", "a", "--target", "b"],
  "the strict option with no value either time": (_store, target) => ["balance", ...target, "--strict", "--strict"],
  "the target-name option as two different names, in a stored run": (store, target) => [
    "--store",
    store,
    "--run-id",
    "r1",
    "balance",
    ...target,
    "--target",
    "a",
    "--target",
    "b",
  ],
  "the store modifier before the command, the second time at the run store": (store, target, world) => [
    "--store",
    join(temporaryDirectory(world, "scn-cli-064-"), "other-store"),
    "--store",
    store,
    "balance",
    ...target,
  ],
  "the run-name modifier before the command, as two ids, in a stored run": (store, target) => [
    "--store",
    store,
    "--run-id",
    "r0",
    "--run-id",
    "r1",
    "balance",
    ...target,
  ],
};

When(/^a run is asked for with (.+?) given twice, (.+)$/, function (this: SpecControllerWorld, option: string, shape: string) {
  const argvOf = GIVEN_TWICE[`${option} ${shape}`];
  assert.ok(argvOf !== undefined, `no row for ${option} ${shape}`);
  runBesideStore(this, argvOf(this.storeRoot, this.invocationArgs, this));
});

Then(/^the refusal names (.+) as given more than once$/, function (this: SpecControllerWorld, option: string) {
  const flag = optionFlag(option);
  const { stderr } = this.balanceResult;
  assert.ok(showsEntry(stderr, "given-twice", { flag }), `expected the given-twice refusal of ${flag}; got:\n${stderr}`);
});

const EQUALS_FORM: Record<string, (store: string, target: string[], written: string) => string[]> = {
  "after the target's flags": (_store, target, written) => ["balance", ...target, written],
  "after the target's flags, under the report-only option": (_store, target, written) => ["balance", ...target, written, "--exit-zero"],
  "before the command": (_store, target, written) => [written, "balance", ...target],
  "after the command": (_store, target, written) => ["balance", ...target, written],
  "after the target's flags, in a stored run": (store, target, written) => [
    "--store",
    store,
    "--run-id",
    "r1",
    "balance",
    ...target,
    written,
  ],
};

const WRITTEN_FORM: Record<string, string> = {
  "the format option and json joined by an equals sign": "--format=json",
  "the feature corpus option and nothing joined by an equals sign": "--features=",
  "the store modifier and the run store joined by an equals sign": "--store=<root>",
};

const SPELLING_READ: Record<string, string> = {
  "the format option and json as two arguments": "--format json",
  "the feature corpus option and a directory as two arguments": "--features <dir>",
  "the store modifier and the run store as two arguments": "--store <root>",
};

function argumentsFor(table: Record<string, string>, intent: string): string {
  const literal = table[intent];
  assert.ok(literal !== undefined, `no arguments are named "${intent}"`);
  return literal;
}

function withStoreRoot(world: SpecControllerWorld, cell: string): string {
  return cell.replace("<root>", world.storeRoot);
}

When(/^a run is asked for with (.+? joined by an equals sign), (.+)$/, function (this: SpecControllerWorld, intent: string, shape: string) {
  const written = argumentsFor(WRITTEN_FORM, intent);
  const argvOf = EQUALS_FORM[shape];
  assert.ok(argvOf !== undefined, `no shape named "${shape}"`);
  const argv = argvOf(this.storeRoot, this.invocationArgs, withStoreRoot(this, written));
  runBesideStore(this, argv);
});

Then(/^the refusal names (.+? joined by an equals sign) as a form that is not read, and (.+) as the spelling that is$/, function (this: SpecControllerWorld, writtenIntent: string, spellingIntent: string) {
  const written = argumentsFor(WRITTEN_FORM, writtenIntent);
  const spelling = argumentsFor(SPELLING_READ, spellingIntent);
  const { stderr } = this.balanceResult;
  const given = withStoreRoot(this, written);
  assert.ok(
    showsEntry(stderr, "equals-form", { token: given, spelling: withStoreRoot(this, spelling) }),
    `expected the equals-form refusal of ${given}, spelt '${spelling}'; got:\n${stderr}`,
  );
});

Then("the refusal advises no pin, and calls the flag neither unknown nor out of place", function (this: SpecControllerWorld) {
  const { stderr } = this.balanceResult;
  assert.equal(firstShown(stderr, [...PIN_OR_UNKNOWN, ...BEFORE_THE_COMMAND]), undefined, `stderr gives other advice:\n${stderr}`);
});

const COMMAND_AS_VALUE: Record<string, (store: string, target: string[]) => string[]> = {
  "the store modifier with the target's flags after it": (_store, target) => ["--store", "balance", ...target],
  "the store modifier with nothing after it": () => ["--store", "balance"],
  "the run-name modifier after the store modifier, with the target's flags after it": (store, target) => [
    "--store",
    store,
    "--run-id",
    "balance",
    ...target,
  ],
};

When(/^a stored run is asked for, with the command given as the value of (.+? modifier), (.+)$/, function (this: SpecControllerWorld, modifier: string, shape: string) {
  const argvOf = COMMAND_AS_VALUE[`${modifier} ${shape}`];
  assert.ok(argvOf !== undefined, `no row for ${modifier} ${shape}`);
  runBesideStore(this, argvOf(this.storeRoot, this.invocationArgs));
});

Then(/^the refusal names (.+) as having taken the command as its value$/, function (this: SpecControllerWorld, intent: string) {
  const modifier = optionFlag(intent);
  const { stderr } = this.balanceResult;
  assert.ok(
    showsEntry(stderr, "modifier-took-command", { modifier, command: "balance" }),
    `expected the modifier-took-command refusal of ${modifier} and balance; got:\n${stderr}`,
  );
  assert.equal(firstShown(stderr, BEFORE_THE_COMMAND), undefined, `stderr blames another token:\n${stderr}`);
});

const MODIFIERS_WITH_NO_COMMAND: Record<string, (store: string) => string[]> = {
  "the store modifier at a run store that is not there": (store) => ["--store", join(store, "absent")],
  "the store modifier at the empty run store": (store) => ["--store", store],
  "the run-name modifier alone": () => ["--run-id", "r1"],
  "the store modifier and the run-name modifier in that order": (store) => ["--store", store, "--run-id", "r1"],
  "the run-name modifier and the store modifier in that order": (store) => ["--run-id", "r1", "--store", store],
};

When(/^the host is asked for nothing but (.+?), (.+)$/, function (this: SpecControllerWorld, modifiers: string, shape: string) {
  const argvOf = MODIFIERS_WITH_NO_COMMAND[`${modifiers} ${shape}`];
  assert.ok(argvOf !== undefined, `no row for ${modifiers} ${shape}`);
  this.modifiersGiven = modifiers.split(" and ").map(optionFlag);
  runBesideStore(this, argvOf(this.storeRoot));
});

Then("the refusal names every modifier given, and says no command followed them", function (this: SpecControllerWorld) {
  const { stderr } = this.balanceResult;
  const named = shownEntry(stderr, "no-command-after-modifiers")?.["modifiers"] ?? "";
  assert.ok(
    named !== "" && this.modifiersGiven.every((m) => named.includes(m)),
    `expected the no-command-after-modifiers refusal of ${this.modifiersGiven.join(" and ")}; got:\n${stderr}`,
  );
  assert.equal(firstShown(stderr, OTHER_HOST_FAULTS), undefined, `stderr names another fault:\n${stderr}`);
});

const HELP_REQUESTS: Record<string, (store: string) => string[]> = {
  "help by its long name after the store modifier": (store) => ["--store", store, "--help"],
  "the help command after the store modifier": (store) => ["--store", store, "help"],
  "help by its short name after the store modifier": (store) => ["--store", store, "-h"],
  "help by its long name after the run-name modifier": () => ["--run-id", "r1", "--help"],
  "help by its long name after the store modifier and the run-name modifier": (store) => ["--store", store, "--run-id", "r1", "--help"],
  "nothing at all": () => [],
  "help by its long name after the store modifier, given a command as its value": () => ["--store", "balance", "--help"],
  "help by its short name after the store modifier, given a command as its value": () => ["--store", "balance", "-h"],
  "help by its long name after the run-name modifier, given a command as its value": () => ["--run-id", "balance", "--help"],
  "help by its short name after the run-name modifier, given a command as its value": () => ["--run-id", "balance", "-h"],
};


When("spec-controller is asked for {}", function (this: SpecControllerWorld, request: string) {
  const argvOf = HELP_REQUESTS[request];
  assert.ok(argvOf !== undefined, `no request row named "${request}"`);
  this.hostResult = spawnBesideStore(this, argvOf(this.storeRoot));
});

const HELP_AT_HOST_SCOPE: Record<string, (store: string, target: string[]) => string[]> = {
  "help by its long name after a flag out of place": (store) => ["--store", store, "--exit-zero", "--help"],
  "help by its long name after a flag out of place, before a command": () => ["--exit-zero", "balance", "--help"],
  "help by its long name after a modifier that took the command, and the target's flags": (_store, target) => [
    "--store",
    "balance",
    ...target,
    "--help",
  ],
  "help by its short name between a modifier that took the command and the target's flags": (_store, target) => [
    "--store",
    "balance",
    "-h",
    ...target,
  ],
  "help by its long name after a modifier that took the command, and another modifier": () => [
    "--store",
    "balance",
    "--run-id",
    "r1",
    "--help",
  ],
  "help by its long name where a modifier's value goes": () => ["--store", "--help"],
  "help by its long name after a modifier given twice": (store) => ["--store", store, "--store", store, "--help"],
  "help by its long name after a modifier joined to its value by an equals sign": (store) => [`--store=${store}`, "--help"],
  "help by its short name as a modifier's value, before a command": (_store, target) => ["--run-id", "-h", "balance", ...target],
};

When("the host is given {}", function (this: SpecControllerWorld, request: string) {
  const argvOf = HELP_AT_HOST_SCOPE[request];
  assert.ok(argvOf !== undefined, `no request row named "${request}"`);
  this.hostResult = spawnBesideStore(this, argvOf(this.storeRoot, this.invocationArgs));
});

Then("it answers with the same top-level help as a bare invocation, and succeeds", function (this: SpecControllerWorld) {
  const bare = spawnBesideStore(this, []);
  const help = spawnBesideStore(this, ["--help"]);
  assert.equal(this.hostResult.status, 0, `expected exit 0; got ${this.hostResult.status}\n${this.hostResult.stderr}`);
  assert.equal(this.hostResult.stderr, "", `expected nothing on stderr; got:\n${this.hostResult.stderr}`);
  assert.equal(bare.status, 0, `expected the bare run to exit 0; got ${bare.status}`);
  assert.equal(bare.stdout, help.stdout, "expected the bare run's stdout to be --help's");
  assert.ok(help.stdout.length > 0, "expected --help to print the top-level help");
  assert.equal(this.hostResult.stdout, bare.stdout, `expected the top-level help; got:\n${this.hostResult.stdout}`);
});

const RUN_ID_WITHOUT_STORE: Record<string, (target: string[], world: SpecControllerWorld) => string[]> = {
  "before a live balance run": (target) => ["--run-id", "r1", "balance", ...target],
  "before a live balance run, under the report-only option": (target) => ["--run-id", "r1", "balance", ...target, "--exit-zero"],
  "before a live balance run, under the strict option": (target) => ["--run-id", "r1", "balance", ...target, "--strict"],
  "before a live balance run that writes its report to a file": (target) => [
    "--run-id",
    "r1",
    "balance",
    ...target,
    "--format",
    "json:report.json",
  ],
  "before a balance re-render of a saved report": (target, world) => [
    "--run-id",
    "r1",
    "balance",
    "--render-from-json",
    savedReportOf(world, target),
  ],
};

function savedReportOf(world: SpecControllerWorld, target: string[]): string {
  const saved = join(temporaryDirectory(world, "scn-cli-083-saved-"), "saved.json");
  const result = spawnSync(NODE, [...SPEC_CONTROLLER_ARGV, "balance", ...target, "--format", `json:${saved}`], {
    encoding: "utf8",
  });
  assert.equal(result.error, undefined, `CLI failed to spawn: ${result.error?.message}`);
  assert.ok(existsSync(saved), `expected the saved report at ${saved}\n${result.stderr}`);
  return saved;
}

When("a run is named with the run-name modifier and given no store modifier, {}", function (this: SpecControllerWorld, shape: string) {
  const argvOf = RUN_ID_WITHOUT_STORE[shape];
  assert.ok(argvOf !== undefined, `no row for ${shape}`);
  runBesideStore(this, argvOf(this.invocationArgs, this));
});

Then("the refusal names the run-name modifier as naming a run that is not kept", function (this: SpecControllerWorld) {
  const { stderr } = this.balanceResult;
  assert.ok(
    showsEntry(stderr, "run-id-without-store") || (shownEntry(stderr, "re-render-not-stored")?.["modifiers"] ?? "").includes("--run-id"),
    `expected the run-id-without-store refusal, or a re-render-not-stored refusal naming --run-id; got:\n${stderr}`,
  );
  assert.equal(firstShown(stderr, [...OTHER_HOST_FAULTS, "no-command-after-modifiers"]), undefined, `stderr names another fault:\n${stderr}`);
  assert.equal(firstShown(stderr, MISSING), undefined, `stderr names another fault:\n${stderr}`);
  assert.doesNotMatch(stderr, /^\s+at /m, `stderr carries a stack trace:\n${stderr}`);
});

const BALANCE_HELP_NAME: Record<string, string> = {
  "by its long name": "--help",
  "by its short name": "-h",
};

When("balance's help is asked for {}, after the run-name modifier with no store modifier", function (this: SpecControllerWorld, request: string) {
  const help = BALANCE_HELP_NAME[request];
  assert.ok(help !== undefined, `no request row named "${request}"`);
  this.balanceHelpAlone = spawnBesideStore(this, ["balance", help]);
  this.hostResult = spawnBesideStore(this, ["--run-id", "r1", "balance", help]);
});

Then("it answers with balance's help, exactly as it does with nothing before it, and succeeds", function (this: SpecControllerWorld) {
  assert.equal(this.balanceHelpAlone.status, 0, `balance's help alone did not answer\n${this.balanceHelpAlone.stderr}`);
  assert.match(this.balanceHelpAlone.stdout, /--render-from-json/, "expected balance's help to list its own flags");
  assert.equal(this.hostResult.status, 0, `expected exit 0; got ${this.hostResult.status}\n${this.hostResult.stderr}`);
  assert.equal(this.hostResult.stderr, "", `expected nothing on stderr; got:\n${this.hostResult.stderr}`);
  assert.equal(this.hostResult.stdout, this.balanceHelpAlone.stdout, `expected balance's help; got:\n${this.hostResult.stdout}`);
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
  "after a part not in the scenario-code form": ["fit", "--help"],
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
  assert.doesNotMatch(this.answer.stdout, /^SCN-/m);
});

const MODIFIER_FLAG: Record<string, string> = { "the store modifier": "--store", "the run-name modifier": "--run-id" };

function modifierFlags(modifiers: string): string[] {
  return modifiers.split(" and ").map((modifier) => {
    const flag = MODIFIER_FLAG[modifier];
    assert.ok(flag !== undefined, `no flag for: ${modifier}`);
    return flag;
  });
}

function modifierArgs(world: SpecControllerWorld, modifiers: string): string[] {
  world.storeRoot = join(temporaryDirectory(world, "allocate-store-"), "store");
  const values: Record<string, string> = { "--store": world.storeRoot, "--run-id": "r1" };
  return modifierFlags(modifiers).flatMap((modifier) => [modifier, values[modifier] ?? ""]);
}

When("the author asks for the next code for {word} with {} before the command", function (this: SpecControllerWorld, part: string, modifiers: string) {
  const result = spawnSync(NODE, [...SPEC_CONTROLLER_ARGV, ...modifierArgs(this, modifiers), "allocate", part], {
    cwd: this.repository,
    encoding: "utf8",
  });
  assert.equal(result.error, undefined, `the binary failed to spawn: ${result.error?.message}`);
  this.answer = result;
});

Then("it is refused as a usage error naming {}, and no code is given", function (this: SpecControllerWorld, modifiers: string) {
  assert.equal(this.answer.status, 2, `expected the usage status, got ${this.answer.status}\n${this.answer.stderr}`);
  assert.equal(this.answer.stdout, "");
  for (const modifier of modifierFlags(modifiers)) assert.ok(this.answer.stderr.includes(modifier), this.answer.stderr);
});

Then("nothing is stored, in the run store or the repository", function (this: SpecControllerWorld) {
  assert.equal(existsSync(this.storeRoot), false, `the store root was made: ${this.storeRoot}`);
  assert.equal(git(this.repository, ["status", "--porcelain"]).trim(), "");
});

const HELP_AFTER_MODIFIERS: Record<string, readonly string[]> = {
  alone: ["--help"],
  "by its short name, alone": ["-h"],
  "after a part": ["ONE", "--help"],
  "by its short name, beside a flag the command does not take": ["--bogus", "-h"],
};

When("the author gives {} before allocate and asks it for its help {}", function (this: SpecControllerWorld, modifiers: string, request: string) {
  const args = HELP_AFTER_MODIFIERS[request];
  assert.ok(args !== undefined, `no arguments for: ${request}`);
  this.answerAlone = allocate(this.repository, args);
  const result = spawnSync(NODE, [...SPEC_CONTROLLER_ARGV, ...modifierArgs(this, modifiers), "allocate", ...args], {
    cwd: this.repository,
    encoding: "utf8",
  });
  assert.equal(result.error, undefined, `the binary failed to spawn: ${result.error?.message}`);
  this.answer = result;
});

Then("it answers with allocate's help, exactly as it does with nothing before it, and gives no code", function (this: SpecControllerWorld) {
  assert.equal(this.answerAlone.status, 0, `allocate alone did not answer its help\n${this.answerAlone.stderr}`);
  assert.ok(opensWithAllocateHelpTitle(this.answerAlone.stdout), this.answerAlone.stdout);
  assert.equal(this.answer.status, 0, `expected success, got ${this.answer.status}\n${this.answer.stderr}`);
  assert.equal(this.answer.stderr, "");
  assert.equal(this.answer.stdout, this.answerAlone.stdout);
  assert.doesNotMatch(this.answer.stdout, /^SCN-/m);
});
