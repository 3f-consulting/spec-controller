import { Given, When } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { NODE, SPEC_CONTROLLER_ARGV } from "./support/builtCli.js";
import { temporaryDirectory } from "./support/temporaryDirectory.js";
import type { SpecControllerWorld } from "./support/world.js";

const UNNAMED_CLAIM_STATUS = {
  features: "tests/fixtures/unnamed-claim-status/features",
  vitest: "tests/fixtures/unnamed-claim-status/vitest.json",
  packageJson: "tests/fixtures/unnamed-claim-status/package.json",
  ci: "tests/fixtures/unnamed-claim-status",
};

const EVERY_OUTCOME_CORPUS = {
  features: "tests/fixtures/every-outcome-corpus/features",
  vitest: "tests/fixtures/every-outcome-corpus/vitest.json",
  packageJson: "tests/fixtures/every-outcome-corpus/package.json",
  ci: "tests/fixtures/every-outcome-corpus",
};

const PIPELINE_TARGET = {
  features: "tests/fixtures/pipeline-target/features",
  vitest: "tests/fixtures/pipeline-target/vitest.json",
  packageJson: "tests/fixtures/pipeline-target/package.json",
  ci: "tests/fixtures/pipeline-target",
};

const UNSOUND_EXIT = 4;

function argsFor(target: Record<"features" | "vitest" | "packageJson" | "ci", string>): string[] {
  const root = process.cwd();
  for (const path of Object.values(target)) {
    assert.ok(existsSync(join(root, path)), `missing fixture input: ${path}`);
  }
  return [
    "--features", target.features,
    "--vitest", target.vitest,
    "--package-json", target.packageJson,
    "--ci", target.ci,
  ];
}

Given("a target whose tests that cite no claim ran under Vitest and under Cucumber", function (this: SpecControllerWorld) {
  this.invocationArgs = [...argsFor(UNNAMED_CLAIM_STATUS), "--cucumber", "tests/fixtures/unnamed-claim-status/cucumber.json"];
});

Given("a target whose evidence reconciles to every outcome there is", function (this: SpecControllerWorld) {
  this.invocationArgs = [...argsFor(EVERY_OUTCOME_CORPUS), "--cucumber", "tests/fixtures/every-outcome-corpus/cucumber.json"];
  this.verdictExit = UNSOUND_EXIT;
});

Given(
  "a target whose pipeline runs its unit tests and a fitness check, under its named runner, two of whose scenarios share a code",
  function (this: SpecControllerWorld) {
    this.invocationArgs = [...argsFor(PIPELINE_TARGET), "--ci-steps", "tests/fixtures/pipeline-target/ci-steps.json"];
  },
);

When("the target's evidence is reconciled and saved as the JSON report", function (this: SpecControllerWorld) {
  const jsonPath = join(temporaryDirectory(this, "spec-controller-rmd010-"), "spec-reconciliation.json");
  const result = spawnSync(NODE, [...SPEC_CONTROLLER_ARGV, "balance", ...this.invocationArgs, "--format", `json:${jsonPath}`], {
    cwd: process.cwd(),
    encoding: "utf8",
  });
  assert.equal(result.status, this.verdictExit, `expected the verdict's exit ${this.verdictExit}; got ${result.status}\nstderr:\n${result.stderr}`);
  this.savedJson = JSON.parse(readFileSync(jsonPath, "utf8"));
});
