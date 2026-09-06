/**
 * Step definitions for the @SCN-SSM-017 arm of
 * features/scenario-sub-issue-match.feature — a relabelled scenario whose body also
 * changed is not a renumber.
 *
 * THE ONLY ROW IN THIS RULE THAT REDS WHEN THE READING PAIRS TOO MUCH. @SCN-SSM-015 and
 * @SCN-SSM-016 both red when it pairs too LITTLE, and the cheapest reading that satisfies
 * the pair of them is one that stops consulting the scenario's body altogether — pair a
 * disappeared code with an appeared one on document position, or on their shared feature
 * prefix, and stop. That reading passes both rows above exactly. This arm is what it fails.
 *
 * AND WHAT IT WOULD BE ALLOWED IS THE WHOLE GATE, not a mis-report. `decideScnGate` passes
 * a renumber UNCONDITIONALLY, ahead of the ticket handle and ahead of every exemption
 * trailer, so an over-eager pairing exempts every renamed-and-rewritten scenario in the
 * repository from the check that binds a behaviour change to a tracked work item. The
 * auto-exemption exists for a relabel that changes nothing else; a changed body is a
 * changed behaviour and still owes a handle or an explicit SCN-exempt trailer.
 *
 * Anti-watermelon (the @integration proof): this drives the REAL lint:scn-subissues CLI as
 * a SUBPROCESS over a throwaway git fixture. The @unit arm in
 * tests/checks/scenarioTextChanges.test.ts pins the reading; this
 * arm pins what the CLI does with it — and this row's outcome is a REFUSAL, so what it
 * proves is that the refusal still arrives once every other input is stripped away.
 *
 * THE SAME-SCENARIO PREMISE IS ASSERTED BEFORE THE OUTCOME IS, off real git output. Move
 * the edited step into the NEIGHBOUR and this becomes @SCN-SSM-015's fixture, where the
 * pair must SURVIVE — so the row would be asserting the exact opposite outcome against the
 * exact opposite premise, the most expensive way for a test to be wrong.
 *
 * BOTH CLAUSES OF THE OUTCOME ARE LOAD-BEARING. A row asserting only "no renumber was
 * auto-detected" would go green for a gate that had stopped reading added codes at all, so
 * this arm also names the violation the new code draws, and the exit code it produces.
 *
 * @SCN-SSM-017 — bidirectional evidence marker. Grepping SCN-SSM-017 returns the scenario,
 * this step block, and the @unit test.
 *
 * Parent: 3F-3045; sibling SSM-015 (tests/steps/scenarioSubIssueMatchSharedHunk.steps.ts)
 * supplies the git-fixture pattern and the corpus this fixture deliberately mirrors.
 */

import { Given, When, Then } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// @SCN-SSM-017
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const tsxBin = path.join(repoRoot, "node_modules/.bin/tsx");
const cliPath = path.join(
  repoRoot,
  "tests/checks/lintScnSubIssuesCli.ts"
);

/** The neighbour scenario, byte-identical on both sides — nothing here is about it. */
const NEIGHBOUR_CODE = "SCN-LAD-006";
/** The relabelled scenario's code on the BASE side. */
const RELABELLED_FROM = "SCN-LAD-007";
/** And on the HEAD side — the code the gate must still require a binding for. */
const RELABELLED_TO = "SCN-LAD-008";

/** The fixture's Gherkin surface. Flat under features/, matching FEATURE_FILE_PATHSPEC. */
const FEATURE_FILE = "features/target.feature";

/**
 * The step that changes is the relabelled scenario's OWN last step — the difference from
 * @SCN-SSM-015, whose fixture changes the NEIGHBOUR's and must still pair.
 */
const OWN_STEP_BEFORE = "the excluded step is not a gate";
const OWN_STEP_AFTER =
  "the excluded step is not a gate, and the ladder names the exclusion that left it out";

function featureSource(relabelledCode: string, ownLastStep: string): string {
  return (
    [
      "@LAD",
      "Feature: the local ladder is derived from the workflow",
      "",
      `  @unit @integration @${NEIGHBOUR_CODE}`,
      "  Scenario: the ladder is derived from the workflow itself",
      "    Given a workflow naming its gate steps",
      "    When the ladder is derived",
      "    Then the ladder names every gate step",
      "",
      `  @unit @integration @${relabelledCode}`,
      "  Scenario: an excluded step is not a gate",
      "    Given a workflow step the ladder excludes",
      "    When the ladder is derived",
      `    Then ${ownLastStep}`,
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

// @SCN-SSM-017
Given(
  "a PR that relabels a scenario and changes a step inside that same scenario",
  function () {
    fixtureDir = fs.mkdtempSync(path.join(os.tmpdir(), "scn-ssm-017-"));
    execFileSync("git", ["init", "-q", "-b", "main"], { cwd: fixtureDir });
    git(["config", "user.email", "fixture@example.com"]);
    git(["config", "user.name", "Fixture"]);
    git(["config", "commit.gpgsign", "false"]);

    write(FEATURE_FILE, featureSource(RELABELLED_FROM, OWN_STEP_BEFORE));
    git(["add", "."]);
    git(["commit", "-q", "-m", "base: the ladder corpus, two adjacent scenarios"]);
    baseSha = git(["rev-parse", "HEAD"]);

    // HEAD: the relabel AND that scenario's own last step, in one commit. The commit
    // subject deliberately carries NO [3F-NNN] prefix, so nothing but the auto-detection
    // could carry either code — which is precisely what must not happen here.
    write(FEATURE_FILE, featureSource(RELABELLED_TO, OWN_STEP_AFTER));
    git(["add", "."]);
    git(["commit", "-q", "-m", "renumber the excluded-step scenario, and reword its own step"]);

    // Prove the fixture is the shape this row needs rather than trusting the source
    // builder: BOTH changed lines belong to the relabelled scenario's extent — its tag
    // line and its last step — and the neighbour contributes no changed line at all. A
    // fixture that drifted into changing the NEIGHBOUR'S step would be @SCN-SSM-015's,
    // where the pair must survive, so this row would then be asserting the opposite
    // outcome against the opposite premise.
    const diff = git(["diff", `${baseSha}...HEAD`, "--", FEATURE_FILE]);
    const lines = diff.split(/\r?\n/);
    const body = (marker: string): string[] =>
      lines
        .filter((l) => l.startsWith(marker) && !l.startsWith(marker + marker))
        .map((l) => l.slice(1));
    assert.deepEqual(
      body("-"),
      [`  @unit @integration @${RELABELLED_FROM}`, `    Then ${OWN_STEP_BEFORE}`],
      `the diff must remove @${RELABELLED_FROM}'s tag line AND that same scenario's own ` +
        `last step — the relabel and the edit inside ONE scenario is the whole premise ` +
        `of this row. Diff:\n${diff}`
    );
    assert.deepEqual(
      body("+"),
      [`  @unit @integration @${RELABELLED_TO}`, `    Then ${OWN_STEP_AFTER}`],
      `the diff must add @${RELABELLED_TO}'s tag line AND that scenario's reworded step. ` +
        `Diff:\n${diff}`
    );
    // Said of the corpus, not only of the diff: the neighbour is untouched, so every
    // changed line is inside the relabelled scenario and none is inside SCN-LAD-006.
    const neighbourBlock = (source: string): string =>
      source.slice(source.indexOf(`@${NEIGHBOUR_CODE}`), source.indexOf("\n\n  @unit", 1));
    assert.equal(
      neighbourBlock(featureSource(RELABELLED_FROM, OWN_STEP_BEFORE)),
      neighbourBlock(featureSource(RELABELLED_TO, OWN_STEP_AFTER)),
      "the neighbouring scenario must be byte-identical across the two sides — this row " +
        "is about one scenario relabelled AND edited, and nothing else changing"
    );
  }
);

// @SCN-SSM-017
When("the scenario sub-issue gate runs over the relabelled-and-edited fixture PR", function () {
  try {
    cliOutput = execFileSync(tsxBin, [cliPath], {
      cwd: fixtureDir,
      encoding: "utf8",
      env: {
        ...process.env,
        GITHUB_BASE_SHA: baseSha,
        // NO ticket handle and NO exemption of any kind. Every other way a code could be
        // carried is stripped away, so the run passes ONLY if the gate auto-detected a
        // renumber it should have refused — which is the hole this row exists to keep shut.
        GITHUB_HEAD_REF: "contributor/renumber-and-reword-the-excluded-step-scenario",
        PR_BODY: "Tidying the ladder feature's codes, and sharpening a step while I am here.",
      },
    });
    cliExitCode = 0;
  } catch (err) {
    const e = err as { status?: number; stdout?: string; stderr?: string };
    cliExitCode = typeof e.status === "number" ? e.status : 1;
    cliOutput = `${e.stdout ?? ""}${e.stderr ?? ""}`;
  }
});

// @SCN-SSM-017
Then(
  "the gate does not auto-detect a renumber, and requires a binding for the new code",
  function () {
    // The old code is reported DELETED, which is the observable face of "no pair claimed
    // it": a detected renumber's removed side is kept out of the deleted set, so a gate
    // reading "0 deleted" here would have paired the two codes it must refuse to pair.
    assert.match(
      cliOutput,
      /\b1 deleted\b/,
      `expected @${RELABELLED_FROM} to be reported DELETED: its scenario's body changed ` +
        `too, so the relabel is not a renumber and nothing keeps the old code out of the ` +
        `deleted set. Output:\n${cliOutput}`
    );

    // Neither code is on both sides, so there is no update to report either — asserted so
    // the refusal below cannot be coming from an updated-code violation instead.
    assert.match(
      cliOutput,
      /\b0 updated\b/,
      `expected NO updated code: @${RELABELLED_FROM} and @${RELABELLED_TO} share no side, ` +
        `so this change is an add and a delete. Output:\n${cliOutput}`
    );

    // The added arm still reports the new code. Without this the refusal could belong
    // wholly to the deleted arm, and the row would go green for a gate that had stopped
    // reading added codes altogether.
    assert.match(
      cliOutput,
      new RegExp(`checking: [^\\n]*\\b${RELABELLED_TO}\\b`),
      `expected the gate to name @${RELABELLED_TO} among the codes it checks. ` +
        `Output:\n${cliOutput}`
    );

    // And the binding is required OF THE NEW CODE by name. An over-eager pairing would
    // leave this violation out while every other line above still read the same.
    assert.match(
      cliOutput,
      new RegExp(`\\[missing-ticket-handle\\] Added scenario code @${RELABELLED_TO}\\b`),
      `expected a missing-ticket-handle violation naming @${RELABELLED_TO}: the PR carries ` +
        `no ticket handle and no SCN-exempt trailer, and a relabel whose body also changed ` +
        `is not auto-exempt. Output:\n${cliOutput}`
    );

    assert.notEqual(
      cliExitCode,
      0,
      `expected the scn-subissue gate CLI to RED: a scenario relabelled AND edited is a ` +
        `behaviour change, and this PR binds it to nothing. It exited ${cliExitCode}. ` +
        `Output:\n${cliOutput}`
    );
  }
);
