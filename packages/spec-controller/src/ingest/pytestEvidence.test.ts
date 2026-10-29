import { describe, it, expect } from "vitest";
import { assembleRenderInput, renderMarkdown, type RunContext } from "@3f-consulting/spec-controller-core";
import { OUTCOME_DESCRIPTION, observationsOf, reconcilingItemsOf } from "@3f-consulting/spec-controller-core/internal";
import { runReconcile } from "./corpusReading.test-utils.js";
import { resolveTargetRoot } from "../run-management/resolveRunInputs.js";
import { runInputsOf } from "../cli-balance/evidenceInputs.js";
import { reportedExitCodeOf } from "../cli-balance/exitStatus.js";

const postedOf = <T extends { readonly outcome: unknown }>({ outcome: _outcome, ...posted }: T) => posted;

const TARGET = "tests/fixtures/pytest";

describe("[SCN-PYT-001] runReconcile reads a real pytest report as unit evidence", () => {
  it("reconciles the scenario a passing pytest test cites as satisfied, by that test", () => {
    const balance = runReconcile({
      features: `${TARGET}/features`,
      packageJson: `${TARGET}/package.json`,
      ci: TARGET,
      pytest: `${TARGET}/report.xml`,
    }, resolveTargetRoot({ features: `${TARGET}/features` }));
    const unit = balance.ledger.claimReconciliations
      .find((s) => s.claim === "SCN-PYF-001")
      ?.qualityCheckReconciliations.find((q) => q.qualityCheck === "unit");

    expect(unit?.evidenceObservations?.map((o) => o.outcome)).toEqual(["satisfied"]);
    expect(unit?.evidenceObservations?.[0]?.locator).toBe("test_cases::test_passing_cited");
  });
});

describe("[SCN-PYT-002] runReconcile reads a failing test in a real pytest report as failing unit evidence", () => {
  it("reconciles the scenario a failing pytest test cites as failing, by that test", () => {
    const balance = runReconcile({
      features: `${TARGET}/features`,
      packageJson: `${TARGET}/package.json`,
      ci: TARGET,
      pytest: `${TARGET}/report.xml`,
    }, resolveTargetRoot({ features: `${TARGET}/features` }));
    const unit = balance.ledger.claimReconciliations
      .find((s) => s.claim === "SCN-PYF-002")
      ?.qualityCheckReconciliations.find((q) => q.qualityCheck === "unit");

    expect(unit?.evidenceObservations?.map((o) => o.outcome)).toEqual(["failing"]);
    expect(unit?.evidenceObservations?.[0]?.locator).toBe("test_cases::test_failing_cited");
  });
});

describe("[SCN-PYT-003] runReconcile reads a skipped test in a real pytest report as no unit evidence", () => {
  it("leaves the scenario a skipped pytest test cites missing, with no observation", () => {
    const balance = runReconcile({
      features: `${TARGET}/features`,
      packageJson: `${TARGET}/package.json`,
      ci: TARGET,
      pytest: `${TARGET}/report.xml`,
    }, resolveTargetRoot({ features: `${TARGET}/features` }));
    const unit = balance.ledger.claimReconciliations
      .find((s) => s.claim === "SCN-PYF-003")
      ?.qualityCheckReconciliations.find((q) => q.qualityCheck === "unit");

    expect(unit?.outcome).toBe("missing");
    expect(unit?.evidenceObservations).toBeUndefined();
  });
});

describe("[SCN-PYT-004] runReconcile posts a pytest test citing an unknown scenario to a phantom claim", () => {
  it("raises a phantom claim for the code no feature file carries, holding that test's observation", () => {
    const balance = runReconcile({
      features: `${TARGET}/features`,
      packageJson: `${TARGET}/package.json`,
      ci: TARGET,
      pytest: `${TARGET}/report.xml`,
    }, resolveTargetRoot({ features: `${TARGET}/features` }));
    const phantomClaimRow = balance.ledger.claimReconciliations.find((s) => s.claim === "SCN-PYF-099");

    expect(phantomClaimRow?.kind).toBe("phantom-claim");
    expect(observationsOf(phantomClaimRow!).map(postedOf)).toEqual([
      { qualityCheck: "unit", scnId: "SCN-PYF-099", status: "passed", locator: "test_cases::test_unknown_code" },
    ]);
  });
});

describe("[SCN-PYT-005] runReconcile posts a pytest test citing no scenario as its passed observation to the unnamed claim", () => {
  it("holds the uncited test's observation on the unnamed claim, citing no scenario", () => {
    const balance = runReconcile({
      features: `${TARGET}/features`,
      packageJson: `${TARGET}/package.json`,
      ci: TARGET,
      pytest: `${TARGET}/report.xml`,
    }, resolveTargetRoot({ features: `${TARGET}/features` }));
    const unnamedClaimRow = balance.ledger.claimReconciliations.find((s) => s.kind === "unnamed-claim");

    expect(observationsOf(unnamedClaimRow!).map(postedOf)).toContainEqual({
      qualityCheck: "unit",
      scnId: null,
      status: "passed",
      locator: "test_cases::test_uncited",
    });
  });
});

describe("[SCN-PYT-006] runReconcile credits neither scenario a pytest test carrying two scn properties cites, and the unnamed claim's row names both codes", () => {
  const balance = () =>
    runReconcile({
      features: `${TARGET}/features`,
      packageJson: `${TARGET}/package.json`,
      ci: TARGET,
      pytest: `${TARGET}/report.xml`,
    }, resolveTargetRoot({ features: `${TARGET}/features` }));
  const unitOf = (scnId: string) =>
    balance()
      .ledger.claimReconciliations
      .find((s) => s.claim === scnId)
      ?.qualityCheckReconciliations.find((q) => q.qualityCheck === "unit");

  it.each(["SCN-PYF-004", "SCN-PYF-005"])("leaves %s missing, with no observation", (scnId) => {
    expect(unitOf(scnId)?.outcome).toBe("missing");
    expect(unitOf(scnId)?.evidenceObservations).toBeUndefined();
  });

  it("names both codes on the unnamed claim's row, beside the test", () => {
    const ctx: RunContext = { target: TARGET, inputs: runInputsOf({}), corpus: "features", runStart: new Date("2026-10-13T09:00:00.000Z"), sourceSha: null };
    const unnamedClaimRow = renderMarkdown(balance(), ctx, reportedExitCodeOf)
      .split("\n")
      .find((line) => line.startsWith("| (unnamed claim) | ") && line.includes("test_cases::test_two_codes"));

    expect(unnamedClaimRow ?? "").toContain("SCN-PYF-004");
    expect(unnamedClaimRow ?? "").toContain("SCN-PYF-005");
    expect(unnamedClaimRow ?? "").toContain("2 scenario codes cite SCN-PYF-004, SCN-PYF-005");
  });
});

describe("[SCN-PYT-007] runReconcile reads a real pytest run that failed to collect as broken evidence, and the run is unsound", () => {
  const balance = () =>
    runReconcile({
      features: `${TARGET}/features`,
      packageJson: `${TARGET}/package.json`,
      ci: TARGET,
      pytest: `${TARGET}/uncollectable-report.xml`,
    }, resolveTargetRoot({ features: `${TARGET}/features` }));

  it("posts one broken item, on the unnamed claim's row, naming the module and carrying the collection error", () => {
    const broken = balance().ledger.claimReconciliations.flatMap((row) =>
      reconcilingItemsOf(row).filter((item) => item.outcome === "broken").map((item) => ({ kind: row.kind, item }))
    );

    expect(broken).toHaveLength(1);
    expect(broken[0]?.kind).toBe("unnamed-claim");
    expect(broken[0]?.item.evidenceObservation?.locator).toBe("test_uncollectable");
    expect(broken[0]?.item.evidenceObservation?.message).toContain("ModuleNotFoundError: No module named 'module_that_does_not_exist'");
  });

  it("stamps the run unsound", () => {
    const ctx: RunContext = { target: TARGET, inputs: runInputsOf({}), corpus: "features", runStart: new Date("2026-10-15T09:00:00.000Z"), sourceSha: null };
    expect(assembleRenderInput(balance(), ctx).summary.runVerdict).toBe("unsound");
  });
});

describe("[SCN-PYT-008] runReconcile reads a test whose setup errored in a real pytest report as a broken line naming the test, and the scenario it cites reads a missing line beside it", () => {
  const balance = () =>
    runReconcile({
      features: `${TARGET}/features`,
      packageJson: `${TARGET}/package.json`,
      ci: TARGET,
      pytest: `${TARGET}/report.xml`,
    }, resolveTargetRoot({ features: `${TARGET}/features` }));

  it("reads the cited scenario's unit reconciliation as one missing line beside one broken line naming the test, with no observation that ran", () => {
    const unit = balance()
      .ledger.claimReconciliations.find((s) => s.claim === "SCN-PYF-006")
      ?.qualityCheckReconciliations.find((q) => q.qualityCheck === "unit");

    expect(unit?.outcome).toBe("missing");
    expect(unit?.evidenceObservations?.map((o) => [o.outcome, o.locator])).toEqual([["broken", "test_cases::test_setup_error"]]);
  });

  it("posts one broken item, naming the test and carrying the setup error", () => {
    const broken = balance().ledger.claimReconciliations.flatMap((row) =>
      reconcilingItemsOf(row).filter((item) => item.outcome === "broken")
    );

    expect(broken).toHaveLength(1);
    expect(broken[0]?.evidenceObservation?.locator).toBe("test_cases::test_setup_error");
    expect(broken[0]?.evidenceObservation?.message).toContain("RuntimeError: the resource could not be set up");
  });

  it("renders the broken item as a proof that errored before it ran, naming the test, never as a suite that failed to collect", () => {
    const ctx: RunContext = { target: TARGET, inputs: runInputsOf({}), corpus: "features", runStart: new Date("2026-10-13T09:00:00.000Z"), sourceSha: null };
    const brokenItemLine = renderMarkdown(balance(), ctx, reportedExitCodeOf)
      .split("\n")
      .find((line) => line.startsWith("| ") && line.includes("test_cases::test_setup_error"));

    expect(brokenItemLine ?? "").toContain(`${OUTCOME_DESCRIPTION.broken} (test_cases::test_setup_error`);
    expect(brokenItemLine ?? "").not.toContain("failed to collect");
  });
});
