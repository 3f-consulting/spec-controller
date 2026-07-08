/**
 * Step definitions for features/no-committed-reports.feature (the @integration
 * arm of @SCN-NCR-001).
 *
 * Anti-watermelon: this runs the REAL `lint:no-committed-reports` guard over the
 * REAL checked-out repo tree and asserts its actual exit code — NEVER a re-run of
 * the @unit fixture logic. So it reds while the legacy reports are tracked under
 * runs/ and greens once they relocate to the outside store — the guard's
 * red→green IS the tidy-up move.
 *
 * @SCN-NCR-001 — bidirectional evidence marker for
 * features/no-committed-reports.feature.
 */

import { Given, When, Then } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

// @SCN-NCR-001
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

let guardExitCode: number;
let guardOutput: string;

// @SCN-NCR-001
Given("the real spec-controller repository tree", function () {
  // No fixture — the assertion runs against the actual checked-out working tree.
});

// @SCN-NCR-001
When("the no-committed-reports guard runs over the real tree", function () {
  try {
    guardOutput = execFileSync("pnpm", ["lint:no-committed-reports"], {
      cwd: repoRoot,
      encoding: "utf8",
    });
    guardExitCode = 0;
  } catch (err) {
    const e = err as { status?: number; stdout?: string; stderr?: string };
    guardExitCode = typeof e.status === "number" ? e.status : 1;
    guardOutput = `${e.stdout ?? ""}${e.stderr ?? ""}`;
  }
});

// @SCN-NCR-001
Then("the guard passes, reporting no report artefact tracked under the runs directory", function () {
  assert.equal(
    guardExitCode,
    0,
    `expected the no-committed-reports guard to pass (exit 0) over the real tree, ` +
      `but it exited ${guardExitCode}. Output:\n${guardOutput}`
  );
});
