import { Given, Then, When } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { NODE, SPEC_CONTROLLER_ARGV } from "./support/builtCli.js";
import { claimReconciliationsOf } from "./support/reportClaimReconciliations.js";
import { temporaryDirectory } from "./support/temporaryDirectory.js";
import type { RowReconciliation, SpecControllerWorld } from "./support/world.js";

const CUCUMBER_PACKAGE = join(process.cwd(), "node_modules", "@cucumber", "cucumber");

const FEATURE_CODE = "ONE";

// Each row's own result, so an observation filed under the wrong row's claim would show.
const ROWS = [
  { number: "001", result: "passes" },
  { number: "002", result: "fails" },
] as const;

const OUTLINE = [
  `@${FEATURE_CODE}`,
  "Feature: one",
  "",
  "  @integration",
  "  Scenario Outline: a claim for each row",
  "    Given the row <result>",
  "",
  "    Examples:",
  "      | clm         | result |",
  ...ROWS.map(({ number, result }) => `      | CLM-${FEATURE_CODE}-${number} | ${result} |`),
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
  "two executable claims were rows of one Scenario Outline, with the claim codes CLM-ONE-001 and CLM-ONE-002",
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
  },
);

Given("Cucumber's evidence report had a result for each row", function (this: SpecControllerWorld) {
  const result = spawnSync(
    NODE,
    [join(CUCUMBER_PACKAGE, "bin", "cucumber.js"), "--require", "steps.cjs", "--format", `json:${CUCUMBER_REPORT}`],
    { cwd: this.rowsTarget, encoding: "utf8" },
  );
  assert.equal(result.error, undefined, `cucumber-js failed to spawn: ${result.error?.message}`);
  assert.match(result.stdout, /2 scenarios \(1 failed, 1 passed\)/, `expected a result for each of the two rows; got:\n${result.stdout}\n${result.stderr}`);
});

When("balance posts the evidence", function (this: SpecControllerWorld) {
  const { cwd, inputs } = this.reconciledTarget;
  const result = spawnSync(NODE, [...SPEC_CONTROLLER_ARGV, "balance", ...inputs, "--format", "json"], { cwd, encoding: "utf8" });
  assert.equal(result.error, undefined, `the CLI failed to spawn: ${result.error?.message}`);
  try {
    this.reconciledReport = JSON.parse(result.stdout) as unknown;
  } catch {
    assert.fail(`expected a JSON report on stdout; exit ${result.status}\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`);
  }
});

Then("an Evidence Observation will be posted for each row, citing the claim code of its row", function (this: SpecControllerWorld) {
  const reconciliations = claimReconciliationsOf<RowReconciliation>(this.reconciledReport);
  for (const { number } of ROWS) {
    const code = { featureCode: FEATURE_CODE, number };
    const ofRow = reconciliations.filter(({ claim }) => claim.claimCode?.featureCode === FEATURE_CODE && claim.claimCode.number === number);
    assert.equal(ofRow.length, 1, `expected one Claim Reconciliation for CLM-${FEATURE_CODE}-${number}; got ${JSON.stringify(reconciliations)}`);
    const observations = ofRow.flatMap(({ qualityCheckReconciliations }) => qualityCheckReconciliations.flatMap(({ observation }) => observation ?? []));
    assert.deepEqual(
      observations.map(({ cites }) => cites),
      [[code]],
      `expected one Evidence Observation posted to CLM-${FEATURE_CODE}-${number}, citing it alone; got ${JSON.stringify(ofRow)}`,
    );
  }
});
