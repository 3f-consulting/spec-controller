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
const RUN_ID = "2026-07-01T00-00-00Z";
const META: RunManifestMeta = { sourceSha: "abc1234", toolSha: "13ee47f", toolVersion: "0.1.0", mode: "balance", date: "2026-07-01" };

let storeRoot: string;
let repoRoot: string;
let repoStatusBefore: string;
let plan: KeptRunPlan;

function gitPorcelain(cwd: string): string {
  return execFileSync("git", ["status", "--porcelain"], { cwd, encoding: "utf8" });
}

Given("an injected store root and the run metadata for a kept run", function () {
  repoRoot = process.cwd();
  storeRoot = mkdtempSync(join(tmpdir(), "spec-controller-rmg002-"));
  assert.ok(
    !storeRoot.startsWith(repoRoot),
    `the injected store root must be OUTSIDE the repo tree; got ${storeRoot} under ${repoRoot}`
  );
  repoStatusBefore = gitPorcelain(repoRoot);
});

When("a kept run is executed with that metadata", function () {
  plan = executeKeptRun({ storeRoot, target: TARGET, runId: RUN_ID }, META, () => true) ?? assert.fail("the route wrote its report, so the run is kept");
});

Then(
  "run.yaml in the run directory parses back to schema_version 2, the run_id, target, source_sha, tool_sha, tool_version, mode, date, an empty purpose list, empty links, and the artefact filenames",
  function () {
    const manifestPath = join(plan.runDir, RUN_MANIFEST);
    assert.ok(existsSync(manifestPath), `expected run.yaml at ${manifestPath}; it does not exist`);
    const manifest = parse(readFileSync(manifestPath, "utf8")) as Record<string, unknown>;
    assert.equal(manifest.schema_version, 2, "schema_version is not 2");
    assert.equal(manifest.run_id, RUN_ID, "run_id is not the run-id");
    assert.equal(manifest.target, TARGET, "target is not the target name");
    assert.equal(manifest.source_sha, META.sourceSha, "source_sha is not the metadata SHA");
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

Then("the repo working tree gains nothing from the run.yaml stamp", function () {
  const manifestPath = join(plan.runDir, RUN_MANIFEST);
  assert.ok(
    manifestPath.startsWith(storeRoot),
    `expected run.yaml UNDER the injected temp root ${storeRoot}; got ${manifestPath}`
  );
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
