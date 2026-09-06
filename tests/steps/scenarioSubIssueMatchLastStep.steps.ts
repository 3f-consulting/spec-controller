/**
 * Step definitions for the @SCN-SSM-010 arm of
 * features/scenario-sub-issue-match.feature — an updated scenario code is the code
 * of a scenario whose TEXT changed, not the code of whichever tag line happened to
 * fall inside the hunk.
 *
 * Anti-watermelon (the @integration proof): this drives the REAL lint:scn-subissues
 * CLI as a SUBPROCESS over a throwaway git fixture shaped like the change that
 * surfaced the fault (PR #239, 3F-3041) — a base commit with two adjacent scenarios,
 * then a HEAD commit that edits the LAST STEP of the first one. Unified diff carries
 * three lines of context, so the edited scenario's own tag line sits FIVE lines above
 * the change (outside the window) while the FOLLOWING scenario's tag line sits TWO
 * lines below it (inside). A hunk-local detector therefore reports the neighbour.
 *
 * THE IDENTITY IS LOAD-BEARING HERE, not decorative. The fixture PR carries NO ticket
 * handle and a CORRECT `SCN-exempt: <the edited scenario> (regression)` directive, so
 * the mis-attribution is not merely a wrong word in a message: the exemption is keyed
 * by code, so an author who correctly exempts the scenario they touched is REJECTED
 * while an exemption naming a scenario they never touched would be accepted. Reading
 * the right code flips the run from a violation to a pass.
 *
 * This arm is the TEETH: the fault was the CLI's CHOICE OF INPUT (it handed a corpus
 * question to a diff), exactly as in 3F-1741, so only a test driving the live wiring
 * end-to-end (git diff → base/head source read → decideScnGate → exit code) can catch
 * it. The @unit arm in tests/checks/scenarioTextChanges.test.ts
 * proves the pure reading in isolation and would have stayed green straight through it.
 *
 * @SCN-SSM-010 — bidirectional evidence marker. Grepping SCN-SSM-010 returns the
 * scenario, this step block, and the @unit test.
 *
 * Parent: 3F-3044; sibling SSM-004 (tests/steps/scenarioSubIssueMatchCite.steps.ts)
 * supplies the git-fixture pattern this follows, for the same reason.
 */

import { Given, When, Then } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// @SCN-SSM-010
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const tsxBin = path.join(repoRoot, "node_modules/.bin/tsx");
const cliPath = path.join(
  repoRoot,
  "tests/checks/lintScnSubIssuesCli.ts"
);

/** The scenario whose LAST STEP the fixture PR edits — the code the gate must name. */
const EDITED_CODE = "SCN-LAD-004";
/** The scenario immediately BELOW the change — the neighbour the gate must NOT name. */
const NEIGHBOUR_CODE = "SCN-LAD-005";

/** The fixture's Gherkin surface. Flat under features/, matching FEATURE_FILE_PATHSPEC. */
const FEATURE_FILE = "features/target.feature";

/**
 * The fixture corpus. The edited scenario's tag line is line 4 and its last step is
 * line 9 — FIVE lines apart, so three lines of context cannot reach it; the
 * neighbour's tag line is line 11, TWO lines below the change and squarely inside the
 * window. Get that spacing wrong and the fixture stops reproducing the fault, which
 * would make the red theatre.
 */
function featureSource(lastStep: string): string {
  return [
    "@LAD", // 1
    "Feature: the local ladder is derived from the workflow", // 2
    "", // 3
    `  @unit @integration @${EDITED_CODE}`, // 4
    "  Scenario: an excluded step is not a gate", // 5
    "    Given a workflow step the ladder excludes", // 6
    "    When the ladder is derived", // 7
    "    Then the excluded step is not a gate", // 8
    `    And ${lastStep}`, // 9
    "", // 10
    `  @unit @integration @${NEIGHBOUR_CODE}`, // 11
    "  Scenario: an exclusion naming a script CI does not run reds as stale", // 12
    "    Given an exclusion naming a script the workflow no longer runs", // 13
    "    When the ladder is derived", // 14
    "    Then the ladder reds as stale", // 15
    "",
  ].join("\n");
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

// @SCN-SSM-010
Given(
  "a PR whose only Gherkin change edits the LAST step of a scenario that is immediately followed by another scenario's tag line",
  function () {
    fixtureDir = fs.mkdtempSync(path.join(os.tmpdir(), "scn-ssm-010-"));
    execFileSync("git", ["init", "-q", "-b", "main"], { cwd: fixtureDir });
    git(["config", "user.email", "fixture@example.com"]);
    git(["config", "user.name", "Fixture"]);
    git(["config", "commit.gpgsign", "false"]);

    write(FEATURE_FILE, featureSource("the ladder names it, with the reason it cannot run locally"));
    git(["add", "."]);
    git(["commit", "-q", "-m", "base: the ladder corpus, two adjacent scenarios"]);
    baseSha = git(["rev-parse", "HEAD"]);

    // HEAD: the ONLY change is the LAST STEP of the first scenario. Its own tag line
    // is unchanged and out of context range; the neighbour's tag line is unchanged and
    // inside it. Nothing else in the corpus moves. The commit subject deliberately
    // carries NO [3F-NNN] prefix — the exemption directive is what must carry this PR.
    write(FEATURE_FILE, featureSource("the ladder names it, with the reason it is left out"));
    git(["add", "."]);
    git(["commit", "-q", "-m", "reword the excluded step's reason"]);
  }
);

// @SCN-SSM-010
When("the scenario sub-issue gate runs over the last-step fixture PR", function () {
  try {
    cliOutput = execFileSync(tsxBin, [cliPath], {
      cwd: fixtureDir,
      encoding: "utf8",
      env: {
        ...process.env,
        GITHUB_BASE_SHA: baseSha,
        // NO ticket handle — so the code the gate names has to be matched by the
        // author's own exemption, which is where a mis-attributed identity bites.
        GITHUB_HEAD_REF: "contributor/reword-the-excluded-step",
        // The author correctly exempts the scenario they actually edited.
        PR_BODY: `SCN-exempt: ${EDITED_CODE} (regression)`,
      },
    });
    cliExitCode = 0;
  } catch (err) {
    const e = err as { status?: number; stdout?: string; stderr?: string };
    cliExitCode = typeof e.status === "number" ? e.status : 1;
    cliOutput = `${e.stdout ?? ""}${e.stderr ?? ""}`;
  }
});

// @SCN-SSM-010
Then(
  "the gate reports the edited scenario's code updated, and does not name the following scenario",
  function () {
    // Teeth first: the code must be the EDITED scenario's. A gate naming the neighbour
    // has answered a question about the diff and reported it as an answer about the
    // corpus — the whole fault this scenario pins.
    assert.match(
      cliOutput,
      new RegExp(`checking: [^\\n]*\\b${EDITED_CODE}\\b`),
      `expected the gate to report @${EDITED_CODE} — the scenario whose LAST STEP the PR ` +
        `edits — as the updated code, read by comparing the base and head sources. Output:\n${cliOutput}`
    );
    assert.doesNotMatch(
      cliOutput,
      new RegExp(`\\b${NEIGHBOUR_CODE}\\b`),
      `expected the gate NOT to name @${NEIGHBOUR_CODE} anywhere: its text is byte-identical ` +
        `on both sides, and it is named today only because its tag line fell inside the ` +
        `hunk's three-line context window. Output:\n${cliOutput}`
    );
    assert.match(
      cliOutput,
      /\b1 updated\b/,
      `expected exactly ONE updated code — one scenario's text changed. Output:\n${cliOutput}`
    );
    // And exit 0 for the RIGHT reason: the author's correct SCN-exempt directive is
    // keyed by code, so it can only be honoured once the gate reads the right one.
    assert.equal(
      cliExitCode,
      0,
      `expected the scn-subissue gate CLI to PASS (exit 0): the PR carries no ticket handle ` +
        `but does carry a correct "SCN-exempt: ${EDITED_CODE} (regression)" directive for the ` +
        `scenario it actually edited. It exited ${cliExitCode}. Output:\n${cliOutput}`
    );
  }
);
