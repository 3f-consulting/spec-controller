/**
 * Step definitions for the @SCN-SSM-002 reject arm of
 * features/scenario-sub-issue-match.feature — the dogfooding TEETH: a
 * behaviour-bearing @SCN change on an INTERNAL PR (a branch in the repo, non-fork)
 * that carries NO 3F ticket handle must RED the gate.
 *
 * Anti-watermelon (the @integration proof): this drives the REAL
 * lint:scn-subissues CLI as a SUBPROCESS over a throwaway git fixture — a base
 * commit without the code, then a HEAD commit that ADDS a behaviour-bearing @SCN
 * tag line, on a NON-ticketed branch with no [3F-NNN] commit prefix — and asserts
 * the CLI EXITS NON-ZERO and its output NAMES the unbound code. This exercises the
 * live wiring end-to-end (git diff parse → handle read → decideScnGate → exit
 * code), NOT a re-run of decideScnGate in-process (that is the @unit arm, in
 * packages/spec-controller/static-checks/scnSubIssueGate.test.ts).
 *
 * @SCN-SSM-002 — bidirectional evidence marker. Grepping SCN-SSM-002 returns the
 * scenario, this step block, and the @unit test in
 * packages/spec-controller/static-checks/scnSubIssueGate.test.ts.
 *
 * Parent: 3F-1137 (the port + fork-exemption design); sibling SSM-001 (3F-1489)
 * landed the ported gate whose reject path this pins.
 */

import { Given, When, Then } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// @SCN-SSM-002
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const tsxBin = path.join(repoRoot, "node_modules/.bin/tsx");
const cliPath = path.join(
  repoRoot,
  "packages/spec-controller/static-checks/lintScnSubIssuesCli.ts"
);

/** The bare @SCN code the fixture PR adds without binding it to a ticket. */
const UNBOUND_CODE = "SCN-LDG-002";

let fixtureDir: string;
let baseSha: string;
let cliExitCode: number;
let cliOutput: string;

function git(args: string[]): string {
  return execFileSync("git", args, { cwd: fixtureDir, encoding: "utf8" }).trim();
}

// @SCN-SSM-002
Given(
  "a PR that adds a behaviour-bearing @SCN code, from a branch in the repo, carrying no 3F ticket handle",
  function () {
    fixtureDir = fs.mkdtempSync(path.join(os.tmpdir(), "scn-ssm-002-"));
    execFileSync("git", ["init", "-q", "-b", "main"], { cwd: fixtureDir });
    git(["config", "user.email", "fixture@example.com"]);
    git(["config", "user.name", "Fixture"]);
    git(["config", "commit.gpgsign", "false"]);

    const featuresDir = path.join(fixtureDir, "features");
    fs.mkdirSync(featuresDir);
    const featureFile = path.join(featuresDir, "target.feature");

    // Base commit: the feature surface WITHOUT the behaviour-bearing code.
    fs.writeFileSync(
      featureFile,
      "@SSM\nFeature: fixture surface\n\n  Scenario: a pre-existing scenario\n    Given nothing\n"
    );
    git(["add", "features/target.feature"]);
    git(["commit", "-q", "-m", "base: fixture feature surface"]);
    baseSha = git(["rev-parse", "HEAD"]);

    // HEAD commit: ADD a behaviour-bearing @SCN tag line — the commit subject
    // carries NO [3F-NNN] prefix, and the PR's branch (below) carries no handle.
    fs.writeFileSync(
      featureFile,
      "@SSM\nFeature: fixture surface\n\n" +
        "  Scenario: a pre-existing scenario\n    Given nothing\n\n" +
        `  @unit @${UNBOUND_CODE}\n  Scenario: a newly added behaviour\n    Given something new\n`
    );
    git(["add", "features/target.feature"]);
    git(["commit", "-q", "-m", "add a new behaviour-bearing scenario"]);
  }
);

// @SCN-SSM-002
When("the scenario sub-issue gate runs over the fixture PR", function () {
  try {
    cliOutput = execFileSync(tsxBin, [cliPath], {
      cwd: fixtureDir,
      encoding: "utf8",
      env: {
        ...process.env,
        // Diff HEAD against the fixture's base commit (the PR base).
        GITHUB_BASE_SHA: baseSha,
        // An INTERNAL PR (a branch in the repo) whose name carries NO 3F handle.
        GITHUB_HEAD_REF: "feature/no-handle",
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

// @SCN-SSM-002
Then("the gate reds with a violation naming the unbound code", function () {
  assert.notEqual(
    cliExitCode,
    0,
    `expected the scn-subissue gate CLI to RED (non-zero exit) over a no-handle ` +
      `internal-PR fixture, but it exited ${cliExitCode}. Output:\n${cliOutput}`
  );
  assert.match(
    cliOutput,
    new RegExp(UNBOUND_CODE),
    `expected the gate's violation to NAME the unbound code ${UNBOUND_CODE}, but it ` +
      `was absent from the output:\n${cliOutput}`
  );
  assert.match(
    cliOutput,
    /missing-ticket-handle/,
    `expected a missing-ticket-handle violation kind, absent from:\n${cliOutput}`
  );
});
