import { Given, When, Then, After } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { executeKeptRun, type KeptRunPlan, type RunManifestMeta } from "../../packages/spec-controller/src/run-management/keptRun.js";
import { NODE, SPEC_CONTROLLER_ARGV } from "./support/builtCli.js";

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
        { cwd: rmdStoreRoot, encoding: "utf8" }
      );
      assert.equal(result.error, undefined, `the tool subprocess failed to spawn: ${result.error?.message}`);
      rmdExitCode = result.status;
      assert.equal(
        result.status,
        1,
        `expected exit 1 (out-of-balance); got ${result.status}:\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`
      );
      return true;
    }
  ) ?? assert.fail("the route wrote its report, so the run is kept");
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
  "it parses to one object carrying runProvenance, summary, scenarioCodeErrors, scenarioCodePopulation and evidenceObligations as top-level sections in document order",
  function () {
    const parsed = JSON.parse(
      readFileSync(join(rmdPlan.runDir, "spec-reconciliation.json"), "utf8")
    ) as Record<string, unknown>;
    assert.ok(parsed.runProvenance, `expected a runProvenance section; got:\n${JSON.stringify(parsed, null, 2)}`);
    assert.ok(parsed.summary, `expected a materialised summary section; got keys: ${Object.keys(parsed).join(", ")}`);
    assert.ok(!("provenance" in parsed), `expected NO legacy "provenance" key; got keys: ${Object.keys(parsed).join(", ")}`);
    assert.ok(parsed.evidenceObligations, `expected a evidenceObligations section`);
    assert.ok(!("warnings" in parsed), `expected NO retired "warnings" key; got keys: ${Object.keys(parsed).join(", ")}`);
    const keys = Object.keys(parsed);
    assert.equal(keys[0], "runProvenance", `expected runProvenance first; got ${keys.join(", ")}`);
    assert.equal(keys[1], "summary", `expected summary second; got ${keys.join(", ")}`);
    assert.ok(Array.isArray(parsed.scenarioCodeErrors), `expected a scenarioCodeErrors section; got keys: ${keys.join(", ")}`);
    assert.ok(
      keys.indexOf("ledger") < keys.indexOf("scenarioCodeErrors") &&
        keys.indexOf("scenarioCodeErrors") < keys.indexOf("evidenceObligations"),
      `expected scenarioCodeErrors between ledger and evidenceObligations; got ${keys.join(", ")}`
    );
    assert.equal(
      keys.indexOf("scenarioCodePopulation"),
      keys.indexOf("scenarioCodeErrors") + 1,
      `expected scenarioCodePopulation directly after scenarioCodeErrors; got ${keys.join(", ")}`
    );
  }
);

Then("its scenarioCodePopulation counts the feature files and the feature codes of the corpus it judged", function () {
  const parsed = JSON.parse(readFileSync(join(rmdPlan.runDir, "spec-reconciliation.json"), "utf8")) as {
    scenarioCodePopulation?: unknown;
  };
  assert.deepEqual(parsed.scenarioCodePopulation, { featureFiles: 1, featureCodes: 1 });
});

interface PersistedTally {
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
}

Then(
  "its summary totals count every Scenario Reconciliation, so the tally reads out-of-balance and agrees with the run's exit code",
  function () {
    const parsed = JSON.parse(
      readFileSync(join(rmdPlan.runDir, "spec-reconciliation.json"), "utf8")
    ) as PersistedTally;
    const totals = parsed.summary.scenarioReconciliations;
    const rows = parsed.ledger.scenarioReconciliations;

    assert.equal(
      totals.total,
      rows.length,
      `the summary total must count every Scenario Reconciliation; got total ${totals.total} over ${rows.length} rows ` +
        `(${JSON.stringify(totals)})`
    );
    const outOfBalanceRows = rows.filter((r) => r.verdict === "out-of-balance").length;
    assert.equal(
      totals.outOfBalance,
      outOfBalanceRows,
      `the summary out-of-balance count must count every out-of-balance Scenario Reconciliation; got ` +
        `${totals.outOfBalance} against ${outOfBalanceRows} out-of-balance rows (${JSON.stringify(totals)})`
    );
    assert.equal(totals.balanced, rows.length - outOfBalanceRows, `balanced must be the remaining rows`);
    assert.equal(totals.phantom, rows.filter((r) => r.kind === "phantom-scenario").length);
    assert.equal(totals.suspense, rows.filter((r) => r.kind === "suspense-scenario").length);
    assert.ok(totals.suspense >= 1, `the fixture must carry a suspense reconciliation; got ${JSON.stringify(totals)}`);

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
        { cwd: rmd003StoreRoot, encoding: "utf8" }
      );
      assert.equal(result.status, 1, `expected exit 1 (out-of-balance); got ${result.status}:\n${result.stderr}`);
      return true;
    }
  ) ?? assert.fail("the route wrote its report, so the run is kept");
  rmd003Json = JSON.parse(readFileSync(join(plan.runDir, "spec-reconciliation.json"), "utf8"));
});

Then(
  "the phantom and suspense credits surface on their ledger rows and there is no evidenceObservations section",
  function () {
    assert.ok(!("evidenceObservations" in rmd003Json), `expected NO evidenceObservations section; got keys: ${Object.keys(rmd003Json).join(", ")}`);
    assert.ok(!("evidence observation" in rmd003Json), `expected NO legacy "evidence observation" key`);
    const summary = rmd003Json.summary as { rawByRuntimeQualityCheck?: Record<string, number> };
    assert.ok(summary.rawByRuntimeQualityCheck, `expected summary.rawByRuntimeQualityCheck (the re-homed headline); got summary keys: ${Object.keys(summary).join(", ")}`);
    const evidenceReconciliation = (rmd003Json.ledger as { scenarioReconciliations: unknown }).scenarioReconciliations as {
      scnId: string;
      kind?: string;
      qualityCheckReconciliations: { outcome: string; locator?: string }[];
    }[];
    const phantom = evidenceReconciliation.find((s) => s.scnId === "SCN-PHM-999");
    assert.ok(phantom, "expected a phantom-scenario row for SCN-PHM-999 in the ledger");
    assert.equal(phantom!.kind, "phantom-scenario", "expected kind phantom-scenario");
    const phantomItem = phantom!.qualityCheckReconciliations[0];
    assert.equal(phantomItem?.outcome, "cites-unknown-scenario", "expected the cites-unknown-scenario outcome");
    assert.ok(
      typeof phantomItem?.locator === "string" && phantomItem.locator.length > 0,
      `expected the phantom item to carry a file locator; got ${JSON.stringify(phantomItem)}`
    );
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
  "a reconciliation run whose evidence spans attributed, phantom-id, and cites-no-scenario evidence observations and whose CI runs a check no fitness scenario cites",
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
        NODE,
        [
          ...SPEC_CONTROLLER_ARGV,
          "balance",
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
      assert.equal(result.status, 1, `expected exit 1 (out-of-balance); got ${result.status}:\n${result.stderr}`);
      return true;
    }
  ) ?? assert.fail("the route wrote its report, so the run is kept");
  rmd005Json = JSON.parse(readFileSync(join(plan.runDir, "spec-reconciliation.json"), "utf8"));
});

Then(
  "the summary carries the test-volume totals, the static-check totals, and the fitness-obligation tally under summary.fitness",
  function () {
    const summary = rmd005Json.summary as {
      testVolume?: { totalEvidenceObservations: number; onScenario: number; onPhantomScenario: number; onSuspenseScenario: number };
      staticChecks?: { runningStaticCheckCount: number; uncitedStaticCheckCount: number };
      fitness?: { satisfied: number; total: number };
      lint?: unknown;
    };
    assert.ok(summary, `expected a summary section; got keys: ${Object.keys(rmd005Json).join(", ")}`);
    assert.ok(summary.testVolume, `expected summary.testVolume; got summary keys: ${Object.keys(summary).join(", ")}`);
    assert.deepEqual(summary.testVolume, { totalEvidenceObservations: 5, onScenario: 1, onPhantomScenario: 2, onSuspenseScenario: 2 });
    assert.ok(summary.staticChecks, `expected summary.staticChecks; got summary keys: ${Object.keys(summary).join(", ")}`);
    assert.deepEqual(summary.staticChecks, { runningStaticCheckCount: 2, uncitedStaticCheckCount: 1 });
    assert.ok(summary.fitness, `expected summary.fitness; got summary keys: ${Object.keys(summary).join(", ")}`);
    assert.deepEqual(summary.fitness, { satisfied: 1, total: 1 });
    assert.equal(summary.lint, undefined, "expected no summary.lint — the tally is keyed by the quality check, fitness");
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
  "the persisted static-check summary carries runningStaticCheckCount and uncitedStaticCheckCount with named implicit",
  function () {
    const sg = (rmd005Json.summary as { staticChecks: { runningStaticCheckCount: number; uncitedStaticCheckCount: number } }).staticChecks;
    const named = sg.runningStaticCheckCount - sg.uncitedStaticCheckCount;
    assert.ok(
      named >= 0,
      `the implicit named count must be non-negative: ${sg.runningStaticCheckCount} running − ${sg.uncitedStaticCheckCount} uncited = ${named}`
    );
    assert.ok(
      !("ciGuards" in sg) && !("named" in sg),
      `the persisted static-check summary must carry only { runningStaticCheckCount, uncitedStaticCheckCount }; got keys: ${Object.keys(sg).join(", ")}`
    );
  }
);

After({ tags: "@SCN-RMD-005" }, function () {
  if (rmd005StoreRoot && existsSync(rmd005StoreRoot)) rmSync(rmd005StoreRoot, { recursive: true, force: true });
});

const RMD006_FEATURES = "tests/fixtures/byfeature/features";
let rmd006Dir: string;
let rmd006Json: Record<string, unknown>;
let rmd006Md: string;

Given("a reconciliation over a target corpus whose feature files carry their feature codes", function () {
  rmd006Dir = mkdtempSync(join(tmpdir(), "spec-controller-rmd006-"));
});

When("the coded-corpus reconciliation run persists its machine artefacts", function () {
  const repoRoot = process.cwd();
  const abs = (p: string): string => join(repoRoot, p);
  const jsonPath = join(rmd006Dir, "spec-reconciliation.json");
  const mdPath = join(rmd006Dir, "spec-reconciliation.md");
  const result = spawnSync(
    NODE,
    [
      ...SPEC_CONTROLLER_ARGV,
      "balance",
      "--features", abs(RMD006_FEATURES),
      "--target", "byfeature-fixture",
      "--format", `json:${jsonPath}`,
      "--format", `md:${mdPath}`,
    ],
    { cwd: rmd006Dir, encoding: "utf8" }
  );
  assert.equal(result.status, 1, `expected exit 1 (out-of-balance); got ${result.status}:\n${result.stderr}`);
  rmd006Json = JSON.parse(readFileSync(jsonPath, "utf8"));
  rmd006Md = readFileSync(mdPath, "utf8");
});

Then("the persisted spec-reconciliation.json carries the feature titles keyed by feature code", function () {
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

const RMD007_FIXTURE = {
  features: "tests/fixtures/roundtrip/features",
  vitest: "tests/fixtures/roundtrip/vitest.json",
};
let rmd007Dir: string;
let rmd007JsonPath: string;
let rmd007DirectMd: string;
let rmd007RegeneratedMd: string;
let rmd007SavedStatus: number | null;
let rmd007RegeneratedStatus: number | null;

Given(
  "a reconciliation run persisted as spec-reconciliation.json alongside its direct markdown render",
  function () {
    const repoRoot = process.cwd();
    const abs = (p: string): string => join(repoRoot, p);
    rmd007Dir = mkdtempSync(join(tmpdir(), "spec-controller-rmd007-"));
    rmd007JsonPath = join(rmd007Dir, "spec-reconciliation.json");
    const mdPath = join(rmd007Dir, "spec-reconciliation.md");
    const result = spawnSync(
      NODE,
      [
        ...SPEC_CONTROLLER_ARGV,
        "balance",
        "--features", abs(RMD007_FIXTURE.features),
        "--vitest", abs(RMD007_FIXTURE.vitest),
        "--target", "roundtrip-fixture",
        "--format", `md:${mdPath}`,
        "--format", `json:${rmd007JsonPath}`,
      ],
      { cwd: rmd007Dir, encoding: "utf8" }
    );
    assert.equal(result.status, 1, `expected exit 1 (out-of-balance); got ${result.status}:\n${result.stderr}`);
    rmd007SavedStatus = result.status;
    assert.ok(existsSync(rmd007JsonPath), `expected the banked JSON at ${rmd007JsonPath}`);
    assert.ok(existsSync(mdPath), `expected the direct markdown render at ${mdPath}`);
    rmd007DirectMd = readFileSync(mdPath, "utf8");
  }
);

When("the markdown is regenerated from the saved spec-reconciliation.json alone", function () {
  const repoRoot = process.cwd();
  const regen = spawnSync(NODE, [...SPEC_CONTROLLER_ARGV, "balance", "--render-from-json", rmd007JsonPath], { cwd: rmd007Dir, encoding: "utf8" });
  rmd007RegeneratedStatus = regen.status;
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

Then("the regeneration exits the code the saved run exited", function () {
  assert.equal(
    rmd007RegeneratedStatus,
    rmd007SavedStatus,
    `the regeneration exited ${rmd007RegeneratedStatus}; the run that saved the report exited ${rmd007SavedStatus}`
  );
});

After({ tags: "@SCN-RMD-007" }, function () {
  if (rmd007Dir && existsSync(rmd007Dir)) rmSync(rmd007Dir, { recursive: true, force: true });
});

const RMD008_FIXTURE = {
  features: "tests/fixtures/usg/features",
  ci: "tests/fixtures/usg/ci.yml",
  packageJson: "tests/fixtures/usg/package.json",
};
let rmd008StoreRoot: string;
let rmd008Json: Record<string, unknown>;

Given("a reconciliation whose scenarios raise runtime and fitness evidence obligations", function () {
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
        NODE,
        [
          ...SPEC_CONTROLLER_ARGV,
          "balance",
          "--features", abs(RMD008_FIXTURE.features),
          "--ci", abs(RMD008_FIXTURE.ci),
          "--package-json", abs(RMD008_FIXTURE.packageJson),
          "--target", TARGET,
          ...formatArgs,
        ],
        { cwd: rmd008StoreRoot, encoding: "utf8" }
      );
      assert.equal(result.status, 1, `expected exit 1 (out-of-balance); got ${result.status}:\n${result.stderr}`);
      return true;
    }
  ) ?? assert.fail("the route wrote its report, so the run is kept");
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

Then('a fitness sub-row carries its quality-check "fitness" and names no characteristic', function () {
  const evidenceReconciliation = (rmd008Json.ledger as { scenarioReconciliations: unknown }).scenarioReconciliations as Array<{ qualityCheckReconciliations: Array<Record<string, unknown>> }>;
  const fitnessRows = evidenceReconciliation
    .flatMap((s) => s.qualityCheckReconciliations)
    .filter((o) => o.qualityCheck === "fitness" && o.evidenceObligation !== undefined);
  assert.ok(fitnessRows.length > 0, `expected at least one fitness sub-row on the obligation side; got ${JSON.stringify(evidenceReconciliation)}`);
  for (const row of fitnessRows) {
    assert.equal(row.qualityCheck, "fitness", `expected a fitness sub-row's quality-check to be "fitness", never "lint"; got ${JSON.stringify(row)}`);
    assert.ok(!("staticCheck" in row), `expected a fitness sub-row to name no characteristic; got ${JSON.stringify(row)}`);
  }
});

Then("the summary's missing split is carried under missingByQualityCheck keyed by quality-check", function () {
  const evidenceObligations = (rmd008Json.summary as { evidenceObligations: Record<string, unknown> }).evidenceObligations;
  assert.ok(
    "missingByQualityCheck" in evidenceObligations,
    `expected the missing split under missingByQualityCheck; got summary.evidenceObligations keys: ${Object.keys(evidenceObligations).join(", ")}`
  );
  const split = evidenceObligations.missingByQualityCheck as Array<{ subject: string; count: number }>;
  assert.ok(Array.isArray(split) && split.length > 0, `expected a non-empty missingByQualityCheck split; got ${JSON.stringify(split)}`);
  assert.ok(
    split.some((e) => e.subject === "unit"),
    `expected the split keyed by quality-check to carry "unit"; got ${JSON.stringify(split)}`
  );
});

After({ tags: "@SCN-RMD-008" }, function () {
  if (rmd008StoreRoot && existsSync(rmd008StoreRoot)) rmSync(rmd008StoreRoot, { recursive: true, force: true });
});
