import { describe, it, expect } from "vitest";
import { runReconcile } from "./corpusReading.test-utils.js";
import { resolveTargetRoot } from "../run-management/resolveRunInputs.js";

const KOTLIN = "tests/fixtures/kotlin";

describe("[SCN-KOT-001] runReconcile reads the directory of reports Gradle wrote for a Kotlin suite through --junit", () => {
  it("reconciles the scenario a passing JUnit 5 test cites in its display name as satisfied, by that test", () => {
    const unit = runReconcile({
      features: `${KOTLIN}/features`,
      packageJson: `${KOTLIN}/package.json`,
      ci: KOTLIN,
      junit: `${KOTLIN}/test-results`,
    }, resolveTargetRoot({ features: `${KOTLIN}/features` })).ledger.claimReconciliations
      .find((s) => s.claim === "SCN-KOF-001")
      ?.qualityCheckReconciliations.find((q) => q.qualityCheckKind === "unit");

    expect(unit?.evidenceObservations?.map((o) => o.outcome)).toEqual(["satisfied"]);
    expect(unit?.evidenceObservations).toMatchObject([{
      status: "passed",
      locator: "example.CitedTest::[SCN-KOF-001] a passing test cites its scenario",
    }]);
  });
});
