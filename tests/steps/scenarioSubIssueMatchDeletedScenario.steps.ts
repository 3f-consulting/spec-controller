/**
 * Step definitions for the @SCN-SSM-012 arm of
 * features/scenario-sub-issue-match.feature — DELETING a whole scenario names it
 * deleted and leaves its neighbours unnamed.
 *
 * WHY A DELETION IS THE WORST CASE FOR THE OLD READING, not the mildest. Removing a
 * scenario removes a RUN of lines, so the hunk git produces carries the preceding
 * scenario's trailing steps and the following scenario's tag line as CONTEXT. The old
 * updated-code detector held every @SCN code it saw on a context line and reported it
 * updated once anything else in the hunk changed, so a pull request that changed nothing
 * whatever in either neighbour accused them anyway.
 *
 * WHY THE ROW PINS TWO ANSWERS. The deletion must still be REPORTED. That answer never
 * came from context — `detectDeletedCodes` reads the identity off the REMOVED tag line
 * itself — and it was measured sound at the parent's Analysis before the reading changed.
 * A row that only checked the neighbours stayed quiet would go green for a gate that had
 * stopped noticing deletions at all, which is a worse check than the one being replaced.
 * So the deletion and the silence are asserted together, and neither is decoration.
 *
 * Anti-watermelon (the @integration proof): this drives the REAL lint:scn-subissues CLI
 * as a SUBPROCESS over a throwaway git fixture whose HEAD commit deletes a whole scenario
 * from between two untouched ones. The @unit arm in
 * tests/checks/scenarioTextChanges.test.ts pins the two
 * readings; this arm pins the CLI's CHOICE OF INPUT, which is where the fault lived.
 *
 * THE IDENTITY IS LOAD-BEARING, not decorative. The fixture PR carries NO ticket handle
 * and one CORRECT `SCN-exempt: <the deleted scenario> (regression)` directive. Exemptions
 * are keyed by code, so the run can only pass once the gate names the deleted scenario
 * and NOTHING ELSE: an accused neighbour has no exemption of its own and reds the gate.
 *
 * @SCN-SSM-012 — bidirectional evidence marker. Grepping SCN-SSM-012 returns the
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

// @SCN-SSM-012
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const tsxBin = path.join(repoRoot, "node_modules/.bin/tsx");
const cliPath = path.join(
  repoRoot,
  "tests/checks/lintScnSubIssuesCli.ts"
);

/** The scenario the fixture PR deletes outright — the code the gate must name deleted. */
const DELETED_CODE = "SCN-LAD-004";
/** The scenario ABOVE the deletion. Its trailing steps are the hunk's leading context. */
const PRECEDING_CODE = "SCN-LAD-003";
/** The scenario BELOW the deletion. Its tag line is the hunk's trailing context. */
const FOLLOWING_CODE = "SCN-LAD-005";

/** The fixture's Gherkin surface. Flat under features/, matching FEATURE_FILE_PATHSPEC. */
const FEATURE_FILE = "features/target.feature";

/** The untouched scenario above the deletion, with the blank line that separates it. */
const PRECEDING_SCENARIO = [
  `  @unit @integration @${PRECEDING_CODE}`,
  "  Scenario: the ladder is derived from the workflow itself",
  "    Given a workflow naming its gate steps",
  "    When the ladder is derived",
  "    Then the ladder names every gate step",
  "",
];

/**
 * The scenario the HEAD commit removes — tag line, keyword line, every step, and the
 * blank separator that went with it. A real deletion takes its separator; leaving the
 * blank behind would produce a head source no author would ever write.
 */
const DOOMED_SCENARIO = [
  `  @unit @integration @${DELETED_CODE}`,
  "  Scenario: an excluded step is not a gate",
  "    Given a workflow step the ladder excludes",
  "    When the ladder is derived",
  "    Then the excluded step is not a gate",
  "    And the ladder names it, with the reason it cannot run locally",
  "",
];

/** The untouched scenario below the deletion — byte-identical on both sides. */
const FOLLOWING_SCENARIO = [
  `  @unit @integration @${FOLLOWING_CODE}`,
  "  Scenario: an exclusion naming a script CI does not run reds as stale",
  "    Given an exclusion naming a script the workflow no longer runs",
  "    When the ladder is derived",
  "    Then the ladder reds as stale",
];

/**
 * The fixture corpus. `doomed` is the middle scenario on the base side and nothing at all
 * on the head side, which is what makes this row a DELETION rather than an edit: no tag
 * line is added, so the added and renumber detectors have nothing to say, and the only
 * two answers on the table are the deleted code and the updated set.
 */
function featureSource(doomed: readonly string[]): string {
  return (
    [
      "@LAD",
      "Feature: the local ladder is derived from the workflow",
      "",
      ...PRECEDING_SCENARIO,
      ...doomed,
      ...FOLLOWING_SCENARIO,
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

// @SCN-SSM-012
Given(
  "a PR whose only Gherkin change DELETES a whole scenario sitting between two untouched scenarios",
  function () {
    fixtureDir = fs.mkdtempSync(path.join(os.tmpdir(), "scn-ssm-012-"));
    execFileSync("git", ["init", "-q", "-b", "main"], { cwd: fixtureDir });
    git(["config", "user.email", "fixture@example.com"]);
    git(["config", "user.name", "Fixture"]);
    git(["config", "commit.gpgsign", "false"]);

    write(FEATURE_FILE, featureSource(DOOMED_SCENARIO));
    git(["add", "."]);
    git(["commit", "-q", "-m", "base: the ladder corpus, three consecutive scenarios"]);
    baseSha = git(["rev-parse", "HEAD"]);

    // HEAD: the ONLY change is the removal of the middle scenario. The commit subject
    // deliberately carries NO [3F-NNN] prefix — the exemption directive must carry this
    // PR, and an exemption is keyed by the code the gate names.
    write(FEATURE_FILE, featureSource([]));
    git(["add", "."]);
    git(["commit", "-q", "-m", "drop the excluded-step scenario"]);

    // Prove the fixture is the shape this row needs rather than trusting the arrays
    // above: exactly the doomed scenario's lines removed, nothing added, and the
    // FOLLOWING scenario's tag line present in the hunk as CONTEXT. That last line is
    // the whole mechanism of the fault — without it in the hunk there is nothing for a
    // context-reading detector to mis-attribute and the row pins nothing.
    const diff = git(["diff", `${baseSha}...HEAD`, "--", FEATURE_FILE]);
    const lines = diff.split(/\r?\n/);
    const body = (marker: string): string[] =>
      lines.filter((l) => l.startsWith(marker) && !l.startsWith(marker + marker));
    assert.deepEqual(
      body("+"),
      [],
      `the deleted-scenario fixture must ADD no line — a tag line added would make this a ` +
        `renumber, which is 3F-3045's territory, not this row's. Diff:\n${diff}`
    );
    assert.deepEqual(
      body("-").map((l) => l.slice(1)),
      DOOMED_SCENARIO,
      `the deleted-scenario fixture must remove EXACTLY the doomed scenario's lines. ` +
        `Diff:\n${diff}`
    );
    assert.ok(
      lines.some((l) => l.startsWith(" ") && l.includes(FOLLOWING_CODE)),
      `the hunk must carry @${FOLLOWING_CODE}'s tag line as CONTEXT — that is what a ` +
        `hunk-reading detector mis-attributes, and without it this row proves nothing. ` +
        `Diff:\n${diff}`
    );
  }
);

// @SCN-SSM-012
When("the scenario sub-issue gate runs over the deleted-scenario fixture PR", function () {
  try {
    cliOutput = execFileSync(tsxBin, [cliPath], {
      cwd: fixtureDir,
      encoding: "utf8",
      env: {
        ...process.env,
        GITHUB_BASE_SHA: baseSha,
        // NO ticket handle — so every code the gate names has to be matched by an
        // exemption, and an accused neighbour has none.
        GITHUB_HEAD_REF: "contributor/drop-the-excluded-step-scenario",
        // The author correctly exempts the one scenario they actually deleted.
        PR_BODY: `SCN-exempt: ${DELETED_CODE} (regression)`,
      },
    });
    cliExitCode = 0;
  } catch (err) {
    const e = err as { status?: number; stdout?: string; stderr?: string };
    cliExitCode = typeof e.status === "number" ? e.status : 1;
    cliOutput = `${e.stdout ?? ""}${e.stderr ?? ""}`;
  }
});

// @SCN-SSM-012
Then(
  "the gate reports the deleted scenario's code deleted, and reports neither neighbour updated",
  function () {
    // The POSITIVE half. A gate that had stopped reporting deletions would leave this
    // change unaccounted for entirely, and every assertion about the neighbours' silence
    // would still pass — which is why this one is asserted first and separately.
    assert.match(
      cliOutput,
      /\b1 deleted\b/,
      `expected exactly ONE deleted code — one scenario was removed outright. ` +
        `Output:\n${cliOutput}`
    );
    assert.match(
      cliOutput,
      new RegExp(`checking: [^\\n]*\\b${DELETED_CODE}\\b`),
      `expected the gate to name @${DELETED_CODE}, the scenario the PR deleted. ` +
        `Output:\n${cliOutput}`
    );

    // The NEGATIVE half. Both neighbours are byte-identical on the two sides; the only
    // reason either could be named is that its tag line fell inside the deletion's hunk.
    assert.match(
      cliOutput,
      /\b0 updated\b/,
      `expected NO updated codes: nothing but the deleted scenario changed. ` +
        `Output:\n${cliOutput}`
    );
    for (const neighbour of [PRECEDING_CODE, FOLLOWING_CODE]) {
      assert.doesNotMatch(
        cliOutput,
        new RegExp(`\\b${neighbour}\\b`),
        `expected the gate NOT to name @${neighbour}: its text is byte-identical on both ` +
          `sides of the deletion, and the only thing that put it near the change is the ` +
          `hunk git happened to produce. Output:\n${cliOutput}`
      );
    }

    // And exit 0 for the RIGHT reason: the PR carries no ticket handle, so it passes only
    // because the author's SCN-exempt directive is keyed to the code the gate named. An
    // accused neighbour carries no exemption of its own and would red the run here.
    assert.equal(
      cliExitCode,
      0,
      `expected the scn-subissue gate CLI to PASS (exit 0): the PR carries no ticket handle ` +
        `but does carry a correct "SCN-exempt: ${DELETED_CODE} (regression)" directive for the ` +
        `scenario it deleted. It exited ${cliExitCode}. Output:\n${cliOutput}`
    );
  }
);
