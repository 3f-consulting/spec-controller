import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { parseJunitEvidenceObservations } from "@3f-consulting/spec-controller-core";
import { CoreMessage, coreMessage } from "@3f-consulting/spec-controller-core/internal";
import { parseJunitXml } from "./junitXml.js";
import {
  expectMissingWithNoObservation,
  expectSoleObservation,
  reconcileFixture,
  runVerdictOf,
  soleBrokenObservationOnUnnamedClaim,
  unitReconciliationOf,
  unnamedClaimRowOf,
} from "./runnerEvidence.test-utils.js";

const TARGET = "tests/fixtures/go";
const balance = () => reconcileFixture(TARGET, { junit: `${TARGET}/report.xml` });
const unitOf = (claimCode: string) => unitReconciliationOf(balance(), claimCode);
const observations = () => parseJunitEvidenceObservations(parseJunitXml(readFileSync(`${TARGET}/report.xml`, "utf8")));

describe("[CLM-GOT-001] runReconcile reads a real gotestsum report as unit evidence", () => {
  it("reconciles the scenario a passing Go subtest cites in its name as satisfied, by that subtest", () => {
    const unit = unitOf("CLM-GOF-001");

    expectSoleObservation(unit, "satisfied", {
      status: "passed",
      locator: "example.com/gofixture/cited::TestCited/[CLM-GOF-001]_a_passing_subtest_cites_its_scenario",
    });
    expect(unit?.evidenceObservations?.[0]?.notes).toBeUndefined();
  });
});

describe("[CLM-GOT-002] runReconcile reads a failing Go subtest as a failing unit evidence observation", () => {
  it("reconciles the scenario a failing Go subtest cites in its name as failing, by that subtest", () => {
    expectSoleObservation(unitOf("CLM-GOF-002"), "failing", {
      status: "failed",
      locator: "example.com/gofixture/cited::TestCited/[CLM-GOF-002]_a_failing_subtest_cites_its_scenario",
    });
  });
});

describe("[CLM-GOT-003] parseJunitEvidenceObservations reads the code in a Go subtest's own name before the codes in the names around it", () => {
  it.each([
    ["cites a scenario with that scenario alone, not its parent's", "[CLM-GOF-003]_a_child_whose_own_name_cites_a_scenario", "CLM-GOF-003"],
    ["cites nothing with the scenario its parent's name cites", "a_child_whose_own_name_cites_nothing", "CLM-GOF-004"],
  ])("credits a child subtest whose own name %s", (_, childName, claimCode) => {
    const child = observations()
      .find((o) => o.locator === `example.com/gofixture/cited::TestCited/[CLM-GOF-004]_a_subtest_that_cites_a_scenario/${childName}`);

    expect(child).toMatchObject({ claimCode, status: "passed" });
    expect(child?.notes).toBeUndefined();
  });
});

describe("[CLM-GOT-004] runReconcile credits neither scenario a Go subtest's name cites when it cites two, and the unnamed claim's row names both codes", () => {
  it.each(["CLM-GOF-005", "CLM-GOF-006"])("leaves %s missing, with no observation", (claimCode) => {
    expectMissingWithNoObservation(unitOf(claimCode));
  });

  it("names both codes on the unnamed claim's row, beside the subtest", () => {
    expect(unnamedClaimRowOf(balance(), TARGET)).toContain(
      "cited::TestCited/[CLM-GOF-005]_[CLM-GOF-006]_a_subtest_that_cites_two_scenarios: 2 claim codes cite CLM-GOF-005, CLM-GOF-006",
    );
  });
});

describe("[CLM-GOT-005] runReconcile reads a skipped Go subtest as posting no evidence observation", () => {
  it("posts no observation for the skipped subtest", () => {
    expect(observations().filter((o) => o.locator?.includes("[CLM-GOF-007]"))).toEqual([]);
  });

  it("leaves the scenario the skipped subtest cites missing, with no observation", () => {
    expectMissingWithNoObservation(unitOf("CLM-GOF-007"));
  });
});

describe("[CLM-GOT-006] runReconcile reads a Go subtest whose enclosing test fails before starting it as posting nothing", () => {
  it("leaves the scenario the never-started subtest cites missing, with no observation", () => {
    expectMissingWithNoObservation(unitOf("CLM-GOF-008"));
  });

  it("posts the enclosing test's failure to the unnamed claim, under its own name", () => {
    expect(unnamedClaimRowOf(balance(), TARGET)).toContain(
      `${coreMessage(CoreMessage.OutcomeCitesNoScenario)} (example.com/gofixture/cited::TestEnclosingFailsFirst) — ${coreMessage(CoreMessage.UnnamedClaimGroupCounts, { ran: 1, passed: 0, failed: 1 })}`,
    );
  });
});

describe("[CLM-GOT-007] runReconcile reads a Go package that failed to compile as broken evidence, and the run is unsound", () => {
  it("posts one broken item, on the unnamed claim's row, naming the package and saying its build failed", () => {
    const observation = soleBrokenObservationOnUnnamedClaim(balance());

    expect(observation?.locator).toBe("example.com/gofixture/broken");
    expect(observation?.message).toContain("example.com/gofixture/broken [build failed]");
  });

  it("stamps the run unsound", () => {
    expect(runVerdictOf(balance(), TARGET)).toBe("unsound");
  });
});

describe("[CLM-GOT-008] runReconcile reads a Go subtest that panics as a failing unit evidence observation", () => {
  it("reconciles the scenario a panicking Go subtest cites as failing, by that subtest", () => {
    expectSoleObservation(unitOf("CLM-GOF-009"), "failing", {
      status: "failed",
      locator: "example.com/gofixture/panics::TestPanics/[CLM-GOF-009]_a_panicking_subtest_cites_its_scenario",
    });
  });

  it("leaves the scenario a subtest the panic stopped cites missing, with no observation", () => {
    expectMissingWithNoObservation(unitOf("CLM-GOF-010"));
  });
});
