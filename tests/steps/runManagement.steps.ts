import { Given, When, Then, After } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import {
  executeKeptRun,
  RECONCILIATION_DOCUMENT,
  RECONCILIATION_JSON,
  type KeptRunPlan,
  type RunManifestMeta,
} from "../../packages/spec-controller/src/run-management/keptRun.js";
import { NODE, SPEC_CONTROLLER_ARGV } from "./support/builtCli.js";

const FIXTURE = {
  features: "tests/fixtures/evidence-observation/features",
  vitest: "tests/fixtures/evidence-observation/vitest.json",
  cucumber: "tests/fixtures/evidence-observation/cucumber.json",
};

const TARGET = "evidence observation-fixture";
const RUN_ID = "2026-07-01T00-00-00Z";
const META: RunManifestMeta = { sourceSha: "unknown", toolSha: "unknown", toolVersion: "0.1.0", mode: "balance", date: "2026-07-01" };

let storeRoot: string;
let repoRoot: string;
let repoStatusBefore: string;
let plan: KeptRunPlan;

function gitPorcelain(cwd: string): string {
  return execFileSync("git", ["status", "--porcelain"], { cwd, encoding: "utf8" });
}

Given("an injected store root and a target corpus to reconcile", function () {
  repoRoot = process.cwd();
  storeRoot = mkdtempSync(join(tmpdir(), "spec-controller-rmg001-"));
  assert.ok(
    !storeRoot.startsWith(repoRoot),
    `the injected store root must be OUTSIDE the repo tree; got ${storeRoot} under ${repoRoot}`
  );
  assert.ok(
    existsSync(join(repoRoot, FIXTURE.features)),
    "the reconcilable fixture features dir is missing"
  );
  repoStatusBefore = gitPorcelain(repoRoot);
});

When("a kept run is executed for that target", function () {
  const abs = (p: string): string => join(repoRoot, p);
  plan = executeKeptRun({ storeRoot, target: TARGET, runId: RUN_ID }, META, (formatSpecs) => {
    const formatArgs = formatSpecs.flatMap((spec) => ["--format", spec]);
    const result = spawnSync(
      NODE,
      [
        ...SPEC_CONTROLLER_ARGV,
        "balance",
        "--features", abs(FIXTURE.features),
        "--vitest", abs(FIXTURE.vitest),
        "--cucumber", abs(FIXTURE.cucumber),
        "--target", TARGET,
        ...formatArgs,
      ],
      { cwd: storeRoot, encoding: "utf8" }
    );
    assert.equal(
      result.error,
      undefined,
      `the tool subprocess failed to spawn: ${result.error?.message}`
    );
    assert.equal(
      result.status,
      1,
      `expected exit 1 (out-of-balance); got exit ${result.status}\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`
    );
    return true;
  }) ?? assert.fail("the route wrote its report, so the run is kept");
});

function assertNestedHopByHop(expectedDoc: string): void {
  assert.equal(basename(expectedDoc), RECONCILIATION_DOCUMENT);
  assert.equal(basename(dirname(expectedDoc)), RUN_ID, "the run-id level is missing/misplaced");
  assert.equal(basename(dirname(dirname(expectedDoc))), TARGET, "the target level is missing/misplaced");
  assert.equal(
    dirname(dirname(dirname(expectedDoc))),
    storeRoot,
    "the nest is not rooted at the injected store root"
  );
}

Then(
  "the reconciliation document and the reconciliation JSON are written under the run directory <root>\\/<target>\\/<run-id>\\/",
  function () {
    const expectedRunDir = join(storeRoot, TARGET, RUN_ID);
    const expectedDoc = join(expectedRunDir, RECONCILIATION_DOCUMENT);
    const expectedReconciliationJson = join(expectedRunDir, RECONCILIATION_JSON);
    assert.equal(
      plan.runDir,
      expectedRunDir,
      `expected the run dir at <root>/<target>/<run-id>; got ${plan.runDir}`
    );
    assert.equal(plan.documentPath, expectedDoc, "document path is not at the nested run dir");
    assert.equal(
      plan.reconciliationJsonPath,
      expectedReconciliationJson,
      "reconciliation JSON path is not at the nested run dir"
    );

    assertNestedHopByHop(expectedDoc);

    assert.ok(
      existsSync(expectedDoc),
      `expected the reconciliation document at ${expectedDoc}; it does not exist`
    );
    assert.ok(
      existsSync(expectedReconciliationJson),
      `expected the reconciliation JSON at ${expectedReconciliationJson}; it does not exist`
    );
    const doc = readFileSync(expectedDoc, "utf8");
    assert.ok(
      doc.includes("| Scenario |"),
      `expected the document to carry the markdown ledger; got:\n${doc.slice(0, 300)}`
    );
    const reconciliation = JSON.parse(readFileSync(expectedReconciliationJson, "utf8")) as unknown;
    assert.ok(
      reconciliation !== null && typeof reconciliation === "object",
      "expected the reconciliation JSON file to be a real JSON object"
    );
  }
);

Then("the repo working tree gains nothing", function () {
  assert.ok(
    existsSync(plan.documentPath) && plan.documentPath.startsWith(storeRoot),
    `expected the outputs UNDER the injected temp root ${storeRoot}; document at ${plan.documentPath}`
  );
  assert.ok(
    plan.reconciliationJsonPath.startsWith(storeRoot),
    `expected the reconciliation JSON UNDER the injected temp root ${storeRoot}; got ${plan.reconciliationJsonPath}`
  );
  const repoStatusAfter = gitPorcelain(repoRoot);
  assert.equal(
    repoStatusAfter,
    repoStatusBefore,
    `expected the repo working tree to gain NOTHING from the kept run; git status changed:\n` +
      `before:\n${repoStatusBefore}\nafter:\n${repoStatusAfter}`
  );
});

After({ tags: "@SCN-RMG-001" }, function () {
  if (storeRoot && existsSync(storeRoot)) rmSync(storeRoot, { recursive: true, force: true });
});
