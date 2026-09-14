/**
 * Step definitions for features/self-reconciliation.feature (the @SLF feature).
 *
 * @SCN-SLF-008 — the bidirectional @integration evidence marker (Evidence Manifesto §9).
 *
 * WHY THIS ARM SPAWNS THE REAL BINARY RATHER THAN CALLING checkUnknownFlags. The claim is about
 * what a consumer SEES when their pin is behind their tree: the message, the stream it lands on,
 * and the exit status, together. A unit call would prove the string builder agrees with itself
 * and would say nothing about whether the caller still routes it to stderr, or still exits 2 —
 * which is precisely the half that must not move.
 *
 * AND IT SPAWNS THE WORKSPACE CLI BY PATH, as every other CLI arm in this corpus does. 3F-3105
 * later pins this repository to a published spec-controller; that pin moves what `pnpm
 * spec-controller` resolves to, and this arm must keep asserting the behaviour of the source
 * under change rather than of whatever version happens to be pinned.
 *
 * THE VERSION IS READ FROM THE PACKAGE MANIFEST, NOT HARD-CODED — a hard-coded version would red
 * on the next bump for a reason that has nothing to do with this behaviour. The teeth are that
 * the refusal must CONTAIN that version: a builder that forgets to interpolate it produces a
 * message without the string and reds here.
 */

import { Given, When, Then } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { spawnSync, type SpawnSyncReturns } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * A flag THIS version's registry does not name — the shape any version skew produces, whichever
 * direction it runs in. `--fitness` is a real retired flag rather than an invented one: it was the
 * measured skew case on 3F-3105 when the pinned reader was behind the tree, and the @fitness
 * collapse then retired it, so today's tree is the side that does not accept it. Either way the
 * reader meets argv its own registry cannot bound, which is the one code path under test.
 *
 * Deliberately NOT `--ci-steps`: this tree ACCEPTS that flag, so it never reaches the refusal at
 * all — it falls through to the input-existence check, which is a different message entirely.
 */
const FLAG_THIS_VERSION_REFUSES = "--fitness";

let slf008Version = "";
let slf008Result: SpawnSyncReturns<string> | undefined;

// @SCN-SLF-008
Given(
  "a consumer runs a spec-controller pinned to a version that does not match the tree it is reading",
  function () {
    const manifest = join(
      process.cwd(),
      "packages",
      "spec-controller",
      "package.json",
    ) ;
    const pkg = JSON.parse(readFileSync(manifest, "utf8")) as { version?: unknown };
    assert.equal(
      typeof pkg.version,
      "string",
      "the spec-controller package manifest must carry a version for the refusal to name",
    );
    slf008Version = pkg.version as string;
    assert.notEqual(
      slf008Version,
      "",
      "an empty version would make the refusal's version claim vacuous",
    );
  },
);

// @SCN-SLF-008
When("that reader is handed a flag its own version does not accept", function () {
  const repoRoot = process.cwd();
  slf008Result = spawnSync(
    join(repoRoot, "node_modules", ".bin", "tsx"),
    [
      join(repoRoot, "packages", "spec-controller", "src", "cli-balance", "cli.ts"),
      "--features",
      "features",
      FLAG_THIS_VERSION_REFUSES,
      "a-report.json",
    ],
    { cwd: repoRoot, encoding: "utf8" },
  );
  assert.equal(slf008Result.error, undefined, "the CLI failed to spawn at all");
});

// @SCN-SLF-008
Then(
  "the refusal names the version that refused it, the flag, and the bump that cures it",
  function () {
    assert.ok(slf008Result !== undefined, "no run was made");
    const stderr = slf008Result.stderr;

    // THE REFUSAL GOES TO stderr, NOT stdout. stdout is where a verdict goes; a consumer piping
    // the report must not find a usage refusal inside it.
    assert.equal(
      slf008Result.stdout,
      "",
      "a refusal must not be written to stdout, where the reconciliation report goes",
    );

    // The flag — which the message already named before this scenario, and must keep naming.
    assert.ok(
      stderr.includes(FLAG_THIS_VERSION_REFUSES),
      `the refusal must name the flag it refused; got: ${stderr}`,
    );

    // The version doing the refusing — this is what makes skew legible from the log alone.
    assert.ok(
      stderr.includes(slf008Version),
      `the refusal must name the version that refused (${slf008Version}); got: ${stderr}`,
    );

    // The cure. A reader who can tell skew from a typo still has to be told what to do about it.
    assert.match(
      stderr,
      /bump the pin/i,
      `the refusal must name the bump as the cure; got: ${stderr}`,
    );
  },
);

// @SCN-SLF-008
Then("the run exits with the usage status, not a reconciliation verdict", function () {
  assert.ok(slf008Result !== undefined, "no run was made");
  // EXIT 2 AND NOT 1, DELIBERATELY. 1 is out-of-balance — a verdict about the target's books. An
  // argv the reader cannot read produced no verdict at all, and reporting one would be a lie. 2
  // is the usage status in the enumerated taxonomy (0 balanced / 1 out-of-balance / 2 usage / 3
  // pending-under-strict / 4 unsound / 5 nothing to reconcile), and it stays 2 because a genuine
  // typo is still a usage fault: naming the skew must not cost every adopter the ordinary reading.
  assert.equal(
    slf008Result.status,
    2,
    `expected the usage status 2, got ${String(slf008Result.status)}`,
  );
});
