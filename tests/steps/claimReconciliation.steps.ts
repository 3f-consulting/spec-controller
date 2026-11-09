import { Given, Then, When } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { NODE, SPEC_CONTROLLER_ARGV } from "./support/builtCli.js";
import { entryText, shownEntry, showsEntry } from "./support/catalogue.js";
import { claimReconciliationCell } from "./support/claimReconciliationsTable.js";
import { claimReconciliationsOf } from "./support/reportClaimReconciliations.js";
import { temporaryDirectory } from "./support/temporaryDirectory.js";
import type { SpecControllerWorld } from "./support/world.js";

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

const CITES_UNKNOWN_CLAIM_STATUS = {
  features: "tests/fixtures/cites-unknown-claim-status/features",
  vitest: "tests/fixtures/cites-unknown-claim-status/vitest.json",
  packageJson: "tests/fixtures/cites-unknown-claim-status/package.json",
  ci: "tests/fixtures/cites-unknown-claim-status",
};

const NO_OBLIGATION_STATUS = {
  features: "tests/fixtures/no-obligation-status/features",
  vitest: "tests/fixtures/no-obligation-status/vitest.json",
  packageJson: "tests/fixtures/no-obligation-status/package.json",
  ci: "tests/fixtures/no-obligation-status",
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

const MIXED_FILE = { locator: "tests/fixtures/unnamed-claim-status/broken-spawn.test.ts", ran: 2, passed: 1, failed: 1 };

const MIXED_FILE_FAILED_TEST = "spawns yarn";

const MIXED_FILE_PASSED_TEST = "reads the lockfile";

const FEATURE_FILE = "tests/fixtures/unnamed-claim-status/features/checkout.feature";

const FEATURE_FILE_FAILED_SCENARIO = "a basket with an expired coupon is refused";

const FEATURE_FILE_PASSED_SCENARIO = "an empty basket cannot be checked out";

const PASSING_FILE = { locator: "tests/fixtures/unnamed-claim-status/sound.test.ts", ran: 1, passed: 1, failed: 0 };

const UNCITED_STEPS = ["ci.yml:ci:pnpm lint:bar", "ci.yml:ci:pnpm lint:foo"];

const UNCITED_TEST_FILE = "tests/fixtures/unnamed-claim-steps/sound.test.ts";

const PHANTOM_CLAIM = "CLM-PST-901";

const PHANTOM_CLAIM_FAILED_TEST = "tests/fixtures/cites-unknown-claim-status/broken-spawn.test.ts";

const PHANTOM_CLAIM_PASSED_TEST = "tests/fixtures/cites-unknown-claim-status/sound.test.ts";

const NO_OBLIGATION_SCENARIO = "CLM-NOS-001";

const NO_OBLIGATION_FAILED_TEST = "tests/fixtures/no-obligation-status/broken-spawn.test.ts";

const NO_OBLIGATION_PASSED_TEST = "tests/fixtures/no-obligation-status/sound.test.ts";

function rowItemFor(world: SpecControllerWorld, rowName: string, locator: string): string {
  const row = world.report.split("\n").find((line) => line.startsWith(`| ${rowName} |`));
  assert.ok(row, `expected a ${rowName} row in the report; got:\n${world.report}`);
  const item = row.split(/; | \| /).find((part) => part.includes(`(${locator})`) || part.includes(`(${locator}: `));
  assert.ok(item, `expected the ${rowName} row to list the test at ${locator}; got:\n${row}`);
  return item.replace(/ \|$/, "");
}

function unnamedClaimItems(world: SpecControllerWorld): string[] {
  return claimReconciliationCell(world.report, "(unnamed claim)", entryText("reconciling-items-column")).split("; ");
}

function unnamedClaimItemsFor(world: SpecControllerWorld, locator: string): string[] {
  return unnamedClaimItems(world).filter((item) => item.includes(`(${locator})`) || item.includes(`(${locator}: `));
}

function uncitedOutcomeCount(world: SpecControllerWorld): number {
  const uncitedOutcomeRow = entryText("outcome-cites-no-claim");
  const outcomeRow = world.report.split("\n").find((line) => line.startsWith(`| ${uncitedOutcomeRow} |`));
  assert.ok(outcomeRow, `expected a "${uncitedOutcomeRow}" row in the report; got:\n${world.report}`);
  return Number(outcomeRow.split(" | ")[3]);
}

// An entry's counts of its own tests, read from the part after its last dash.
const groupCounts = (item: string) => shownEntry(item.split(" — ").at(-1) ?? "", "unnamed-claim-group-counts");

// A count left a slot selects the entry's plural form, so the singular is asked for by its count.
function ciStepsCount(item: string): string | undefined {
  const steps = item.split(" — ").at(-1) ?? "";
  return shownEntry(steps, "unnamed-claim-ci-steps-named")?.["count"] ?? (showsEntry(steps, "unnamed-claim-ci-steps-named", { count: "1" }) ? "1" : undefined);
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
  const escape = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`${escape(`(${locator}`)}(?:: .*)?${escape(`) — ${result}`)}$`);
}

Given(
  "a target whose tests that cite no claim ran in two files, one file holding a test that failed and a test that passed",
  function (this: SpecControllerWorld) {
    this.invocationArgs = argsFor(UNNAMED_CLAIM_STATUS);
  },
);

Given(
  "a target whose Cucumber scenarios that cite no claim ran in one feature file, one that failed and one that passed",
  function (this: SpecControllerWorld) {
    this.invocationArgs = [...argsFor(UNNAMED_CLAIM_STATUS), "--cucumber", "tests/fixtures/unnamed-claim-status/cucumber.json"];
  },
);

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

Given("a target whose CI runs two checks that cite no claim, beside a test that cites no claim", function (this: SpecControllerWorld) {
  this.invocationArgs = argsFor(UNNAMED_CLAIM_STEPS);
});

Given(
  "a target with two tests that cite a scenario no feature carries, one that failed and one that passed",
  function (this: SpecControllerWorld) {
    this.invocationArgs = argsFor(CITES_UNKNOWN_CLAIM_STATUS);
  },
);

Given(
  "a target with two tests that cite a scenario holding no obligation at the check they ran at, one that failed and one that passed",
  function (this: SpecControllerWorld) {
    this.invocationArgs = argsFor(NO_OBLIGATION_STATUS);
  },
);

When("the target's evidence is reconciled into a report", function (this: SpecControllerWorld) {
  const result = spawnSync(NODE, [...SPEC_CONTROLLER_ARGV, "balance", ...this.invocationArgs], {
    cwd: process.cwd(),
    encoding: "utf8",
  });
  assert.equal(result.error, undefined, `CLI failed to spawn: ${result.error?.message}`);
  assert.equal(result.status, 1, `expected the out-of-balance exit; got ${result.status}\nstderr:\n${result.stderr}`);
  this.report = result.stdout;
});

When("the target's evidence is reconciled and saved as the JSON report", function (this: SpecControllerWorld) {
  const jsonPath = join(temporaryDirectory(this, "spec-controller-rmd010-"), "spec-reconciliation.json");
  const result = spawnSync(NODE, [...SPEC_CONTROLLER_ARGV, "balance", ...this.invocationArgs, "--format", `json:${jsonPath}`], {
    cwd: process.cwd(),
    encoding: "utf8",
  });
  assert.equal(result.status, this.verdictExit, `expected the verdict's exit ${this.verdictExit}; got ${result.status}\nstderr:\n${result.stderr}`);
  this.savedJson = JSON.parse(readFileSync(jsonPath, "utf8"));
});

Then("the unnamed claim's row lists each of the two files once", function (this: SpecControllerWorld) {
  for (const { locator } of [MIXED_FILE, PASSING_FILE]) {
    const items = unnamedClaimItemsFor(this, locator);
    assert.equal(items.length, 1, `expected the unnamed claim's row to list ${locator} once; got:\n${unnamedClaimItems(this).join("\n")}`);
  }
});

Then("each file's entry counts how many of its tests ran, how many passed and how many failed", function (this: SpecControllerWorld) {
  for (const { locator, ran, passed, failed } of [MIXED_FILE, PASSING_FILE]) {
    const [item] = unnamedClaimItemsFor(this, locator);
    const counts = ` — ${entryText("unnamed-claim-group-counts", { ran: String(ran), passed: String(passed), failed: String(failed) })}`;
    assert.ok(
      item?.endsWith(counts) || item?.includes(`${counts} `),
      `expected ${locator}'s entry to count "${counts.slice(3)}"; got:\n${item}`,
    );
  }
});

Then("the counts of tests that ran add up to the count of evidence observations that cite no claim", function (this: SpecControllerWorld) {
  const uncited = uncitedOutcomeCount(this);
  const ran = unnamedClaimItems(this).reduce((sum, item) => sum + Number(groupCounts(item)?.["ran"] ?? Number.NaN), 0);
  assert.equal(ran, uncited, `the unnamed claim's row's ran counts must add up to ${uncited}; got:\n${unnamedClaimItems(this).join("\n")}`);
  assert.equal(uncited, MIXED_FILE.ran + PASSING_FILE.ran);
});

function mixedFileEntry(world: SpecControllerWorld): string {
  const [item] = unnamedClaimItemsFor(world, MIXED_FILE.locator);
  assert.ok(item, `expected the unnamed claim's row to list ${MIXED_FILE.locator}; got:\n${unnamedClaimItems(world).join("\n")}`);
  return item;
}

Then("the file's entry on the unnamed claim's row names the test that failed by its title", function (this: SpecControllerWorld) {
  const entry = mixedFileEntry(this);
  assert.ok(entry.endsWith(entryText("unnamed-claim-failed-names", { names: MIXED_FILE_FAILED_TEST })), `expected the entry to name "${MIXED_FILE_FAILED_TEST}" as failed; got:\n${entry}`);
});

Then("the file's entry does not name the test that passed", function (this: SpecControllerWorld) {
  const entry = mixedFileEntry(this);
  assert.ok(!entry.includes(MIXED_FILE_PASSED_TEST), `expected the entry not to name "${MIXED_FILE_PASSED_TEST}"; got:\n${entry}`);
});

function featureFileEntry(world: SpecControllerWorld): string {
  const [item] = unnamedClaimItemsFor(world, FEATURE_FILE);
  assert.ok(item, `expected the unnamed claim's row to list ${FEATURE_FILE}; got:\n${unnamedClaimItems(world).join("\n")}`);
  return item;
}

Then("the feature file's entry on the unnamed claim's row names the Cucumber scenario that failed by its name", function (this: SpecControllerWorld) {
  const entry = featureFileEntry(this);
  assert.ok(entry.endsWith(entryText("unnamed-claim-failed-names", { names: FEATURE_FILE_FAILED_SCENARIO })), `expected the entry to name "${FEATURE_FILE_FAILED_SCENARIO}" as failed; got:\n${entry}`);
});

Then("the feature file's entry does not name the Cucumber scenario that passed", function (this: SpecControllerWorld) {
  const entry = featureFileEntry(this);
  assert.ok(!entry.includes(FEATURE_FILE_PASSED_SCENARIO), `expected the entry not to name "${FEATURE_FILE_PASSED_SCENARIO}"; got:\n${entry}`);
});

function stepsEntryIndex(world: SpecControllerWorld): number {
  const indices = unnamedClaimItems(world).flatMap((item, i) => (UNCITED_STEPS.some((name) => item.includes(name)) ? [i] : []));
  assert.equal(indices.length, 1, `expected the CI steps listed together once; got:\n${unnamedClaimItems(world).join("\n")}`);
  return indices[0]!;
}

Then("the unnamed claim's row lists the CI steps together once, after the test's file", function (this: SpecControllerWorld) {
  const fileIndex = unnamedClaimItems(this).findIndex((item) => item.includes(`(${UNCITED_TEST_FILE})`));
  assert.ok(fileIndex >= 0, `expected the unnamed claim's row to list ${UNCITED_TEST_FILE}; got:\n${unnamedClaimItems(this).join("\n")}`);
  assert.ok(stepsEntryIndex(this) > fileIndex, `expected the CI steps after the test's file; got:\n${unnamedClaimItems(this).join("\n")}`);
});

Then("the CI steps' entry names each of the two checks", function (this: SpecControllerWorld) {
  const entry = unnamedClaimItems(this)[stepsEntryIndex(this)];
  assert.ok(
    entry?.endsWith(` — ${entryText("unnamed-claim-ci-steps-named", { count: String(UNCITED_STEPS.length), list: UNCITED_STEPS.join(", ") })}`),
    `expected the CI steps' entry to name ${UNCITED_STEPS.join(" and ")}; got:\n${entry}`,
  );
});

Then("what the unnamed claim's row counts adds up to the count of evidence observations that cite no claim", function (this: SpecControllerWorld) {
  const uncited = uncitedOutcomeCount(this);
  const counted = unnamedClaimItems(this).reduce(
    (sum, item) => sum + Number(groupCounts(item)?.["ran"] ?? ciStepsCount(item) ?? Number.NaN),
    0,
  );
  assert.equal(counted, uncited, `the unnamed claim's row's counts must add up to ${uncited}; got:\n${unnamedClaimItems(this).join("\n")}`);
  assert.equal(uncited, UNCITED_STEPS.length + 1);
});

Then("the phantom claim's row shows the test that failed as failed", function (this: SpecControllerWorld) {
  const item = rowItemFor(this, PHANTOM_CLAIM, PHANTOM_CLAIM_FAILED_TEST);
  assert.match(item, endsWithResult(PHANTOM_CLAIM_FAILED_TEST, entryText("observation-failed")));
});

Then("the phantom claim's row shows the test that passed as passed", function (this: SpecControllerWorld) {
  const item = rowItemFor(this, PHANTOM_CLAIM, PHANTOM_CLAIM_PASSED_TEST);
  assert.match(item, endsWithResult(PHANTOM_CLAIM_PASSED_TEST, entryText("observation-passed")));
});

Then("the scenario's row shows the test that failed as failed", function (this: SpecControllerWorld) {
  const item = rowItemFor(this, NO_OBLIGATION_SCENARIO, NO_OBLIGATION_FAILED_TEST);
  assert.match(item, endsWithResult(NO_OBLIGATION_FAILED_TEST, entryText("observation-failed")));
});

Then("the scenario's row shows the test that passed as passed", function (this: SpecControllerWorld) {
  const item = rowItemFor(this, NO_OBLIGATION_SCENARIO, NO_OBLIGATION_PASSED_TEST);
  assert.match(item, endsWithResult(NO_OBLIGATION_PASSED_TEST, entryText("observation-passed")));
});

function savedObservationAt(world: SpecControllerWorld, locator: string, status: string): Record<string, unknown> {
  const observations = claimReconciliationsOf(world.savedJson).flatMap((row) =>
    row.qualityCheckReconciliations.flatMap((reconciliation) => reconciliation.evidenceObservations ?? [])
  );
  const found = observations.find((o) => o["locator"] === locator && o["status"] === status);
  assert.ok(found, `expected the JSON report to carry a ${status} evidence observation at ${locator}`);
  return found;
}

Then("the JSON report's evidence observation for the Vitest test carries the test's title as its name", function (this: SpecControllerWorld) {
  assert.equal(savedObservationAt(this, MIXED_FILE.locator, "failed")["testName"], MIXED_FILE_FAILED_TEST);
});

Then("the JSON report's evidence observation for the Cucumber scenario carries the scenario's name as its name", function (this: SpecControllerWorld) {
  assert.equal(savedObservationAt(this, FEATURE_FILE, "failed")["testName"], FEATURE_FILE_FAILED_SCENARIO);
});
