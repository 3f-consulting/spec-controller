/**
 * Step definitions for the @SCN-SSM-014 arm of
 * features/scenario-sub-issue-match.feature — a scenario moved verbatim is not a change, so
 * no code is reported updated.
 *
 * WHICH OF THE TWO READINGS THIS ARM PINS. A verbatim move is NOT A CHANGE to the scenario
 * that moved, so there is nothing to report — as against: it IS a change with nothing owed,
 * so it is reported and then excused. The gate does the first, and does it with nothing
 * special-cased: a code on both sides whose text is identical never enters the updated set,
 * and no exemption is granted anywhere, so there is none to withdraw. Naming which stops the
 * next reader re-deriving the question, and if the answer ever becomes the second, this row
 * is where that argument has to be won.
 *
 * IT ARRIVED AS A CONSEQUENCE, WHICH IS WHY IT IS PINNED. 3F-3044 put the updated arm to the
 * two sources, and the silence fell out of it; the retired hunk reading reported the move's
 * NEIGHBOURS updated instead. Nothing chose the behaviour and no scenario held it, and an
 * intended consequence with no scenario is indistinguishable from an accident.
 *
 * Anti-watermelon (the @integration proof): this drives the REAL lint:scn-subissues CLI as a
 * SUBPROCESS over a throwaway git fixture, so the move is one git actually performed rather
 * than one a fixture describes. The @unit arm in
 * tests/checks/scenarioTextChanges.movedVerbatim.test.ts pins the
 * reading; this arm pins what the CLI does with it.
 *
 * THE BYTE-IDENTITY PREMISE IS ASSERTED BEFORE THE OUTCOME IS, off real git output AND off
 * the two sources. Change one byte of the moved scenario and the gate reports it updated —
 * correctly — so a fixture that had drifted would go green here while proving the opposite
 * of what the row claims.
 *
 * WHAT THIS ARM DOES NOT PROVE, asserted so it cannot be read as proving it. Git represents
 * a verbatim move as a removal plus a re-addition, so the moved code is still reported ADDED
 * and the author who only reordered a file is still made to carry a binding. The updated
 * arm's silence does not spare them. That is a third fault of the same family, filed as
 * 3F-3056 and out of this slice's scope; the obligation is asserted here, by the verb in the
 * violation, so the row states where the cost actually falls instead of implying it is gone.
 *
 * @SCN-SSM-014 — bidirectional evidence marker. Grepping SCN-SSM-014 returns the scenario,
 * this step block, and the @unit test.
 *
 * Parent: 3F-3045; sibling SSM-017 (tests/steps/scenarioSubIssueMatchRelabelledAndEdited.steps.ts)
 * supplies the git-fixture pattern this arm follows.
 */

import { Given, When, Then } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// @SCN-SSM-014
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const tsxBin = path.join(repoRoot, "node_modules/.bin/tsx");
const cliPath = path.join(
  repoRoot,
  "tests/checks/lintScnSubIssuesCli.ts"
);

/** The first scenario, never moved — nothing here is about it. */
const ANCHOR_CODE = "SCN-LAD-001";
/** The scenario git renders as removed-and-re-added when the pair below is reordered. */
const MOVED_CODE = "SCN-LAD-002";
/** Its neighbour, which the move puts above it. */
const NEIGHBOUR_CODE = "SCN-LAD-003";

/** The fixture's Gherkin surface. Flat under features/, matching FEATURE_FILE_PATHSPEC. */
const FEATURE_FILE = "features/target.feature";

const ANCHOR = [
  `  @unit @integration @${ANCHOR_CODE}`,
  "  Scenario: the ladder is derived from the workflow itself",
  "    Given a workflow naming its gate steps",
  "    When the ladder is derived",
  "    Then the ladder names every gate step",
].join("\n");

const MOVED = [
  `  @unit @integration @${MOVED_CODE}`,
  "  Scenario: an excluded step is not a gate",
  "    Given a workflow step the ladder excludes",
  "    When the ladder is derived",
  "    Then the excluded step is not a gate",
].join("\n");

const NEIGHBOUR = [
  `  @unit @integration @${NEIGHBOUR_CODE}`,
  "  Scenario: a gate step names the check it runs",
  "    Given a workflow gate step",
  "    When the ladder is derived",
  "    Then the ladder names the check that step runs",
].join("\n");

function featureSource(scenarios: readonly string[]): string {
  return (
    ["@LAD", "Feature: the local ladder is derived from the workflow", ""]
      .concat(scenarios.flatMap((scenario) => [scenario, ""]))
      .join("\n")
      .trimEnd() + "\n"
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

/** A diff's added or removed BODY lines, the `---`/`+++` headers excluded. */
function diffBody(diff: string, marker: "+" | "-"): string[] {
  return diff
    .split(/\r?\n/)
    .filter((line) => line.startsWith(marker) && !line.startsWith(`${marker}${marker}`))
    .map((line) => line.slice(1));
}

// @SCN-SSM-014
Given(
  "a PR whose only Gherkin change MOVES a scenario, its body byte-identical, above its neighbour",
  function () {
    fixtureDir = fs.mkdtempSync(path.join(os.tmpdir(), "scn-ssm-014-"));
    execFileSync("git", ["init", "-q", "-b", "main"], { cwd: fixtureDir });
    git(["config", "user.email", "fixture@example.com"]);
    git(["config", "user.name", "Fixture"]);
    git(["config", "commit.gpgsign", "false"]);

    const baseSource = featureSource([ANCHOR, MOVED, NEIGHBOUR]);
    write(FEATURE_FILE, baseSource);
    git(["add", "."]);
    git(["commit", "-q", "-m", "base: the ladder corpus, three scenarios in order"]);
    baseSha = git(["rev-parse", "HEAD"]);

    // HEAD: the third scenario moved above the second and NOTHING else. The commit subject
    // deliberately carries no [3F-NNN] prefix, so nothing but the code sets themselves
    // decides what this PR is made to carry.
    const headSource = featureSource([ANCHOR, NEIGHBOUR, MOVED]);
    write(FEATURE_FILE, headSource);
    git(["add", "."]);
    git(["commit", "-q", "-m", "reorder the ladder feature: the gate-step scenario first"]);

    // THE PREMISE, PROVED BEFORE ANY OUTCOME IS ASSERTED, and proved of what git actually
    // emitted rather than of the source builder above. A fixture that changed one byte of
    // the moved scenario would report it updated — correctly — so the row would go green
    // here while proving the opposite of what it claims.
    const diff = git(["diff", `${baseSha}...HEAD`, "--", FEATURE_FILE]);
    const movedLines = MOVED.split("\n");
    const nonBlank = (lines: readonly string[]): string[] => lines.filter((l) => l !== "");
    assert.deepEqual(
      nonBlank(diffBody(diff, "-")),
      movedLines,
      `every line the diff REMOVES must be a line of @${MOVED_CODE}'s block, unchanged — ` +
        `the move is the whole premise of this row. Diff:\n${diff}`
    );
    assert.deepEqual(
      nonBlank(diffBody(diff, "+")),
      movedLines,
      `and every line it ADDS must be the SAME lines, byte for byte: git renders a verbatim ` +
        `move as a removal plus a re-addition, and identical content on both sides is what ` +
        `makes this a move rather than an edit. Diff:\n${diff}`
    );
    // Said of the two SOURCES as well as of the diff, because "the diff removed and added
    // the same lines" is also true of a scenario deleted and retyped elsewhere with its
    // neighbour rewritten around it. The neighbour is byte-identical and only the ORDER of
    // the two blocks differs.
    const blocks = (source: string): string[] => source.trimEnd().split("\n\n").slice(1);
    assert.deepEqual(
      blocks(baseSource),
      [ANCHOR, MOVED, NEIGHBOUR],
      "the base must hold the three scenarios in their original order"
    );
    assert.deepEqual(
      blocks(headSource),
      [ANCHOR, NEIGHBOUR, MOVED],
      "and the head must hold the SAME three blocks, byte for byte, with only the last two " +
        "transposed — nothing in this fixture is an edit"
    );
  }
);

// @SCN-SSM-014
When("the scenario sub-issue gate runs over the moved-scenario fixture PR", function () {
  try {
    cliOutput = execFileSync(tsxBin, [cliPath], {
      cwd: fixtureDir,
      encoding: "utf8",
      env: {
        ...process.env,
        GITHUB_BASE_SHA: baseSha,
        // NO ticket handle and NO exemption. Every other way a code could be carried is
        // stripped away, so what the gate says here is what the code sets alone produce.
        GITHUB_HEAD_REF: "contributor/reorder-the-ladder-feature",
        PR_BODY: "Putting the ladder feature's scenarios into the order they run in.",
      },
    });
    cliExitCode = 0;
  } catch (err) {
    const e = err as { status?: number; stdout?: string; stderr?: string };
    cliExitCode = typeof e.status === "number" ? e.status : 1;
    cliOutput = `${e.stdout ?? ""}${e.stderr ?? ""}`;
  }
});

// @SCN-SSM-014
Then("the gate reports no scenario code updated", function () {
  // THE ROW'S OWN OUTCOME. Not "reported and excused" — reported at all is what does not
  // happen, and the count is where the gate says so.
  assert.match(
    cliOutput,
    /\b0 updated\b/,
    `expected NO updated code: @${MOVED_CODE} sits on both sides with its body byte-` +
      `identical, so a move is not a change to the scenario that moved. Output:\n${cliOutput}`
  );

  // And no obligation arrives by that door — asserted separately from the count, because a
  // reading that reported the move updated AND a reading that did not would both leave the
  // refusal below in place, told apart only by the verb the violation names.
  assert.doesNotMatch(
    cliOutput,
    /Updated scenario code/,
    `expected no violation naming an UPDATED code: nothing about a verbatim move is a ` +
      `behaviour change, so nothing is owed on that arm. Output:\n${cliOutput}`
  );

  // Nor is the move reported as a change lying outside every scenario (@SCN-SSM-013's
  // report) — the other way an empty updated set could arrive while meaning something else.
  assert.doesNotMatch(
    cliOutput,
    /changed OUTSIDE every scenario/,
    `expected no outside-every-scenario report: the move leaves the residue identical, and ` +
      `a reading that counted the shifted blank separator would say this on every reorder. ` +
      `Output:\n${cliOutput}`
  );

  // THE BOUNDARY OF THE CLAIM, ASSERTED SO THE ROW CANNOT BE MISREAD. Git's removal-plus-
  // re-addition is a tag line the diff ADDED, so the moved code is still reported added and
  // the author who only reordered the file is still made to carry a binding for it. That is
  // 3F-3056's fault, on a different arm with a different detector, and explicitly not this
  // slice's to change. Without these two assertions the row above would also go green for a
  // gate that had stopped reading the file altogether, and would read as a promise about the
  // reordering author that the gate does not keep.
  assert.match(
    cliOutput,
    new RegExp(`\\b1 added\\b[^\\n]*checking: ${MOVED_CODE}\\b`),
    `expected the moved code to be reported ADDED and checked — the silence proved above is ` +
      `the UPDATED arm's alone. Output:\n${cliOutput}`
  );
  assert.match(
    cliOutput,
    new RegExp(`\\[missing-ticket-handle\\] Added scenario code @${MOVED_CODE}\\b`),
    `expected the binding to be required of the ADDED code: this is where a reorder still ` +
      `costs its author, and naming it here is what keeps this row from being read as ` +
      `proving they are spared (3F-3056). Output:\n${cliOutput}`
  );
  assert.notEqual(
    cliExitCode,
    0,
    `expected the gate to RED, from the added arm and nothing else. It exited ` +
      `${cliExitCode}. Output:\n${cliOutput}`
  );
});
