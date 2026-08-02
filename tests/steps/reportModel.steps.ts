/**
 * Step definitions for features/report-model.feature (the @RMD whole-document report model).
 *
 * @SCN-RMD-001 — the bidirectional @integration evidence marker (Evidence Manifesto §9).
 * This arm exercises the REAL kept-run scaffold END-TO-END: executeKeptRun makes the run dir
 * under an INJECTED temp store root and routes the tool's --format outputs in by invoking the
 * REAL CLI as a black-box subprocess. The machine artefact must be named spec-reconciliation.json
 * (the renamed RECONCILIATION_JSON constant) and parse to ONE whole-document report model —
 * runProvenance + summary + evidenceObligations + warnings as top-level sections in
 * document order — so a run still writing ledger.json, or a JSON missing the assembled sections,
 * REDS. Anti-watermelon: the assertions read the REAL persisted file, never a renderJson re-run.
 *
 * Self-contained module-level outcome + distinct step text (Cucumber registers steps globally).
 *
 * Evidence: @SCN-RMD-001 — the report-model slice.
 */

import { Given, When, Then, After } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { executeKeptRun, type KeptRunPlan, type RunManifestMeta } from "../../packages/spec-controller/src/run-management/keptRun.js";

const FIXTURE = {
  features: "tests/fixtures/evidence-observation/features",
  vitest: "tests/fixtures/evidence-observation/vitest.json",
  cucumber: "tests/fixtures/evidence-observation/cucumber.json",
};
const TARGET = "evidence observation-fixture";
const RUN_ID = "2026-07-02T00-00-00Z";
const META: RunManifestMeta = { sourceSha: "unknown", toolSha: "unknown", toolVersion: "0.1.0", mode: "balance", date: "2026-07-02" };

let rmdStoreRoot: string;
let rmdPlan: KeptRunPlan;
/**
 * The REAL process exit code the tool returned for this run (3F-1724). Captured so the
 * tally assertion can prove the invariant the bug broke: the summary's out-of-balance
 * count and the process exit code AGREE. Read off the subprocess, never re-derived.
 */
let rmdExitCode: number | null = null;

Given("a kept run over a target corpus under an injected store root", function () {
  const repoRoot = process.cwd();
  rmdStoreRoot = mkdtempSync(join(tmpdir(), "spec-controller-rmd001-"));
  assert.ok(
    !rmdStoreRoot.startsWith(repoRoot),
    `the injected store root must be OUTSIDE the repo tree; got ${rmdStoreRoot}`
  );
});

When("the kept run persists its machine artefact", function () {
  const repoRoot = process.cwd();
  const abs = (p: string): string => join(repoRoot, p);
  rmdPlan = executeKeptRun(
    { storeRoot: rmdStoreRoot, target: TARGET, runId: RUN_ID },
    META,
    (formatSpecs) => {
      const formatArgs = formatSpecs.flatMap((spec) => ["--format", spec]);
      const result = spawnSync(
        join(repoRoot, "node_modules", ".bin", "tsx"),
        [
          join(repoRoot, "packages", "spec-controller", "src", "cli-balance", "cli.ts"),
          "--features", abs(FIXTURE.features),
          "--vitest", abs(FIXTURE.vitest),
          "--cucumber", abs(FIXTURE.cucumber),
          "--target", TARGET,
          ...formatArgs,
        ],
        { cwd: rmdStoreRoot, encoding: "utf8" }
      );
      assert.equal(result.error, undefined, `the tool subprocess failed to spawn: ${result.error?.message}`);
      rmdExitCode = result.status;
      // [3F-1460] fix-to-canon (3F-1414): balance is now an unconditional CI gate, so this
      // out-of-balance fixture exits 1 (the JSON/markdown are written IN FULL first). Pure
      // exit-expectation flip 0->1; every persisted-content assertion is unchanged.
      assert.equal(
        result.status,
        1,
        `expected exit 1 (out-of-balance); got ${result.status}:\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`
      );
    }
  );
});

Then("the persisted artefact is named spec-reconciliation.json", function () {
  const expected = join(rmdPlan.runDir, "spec-reconciliation.json");
  assert.ok(
    existsSync(expected),
    `expected the machine artefact named spec-reconciliation.json at ${expected}; it does not exist ` +
      `(a run still writing ledger.json reds here)`
  );
});

Then(
  "it parses to one object carrying runProvenance, summary, and evidenceObligations as top-level sections in document order",
  function () {
    const parsed = JSON.parse(
      readFileSync(join(rmdPlan.runDir, "spec-reconciliation.json"), "utf8")
    ) as Record<string, unknown>;
    // The renamed provenance section opens the document; the summary is materialised.
    assert.ok(parsed.runProvenance, `expected a runProvenance section; got:\n${JSON.stringify(parsed, null, 2)}`);
    assert.ok(parsed.summary, `expected a materialised summary section; got keys: ${Object.keys(parsed).join(", ")}`);
    assert.ok(!("provenance" in parsed), `expected NO legacy "provenance" key; got keys: ${Object.keys(parsed).join(", ")}`);
    assert.ok(parsed.evidenceObligations, `expected a evidenceObligations section`);
    // The `warnings` top-level key was RETIRED entirely — a zero-evidence scenario is
    // a both-missing row in the ledger, not a separate axis.
    assert.ok(!("warnings" in parsed), `expected NO retired "warnings" key; got keys: ${Object.keys(parsed).join(", ")}`);
    // Document order: runProvenance and summary lead the document.
    const keys = Object.keys(parsed);
    assert.equal(keys[0], "runProvenance", `expected runProvenance first; got ${keys.join(", ")}`);
    assert.equal(keys[1], "summary", `expected summary second; got ${keys.join(", ")}`);
  }
);

/**
 * @SCN-RMD-001 (3F-1724) — the summary totals count EVERY Scenario Reconciliation.
 *
 * The Evidence Reconciliation is all Scenario Reconciliations assembled and the summary is
 * its totals (the maintainers' private notes); phantom / suspense reconciliations are
 * ALWAYS out-of-balance, so they count into the total and into out-of-balance. The fixture
 * corpus reconciles to 4 rows — 2 balanced scenarios, 1 phantom, 1 suspense — and
 * the run exits 1. Under the declared-only tally the summary read `total 2, balanced 2,
 * outOfBalance 0`: a FAILING run rendering a headline that reads as a clean pass, the exact
 * divergence 3F-1703 found in an adopter's repository dogfood.
 *
 * Anti-watermelon: every number is read off the REAL persisted spec-reconciliation.json and
 * the REAL process exit code — no re-run of assembleRenderInput, no re-derivation. The final
 * assertion pins the invariant the bug broke: the tally AGREES with the exit code.
 */
Then(
  "its summary totals count every Scenario Reconciliation, so the tally reads out-of-balance and agrees with the run's exit code",
  function () {
    const parsed = JSON.parse(
      readFileSync(join(rmdPlan.runDir, "spec-reconciliation.json"), "utf8")
    ) as {
      summary: {
        scenarioReconciliations: {
          total: number;
          balanced: number;
          outOfBalance: number;
          phantom: number;
          suspense: number;
        };
      };
      ledger: { scenarioReconciliations: { kind?: string; verdict: string }[] };
    };
    const totals = parsed.summary.scenarioReconciliations;
    const rows = parsed.ledger.scenarioReconciliations;

    // The total is EVERY row — declared + phantom + suspense — not the declared rows alone.
    assert.equal(
      totals.total,
      rows.length,
      `the summary total must count every Scenario Reconciliation; got total ${totals.total} over ${rows.length} rows ` +
        `(${JSON.stringify(totals)})`
    );
    // The out-of-balance count is every row whose verdict is out-of-balance — the phantom
    // and suspense rows among them (they are always out-of-balance).
    const outOfBalanceRows = rows.filter((r) => r.verdict === "out-of-balance").length;
    assert.equal(
      totals.outOfBalance,
      outOfBalanceRows,
      `the summary out-of-balance count must count every out-of-balance Scenario Reconciliation; got ` +
        `${totals.outOfBalance} against ${outOfBalanceRows} out-of-balance rows (${JSON.stringify(totals)})`
    );
    assert.equal(totals.balanced, rows.length - outOfBalanceRows, `balanced must be the remaining rows`);
    // phantom / suspense survive as sub-counts — a BREAKDOWN of the total, not a bucket outside it.
    assert.equal(totals.phantom, rows.filter((r) => r.kind === "phantom-scenario").length);
    assert.equal(totals.suspense, rows.filter((r) => r.kind === "suspense-scenario").length);
    assert.ok(totals.suspense >= 1, `the fixture must carry a suspense reconciliation; got ${JSON.stringify(totals)}`);

    // THE INVARIANT THE BUG BROKE: the tally agrees with the process exit code. The run is
    // out-of-balance (exit 1), so the tally must read out-of-balance too — never 0.
    assert.equal(rmdExitCode, 1, `expected the run to exit 1 (out-of-balance); got ${rmdExitCode}`);
    assert.ok(
      totals.outOfBalance > 0,
      `the run exited ${rmdExitCode} (out-of-balance) but the tally reads ${totals.outOfBalance} out-of-balance — ` +
        `a failing run rendering as a pass (${JSON.stringify(totals)})`
    );
  }
);

After({ tags: "@SCN-RMD-001" }, function () {
  if (rmdStoreRoot && existsSync(rmdStoreRoot)) rmSync(rmdStoreRoot, { recursive: true, force: true });
});

// @SCN-RMD-003
// Drives the REAL file-read pipeline over the evidence observation fixture (whose Vitest/Cucumber reports
// span attributed, phantom-id, and cites-no-scenario evidence observations) via the kept-run scaffold, then
// reads the persisted spec-reconciliation.json: the observed evidence must be under
// evidenceObservations (with phantomEvidenceObservations / suspenseEvidenceObservations at
// fine grain + locators), and the balancing identity must hold on the REAL file. Anti-watermelon:
// the identity is computed over the persisted atoms, never a countRuntimeEvidenceObservationKinds re-run.
let rmd003StoreRoot: string;
let rmd003Json: Record<string, unknown>;

Given("a reconciliation run whose observed evidence spans attributed, phantom-id, and cites-no-scenario evidence observations", function () {
  const repoRoot = process.cwd();
  rmd003StoreRoot = mkdtempSync(join(tmpdir(), "spec-controller-rmd003-"));
  assert.ok(!rmd003StoreRoot.startsWith(repoRoot), `store root must be OUTSIDE the repo; got ${rmd003StoreRoot}`);
});

When("the run persists spec-reconciliation.json", function () {
  const repoRoot = process.cwd();
  const abs = (p: string): string => join(repoRoot, p);
  const plan = executeKeptRun(
    { storeRoot: rmd003StoreRoot, target: TARGET, runId: RUN_ID },
    META,
    (formatSpecs) => {
      const formatArgs = formatSpecs.flatMap((spec) => ["--format", spec]);
      const result = spawnSync(
        join(repoRoot, "node_modules", ".bin", "tsx"),
        [
          join(repoRoot, "packages", "spec-controller", "src", "cli-balance", "cli.ts"),
          "--features", abs(FIXTURE.features),
          "--vitest", abs(FIXTURE.vitest),
          "--cucumber", abs(FIXTURE.cucumber),
          "--target", TARGET,
          ...formatArgs,
        ],
        { cwd: rmd003StoreRoot, encoding: "utf8" }
      );
      // [3F-1460] fix-to-canon (3F-1414): balance is now an unconditional CI gate, so this
      // out-of-balance fixture exits 1 (the JSON/markdown are written IN FULL first). Pure
      // exit-expectation flip 0->1; every persisted-content assertion is unchanged.
      assert.equal(result.status, 1, `expected exit 1 (out-of-balance); got ${result.status}:\n${result.stderr}`);
    }
  );
  rmd003Json = JSON.parse(readFileSync(join(plan.runDir, "spec-reconciliation.json"), "utf8"));
});

Then(
  "the phantom and suspense credits surface on their ledger rows and there is no evidenceObservations section",
  function () {
    // The evidenceObservations SECTION is RETIRED (3F-2103) — its raw totals re-home onto
    // summary.rawByRuntimeQualityCheck; the posted credits live on the ledger rows.
    assert.ok(!("evidenceObservations" in rmd003Json), `expected NO evidenceObservations section; got keys: ${Object.keys(rmd003Json).join(", ")}`);
    assert.ok(!("evidence observation" in rmd003Json), `expected NO legacy "evidence observation" key`);
    const summary = rmd003Json.summary as { rawByRuntimeQualityCheck?: Record<string, number> };
    assert.ok(summary.rawByRuntimeQualityCheck, `expected summary.rawByRuntimeQualityCheck (the re-homed headline); got summary keys: ${Object.keys(summary).join(", ")}`);
    const evidenceReconciliation = (rmd003Json.ledger as { scenarioReconciliations: unknown }).scenarioReconciliations as {
      scnId: string;
      kind?: string;
      qualityCheckReconciliations: { outcome: string; locator?: string }[];
    }[];
    // The phantom credit surfaces as a phantom-scenario row (@SCN-LDG-006), never a section detail
    // array. The fixture's 1 phantom (SCN-PHANTOM-999) surfaces as a phantom row carrying the locator.
    const phantom = evidenceReconciliation.find((s) => s.scnId === "SCN-PHANTOM-999");
    assert.ok(phantom, "expected a phantom-scenario row for SCN-PHANTOM-999 in the ledger");
    assert.equal(phantom!.kind, "phantom-scenario", "expected kind phantom-scenario");
    const phantomItem = phantom!.qualityCheckReconciliations[0];
    assert.equal(phantomItem?.outcome, "cites-unknown-scenario", "expected the cites-unknown-scenario outcome");
    assert.ok(
      typeof phantomItem?.locator === "string" && phantomItem.locator.length > 0,
      `expected the phantom item to carry a file locator; got ${JSON.stringify(phantomItem)}`
    );
    // The uncited credits surface as cites-no-scenario items on the suspense-scenario row
    // (@SCN-LDG-007), never a section detail array. The fixture's 2 uncited credits surface on the
    // "(no scenario)" row, each with a locator.
    const suspense = evidenceReconciliation.find((s) => s.scnId === "(no scenario)");
    assert.ok(suspense, "expected a suspense-scenario row (no scenario) in the ledger");
    assert.equal(suspense!.kind, "suspense-scenario", "expected kind suspense-scenario");
    const uncited = suspense!.qualityCheckReconciliations.filter((o) => o.outcome === "cites-no-scenario");
    assert.equal(uncited.length, 2, `expected 2 cites-no-scenario items on the suspense row; got ${JSON.stringify(suspense!.qualityCheckReconciliations)}`);
    for (const u of uncited) {
      assert.ok(typeof u.locator === "string" && u.locator.length > 0, `expected a file locator on the suspense item; got ${JSON.stringify(u)}`);
    }
  }
);

Then(
  "the sum of summary rawByRuntimeQualityCheck equals the attributed total plus the cites-unknown-scenario and cites-no-scenario counts",
  function () {
    // The identity now holds off the re-homed summary folds (3F-2103): raw = attributed +
    // cites-unknown-scenario + cites-no-scenario, all Ledger folds on summary — no section.
    const summary = rmd003Json.summary as {
      rawByRuntimeQualityCheck: Record<string, number>;
      testVolume: { onScenario: number; onPhantomScenario: number; onSuspenseScenario: number };
    };
    const raw = Object.values(summary.rawByRuntimeQualityCheck).reduce((n, v) => n + v, 0);
    const tv = summary.testVolume;
    assert.equal(raw, 5, `expected 5 raw evidence observations from the fixture; got ${raw}`);
    assert.equal(
      raw,
      tv.onScenario + tv.onPhantomScenario + tv.onSuspenseScenario,
      `the identity must balance on the persisted file: raw ${raw} = onScenario ${tv.onScenario} + onPhantomScenario ${tv.onPhantomScenario} + onSuspenseScenario ${tv.onSuspenseScenario}`
    );
  }
);

After({ tags: "@SCN-RMD-003" }, function () {
  if (rmd003StoreRoot && existsSync(rmd003StoreRoot)) rmSync(rmd003StoreRoot, { recursive: true, force: true });
});

// @SCN-RMD-005
// Drives the REAL CLI over a COMBINED fixture spanning all three totals: the usg features
// (which declare @lint=lint:foo on SCN-TGT-001) + the usg ci.yml/package.json (CI runs lint:foo
// + lint:bar, only lint:foo declared) + the evidence observation fixture's Vitest/Cucumber reports (attributed
// + phantom + cites-no-scenario evidence observations). Reading the persisted spec-reconciliation.json back, the
// summary must materialise all three totals AND both Σ = Σ identities must hold ON THE FILE.
// Anti-watermelon: the identities are computed over the persisted summary numbers, never a re-run.
const RMD005_FIXTURE = {
  features: "tests/fixtures/usg/features",
  vitest: "tests/fixtures/evidence-observation/vitest.json",
  cucumber: "tests/fixtures/evidence-observation/cucumber.json",
  ci: "tests/fixtures/usg/ci.yml",
  packageJson: "tests/fixtures/usg/package.json",
};
let rmd005StoreRoot: string;
let rmd005Json: Record<string, unknown>;

Given(
  "a reconciliation run whose evidence spans attributed, phantom-id, and cites-no-scenario evidence observations and whose CI runs a guard no @lint declares",
  function () {
    const repoRoot = process.cwd();
    rmd005StoreRoot = mkdtempSync(join(tmpdir(), "spec-controller-rmd005-"));
    assert.ok(!rmd005StoreRoot.startsWith(repoRoot), `store root must be OUTSIDE the repo; got ${rmd005StoreRoot}`);
  }
);

When("the reconciliation run persists spec-reconciliation.json", function () {
  const repoRoot = process.cwd();
  const abs = (p: string): string => join(repoRoot, p);
  const plan = executeKeptRun(
    { storeRoot: rmd005StoreRoot, target: TARGET, runId: RUN_ID },
    META,
    (formatSpecs) => {
      const formatArgs = formatSpecs.flatMap((spec) => ["--format", spec]);
      const result = spawnSync(
        join(repoRoot, "node_modules", ".bin", "tsx"),
        [
          join(repoRoot, "packages", "spec-controller", "src", "cli-balance", "cli.ts"),
          "--features", abs(RMD005_FIXTURE.features),
          "--vitest", abs(RMD005_FIXTURE.vitest),
          "--cucumber", abs(RMD005_FIXTURE.cucumber),
          "--ci", abs(RMD005_FIXTURE.ci),
          "--package-json", abs(RMD005_FIXTURE.packageJson),
          "--target", TARGET,
          ...formatArgs,
        ],
        { cwd: rmd005StoreRoot, encoding: "utf8" }
      );
      // [3F-1460] fix-to-canon (3F-1414): balance is now an unconditional CI gate, so this
      // out-of-balance fixture exits 1 (the JSON/markdown are written IN FULL first). Pure
      // exit-expectation flip 0->1; every persisted-content assertion is unchanged.
      assert.equal(result.status, 1, `expected exit 1 (out-of-balance); got ${result.status}:\n${result.stderr}`);
    }
  );
  rmd005Json = JSON.parse(readFileSync(join(plan.runDir, "spec-reconciliation.json"), "utf8"));
});

Then(
  "the summary carries the test-volume totals, the static-guard totals, and the lint tally",
  function () {
    const summary = rmd005Json.summary as {
      testVolume?: { totalEvidenceObservations: number; onScenario: number; onPhantomScenario: number; onSuspenseScenario: number };
      staticGuards?: { runningGuardCount: number; uncitedStaticGuardCount: number };
      lint?: { satisfied: number; total: number };
    };
    assert.ok(summary, `expected a summary section; got keys: ${Object.keys(rmd005Json).join(", ")}`);
    // Test-volume totals — the evidence observation fixture: 5 raw = 1 on a scenario + 2
    // on phantom scenarios + 2 on the suspense scenario (onScenario EXCLUDES onPhantomScenario).
    assert.ok(summary.testVolume, `expected summary.testVolume; got summary keys: ${Object.keys(summary).join(", ")}`);
    assert.deepEqual(summary.testVolume, { totalEvidenceObservations: 5, onScenario: 1, onPhantomScenario: 2, onSuspenseScenario: 2 });
    // Static-guard totals — the usg fixture: 2 guards run, 1 uncited (lint:bar); the named
    // one (lint:foo) is implicit (running − uncited = 1).
    assert.ok(summary.staticGuards, `expected summary.staticGuards; got summary keys: ${Object.keys(summary).join(", ")}`);
    assert.deepEqual(summary.staticGuards, { runningGuardCount: 2, uncitedStaticGuardCount: 1 });
    // Lint tally — the static-only cut: lint:foo declared by SCN-TGT-001 and enforced in CI →
    // 1 of 1 satisfied (the runtime evidence obligations do NOT count).
    assert.ok(summary.lint, `expected summary.lint; got summary keys: ${Object.keys(summary).join(", ")}`);
    assert.deepEqual(summary.lint, { satisfied: 1, total: 1 });
  }
);

Then(
  "the test-volume identity Σ rawByRuntimeQualityCheck = onScenario + onPhantomScenario + onSuspenseScenario holds on the persisted summary",
  function () {
    const tv = (rmd005Json.summary as { testVolume: { totalEvidenceObservations: number; onScenario: number; onPhantomScenario: number; onSuspenseScenario: number } }).testVolume;
    assert.equal(
      tv.totalEvidenceObservations,
      tv.onScenario + tv.onPhantomScenario + tv.onSuspenseScenario,
      `the test-volume identity must balance on the file: ${tv.totalEvidenceObservations} = ${tv.onScenario} + ${tv.onPhantomScenario} + ${tv.onSuspenseScenario}`
    );
  }
);

Then(
  "the persisted static-guard summary carries runningGuardCount and uncitedStaticGuardCount with named implicit",
  function () {
    const sg = (rmd005Json.summary as { staticGuards: { runningGuardCount: number; uncitedStaticGuardCount: number } }).staticGuards;
    // named is IMPLICIT: running − uncited, and non-negative by the counter's
    // internal completeness invariant. No `ciGuards` / `named` field on the persisted surface.
    const named = sg.runningGuardCount - sg.uncitedStaticGuardCount;
    assert.ok(
      named >= 0,
      `the implicit named count must be non-negative: ${sg.runningGuardCount} running − ${sg.uncitedStaticGuardCount} uncited = ${named}`
    );
    assert.ok(
      !("ciGuards" in sg) && !("named" in sg),
      `the persisted static-guard summary must carry only { runningGuardCount, uncitedStaticGuardCount }; got keys: ${Object.keys(sg).join(", ")}`
    );
  }
);

After({ tags: "@SCN-RMD-005" }, function () {
  if (rmd005StoreRoot && existsSync(rmd005StoreRoot)) rmSync(rmd005StoreRoot, { recursive: true, force: true });
});

// @SCN-RMD-006
// Drives the REAL CLI over the byfeature fixture (a @CVL-coded feature with an out-of-balance
// SCN-CVL-001 + an uncoded feature declaring SCN-XYZ-001), persisting BOTH machine artefacts via
// --format json:<path> + md:<path>. The persisted spec-reconciliation.json must carry the feature
// titles keyed by feature code (CVL→config-vocabulary-lint; the uncoded feature omitted) — the
// slice-3 JSON-shape change — and the persisted spec-reconciliation.md must name the coded
// out-of-balance feature in full, sourced from the model. Anti-watermelon: the assertions read the
// REAL persisted files, never a renderJson/renderMarkdown re-run.
const RMD006_FEATURES = "tests/fixtures/byfeature/features";
let rmd006Dir: string;
let rmd006Json: Record<string, unknown>;
let rmd006Md: string;

Given("a reconciliation over a target corpus whose feature files declare their feature codes", function () {
  rmd006Dir = mkdtempSync(join(tmpdir(), "spec-controller-rmd006-"));
});

When("the coded-corpus reconciliation run persists its machine artefacts", function () {
  const repoRoot = process.cwd();
  const abs = (p: string): string => join(repoRoot, p);
  const jsonPath = join(rmd006Dir, "spec-reconciliation.json");
  const mdPath = join(rmd006Dir, "spec-reconciliation.md");
  const result = spawnSync(
    join(repoRoot, "node_modules", ".bin", "tsx"),
    [
      join(repoRoot, "packages", "spec-controller", "src", "cli-balance", "cli.ts"),
      "--features", abs(RMD006_FEATURES),
      "--target", "byfeature-fixture",
      "--format", `json:${jsonPath}`,
      "--format", `md:${mdPath}`,
    ],
    { cwd: rmd006Dir, encoding: "utf8" }
  );
  // [3F-1460] fix-to-canon (3F-1414): unconditional CI gate — out-of-balance fixture now
  // exits 1 (report written IN FULL first). Pure exit-expectation flip 0->1.
  assert.equal(result.status, 1, `expected exit 1 (out-of-balance); got ${result.status}:\n${result.stderr}`);
  rmd006Json = JSON.parse(readFileSync(jsonPath, "utf8"));
  rmd006Md = readFileSync(mdPath, "utf8");
});

Then("the persisted spec-reconciliation.json carries the feature titles keyed by feature code", function () {
  // The feature titles nest under the small top-level `metadata` object (presentation
  // metadata), NOT a top-level `featureNames` sibling of the reconciliation records.
  const metadata = rmd006Json.metadata as { featureNames?: Record<string, string> } | undefined;
  assert.ok(
    metadata?.featureNames,
    `expected a metadata.featureNames section on the persisted JSON (the metadata shape change); got keys: ${Object.keys(rmd006Json).join(", ")}`
  );
  assert.ok(
    !("featureNames" in rmd006Json),
    `expected NO top-level featureNames sibling (moved under metadata); got keys: ${Object.keys(rmd006Json).join(", ")}`
  );
  const featureNames = metadata!.featureNames!;
  assert.equal(
    featureNames["CVL"],
    "config-vocabulary-lint",
    `expected CVL → config-vocabulary-lint; got ${JSON.stringify(featureNames)}`
  );
  assert.ok(
    !("XYZ" in featureNames),
    `expected the uncoded feature (no @<FFF> header) omitted from the titles; got ${JSON.stringify(featureNames)}`
  );
});

Then("the persisted spec-reconciliation.md names each out-of-balance feature in full, sourced from the model", function () {
  assert.ok(
    rmd006Md.includes("| config-vocabulary-lint (CVL) | 1 | SCN-CVL-001 |"),
    `expected the coded out-of-balance feature named in full; got:\n${rmd006Md}`
  );
});

After({ tags: "@SCN-RMD-006" }, function () {
  if (rmd006Dir && existsSync(rmd006Dir)) rmSync(rmd006Dir, { recursive: true, force: true });
});

// @SCN-RMD-007
// Drives the REAL render-from-saved-JSON round-trip end-to-end over the roundtrip fixture (a
// @CHK-coded feature with a balanced unit scenario + an out-of-balance integration scenario, so
// the by-feature cut names "checkout (CHK)"). Three REAL CLI invocations: (1) --format md → the
// direct render; (2) --format json:<path> → the banked spec-reconciliation.json; (3)
// --render-from-json <path> with NO --features/--vitest → the markdown regenerated from the JSON
// ALONE. The regenerated markdown must EQUAL the direct render (drift-equality) and name the coded
// out-of-balance feature in full. Anti-watermelon: the comparison is over the REAL subprocess
// stdout + the REAL persisted file, never an in-process renderReport re-run.
const RMD007_FIXTURE = {
  features: "tests/fixtures/roundtrip/features",
  vitest: "tests/fixtures/roundtrip/vitest.json",
};
let rmd007Dir: string;
let rmd007JsonPath: string;
let rmd007DirectMd: string;
let rmd007RegeneratedMd: string;

Given(
  "a reconciliation run persisted as spec-reconciliation.json alongside its direct markdown render",
  function () {
    const repoRoot = process.cwd();
    const tsxBin = join(repoRoot, "node_modules", ".bin", "tsx");
    const cli = join(repoRoot, "packages", "spec-controller", "src", "cli-balance", "cli.ts");
    const abs = (p: string): string => join(repoRoot, p);
    rmd007Dir = mkdtempSync(join(tmpdir(), "spec-controller-rmd007-"));
    rmd007JsonPath = join(rmd007Dir, "spec-reconciliation.json");
    const mdPath = join(rmd007Dir, "spec-reconciliation.md");
    // ONE reconciliation run emits BOTH the markdown and the JSON, so they share the SAME
    // provenance (run timestamp / source sha) — the round-trip regenerates THIS run's document,
    // not another run's (two invocations would carry different run-start timestamps).
    const result = spawnSync(
      tsxBin,
      [
        cli,
        "--features", abs(RMD007_FIXTURE.features),
        "--vitest", abs(RMD007_FIXTURE.vitest),
        "--target", "roundtrip-fixture",
        "--format", `md:${mdPath}`,
        "--format", `json:${rmd007JsonPath}`,
      ],
      { cwd: rmd007Dir, encoding: "utf8" }
    );
    // [3F-1460] fix-to-canon (3F-1414): unconditional CI gate — this out-of-balance
    // reconciliation run exits 1 (both md + json written IN FULL first, so the round-trip
    // regenerate below still holds). Pure exit-expectation flip 0->1.
    assert.equal(result.status, 1, `expected exit 1 (out-of-balance); got ${result.status}:\n${result.stderr}`);
    assert.ok(existsSync(rmd007JsonPath), `expected the banked JSON at ${rmd007JsonPath}`);
    assert.ok(existsSync(mdPath), `expected the direct markdown render at ${mdPath}`);
    rmd007DirectMd = readFileSync(mdPath, "utf8");
  }
);

When("the markdown is regenerated from the saved spec-reconciliation.json alone", function () {
  const repoRoot = process.cwd();
  const tsxBin = join(repoRoot, "node_modules", ".bin", "tsx");
  const cli = join(repoRoot, "packages", "spec-controller", "src", "cli-balance", "cli.ts");
  // ONLY --render-from-json <path> — NO --features / --vitest, proving the JSON alone suffices
  // (no RunContext, no live inputs).
  const regen = spawnSync(tsxBin, [cli, "--render-from-json", rmd007JsonPath], { cwd: rmd007Dir, encoding: "utf8" });
  assert.equal(regen.status, 0, `regenerating from the saved JSON exited non-zero:\n${regen.stderr}`);
  rmd007RegeneratedMd = regen.stdout;
});

Then("the regenerated markdown equals the directly rendered markdown", function () {
  assert.equal(
    rmd007RegeneratedMd,
    rmd007DirectMd,
    `round-trip drift: the markdown regenerated from the saved JSON must EQUAL the direct render.\n` +
      `--- regenerated (from JSON alone) ---\n${rmd007RegeneratedMd}\n--- direct ---\n${rmd007DirectMd}`
  );
});

Then("the regenerated markdown names the coded out-of-balance feature in full", function () {
  assert.ok(
    rmd007RegeneratedMd.includes("| checkout (CHK) | 1 | SCN-CHK-002 |"),
    `expected the coded out-of-balance feature named in full in the regenerated markdown (the by-feature title path); got:\n${rmd007RegeneratedMd}`
  );
});

After({ tags: "@SCN-RMD-007" }, function () {
  if (rmd007Dir && existsSync(rmd007Dir)) rmSync(rmd007Dir, { recursive: true, force: true });
});

// @SCN-RMD-008
// Drives the REAL CLI over the usg fixture (SCN-TGT-001 declares @unit + @lint=lint:foo) with the
// usg ci.yml/package.json but NO runner reports, so the runtime unit evidence obligation reconciles
// missing and the lint:foo guard reconciles satisfied — a corpus with BOTH a runtime
// sub-row AND a lint sub-row, and a non-empty missing split. Reading the persisted
// spec-reconciliation.json back, every evidence sub-row must be keyed by ONE flat quality-check
// (no kind / no level), a lint sub-row must carry qualityCheck "lint" alongside its guard, and the
// summary's missing split must be under missingByQualityCheck (the retired grid key is gone).
// Anti-watermelon: the assertions read the REAL persisted file.
const RMD008_FIXTURE = {
  features: "tests/fixtures/usg/features",
  ci: "tests/fixtures/usg/ci.yml",
  packageJson: "tests/fixtures/usg/package.json",
};
let rmd008StoreRoot: string;
let rmd008Json: Record<string, unknown>;

Given("a reconciliation whose scenarios declare runtime and lint evidence obligations", function () {
  const repoRoot = process.cwd();
  rmd008StoreRoot = mkdtempSync(join(tmpdir(), "spec-controller-rmd008-"));
  assert.ok(!rmd008StoreRoot.startsWith(repoRoot), `store root must be OUTSIDE the repo; got ${rmd008StoreRoot}`);
});

When("the report is serialised to spec-reconciliation.json", function () {
  const repoRoot = process.cwd();
  const abs = (p: string): string => join(repoRoot, p);
  const plan = executeKeptRun(
    { storeRoot: rmd008StoreRoot, target: TARGET, runId: RUN_ID },
    META,
    (formatSpecs) => {
      const formatArgs = formatSpecs.flatMap((spec) => ["--format", spec]);
      const result = spawnSync(
        join(repoRoot, "node_modules", ".bin", "tsx"),
        [
          join(repoRoot, "packages", "spec-controller", "src", "cli-balance", "cli.ts"),
          "--features", abs(RMD008_FIXTURE.features),
          "--ci", abs(RMD008_FIXTURE.ci),
          "--package-json", abs(RMD008_FIXTURE.packageJson),
          "--target", TARGET,
          ...formatArgs,
        ],
        { cwd: rmd008StoreRoot, encoding: "utf8" }
      );
      // [3F-1460] fix-to-canon (3F-1414): balance is now an unconditional CI gate, so this
      // out-of-balance fixture exits 1 (the JSON/markdown are written IN FULL first). Pure
      // exit-expectation flip 0->1; every persisted-content assertion is unchanged.
      assert.equal(result.status, 1, `expected exit 1 (out-of-balance); got ${result.status}:\n${result.stderr}`);
    }
  );
  rmd008Json = JSON.parse(readFileSync(join(plan.runDir, "spec-reconciliation.json"), "utf8"));
});

Then("each evidence sub-row is keyed by one quality-check field with no kind or level", function () {
  const evidenceReconciliation = (rmd008Json.ledger as { scenarioReconciliations: unknown }).scenarioReconciliations as Array<{
    scnId: string;
    qualityCheckReconciliations: Array<Record<string, unknown>>;
    reconcilingItems: Array<Record<string, unknown>>;
  }>;
  assert.ok(Array.isArray(evidenceReconciliation) && evidenceReconciliation.length > 0, `expected a non-empty ledger; got ${JSON.stringify(rmd008Json.ledger)}`);
  const qualityCheckReconciliations = evidenceReconciliation.flatMap((s) => [...s.qualityCheckReconciliations, ...s.reconcilingItems]);
  assert.ok(qualityCheckReconciliations.length > 0, "expected at least one evidence sub-row");
  for (const row of qualityCheckReconciliations) {
    assert.ok(
      typeof row.qualityCheck === "string",
      `expected each sub-row keyed by a quality-check string; got ${JSON.stringify(row)}`
    );
    assert.ok(!("kind" in row), `expected NO kind axis on a sub-row (flat quality-check); got ${JSON.stringify(row)}`);
    assert.ok(!("level" in row), `expected NO level axis on a sub-row (flat quality-check); got ${JSON.stringify(row)}`);
  }
});

Then('a lint sub-row carries its quality-check "lint" alongside its guard', function () {
  const evidenceReconciliation = (rmd008Json.ledger as { scenarioReconciliations: unknown }).scenarioReconciliations as Array<{ qualityCheckReconciliations: Array<Record<string, unknown>> }>;
  const lintRows = evidenceReconciliation
    .flatMap((s) => s.qualityCheckReconciliations)
    .filter((o) => o.qualityCheck === "lint");
  assert.ok(lintRows.length > 0, `expected at least one lint sub-row (the usg fixture declares @lint=lint:foo); got ${JSON.stringify(evidenceReconciliation)}`);
  for (const row of lintRows) {
    assert.equal(row.qualityCheck, "lint", `expected a lint sub-row's quality-check to be "lint"; got ${JSON.stringify(row)}`);
    assert.ok(typeof row.staticGuard === "string" && row.staticGuard.length > 0, `expected a lint sub-row to carry its guard handle; got ${JSON.stringify(row)}`);
  }
});

Then("the summary's missing split is carried under missingByQualityCheck keyed by quality-check", function () {
  const evidenceObligations = (rmd008Json.summary as { evidenceObligations: Record<string, unknown> }).evidenceObligations;
  assert.ok(
    "missingByQualityCheck" in evidenceObligations,
    `expected the missing split under missingByQualityCheck; got summary.evidenceObligations keys: ${Object.keys(evidenceObligations).join(", ")}`
  );
  const split = evidenceObligations.missingByQualityCheck as Array<{ subject: string; count: number }>;
  // The usg fixture leaves the runtime unit evidence obligation missing → a non-empty split.
  assert.ok(Array.isArray(split) && split.length > 0, `expected a non-empty missingByQualityCheck split; got ${JSON.stringify(split)}`);
  assert.ok(
    split.some((e) => e.subject === "unit"),
    `expected the split keyed by quality-check to carry "unit"; got ${JSON.stringify(split)}`
  );
});

After({ tags: "@SCN-RMD-008" }, function () {
  if (rmd008StoreRoot && existsSync(rmd008StoreRoot)) rmSync(rmd008StoreRoot, { recursive: true, force: true });
});
