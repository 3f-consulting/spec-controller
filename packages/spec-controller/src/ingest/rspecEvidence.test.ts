import { describe, it, expect } from "vitest";
import { renderMarkdown, runVerdict, type RunContext } from "@3f-consulting/spec-controller-core";
import { runReconcile } from "./corpusReading.test-utils.js";
import { resolveTargetRoot } from "../run-management/resolveRunInputs.js";
import { runInputsOf } from "../cli-balance/evidenceInputs.js";
import { reportedExitCodeOf } from "../cli-balance/exitStatus.js";

const TARGET = "tests/fixtures/rspec";

describe("[SCN-RSP-001] runReconcile reads a real RSpec report as unit evidence", () => {
  it("reconciles the scenario a passing RSpec example cites in its description as satisfied, by that example", () => {
    const balance = runReconcile({
      features: `${TARGET}/features`,
      packageJson: `${TARGET}/package.json`,
      ci: TARGET,
      rspec: `${TARGET}/report.json`,
    }, resolveTargetRoot({ features: `${TARGET}/features` }));
    const unit = balance.ledger.claimReconciliations
      .find((s) => s.scnId === "SCN-RSF-001")
      ?.qualityCheckReconciliations.find((q) => q.qualityCheck === "unit");

    expect(unit?.outcome).toBe("satisfied");
    expect(unit?.evidenceObservation).toMatchObject({
      status: "passed",
      locator: "tests/fixtures/rspec/project/spec/cases_spec.rb",
      testName: "An RSpec fixture suite [SCN-RSF-001] a passing example cites its scenario",
    });
  });
});

describe("[SCN-RSP-002] runReconcile reads a failing RSpec example as a failing unit evidence observation", () => {
  it("reconciles the scenario a failing RSpec example cites in its description as failing, by that example", () => {
    const balance = runReconcile({
      features: `${TARGET}/features`,
      packageJson: `${TARGET}/package.json`,
      ci: TARGET,
      rspec: `${TARGET}/report.json`,
    }, resolveTargetRoot({ features: `${TARGET}/features` }));
    const unit = balance.ledger.claimReconciliations
      .find((s) => s.scnId === "SCN-RSF-002")
      ?.qualityCheckReconciliations.find((q) => q.qualityCheck === "unit");

    expect(unit?.outcome).toBe("failing");
    expect(unit?.evidenceObservation).toMatchObject({
      status: "failed",
      locator: "tests/fixtures/rspec/project/spec/cases_spec.rb",
      testName: "An RSpec fixture suite [SCN-RSF-002] a failing example cites its scenario",
    });
  });
});

describe("[SCN-RSP-003] runReconcile reads a code in an RSpec example's own description before a code in the groups around it", () => {
  const unitOf = (scnId: string) => runReconcile({
    features: `${TARGET}/features`,
    packageJson: `${TARGET}/package.json`,
    ci: TARGET,
    rspec: `${TARGET}/report.json`,
  }, resolveTargetRoot({ features: `${TARGET}/features` })).ledger.claimReconciliations
    .find((s) => s.scnId === scnId)
    ?.qualityCheckReconciliations.find((q) => q.qualityCheck === "unit");

  it("credits the scenario the example's own description cites, not the one its group cites", () => {
    const unit = unitOf("SCN-RSF-003");

    expect(unit?.outcome).toBe("satisfied");
    expect(unit?.evidenceObservation).toMatchObject({
      status: "passed",
      testName: "An RSpec fixture suite [SCN-RSF-004] a group that cites a scenario [SCN-RSF-003] an example whose own description cites a scenario",
    });
    expect(unit?.evidenceObservation?.notes).toBeUndefined();
  });

  it("credits the group's scenario to an example whose own description cites nothing, and to no other example", () => {
    const unit = unitOf("SCN-RSF-004");

    expect(unit?.outcome).toBe("satisfied");
    expect(unit?.evidenceObservation).toMatchObject({
      status: "passed",
      testName: "An RSpec fixture suite [SCN-RSF-004] a group that cites a scenario an example whose own description cites nothing",
    });
  });
});

describe("[SCN-RSP-004] runReconcile credits neither scenario an RSpec example's description cites when it cites two, and the unnamed claim's row names both codes", () => {
  const balance = () => runReconcile({
    features: `${TARGET}/features`,
    packageJson: `${TARGET}/package.json`,
    ci: TARGET,
    rspec: `${TARGET}/report.json`,
  }, resolveTargetRoot({ features: `${TARGET}/features` }));
  const unitOf = (scnId: string) =>
    balance()
      .ledger.claimReconciliations
      .find((s) => s.scnId === scnId)
      ?.qualityCheckReconciliations.find((q) => q.qualityCheck === "unit");

  it.each(["SCN-RSF-005", "SCN-RSF-006"])("leaves %s missing, with no observation", (scnId) => {
    expect(unitOf(scnId)?.outcome).toBe("missing");
    expect(unitOf(scnId)?.evidenceObservation).toBeUndefined();
  });

  it("names both codes on the unnamed claim's row, beside the example's file", () => {
    const ctx: RunContext = { target: TARGET, inputs: runInputsOf({}), corpus: "features", runStart: new Date("2026-10-15T09:00:00.000Z"), sourceSha: null };
    const unnamedClaimRow = renderMarkdown(balance(), ctx, reportedExitCodeOf)
      .split("\n")
      .find((line) => line.startsWith("| (unnamed claim) | ") && line.includes("cases_spec.rb: 2 scenario codes"));

    expect(unnamedClaimRow ?? "").toContain("cases_spec.rb: 2 scenario codes cite SCN-RSF-005, SCN-RSF-006");
  });
});

describe("[SCN-RSP-005] runReconcile reads a skipped or pending RSpec example as no evidence observation", () => {
  const unitOf = (scnId: string) => runReconcile({
    features: `${TARGET}/features`,
    packageJson: `${TARGET}/package.json`,
    ci: TARGET,
    rspec: `${TARGET}/report.json`,
  }, resolveTargetRoot({ features: `${TARGET}/features` })).ledger.claimReconciliations
    .find((s) => s.scnId === scnId)
    ?.qualityCheckReconciliations.find((q) => q.qualityCheck === "unit");

  it.each([
    ["a skipped", "SCN-RSF-007"],
    ["an xit", "SCN-RSF-008"],
    ["a pending and failing", "SCN-RSF-009"],
  ])("leaves the scenario %s example cites missing, with no observation", (_, scnId) => {
    const unit = unitOf(scnId);

    expect(unit?.outcome).toBe("missing");
    expect(unit?.evidenceObservation).toBeUndefined();
  });
});

describe("[SCN-RSP-006] runReconcile reads a pending RSpec example that passes as a failing unit evidence observation", () => {
  it("reconciles the scenario a pending example that passes cites as failing, by that example", () => {
    const unit = runReconcile({
      features: `${TARGET}/features`,
      packageJson: `${TARGET}/package.json`,
      ci: TARGET,
      rspec: `${TARGET}/report.json`,
    }, resolveTargetRoot({ features: `${TARGET}/features` })).ledger.claimReconciliations
      .find((s) => s.scnId === "SCN-RSF-010")
      ?.qualityCheckReconciliations.find((q) => q.qualityCheck === "unit");

    expect(unit?.outcome).toBe("failing");
    expect(unit?.evidenceObservation).toMatchObject({
      status: "failed",
      locator: "tests/fixtures/rspec/project/spec/cases_spec.rb",
      testName: "An RSpec fixture suite [SCN-RSF-010] a pending example that passes cites its scenario",
    });
  });
});

describe("[SCN-RSP-007] runReconcile reads an RSpec example a failing before hook stopped as a failing unit evidence observation", () => {
  it.each([
    ["before", "SCN-RSF-011", "An RSpec fixture suite with a before hook that fails [SCN-RSF-011] an example after a failing before hook cites its scenario"],
    ["before(:context)", "SCN-RSF-012", "An RSpec fixture suite with a before(:context) hook that fails [SCN-RSF-012] an example after a failing before(:context) hook cites its scenario"],
  ])("reconciles the scenario an example after a failing %s hook cites as failing, by that example", (_, scnId, testName) => {
    const unit = runReconcile({
      features: `${TARGET}/features`,
      packageJson: `${TARGET}/package.json`,
      ci: TARGET,
      rspec: `${TARGET}/report.json`,
    }, resolveTargetRoot({ features: `${TARGET}/features` })).ledger.claimReconciliations
      .find((s) => s.scnId === scnId)
      ?.qualityCheckReconciliations.find((q) => q.qualityCheck === "unit");

    expect(unit?.outcome).toBe("failing");
    expect(unit?.evidenceObservation).toMatchObject({
      status: "failed",
      locator: "tests/fixtures/rspec/project/spec/cases_spec.rb",
      testName,
    });
  });
});

describe("[SCN-RSP-008] runReconcile reads a real RSpec run with a spec file that failed to load as broken evidence, and the run is unsound", () => {
  const balance = () => runReconcile({
    features: `${TARGET}/features`,
    packageJson: `${TARGET}/package.json`,
    ci: TARGET,
    rspec: `${TARGET}/report.json`,
  }, resolveTargetRoot({ features: `${TARGET}/features` }));

  it("posts one broken item, on the unnamed claim's row, naming the file and carrying RSpec's load error", () => {
    const broken = balance().ledger.claimReconciliations.flatMap((row) =>
      row.reconcilingItems.filter((item) => item.outcome === "broken").map((item) => ({ kind: row.kind, item }))
    );

    expect(broken).toHaveLength(1);
    expect(broken[0]?.kind).toBe("unnamed-claim");
    expect(broken[0]?.item.locator).toBe("tests/fixtures/rspec/project/spec/unloadable_spec.rb");
    expect(broken[0]?.item.message).toContain("While loading ./tests/fixtures/rspec/project/spec/unloadable_spec.rb a `raise SyntaxError` occurred");
  });

  it("stamps the run unsound, though the other file's examples ran", () => {
    const ledger = balance().ledger;
    const unit = ledger.claimReconciliations
      .find((s) => s.scnId === "SCN-RSF-001")
      ?.qualityCheckReconciliations.find((q) => q.qualityCheck === "unit");

    expect(unit?.outcome).toBe("satisfied");
    expect(runVerdict({ ledger, strict: false })).toBe("unsound");
  });
});
