import { Given, Then } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { NODE } from "./support/builtCli.js";
import { claimReconciliationsOf } from "./support/reportClaimReconciliations.js";
import { temporaryDirectory } from "./support/temporaryDirectory.js";
import type { RowReconciliation, SpecControllerWorld } from "./support/world.js";

const CUCUMBER_PACKAGE = join(process.cwd(), "node_modules", "@cucumber", "cucumber");

const PASSING_ROW = "CLM-ONE-001";

const FAILING_ROW = "CLM-ONE-002";

const OUTLINE = [
  "@ONE",
  "Feature: one",
  "",
  "  @integration",
  "  Scenario Outline: a claim for each row",
  "    Given the row <result>",
  "",
  "    Examples:",
  "      | clm            | result |",
  `      | ${PASSING_ROW}    | passes |`,
  `      | ${FAILING_ROW}    | fails  |`,
  "",
].join("\n");

const STEP_DEFINITIONS = [
  `const { Given } = require(${JSON.stringify(CUCUMBER_PACKAGE)});`,
  `Given("the row passes", () => {});`,
  `Given("the row fails", () => { throw new Error("the row fails"); });`,
  "",
].join("\n");

const CUCUMBER_REPORT = "cucumber.json";

Given(
  "a target whose one Outline is tagged @integration and has a clm column holding CLM-ONE-001 and CLM-ONE-002",
  function (this: SpecControllerWorld) {
    const dir = temporaryDirectory(this, "cucumber-rows-");
    mkdirSync(join(dir, "features"));
    writeFileSync(join(dir, "features", "rows.feature"), OUTLINE);
    writeFileSync(join(dir, "steps.cjs"), STEP_DEFINITIONS);
    writeFileSync(join(dir, "package.json"), "{}\n");
    writeFileSync(join(dir, "ci.yml"), "jobs: {}\n");
    this.rowsTarget = dir;
    this.reconciledTarget = {
      cwd: dir,
      inputs: [
        "--features", join(dir, "features"),
        "--cucumber", join(dir, CUCUMBER_REPORT),
        "--package-json", join(dir, "package.json"),
        "--ci", join(dir, "ci.yml"),
      ],
    };
    this.reconciledRun = null;
  },
);

Given("Cucumber's evidence report says CLM-ONE-001's row passed and CLM-ONE-002's row failed", function (this: SpecControllerWorld) {
  const result = spawnSync(
    NODE,
    [join(CUCUMBER_PACKAGE, "bin", "cucumber.js"), "--require", "steps.cjs", "--format", `json:${CUCUMBER_REPORT}`],
    { cwd: this.rowsTarget, encoding: "utf8" },
  );
  assert.equal(result.error, undefined, `cucumber-js failed to spawn: ${result.error?.message}`);
  assert.equal(result.status, 1, `expected the planted run to fail on its failing row; exit ${result.status}\n${result.stdout}\n${result.stderr}`);
  assert.match(result.stdout, /2 scenarios \(1 failed, 1 passed\)/, `expected one row to pass and one to fail; got:\n${result.stdout}`);
});

Then(
  "CLM-ONE-001's Claim Reconciliation is balanced, and CLM-ONE-002's is out of balance with a failing reconciling item",
  function (this: SpecControllerWorld) {
    assert.ok(this.reconciledRun, "the target was not reconciled");
    const rows = claimReconciliationsOf<RowReconciliation>(this.reconciledRun.report);
    const rowOf = (claim: string) => rows.find((row) => row.claim === claim);
    assert.equal(rowOf(PASSING_ROW)?.verdict, "balanced", `expected ${PASSING_ROW} balanced; got ${JSON.stringify(rowOf(PASSING_ROW))}`);
    const failing = rowOf(FAILING_ROW);
    assert.equal(failing?.verdict, "out-of-balance", `expected ${FAILING_ROW} out of balance; got ${JSON.stringify(failing)}`);
    assert.deepEqual(
      failing.qualityCheckReconciliations.map(({ qualityCheckKind, evidenceObservations }) => ({
        qualityCheckKind,
        outcomes: (evidenceObservations ?? []).map(({ outcome }) => outcome),
      })),
      [{ qualityCheckKind: "integration", outcomes: ["failing"] }],
      `expected ${FAILING_ROW}'s one reconciling item failing at integration; got ${JSON.stringify(failing)}`,
    );
  },
);
