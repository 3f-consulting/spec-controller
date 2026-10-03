import { After, Given, Then, When } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { copyFileSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, readlinkSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { NODE, SPEC_CONTROLLER_ARGV } from "./support/builtCli.js";
import { STORED_RUN_FILE_INTENT, storedRunFile } from "./support/storedRunFile.js";

const USAGE = 2;
const TARGET_NAME = "reads-its-own";
const RUN_ID = "r1";
const RUN_DIR = join("store", TARGET_NAME, RUN_ID);

const FIXTURE = join(process.cwd(), "tests", "fixtures", "balanced");
const WORKFLOW = "name: ci\non: [push]\njobs:\n  build:\n    runs-on: ubuntu-latest\n    steps:\n      - run: pnpm test\n";
const MANIFEST = `${JSON.stringify({ name: "stored-input-target", private: true, scripts: { test: "vitest run" }, specController: { runners: { unit: "vitest" } } })}\n`;

const INPUT: Readonly<Record<string, { readonly flag: string; readonly content: (target: string) => string }>> = {
  "cucumber report": { flag: "--cucumber", content: () => "[]\n" },
  "unit test report": { flag: "--vitest", content: (target) => readFileSync(join(target, "vitest.json"), "utf8") },
  "workflow file": { flag: "--ci", content: () => WORKFLOW },
};

interface Run {
  readonly status: number | null;
  readonly stdout: string;
  readonly stderr: string;
}

let scratch: string | undefined;
let target: string;
let args: string[];
let named: string;
let before: ReadonlyMap<string, string>;
let run: Run;

After({ tags: "@SCN-RMG-011" }, function () {
  if (scratch === undefined) return;
  rmSync(scratch, { recursive: true, force: true });
  scratch = undefined;
});

function specController(argv: readonly string[]): Run {
  const result = spawnSync(NODE, [...SPEC_CONTROLLER_ARGV, ...argv], { cwd: target, encoding: "utf8" });
  assert.equal(result.error, undefined, `the CLI failed to spawn: ${result.error?.message}`);
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
}

function entriesUnder(dir: string): Map<string, string> {
  const entries = new Map<string, string>();
  for (const entry of readdirSync(dir, { recursive: true })) {
    const path = join(dir, String(entry));
    const kind = lstatSync(path);
    if (kind.isSymbolicLink()) entries.set(path, `-> ${readlinkSync(path)}`);
    else if (kind.isFile()) entries.set(path, readFileSync(path, "latin1"));
  }
  return entries;
}

function targetArgs(overrides: Readonly<Record<string, string>>): string[] {
  const flags: Record<string, string> = {
    "--features": "features",
    "--vitest": "vitest.json",
    "--cucumber": "cucumber.json",
    "--ci-steps": "ci-steps.json",
    "--package-json": "package.json",
    "--ci": "ci.yml",
    "--target": TARGET_NAME,
    ...overrides,
  };
  return Object.entries(flags).flat();
}

Given(
  new RegExp(
    `^a balanced target whose (cucumber report|unit test report|workflow file) sits where a stored run of it would write (${STORED_RUN_FILE_INTENT}), over (nothing yet|an earlier kept run under the same run-id)$`,
  ),
  function (input: string, intent: string, earlier: string) {
    const file = storedRunFile(intent);
    scratch = mkdtempSync(join(tmpdir(), "spec-controller-stored-input-"));
    target = join(scratch, "target");
    mkdirSync(join(target, "features"), { recursive: true });
    copyFileSync(join(FIXTURE, "features", "target.feature"), join(target, "features", "target.feature"));
    copyFileSync(join(FIXTURE, "vitest.json"), join(target, "vitest.json"));
    writeFileSync(join(target, "cucumber.json"), "[]\n");
    writeFileSync(join(target, "ci-steps.json"), "{}\n");
    writeFileSync(join(target, "package.json"), MANIFEST);
    writeFileSync(join(target, "ci.yml"), WORKFLOW);
    const store = ["--store", "store", "--run-id", RUN_ID];
    if (earlier === "nothing yet") {
      mkdirSync(join(target, RUN_DIR), { recursive: true });
      writeFileSync(join(target, RUN_DIR, file), INPUT[input]!.content(target));
    } else {
      const kept = specController([...store, "balance", ...targetArgs({})]);
      assert.equal(kept.status, 0, `the earlier kept run did not complete:\n${kept.stderr}`);
    }
    named = join(RUN_DIR, file);
    args = [...store, "balance", ...targetArgs({ [INPUT[input]!.flag]: named })];
  },
);

When("the operator stores a run of it reading that input", function () {
  before = entriesUnder(target);
  run = specController(args);
});

Then("the stored run is refused as a usage error, naming that file", function () {
  assert.equal(run.status, USAGE, `expected the usage code; got ${run.status}\n${run.stderr}`);
  assert.ok(run.stderr.includes(named), `the refusal does not name ${named}:\n${run.stderr}`);
});

Then("its refusal is a single line with no stack trace", function () {
  assert.equal(run.stderr.trimEnd().split("\n").length, 1, `the refusal is not one line:\n${run.stderr}`);
  assert.doesNotMatch(run.stderr, /^\s+at /m, "the refusal carries a stack trace");
});

Then("no kept run is announced", function () {
  assert.equal(run.stdout, "", `a kept run was announced:\n${run.stdout}`);
});

Then("every file of the target and its store is left exactly as it was", function () {
  assert.deepEqual(entriesUnder(target), before, "the refused stored run added, changed or removed a file");
});
