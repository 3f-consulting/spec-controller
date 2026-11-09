import { describe, it, expect } from "vitest";
import { observationsOf } from "@3f-consulting/spec-controller-core/internal";
import {
  neverRanItemsOf,
  expectMissingWithNoObservation,
  expectSoleObservation,
  postedOf,
  reconcileFixture,
  runVerdictOf,
  soleNeverRanObservationOnUnnamedClaim,
  unitReconciliationOf,
  unnamedClaimRowOf,
} from "./runnerEvidence.test-utils.js";

const SINGLE_REPORT = "tests/fixtures/surefire-single-report";

describe("[CLM-JAV-010] runReconcile reads a single Surefire report file whose root is one test suite through --junit", () => {
  it("reconciles the scenario a passing JUnit 5 test cites in its display name as satisfied, by that test", () => {
    expectSoleObservation(unitReconciliationOf(reconcileFixture(SINGLE_REPORT, { junit: `${SINGLE_REPORT}/report.xml` }), "CLM-AAA-001"), "satisfied", {
      status: "passed",
      locator: "[CLM-AAA-010] a class that cites::[CLM-AAA-001] passes",
    });
  });
});

const JAVA = "tests/fixtures/java";
const balance = () => reconcileFixture(JAVA, { junit: `${JAVA}/surefire-reports` });
const unitOf = (claimCode: string) => unitReconciliationOf(balance(), claimCode);

describe("[CLM-JAV-001] runReconcile reads the directory of reports Maven Surefire wrote through --junit", () => {
  it("reconciles the scenario a passing JUnit 5 test cites in its display name as satisfied, by that test", () => {
    expectSoleObservation(unitOf("CLM-JVF-001"), "satisfied", {
      status: "passed",
      locator: "example.CitedTest::[CLM-JVF-001] a passing test cites its scenario",
    });
  });
});

describe("[CLM-JAV-002] runReconcile reads a failing JUnit 5 test in the directory of reports Maven Surefire wrote as a failing unit evidence observation", () => {
  it("reconciles the scenario a failing JUnit 5 test cites in its display name as failing, by that test", () => {
    expectSoleObservation(unitOf("CLM-JVF-002"), "failing", {
      status: "failed",
      locator: "example.CitedTest::[CLM-JVF-002] a failing test cites its scenario",
    });
  });
});

describe("[CLM-JAV-005] runReconcile credits neither scenario a JUnit 5 test's display name cites when it cites two, and the unnamed claim's row names both codes", () => {
  it.each(["CLM-JVF-005", "CLM-JVF-006"])("leaves %s missing, with no observation", (claimCode) => {
    expectMissingWithNoObservation(unitOf(claimCode));
  });

  it("names both codes on the unnamed claim's row, beside the test", () => {
    expect(unnamedClaimRowOf(balance(), JAVA)).toContain(
      "example.CitedTest::[CLM-JVF-005] [CLM-JVF-006] a test that cites two scenarios: 2 claim codes cite CLM-JVF-005, CLM-JVF-006",
    );
  });
});

describe("[CLM-JAV-006] runReconcile reads each invocation of a parameterised JUnit 5 test as citing the scenario its name pattern carries", () => {
  const scenario = () => balance().ledger.claimReconciliations.find((s) => s.claim === "CLM-JVF-007");

  it("posts one passing observation per invocation, each citing that scenario and located at its own invocation", () => {
    expect(observationsOf(scenario()!).map(postedOf)).toEqual([1, 2].map((n) => ({
      qualityCheckKind: "unit",
      claimCode: "CLM-JVF-007",
      status: "passed",
      locator: `example.CitedTest::parameterised(int)[CLM-JVF-007] a parameterised test cites its scenario with ${n}`,
    })));
  });

  it("reconciles that scenario satisfied", () => {
    expect(scenario()?.qualityCheckReconciliations.find((q) => q.qualityCheckKind === "unit")?.evidenceObservations?.map((o) => o.outcome)).toEqual(["satisfied", "satisfied"]);
  });
});

describe("[CLM-JAV-007] runReconcile posts no evidence observation for a disabled JUnit 5 test, or one whose assumption fails, so the scenario it cites reads missing", () => {
  it.each([
    ["a disabled test", "CLM-JVF-008"],
    ["a test whose assumption fails", "CLM-JVF-009"],
  ])("leaves the scenario %s cites missing, with no observation", (_, claimCode) => {
    expectMissingWithNoObservation(unitOf(claimCode));
  });

  it.each([
    "a disabled test cites its scenario",
    "a test whose assumption fails cites its scenario",
  ])("posts no observation for the test named \"%s\" anywhere in the ledger, the unnamed claim included", (testName) => {
    expect(JSON.stringify(balance().ledger)).not.toContain(testName);
  });
});

describe("[CLM-JAV-008] runReconcile reads a JUnit 5 test that throws, in its body or in its setup before each test, as a failing unit evidence observation", () => {
  it.each([
    ["a test that throws in its body", "CLM-JVF-010", "example.CitedTest::[CLM-JVF-010] a test that throws cites its scenario"],
    [
      "a test whose setup before each test throws",
      "CLM-JVF-011",
      "example.BeforeEachFailsTest::[CLM-JVF-011] a test whose setup before each test throws cites its scenario",
    ],
  ])("reconciles the scenario %s cites as failing, by that test", (_, claimCode, locator) => {
    const unit = unitOf(claimCode);

    expectSoleObservation(unit, "failing", { status: "failed", locator });
    expect(unit?.evidenceObservations?.[0]?.neverRan).toBeUndefined();
  });

  it("posts no never-ran item for either test", () => {
    const neverRanLocators = neverRanItemsOf(balance()).flatMap(({ item }) => (item.evidenceObservation === undefined ? [] : [item.evidenceObservation.locator]));

    expect(neverRanLocators.join("\n")).not.toMatch(/CLM-JVF-01[01]/);
  });
});

describe("[CLM-JAV-009] runReconcile reads a JUnit 5 class whose setup before all its tests failed as evidence that never ran, and the run is unsound", () => {
  it("posts one never-ran item, on the unnamed claim's row, naming the class and carrying the error that stopped it", () => {
    const observation = soleNeverRanObservationOnUnnamedClaim(balance());

    expect(observation?.locator).toBe("example.BeforeAllFailsTest");
    expect(observation?.message).toContain("the shared resource could not be set up");
  });

  it("reads the scenario the class's test cites as missing", () => {
    expect(unitOf("CLM-JVF-012")?.outcome).toBe("missing");
  });

  it("stamps the run unsound", () => {
    expect(runVerdictOf(balance(), JAVA)).toBe("unsound");
  });
});
