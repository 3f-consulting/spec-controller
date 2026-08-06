/**
 * Step definitions for the @SCN-SSM-008 prose-title arm of
 * features/scenario-sub-issue-match.feature — a test block whose title merely
 * NAMES a scenario id is not cited by it.
 *
 * The gate's half of the false-citation class. Its cite scan matched any
 * SCN-shaped token on a test-call line, sigil optional, so a mention vouched for
 * a block bound to nothing. The ledger's arm (@SCN-LDG-032, @SCN-LDG-033) is the
 * same root pointing the other way — there a mention minted a phantom scenario
 * and the run redded; here it produces a silent false GREEN, which is why this
 * arm needs a live end-to-end proof rather than a parser assertion alone.
 *
 * Anti-watermelon (the @integration proof): this drives the REAL lint:scn-subissues
 * CLI as a SUBPROCESS over a throwaway git fixture, in @SCN-SSM-005's shape (b) —
 * new src behaviour proven by a NEW test block — with one difference that is the
 * whole scenario: the new block's title NAMES scenario ids instead of citing one.
 * Under the sigil-optional scan those names counted and the PR passed; under the
 * bracket rule the block carries no cite in its ancestor chain and the gate REDS.
 *
 * WHAT THIS ASSERTS THAT SSM-005 DOES NOT. @SCN-SSM-005 pins that an UNTITLED-cite
 * block is not rescued by a SIBLING's cite — a question of whose cite reaches whom.
 * This pins what counts as a cite at all. A block whose title is full of scenario
 * ids reads, to SSM-005's machinery, as thoroughly cited.
 *
 * @SCN-SSM-008 — bidirectional evidence marker.
 *
 * Parent: 3F-2368 (read a vitest cite from its brackets alone).
 */

import { Given, When, Then } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// @SCN-SSM-008
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const tsxBin = path.join(repoRoot, "node_modules/.bin/tsx");
const cliPath = path.join(
  repoRoot,
  "packages/spec-controller/static-checks/lintScnSubIssuesCli.ts"
);

/** The @SCN cited — properly, in brackets — by the file's other, untouched test. */
const SIBLING_CODE = "SCN-API-001";
/** A fixture id the new block NAMES in its title. Bare: the shape the defect was filed against. */
const PROSE_FIXTURE_CODE = "SCN-PDX-008";
/** A second id the same title names @-prefixed: the shape live in this repository's prose. */
const PROSE_CROSS_REFERENCE_CODE = "SCN-PDR-008";
/** The new block's title — every SCN-shaped token in it is a mention, none is a cite. */
const PROSE_BLOCK = `mirrors what ${PROSE_FIXTURE_CODE} does, per @${PROSE_CROSS_REFERENCE_CODE}`;

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

// @SCN-SSM-008
Given(
  "a PR whose new behaviour is proven by a test block naming a scenario id only in its title's prose, on a branch carrying a 3F ticket handle",
  function () {
    fixtureDir = fs.mkdtempSync(path.join(os.tmpdir(), "scn-ssm-008-"));
    execFileSync("git", ["init", "-q", "-b", "main"], { cwd: fixtureDir });
    git(["config", "user.email", "fixture@example.com"]);
    git(["config", "user.name", "Fixture"]);
    git(["config", "commit.gpgsign", "false"]);

    // A feature surface the PR never touches — no @SCN feature delta, so the
    // unit-equivalent arm (the 3F-805 surface) is the one in play, as in SSM-005.
    write(
      "features/target.feature",
      `@API\nFeature: fixture surface\n\n  @unit @${SIBLING_CODE}\n  Scenario: the summary tallies\n    Given a run\n`
    );

    // BASE: one test, properly cited in brackets on its describe.
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

    // HEAD: brand-new src behaviour (`doubled`), proven by a brand-new block whose
    // title NAMES two scenario ids and cites neither. This is the shape that read as
    // richly cited under the sigil-optional scan — the PR passed, and the 3F-805 leak
    // it exists to catch shipped green behind a sentence that merely mentioned an id.
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
        `describe("${PROSE_BLOCK}", () => {\n` +
        '  it("doubles the tally", () => {\n' +
        "    expect(doubled()).toBe(2);\n" +
        "  });\n" +
        "});\n"
    );
    git(["add", "."]);
    git(["commit", "-q", "-m", "[3F-9999] add doubling, proven by a prose-titled test block"]);
  }
);

// @SCN-SSM-008
When("the scenario sub-issue gate runs over the prose-titled fixture PR", function () {
  try {
    cliOutput = execFileSync(tsxBin, [cliPath], {
      cwd: fixtureDir,
      encoding: "utf8",
      env: {
        ...process.env,
        GITHUB_BASE_SHA: baseSha,
        // A properly TICKETED internal PR — the handle proves a live work-unit, never
        // WHICH scenario, so it must not rescue a block that cites none.
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

// @SCN-SSM-008
Then("the gate reds, naming the block whose title only mentions a scenario id", function () {
  assert.notEqual(
    cliExitCode,
    0,
    `expected the scn-subissue gate CLI to RED (non-zero exit) over a PR whose new ` +
      `behaviour is proven by a block that only NAMES scenario ids — a mention is not a ` +
      `cite — but it exited ${cliExitCode}. Output:\n${cliOutput}`
  );
  assert.match(
    cliOutput,
    /uncited-unit-equivalent/,
    `expected an uncited-unit-equivalent violation kind, absent from:\n${cliOutput}`
  );
  // Teeth: the violation must NAME the offending block, and the block's name is the
  // very sentence that fooled the old scan — so this also pins that the message is
  // reported verbatim rather than sanitised of the ids that misled it.
  assert.match(
    cliOutput,
    new RegExp(PROSE_BLOCK.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
    `expected the violation to NAME the prose-titled block "${PROSE_BLOCK}", but it was ` +
      `absent from:\n${cliOutput}`
  );
});
