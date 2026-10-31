import { describe, it, expect } from "vitest";
import { observationsOf } from "@3f-consulting/spec-controller-core/internal";
import {
  brokenItemsOf,
  expectMissingWithNoObservation,
  expectSoleObservation,
  postedOf,
  reconcileFixture,
  runVerdictOf,
  soleBrokenObservationOnUnnamedClaim,
  unitReconciliationOf,
  unnamedClaimRowOf,
} from "./runnerEvidence.test-utils.js";

const SINGLE_REPORT = "tests/fixtures/surefire-single-report";

describe("[SCN-JAV-010] runReconcile reads a single Surefire report file whose root is one test suite through --junit", () => {
  it("reconciles the scenario a passing JUnit 5 test cites in its display name as satisfied, by that test", () => {
    expectSoleObservation(unitReconciliationOf(reconcileFixture(SINGLE_REPORT, { junit: `${SINGLE_REPORT}/report.xml` }), "SCN-AAA-001"), "satisfied", {
      status: "passed",
      locator: "[SCN-AAA-010] a class that cites::[SCN-AAA-001] passes",
    });
  });
});

const JAVA = "tests/fixtures/java";
const balance = () => reconcileFixture(JAVA, { junit: `${JAVA}/surefire-reports` });
const unitOf = (scnId: string) => unitReconciliationOf(balance(), scnId);

describe("[SCN-JAV-001] runReconcile reads the directory of reports Maven Surefire wrote through --junit", () => {
  it("reconciles the scenario a passing JUnit 5 test cites in its display name as satisfied, by that test", () => {
    expectSoleObservation(unitOf("SCN-JVF-001"), "satisfied", {
      status: "passed",
      locator: "example.CitedTest::[SCN-JVF-001] a passing test cites its scenario",
    });
  });
});

describe("[SCN-JAV-002] runReconcile reads a failing JUnit 5 test in the directory of reports Maven Surefire wrote as a failing unit evidence observation", () => {
  it("reconciles the scenario a failing JUnit 5 test cites in its display name as failing, by that test", () => {
    expectSoleObservation(unitOf("SCN-JVF-002"), "failing", {
      status: "failed",
      locator: "example.CitedTest::[SCN-JVF-002] a failing test cites its scenario",
    });
  });
});

describe("[SCN-JAV-005] runReconcile credits neither scenario a JUnit 5 test's display name cites when it cites two, and the unnamed claim's row names both codes", () => {
  it.each(["SCN-JVF-005", "SCN-JVF-006"])("leaves %s missing, with no observation", (scnId) => {
    expectMissingWithNoObservation(unitOf(scnId));
  });

  it("names both codes on the unnamed claim's row, beside the test", () => {
    expect(unnamedClaimRowOf(balance(), JAVA)).toContain(
      "example.CitedTest::[SCN-JVF-005] [SCN-JVF-006] a test that cites two scenarios: 2 scenario codes cite SCN-JVF-005, SCN-JVF-006",
    );
  });
});

describe("[SCN-JAV-006] runReconcile reads each invocation of a parameterised JUnit 5 test as citing the scenario its name pattern carries", () => {
  const scenario = () => balance().ledger.claimReconciliations.find((s) => s.claim === "SCN-JVF-007");

  it("posts one passing observation per invocation, each citing that scenario and located at its own invocation", () => {
    expect(observationsOf(scenario()!).map(postedOf)).toEqual([1, 2].map((n) => ({
      qualityCheck: "unit",
      scnId: "SCN-JVF-007",
      status: "passed",
      locator: `example.CitedTest::parameterised(int)[SCN-JVF-007] a parameterised test cites its scenario with ${n}`,
    })));
  });

  it("reconciles that scenario satisfied", () => {
    expect(scenario()?.qualityCheckReconciliations.find((q) => q.qualityCheck === "unit")?.evidenceObservations?.map((o) => o.outcome)).toEqual(["satisfied", "satisfied"]);
  });
});

describe("[SCN-JAV-007] runReconcile posts no evidence observation for a disabled JUnit 5 test, or one whose assumption fails, so the scenario it cites reads missing", () => {
  it.each([
    ["a disabled test", "SCN-JVF-008"],
    ["a test whose assumption fails", "SCN-JVF-009"],
  ])("leaves the scenario %s cites missing, with no observation", (_, scnId) => {
    expectMissingWithNoObservation(unitOf(scnId));
  });

  it.each([
    "a disabled test cites its scenario",
    "a test whose assumption fails cites its scenario",
  ])("posts no observation for the test named \"%s\" anywhere in the ledger, the unnamed claim included", (testName) => {
    expect(JSON.stringify(balance().ledger)).not.toContain(testName);
  });
});

describe("[SCN-JAV-008] runReconcile reads a JUnit 5 test that throws, in its body or in its setup before each test, as a failing unit evidence observation", () => {
  it.each([
    ["a test that throws in its body", "SCN-JVF-010", "example.CitedTest::[SCN-JVF-010] a test that throws cites its scenario"],
    [
      "a test whose setup before each test throws",
      "SCN-JVF-011",
      "example.BeforeEachFailsTest::[SCN-JVF-011] a test whose setup before each test throws cites its scenario",
    ],
  ])("reconciles the scenario %s cites as failing, by that test", (_, scnId, locator) => {
    const unit = unitOf(scnId);

    expectSoleObservation(unit, "failing", { status: "failed", locator });
    expect(unit?.evidenceObservations?.[0]?.broken).toBeUndefined();
  });

  it("posts no broken item for either test", () => {
    const brokenLocators = brokenItemsOf(balance()).flatMap(({ item }) => (item.evidenceObservation === undefined ? [] : [item.evidenceObservation.locator]));

    expect(brokenLocators.join("\n")).not.toMatch(/SCN-JVF-01[01]/);
  });
});

describe("[SCN-JAV-009] runReconcile reads a JUnit 5 class whose setup before all its tests failed as broken evidence, and the run is unsound", () => {
  it("posts one broken item, on the unnamed claim's row, naming the class and carrying the error that stopped it", () => {
    const observation = soleBrokenObservationOnUnnamedClaim(balance());

    expect(observation?.locator).toBe("example.BeforeAllFailsTest");
    expect(observation?.message).toContain("the shared resource could not be set up");
  });

  it("reads the scenario the class's test cites as missing", () => {
    expect(unitOf("SCN-JVF-012")?.outcome).toBe("missing");
  });

  it("stamps the run unsound", () => {
    expect(runVerdictOf(balance(), JAVA)).toBe("unsound");
  });
});
