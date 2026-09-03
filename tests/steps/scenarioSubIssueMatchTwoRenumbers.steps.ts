/**
 * Step definitions for the @SCN-SSM-016 arm of
 * features/scenario-sub-issue-match.feature — two renumbers inside one hunk are both
 * auto-detected.
 *
 * THE SAME RETIRED `flush()`, THE OTHER CONDITION. `detectRenumberPairs` accumulated per
 * HUNK and emitted a pair only when the hunk held EXACTLY ONE removed tag-line code,
 * EXACTLY ONE added one, and no other changed line. @SCN-SSM-015 pins the last of those;
 * this row pins the COUNT. Two adjacent scenarios relabelled in one sitting put two of
 * each in a single hunk, so both correct renumbers were discarded together — and a cure
 * that only stopped consulting the neighbouring edit would satisfy the row above and
 * still refuse this author.
 *
 * NOTHING ELSE CHANGES IN THIS FIXTURE, deliberately: two removed tag lines, two added
 * ones, not one other altered line. `otherChange` is never reached, so the only reading
 * this arm can red is one that still counts.
 *
 * Anti-watermelon (the @integration proof): this drives the REAL lint:scn-subissues CLI
 * as a SUBPROCESS over a throwaway git fixture. The @unit arm in
 * packages/spec-controller/static-checks/scenarioTextChanges.test.ts pins the reading;
 * this arm pins the CLI's CHOICE OF INPUT, which is where the fault lived.
 *
 * THE ONE HUNK IS ASSERTED BEFORE THE OUTCOME IS. A fixture that quietly split into two
 * hunks would have paired under the OLD reading too — one pair per hunk, the count
 * satisfied in each — so the row would go green against the very fault it exists to pin.
 *
 * THE IDENTITY IS LOAD-BEARING, not decorative. The fixture PR carries NO ticket handle
 * and NO exemption at all, so every code the gate names has to be carried by the
 * auto-detection alone: the two NEW codes can only pass as the added sides of detected
 * renumbers, and the two OLD codes can only stay out of the deleted set as their removed
 * sides. Pairing one and abandoning the other reds this arm twice over.
 *
 * @SCN-SSM-016 — bidirectional evidence marker. Grepping SCN-SSM-016 returns the
 * scenario, this step block, and the @unit test.
 *
 * Parent: 3F-3045; sibling SSM-015 (tests/steps/scenarioSubIssueMatchSharedHunk.steps.ts)
 * supplies the git-fixture pattern.
 */

import { Given, When, Then } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// @SCN-SSM-016
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const tsxBin = path.join(repoRoot, "node_modules/.bin/tsx");
const cliPath = path.join(
  repoRoot,
  "packages/spec-controller/static-checks/lintScnSubIssuesCli.ts"
);

/** The two scenarios' codes on the BASE side. */
const FIRST_FROM = "SCN-LAD-006";
const SECOND_FROM = "SCN-LAD-007";
/** And on the HEAD side — the codes the gate must not require a binding for. */
const FIRST_TO = "SCN-LAD-016";
const SECOND_TO = "SCN-LAD-017";

/** The fixture's Gherkin surface. Flat under features/, matching FEATURE_FILE_PATHSPEC. */
const FEATURE_FILE = "features/target.feature";

/**
 * Two adjacent scenarios with DIFFERENT bodies, each parameterised on its own code. The
 * two tag lines sit six lines apart — well inside twice unified diff's three lines of
 * context — so git has no choice but to emit both relabels as one hunk. The bodies differ
 * so the pairing is unambiguous.
 */
function featureSource(firstCode: string, secondCode: string): string {
  return (
    [
      "@LAD",
      "Feature: the local ladder is derived from the workflow",
      "",
      `  @unit @integration @${firstCode}`,
      "  Scenario: the ladder is derived from the workflow itself",
      "    Given a workflow naming its gate steps",
      "    When the ladder is derived",
      "    Then the ladder names every gate step",
      "",
      `  @unit @integration @${secondCode}`,
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

// @SCN-SSM-016
Given("a PR that renumbers two adjacent scenarios inside one hunk", function () {
  fixtureDir = fs.mkdtempSync(path.join(os.tmpdir(), "scn-ssm-016-"));
  execFileSync("git", ["init", "-q", "-b", "main"], { cwd: fixtureDir });
  git(["config", "user.email", "fixture@example.com"]);
  git(["config", "user.name", "Fixture"]);
  git(["config", "commit.gpgsign", "false"]);

  write(FEATURE_FILE, featureSource(FIRST_FROM, SECOND_FROM));
  git(["add", "."]);
  git(["commit", "-q", "-m", "base: the ladder corpus, two adjacent scenarios"]);
  baseSha = git(["rev-parse", "HEAD"]);

  // HEAD: both relabels, in one commit. The commit subject deliberately carries NO
  // [3F-NNN] prefix — the auto-detection has to carry both relabelled codes.
  write(FEATURE_FILE, featureSource(FIRST_TO, SECOND_TO));
  git(["add", "."]);
  git(["commit", "-q", "-m", "renumber the two ladder scenarios"]);

  // Prove the fixture is the shape this row needs rather than trusting the source
  // builder: ONE hunk, carrying both relabels and nothing else. Two hunks would have
  // paired under the OLD hunk-local reading as well — one pair per hunk, its
  // exactly-one count satisfied in each — so the row would go green against the fault
  // it exists to pin, the most expensive way for this test to be wrong.
  const diff = git(["diff", `${baseSha}...HEAD`, "--", FEATURE_FILE]);
  const lines = diff.split(/\r?\n/);
  assert.equal(
    lines.filter((l) => l.startsWith("@@")).length,
    1,
    `the two-renumber fixture must produce exactly ONE hunk — the whole premise of this ` +
      `row is that both relabels arrive together. Diff:\n${diff}`
  );
  const body = (marker: string): string[] =>
    lines
      .filter((l) => l.startsWith(marker) && !l.startsWith(marker + marker))
      .map((l) => l.slice(1));
  assert.deepEqual(
    body("-"),
    [`  @unit @integration @${FIRST_FROM}`, `  @unit @integration @${SECOND_FROM}`],
    `the hunk must remove BOTH old tag lines and nothing else — no other changed line, ` +
      `so the condition @SCN-SSM-015 owns is never reached. Diff:\n${diff}`
  );
  assert.deepEqual(
    body("+"),
    [`  @unit @integration @${FIRST_TO}`, `  @unit @integration @${SECOND_TO}`],
    `the hunk must add BOTH new tag lines and nothing else — both scenarios' BODIES are ` +
      `untouched, which is what makes each of these a renumber. Diff:\n${diff}`
  );
});

// @SCN-SSM-016
When("the scenario sub-issue gate runs over the two-renumber fixture PR", function () {
  try {
    cliOutput = execFileSync(tsxBin, [cliPath], {
      cwd: fixtureDir,
      encoding: "utf8",
      env: {
        ...process.env,
        GITHUB_BASE_SHA: baseSha,
        // NO ticket handle and NO exemption — every code the gate names has to be
        // carried by the auto-detection alone.
        GITHUB_HEAD_REF: "contributor/renumber-the-ladder-scenarios",
        PR_BODY: "Tidying the ladder feature's codes.",
      },
    });
    cliExitCode = 0;
  } catch (err) {
    const e = err as { status?: number; stdout?: string; stderr?: string };
    cliExitCode = typeof e.status === "number" ? e.status : 1;
    cliOutput = `${e.stdout ?? ""}${e.stderr ?? ""}`;
  }
});

// @SCN-SSM-016
Then("the gate auto-detects both renumbers", function () {
  // BOTH old codes are removed sides of renumbers, so neither stopped being asserted.
  // Under the hunk reading the count discarded both pairs and this read "2 deleted".
  assert.match(
    cliOutput,
    /\b0 deleted\b/,
    `expected NO deleted code: @${FIRST_FROM} and @${SECOND_FROM} were relabelled to ` +
      `@${FIRST_TO} and @${SECOND_TO}, not removed. Output:\n${cliOutput}`
  );

  // Neither body changed, so neither scenario is an update either.
  assert.match(
    cliOutput,
    /\b0 updated\b/,
    `expected NO updated code: a relabel changes the carrier, not the scenario's text. ` +
      `Output:\n${cliOutput}`
  );

  // Both new codes are named as codes to check — the added arm still reports them, which
  // is what makes the pass below a statement about the auto-detection rather than about
  // the gate having stopped looking.
  for (const code of [FIRST_TO, SECOND_TO]) {
    assert.match(
      cliOutput,
      new RegExp(`checking: [^\\n]*\\b${code}\\b`),
      `expected the gate to name @${code} among the codes it checks. Output:\n${cliOutput}`
    );
  }

  // And exit 0 for the RIGHT reason: no ticket handle and no exemption, so each new code
  // passes solely as the added side of an auto-detected renumber. Pairing the first and
  // abandoning the second refuses @${SECOND_TO} here.
  assert.equal(
    cliExitCode,
    0,
    `expected the scn-subissue gate CLI to PASS (exit 0): the PR carries no ticket handle ` +
      `and no exemption, so @${FIRST_TO} and @${SECOND_TO} can pass only as the added sides ` +
      `of two auto-detected renumbers. It exited ${cliExitCode}. Output:\n${cliOutput}`
  );
});
