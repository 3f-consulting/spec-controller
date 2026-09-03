/**
 * Step definitions for the @SCN-SSM-011 arm of
 * features/scenario-sub-issue-match.feature — a step REMOVED from a scenario still
 * names that scenario.
 *
 * WHY THIS ROW EXISTS. It is the case the obvious cure for @SCN-SSM-010 silently
 * drops. That cure is positional: take the changed line numbers off the hunk header,
 * take the scenario extents off the checked-out file, attribute one to the other.
 * `changedLinesByFile` in scnSubIssueGate.ts already implements exactly that, and it
 * returns NOTHING for a pure line removal — a removed line holds no position in the
 * new file, so there is nothing left to attribute. A positional gate would therefore
 * report NO updated code for an edit that genuinely changes what a scenario asserts:
 * a mis-attribution traded for a silent miss, which is the same false green one door
 * along. Removing a step is an ordinary edit, not a corner.
 *
 * Anti-watermelon (the @integration proof): this drives the REAL lint:scn-subissues
 * CLI as a SUBPROCESS over a throwaway git fixture whose HEAD commit deletes the last
 * step of a scenario and adds no line in its place. The @unit arm in
 * packages/spec-controller/static-checks/scenarioTextChanges.test.ts pins the pure
 * reading; this arm pins the CLI's CHOICE OF INPUT, which is where the fault lived.
 *
 * THE IDENTITY IS LOAD-BEARING, not decorative. The fixture PR carries NO ticket
 * handle and a CORRECT `SCN-exempt: <the edited scenario> (regression)` directive.
 * Exemptions are keyed by code, so the run only passes once the gate names the
 * scenario the author actually edited — a gate that named nothing would leave the
 * author's correct exemption matched against an empty code set and the removal
 * unaccounted for.
 *
 * @SCN-SSM-011 — bidirectional evidence marker. Grepping SCN-SSM-011 returns the
 * scenario, this step block, and the @unit test.
 *
 * Parent: 3F-3044; sibling SSM-010 (tests/steps/scenarioSubIssueMatchLastStep.steps.ts)
 * stands up the mechanism this row guards, and supplies the git-fixture pattern.
 */

import { Given, When, Then } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// @SCN-SSM-011
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const tsxBin = path.join(repoRoot, "node_modules/.bin/tsx");
const cliPath = path.join(
  repoRoot,
  "packages/spec-controller/static-checks/lintScnSubIssuesCli.ts"
);

/** The scenario whose last step the fixture PR REMOVES — the code the gate must name. */
const EDITED_CODE = "SCN-LAD-004";
/** The scenario immediately below the removal — its text is untouched on both sides. */
const NEIGHBOUR_CODE = "SCN-LAD-005";

/** The fixture's Gherkin surface. Flat under features/, matching FEATURE_FILE_PATHSPEC. */
const FEATURE_FILE = "features/target.feature";

/** The last step of the edited scenario — present in the base, absent from the head. */
const REMOVED_STEP = "    And the ladder names it, with the reason it cannot run locally";

/**
 * The fixture corpus, with `lastStep` either the step line or nothing at all. Passing
 * nothing is what makes the HEAD commit a PURE REMOVAL: the line is deleted and no line
 * takes its place, so it exists at no position in the new file and a positional reading
 * has nothing to attribute. Get that wrong — leave a blank line, reword instead of
 * remove — and the fixture stops being this row and becomes the row above.
 */
function featureSource(lastStep: readonly string[]): string {
  return [
    "@LAD",
    "Feature: the local ladder is derived from the workflow",
    "",
    `  @unit @integration @${EDITED_CODE}`,
    "  Scenario: an excluded step is not a gate",
    "    Given a workflow step the ladder excludes",
    "    When the ladder is derived",
    "    Then the excluded step is not a gate",
    ...lastStep,
    "",
    `  @unit @integration @${NEIGHBOUR_CODE}`,
    "  Scenario: an exclusion naming a script CI does not run reds as stale",
    "    Given an exclusion naming a script the workflow no longer runs",
    "    When the ladder is derived",
    "    Then the ladder reds as stale",
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

// @SCN-SSM-011
Given(
  "a PR whose only Gherkin change REMOVES the last step of a scenario, adding no line in its place",
  function () {
    fixtureDir = fs.mkdtempSync(path.join(os.tmpdir(), "scn-ssm-011-"));
    execFileSync("git", ["init", "-q", "-b", "main"], { cwd: fixtureDir });
    git(["config", "user.email", "fixture@example.com"]);
    git(["config", "user.name", "Fixture"]);
    git(["config", "commit.gpgsign", "false"]);

    write(FEATURE_FILE, featureSource([REMOVED_STEP]));
    git(["add", "."]);
    git(["commit", "-q", "-m", "base: the ladder corpus, two adjacent scenarios"]);
    baseSha = git(["rev-parse", "HEAD"]);

    // HEAD: the ONLY change is the DELETION of that step. No tag line moves, so the
    // added/deleted/renumber detectors have nothing to report and the updated-code
    // reading is the only thing that can account for the change. The commit subject
    // deliberately carries NO [3F-NNN] prefix — the exemption directive must carry
    // this PR, and an exemption is keyed by the code the gate names.
    write(FEATURE_FILE, featureSource([]));
    git(["add", "."]);
    git(["commit", "-q", "-m", "drop the excluded step's second assertion"]);

    // The fixture is only this row if the diff is a PURE removal. Prove it here rather
    // than trusting the shape above: one deleted line, no added line.
    const diff = git(["diff", `${baseSha}...HEAD`, "--", FEATURE_FILE]);
    const body = diff.split(/\r?\n/).filter((l) => /^[+-]/.test(l) && !/^[+-][+-]/.test(l));
    assert.deepEqual(
      body.filter((l) => l.startsWith("+")),
      [],
      `the removed-step fixture must ADD no line — otherwise a positional reading would ` +
        `have something to attribute and this row would stop pinning anything. Diff:\n${diff}`
    );
    assert.equal(
      body.filter((l) => l.startsWith("-")).length,
      1,
      `the removed-step fixture must delete exactly ONE line. Diff:\n${diff}`
    );
  }
);

// @SCN-SSM-011
When("the scenario sub-issue gate runs over the removed-step fixture PR", function () {
  try {
    cliOutput = execFileSync(tsxBin, [cliPath], {
      cwd: fixtureDir,
      encoding: "utf8",
      env: {
        ...process.env,
        GITHUB_BASE_SHA: baseSha,
        // NO ticket handle — so the code the gate names has to be matched by the
        // author's own exemption, which is where a lost identity bites.
        GITHUB_HEAD_REF: "contributor/drop-the-second-assertion",
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

// @SCN-SSM-011
Then("the gate reports that scenario's code updated", function () {
  // Teeth: the removal must be ACCOUNTED FOR. A gate reading positions reports nothing
  // here — the deleted line exists at no position in the new file — and a check that
  // says nothing about a real behaviour change is the false green this row pins.
  assert.match(
    cliOutput,
    new RegExp(`checking: [^\\n]*\\b${EDITED_CODE}\\b`),
    `expected the gate to report @${EDITED_CODE} — the scenario whose last step the PR ` +
      `REMOVED — as the updated code. Reporting nothing is the silent miss a positional ` +
      `reading produces for a pure deletion. Output:\n${cliOutput}`
  );
  assert.match(
    cliOutput,
    /\b1 updated\b/,
    `expected exactly ONE updated code — one scenario lost a step. Output:\n${cliOutput}`
  );
  assert.doesNotMatch(
    cliOutput,
    new RegExp(`\\b${NEIGHBOUR_CODE}\\b`),
    `expected the gate NOT to name @${NEIGHBOUR_CODE}: its text is byte-identical on both ` +
      `sides. Output:\n${cliOutput}`
  );
  // And exit 0 for the RIGHT reason: the author's correct SCN-exempt directive is keyed
  // by code, so it can only be honoured once the gate names the code it belongs to.
  assert.equal(
    cliExitCode,
    0,
    `expected the scn-subissue gate CLI to PASS (exit 0): the PR carries no ticket handle ` +
      `but does carry a correct "SCN-exempt: ${EDITED_CODE} (regression)" directive for the ` +
      `scenario whose step it removed. It exited ${cliExitCode}. Output:\n${cliOutput}`
  );
});
