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

const TARGET = "tests/fixtures/rspec";
const balance = () => reconcileFixture(TARGET, { rspec: `${TARGET}/report.json` });
const unitOf = (claimCode: string) => unitReconciliationOf(balance(), claimCode);
const CASES_SPEC = "tests/fixtures/rspec/project/spec/cases_spec.rb";

describe("[SCN-RSP-001] runReconcile reads a real RSpec report as unit evidence", () => {
  it("reconciles the scenario a passing RSpec example cites in its description as satisfied, by that example", () => {
    expectSoleObservation(unitOf("SCN-RSF-001"), "satisfied", {
      status: "passed",
      locator: CASES_SPEC,
      testName: "An RSpec fixture suite [SCN-RSF-001] a passing example cites its scenario",
    });
  });
});

describe("[SCN-RSP-002] runReconcile reads a failing RSpec example as a failing unit evidence observation", () => {
  it("reconciles the scenario a failing RSpec example cites in its description as failing, by that example", () => {
    expectSoleObservation(unitOf("SCN-RSF-002"), "failing", {
      status: "failed",
      locator: CASES_SPEC,
      testName: "An RSpec fixture suite [SCN-RSF-002] a failing example cites its scenario",
    });
  });
});

describe("[SCN-RSP-003] runReconcile reads a code in an RSpec example's own description before a code in the groups around it", () => {
  it("credits the scenario the example's own description cites, not the one its group cites", () => {
    const unit = unitOf("SCN-RSF-003");

    expectSoleObservation(unit, "satisfied", {
      status: "passed",
      testName: "An RSpec fixture suite [SCN-RSF-004] a group that cites a scenario [SCN-RSF-003] an example whose own description cites a scenario",
    });
    expect(unit?.evidenceObservations?.[0]?.notes).toBeUndefined();
  });

  it("credits the group's scenario to an example whose own description cites nothing, and to no other example", () => {
    expectSoleObservation(unitOf("SCN-RSF-004"), "satisfied", {
      status: "passed",
      testName: "An RSpec fixture suite [SCN-RSF-004] a group that cites a scenario an example whose own description cites nothing",
    });
  });
});

describe("[SCN-RSP-004] runReconcile credits neither scenario an RSpec example's description cites when it cites two, and the unnamed claim's row names both codes", () => {
  it.each(["SCN-RSF-005", "SCN-RSF-006"])("leaves %s missing, with no observation", (claimCode) => {
    expectMissingWithNoObservation(unitOf(claimCode));
  });

  it("names both codes on the unnamed claim's row, beside the example's file", () => {
    expect(unnamedClaimRowOf(balance(), TARGET, "cases_spec.rb: 2 claim codes")).toContain("cases_spec.rb: 2 claim codes cite SCN-RSF-005, SCN-RSF-006");
  });
});

describe("[SCN-RSP-005] runReconcile reads a skipped or pending RSpec example as no evidence observation", () => {
  it.each([
    ["a skipped", "SCN-RSF-007"],
    ["an xit", "SCN-RSF-008"],
    ["a pending and failing", "SCN-RSF-009"],
  ])("leaves the scenario %s example cites missing, with no observation", (_, claimCode) => {
    expectMissingWithNoObservation(unitOf(claimCode));
  });
});

describe("[SCN-RSP-006] runReconcile reads a pending RSpec example that passes as a failing unit evidence observation", () => {
  it("reconciles the scenario a pending example that passes cites as failing, by that example", () => {
    expectSoleObservation(unitOf("SCN-RSF-010"), "failing", {
      status: "failed",
      locator: CASES_SPEC,
      testName: "An RSpec fixture suite [SCN-RSF-010] a pending example that passes cites its scenario",
    });
  });
});

describe("[SCN-RSP-007] runReconcile reads an RSpec example a failing before hook stopped as a failing unit evidence observation", () => {
  it.each([
    ["before", "SCN-RSF-011", "An RSpec fixture suite with a before hook that fails [SCN-RSF-011] an example after a failing before hook cites its scenario"],
    ["before(:context)", "SCN-RSF-012", "An RSpec fixture suite with a before(:context) hook that fails [SCN-RSF-012] an example after a failing before(:context) hook cites its scenario"],
  ])("reconciles the scenario an example after a failing %s hook cites as failing, by that example", (_, claimCode, testName) => {
    expectSoleObservation(unitOf(claimCode), "failing", { status: "failed", locator: CASES_SPEC, testName });
  });
});

describe("[SCN-RSP-008] runReconcile reads a real RSpec run with a spec file that failed to load as broken evidence, and the run is unsound", () => {
  it("posts one broken item, on the unnamed claim's row, naming the file and carrying RSpec's load error", () => {
    const observation = soleBrokenObservationOnUnnamedClaim(balance());

    expect(observation?.locator).toBe("tests/fixtures/rspec/project/spec/unloadable_spec.rb");
    expect(observation?.message).toContain("While loading ./tests/fixtures/rspec/project/spec/unloadable_spec.rb a `raise SyntaxError` occurred");
  });

  it("stamps the run unsound, though the other file's examples ran", () => {
    const run = balance();

    expect(unitReconciliationOf(run, "SCN-RSF-001")?.evidenceObservations?.map((o) => o.outcome)).toEqual(["satisfied"]);
    expect(runVerdictOf(run, TARGET)).toBe("unsound");
  });
});
