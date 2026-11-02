import { beforeEach, describe, expect, it } from "vitest";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { CI_STEP_RECORD, CUCUMBER_REPORT, PACKAGE_MANIFEST, shapeFaultIn, VITEST_REPORT } from "./inputShapes.js";

let fixtures: string;

beforeEach(() => {
  fixtures = fileURLToPath(new URL("../../../../tests/fixtures", import.meta.url));
});

function fixtureReports(file: string): Array<[string, unknown]> {
  return readdirSync(fixtures)
    .map((dir) => join(fixtures, dir, file))
    .filter((path) => existsSync(path))
    .map((path) => [path, JSON.parse(readFileSync(path, "utf8"))]);
}

describe("[SCN-CLI-076] a Vitest report is read only in the shape the Vitest JSON reporter writes", () => {
  it.each([
    [{ numTotalTests: 0 }, "testResults is missing"],
    [[], "the top level is a list, not an object"],
    [{ testResults: "x" }, "testResults is a string, not a list"],
    [{ testResults: [1] }, "testResults[0] is a number, not an object"],
    [{ testResults: [{ assertionResults: {} }] }, "testResults[0].assertionResults is an object, not a list"],
    [{ testResults: [{ name: 1, assertionResults: [] }] }, "testResults[0].name is a number, not a string"],
    [{ testResults: [{ assertionResults: [null] }] }, "testResults[0].assertionResults[0] is null, not an object"],
    [{ testResults: [{ assertionResults: [{ title: ["x"] }] }] }, "testResults[0].assertionResults[0].title is a list, not a string"],
  ])("names where %j is not that shape", (report, fault) => {
    expect(shapeFaultIn(report, VITEST_REPORT)).toBe(fault);
  });

  it("reads every Vitest report the fixture tree holds", () => {
    const reports = fixtureReports("vitest.json");
    expect(reports.length).toBeGreaterThan(10);
    for (const [path, report] of reports) expect([path, shapeFaultIn(report, VITEST_REPORT)]).toEqual([path, null]);
  });

  it("names a fault in a test file past the first, when the files before it are well-formed", () => {
    const report = JSON.parse(readFileSync(join(fixtures, "every-outcome-corpus", "vitest.json"), "utf8"));
    report.testResults[1].status = 7;
    expect(shapeFaultIn(report, VITEST_REPORT)).toBe("testResults[1].status is a number, not a string");
  });
});

describe("[SCN-CLI-077] a Cucumber report is read only in the shape the Cucumber JSON formatter writes", () => {
  it.each([
    [{}, "the top level is an object, not a list"],
    ["x", "the top level is a string, not a list"],
    [[null], "[0] is null, not an object"],
    [[{ elements: "x" }], "[0].elements is a string, not a list"],
    [[{ elements: [{ tags: {} }] }], "[0].elements[0].tags is an object, not a list"],
    [[{ elements: [{ tags: [{ name: 1 }] }] }], "[0].elements[0].tags[0].name is a number, not a string"],
    [[{ elements: [{ steps: "x" }] }], "[0].elements[0].steps is a string, not a list"],
    [[{ elements: [{ steps: [{ result: "passed" }] }] }], "[0].elements[0].steps[0].result is a string, not an object"],
    [[{ elements: [{ steps: [{ keyword: 1 }] }] }], "[0].elements[0].steps[0].keyword is a number, not a string"],
    [[{ uri: 1, elements: [] }], "[0].uri is a number, not a string"],
  ])("names where %j is not that shape", (report, fault) => {
    expect(shapeFaultIn(report, CUCUMBER_REPORT)).toBe(fault);
  });

  it("reads every Cucumber report the fixture tree holds", () => {
    const reports = fixtureReports("cucumber.json");
    expect(reports.length).toBeGreaterThan(5);
    for (const [path, report] of reports) expect([path, shapeFaultIn(report, CUCUMBER_REPORT)]).toEqual([path, null]);
  });

  it("names a step whose result's status is not a string, in a report otherwise in the formatter's shape", () => {
    const report = JSON.parse(readFileSync(join(fixtures, "every-outcome-corpus", "cucumber.json"), "utf8"));
    report[0].elements[0].steps[0].result.status = 7;
    expect(shapeFaultIn(report, CUCUMBER_REPORT)).toBe("[0].elements[0].steps[0].result.status is a number, not a string");
  });
});

describe("[SCN-CLI-078] a CI step record is read only as a record of step outcomes", () => {
  it.each([
    [[], "the top level is a list, not an object"],
    [null, "the top level is null, not an object"],
    [{ "SCN-ABC-001": "success" }, "SCN-ABC-001 is a string, not an object"],
    [{ "SCN-ABC-001": null }, "SCN-ABC-001 is null, not an object"],
    [{ "SCN-ABC-001": { outcome: 1 } }, "SCN-ABC-001.outcome is a number, not a string"],
  ])("names where %j is not that shape", (record, fault) => {
    expect(shapeFaultIn(record, CI_STEP_RECORD)).toBe(fault);
  });

  it("never checks a step the reader reads no evidence observation from: one not keyed by a scenario code", () => {
    expect(shapeFaultIn({ "dump-the-step-record": "x", "SCN-A-001": null, lint: 7 }, CI_STEP_RECORD)).toBeNull();
  });

  it.each(["xSCN-AAA-001", "SCN-AAA-001x"])("never checks a step keyed %s, which only contains a scenario code", (key) => {
    expect(shapeFaultIn({ [key]: { outcome: 7 } }, CI_STEP_RECORD)).toBeNull();
  });

  it("names a fault in a step past the first, when the steps before it are well-formed", () => {
    const record = JSON.parse(readFileSync(join(fixtures, "ci-steps-four-outcomes", "ci-steps.json"), "utf8"));
    record["SCN-CVT-002"].outcome = 7;
    expect(shapeFaultIn(record, CI_STEP_RECORD)).toBe("SCN-CVT-002.outcome is a number, not a string");
  });
});

describe("[SCN-CLI-079] a package.json is read only in a manifest's shape", () => {
  it.each([
    [[], "the top level is a list, not an object"],
    ["x", "the top level is a string, not an object"],
    [{ scripts: "x" }, "scripts is a string, not an object"],
    [{ scripts: { lint: 5 } }, "scripts.lint is a number, not a string"],
  ])("names where %j is not that shape", (manifest, fault) => {
    expect(shapeFaultIn(manifest, PACKAGE_MANIFEST)).toBe(fault);
  });
});
