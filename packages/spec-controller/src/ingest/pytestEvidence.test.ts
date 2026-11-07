import { describe, it, expect } from "vitest";
import { observationsOf, outcomeDescription } from "@3f-consulting/spec-controller-core/internal";
import {
  brokenItemsOf,
  expectMissingWithNoObservation,
  postedOf,
  reconcileFixture,
  reportLinesOf,
  runVerdictOf,
  soleBrokenObservationOnUnnamedClaim,
  unitReconciliationOf,
  unnamedClaimRowOf,
} from "./runnerEvidence.test-utils.js";

const TARGET = "tests/fixtures/pytest";
const balance = () => reconcileFixture(TARGET, { pytest: `${TARGET}/report.xml` });
const unitOf = (claimCode: string) => unitReconciliationOf(balance(), claimCode);

describe("[CLM-PYT-001] runReconcile reads a real pytest report as unit evidence", () => {
  it("reconciles the scenario a passing pytest test cites as satisfied, by that test", () => {
    const unit = unitOf("CLM-PYF-001");

    expect(unit?.evidenceObservations?.map((o) => o.outcome)).toEqual(["satisfied"]);
    expect(unit?.evidenceObservations?.[0]?.locator).toBe("test_cases::test_passing_cited");
  });
});

describe("[CLM-PYT-002] runReconcile reads a failing test in a real pytest report as failing unit evidence", () => {
  it("reconciles the scenario a failing pytest test cites as failing, by that test", () => {
    const unit = unitOf("CLM-PYF-002");

    expect(unit?.evidenceObservations?.map((o) => o.outcome)).toEqual(["failing"]);
    expect(unit?.evidenceObservations?.[0]?.locator).toBe("test_cases::test_failing_cited");
  });
});

describe("[CLM-PYT-003] runReconcile reads a skipped test in a real pytest report as no unit evidence", () => {
  it("leaves the scenario a skipped pytest test cites missing, with no observation", () => {
    expectMissingWithNoObservation(unitOf("CLM-PYF-003"));
  });
});

describe("[CLM-PYT-004] runReconcile posts a pytest test citing an unknown scenario to a phantom claim", () => {
  it("raises a phantom claim for the code no feature file carries, holding that test's observation", () => {
    const phantomClaimRow = balance().ledger.claimReconciliations.find((s) => s.claim === "CLM-PYF-099");

    expect(phantomClaimRow?.kind).toBe("phantom-claim");
    expect(observationsOf(phantomClaimRow!).map(postedOf)).toEqual([
      { qualityCheckKind: "unit", claimCode: "CLM-PYF-099", status: "passed", locator: "test_cases::test_unknown_code" },
    ]);
  });
});

describe("[CLM-PYT-005] runReconcile posts a pytest test citing no scenario as its passed observation to the unnamed claim", () => {
  it("holds the uncited test's observation on the unnamed claim, citing no scenario", () => {
    const unnamedClaimRow = balance().ledger.claimReconciliations.find((s) => s.kind === "unnamed-claim");

    expect(observationsOf(unnamedClaimRow!).map(postedOf)).toContainEqual({
      qualityCheckKind: "unit",
      claimCode: null,
      status: "passed",
      locator: "test_cases::test_uncited",
    });
  });
});

describe("[CLM-PYT-006] runReconcile credits neither scenario a pytest test carrying two scn properties cites, and the unnamed claim's row names both codes", () => {
  it.each(["CLM-PYF-004", "CLM-PYF-005"])("leaves %s missing, with no observation", (claimCode) => {
    expectMissingWithNoObservation(unitOf(claimCode));
  });

  it("names both codes on the unnamed claim's row, beside the test", () => {
    const unnamedClaimRow = unnamedClaimRowOf(balance(), TARGET, "test_cases::test_two_codes");

    expect(unnamedClaimRow).toContain("CLM-PYF-004");
    expect(unnamedClaimRow).toContain("CLM-PYF-005");
    expect(unnamedClaimRow).toContain("2 claim codes cite CLM-PYF-004, CLM-PYF-005");
  });
});

describe("[CLM-PYT-007] runReconcile reads a real pytest run that failed to collect as broken evidence, and the run is unsound", () => {
  const uncollectable = () => reconcileFixture(TARGET, { pytest: `${TARGET}/uncollectable-report.xml` });

  it("posts one broken item, on the unnamed claim's row, naming the module and carrying the collection error", () => {
    const observation = soleBrokenObservationOnUnnamedClaim(uncollectable());

    expect(observation?.locator).toBe("test_uncollectable");
    expect(observation?.message).toContain("ModuleNotFoundError: No module named 'module_that_does_not_exist'");
  });

  it("stamps the run unsound", () => {
    expect(runVerdictOf(uncollectable(), TARGET)).toBe("unsound");
  });
});

describe("[CLM-PYT-008] runReconcile reads a test whose setup errored in a real pytest report as a broken line naming the test, and the scenario it cites reads a missing line beside it", () => {
  it("reads the cited scenario's unit reconciliation as one missing line beside one broken line naming the test, with no observation that ran", () => {
    const unit = unitOf("CLM-PYF-006");

    expect(unit?.outcome).toBe("missing");
    expect(unit?.evidenceObservations?.map((o) => [o.outcome, o.locator])).toEqual([["broken", "test_cases::test_setup_error"]]);
  });

  it("posts one broken item, naming the test and carrying the setup error", () => {
    const broken = brokenItemsOf(balance());

    expect(broken).toHaveLength(1);
    expect(broken[0]?.item.evidenceObservation?.locator).toBe("test_cases::test_setup_error");
    expect(broken[0]?.item.evidenceObservation?.message).toContain("RuntimeError: the resource could not be set up");
  });

  it("renders the broken item as a proof that errored before it ran, naming the test, never as a suite that failed to collect", () => {
    const brokenItemLine = reportLinesOf(balance(), TARGET).find((line) => line.startsWith("| ") && line.includes("test_cases::test_setup_error"));

    expect(brokenItemLine ?? "").toContain(`${outcomeDescription("broken")} (test_cases::test_setup_error`);
    expect(brokenItemLine ?? "").not.toContain("failed to collect");
  });
});
