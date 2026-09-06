/**
 * Step definitions for the @SCN-SSM-013 arm of
 * features/scenario-sub-issue-match.feature — a change lying inside NO scenario names no
 * scenario, and the check SAYS SO.
 *
 * WHY THE SECOND CLAUSE NEEDS THIS ARM AND THE @unit ONE CANNOT SUPPLY IT. Comparing the
 * two sources already answers both halves — `updatedCodes: []` and
 * `changedOutsideEveryScenario: true` — and the @unit arm in
 * tests/checks/scenarioTextChanges.test.ts pins them. But the
 * row is about what the CHECK REPORTS, and a fact the reading produces which nothing
 * prints is a fact nobody ever sees. Only a run of the real CLI can read stdout, so this
 * arm is where the second clause has its teeth.
 *
 * WHY SILENCE IS NOT ENOUGH ON ITS OWN. An empty updated set carries two meanings that
 * are not the same fact: "no scenario contains this change" and "no feature file changed
 * at all". The inert message below is the honest report of the SECOND and says nothing
 * about the first, so left alone it makes the two indistinguishable — this repository's
 * own missing-versus-unreached confusion arriving in a third place. Both lines are
 * asserted together here: the inert message unchanged, and the fact stated beside it.
 *
 * THE FIXTURE IS THE MIS-ATTRIBUTION SHAPE, not a quiet corner. The reworded line is a
 * `Rule:` preamble with a scenario's tag line TWO LINES BELOW it, so three lines of
 * unified-diff context put that tag line inside the hunk: measured at the parent's
 * Analysis, the old hunk-reading detector answered `updated: [SCN-LAD-004]` for exactly
 * this input. The fixture asserts that context line is present, because without it there
 * is nothing for a hunk-reading detector to inherit and the negative clause proves
 * nothing.
 *
 * THE MISSING TICKET HANDLE IS WHAT GIVES THE NEGATIVE CLAUSE ITS TEETH. The fixture PR
 * carries NO handle and NO exemption directive, so the run can only exit 0 while the gate
 * names no code at all: a reading that inherited the neighbour would hand `SCN-LAD-004`
 * to a PR with nothing to vouch for it, and the gate would red with
 * `missing-ticket-handle`. Silence is therefore measured by the exit code as well as by
 * the absence of the word.
 *
 * AND IT IS A REPORT, NOT A VIOLATION. The exit code is 0 with the fact printed, which is
 * the whole of the row's third assertion: nothing here reds the gate and nothing changes
 * about what the gate does with the code sets it is handed.
 *
 * @SCN-SSM-013 — bidirectional evidence marker. Grepping SCN-SSM-013 returns the
 * scenario, this step block, and the @unit test.
 *
 * Parent: 3F-3044; sibling SSM-010 (tests/steps/scenarioSubIssueMatchLastStep.steps.ts)
 * stands up the reading this row consumes, and supplies the git-fixture pattern.
 */

import { Given, When, Then } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// @SCN-SSM-013
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const tsxBin = path.join(repoRoot, "node_modules/.bin/tsx");
const cliPath = path.join(
  repoRoot,
  "tests/checks/lintScnSubIssuesCli.ts"
);

/**
 * The scenario whose tag line sits two lines under the reworded preamble — the neighbour
 * the gate must NOT name. Nothing inside it moves; it is here to be inherited, and it
 * was, before the reading became a comparison of the two sources.
 */
const NEIGHBOUR_CODE = "SCN-LAD-004";

/** The fixture's Gherkin surface. Flat under features/, matching FEATURE_FILE_PATHSPEC. */
const FEATURE_FILE = "features/target.feature";

/**
 * The fixture corpus. The preamble is the Rule's own description line; the scenario's tag
 * line is two lines below it, which is what puts that tag inside the hunk as context.
 */
function featureSource(preamble: string): string {
  return (
    [
      "@LAD",
      "Feature: the local ladder is derived from the workflow",
      "",
      "  Rule: the ladder names what it leaves out, and why",
      `    ${preamble}`,
      "",
      `    @unit @integration @${NEIGHBOUR_CODE}`,
      "    Scenario: an excluded step is not a gate",
      "      Given a workflow step the ladder excludes",
      "      When the ladder is derived",
      "      Then the excluded step is not a gate",
    ].join("\n") + "\n"
  );
}

const BASE_PREAMBLE = "An exclusion carries the reason it cannot run locally.";
const HEAD_PREAMBLE = "An exclusion carries the reason it is left out.";

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

// @SCN-SSM-013
Given(
  "a PR whose only Gherkin change rewords a Rule preamble two lines above a scenario's tag line",
  function () {
    fixtureDir = fs.mkdtempSync(path.join(os.tmpdir(), "scn-ssm-013-"));
    execFileSync("git", ["init", "-q", "-b", "main"], { cwd: fixtureDir });
    git(["config", "user.email", "fixture@example.com"]);
    git(["config", "user.name", "Fixture"]);
    git(["config", "commit.gpgsign", "false"]);

    write(FEATURE_FILE, featureSource(BASE_PREAMBLE));
    git(["add", "."]);
    git(["commit", "-q", "-m", "base: the ladder corpus, one rule and one scenario"]);
    baseSha = git(["rev-parse", "HEAD"]);

    // HEAD: the ONLY change is the Rule's preamble line. The commit subject deliberately
    // carries no [3F-NNN] prefix and the run below carries no exemption, so any code the
    // gate names has nothing to vouch for it and reds the run.
    write(FEATURE_FILE, featureSource(HEAD_PREAMBLE));
    git(["add", "."]);
    git(["commit", "-q", "-m", "reword the exclusion rule's preamble"]);

    // Prove the fixture is the shape this row needs rather than trusting the source above:
    // exactly one line replaced, that line inside no scenario, and the neighbouring
    // scenario's tag line present in the hunk as CONTEXT. Without that context line there
    // is nothing for a hunk-reading detector to inherit and the negative clause is empty.
    const diff = git(["diff", `${baseSha}...HEAD`, "--", FEATURE_FILE]);
    const lines = diff.split(/\r?\n/);
    const body = (marker: string): string[] =>
      lines.filter((l) => l.startsWith(marker) && !l.startsWith(marker + marker)).map((l) => l.slice(1));
    assert.deepEqual(
      body("-"),
      [`    ${BASE_PREAMBLE}`],
      `the preamble fixture must replace EXACTLY the Rule's preamble line. Diff:\n${diff}`
    );
    assert.deepEqual(
      body("+"),
      [`    ${HEAD_PREAMBLE}`],
      `the preamble fixture must add EXACTLY the reworded preamble line — a tag line added ` +
        `would make this an add, not a change outside every scenario. Diff:\n${diff}`
    );
    assert.ok(
      lines.some((l) => l.startsWith(" ") && l.includes(NEIGHBOUR_CODE)),
      `the hunk must carry @${NEIGHBOUR_CODE}'s tag line as CONTEXT — that is what a ` +
        `hunk-reading detector inherits, and without it this row proves nothing. Diff:\n${diff}`
    );
  }
);

// @SCN-SSM-013
When("the scenario sub-issue gate runs over the preamble fixture PR", function () {
  try {
    cliOutput = execFileSync(tsxBin, [cliPath], {
      cwd: fixtureDir,
      encoding: "utf8",
      env: {
        ...process.env,
        GITHUB_BASE_SHA: baseSha,
        // NO ticket handle and NO exemption: the run passes only while the gate names
        // nothing at all.
        GITHUB_HEAD_REF: "contributor/reword-the-exclusion-rule-preamble",
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

// @SCN-SSM-013
Then(
  "the gate names no updated scenario code, and reports that the feature file changed outside every scenario",
  function () {
    // The NEGATIVE clause. The neighbour's text is byte-identical on both sides; the only
    // thing that ever put it near this change is the hunk git happened to produce.
    assert.doesNotMatch(
      cliOutput,
      new RegExp(`\\b${NEIGHBOUR_CODE}\\b`),
      `expected the gate to name NO scenario code: the reworded line lies inside no ` +
        `scenario, and @${NEIGHBOUR_CODE} is byte-identical on both sides. Output:\n${cliOutput}`
    );

    // The POSITIVE clause, and the one that reds today: the fact the reading produces has
    // to reach stdout, naming the file it is about. Silence in the code set is only half
    // an answer — the other half is saying which half it is.
    assert.match(
      cliOutput,
      /changed OUTSIDE every scenario/,
      `expected the check to REPORT that the feature file changed outside every scenario. ` +
        `An empty updated set that says nothing is indistinguishable from an unchanged ` +
        `file, which is the confusion this row exists to close. Output:\n${cliOutput}`
    );
    assert.match(
      cliOutput,
      new RegExp(FEATURE_FILE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
      `expected the report to NAME ${FEATURE_FILE} — a fact the engineer cannot locate is ` +
        `a fact they cannot act on. Output:\n${cliOutput}`
    );

    // AND the inert message is still there, unchanged. The new line is ADDITIVE: the run
    // genuinely has nothing to check, and that remains true and still worth saying. What
    // changed is that it is no longer the ONLY thing said, so the two empty answers are
    // now separable in the output rather than sharing one sentence.
    assert.match(
      cliOutput,
      /nothing to check\./,
      `expected the existing inert message to survive byte-unchanged beside the new fact. ` +
        `Output:\n${cliOutput}`
    );

    // A REPORT, NOT A VIOLATION — and exit 0 for the right reason. The PR carries no
    // ticket handle and no exemption, so a gate that had named a code here would red with
    // missing-ticket-handle. Passing means the gate named nothing.
    assert.equal(
      cliExitCode,
      0,
      `expected the scn-subissue gate CLI to PASS (exit 0): a change outside every ` +
        `scenario is reported, never a violation. It exited ${cliExitCode}. ` +
        `Output:\n${cliOutput}`
    );
  }
);
