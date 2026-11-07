import { describe, it, expect } from "vitest";
import {
  expectMissingWithNoObservation,
  expectSoleObservation,
  reconcileFixture,
  runVerdictOf,
  soleBrokenObservationOnUnnamedClaim,
  unitReconciliationOf,
  unnamedClaimRowOf,
} from "./runnerEvidence.test-utils.js";

const TARGET = "tests/fixtures/jest";
const balance = () => reconcileFixture(TARGET, { jest: `${TARGET}/report.json` });
const unitOf = (claimCode: string) => unitReconciliationOf(balance(), claimCode);
const CASES_FILE = /tests\/fixtures\/jest\/project\/cases\.test\.js$/;

describe("[SCN-JST-001] runReconcile reads a real Jest report as unit evidence", () => {
  it("reconciles the scenario a passing Jest test cites in its title as satisfied, by that test", () => {
    expectSoleObservation(unitOf("SCN-JSF-001"), "satisfied", {
      status: "passed",
      locator: expect.stringMatching(CASES_FILE),
      testName: "[SCN-JSF-001] a passing test cites its scenario",
    });
  });
});

describe("[SCN-JST-002] runReconcile reads a failing Jest test as a failing unit evidence observation", () => {
  it("reconciles the scenario a failing Jest test cites in its title as failing, by that test", () => {
    expectSoleObservation(unitOf("SCN-JSF-002"), "failing", {
      status: "failed",
      locator: expect.stringMatching(CASES_FILE),
      testName: "[SCN-JSF-002] a failing test cites its scenario",
    });
  });
});

describe("[SCN-JST-003] runReconcile reads a code in a Jest test's own title before a code in the describe blocks around it", () => {
  it("credits the scenario the test's own title cites, not the one its describe block cites", () => {
    const unit = unitOf("SCN-JSF-003");

    expectSoleObservation(unit, "satisfied", {
      status: "passed",
      testName: "[SCN-JSF-004] a describe block that cites a scenario [SCN-JSF-003] a test whose own title cites a scenario",
    });
    expect(unit?.evidenceObservations?.[0]?.notes).toBeUndefined();
  });

  it("credits the describe block's scenario to a test whose own title cites nothing, and to no other test", () => {
    expectSoleObservation(unitOf("SCN-JSF-004"), "satisfied", {
      status: "passed",
      testName: "[SCN-JSF-004] a describe block that cites a scenario a test whose own title cites nothing",
    });
  });
});

describe("[SCN-JST-004] runReconcile credits neither scenario a Jest test's title cites when it cites two, and the unnamed claim's row names both codes", () => {
  it.each(["SCN-JSF-005", "SCN-JSF-006"])("leaves %s missing, with no observation", (claimCode) => {
    expectMissingWithNoObservation(unitOf(claimCode));
  });

  it("names both codes on the unnamed claim's row, beside the test's file", () => {
    expect(unnamedClaimRowOf(balance(), TARGET, "cases.test.js: 2 claim codes")).toContain("cases.test.js: 2 claim codes cite SCN-JSF-005, SCN-JSF-006");
  });
});

describe("[SCN-JST-005] runReconcile posts no evidence observation for a todo or skipped Jest test, so the scenario it cites reads missing", () => {
  it.each([
    ["a todo test", "SCN-JSF-007"],
    ["a skipped test", "SCN-JSF-008"],
  ])("leaves the scenario %s cites missing, with no observation", (_kind, claimCode) => {
    expectMissingWithNoObservation(unitOf(claimCode));
  });
});

describe("[SCN-JST-006] runReconcile reads a Jest test under a failing beforeAll as a failing unit evidence observation", () => {
  it("reconciles the scenario that test cites as failing, not broken, by that test", () => {
    const unit = unitOf("SCN-JSF-009");

    expectSoleObservation(unit, "failing", {
      status: "failed",
      locator: expect.stringMatching(CASES_FILE),
      testName: "a describe block whose beforeAll fails [SCN-JSF-009] a test under a failing beforeAll cites its scenario",
    });
    expect(unit?.evidenceObservations?.[0]?.broken).toBeUndefined();
  });
});

describe("[SCN-JST-007] runReconcile reads a Jest test file that failed to run as broken evidence, and the run is unsound", () => {
  it("posts one broken item, on the unnamed claim's row, naming the file and carrying the error that stopped it", () => {
    const observation = soleBrokenObservationOnUnnamedClaim(balance());

    expect(observation?.locator).toMatch(/tests\/fixtures\/jest\/project\/unloadable\.test\.js$/);
    expect(observation?.message).toContain("Test suite failed to run");
    expect(observation?.message).toContain("the test file could not be loaded");
  });

  it("stamps the run unsound", () => {
    expect(runVerdictOf(balance(), TARGET)).toBe("unsound");
  });
});
