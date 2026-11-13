import { strict as assert } from "node:assert";
import { spawnSync, type SpawnSyncReturns } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { After, Given, Then, When, type World } from "@cucumber/cucumber";
import {
  featureAsWrittenFrom,
  observationsOfScenarios,
  scenarioResultsFrom,
  type EvidenceObservation,
} from "../../packages/core/src/index.js";

const REPOSITORY = resolve(__dirname, "../..");
const CUCUMBER = join(REPOSITORY, "node_modules/@cucumber/cucumber/bin/cucumber.js");

interface Target extends World {
  folder: string;
  posted: readonly EvidenceObservation[];
}

const OUTLINE = `@ONE
Feature: one

  @integration
  Scenario Outline: one adds <n>
    Given one adds <n>

    Examples:
      | clm         | n |
      | CLM-ONE-001 | 1 |
      | CLM-ONE-002 | 2 |
`;

// The target's own step, loaded from this repository's Cucumber, the one that runs it.
const STEPS = `import { Given } from ${JSON.stringify(pathToFileURL(join(REPOSITORY, "node_modules/@cucumber/cucumber/lib/index.js")).href)};
Given("one adds {int}", (_n) => {});
`;

const run = (folder: string, command: string, args: readonly string[]): SpawnSyncReturns<string> =>
  spawnSync(process.execPath, [command, ...args], { cwd: folder, encoding: "utf8" });

Given("two executable claims were rows of one Scenario Outline, with the claim codes CLM-ONE-001 and CLM-ONE-002", function (this: Target) {
  this.folder = mkdtempSync(join(tmpdir(), "spec-controller-rows-"));
  mkdirSync(join(this.folder, "features"));
  writeFileSync(join(this.folder, "features", "one.feature"), OUTLINE);
  writeFileSync(join(this.folder, "one.steps.mjs"), STEPS);
});

Given("Cucumber's evidence report had a result for each row", function (this: Target) {
  const cucumber = run(this.folder, CUCUMBER, ["features/one.feature", "--import", "one.steps.mjs", "--format", "json:cucumber.json"]);
  assert.equal(cucumber.status, 0, cucumber.stdout + cucumber.stderr);
});

// The report Cucumber wrote, read by balance's own reader and posted beside the feature file it ran.
When("balance posts the evidence", function (this: Target) {
  const feature = featureAsWrittenFrom("one.feature", readFileSync(join(this.folder, "features", "one.feature"), "utf8"));
  const report: unknown = JSON.parse(readFileSync(join(this.folder, "cucumber.json"), "utf8"));
  this.posted = observationsOfScenarios(scenarioResultsFrom(report), [feature], this.folder);
});

Then("an Evidence Observation will be posted for each row, citing the claim code of its row", function (this: Target) {
  const citedByRow = this.posted.map(({ name, cites }) => ({ name, cites: cites.map(({ featureCode, number }) => `CLM-${featureCode}-${number}`) }));
  assert.deepEqual(citedByRow, [
    { name: "one adds 1", cites: ["CLM-ONE-001"] },
    { name: "one adds 2", cites: ["CLM-ONE-002"] },
  ]);
});

After(function (this: Target) {
  if (this.folder) rmSync(this.folder, { recursive: true, force: true });
});
