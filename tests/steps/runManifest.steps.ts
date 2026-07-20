/**
 * Step definitions for @SCN-RMG-002 (features/run-management.feature) — a kept run stamps
 * run.yaml with the decided field set.
 *
 * @SCN-RMG-002 — the bidirectional @integration evidence marker (Evidence Manifesto §9):
 * grepping @SCN-RMG-002 returns this step-block + the Vitest [SCN-RMG-002] describe + the
 * feature scenario.
 *
 * This arm exercises the REAL impure runner: executeKeptRun makes the run dir under an
 * INJECTED temp store root (the `route` is a no-op — the --format routing is RMG-001's
 * proven concern; THIS scenario is the run.yaml stamp) and stamps run.yaml. The assertions
 * PARSE the REAL run.yaml off disk with a REAL YAML parser (`yaml.parse`) — anti-watermelon:
 * never a serialiseRunManifest re-run.
 *
 * Location-agnostic teeth (TWO assertions, not one): run.yaml lands UNDER the injected temp
 * root AND the repo working tree gains NOTHING (its own explicit git-porcelain before/after
 * assertion) — asserting only "under temp root" would let a write-into-the-repo bug pass.
 *
 * Self-contained module-level outcome + distinct step text (Cucumber registers step
 * definitions globally, so this shares no outcome with runManagement.steps.ts / @SCN-RMG-001).
 *
 * Evidence: @SCN-RMG-002 — the run-management layer.
 */

import { Given, When, Then, After } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parse } from "yaml";
import {
  executeKeptRun,
  RECONCILIATION_DOCUMENT,
  RUN_MANIFEST,
  RECONCILIATION_JSON,
  type KeptRunPlan,
  type RunManifestMeta,
} from "../../packages/spec-controller/src/run-management/keptRun.js";

const TARGET = "evidence observation-fixture";
// Colon-free so it is a legal path segment on every OS (the timestamp default is RMG-003).
const RUN_ID = "2026-07-01T00-00-00Z";
// The run.yaml manifest metadata the runner stamps (not derivable from the path spec).
const META: RunManifestMeta = { sourceSha: "abc1234", toolSha: "13ee47f", toolVersion: "0.1.0", mode: "balance", date: "2026-07-01" };

// @SCN-RMG-002 outcome (isolated per scenario by Cucumber).
let storeRoot: string; // the INJECTED temp store root (outside the repo tree)
let repoRoot: string; // the spec-controller checkout — the working tree that must gain nothing
let repoStatusBefore: string; // the repo working-tree snapshot before the kept run
let plan: KeptRunPlan; // the plan the runner realised

/** The repo working tree's porcelain status — the "gains nothing" before/after probe. */
function gitPorcelain(cwd: string): string {
  return execFileSync("git", ["status", "--porcelain"], { cwd, encoding: "utf8" });
}

// @SCN-RMG-002
Given("an injected store root and the run metadata for a kept run", function () {
  repoRoot = process.cwd();
  // The store root is INJECTED — a temp dir OUTSIDE the repo tree, so the "repo untouched"
  // teeth mean something (a run that wrote run.yaml into the repo would violate its own
  // assertion).
  storeRoot = mkdtempSync(join(tmpdir(), "spec-controller-rmg002-"));
  assert.ok(
    !storeRoot.startsWith(repoRoot),
    `the injected store root must be OUTSIDE the repo tree; got ${storeRoot} under ${repoRoot}`
  );
  // Snapshot the repo working tree BEFORE the run — the "gains nothing" baseline.
  repoStatusBefore = gitPorcelain(repoRoot);
});

// @SCN-RMG-002
When("a kept run is executed with that metadata", function () {
  // The `route` is a no-op — the --format routing is RMG-001's proven concern; THIS scenario
  // is the run.yaml stamp. executeKeptRun still mkdirs the run dir and stamps run.yaml.
  plan = executeKeptRun({ storeRoot, target: TARGET, runId: RUN_ID }, META, () => {});
});

// @SCN-RMG-002
Then(
  "run.yaml in the run directory parses back to schema_version 2, the run_id, target, source_sha, tool_sha, tool_version, mode, date, an empty purpose list, empty links, and the artefact filenames",
  function () {
    const manifestPath = join(plan.runDir, RUN_MANIFEST);
    assert.ok(existsSync(manifestPath), `expected run.yaml at ${manifestPath}; it does not exist`);
    // Anti-watermelon: parse the REAL file off disk with a REAL YAML parser, NEVER a
    // serialiseRunManifest re-run.
    const manifest = parse(readFileSync(manifestPath, "utf8")) as Record<string, unknown>;
    assert.equal(manifest.schema_version, 2, "schema_version is not 2");
    assert.equal(manifest.run_id, RUN_ID, "run_id is not the run-id");
    assert.equal(manifest.target, TARGET, "target is not the target name");
    assert.equal(manifest.source_sha, META.sourceSha, "source_sha is not the metadata SHA");
    // The TOOL's identity (3F-1916).
    assert.equal(manifest.tool_sha, META.toolSha, "tool_sha is not the metadata tool SHA");
    assert.equal(manifest.tool_version, META.toolVersion, "tool_version is not the metadata tool version");
    assert.equal(manifest.mode, META.mode, "mode is not the metadata mode");
    assert.equal(manifest.date, META.date, "date is not the metadata date");
    assert.deepEqual(manifest.purpose, [], "purpose is not the empty ad-hoc default");
    assert.deepEqual(manifest.links, [], "links is not empty");
    assert.deepEqual(
      manifest.artefacts,
      { document: RECONCILIATION_DOCUMENT, reconciliation: RECONCILIATION_JSON },
      "artefacts do not carry the decided filenames"
    );
  }
);

// @SCN-RMG-002
Then("the repo working tree gains nothing from the run.yaml stamp", function () {
  // --- LOCATION-AGNOSTIC teeth (TWO assertions, not one). ---
  // Teeth 1: run.yaml really landed UNDER the injected temp root.
  const manifestPath = join(plan.runDir, RUN_MANIFEST);
  assert.ok(
    manifestPath.startsWith(storeRoot),
    `expected run.yaml UNDER the injected temp root ${storeRoot}; got ${manifestPath}`
  );
  // Teeth 2: the repo working tree gained NOTHING — its OWN explicit assertion. Asserting
  // only "under temp root" would let a write-to-BOTH bug pass green; the injected root's
  // whole point is that the repo is NEVER written. EQUAL porcelain before/after means the
  // kept run added nothing to the repo tree.
  const repoStatusAfter = gitPorcelain(repoRoot);
  assert.equal(
    repoStatusAfter,
    repoStatusBefore,
    `expected the repo working tree to gain NOTHING from the run.yaml stamp; git status changed:\n` +
      `before:\n${repoStatusBefore}\nafter:\n${repoStatusAfter}`
  );
});

After({ tags: "@SCN-RMG-002" }, function () {
  if (storeRoot && existsSync(storeRoot)) rmSync(storeRoot, { recursive: true, force: true });
});
