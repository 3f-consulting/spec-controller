/**
 * Step definitions for features/scn-tags.feature (the @integration arm of
 * @SCN-STG-001).
 *
 * Anti-watermelon: this drives the REAL `lint:scn-tags` CLI (via tsx) over PLANTED
 * fixture trees under tests/fixtures/ — NEVER a re-run of the @unit fixture logic,
 * and NEVER a real features/ scenario. Over the tier-less fixture it must exit
 * non-zero naming the offending @SCN; over the fully tiered fixture it must exit 0.
 *
 * @SCN-STG-001 — bidirectional evidence marker for features/scn-tags.feature.
 */

import { Given, When, Then } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

// @SCN-STG-001
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const CLI = path.join(
  repoRoot,
  "packages",
  "spec-controller",
  "static-checks",
  "lintScnTagsCli.ts"
);
const TSX = path.join(repoRoot, "node_modules", ".bin", "tsx");

let exitCode: number;
let output: string;

// @SCN-STG-001
function runGuardOver(featuresDir: string): void {
  const result = spawnSync(TSX, [CLI, "--features", path.join(repoRoot, featuresDir)], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  assert.equal(result.error, undefined, `guard failed to spawn: ${result.error?.message}`);
  exitCode = typeof result.status === "number" ? result.status : 1;
  output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
}

// @SCN-STG-001
Given("the scn-tags guard", function () {
  // No fixture yet — each When drives the real CLI over a planted tree.
});

When("it runs over a features tree with a tier-less non-@wip scenario", function () {
  runGuardOver("tests/fixtures/scn-tags-tierless/features");
});

Then("it fails, naming the offending scenario", function () {
  assert.equal(
    exitCode,
    1,
    `expected the scn-tags guard to fail (exit 1) over the tier-less tree, but it exited ${exitCode}. Output:\n${output}`
  );
  assert.match(
    output,
    /SCN-TGT-001/,
    `expected the guard to name the offending @SCN (SCN-TGT-001); got:\n${output}`
  );
});

When(
  "it runs over a fully tiered tree where every @SCN scenario names a tier or is @wip",
  function () {
    runGuardOver("tests/fixtures/scn-tags-compliant/features");
  }
);

Then("it passes", function () {
  assert.equal(
    exitCode,
    0,
    `expected the scn-tags guard to pass (exit 0) over the fully tiered tree, but it exited ${exitCode}. Output:\n${output}`
  );
});

// @SCN-STG-002
Given("the scn-tags static check", function () {
  // No fixture yet — each When drives the real CLI over a planted tree.
});

// @SCN-STG-002
When(
  "it runs over a features tree whose @SCN scenario carries a mistyped tier tag",
  function () {
    runGuardOver("tests/fixtures/scn-tags-unrecognised/features");
  }
);

// @SCN-STG-002
Then("it fails, naming the unrecognised tag and the tier it resembles", function () {
  assert.equal(
    exitCode,
    1,
    `expected the scn-tags static check to fail (exit 1) over a tree whose @SCN scenario ` +
      `carries @untit, but it exited ${exitCode}. Output:\n${output}`
  );
  assert.match(
    output,
    /@untit/,
    `expected the offending tag to be NAMED — "something is wrong in this file" is not a ` +
      `usable message; got:\n${output}`
  );
  assert.match(
    output,
    /@unit/,
    `expected the near-miss tier (@unit) to be named alongside @untit; got:\n${output}`
  );
});

// @SCN-STG-003
When(
  "it runs over a features tree whose tiered @SCN scenario also carries a recognised community deferral tag",
  function () {
    runGuardOver("tests/fixtures/scn-tags-community/features");
  }
);
