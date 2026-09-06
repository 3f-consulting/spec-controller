/**
 * @integration for @SCN-SSM-018 — the THIRD SENTENCE: a behaviour-bearing @SCN change on an
 * internal PR with no ticket handle AND no pull request body to read is examined by nothing, and
 * the gate says so rather than passing it.
 *
 * WHY THIS ARM HAS TO BE A SUBPROCESS AND NOT A CALL. The whole subject is what the PROCESS's
 * environment does or does not carry: `PR_BODY` absent is a different fact from `PR_BODY` present
 * and empty, and an in-process call has no environment to be absent from. The @unit arm in
 * tests/checks/scnSubIssueGate.test.ts proves the DECISION over the
 * injected boolean; this proves the READ that produces it — that the CLI still distinguishes an
 * unset variable from an empty one by the time the decision is asked.
 *
 * `env` IS BUILT BY DELETION, NOT BY SPREADING A BLANK OVER IT. `{ ...process.env, PR_BODY: "" }`
 * is the OTHER state — the one @SCN-SSM-002 pins redding — so the fixture below removes the key
 * outright. A fixture that set it empty here would pass against an implementation that had
 * collapsed the pair, which is the fault this row exists to catch.
 *
 * @SCN-SSM-018 — bidirectional evidence marker. Grepping SCN-SSM-018 returns the scenario, this
 * step block, and the @unit arm in tests/checks/scnSubIssueGate.test.ts.
 *
 * Parent: 3F-3139 (collapse the fitness characteristics to one `@fitness` tag); this row is what
 * makes `lint:scn-subissues` safe to convert, so it is sequenced ahead of the conversion.
 */

import { Given, When, Then } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { NOT_EXAMINED_EXIT_CODE } from "../checks/scnSubIssueGate.js";

// @SCN-SSM-018
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const tsxBin = path.join(repoRoot, "node_modules/.bin/tsx");
const cliPath = path.join(
  repoRoot,
  "tests/checks/lintScnSubIssuesCli.ts"
);

/** The bare @SCN code the fixture PR adds without binding it to a ticket. */
const UNBOUND_CODE = "SCN-LDG-003";

let fixtureDir: string;
let baseSha: string;
let cliExitCode: number;
let cliOutput: string;

function git(args: string[]): string {
  return execFileSync("git", args, { cwd: fixtureDir, encoding: "utf8" }).trim();
}

// @SCN-SSM-018
Given(
  "an internal PR that adds a behaviour-bearing @SCN code, carries no 3F ticket handle, and has no pull request body to read",
  function () {
    fixtureDir = fs.mkdtempSync(path.join(os.tmpdir(), "scn-ssm-018-"));
    execFileSync("git", ["init", "-q", "-b", "main"], { cwd: fixtureDir });
    git(["config", "user.email", "fixture@example.com"]);
    git(["config", "user.name", "Fixture"]);
    git(["config", "commit.gpgsign", "false"]);

    const featuresDir = path.join(fixtureDir, "features");
    fs.mkdirSync(featuresDir);
    const featureFile = path.join(featuresDir, "target.feature");

    // Base commit: the feature surface WITHOUT the behaviour-bearing code.
    fs.writeFileSync(
      featureFile,
      "@SSM\nFeature: fixture surface\n\n  Scenario: a pre-existing scenario\n    Given nothing\n"
    );
    git(["add", "features/target.feature"]);
    git(["commit", "-q", "-m", "base: fixture feature surface"]);
    baseSha = git(["rev-parse", "HEAD"]);

    // HEAD commit: ADD a behaviour-bearing @SCN tag line. The commit subject carries no
    // [3F-NNN] prefix and the branch below carries no handle, so nothing binds the code —
    // and with no body to read, whether an exemption was claimed for it has no answer.
    fs.writeFileSync(
      featureFile,
      "@SSM\nFeature: fixture surface\n\n" +
        "  Scenario: a pre-existing scenario\n    Given nothing\n\n" +
        `  @unit @${UNBOUND_CODE}\n  Scenario: a newly added behaviour\n    Given something new\n`
    );
    git(["add", "features/target.feature"]);
    git(["commit", "-q", "-m", "add a new behaviour-bearing scenario"]);
  }
);

// @SCN-SSM-018
When("the scenario sub-issue gate runs over the no-body fixture PR", function () {
  // PR_BODY is REMOVED rather than blanked — see the header. The inherited environment may
  // legitimately carry one (this suite itself can be run from a pull request checkout), so the
  // key is deleted from the copy after the spread rather than trusted to be absent.
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    GITHUB_BASE_SHA: baseSha,
    GITHUB_HEAD_REF: "feature/no-handle",
  };
  delete env["PR_BODY"];

  try {
    cliOutput = execFileSync(tsxBin, [cliPath], { cwd: fixtureDir, encoding: "utf8", env });
    cliExitCode = 0;
  } catch (err) {
    const e = err as { status?: number; stdout?: string; stderr?: string };
    cliExitCode = typeof e.status === "number" ? e.status : 1;
    cliOutput = `${e.stdout ?? ""}${e.stderr ?? ""}`;
  }
});

// @SCN-SSM-018
Then(
  "the gate reports the code as examined by nothing, and neither passes it nor reds it",
  function () {
    // NOT A PASS. This is the half the whole row exists for: "do not fail on it" resolving to a
    // green is the silence fault, and it would be invisible — a pass looks exactly like a pass.
    assert.notEqual(
      cliExitCode,
      0,
      `expected the gate NOT to pass a code it could not examine, but it exited 0. Output:\n${cliOutput}`
    );
    assert.doesNotMatch(
      cliOutput,
      /scn-subissue lint: OK/,
      `expected no OK line for a code the gate examined nothing about. Output:\n${cliOutput}`
    );

    // NOT A RED EITHER. An absent pull request body is the ordinary state off a pull request, so
    // a violation here would red honest work for a fact about where it ran.
    assert.notEqual(
      cliExitCode,
      1,
      `expected the gate NOT to red a code it could not examine, but it exited 1 — the ` +
        `violation exit code. Output:\n${cliOutput}`
    );
    assert.doesNotMatch(
      cliOutput,
      /scn-subissue lint: FAILED/,
      `expected no FAILED line for a code the gate examined nothing about. Output:\n${cliOutput}`
    );

    // THE THIRD ANSWER, SAID OUT LOUD AND KEYED TO THE CODE. A third exit code nobody can read
    // off the output is a second silence.
    assert.equal(
      cliExitCode,
      NOT_EXAMINED_EXIT_CODE,
      `expected the gate's own not-examined exit code ${NOT_EXAMINED_EXIT_CODE}, got ` +
        `${cliExitCode}. Output:\n${cliOutput}`
    );
    assert.match(
      cliOutput,
      /NOT EXAMINED/,
      `expected the gate to SAY it examined nothing, absent from:\n${cliOutput}`
    );
    assert.match(
      cliOutput,
      new RegExp(UNBOUND_CODE),
      `expected the not-examined report to NAME the code ${UNBOUND_CODE} it could not answer ` +
        `for, but it was absent from:\n${cliOutput}`
    );
  }
);
