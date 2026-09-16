/**
 * Step definitions for the @SCN-SSM-007 brace-titled-describe arm of
 * features/scenario-sub-issue-match.feature — a describe whose title literal
 * carries braces stays open over the `it`s beneath it, so they inherit its cite.
 *
 * Anti-watermelon (the @integration proof): this drives the REAL
 * lint:scn-subissues CLI as a SUBPROCESS over a throwaway git fixture, in the
 * shape that mis-fired — a template-literal describe title, cited, over one `it`
 * whose body the PR touches while the cite line above it stays a diff CONTEXT
 * line. That is the SSM-004 rename shape sitting under a brace-carrying title,
 * and before this arm the two together produced a FALSE uncited-unit-equivalent:
 * the block parser had already closed the describe on its own opening line, so
 * the touched `it` was a top-level block with an empty ancestor chain.
 *
 * Why the CLI and not the parser alone: the @unit arm pins the parse, but what
 * an author actually meets is the exit code. Only the live path — git diff →
 * block parse → touched-line map → decideScnGate → exit code — proves the gate
 * stops rejecting a compliant PR.
 *
 * @SCN-SSM-007 — bidirectional evidence marker.
 *
 * Parent: 3F-2367 (the brace-tracking fault); sibling SSM-005 (3F-1758) landed the
 * block attribution whose ancestor chain this one makes findable.
 */

import { Given, When, Then } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// @SCN-SSM-007
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const tsxBin = path.join(repoRoot, "node_modules/.bin/tsx");
const cliPath = path.join(
  repoRoot,
  "tests/checks/lintScnSubIssuesCli.ts"
);

/** The @SCN cited on the brace-titled describe — the cite the touched `it` must inherit. A
 * FIXTURE id, not one of this repository's (the fixture writes its own feature file for it). */
const CITED_CODE = "SCN-AAA-001";

const SRC_FILE = "packages/fixture-pkg/src/tally.ts";
const TEST_FILE = "packages/fixture-pkg/src/tally.test.ts";

/**
 * The fixture test file, with the title written as a TEMPLATE LITERAL carrying an
 * interpolation. The `${suite}` must survive into the fixture on disk verbatim, so
 * these are single-quoted strings — a template literal here would interpolate it
 * away and the fixture would prove the plain-title case that already passed.
 */
function testFileWith(expected: number): string {
  return (
    'import { describe, it, expect } from "vitest";\n' +
    'import { tally } from "./tally.js";\n\n' +
    'const suite = "the tally";\n\n' +
    "describe(`[" +
    CITED_CODE +
    "] ${suite}`, () => {\n" +
    '  it("counts", () => {\n' +
    `    expect(tally()).toBe(${expected});\n` +
    "  });\n" +
    "});\n"
  );
}

let fixtureDir: string;
let baseSha: string;
let cliExitCode: number;
let cliOutput: string;

function git(args: string[]): string {
  return execFileSync("git", args, { cwd: fixtureDir, encoding: "utf8" }).trim();
}

function write(relativePath: string, contents: string): void {
  const absolute = path.join(fixtureDir, relativePath);
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  fs.writeFileSync(absolute, contents);
}

// @SCN-SSM-007
Given(
  "a PR touching an it beneath a cited describe whose title literal carries braces, on a branch carrying a 3F ticket handle",
  function () {
    fixtureDir = fs.mkdtempSync(path.join(os.tmpdir(), "scn-ssm-007-"));
    execFileSync("git", ["init", "-q", "-b", "main"], { cwd: fixtureDir });
    git(["config", "user.email", "fixture@example.com"]);
    git(["config", "user.name", "Fixture"]);
    git(["config", "commit.gpgsign", "false"]);

    // A feature surface the PR never touches — no @SCN feature delta, so the
    // unit-equivalent arm is the one in play. That is exactly the arm the parser
    // fault was hiding behind.
    write(
      "features/target.feature",
      `@API\nFeature: fixture surface\n\n  @unit @${CITED_CODE}\n  Scenario: the summary tallies\n    Given a run\n`
    );

    write(SRC_FILE, "export function tally(): number {\n  return 1;\n}\n");
    write(TEST_FILE, testFileWith(1));
    git(["add", "."]);
    git(["commit", "-q", "-m", "base: the tally, cited on a template-literal describe title"]);
    baseSha = git(["rev-parse", "HEAD"]);

    // HEAD: behaviour-bearing src change, proven by the SAME `it` under the SAME
    // cited describe. Only the it-body moves; the cite line above it is untouched.
    write(SRC_FILE, "export function tally(): number {\n  return 2;\n}\n");
    write(TEST_FILE, testFileWith(2));
    git(["add", "."]);
    git(["commit", "-q", "-m", "[3F-9999] the tally counts two, proven by its cited test"]);
  }
);

// @SCN-SSM-007
When("the scenario sub-issue gate runs over the brace-titled fixture PR", function () {
  try {
    cliOutput = execFileSync(tsxBin, [cliPath], {
      cwd: fixtureDir,
      encoding: "utf8",
      env: {
        ...process.env,
        GITHUB_BASE_SHA: baseSha,
        GITHUB_HEAD_REF: "steven/3f-9999-the-tally-counts-two",
        PR_BODY: "",
      },
    });
    cliExitCode = 0;
  } catch (err) {
    const e = err as { status?: number; stdout?: string; stderr?: string };
    cliExitCode = typeof e.status === "number" ? e.status : 1;
    cliOutput = `${e.stdout ?? ""}${e.stderr ?? ""}`;
  }
});

// @SCN-SSM-007
Then(
  "the gate passes and exits 0, the it having inherited the describe's cite",
  function () {
    assert.equal(
      cliExitCode,
      0,
      `expected the scn-subissue gate CLI to PASS over a PR whose touched it sits ` +
        `beneath a cited describe with a template-literal title, but it exited ` +
        `${cliExitCode}. Output:\n${cliOutput}`
    );
    // Naming the shape of the wrong answer: the failure this arm exists to catch is
    // an uncited-unit-equivalent violation raised against a test that IS cited.
    assert.doesNotMatch(
      cliOutput,
      /uncited-unit-equivalent/,
      `the gate reported an uncited-unit-equivalent violation for a test whose ` +
        `enclosing describe cites ${CITED_CODE}:\n${cliOutput}`
    );
  }
);
