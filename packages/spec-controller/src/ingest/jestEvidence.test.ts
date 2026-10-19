import { describe, it, expect } from "vitest";
import { renderMarkdown, verdictCode, type RunContext } from "@3f-consulting/spec-controller-core";
import { runReconcile } from "./ingestQualityChecks.js";
import { resolveTargetRoot } from "../run-management/resolveRunInputs.js";

const TARGET = "tests/fixtures/jest";

describe("[SCN-JST-001] runReconcile reads a real Jest report as unit evidence", () => {
  it("reconciles the scenario a passing Jest test cites in its title as satisfied, by that test", () => {
    const balance = runReconcile({
      features: `${TARGET}/features`,
      packageJson: `${TARGET}/package.json`,
      ci: TARGET,
      jest: `${TARGET}/report.json`,
    }, resolveTargetRoot({ features: `${TARGET}/features` }));
    const unit = balance.ledger.claimReconciliations
      .find((s) => s.scnId === "SCN-JSF-001")
      ?.qualityCheckReconciliations.find((q) => q.qualityCheck === "unit");

    expect(unit?.outcome).toBe("satisfied");
    expect(unit?.evidenceObservation).toMatchObject({
      status: "passed",
      locator: expect.stringMatching(/tests\/fixtures\/jest\/project\/cases\.test\.js$/),
      testName: "[SCN-JSF-001] a passing test cites its scenario",
    });
  });
});

describe("[SCN-JST-002] runReconcile reads a failing Jest test as a failing unit evidence observation", () => {
  it("reconciles the scenario a failing Jest test cites in its title as failing, by that test", () => {
    const balance = runReconcile({
      features: `${TARGET}/features`,
      packageJson: `${TARGET}/package.json`,
      ci: TARGET,
      jest: `${TARGET}/report.json`,
    }, resolveTargetRoot({ features: `${TARGET}/features` }));
    const unit = balance.ledger.claimReconciliations
      .find((s) => s.scnId === "SCN-JSF-002")
      ?.qualityCheckReconciliations.find((q) => q.qualityCheck === "unit");

    expect(unit?.outcome).toBe("failing");
    expect(unit?.evidenceObservation).toMatchObject({
      status: "failed",
      locator: expect.stringMatching(/tests\/fixtures\/jest\/project\/cases\.test\.js$/),
      testName: "[SCN-JSF-002] a failing test cites its scenario",
    });
  });
});

describe("[SCN-JST-003] runReconcile reads a code in a Jest test's own title before a code in the describe blocks around it", () => {
  const balance = () => runReconcile({
    features: `${TARGET}/features`,
    packageJson: `${TARGET}/package.json`,
    ci: TARGET,
    jest: `${TARGET}/report.json`,
  }, resolveTargetRoot({ features: `${TARGET}/features` }));
  const unitOf = (ledger: ReturnType<typeof balance>["ledger"], scnId: string) =>
    ledger.claimReconciliations
      .find((s) => s.scnId === scnId)
      ?.qualityCheckReconciliations.find((q) => q.qualityCheck === "unit");

  it("credits the scenario the test's own title cites, not the one its describe block cites", () => {
    const unit = unitOf(balance().ledger, "SCN-JSF-003");

    expect(unit?.outcome).toBe("satisfied");
    expect(unit?.evidenceObservation).toMatchObject({
      status: "passed",
      testName: "[SCN-JSF-004] a describe block that cites a scenario [SCN-JSF-003] a test whose own title cites a scenario",
    });
    expect(unit?.evidenceObservation?.notes).toBeUndefined();
  });

  it("credits the describe block's scenario to a test whose own title cites nothing, and to no other test", () => {
    const unit = unitOf(balance().ledger, "SCN-JSF-004");

    expect(unit?.outcome).toBe("satisfied");
    expect(unit?.evidenceObservation).toMatchObject({
      status: "passed",
      testName: "[SCN-JSF-004] a describe block that cites a scenario a test whose own title cites nothing",
    });
  });
});

describe("[SCN-JST-004] runReconcile credits neither scenario a Jest test's title cites when it cites two, and suspense names both codes", () => {
  const balance = () => runReconcile({
    features: `${TARGET}/features`,
    packageJson: `${TARGET}/package.json`,
    ci: TARGET,
    jest: `${TARGET}/report.json`,
  }, resolveTargetRoot({ features: `${TARGET}/features` }));
  const unitOf = (scnId: string) =>
    balance()
      .ledger.claimReconciliations
      .find((s) => s.scnId === scnId)
      ?.qualityCheckReconciliations.find((q) => q.qualityCheck === "unit");

  it.each(["SCN-JSF-005", "SCN-JSF-006"])("leaves %s missing, with no observation", (scnId) => {
    expect(unitOf(scnId)?.outcome).toBe("missing");
    expect(unitOf(scnId)?.evidenceObservation).toBeUndefined();
  });

  it("names both codes on the suspense row, beside the test's file", () => {
    const ctx: RunContext = { target: TARGET, inputs: {}, corpus: "features", runStart: new Date("2026-10-14T09:00:00.000Z"), sourceSha: null };
    const suspenseRow = renderMarkdown(balance(), ctx)
      .split("\n")
      .find((line) => line.startsWith("| (unnamed claim) | ") && line.includes("cases.test.js: 2 scenario codes"));

    expect(suspenseRow ?? "").toContain("cases.test.js: 2 scenario codes cite SCN-JSF-005, SCN-JSF-006");
  });
});

describe("[SCN-JST-005] runReconcile posts no evidence observation for a todo or skipped Jest test, so the scenario it cites reads missing", () => {
  const unitOf = (scnId: string) =>
    runReconcile({
      features: `${TARGET}/features`,
      packageJson: `${TARGET}/package.json`,
      ci: TARGET,
      jest: `${TARGET}/report.json`,
    }, resolveTargetRoot({ features: `${TARGET}/features` }))
      .ledger.claimReconciliations
      .find((s) => s.scnId === scnId)
      ?.qualityCheckReconciliations.find((q) => q.qualityCheck === "unit");

  it.each([
    ["a todo test", "SCN-JSF-007"],
    ["a skipped test", "SCN-JSF-008"],
  ])("leaves the scenario %s cites missing, with no observation", (_kind, scnId) => {
    expect(unitOf(scnId)?.outcome).toBe("missing");
    expect(unitOf(scnId)?.evidenceObservation).toBeUndefined();
  });
});

describe("[SCN-JST-006] runReconcile reads a Jest test under a failing beforeAll as a failing unit evidence observation", () => {
  it("reconciles the scenario that test cites as failing, not broken, by that test", () => {
    const balance = runReconcile({
      features: `${TARGET}/features`,
      packageJson: `${TARGET}/package.json`,
      ci: TARGET,
      jest: `${TARGET}/report.json`,
    }, resolveTargetRoot({ features: `${TARGET}/features` }));
    const unit = balance.ledger.claimReconciliations
      .find((s) => s.scnId === "SCN-JSF-009")
      ?.qualityCheckReconciliations.find((q) => q.qualityCheck === "unit");

    expect(unit?.outcome).toBe("failing");
    expect(unit?.evidenceObservation).toMatchObject({
      status: "failed",
      locator: expect.stringMatching(/tests\/fixtures\/jest\/project\/cases\.test\.js$/),
      testName: "a describe block whose beforeAll fails [SCN-JSF-009] a test under a failing beforeAll cites its scenario",
    });
    expect(unit?.evidenceObservation?.broken).toBeUndefined();
  });
});

describe("[SCN-JST-007] runReconcile reads a Jest test file that failed to run as broken evidence, and the run is unsound", () => {
  const balance = () =>
    runReconcile({
      features: `${TARGET}/features`,
      packageJson: `${TARGET}/package.json`,
      ci: TARGET,
      jest: `${TARGET}/report.json`,
    }, resolveTargetRoot({ features: `${TARGET}/features` }));

  it("posts one broken item, on suspense, naming the file and carrying the error that stopped it", () => {
    const broken = balance().ledger.claimReconciliations.flatMap((row) =>
      row.reconcilingItems.filter((item) => item.outcome === "broken").map((item) => ({ kind: row.kind, item }))
    );

    expect(broken).toHaveLength(1);
    expect(broken[0]?.kind).toBe("unnamed-claim");
    expect(broken[0]?.item.locator).toMatch(/tests\/fixtures\/jest\/project\/unloadable\.test\.js$/);
    expect(broken[0]?.item.message).toContain("Test suite failed to run");
    expect(broken[0]?.item.message).toContain("the test file could not be loaded");
  });

  it("stamps the run unsound", () => {
    expect(verdictCode({ ledger: balance().ledger, strict: false })).toBe(4);
  });
});
