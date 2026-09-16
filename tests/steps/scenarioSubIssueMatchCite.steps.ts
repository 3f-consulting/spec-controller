/**
 * Step definitions for the @SCN-SSM-004 cite-from-file-state arm of
 * features/scenario-sub-issue-match.feature — the guard must read the @SCN cite
 * from the CHECKED-OUT test file, not from the diff.
 *
 * Anti-watermelon (the @integration proof): this drives the REAL
 * lint:scn-subissues CLI as a SUBPROCESS over a throwaway git fixture shaped
 * like the change that surfaced the bug (3F-1725's rename) — a
 * base commit with a cited @unit test, then a HEAD commit that RENAMES a
 * property accessor under a package's src dir and follows the rename INSIDE the
 * it-body, leaving the @SCN cite on the enclosing `describe` line UNCHANGED (a
 * diff CONTEXT line). The diff-only cite scan cannot see that cite and reds the PR
 * `uncited-unit-equivalent`; reading the file's live state sees it and passes.
 *
 * This arm is the TEETH: the bug was the CLI's CHOICE OF INPUT (it handed the
 * cite scan a diff), not the scanner itself, so only a test that drives the live
 * wiring end-to-end (git diff → file read → decideScnGate → exit code) can catch
 * it. The @unit arm in tests/checks/scnSubIssueGate.test.ts
 * proves the scanner in isolation and would have stayed green through the bug.
 *
 * @SCN-SSM-004 — bidirectional evidence marker. Grepping SCN-SSM-004 returns the
 * scenario, this step block, and the @unit test.
 *
 * Parent: 3F-1741 (the diff-vs-file-state split); sibling SSM-002 (the reject arm)
 * supplies the git-fixture pattern this follows.
 */

import { Given, When, Then } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// @SCN-SSM-004
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const tsxBin = path.join(repoRoot, "node_modules/.bin/tsx");
const cliPath = path.join(
  repoRoot,
  "tests/checks/lintScnSubIssuesCli.ts"
);

/** The @SCN code the fixture's test CITES — on a describe line the rename never touches. A
 * FIXTURE id, not one of this repository's: the fixture writes its own features/target.feature
 * carrying it, so a real code here would only be a grep hazard over this tree. */
const CITED_CODE = "SCN-AAA-001";

/** The fixture's production source — the file the rename churns. */
const SRC_FILE = "packages/fixture-pkg/src/summary.ts";
/** The fixture's @unit test — its cite sits on the describe line, its body on the it. */
const TEST_FILE = "packages/fixture-pkg/src/summary.test.ts";

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

// @SCN-SSM-004
Given(
  "a PR whose src rename edits the body of a test whose @SCN cite line is left unchanged, on a branch carrying a 3F ticket handle",
  function () {
    fixtureDir = fs.mkdtempSync(path.join(os.tmpdir(), "scn-ssm-004-"));
    execFileSync("git", ["init", "-q", "-b", "main"], { cwd: fixtureDir });
    git(["config", "user.email", "fixture@example.com"]);
    git(["config", "user.name", "Fixture"]);
    git(["config", "commit.gpgsign", "false"]);

    // A feature surface that the PR NEVER touches — so there is no @SCN feature
    // delta and the unit-equivalent arm (the 3F-805 surface) is the one in play.
    write(
      "features/target.feature",
      "@API\nFeature: fixture surface\n\n  @unit @" +
        CITED_CODE +
        "\n  Scenario: the summary tallies its scenarios\n    Given a run\n"
    );

    // BASE: the property is `scenarios`; the @unit test CITES the scenario on its
    // describe line and reads the property inside the it-body.
    write(
      SRC_FILE,
      "export interface Summary {\n  scenarios: number;\n}\n\n" +
        "export function makeSummary(): Summary {\n  return { scenarios: 1 };\n}\n"
    );
    write(
      TEST_FILE,
      'import { describe, it, expect } from "vitest";\n' +
        'import { makeSummary } from "./summary.js";\n\n' +
        `describe("[${CITED_CODE}] the summary tally", () => {\n` +
        '  it("counts the scenarios", () => {\n' +
        "    expect(makeSummary().scenarios).toBe(1);\n" +
        "  });\n" +
        "});\n"
    );
    git(["add", "."]);
    git(["commit", "-q", "-m", "base: the summary tally, cited by its @unit test"]);
    baseSha = git(["rev-parse", "HEAD"]);

    // HEAD: the RENAME. `scenarios` → `scenarioReconciliations` in src, and the
    // accessor inside the it-body follows it. The describe line carrying the
    // @SCN cite is IDENTICAL on both sides — a diff CONTEXT line, invisible to a
    // diff-only cite scan. This is the 3F-1725 shape.
    write(
      SRC_FILE,
      "export interface Summary {\n  scenarioReconciliations: number;\n}\n\n" +
        "export function makeSummary(): Summary {\n  return { scenarioReconciliations: 1 };\n}\n"
    );
    write(
      TEST_FILE,
      'import { describe, it, expect } from "vitest";\n' +
        'import { makeSummary } from "./summary.js";\n\n' +
        `describe("[${CITED_CODE}] the summary tally", () => {\n` +
        '  it("counts the scenarios", () => {\n' +
        "    expect(makeSummary().scenarioReconciliations).toBe(1);\n" +
        "  });\n" +
        "});\n"
    );
    git(["add", "."]);
    git(["commit", "-q", "-m", "[3F-1725] rename the summary tally to the reconciliation count"]);
  }
);

// @SCN-SSM-004
When("the scenario sub-issue gate runs over the rename-shaped fixture PR", function () {
  try {
    cliOutput = execFileSync(tsxBin, [cliPath], {
      cwd: fixtureDir,
      encoding: "utf8",
      env: {
        ...process.env,
        GITHUB_BASE_SHA: baseSha,
        // An INTERNAL PR on a Linear-auto-named branch — it DOES carry a 3F handle,
        // so the only thing that can red this PR is a mis-read of the cite.
        GITHUB_HEAD_REF: "steven/3f-1725-rename-the-summary-tally",
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

// @SCN-SSM-004
Then("the gate passes and exits 0, having read the @SCN as cited", function () {
  assert.equal(
    cliExitCode,
    0,
    `expected the scn-subissue gate CLI to PASS (exit 0) over a rename-shaped PR whose ` +
      `@SCN cite line is unchanged — the cite IS present in the checked-out test file — ` +
      `but it exited ${cliExitCode}. Output:\n${cliOutput}`
  );
  // Teeth: not merely exit 0, but exit 0 for the RIGHT REASON — the gate must
  // report the code as CITED. A gate that passed while reading it as uncited
  // would be a hole, not a fix.
  assert.match(
    cliOutput,
    new RegExp(`cited \\[[^\\]]*${CITED_CODE}`),
    `expected the gate to report @${CITED_CODE} as CITED (read from the checked-out ` +
      `test file, not the diff), but it was absent from the cite list:\n${cliOutput}`
  );
  assert.doesNotMatch(
    cliOutput,
    /uncited-unit-equivalent/,
    `expected NO uncited-unit-equivalent violation — the cite sits on an unchanged ` +
      `describe line, which is exactly the false positive this scenario pins:\n${cliOutput}`
  );
});
