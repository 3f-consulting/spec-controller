import { Given, When, Then } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { NODE, SPEC_CONTROLLER_ARGV } from "./support/builtCli.js";
import { temporaryDirectory } from "./support/temporaryDirectory.js";

const UNNAMED_CLAIM_STATUS = {
  features: "tests/fixtures/unnamed-claim-status/features",
  vitest: "tests/fixtures/unnamed-claim-status/vitest.json",
  packageJson: "tests/fixtures/unnamed-claim-status/package.json",
  ci: "tests/fixtures/unnamed-claim-status",
};

const UNNAMED_CLAIM_STEPS = {
  features: "tests/fixtures/unnamed-claim-steps/features",
  vitest: "tests/fixtures/unnamed-claim-steps/vitest.json",
  packageJson: "tests/fixtures/unnamed-claim-steps/package.json",
  ci: "tests/fixtures/unnamed-claim-steps",
};

const CITES_UNKNOWN_SCENARIO_STATUS = {
  features: "tests/fixtures/cites-unknown-scenario-status/features",
  vitest: "tests/fixtures/cites-unknown-scenario-status/vitest.json",
  packageJson: "tests/fixtures/cites-unknown-scenario-status/package.json",
  ci: "tests/fixtures/cites-unknown-scenario-status",
};

const NO_OBLIGATION_STATUS = {
  features: "tests/fixtures/no-obligation-status/features",
  vitest: "tests/fixtures/no-obligation-status/vitest.json",
  packageJson: "tests/fixtures/no-obligation-status/package.json",
  ci: "tests/fixtures/no-obligation-status",
};

const MIXED_FILE = { locator: "tests/fixtures/unnamed-claim-status/broken-spawn.test.ts", ran: 2, passed: 1, failed: 1 };
const MIXED_FILE_FAILED_TEST = "spawns yarn";
const MIXED_FILE_PASSED_TEST = "reads the lockfile";
const FEATURE_FILE = "tests/fixtures/unnamed-claim-status/features/checkout.feature";
const FEATURE_FILE_FAILED_SCENARIO = "a basket with an expired coupon is refused";
const FEATURE_FILE_PASSED_SCENARIO = "an empty basket cannot be checked out";
const PASSING_FILE = { locator: "tests/fixtures/unnamed-claim-status/sound.test.ts", ran: 1, passed: 1, failed: 0 };
const UNCITED_OUTCOME_ROW = "Evidence Observation cites no Scenario";
const UNCITED_STEPS = ["lint:bar", "lint:foo"];
const UNCITED_TEST_FILE = "tests/fixtures/unnamed-claim-steps/sound.test.ts";

const PHANTOM_CLAIM = "SCN-PST-901";
const PHANTOM_CLAIM_FAILED_TEST = "tests/fixtures/cites-unknown-scenario-status/broken-spawn.test.ts";
const PHANTOM_CLAIM_PASSED_TEST = "tests/fixtures/cites-unknown-scenario-status/sound.test.ts";

const NO_OBLIGATION_SCENARIO = "SCN-NOS-001";
const NO_OBLIGATION_FAILED_TEST = "tests/fixtures/no-obligation-status/broken-spawn.test.ts";
const NO_OBLIGATION_PASSED_TEST = "tests/fixtures/no-obligation-status/sound.test.ts";

let args: string[] = [];
let report = "";
let savedJson: { ledger: { claimReconciliations: { evidenceObservations: Record<string, unknown>[] }[] } };

function rowItemFor(rowName: string, locator: string): string {
  const row = report.split("\n").find((line) => line.startsWith(`| ${rowName} |`));
  assert.ok(row, `expected a ${rowName} row in the report; got:\n${report}`);
  const item = row.split(/; | \| /).find((part) => part.includes(`(${locator})`));
  assert.ok(item, `expected the ${rowName} row to list the test at ${locator}; got:\n${row}`);
  return item.replace(/ \|$/, "");
}

function unnamedClaimItems(): string[] {
  const row = report.split("\n").find((line) => line.startsWith("| (unnamed claim) |"));
  assert.ok(row, `expected the unnamed claim's row in the report; got:\n${report}`);
  return row.replace(/ \|$/, "").split(" | ").at(-1)!.split("; ");
}

function unnamedClaimItemsFor(locator: string): string[] {
  return unnamedClaimItems().filter((item) => item.includes(`(${locator})`) || item.includes(`(${locator}: `));
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
  "a target whose tests that cite no scenario ran in two files, one file holding a test that failed and a test that passed",
  function () {
    args = argsFor(UNNAMED_CLAIM_STATUS);
  },
);

Given(
  "a target whose Cucumber scenarios that cite no scenario ran in one feature file, one that failed and one that passed",
  function () {
    args = [...argsFor(UNNAMED_CLAIM_STATUS), "--cucumber", "tests/fixtures/unnamed-claim-status/cucumber.json"];
  },
);

Given("a target whose tests that cite no scenario ran under Vitest and under Cucumber", function () {
  args = [...argsFor(UNNAMED_CLAIM_STATUS), "--cucumber", "tests/fixtures/unnamed-claim-status/cucumber.json"];
});

Given("a target whose CI runs two checks that cite no scenario, beside a test that cites no scenario", function () {
  args = argsFor(UNNAMED_CLAIM_STEPS);
});

Given(
  "a target with two tests that cite a scenario no feature carries, one that failed and one that passed",
  function () {
    args = argsFor(CITES_UNKNOWN_SCENARIO_STATUS);
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

When("the target's evidence is reconciled and saved as the JSON report", function () {
  const jsonPath = join(temporaryDirectory("spec-controller-rmd010-"), "spec-reconciliation.json");
  const result = spawnSync(NODE, [...SPEC_CONTROLLER_ARGV, "balance", ...args, "--format", `json:${jsonPath}`], {
    cwd: process.cwd(),
    encoding: "utf8",
  });
  assert.equal(result.status, 1, `expected the out-of-balance exit; got ${result.status}\nstderr:\n${result.stderr}`);
  savedJson = JSON.parse(readFileSync(jsonPath, "utf8"));
});

Then("the unnamed claim's row lists each of the two files once", function () {
  for (const { locator } of [MIXED_FILE, PASSING_FILE]) {
    const items = unnamedClaimItemsFor(locator);
    assert.equal(items.length, 1, `expected the unnamed claim's row to list ${locator} once; got:\n${unnamedClaimItems().join("\n")}`);
  }
});

Then("each file's entry counts how many of its tests ran, how many passed and how many failed", function () {
  for (const { locator, ran, passed, failed } of [MIXED_FILE, PASSING_FILE]) {
    const [item] = unnamedClaimItemsFor(locator);
    const counts = ` — ${ran} ran, ${passed} passed, ${failed} failed`;
    assert.ok(
      item?.endsWith(counts) || item?.includes(`${counts} `),
      `expected ${locator}'s entry to count "${counts.slice(3)}"; got:\n${item}`,
    );
  }
});

Then("the counts of tests that ran add up to the count of evidence observations that cite no scenario", function () {
  const outcomeRow = report.split("\n").find((line) => line.startsWith(`| ${UNCITED_OUTCOME_ROW} |`));
  assert.ok(outcomeRow, `expected a "${UNCITED_OUTCOME_ROW}" row in the report; got:\n${report}`);
  const uncited = Number(outcomeRow.split(" | ")[3]);
  const ran = unnamedClaimItems().reduce((sum, item) => sum + Number(/ — (\d+) ran,/.exec(item)?.[1] ?? Number.NaN), 0);
  assert.equal(ran, uncited, `the unnamed claim's row's ran counts must add up to ${uncited}; got:\n${unnamedClaimItems().join("\n")}`);
  assert.equal(uncited, MIXED_FILE.ran + PASSING_FILE.ran);
});

function mixedFileEntry(): string {
  const [item] = unnamedClaimItemsFor(MIXED_FILE.locator);
  assert.ok(item, `expected the unnamed claim's row to list ${MIXED_FILE.locator}; got:\n${unnamedClaimItems().join("\n")}`);
  return item;
}

Then("the file's entry on the unnamed claim's row names the test that failed by its title", function () {
  const entry = mixedFileEntry();
  assert.ok(entry.endsWith(`(failed: ${MIXED_FILE_FAILED_TEST})`), `expected the entry to name "${MIXED_FILE_FAILED_TEST}" as failed; got:\n${entry}`);
});

Then("the file's entry does not name the test that passed", function () {
  const entry = mixedFileEntry();
  assert.ok(!entry.includes(MIXED_FILE_PASSED_TEST), `expected the entry not to name "${MIXED_FILE_PASSED_TEST}"; got:\n${entry}`);
});

function featureFileEntry(): string {
  const [item] = unnamedClaimItemsFor(FEATURE_FILE);
  assert.ok(item, `expected the unnamed claim's row to list ${FEATURE_FILE}; got:\n${unnamedClaimItems().join("\n")}`);
  return item;
}

Then("the feature file's entry on the unnamed claim's row names the Cucumber scenario that failed by its name", function () {
  const entry = featureFileEntry();
  assert.ok(entry.endsWith(`(failed: ${FEATURE_FILE_FAILED_SCENARIO})`), `expected the entry to name "${FEATURE_FILE_FAILED_SCENARIO}" as failed; got:\n${entry}`);
});

Then("the feature file's entry does not name the Cucumber scenario that passed", function () {
  const entry = featureFileEntry();
  assert.ok(!entry.includes(FEATURE_FILE_PASSED_SCENARIO), `expected the entry not to name "${FEATURE_FILE_PASSED_SCENARIO}"; got:\n${entry}`);
});

function stepsEntryIndex(): number {
  const indices = unnamedClaimItems().flatMap((item, i) => (UNCITED_STEPS.some((name) => item.includes(name)) ? [i] : []));
  assert.equal(indices.length, 1, `expected the CI steps listed together once; got:\n${unnamedClaimItems().join("\n")}`);
  return indices[0]!;
}

Then("the unnamed claim's row lists the CI steps together once, after the test's file", function () {
  const fileIndex = unnamedClaimItems().findIndex((item) => item.includes(`(${UNCITED_TEST_FILE})`));
  assert.ok(fileIndex >= 0, `expected the unnamed claim's row to list ${UNCITED_TEST_FILE}; got:\n${unnamedClaimItems().join("\n")}`);
  assert.ok(stepsEntryIndex() > fileIndex, `expected the CI steps after the test's file; got:\n${unnamedClaimItems().join("\n")}`);
});

Then("the CI steps' entry names each of the two checks", function () {
  const entry = unnamedClaimItems()[stepsEntryIndex()];
  assert.ok(
    entry?.endsWith(` — ${UNCITED_STEPS.length} CI steps: ${UNCITED_STEPS.join(", ")}`),
    `expected the CI steps' entry to name ${UNCITED_STEPS.join(" and ")}; got:\n${entry}`,
  );
});

Then("what the unnamed claim's row counts adds up to the count of evidence observations that cite no scenario", function () {
  const outcomeRow = report.split("\n").find((line) => line.startsWith(`| ${UNCITED_OUTCOME_ROW} |`));
  assert.ok(outcomeRow, `expected a "${UNCITED_OUTCOME_ROW}" row in the report; got:\n${report}`);
  const uncited = Number(outcomeRow.split(" | ")[3]);
  const counted = unnamedClaimItems().reduce(
    (sum, item) => sum + Number(/ — (\d+) (?:ran,|CI steps?:)/.exec(item)?.[1] ?? Number.NaN),
    0,
  );
  assert.equal(counted, uncited, `the unnamed claim's row's counts must add up to ${uncited}; got:\n${unnamedClaimItems().join("\n")}`);
  assert.equal(uncited, UNCITED_STEPS.length + 1);
});

Then("the phantom claim's row shows the test that failed as failed", function () {
  const item = rowItemFor(PHANTOM_CLAIM, PHANTOM_CLAIM_FAILED_TEST);
  assert.match(item, endsWithResult(PHANTOM_CLAIM_FAILED_TEST, "failed"));
});

Then("the phantom claim's row shows the test that passed as passed", function () {
  const item = rowItemFor(PHANTOM_CLAIM, PHANTOM_CLAIM_PASSED_TEST);
  assert.match(item, endsWithResult(PHANTOM_CLAIM_PASSED_TEST, "passed"));
});

Then("the scenario's row shows the test that failed as failed", function () {
  const item = rowItemFor(NO_OBLIGATION_SCENARIO, NO_OBLIGATION_FAILED_TEST);
  assert.match(item, endsWithResult(NO_OBLIGATION_FAILED_TEST, "failed"));
});

Then("the scenario's row shows the test that passed as passed", function () {
  const item = rowItemFor(NO_OBLIGATION_SCENARIO, NO_OBLIGATION_PASSED_TEST);
  assert.match(item, endsWithResult(NO_OBLIGATION_PASSED_TEST, "passed"));
});

function savedObservationAt(locator: string, status: string): Record<string, unknown> {
  const observations = savedJson.ledger.claimReconciliations.flatMap((row) => row.evidenceObservations);
  const found = observations.find((o) => o["locator"] === locator && o["status"] === status);
  assert.ok(found, `expected the JSON report to carry a ${status} evidence observation at ${locator}`);
  return found;
}

Then("the JSON report's evidence observation for the Vitest test carries the test's title as its name", function () {
  assert.equal(savedObservationAt(MIXED_FILE.locator, "failed")["testName"], MIXED_FILE_FAILED_TEST);
});

Then("the JSON report's evidence observation for the Cucumber scenario carries the scenario's name as its name", function () {
  assert.equal(savedObservationAt(FEATURE_FILE, "failed")["testName"], FEATURE_FILE_FAILED_SCENARIO);
});
