import { Given, When, Then, After } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { NODE, SPEC_CONTROLLER_ARGV } from "./support/builtCli.js";

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
