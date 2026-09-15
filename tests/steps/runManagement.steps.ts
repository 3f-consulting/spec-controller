/**
 * Step definitions for features/run-management.feature (the @RMG run-management feature).
 *
 * @SCN-RMG-001 — the bidirectional @integration evidence marker (Evidence Manifesto §9).
 * This arm exercises the REAL impure runner END-TO-END: executeKeptRun makes the run dir
 * under an INJECTED temp store root and routes the tool's --format outputs in by invoking
 * the REAL CLI as a black-box subprocess with the two file-dest --format specs. The
 * assertions read the REAL files off disk and the REAL repo git outcome.
 *
 * The @integration asserts BOTH operator rulings (a single assertion is insufficient):
 *   1. PATH STRUCTURE — the outputs land at EXACTLY <root>/<target>/<run-id>/, and the
 *      target/run-id NESTING is asserted hop-by-hop (1086's owned substructure), not merely
 *      "a directory got two files."
 *   2. LOCATION-AGNOSTIC teeth (two assertions, not one) — the files appear UNDER the
 *      injected temp root AND the repo working tree gains NOTHING (its own explicit
 *      assertion; asserting only "under temp root" would let a write-to-both bug pass green,
 *      and "repo never written" is the whole point of the injected root).
 *
 * Anti-watermelon (authoring constraint): every assertion reads the REAL
 * on-disk files + the REAL repo-untouched outcome, NEVER a re-run of the planKeptRun @unit.
 *
 * Self-contained module-level outcome + distinct step text, so it shares no outcome with the
 * other steps files (Cucumber registers step definitions globally).
 *
 * Evidence: @SCN-RMG-001 — the run-management layer.
 */

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

// A fixture target with a reconcilable spec corpus + result reports (reused from @FMT/@RPT).
const FIXTURE = {
  features: "tests/fixtures/evidence-observation/features",
  vitest: "tests/fixtures/evidence-observation/vitest.json",
  cucumber: "tests/fixtures/evidence-observation/cucumber.json",
};

const TARGET = "evidence observation-fixture";
// A supplied run-id (RMG-001 takes it as a param; the timestamp default / --run-id override
// is RMG-003). Colon-free so it is a legal path segment on every OS.
const RUN_ID = "2026-07-01T00-00-00Z";
// The run.yaml manifest metadata (RMG-002 added the parameter; this scenario asserts the
// dir + routed outputs, not run.yaml, but the runner requires the metadata to stamp it).
const META: RunManifestMeta = { sourceSha: "unknown", toolSha: "unknown", toolVersion: "0.1.0", mode: "balance", date: "2026-07-01" };

// @SCN-RMG-001 outcome (isolated per scenario by Cucumber).
let storeRoot: string; // the INJECTED temp store root (outside the repo tree)
let repoRoot: string; // the spec-controller checkout — the working tree that must gain nothing
let repoStatusBefore: string; // the repo working-tree snapshot before the kept run
let plan: KeptRunPlan; // the plan the runner realised

/** The repo working tree's porcelain status — the "gains nothing" before/after probe. */
function gitPorcelain(cwd: string): string {
  return execFileSync("git", ["status", "--porcelain"], { cwd, encoding: "utf8" });
}

// @SCN-RMG-001
Given("an injected store root and a target corpus to reconcile", function () {
  repoRoot = process.cwd();
  // The store root is INJECTED — a temp dir OUTSIDE the repo tree, so the "repo untouched"
  // teeth mean something (a run that wrote into the repo would violate its own assertion).
  storeRoot = mkdtempSync(join(tmpdir(), "spec-controller-rmg001-"));
  assert.ok(
    !storeRoot.startsWith(repoRoot),
    `the injected store root must be OUTSIDE the repo tree; got ${storeRoot} under ${repoRoot}`
  );
  assert.ok(
    existsSync(join(repoRoot, FIXTURE.features)),
    "the reconcilable fixture features dir is missing"
  );
  // Snapshot the repo working tree BEFORE the run — the "gains nothing" baseline (robust to
  // any ambient dirty outcome in local dev; clean-before → clean-after on CI).
  repoStatusBefore = gitPorcelain(repoRoot);
});

// @SCN-RMG-001
When("a kept run is executed for that target", function () {
  const abs = (p: string): string => join(repoRoot, p);
  // The REAL impure runner: it makes the run dir and hands the injected tool-invoker the
  // two file-dest --format specs. The invoker runs the REAL CLI as a black-box subprocess
  // (cwd = the temp store root, so nothing a mis-behaving tool wrote relative to cwd lands
  // in the repo), which writes the real files at the paths the scaffold chose.
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
    // [3F-1460] fix-to-canon (3F-1414): balance is now an unconditional CI gate, so this
    // out-of-balance fixture exits 1 (the report is still written IN FULL first). Pure
    // exit-expectation flip 0->1; every stored-artefact assertion is unchanged.
    assert.equal(
      result.status,
      1,
      `expected exit 1 (out-of-balance); got exit ${result.status}\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`
    );
  });
});

// @SCN-RMG-001
Then(
  // The '/' is escaped as '\/' so Cucumber Expressions read it as a literal slash (not
  // alternation); the feature step text keeps the plain <root>/<target>/<run-id>/ path.
  "the reconciliation document and the reconciliation JSON are written under the run directory <root>\\/<target>\\/<run-id>\\/",
  function () {
    // --- Assertion 1: PATH STRUCTURE — the target/run-id NESTING (1086's owned substructure).
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

    // Assert the nesting hop-by-hop: <root>/<target>/<run-id>/<filename> — a flat
    // <root>/<run-id> or <root>/<target> (a missing level) fails these.
    assert.equal(basename(expectedDoc), RECONCILIATION_DOCUMENT);
    assert.equal(basename(dirname(expectedDoc)), RUN_ID, "the run-id level is missing/misplaced");
    assert.equal(basename(dirname(dirname(expectedDoc))), TARGET, "the target level is missing/misplaced");
    assert.equal(
      dirname(dirname(dirname(expectedDoc))),
      storeRoot,
      "the nest is not rooted at the injected store root"
    );

    // The REAL files exist ON DISK at exactly that nested path (anti-watermelon: real files,
    // never a planKeptRun re-run), and carry the tool's real output (markdown / JSON).
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

// @SCN-RMG-001
Then("the repo working tree gains nothing", function () {
  // --- Assertion 2: LOCATION-AGNOSTIC teeth (TWO assertions, not one). ---
  // 2a: the outputs really landed UNDER the injected temp root.
  assert.ok(
    existsSync(plan.documentPath) && plan.documentPath.startsWith(storeRoot),
    `expected the outputs UNDER the injected temp root ${storeRoot}; document at ${plan.documentPath}`
  );
  assert.ok(
    plan.reconciliationJsonPath.startsWith(storeRoot),
    `expected the reconciliation JSON UNDER the injected temp root ${storeRoot}; got ${plan.reconciliationJsonPath}`
  );
  // 2b: the repo working tree gained NOTHING — its OWN explicit assertion. Asserting only
  // "written under temp root" would let a write-to-BOTH bug pass green; the injected root's
  // whole point is that the repo is NEVER written. Compare the porcelain before/after —
  // EQUAL means the kept run added nothing to the repo tree.
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
