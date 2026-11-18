import { describe, expect, it } from "vitest";
import cucumberVariants from "./cucumber.variants.json" with { type: "json" };
import { breaksFound } from "./reportVariants.test-utils.js";
import { whereScenarioResultsBreak } from "./cucumber.js";

const passed = { status: "passed" };

describe("an input that is not valid will stop the run", () => {
  it("[CLM-CLI-152] each Cucumber evidence report broken at one entry is not in Cucumber's shape, and breaks where it is broken", () => {
    const { found, listed } = breaksFound(cucumberVariants["CLM-CLI-152"].variants, whereScenarioResultsBreak);

    expect(found).toEqual(listed);
  });

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
