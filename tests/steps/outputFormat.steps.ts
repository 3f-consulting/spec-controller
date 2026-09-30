import { Given, When, Then, After } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { spawnSync, type SpawnSyncReturns } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  runReconcile,
  readEvidenceObligations,
  readFeatureNames,
} from "../../packages/spec-controller/src/ingest/ingestQualityChecks.js";
import { planOutput } from "../../packages/spec-controller/src/cli-balance/emit/format.js";
import { writeOutputs, type OutputPayloads } from "../../packages/spec-controller/src/cli-balance/emit/writer.js";
import { renderMarkdown } from "@3f-consulting/spec-controller-core";
import { renderJson } from "@3f-consulting/spec-controller-core";
import type { RunContext } from "@3f-consulting/spec-controller-core";
import { NODE, SPEC_CONTROLLER_ARGV } from "./support/builtCli.js";

const FIXTURE = {
  features: "tests/fixtures/evidence-observation/features",
  vitest: "tests/fixtures/evidence-observation/vitest.json",
  cucumber: "tests/fixtures/evidence-observation/cucumber.json",
};

let payloads: OutputPayloads;
let capturedStdout: string;

let fmt002Dir: string;
let fmt002FilePath: string;
let fmt002Stdout: string;

let fmt003Dir: string;
let fmt003FilePath: string;
let fmt003Stdout: string;

let fmt004Dir: string;
let fmt004FilePath: string;
let fmt004Stdout: string;

let fmt005Cwd: string;
let fmt005Result: SpawnSyncReturns<string>;

let fmt006Cwd: string;
let fmt006JsonPath: string;
let fmt006Result: SpawnSyncReturns<string>;

let fmt007Cwd: string;
let fmt007Result: SpawnSyncReturns<string>;

function captureStdout(thunk: () => void): string {
  const chunks: string[] = [];
  const original = process.stdout.write.bind(process.stdout);
  process.stdout.write = ((chunk: string | Uint8Array): boolean => {
    chunks.push(typeof chunk === "string" ? chunk : Buffer.from(chunk).toString("utf8"));
    return true;
  }) as typeof process.stdout.write;
  try {
    thunk();
  } finally {
    process.stdout.write = original;
  }
  return chunks.join("");
}

Given("a reconciled ledger for a target corpus", function () {
  const balance = runReconcile(FIXTURE);
  const ctx: RunContext = {
    target: "evidence observation-fixture",
    inputs: {},
    runStart: new Date("2026-07-01T00:00:00.000Z"),
    sourceSha: null,
  };
  payloads = {
    balance,
    ctx,
    evidenceObligations: readEvidenceObligations(FIXTURE.features),
    withRuntimeObservations: true,
    featureNames: readFeatureNames(FIXTURE.features),
  };
});

When("the outputs are planned with no --format flag and written", function () {
  const result = planOutput([]);
  assert.ok(result.ok, `expected planOutput([]) to succeed; got error: ${result.ok ? "" : result.error}`);
  capturedStdout = captureStdout(() => writeOutputs(result.plan, payloads));
});

Then("the rendered markdown report is written to stdout", function () {
  const expected =
    renderMarkdown(
      payloads.balance,
      payloads.ctx,
      payloads.evidenceObligations,
      payloads.featureNames
    ) + "\n";
  assert.ok(
    capturedStdout.length > 0,
    "expected the writer to write the markdown report to stdout; got no stdout bytes"
  );
  assert.ok(
    capturedStdout.includes("| Scenario |"),
    `expected stdout to carry the markdown ledger; got:\n${capturedStdout}`
  );
  assert.equal(
    capturedStdout,
    expected,
    "expected the stdout bytes to equal the rendered markdown report (with a trailing newline)"
  );
});

When("the outputs are planned with a json:<path> spec and written to that path", function () {
  fmt002Dir = mkdtempSync(join(tmpdir(), "spec-controller-fmt002-"));
  fmt002FilePath = join(fmt002Dir, "spec-reconciliation.json");
  const result = planOutput([`json:${fmt002FilePath}`]);
  assert.ok(
    result.ok,
    `expected planOutput(["json:${fmt002FilePath}"]) to succeed; got error: ${result.ok ? "" : result.error}`
  );
  fmt002Stdout = captureStdout(() => writeOutputs(result.plan, payloads));
});

Then("the rendered JSON report is written to that file and stdout stays empty", function () {
  assert.ok(
    existsSync(fmt002FilePath),
    `expected the writer to create the file ${fmt002FilePath}; it does not exist (json was not routed to the file)`
  );
  const fileContents = readFileSync(fmt002FilePath, "utf8");
  const expected =
    renderJson(payloads.balance, payloads.ctx, payloads.evidenceObligations, payloads.featureNames) + "\n";
  assert.equal(
    fileContents,
    expected,
    `expected the file to carry the rendered JSON report (with a trailing newline); got:\n${fileContents}`
  );
  assert.equal(
    fmt002Stdout,
    "",
    `expected stdout to stay empty for a file-routed output; got:\n${fmt002Stdout}`
  );
});

After({ tags: "@SCN-FMT-002" }, function () {
  if (fmt002Dir && existsSync(fmt002Dir)) rmSync(fmt002Dir, { recursive: true, force: true });
});

When("the outputs are planned with a md:<path> spec and written to that path", function () {
  fmt003Dir = mkdtempSync(join(tmpdir(), "spec-controller-fmt003-"));
  fmt003FilePath = join(fmt003Dir, "spec-reconciliation.md");
  const result = planOutput([`md:${fmt003FilePath}`]);
  assert.ok(
    result.ok,
    `expected planOutput(["md:${fmt003FilePath}"]) to succeed; got error: ${result.ok ? "" : result.error}`
  );
  fmt003Stdout = captureStdout(() => writeOutputs(result.plan, payloads));
});

Then("the rendered markdown report is written to that file and stdout stays empty", function () {
  assert.ok(
    existsSync(fmt003FilePath),
    `expected the writer to create the file ${fmt003FilePath}; it does not exist (markdown was not routed to the file)`
  );
  const fileContents = readFileSync(fmt003FilePath, "utf8");
  const expected =
    renderMarkdown(
      payloads.balance,
      payloads.ctx,
      payloads.evidenceObligations,
      payloads.featureNames
    ) + "\n";
  assert.ok(
    fileContents.includes("| Scenario |"),
    `expected the file to carry the markdown ledger; got:\n${fileContents}`
  );
  assert.equal(
    fileContents,
    expected,
    `expected the file to carry the rendered markdown report (with a trailing newline); got:\n${fileContents}`
  );
  assert.equal(
    fmt003Stdout,
    "",
    `expected stdout to stay empty for a file-routed output; got:\n${fmt003Stdout}`
  );
});

After({ tags: "@SCN-FMT-003" }, function () {
  if (fmt003Dir && existsSync(fmt003Dir)) rmSync(fmt003Dir, { recursive: true, force: true });
});

When(
  "the outputs are planned with a md spec and a json:<path> spec and written",
  function () {
    fmt004Dir = mkdtempSync(join(tmpdir(), "spec-controller-fmt004-"));
    fmt004FilePath = join(fmt004Dir, "spec-reconciliation.json");
    const result = planOutput(["md", `json:${fmt004FilePath}`]);
    assert.ok(
      result.ok,
      `expected planOutput(["md", "json:${fmt004FilePath}"]) to succeed; got error: ${result.ok ? "" : result.error}`
    );
    fmt004Stdout = captureStdout(() => writeOutputs(result.plan, payloads));
  }
);

Then(
  "the markdown report is written to stdout and the JSON report to that file",
  function () {
    const expectedMarkdown =
      renderMarkdown(
        payloads.balance,
        payloads.ctx,
        payloads.evidenceObligations,
        payloads.featureNames
      ) + "\n";
    assert.ok(
      fmt004Stdout.includes("| Scenario |"),
      `expected stdout to carry the markdown ledger; got:\n${fmt004Stdout}`
    );
    assert.equal(
      fmt004Stdout,
      expectedMarkdown,
      "expected the stdout bytes to equal the rendered markdown report (with a trailing newline)"
    );
    assert.ok(
      existsSync(fmt004FilePath),
      `expected the writer to create the file ${fmt004FilePath}; it does not exist (json was not routed to the file in the multi-output call)`
    );
    const fileContents = readFileSync(fmt004FilePath, "utf8");
    const expectedJson =
      renderJson(payloads.balance, payloads.ctx, payloads.evidenceObligations, payloads.featureNames) + "\n";
    assert.equal(
      fileContents,
      expectedJson,
      `expected the file to carry the rendered JSON report (with a trailing newline); got:\n${fileContents}`
    );
  }
);

After({ tags: "@SCN-FMT-004" }, function () {
  if (fmt004Dir && existsSync(fmt004Dir)) rmSync(fmt004Dir, { recursive: true, force: true });
});

Given("a target corpus to reconcile", function () {
  fmt005Cwd = mkdtempSync(join(tmpdir(), "spec-controller-fmt005-"));
  assert.ok(
    existsSync(join(process.cwd(), FIXTURE.features)),
    "the reconcilable fixture features dir is missing"
  );
});

When("the CLI is run with --format md and --format json", function () {
  const repoRoot = process.cwd();
  const abs = (p: string): string => join(repoRoot, p);
  fmt005Result = spawnSync(
    NODE,
    [
      ...SPEC_CONTROLLER_ARGV,
      "balance",
      "--features", abs(FIXTURE.features),
      "--vitest", abs(FIXTURE.vitest),
      "--cucumber", abs(FIXTURE.cucumber),
      "--target", "evidence observation-fixture",
      "--format", "md",
      "--format", "json",
    ],
    { cwd: fmt005Cwd, encoding: "utf8" }
  );
});

Then("the CLI exits non-zero", function () {
  assert.equal(
    fmt005Result.error,
    undefined,
    `expected the CLI subprocess to run; it failed to spawn: ${fmt005Result.error?.message}`
  );
  assert.notEqual(
    fmt005Result.status,
    0,
    `expected a non-zero exit rejecting two outputs both routed to stdout; got exit ${fmt005Result.status}\n` +
      `stdout:\n${fmt005Result.stdout}\nstderr:\n${fmt005Result.stderr}`
  );
});

Then("stderr hints to give one of the outputs a :<path>", function () {
  const stderr = fmt005Result.stderr ?? "";
  assert.match(
    stderr,
    /stdout/i,
    `expected stderr to explain the stdout collision; got:\n${stderr}`
  );
  assert.match(
    stderr,
    /:<path>/,
    `expected stderr to hint at giving one output a :<path>; got:\n${stderr}`
  );
});

After({ tags: "@SCN-FMT-005" }, function () {
  if (fmt005Cwd && existsSync(fmt005Cwd)) rmSync(fmt005Cwd, { recursive: true, force: true });
});

Given("a target corpus to reconcile with a legacy --json destination", function () {
  fmt006Cwd = mkdtempSync(join(tmpdir(), "spec-controller-fmt006-"));
  fmt006JsonPath = join(fmt006Cwd, "out.json");
  assert.ok(
    existsSync(join(process.cwd(), FIXTURE.features)),
    "the reconcilable fixture features dir is missing"
  );
});

When("the CLI is run with the removed --json flag", function () {
  const repoRoot = process.cwd();
  const abs = (p: string): string => join(repoRoot, p);
  fmt006Result = spawnSync(
    NODE,
    [
      ...SPEC_CONTROLLER_ARGV,
      "balance",
      "--features", abs(FIXTURE.features),
      "--vitest", abs(FIXTURE.vitest),
      "--cucumber", abs(FIXTURE.cucumber),
      "--target", "evidence observation-fixture",
      "--json", fmt006JsonPath,
    ],
    { cwd: fmt006Cwd, encoding: "utf8" }
  );
});

Then("the CLI exits non-zero and does not create the --json file", function () {
  assert.equal(
    fmt006Result.error,
    undefined,
    `expected the CLI subprocess to run; it failed to spawn: ${fmt006Result.error?.message}`
  );
  assert.notEqual(
    fmt006Result.status,
    0,
    `expected a non-zero exit rejecting the removed --json flag; got exit ${fmt006Result.status}\n` +
      `stdout:\n${fmt006Result.stdout}\nstderr:\n${fmt006Result.stderr}`
  );
  assert.ok(
    !existsSync(fmt006JsonPath),
    `expected the removed --json flag NOT to write ${fmt006JsonPath}; the file exists (the legacy write path is still live)`
  );
});

Then("stderr hints to use --format json:<path>", function () {
  const stderr = fmt006Result.stderr ?? "";
  assert.match(
    stderr,
    /--format json:<path>/,
    `expected stderr to hint at using --format json:<path>; got:\n${stderr}`
  );
});

After({ tags: "@SCN-FMT-006" }, function () {
  if (fmt006Cwd && existsSync(fmt006Cwd)) rmSync(fmt006Cwd, { recursive: true, force: true });
});

Given("a target corpus to reconcile with an unsupported --format", function () {
  fmt007Cwd = mkdtempSync(join(tmpdir(), "spec-controller-fmt007-"));
  assert.ok(
    existsSync(join(process.cwd(), FIXTURE.features)),
    "the reconcilable fixture features dir is missing"
  );
});

When("the CLI is run with --format xml", function () {
  const repoRoot = process.cwd();
  const abs = (p: string): string => join(repoRoot, p);
  fmt007Result = spawnSync(
    NODE,
    [
      ...SPEC_CONTROLLER_ARGV,
      "balance",
      "--features", abs(FIXTURE.features),
      "--vitest", abs(FIXTURE.vitest),
      "--cucumber", abs(FIXTURE.cucumber),
      "--target", "evidence observation-fixture",
      "--format", "xml",
    ],
    { cwd: fmt007Cwd, encoding: "utf8" }
  );
});

Then("the CLI exits non-zero rejecting the unknown format", function () {
  assert.equal(
    fmt007Result.error,
    undefined,
    `expected the CLI subprocess to run; it failed to spawn: ${fmt007Result.error?.message}`
  );
  assert.notEqual(
    fmt007Result.status,
    0,
    `expected a non-zero exit rejecting the unknown format xml; got exit ${fmt007Result.status}\n` +
      `stdout:\n${fmt007Result.stdout}\nstderr:\n${fmt007Result.stderr}`
  );
});

Then("stderr lists the supported formats md and json", function () {
  const stderr = fmt007Result.stderr ?? "";
  assert.match(
    stderr,
    /\bmd\b/,
    `expected stderr to list md as a supported format; got:\n${stderr}`
  );
  assert.match(
    stderr,
    /\bjson\b/,
    `expected stderr to list json as a supported format; got:\n${stderr}`
  );
});

After({ tags: "@SCN-FMT-007" }, function () {
  if (fmt007Cwd && existsSync(fmt007Cwd)) rmSync(fmt007Cwd, { recursive: true, force: true });
});
