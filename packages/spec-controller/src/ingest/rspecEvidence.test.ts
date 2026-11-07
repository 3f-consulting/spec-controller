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

describe("[CLM-RSP-001] runReconcile reads a real RSpec report as unit evidence", () => {
  it("reconciles the scenario a passing RSpec example cites in its description as satisfied, by that example", () => {
    expectSoleObservation(unitOf("CLM-RSF-001"), "satisfied", {
      status: "passed",
      locator: CASES_SPEC,
      testName: "An RSpec fixture suite [CLM-RSF-001] a passing example cites its scenario",
    });
  });
});

describe("[CLM-RSP-002] runReconcile reads a failing RSpec example as a failing unit evidence observation", () => {
  it("reconciles the scenario a failing RSpec example cites in its description as failing, by that example", () => {
    expectSoleObservation(unitOf("CLM-RSF-002"), "failing", {
      status: "failed",
      locator: CASES_SPEC,
      testName: "An RSpec fixture suite [CLM-RSF-002] a failing example cites its scenario",
    });
  });
});

describe("[CLM-RSP-003] runReconcile reads a code in an RSpec example's own description before a code in the groups around it", () => {
  it("credits the scenario the example's own description cites, not the one its group cites", () => {
    const unit = unitOf("CLM-RSF-003");

    expectSoleObservation(unit, "satisfied", {
      status: "passed",
      testName: "An RSpec fixture suite [CLM-RSF-004] a group that cites a scenario [CLM-RSF-003] an example whose own description cites a scenario",
    });
    expect(unit?.evidenceObservations?.[0]?.notes).toBeUndefined();
  });

  it("credits the group's scenario to an example whose own description cites nothing, and to no other example", () => {
    expectSoleObservation(unitOf("CLM-RSF-004"), "satisfied", {
      status: "passed",
      testName: "An RSpec fixture suite [CLM-RSF-004] a group that cites a scenario an example whose own description cites nothing",
    });
  });
});

describe("[CLM-RSP-004] runReconcile credits neither scenario an RSpec example's description cites when it cites two, and the unnamed claim's row names both codes", () => {
  it.each(["CLM-RSF-005", "CLM-RSF-006"])("leaves %s missing, with no observation", (claimCode) => {
    expectMissingWithNoObservation(unitOf(claimCode));
  });

  it("names both codes on the unnamed claim's row, beside the example's file", () => {
    expect(unnamedClaimRowOf(balance(), TARGET, "cases_spec.rb: 2 claim codes")).toContain("cases_spec.rb: 2 claim codes cite CLM-RSF-005, CLM-RSF-006");
  });
});

describe("[CLM-RSP-005] runReconcile reads a skipped or pending RSpec example as no evidence observation", () => {
  it.each([
    ["a skipped", "CLM-RSF-007"],
    ["an xit", "CLM-RSF-008"],
    ["a pending and failing", "CLM-RSF-009"],
  ])("leaves the scenario %s example cites missing, with no observation", (_, claimCode) => {
    expectMissingWithNoObservation(unitOf(claimCode));
  });
});

describe("[CLM-RSP-006] runReconcile reads a pending RSpec example that passes as a failing unit evidence observation", () => {
  it("reconciles the scenario a pending example that passes cites as failing, by that example", () => {
    expectSoleObservation(unitOf("CLM-RSF-010"), "failing", {
      status: "failed",
      locator: CASES_SPEC,
      testName: "An RSpec fixture suite [CLM-RSF-010] a pending example that passes cites its scenario",
    });
  });
});

describe("[CLM-RSP-007] runReconcile reads an RSpec example a failing before hook stopped as a failing unit evidence observation", () => {
  it.each([
    ["before", "CLM-RSF-011", "An RSpec fixture suite with a before hook that fails [CLM-RSF-011] an example after a failing before hook cites its scenario"],
    ["before(:context)", "CLM-RSF-012", "An RSpec fixture suite with a before(:context) hook that fails [CLM-RSF-012] an example after a failing before(:context) hook cites its scenario"],
  ])("reconciles the scenario an example after a failing %s hook cites as failing, by that example", (_, claimCode, testName) => {
    expectSoleObservation(unitOf(claimCode), "failing", { status: "failed", locator: CASES_SPEC, testName });
  });
});

describe("[CLM-RSP-008] runReconcile reads a real RSpec run with a spec file that failed to load as broken evidence, and the run is unsound", () => {
  it("posts one broken item, on the unnamed claim's row, naming the file and carrying RSpec's load error", () => {
    const observation = soleBrokenObservationOnUnnamedClaim(balance());

    expect(observation?.locator).toBe("tests/fixtures/rspec/project/spec/unloadable_spec.rb");
    expect(observation?.message).toContain("While loading ./tests/fixtures/rspec/project/spec/unloadable_spec.rb a `raise SyntaxError` occurred");
  });

  it("stamps the run unsound, though the other file's examples ran", () => {
    const run = balance();

    expect(unitReconciliationOf(run, "CLM-RSF-001")?.evidenceObservations?.map((o) => o.outcome)).toEqual(["satisfied"]);
    expect(runVerdictOf(run, TARGET)).toBe("unsound");
  });
});
