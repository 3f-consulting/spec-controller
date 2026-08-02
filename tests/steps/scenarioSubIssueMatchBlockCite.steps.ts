/**
 * Step definitions for the @SCN-SSM-005 block-attribution arm of
 * features/scenario-sub-issue-match.feature — a CHANGED test block must carry a
 * cite of its own; a sibling's cite does not vouch for it.
 *
 * Anti-watermelon (the @integration proof): this drives the REAL
 * lint:scn-subissues CLI as a SUBPROCESS over a throwaway git fixture in the
 * SHAPE (b) the operator ruled on (3F-1758) — new src behaviour proven by a NEW,
 * UNCITED test block (its own describe), added to a test file whose OTHER,
 * UNTOUCHED tests carry @SCN cites. Under SSM-004's file-level scan the sibling's
 * cite rescued the PR and it passed; under block attribution the new block carries
 * no cite in its ancestor chain and the gate REDS, naming it.
 *
 * This arm is the TEETH: the defect is in the CLI's wiring — WHICH cites it counts
 * as vouching for the change — so only a test driving the live end-to-end path
 * (git diff → block parse → touched-line map → decideScnGate → exit code) can catch
 * it. The @unit arm proves the block parser and touched-line map in isolation.
 *
 * NOT tested here, by operator ruling — shape (a): a new uncited `it` INSIDE a
 * cited `describe` INHERITS that cite and PASSES BY DESIGN. The repo cites on the
 * describe (148 of them); a test inside a cited describe is claiming that scenario.
 * That is the convention working, not a hole. See scnSubIssueGate.test.ts, which
 * pins shape (a) green so a future tightening cannot silently reject the convention.
 *
 * @SCN-SSM-005 — bidirectional evidence marker.
 *
 * Parent: 3F-1758 (block-level cite attribution); sibling SSM-004 (3F-1750) landed
 * the file-level scan this narrows.
 */

import { Given, When, Then } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// @SCN-SSM-005
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const tsxBin = path.join(repoRoot, "node_modules/.bin/tsx");
const cliPath = path.join(
  repoRoot,
  "packages/spec-controller/static-checks/lintScnSubIssuesCli.ts"
);

/** The @SCN cited by the file's OTHER, UNTOUCHED test — the sibling that must NOT vouch. */
const SIBLING_CODE = "SCN-API-001";
/** The title of the new, uncited block the gate must name in its violation. */
const UNCITED_BLOCK = "the doubling";

const SRC_FILE = "packages/fixture-pkg/src/tally.ts";
const TEST_FILE = "packages/fixture-pkg/src/tally.test.ts";

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

// @SCN-SSM-005
Given(
  "a PR adding new src behaviour proven by a new UNCITED test block, in a test file whose other, untouched tests carry @SCN cites, on a branch carrying a 3F ticket handle",
  function () {
    fixtureDir = fs.mkdtempSync(path.join(os.tmpdir(), "scn-ssm-005-"));
    execFileSync("git", ["init", "-q", "-b", "main"], { cwd: fixtureDir });
    git(["config", "user.email", "fixture@example.com"]);
    git(["config", "user.name", "Fixture"]);
    git(["config", "commit.gpgsign", "false"]);

    // A feature surface the PR never touches — no @SCN feature delta, so the
    // unit-equivalent arm (the 3F-805 surface) is the one in play.
    write(
      "features/target.feature",
      `@API\nFeature: fixture surface\n\n  @unit @${SIBLING_CODE}\n  Scenario: the summary tallies\n    Given a run\n`
    );

    // BASE: one test, CITED on its describe. This is the sibling.
    write(SRC_FILE, "export function tally(): number {\n  return 1;\n}\n");
    write(
      TEST_FILE,
      'import { describe, it, expect } from "vitest";\n' +
        'import { tally } from "./tally.js";\n\n' +
        `describe("[${SIBLING_CODE}] the tally", () => {\n` +
        '  it("counts", () => {\n' +
        "    expect(tally()).toBe(1);\n" +
        "  });\n" +
        "});\n"
    );
    git(["add", "."]);
    git(["commit", "-q", "-m", "base: the tally, cited by its @unit test"]);
    baseSha = git(["rev-parse", "HEAD"]);

    // HEAD — SHAPE (b): brand-new src behaviour (`doubled`), proven by a brand-new
    // test block in its OWN, UNCITED describe. The cited describe above is UNTOUCHED
    // — its cite must NOT vouch for this new block. Under the file-level scan this
    // passed; under block attribution it must RED.
    write(
      SRC_FILE,
      "export function tally(): number {\n  return 1;\n}\n\n" +
        "export function doubled(): number {\n  return tally() * 2;\n}\n"
    );
    write(
      TEST_FILE,
      'import { describe, it, expect } from "vitest";\n' +
        'import { tally, doubled } from "./tally.js";\n\n' +
        `describe("[${SIBLING_CODE}] the tally", () => {\n` +
        '  it("counts", () => {\n' +
        "    expect(tally()).toBe(1);\n" +
        "  });\n" +
        "});\n\n" +
        `describe("${UNCITED_BLOCK}", () => {\n` +
        '  it("doubles the tally", () => {\n' +
        "    expect(doubled()).toBe(2);\n" +
        "  });\n" +
        "});\n"
    );
    git(["add", "."]);
    git(["commit", "-q", "-m", "[3F-9999] add doubling, proven by an uncited test block"]);
  }
);

// @SCN-SSM-005
When("the scenario sub-issue gate runs over the sibling-cited fixture PR", function () {
  try {
    cliOutput = execFileSync(tsxBin, [cliPath], {
      cwd: fixtureDir,
      encoding: "utf8",
      env: {
        ...process.env,
        GITHUB_BASE_SHA: baseSha,
        // A properly TICKETED internal PR — the handle must not rescue an uncited
        // block, exactly as it does not rescue an uncited file.
        GITHUB_HEAD_REF: "steven/3f-9999-add-doubling",
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

// @SCN-SSM-005
Then("the gate reds, naming the uncited test block", function () {
  assert.notEqual(
    cliExitCode,
    0,
    `expected the scn-subissue gate CLI to RED (non-zero exit) over a PR whose new ` +
      `behaviour is proven by an UNCITED test block — the sibling's cite must not vouch ` +
      `for it — but it exited ${cliExitCode}. Output:\n${cliOutput}`
  );
  assert.match(
    cliOutput,
    /uncited-unit-equivalent/,
    `expected an uncited-unit-equivalent violation kind, absent from:\n${cliOutput}`
  );
  // Teeth: the violation must NAME the offending block, or the engineer cannot act
  // on it — "something in this file is uncited" is not a usable message.
  assert.match(
    cliOutput,
    new RegExp(UNCITED_BLOCK),
    `expected the violation to NAME the uncited block "${UNCITED_BLOCK}", but it was ` +
      `absent from:\n${cliOutput}`
  );
});
