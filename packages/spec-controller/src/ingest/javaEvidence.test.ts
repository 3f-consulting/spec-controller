import { describe, it, expect } from "vitest";
import { renderMarkdown, verdictCode, type RunContext } from "@3f-consulting/spec-controller-core";
import { runReconcile } from "./ingestQualityChecks.js";
import { resolveTargetRoot } from "../run-management/resolveRunInputs.js";

const SINGLE_REPORT = "tests/fixtures/surefire-single-report";

describe("[SCN-JAV-010] runReconcile reads a single Surefire report file whose root is one test suite through --junit", () => {
  it("reconciles the scenario a passing JUnit 5 test cites in its display name as satisfied, by that test", () => {
    const unit = runReconcile({
      features: `${SINGLE_REPORT}/features`,
      packageJson: `${SINGLE_REPORT}/package.json`,
      ci: SINGLE_REPORT,
      junit: `${SINGLE_REPORT}/report.xml`,
    }, resolveTargetRoot({ features: `${SINGLE_REPORT}/features` })).ledger.claimReconciliations
      .find((s) => s.scnId === "SCN-AAA-001")
      ?.qualityCheckReconciliations.find((q) => q.qualityCheck === "unit");

    expect(unit?.outcome).toBe("satisfied");
    expect(unit?.evidenceObservation).toMatchObject({
      status: "passed",
      locator: "[SCN-AAA-010] a class that cites::[SCN-AAA-001] passes",
    });
  });
});

const JAVA = "tests/fixtures/java";

describe("[SCN-JAV-001] runReconcile reads the directory of reports Maven Surefire wrote through --junit", () => {
  it("reconciles the scenario a passing JUnit 5 test cites in its display name as satisfied, by that test", () => {
    const unit = runReconcile({
      features: `${JAVA}/features`,
      packageJson: `${JAVA}/package.json`,
      ci: JAVA,
      junit: `${JAVA}/surefire-reports`,
    }, resolveTargetRoot({ features: `${JAVA}/features` })).ledger.claimReconciliations
      .find((s) => s.scnId === "SCN-JVF-001")
      ?.qualityCheckReconciliations.find((q) => q.qualityCheck === "unit");

    expect(unit?.outcome).toBe("satisfied");
    expect(unit?.evidenceObservation).toMatchObject({
      status: "passed",
      locator: "example.CitedTest::[SCN-JVF-001] a passing test cites its scenario",
    });
  });
});

describe("[SCN-JAV-002] runReconcile reads a failing JUnit 5 test in the directory of reports Maven Surefire wrote as a failing unit evidence observation", () => {
  it("reconciles the scenario a failing JUnit 5 test cites in its display name as failing, by that test", () => {
    const unit = runReconcile({
      features: `${JAVA}/features`,
      packageJson: `${JAVA}/package.json`,
      ci: JAVA,
      junit: `${JAVA}/surefire-reports`,
    }, resolveTargetRoot({ features: `${JAVA}/features` })).ledger.claimReconciliations
      .find((s) => s.scnId === "SCN-JVF-002")
      ?.qualityCheckReconciliations.find((q) => q.qualityCheck === "unit");

    expect(unit?.outcome).toBe("failing");
    expect(unit?.evidenceObservation).toMatchObject({
      status: "failed",
      locator: "example.CitedTest::[SCN-JVF-002] a failing test cites its scenario",
    });
  });
});

describe("[SCN-JAV-005] runReconcile credits neither scenario a JUnit 5 test's display name cites when it cites two, and suspense names both codes", () => {
  const balance = () => runReconcile({
    features: `${JAVA}/features`,
    packageJson: `${JAVA}/package.json`,
    ci: JAVA,
    junit: `${JAVA}/surefire-reports`,
  }, resolveTargetRoot({ features: `${JAVA}/features` }));
  const unitOf = (scnId: string) =>
    balance()
      .ledger.claimReconciliations
      .find((s) => s.scnId === scnId)
      ?.qualityCheckReconciliations.find((q) => q.qualityCheck === "unit");

  it.each(["SCN-JVF-005", "SCN-JVF-006"])("leaves %s missing, with no observation", (scnId) => {
    expect(unitOf(scnId)?.outcome).toBe("missing");
    expect(unitOf(scnId)?.evidenceObservation).toBeUndefined();
  });

  it("names both codes on the suspense row, beside the test", () => {
    const ctx: RunContext = { target: JAVA, inputs: {}, corpus: "features", runStart: new Date("2026-10-15T09:00:00.000Z"), sourceSha: null };
    const suspenseRow = renderMarkdown(balance(), ctx)
      .split("\n")
      .find((line) => line.startsWith("| (unnamed claim) | "));

    expect(suspenseRow ?? "").toContain(
      "example.CitedTest::[SCN-JVF-005] [SCN-JVF-006] a test that cites two scenarios: 2 scenario codes cite SCN-JVF-005, SCN-JVF-006",
    );
  });
});

describe("[SCN-JAV-006] runReconcile reads each invocation of a parameterised JUnit 5 test as citing the scenario its name pattern carries", () => {
  const scenario = () => runReconcile({
    features: `${JAVA}/features`,
    packageJson: `${JAVA}/package.json`,
    ci: JAVA,
    junit: `${JAVA}/surefire-reports`,
  }, resolveTargetRoot({ features: `${JAVA}/features` })).ledger.claimReconciliations
    .find((s) => s.scnId === "SCN-JVF-007");

  it("posts one passing observation per invocation, each citing that scenario and located at its own invocation", () => {
    expect(scenario()?.evidenceObservations).toEqual([
      {
        qualityCheck: "unit",
        scnId: "SCN-JVF-007",
        status: "passed",
        locator: "example.CitedTest::parameterised(int)[SCN-JVF-007] a parameterised test cites its scenario with 1",
      },
      {
        qualityCheck: "unit",
        scnId: "SCN-JVF-007",
        status: "passed",
        locator: "example.CitedTest::parameterised(int)[SCN-JVF-007] a parameterised test cites its scenario with 2",
      },
    ]);
  });

  it("reconciles that scenario satisfied", () => {
    expect(scenario()?.qualityCheckReconciliations.find((q) => q.qualityCheck === "unit")?.outcome).toBe("satisfied");
  });
});

describe("[SCN-JAV-007] runReconcile posts no evidence observation for a disabled JUnit 5 test, or one whose assumption fails, so the scenario it cites reads missing", () => {
  const balance = () => runReconcile({
    features: `${JAVA}/features`,
    packageJson: `${JAVA}/package.json`,
    ci: JAVA,
    junit: `${JAVA}/surefire-reports`,
  }, resolveTargetRoot({ features: `${JAVA}/features` }));

  it.each([
    ["a disabled test", "SCN-JVF-008"],
    ["a test whose assumption fails", "SCN-JVF-009"],
  ])("leaves the scenario %s cites missing, with no observation", (_, scnId) => {
    const unit = balance().ledger.claimReconciliations
      .find((s) => s.scnId === scnId)
      ?.qualityCheckReconciliations.find((q) => q.qualityCheck === "unit");

    expect(unit?.outcome).toBe("missing");
    expect(unit?.evidenceObservation).toBeUndefined();
  });

  it.each([
    "a disabled test cites its scenario",
    "a test whose assumption fails cites its scenario",
  ])("posts no observation for the test named \"%s\" anywhere in the ledger, suspense included", (testName) => {
    expect(JSON.stringify(balance().ledger)).not.toContain(testName);
  });
});

describe("[SCN-JAV-008] runReconcile reads a JUnit 5 test that throws, in its body or in its setup before each test, as a failing unit evidence observation", () => {
  const balance = () => runReconcile({
    features: `${JAVA}/features`,
    packageJson: `${JAVA}/package.json`,
    ci: JAVA,
    junit: `${JAVA}/surefire-reports`,
  }, resolveTargetRoot({ features: `${JAVA}/features` }));

  it.each([
    ["a test that throws in its body", "SCN-JVF-010", "example.CitedTest::[SCN-JVF-010] a test that throws cites its scenario"],
    [
      "a test whose setup before each test throws",
      "SCN-JVF-011",
      "example.BeforeEachFailsTest::[SCN-JVF-011] a test whose setup before each test throws cites its scenario",
    ],
  ])("reconciles the scenario %s cites as failing, by that test", (_, scnId, locator) => {
    const unit = balance().ledger.claimReconciliations
      .find((s) => s.scnId === scnId)
      ?.qualityCheckReconciliations.find((q) => q.qualityCheck === "unit");

    expect(unit?.outcome).toBe("failing");
    expect(unit?.evidenceObservation).toMatchObject({ status: "failed", locator });
    expect(unit?.evidenceObservation?.broken).toBeUndefined();
  });

  it("posts no broken item for either test", () => {
    const brokenLocators = balance().ledger.claimReconciliations.flatMap((row) =>
      row.reconcilingItems.filter((item) => item.outcome === "broken").map((item) => item.locator)
    );

    expect(brokenLocators.join("\n")).not.toMatch(/SCN-JVF-01[01]/);
  });
});

describe("[SCN-JAV-009] runReconcile reads a JUnit 5 class whose setup before all its tests failed as broken evidence, and the run is unsound", () => {
  const balance = () => runReconcile({
    features: `${JAVA}/features`,
    packageJson: `${JAVA}/package.json`,
    ci: JAVA,
    junit: `${JAVA}/surefire-reports`,
  }, resolveTargetRoot({ features: `${JAVA}/features` }));

  it("posts one broken item, on suspense, naming the class and carrying the error that stopped it", () => {
    const broken = balance().ledger.claimReconciliations.flatMap((row) =>
      row.reconcilingItems.filter((item) => item.outcome === "broken").map((item) => ({ kind: row.kind, item }))
    );

    expect(broken).toHaveLength(1);
    expect(broken[0]?.kind).toBe("unnamed-claim");
    expect(broken[0]?.item.locator).toBe("example.BeforeAllFailsTest");
    expect(broken[0]?.item.message).toContain("the shared resource could not be set up");
  });

  it("reads the scenario the class's test cites as missing", () => {
    const unit = balance().ledger.claimReconciliations
      .find((s) => s.scnId === "SCN-JVF-012")
      ?.qualityCheckReconciliations.find((q) => q.qualityCheck === "unit");

    expect(unit?.outcome).toBe("missing");
  });

  it("stamps the run unsound", () => {
    expect(verdictCode({ ledger: balance().ledger, strict: false })).toBe(4);
  });
});
