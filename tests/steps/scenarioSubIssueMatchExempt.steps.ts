/**
 * Step definitions for the @SCN-SSM-003 exempt arm of
 * features/scenario-sub-issue-match.feature — the community-contribution
 * CARVE-OUT: a fork-sourced (external) PR — head repo != base repo — is EXEMPT.
 * Even a behaviour-bearing @SCN change carrying NO 3F ticket handle is skipped
 * silently and exits 0.
 *
 * Anti-watermelon (the @integration proof): this drives the REAL
 * lint:scn-subissues CLI as a SUBPROCESS over a throwaway git fixture — a base
 * commit without the code, then a HEAD commit that ADDS a behaviour-bearing @SCN
 * tag line, on a NON-ticketed branch with no [3F-NNN] commit prefix — but with a
 * GITHUB_EVENT_PATH pointing at a fork-PR event payload (head.repo.full_name !=
 * base.repo.full_name). It asserts the CLI EXITS 0 (exempt), proving the live
 * fork read (GITHUB_EVENT_PATH → JSON → head!=base) end-to-end, NOT a re-run of
 * decideScnGate in-process (that is the @unit arm, in
 * packages/spec-controller/static-guards/scnSubIssueGate.test.ts and
 * packages/spec-controller/static-guards/lintScnSubIssuesCli.test.ts).
 *
 * The COUNTERPOINT — the same no-handle diff with NO fork payload STILL reds —
 * is pinned by SSM-002; fork status is the only exemption signal.
 *
 * @SCN-SSM-003 — bidirectional evidence marker. Grepping SCN-SSM-003 returns the
 * scenario, this step block, and the @unit tests.
 *
 * Parent: 3F-1137 (the port + fork-exemption design); siblings SSM-001 (3F-1489)
 * landed the ported gate, SSM-002 (3F-1491) the reject teeth this exempts.
 */

import { Given, When, Then } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// @SCN-SSM-003
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const tsxBin = path.join(repoRoot, "node_modules/.bin/tsx");
const cliPath = path.join(
  repoRoot,
  "packages/spec-controller/static-guards/lintScnSubIssuesCli.ts"
);

/** The bare @SCN code the fork PR adds without binding it to a ticket. */
const UNBOUND_CODE = "SCN-LDG-003";

let fixtureDir: string;
let baseSha: string;
let eventPath: string;
let cliExitCode: number;
let cliOutput: string;

function git(args: string[]): string {
  return execFileSync("git", args, { cwd: fixtureDir, encoding: "utf8" }).trim();
}

// @SCN-SSM-003
Given(
  "a fork-PR fixture whose head repo differs from the base repo, adding a behaviour-bearing @SCN code with no 3F ticket handle",
  function () {
    fixtureDir = fs.mkdtempSync(path.join(os.tmpdir(), "scn-ssm-003-"));
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

    // HEAD commit: ADD a behaviour-bearing @SCN tag line — NO [3F-NNN] prefix,
    // and the PR's branch (below) carries no handle. On an INTERNAL PR this reds
    // (SSM-002); here the fork payload exempts it.
    fs.writeFileSync(
      featureFile,
      "@SSM\nFeature: fixture surface\n\n" +
        "  Scenario: a pre-existing scenario\n    Given nothing\n\n" +
        `  @unit @${UNBOUND_CODE}\n  Scenario: a newly added behaviour\n    Given something new\n`
    );
    git(["add", "features/target.feature"]);
    git(["commit", "-q", "-m", "add a new behaviour-bearing scenario"]);

    // The GitHub PR event payload marking this a FORK PR: head.repo != base.repo.
    eventPath = path.join(fixtureDir, "event.json");
    fs.writeFileSync(
      eventPath,
      JSON.stringify({
        pull_request: {
          head: { repo: { full_name: "outside-contributor/spec-controller" } },
          base: { repo: { full_name: "3f-consulting/spec-controller" } },
        },
      })
    );
  }
);

// @SCN-SSM-003
When("the scenario sub-issue gate runs over the fork-PR fixture", function () {
  try {
    cliOutput = execFileSync(tsxBin, [cliPath], {
      cwd: fixtureDir,
      encoding: "utf8",
      env: {
        ...process.env,
        // Diff HEAD against the fixture's base commit (the PR base).
        GITHUB_BASE_SHA: baseSha,
        // A branch whose name carries NO 3F handle — on an internal PR this would
        // red; the fork event payload is what makes it exempt.
        GITHUB_HEAD_REF: "feature/community-contrib",
        // The fork signal the live CLI reads: head.repo != base.repo.
        GITHUB_EVENT_PATH: eventPath,
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

// @SCN-SSM-003
Then("the gate is exempt and exits 0 with no violation", function () {
  assert.equal(
    cliExitCode,
    0,
    `expected the scn-subissue gate CLI to be EXEMPT (exit 0) over a fork-PR ` +
      `fixture (head repo != base repo) even with a no-handle behaviour-bearing ` +
      `diff, but it exited ${cliExitCode}. Output:\n${cliOutput}`
  );
  assert.doesNotMatch(
    cliOutput,
    /FAILED|missing-ticket-handle/,
    `expected NO violation on an exempt fork PR, but the output reported one:\n${cliOutput}`
  );
});
