/**
 * Step definitions for features/output-format.feature (the @FMT output-dispatch feature).
 *
 * @SCN-FMT-001 — the bidirectional @integration evidence marker (Evidence Manifesto §9).
 * This arm exercises the REAL app-layer output path END-TO-END: runReconcile produces a
 * balance from a fixture target, planOutput([]) plans the no-flag default, and writeOutputs
 * performs the REAL IO — writing to process.stdout, whose bytes are captured and asserted.
 *
 * Anti-watermelon (authoring constraint): this asserts the REAL stdout effect of
 * the writer — the captured bytes — never a re-run of the planOutput @unit. The captured
 * stdout must carry the markdown report renderMarkdown produces (the writer's contract),
 * so a stubbed / non-writing / wrong-format writer REDS.
 *
 * Self-contained module-level outcome + distinct step text, so it shares no outcome with the
 * other steps files (Cucumber registers step definitions globally).
 *
 * Evidence: @SCN-FMT-001 — the output-dispatch rework.
 */

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

// A fixture target with a reconcilable spec corpus + result reports (reused from @RPT).
const FIXTURE = {
  features: "tests/fixtures/evidence-observation/features",
  vitest: "tests/fixtures/evidence-observation/vitest.json",
  cucumber: "tests/fixtures/evidence-observation/cucumber.json",
};

// Fixtures shared across steps within a scenario (isolated per scenario by Cucumber).
let payloads: OutputPayloads;
let capturedStdout: string;

// @SCN-FMT-002 outcome — the temp dir the json is routed into, and the stdout captured
// while the file-routed output is written (which must stay empty).
let fmt002Dir: string;
let fmt002FilePath: string;
let fmt002Stdout: string;

// @SCN-FMT-003 outcome — the temp dir the markdown is routed into, and the stdout captured
// while the file-routed output is written (which must stay empty).
let fmt003Dir: string;
let fmt003FilePath: string;
let fmt003Stdout: string;

// @SCN-FMT-004 outcome — the temp dir the json arm is routed into, and the stdout captured
// while BOTH outputs (md→stdout + json→file) are written in ONE writeOutputs call.
let fmt004Dir: string;
let fmt004FilePath: string;
let fmt004Stdout: string;

// @SCN-FMT-005 outcome — the temp cwd the REAL CLI subprocess runs in (isolating any run
// artefacts a not-yet-rejecting CLI would write, out of the repo tree), and the captured
// subprocess result (exit code + stderr) for the two-outputs-both-to-stdout rejection.
let fmt005Cwd: string;
let fmt005Result: SpawnSyncReturns<string>;

// @SCN-FMT-006 outcome — the temp cwd the REAL CLI subprocess runs in, the absolute path the
// removed --json flag points at (which must NEVER be created), and the captured subprocess
// result (exit code + stderr) for the legacy-flag rejection.
let fmt006Cwd: string;
let fmt006JsonPath: string;
let fmt006Result: SpawnSyncReturns<string>;

// @SCN-FMT-007 outcome — the temp cwd the REAL CLI subprocess runs in (isolating any run
// artefacts a not-yet-rejecting CLI would write, out of the repo tree), and the captured
// subprocess result (exit code + stderr) for the unknown-format rejection.
let fmt007Cwd: string;
let fmt007Result: SpawnSyncReturns<string>;

/** Run a thunk with process.stdout.write captured to a buffer (the real IO effect). */
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

// @SCN-FMT-001
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

// @SCN-FMT-001
When("the outputs are planned with no --format flag and written", function () {
  const result = planOutput([]);
  assert.ok(result.ok, `expected planOutput([]) to succeed; got error: ${result.ok ? "" : result.error}`);
  capturedStdout = captureStdout(() => writeOutputs(result.plan, payloads));
});

// @SCN-FMT-001
Then("the rendered markdown report is written to stdout", function () {
  // Teeth: the captured stdout must BE the markdown render (the writer's contract) —
  // a stubbed/non-writing/wrong-format writer produces empty or non-markdown bytes.
  const expected =
    renderMarkdown(
      payloads.balance,
      payloads.ctx,
      payloads.evidenceObligations,
      payloads.withRuntimeObservations,
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

// @SCN-FMT-002
// This arm exercises the REAL app-layer file path END-TO-END: planOutput parses a
// "json:<path>" spec to a file-destined json output, and writeOutputs performs the REAL
// IO — writing to the file on disk while stdout is captured. The assertions read the REAL
// file back and check the REAL captured stdout (anti-watermelon: never a planOutput
// re-run), so a stdout-routed / non-writing / wrong-format writer REDS.
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

// @SCN-FMT-002
Then("the rendered JSON report is written to that file and stdout stays empty", function () {
  // Teeth 1 (anti-watermelon): the REAL file on disk carries the rendered JSON — read it
  // back and compare to the renderer's output (the writer's contract). A stdout-routed or
  // non-writing writer leaves the file absent; a wrong-format writer writes markdown.
  assert.ok(
    existsSync(fmt002FilePath),
    `expected the writer to create the file ${fmt002FilePath}; it does not exist (json was not routed to the file)`
  );
  const fileContents = readFileSync(fmt002FilePath, "utf8");
  const expected =
    renderJson(payloads.balance, payloads.ctx, payloads.evidenceObligations, payloads.withRuntimeObservations, payloads.guards, payloads.featureNames) + "\n";
  assert.equal(
    fileContents,
    expected,
    `expected the file to carry the rendered JSON report (with a trailing newline); got:\n${fileContents}`
  );
  // Teeth 2: stdout carries NOTHING for a file-routed output.
  assert.equal(
    fmt002Stdout,
    "",
    `expected stdout to stay empty for a file-routed output; got:\n${fmt002Stdout}`
  );
});

After({ tags: "@SCN-FMT-002" }, function () {
  if (fmt002Dir && existsSync(fmt002Dir)) rmSync(fmt002Dir, { recursive: true, force: true });
});

// @SCN-FMT-003
// This arm exercises the REAL app-layer file path END-TO-END for markdown: planOutput
// parses a "md:<path>" spec to a file-destined markdown output, and writeOutputs performs
// the REAL IO — writing to the file on disk while stdout is captured. The assertions read
// the REAL file back and check the REAL captured stdout (anti-watermelon: never a
// planOutput re-run), so a stdout-routed / non-writing / wrong-format writer REDS. The
// parallel of @SCN-FMT-002, on markdown rather than json.
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

// @SCN-FMT-003
Then("the rendered markdown report is written to that file and stdout stays empty", function () {
  // Teeth 1 (anti-watermelon): the REAL file on disk carries the rendered markdown — read
  // it back and compare to the renderer's output (the writer's contract). A stdout-routed
  // or non-writing writer leaves the file absent; a wrong-format writer writes JSON.
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
      payloads.withRuntimeObservations,
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
  // Teeth 2: stdout carries NOTHING for a file-routed output — the human report is
  // captured off disk with no shell redirection, stdout staying clean.
  assert.equal(
    fmt003Stdout,
    "",
    `expected stdout to stay empty for a file-routed output; got:\n${fmt003Stdout}`
  );
});

After({ tags: "@SCN-FMT-003" }, function () {
  if (fmt003Dir && existsSync(fmt003Dir)) rmSync(fmt003Dir, { recursive: true, force: true });
});

// @SCN-FMT-004
// This arm exercises the REAL app-layer MULTI-output path END-TO-END in ONE call:
// planOutput parses a `md` + `json:<path>` spec list into TWO outputs (md→stdout,
// json→file), and writeOutputs performs BOTH real IO effects in a single invocation —
// writing the markdown to process.stdout (captured) AND the json to the file on disk.
// The assertions read the REAL file back and check the REAL captured stdout bytes
// (anti-watermelon: never a planOutput re-run), so dropping EITHER write REDS — proving
// the allowed multi-output case (exactly one output bound for stdout) really emits both.
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

// @SCN-FMT-004
Then(
  "the markdown report is written to stdout and the JSON report to that file",
  function () {
    // Teeth 1 (anti-watermelon): the REAL captured stdout carries the rendered markdown —
    // the md arm of the multi-output plan lands on stdout (the one allowed stdout output).
    // A writer that dropped the md write, or wrote the wrong format there, produces empty
    // or non-markdown bytes.
    const expectedMarkdown =
      renderMarkdown(
        payloads.balance,
        payloads.ctx,
        payloads.evidenceObligations,
        payloads.withRuntimeObservations,
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
    // Teeth 2 (anti-watermelon): the REAL file on disk carries the rendered JSON — the json
    // arm of the SAME plan was written to the file in the SAME writeOutputs call. Dropping
    // the second write leaves the file absent; a wrong-format write puts markdown here.
    assert.ok(
      existsSync(fmt004FilePath),
      `expected the writer to create the file ${fmt004FilePath}; it does not exist (json was not routed to the file in the multi-output call)`
    );
    const fileContents = readFileSync(fmt004FilePath, "utf8");
    const expectedJson =
      renderJson(payloads.balance, payloads.ctx, payloads.evidenceObligations, payloads.withRuntimeObservations, payloads.guards, payloads.featureNames) + "\n";
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

// @SCN-FMT-005
// This arm exercises the REAL CLI as a SUBPROCESS — the whole binary end-to-end, not the
// in-process planOutput/writeOutputs the other arms drive. It runs `tsx src/cli.ts` with the
// reconcilable fixture AND two --format specs both bound for stdout (`--format md --format
// json`), then asserts the REAL exit code (non-zero) and the REAL stderr text (the hint).
// Anti-watermelon (authoring constraint): it reads the subprocess's actual exit +
// stderr, NEVER a re-run of the planOutput @unit — so a CLI that accepted the collision
// (writing two interleaved documents to stdout and exiting 0) REDS. The subprocess runs in
// an isolated temp cwd with absolute fixture paths, so any run artefacts a not-yet-rejecting
// CLI writes land in the temp dir (cleaned up), never the repo tree.
Given("a target corpus to reconcile", function () {
  fmt005Cwd = mkdtempSync(join(tmpdir(), "spec-controller-fmt005-"));
  assert.ok(
    existsSync(join(process.cwd(), FIXTURE.features)),
    "the reconcilable fixture features dir is missing"
  );
});

// @SCN-FMT-005
When("the CLI is run with --format md and --format json", function () {
  const repoRoot = process.cwd();
  const abs = (p: string): string => join(repoRoot, p);
  fmt005Result = spawnSync(
    join(repoRoot, "node_modules", ".bin", "tsx"),
    [
      join(repoRoot, "packages", "spec-controller", "src", "cli-balance", "cli.ts"),
      "--features", abs(FIXTURE.features),
      "--vitest", abs(FIXTURE.vitest),
      "--cucumber", abs(FIXTURE.cucumber),
      "--target", "evidence observation-fixture",
      // Two outputs both routed to stdout — the collision the invariant rejects.
      "--format", "md",
      "--format", "json",
    ],
    { cwd: fmt005Cwd, encoding: "utf8" }
  );
});

// @SCN-FMT-005
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

// @SCN-FMT-005
Then("stderr hints to give one of the outputs a :<path>", function () {
  const stderr = fmt005Result.stderr ?? "";
  // Teeth: the REAL stderr must explain the stdout collision AND carry the :<path> hint —
  // a bare non-zero exit with no hint (or the wrong message) REDS.
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

// @SCN-FMT-006
// This arm exercises the REAL CLI as a SUBPROCESS — the whole binary end-to-end — with the
// REMOVED `--json <path>` flag. The pre-1084 flag used to write the JSON report to <path>;
// it is gone, and the CLI must now reject it with a non-zero exit + a stderr migration hint
// to `--format json:<path>`, WITHOUT writing the file (the removed flag never silently
// no-ops and drops output). It runs `tsx src/cli.ts` with the reconcilable fixture AND
// `--json <abs path>`, then asserts the REAL exit code (non-zero), the REAL absence of the
// file on disk, and the REAL stderr text (the hint). Anti-watermelon (authoring
// constraint): it reads the subprocess's actual exit + filesystem + stderr, NEVER a re-run
// of the checkLegacyJson @unit — so a CLI that still wrote the file (or exited 0) REDS. The
// subprocess runs in an isolated temp cwd with absolute fixture paths, so the --json target
// and any run artefacts land in the temp dir (cleaned up), never the repo tree.
Given("a target corpus to reconcile with a legacy --json destination", function () {
  fmt006Cwd = mkdtempSync(join(tmpdir(), "spec-controller-fmt006-"));
  fmt006JsonPath = join(fmt006Cwd, "out.json");
  assert.ok(
    existsSync(join(process.cwd(), FIXTURE.features)),
    "the reconcilable fixture features dir is missing"
  );
});

// @SCN-FMT-006
When("the CLI is run with the removed --json flag", function () {
  const repoRoot = process.cwd();
  const abs = (p: string): string => join(repoRoot, p);
  fmt006Result = spawnSync(
    join(repoRoot, "node_modules", ".bin", "tsx"),
    [
      join(repoRoot, "packages", "spec-controller", "src", "cli-balance", "cli.ts"),
      "--features", abs(FIXTURE.features),
      "--vitest", abs(FIXTURE.vitest),
      "--cucumber", abs(FIXTURE.cucumber),
      "--target", "evidence observation-fixture",
      // The removed pre-1084 flag — must be rejected, not honoured.
      "--json", fmt006JsonPath,
    ],
    { cwd: fmt006Cwd, encoding: "utf8" }
  );
});

// @SCN-FMT-006
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
  // Teeth (anti-watermelon): the removed flag must NOT silently write the file — the whole
  // point of the rejection is that the operator's output is never dropped onto a path the
  // tool no longer honours. A CLI that still ran the legacy write leaves the file here.
  assert.ok(
    !existsSync(fmt006JsonPath),
    `expected the removed --json flag NOT to write ${fmt006JsonPath}; the file exists (the legacy write path is still live)`
  );
});

// @SCN-FMT-006
Then("stderr hints to use --format json:<path>", function () {
  const stderr = fmt006Result.stderr ?? "";
  // Teeth: the REAL stderr must name the replacement so the operator knows where the flag
  // moved — a bare non-zero exit with no hint (or the wrong message) REDS.
  assert.match(
    stderr,
    /--format json:<path>/,
    `expected stderr to hint at using --format json:<path>; got:\n${stderr}`
  );
});

After({ tags: "@SCN-FMT-006" }, function () {
  if (fmt006Cwd && existsSync(fmt006Cwd)) rmSync(fmt006Cwd, { recursive: true, force: true });
});

// @SCN-FMT-007
// This arm exercises the REAL CLI as a SUBPROCESS — the whole binary end-to-end — with an
// UNSUPPORTED `--format xml`. Without the guard the CLI silently treats the unknown format
// as markdown (the writer's default render branch) and exits 0; it must instead reject it
// with a non-zero exit + a stderr hint LISTING the supported formats (md, json). It runs
// `tsx src/cli.ts` with the reconcilable fixture AND `--format xml`, then asserts the REAL
// exit code (non-zero) and the REAL stderr text (the hint). Anti-watermelon (authoring
// constraint): it reads the subprocess's actual exit + stderr, NEVER a re-run of
// the planOutput @unit — so a CLI that accepted xml (rendering markdown and exiting 0) REDS.
// The subprocess runs in an isolated temp cwd with absolute fixture paths, so any run
// artefacts a not-yet-rejecting CLI writes land in the temp dir (cleaned up), never the repo.
Given("a target corpus to reconcile with an unsupported --format", function () {
  fmt007Cwd = mkdtempSync(join(tmpdir(), "spec-controller-fmt007-"));
  assert.ok(
    existsSync(join(process.cwd(), FIXTURE.features)),
    "the reconcilable fixture features dir is missing"
  );
});

// @SCN-FMT-007
When("the CLI is run with --format xml", function () {
  const repoRoot = process.cwd();
  const abs = (p: string): string => join(repoRoot, p);
  fmt007Result = spawnSync(
    join(repoRoot, "node_modules", ".bin", "tsx"),
    [
      join(repoRoot, "packages", "spec-controller", "src", "cli-balance", "cli.ts"),
      "--features", abs(FIXTURE.features),
      "--vitest", abs(FIXTURE.vitest),
      "--cucumber", abs(FIXTURE.cucumber),
      "--target", "evidence observation-fixture",
      // An unsupported format — must be rejected, not silently rendered as markdown.
      "--format", "xml",
    ],
    { cwd: fmt007Cwd, encoding: "utf8" }
  );
});

// @SCN-FMT-007
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

// @SCN-FMT-007
Then("stderr lists the supported formats md and json", function () {
  const stderr = fmt007Result.stderr ?? "";
  // Teeth: the REAL stderr must LIST the supported formats so the operator knows what to
  // use — a bare non-zero exit with no hint (or the wrong message) REDS. Anti-watermelon:
  // this reads the subprocess's actual stderr, never a planOutput re-run.
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
