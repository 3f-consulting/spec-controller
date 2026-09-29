import { After, Given, Then, When } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { closeSync, copyFileSync, linkSync, lstatSync, mkdirSync, mkdtempSync, openSync, readFileSync, readdirSync, readlinkSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import { NODE, SPEC_CONTROLLER_ARGV } from "./support/builtCli.js";

const BALANCED = 0;
const OUT_OF_BALANCE = 1;
const USAGE = 2;

const FIXTURE = join(process.cwd(), "tests", "fixtures", "balanced");
const WORKFLOW = "name: ci\non: [push]\njobs:\n  build:\n    runs-on: ubuntu-latest\n    steps:\n      - run: pnpm test\n";
const MANIFEST = `${JSON.stringify({ name: "input-overwrite-target", private: true, scripts: { test: "vitest run" }, specController: { runners: { unit: "vitest" } } })}\n`;

/** The reports every run is handed, whichever input a row is about. */
const REPORTS = ["--vitest", "vitest.json", "--cucumber", "cucumber.json", "--ci-steps", "ci-steps.json", "--target", "input-overwrite"];

interface PointedAt {
  readonly features?: string;
  readonly manifest?: string;
  readonly workflows?: string;
  readonly vitest?: string;
}

/** Each input a row names: the file the report is aimed at, what the run is pointed at, how the refusal names it, and any link the row needs first. */
interface InputRow {
  readonly file: string;
  readonly pointedAt: PointedAt;
  readonly subject: string;
  readonly arrange?: (target: string) => void;
}

const POINTED: PointedAt = { features: "features", manifest: "package.json", workflows: "ci.yml" };

const INPUT: Readonly<Record<string, InputRow>> = {
  "the unit test report": { file: "vitest.json", pointedAt: POINTED, subject: "the --vitest report" },
  "the cucumber report": { file: "cucumber.json", pointedAt: POINTED, subject: "the --cucumber report" },
  "the record of the CI steps": { file: "ci-steps.json", pointedAt: POINTED, subject: "the --ci-steps record" },
  "the manifest it was pointed at": { file: "package.json", pointedAt: POINTED, subject: "the --package-json manifest" },
  "the manifest it reads by default": { file: "package.json", pointedAt: { ...POINTED, manifest: undefined }, subject: "the package.json read by default" },
  "a feature file of the corpus it was pointed at": { file: "features/target.feature", pointedAt: POINTED, subject: "a feature file of the --features corpus" },
  "a feature file of the corpus it reads by default": {
    file: "features/target.feature",
    pointedAt: { ...POINTED, features: undefined },
    subject: "a feature file of the corpus read by default",
  },
  "the workflow file it was pointed at": { file: "ci.yml", pointedAt: POINTED, subject: "the --ci workflow" },
  "a .yml workflow of the folder it was pointed at": { file: "cidir/ci.yml", pointedAt: { ...POINTED, workflows: "cidir" }, subject: "a workflow of the --ci folder" },
  "a .yaml workflow of the folder it was pointed at": { file: "cidir/other.yaml", pointedAt: { ...POINTED, workflows: "cidir" }, subject: "a workflow of the --ci folder" },
  "a workflow of the folder it reads by default": {
    file: ".github/workflows/ci.yml",
    pointedAt: { ...POINTED, workflows: undefined },
    subject: "a CI workflow read by default",
  },
  "the unit test report, named through a symbolic link": {
    file: "vitest.json",
    pointedAt: { ...POINTED, vitest: "vitest-link.json" },
    subject: "the --vitest report",
    arrange: (target) => symlinkSync(join(target, "vitest.json"), join(target, "vitest-link.json")),
  },
  "a feature file of the corpus, named through a linked folder": {
    file: "features/target.feature",
    pointedAt: { ...POINTED, features: "features-link" },
    subject: "a feature file of the --features corpus",
    arrange: (target) => symlinkSync(join(target, "features"), join(target, "features-link")),
  },
};

const APPENDED_STDOUT = "where standard output is appended";

/** Each spelling of the input's path the report is aimed at, given the path relative to the target. */
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

const FORMAT_FLAG: Readonly<Record<string, string>> = { json: "json", markdown: "md" };

interface Run {
  readonly status: number | null;
  readonly stdout: string;
  readonly stderr: string;
}

let scratch: string | undefined;
let target: string;
let row: InputRow;
let aimedAt: string;
let throughStdout: boolean;
let before: ReadonlyMap<string, string>;
let run: Run;
let namedOutput: string;
const verdicts = new Map<string, number | null>();

After({ tags: "@SCN-FMT-013" }, function () {
  if (scratch === undefined) return;
  rmSync(scratch, { recursive: true, force: true });
  scratch = undefined;
});

function pointedArgs(pointedAt: PointedAt): string[] {
  const args = [...REPORTS];
  if (pointedAt.vitest !== undefined) args[1] = pointedAt.vitest;
  if (pointedAt.features !== undefined) args.push("--features", pointedAt.features);
  if (pointedAt.manifest !== undefined) args.push("--package-json", pointedAt.manifest);
  if (pointedAt.workflows !== undefined) args.push("--ci", pointedAt.workflows);
  return args;
}

/** A target holding every input a run can read, given or by default, reconciling to `verdict` on its own. */
function buildTarget(dir: string, verdict: string): void {
  mkdirSync(join(dir, "features"));
  copyFileSync(join(FIXTURE, "features", "target.feature"), join(dir, "features", "target.feature"));
  const vitest = readFileSync(join(FIXTURE, "vitest.json"), "utf8");
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

function specController(args: readonly string[], stdout: "pipe" | number = "pipe"): Run {
  const result = spawnSync(NODE, [...SPEC_CONTROLLER_ARGV, ...args], { cwd: target, encoding: "utf8", stdio: ["ignore", stdout, "pipe"] });
  assert.equal(result.error, undefined, `the CLI failed to spawn: ${result.error?.message}`);
  return { status: result.status, stdout: result.stdout ?? "", stderr: result.stderr };
}

/** Every entry under `dir`: a file by its bytes, a link by where it points. */
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

Given(/^a (balanced|out-of-balance) target the run reads (.+) from$/, function (verdict: string, input: string) {
  const inputRow = INPUT[input];
  assert.ok(inputRow, `no input is arranged for "${input}"`);
  row = inputRow;
  scratch = mkdtempSync(join(tmpdir(), "spec-controller-input-overwrite-"));
  target = join(scratch, "target");
  mkdirSync(target);
  buildTarget(target, verdict);
  row.arrange?.(target);
  const args = ["balance", ...pointedArgs(row.pointedAt)];
  const key = `${verdict} ${args.join(" ")}`;
  if (!verdicts.has(key)) verdicts.set(key, specController(args).status);
  assert.equal(verdicts.get(key), verdict === "balanced" ? BALANCED : OUT_OF_BALANCE, `the target does not reconcile ${verdict} on its own`);
});

Given(/^a path to that input that is (.+)$/, function (alias: string) {
  const spell = ALIAS[alias];
  assert.ok(spell, `no path is arranged for "${alias}"`);
  aimedAt = spell(row.file, target);
  throughStdout = alias === APPENDED_STDOUT;
});

When(
  /^the operator (runs|stores a run of) it and asks for the (json|markdown) report at that path, and a second report at a file of its own$/,
  function (runs: string, format: string) {
    const flag = FORMAT_FLAG[format]!;
    const second = flag === "json" ? "md:second.md" : "json:second.json";
    const spec = throughStdout ? flag : `${flag}:${aimedAt}`;
    namedOutput = throughStdout ? `${flag} on standard output` : spec;
    const store = runs === "runs" ? [] : ["--store", join(target, "store"), "--run-id", "r1"];
    const args = [...store, "balance", ...pointedArgs(row.pointedAt), "--format", spec, "--format", second];
    before = entriesUnder(target);
    if (!throughStdout) {
      run = specController(args);
      return;
    }
    const fd = openSync(join(target, row.file), "a");
    try {
      run = specController(args, fd);
    } finally {
      closeSync(fd);
    }
  },
);

Then("the run is refused as a usage error, not a verdict, naming the report and the input it would overwrite", function () {
  assert.equal(run.status, USAGE, `expected the usage code; got ${run.status}\n${run.stderr}`);
  assert.ok(run.stderr.includes(namedOutput), `the refusal does not name ${namedOutput}:\n${run.stderr}`);
  assert.ok(run.stderr.includes(row.subject), `the refusal does not name ${row.subject}:\n${run.stderr}`);
});

Then("the refusal is a single line with no stack trace", function () {
  assert.equal(run.stderr.trimEnd().split("\n").length, 1, `the refusal is not one line:\n${run.stderr}`);
  assert.doesNotMatch(run.stderr, /^\s+at /m, "the refusal carries a stack trace");
});

Then("nothing is printed", function () {
  assert.equal(run.stdout, "", `something was printed:\n${run.stdout.slice(0, 400)}`);
});

Then("every file of the target is left exactly as it was", function () {
  assert.deepEqual(entriesUnder(target), before, "the refused run added, changed or removed a file of the target");
});
