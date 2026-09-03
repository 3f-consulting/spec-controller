/**
 * Step definitions for the @SCN-SSM-015 arm of
 * features/scenario-sub-issue-match.feature — a renumber sharing a hunk with an unrelated
 * edit is still auto-detected.
 *
 * WHAT THE OLD READING TESTED. `detectRenumberPairs` accumulated per HUNK and emitted a
 * pair only when the hunk held exactly one removed tag-line code, one added tag-line code,
 * and NO OTHER CHANGED LINE. An edit to a neighbouring scenario's step, close enough that
 * git emits one hunk, trips that last condition and the pair is discarded — so the same
 * relabel paired or did not pair depending on a change made to a DIFFERENT scenario.
 *
 * WHY THAT MATTERS RATHER THAN MERELY BEING IMPRECISE. The decision passes a renumber
 * UNCONDITIONALLY, ahead of the ticket handle and ahead of every exemption trailer. A lost
 * pair therefore downgrades a legitimate renumber to an ordinary added-plus-deleted code
 * pair that must be carried some other way, and the author it refuses is the one who
 * renumbered correctly and relied on the auto-detection.
 *
 * Anti-watermelon (the @integration proof): this drives the REAL lint:scn-subissues CLI as
 * a SUBPROCESS over a throwaway git fixture. The @unit arm in
 * packages/spec-controller/static-checks/scenarioTextChanges.test.ts pins the reading;
 * this arm pins the CLI's CHOICE OF INPUT, which is where the fault lived.
 *
 * THE ONE HUNK IS ASSERTED BEFORE THE OUTCOME IS. A fixture that quietly split into two
 * hunks would pass under the OLD reading too and would prove nothing — the whole premise
 * of the row is that the relabel and the unrelated edit arrive together.
 *
 * THE IDENTITY IS LOAD-BEARING, not decorative. The fixture PR carries NO ticket handle
 * and exactly ONE exemption, keyed to the neighbour whose step genuinely changed. The
 * relabelled scenario's NEW code carries no exemption of its own, so the run can only
 * pass once the renumber is auto-detected; and the OLD code carries none either, so it
 * can only pass once the deleted set drops the renumber's removed side.
 *
 * @SCN-SSM-015 — bidirectional evidence marker. Grepping SCN-SSM-015 returns the scenario,
 * this step block, and the @unit test.
 *
 * Parent: 3F-3045; sibling SSM-012 (tests/steps/scenarioSubIssueMatchDeletedScenario.steps.ts)
 * supplies the git-fixture pattern.
 */

import { Given, When, Then } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// @SCN-SSM-015
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const tsxBin = path.join(repoRoot, "node_modules/.bin/tsx");
const cliPath = path.join(
  repoRoot,
  "packages/spec-controller/static-checks/lintScnSubIssuesCli.ts"
);

/** The neighbour whose LAST step the fixture PR edits — a real change, correctly reported. */
const NEIGHBOUR_CODE = "SCN-LAD-006";
/** The relabelled scenario's code on the BASE side. */
const RENUMBERED_FROM = "SCN-LAD-007";
/** The relabelled scenario's code on the HEAD side — the code the gate must not require a binding for. */
const RENUMBERED_TO = "SCN-LAD-008";

/** The fixture's Gherkin surface. Flat under features/, matching FEATURE_FILE_PATHSPEC. */
const FEATURE_FILE = "features/target.feature";

const NEIGHBOUR_STEP_BEFORE = "the ladder names every gate step";
const NEIGHBOUR_STEP_AFTER = "the ladder names every gate step it derives";

/**
 * The two scenarios, two lines apart. The neighbour's LAST step and the relabelled
 * scenario's TAG LINE are separated by a single blank, well inside unified diff's three
 * lines of context, so git has no choice but to emit the two changes as one hunk.
 */
function featureSource(neighbourLastStep: string, relabelledCode: string): string {
  return (
    [
      "@LAD",
      "Feature: the local ladder is derived from the workflow",
      "",
      `  @unit @integration @${NEIGHBOUR_CODE}`,
      "  Scenario: the ladder is derived from the workflow itself",
      "    Given a workflow naming its gate steps",
      "    When the ladder is derived",
      `    Then ${neighbourLastStep}`,
      "",
      `  @unit @integration @${relabelledCode}`,
      "  Scenario: an excluded step is not a gate",
      "    Given a workflow step the ladder excludes",
      "    When the ladder is derived",
      "    Then the excluded step is not a gate",
    ].join("\n") + "\n"
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

// @SCN-SSM-015
Given(
  "a PR that renumbers one scenario and edits a nearby scenario's step, both inside one hunk",
  function () {
    fixtureDir = fs.mkdtempSync(path.join(os.tmpdir(), "scn-ssm-015-"));
    execFileSync("git", ["init", "-q", "-b", "main"], { cwd: fixtureDir });
    git(["config", "user.email", "fixture@example.com"]);
    git(["config", "user.name", "Fixture"]);
    git(["config", "commit.gpgsign", "false"]);

    write(FEATURE_FILE, featureSource(NEIGHBOUR_STEP_BEFORE, RENUMBERED_FROM));
    git(["add", "."]);
    git(["commit", "-q", "-m", "base: the ladder corpus, two adjacent scenarios"]);
    baseSha = git(["rev-parse", "HEAD"]);

    // HEAD: the relabel AND the neighbour's step edit, in one commit. The commit subject
    // deliberately carries NO [3F-NNN] prefix — the auto-detection has to carry the
    // relabelled code, and an exemption is keyed by the code the gate names.
    write(FEATURE_FILE, featureSource(NEIGHBOUR_STEP_AFTER, RENUMBERED_TO));
    git(["add", "."]);
    git(["commit", "-q", "-m", "renumber the excluded-step scenario, and reword its neighbour"]);

    // Prove the fixture is the shape this row needs rather than trusting the source
    // builder: ONE hunk, carrying both changes. Two hunks would have paired under the OLD
    // hunk-local reading as well, so the row would go green against the fault it exists
    // to pin — the most expensive way for this test to be wrong.
    const diff = git(["diff", `${baseSha}...HEAD`, "--", FEATURE_FILE]);
    const lines = diff.split(/\r?\n/);
    assert.equal(
      lines.filter((l) => l.startsWith("@@")).length,
      1,
      `the shared-hunk fixture must produce exactly ONE hunk — the whole premise of this ` +
        `row is that the relabel and the unrelated edit arrive together. Diff:\n${diff}`
    );
    const body = (marker: string): string[] =>
      lines.filter((l) => l.startsWith(marker) && !l.startsWith(marker + marker)).map((l) => l.slice(1));
    assert.deepEqual(
      body("-"),
      [`    Then ${NEIGHBOUR_STEP_BEFORE}`, `  @unit @integration @${RENUMBERED_FROM}`],
      `the hunk must remove the neighbour's old step AND @${RENUMBERED_FROM}'s tag line. ` +
        `Diff:\n${diff}`
    );
    assert.deepEqual(
      body("+"),
      [`    Then ${NEIGHBOUR_STEP_AFTER}`, `  @unit @integration @${RENUMBERED_TO}`],
      `the hunk must add the neighbour's new step AND @${RENUMBERED_TO}'s tag line — the ` +
        `relabelled scenario's BODY is untouched, which is what makes this a renumber. ` +
        `Diff:\n${diff}`
    );
  }
);

// @SCN-SSM-015
When("the scenario sub-issue gate runs over the shared-hunk fixture PR", function () {
  try {
    cliOutput = execFileSync(tsxBin, [cliPath], {
      cwd: fixtureDir,
      encoding: "utf8",
      env: {
        ...process.env,
        GITHUB_BASE_SHA: baseSha,
        // NO ticket handle — so every code the gate names has to be matched by an
        // exemption, and the relabelled scenario's two codes have none.
        GITHUB_HEAD_REF: "contributor/renumber-the-excluded-step-scenario",
        // The author exempts the ONE scenario whose text they genuinely changed.
        PR_BODY: `SCN-exempt: ${NEIGHBOUR_CODE} (regression)`,
      },
    });
    cliExitCode = 0;
  } catch (err) {
    const e = err as { status?: number; stdout?: string; stderr?: string };
    cliExitCode = typeof e.status === "number" ? e.status : 1;
    cliOutput = `${e.stdout ?? ""}${e.stderr ?? ""}`;
  }
});

// @SCN-SSM-015
Then(
  "the gate auto-detects the renumber and does not require a binding for the new code",
  function () {
    // The relabelled scenario's OLD code is the renumber's removed side, so it is not a
    // deletion. Under the hunk reading the pair was lost and this read "1 deleted".
    assert.match(
      cliOutput,
      /\b0 deleted\b/,
      `expected NO deleted code: @${RENUMBERED_FROM} did not stop being asserted, it was ` +
        `relabelled to @${RENUMBERED_TO}. Output:\n${cliOutput}`
    );

    // The neighbour's edit is a real change and is still reported — a row that only
    // checked the renumber would go green for a reading that had stopped noticing the
    // edit sharing its hunk, which the old one also lost.
    assert.match(
      cliOutput,
      new RegExp(`checking: [^\\n]*\\b${NEIGHBOUR_CODE}\\b`),
      `expected the gate to name @${NEIGHBOUR_CODE}, whose last step the PR edited. ` +
        `Output:\n${cliOutput}`
    );

    // And exit 0 for the RIGHT reason: the PR carries no ticket handle, and the only
    // exemption it carries is keyed to the neighbour. @${RENUMBERED_TO} passes solely
    // because the renumber was auto-detected despite sharing its hunk with that edit.
    assert.equal(
      cliExitCode,
      0,
      `expected the scn-subissue gate CLI to PASS (exit 0): the PR carries no ticket handle ` +
        `and exempts only @${NEIGHBOUR_CODE}, so @${RENUMBERED_TO} can pass only as the added ` +
        `side of an auto-detected renumber. It exited ${cliExitCode}. Output:\n${cliOutput}`
    );
  }
);
