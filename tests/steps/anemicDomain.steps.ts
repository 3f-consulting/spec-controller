/**
 * Step definitions for features/anemic-domain.feature (the @ANM anemic-domain static check).
 *
 * @SCN-ANM-001 — the bidirectional @integration evidence marker (Evidence Manifesto §9).
 *
 * THIS ARM DRIVES THE REAL DECISION OVER THE REAL TREE. The `When` reads the repository's
 * tracked files exactly as the CLI does and reconciles them through the same exported
 * function CI runs — never a re-implementation of the rule, which would agree by
 * coincidence and drift the moment either side changed.
 *
 * THE REAL TREE IS CLEAN TODAY, so the Thens that pin the RULE plant paths through that
 * same function while the last Then asserts the real measurement. Both halves are needed:
 * the clean tree alone would pass just as well if the decision returned nothing whatever
 * it was handed (the vacuity the planted violation rules out), and the plants alone would
 * say nothing about the repository this check is supposed to hold.
 *
 * THE DECISION IS IMPORTED, THE SCRIPT IS SHELLED. The planted Thens call the same exported
 * function `lintAnemicDomainCli` calls, so this arm cannot agree with the check by
 * coincidence; the clean-tree Then runs `pnpm lint:anemic-domain` itself, so it is a
 * statement about the script CI runs — exit code and all — rather than about a function that
 * happens to share its name.
 *
 * Evidence: @SCN-ANM-001 (3F-2417) — the anemic-domain static check.
 */

import { Given, When, Then } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { findProceduralLayerModules } from "../../packages/spec-controller/static-checks/anemicDomain.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

// @SCN-ANM-001
/** A domain path for a module named `stem` — planted, never a real file. */
const DOMAIN_PATH = (stem: string): string => `packages/core/src/domain/${stem}`;

/** The same procedural-layer name at an edge, where it is ordinary and legitimate. */
const EDGE_PATH = "packages/core/src/render/renderService.ts";

let trackedFiles: readonly string[];
let checkExitCode: number;
let checkOutput: string;

Given("every module tracked in the real spec-controller repository", function () {
  trackedFiles = execFileSync("git", ["ls-files"], {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  })
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "");

  // Vacuity floor: an empty file list would make the clean-tree Then below pass over
  // nothing, and it is the one input this arm does not control.
  assert.ok(trackedFiles.length > 0, "the repository must have tracked files to check");
});

When("the anemic-domain check runs over the real tree", function () {
  // THE REAL SCRIPT CI RUNS, exit code and all — not a hand-call of the decision. That is
  // what makes the clean-tree Then a statement about `pnpm lint:anemic-domain` rather than
  // about a function that happens to share its name (the @SCN-NCR-001 shape).
  try {
    checkOutput = execFileSync("pnpm", ["lint:anemic-domain"], {
      cwd: repoRoot,
      encoding: "utf8",
    });
    checkExitCode = 0;
  } catch (err) {
    const failure = err as { status?: number; stdout?: string; stderr?: string };
    checkExitCode = typeof failure.status === "number" ? failure.status : 1;
    checkOutput = `${failure.stdout ?? ""}${failure.stderr ?? ""}`;
  }
});

Then(
  "a module named for a procedural layer under a domain directory is a violation",
  function () {
    const planted = DOMAIN_PATH("ledgerOperations.ts");
    const found = findProceduralLayerModules([...trackedFiles, planted]);
    assert.deepEqual(
      found,
      [{ path: planted, word: "operations" }],
      `${planted} must be the sole violation — a concept's behaviour lifted into a module beside it`,
    );
  },
);

Then("the same name outside a domain directory is not", function () {
  // The pairing that pins the word "domain". Same procedural-layer name, one directory
  // over; a renderService at the edge is ordinary and must not red.
  const found = findProceduralLayerModules([...trackedFiles, EDGE_PATH]);
  assert.deepEqual(
    found,
    [],
    `${EDGE_PATH} must NOT red — the scope is a domain directory, not the word`,
  );
});

Then("a module named for its concept is not", function () {
  const found = findProceduralLayerModules([...trackedFiles, DOMAIN_PATH("posting.ts")]);
  assert.deepEqual(found, [], "a module named for its concept must not red");
});

Then("the check passes clean over the real tree", function () {
  assert.equal(
    checkExitCode,
    0,
    `expected \`pnpm lint:anemic-domain\` to pass (exit 0) over the real tree, but it ` +
      `exited ${checkExitCode}. Output:\n${checkOutput}`,
  );
  assert.deepEqual(
    findProceduralLayerModules(trackedFiles).map((found) => `${found.path} (${found.word})`),
    [],
    "no domain module in the real tree may be named for a procedural layer",
  );
});
