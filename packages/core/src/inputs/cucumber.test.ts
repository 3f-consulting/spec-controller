import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import cucumberVariants from "./cucumber.variants.json" with { type: "json" };
import { breaksFound } from "./reportVariants.test-utils.js";
import { whereScenarioResultsBreak } from "./cucumber.js";

const passed = { status: "passed" };

describe("an input that is not valid will stop the run", () => {
  it("[CLM-CLI-152] the Cucumber evidence report each of those is edited from is in Cucumber's shape", () => {
    expect(whereScenarioResultsBreak(cucumberVariants["broken-cucumber-reports"].report)).toBeUndefined();
  });

  it("[CLM-CLI-152] each Cucumber evidence report with one field its reader reads missing, null or of the wrong kind, or a status Cucumber never writes, is not in Cucumber's shape, and breaks at that field", () => {
    const { found, listed } = breaksFound(cucumberVariants["broken-cucumber-reports"], whereScenarioResultsBreak);

    expect(found).toEqual(listed);
  });

  it.each(["failed.json", "passed-rule.json", "passed-scenario-outline.json", "passed-scenario.json", "rejected-pickle.json", "retried.json"])(
    "[CLM-CLI-152] a Cucumber evidence report cucumber-js's own JSON formatter wrote, %s, is in Cucumber's shape",
    (name) => {
      const report: unknown = JSON.parse(readFileSync(new URL(`./real-reports/cucumber-js/${name}`, import.meta.url), "utf8"));

      expect(whereScenarioResultsBreak(report)).toBeUndefined();
    },
  );

  it.each([
    ["a feature with no elements", [{ uri: "features/one.feature" }]],
    ["a scenario with no tags and no steps", [{ uri: "features/one.feature", elements: [{ type: "scenario", name: "one", line: 3 }] }]],
    [
      "a hook step with no name",
      [{ uri: "features/one.feature", elements: [{ type: "scenario", name: "one", line: 3, steps: [{ keyword: "Before", hidden: true, result: passed }, { keyword: "Given ", name: "a thing", result: passed }] }] }],
    ],
  ])("[CLM-CLI-152] a Cucumber evidence report with %s is in Cucumber's shape", (_given, report) => {
    expect(whereScenarioResultsBreak(report)).toBeUndefined();
  });
});
