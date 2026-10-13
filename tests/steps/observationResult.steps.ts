import { Given, When, Then } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { NODE, SPEC_CONTROLLER_ARGV } from "./support/builtCli.js";

const SUSPENSE_STATUS = {
  features: "tests/fixtures/suspense-status/features",
  vitest: "tests/fixtures/suspense-status/vitest.json",
  packageJson: "tests/fixtures/suspense-status/package.json",
  ci: "tests/fixtures/suspense-status",
};

const PHANTOM_STATUS = {
  features: "tests/fixtures/phantom-status/features",
  vitest: "tests/fixtures/phantom-status/vitest.json",
  packageJson: "tests/fixtures/phantom-status/package.json",
  ci: "tests/fixtures/phantom-status",
};

const NO_OBLIGATION_STATUS = {
  features: "tests/fixtures/no-obligation-status/features",
  vitest: "tests/fixtures/no-obligation-status/vitest.json",
  packageJson: "tests/fixtures/no-obligation-status/package.json",
  ci: "tests/fixtures/no-obligation-status",
};

const FAILED_TEST = "tests/fixtures/suspense-status/broken-spawn.test.ts";
const PASSED_TEST = "tests/fixtures/suspense-status/sound.test.ts";

const PHANTOM_SCENARIO = "SCN-PST-901";
const PHANTOM_FAILED_TEST = "tests/fixtures/phantom-status/broken-spawn.test.ts";
const PHANTOM_PASSED_TEST = "tests/fixtures/phantom-status/sound.test.ts";

const NO_OBLIGATION_SCENARIO = "SCN-NOS-001";
const NO_OBLIGATION_FAILED_TEST = "tests/fixtures/no-obligation-status/broken-spawn.test.ts";
const NO_OBLIGATION_PASSED_TEST = "tests/fixtures/no-obligation-status/sound.test.ts";

let args: string[] = [];
let report = "";

function rowItemFor(rowName: string, locator: string): string {
  const row = report.split("\n").find((line) => line.startsWith(`| ${rowName} |`));
  assert.ok(row, `expected a ${rowName} row in the report; got:\n${report}`);
  const item = row.split(/; | \| /).find((part) => part.includes(`(${locator})`));
  assert.ok(item, `expected the ${rowName} row to list the test at ${locator}; got:\n${row}`);
  return item.replace(/ \|$/, "");
}

function suspenseItemFor(locator: string): string {
  return rowItemFor("(no scenario)", locator);
}

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

function endsWithResult(locator: string, result: string): RegExp {
  const escaped = `(${locator}) — ${result}`.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`${escaped}$`);
}

Given(
  "a target with two tests that cite no scenario, one that failed and one that passed",
  function () {
    args = argsFor(SUSPENSE_STATUS);
  },
);

Given(
  "a target with two tests that cite a scenario no feature carries, one that failed and one that passed",
  function () {
    args = argsFor(PHANTOM_STATUS);
  },
);

Given(
  "a target with two tests that cite a scenario holding no obligation at the check they ran at, one that failed and one that passed",
  function () {
    args = argsFor(NO_OBLIGATION_STATUS);
  },
);

When("the target's evidence is reconciled into a report", function () {
  const result = spawnSync(NODE, [...SPEC_CONTROLLER_ARGV, "balance", ...args], {
    cwd: process.cwd(),
    encoding: "utf8",
  });
  assert.equal(result.error, undefined, `CLI failed to spawn: ${result.error?.message}`);
  assert.equal(result.status, 1, `expected the out-of-balance exit; got ${result.status}\nstderr:\n${result.stderr}`);
  report = result.stdout;
});

Then("the suspense row shows the test that failed as failed", function () {
  const item = suspenseItemFor(FAILED_TEST);
  assert.match(item, endsWithResult(FAILED_TEST, "failed"));
});

Then("it shows the test that passed as passed", function () {
  const item = suspenseItemFor(PASSED_TEST);
  assert.match(item, endsWithResult(PASSED_TEST, "passed"));
});

Then("the phantom row shows the test that failed as failed", function () {
  const item = rowItemFor(PHANTOM_SCENARIO, PHANTOM_FAILED_TEST);
  assert.match(item, endsWithResult(PHANTOM_FAILED_TEST, "failed"));
});

Then("the phantom row shows the test that passed as passed", function () {
  const item = rowItemFor(PHANTOM_SCENARIO, PHANTOM_PASSED_TEST);
  assert.match(item, endsWithResult(PHANTOM_PASSED_TEST, "passed"));
});

Then("the scenario's row shows the test that failed as failed", function () {
  const item = rowItemFor(NO_OBLIGATION_SCENARIO, NO_OBLIGATION_FAILED_TEST);
  assert.match(item, endsWithResult(NO_OBLIGATION_FAILED_TEST, "failed"));
});

Then("the scenario's row shows the test that passed as passed", function () {
  const item = rowItemFor(NO_OBLIGATION_SCENARIO, NO_OBLIGATION_PASSED_TEST);
  assert.match(item, endsWithResult(NO_OBLIGATION_PASSED_TEST, "passed"));
});
