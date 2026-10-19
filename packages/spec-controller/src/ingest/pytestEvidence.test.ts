import { describe, it, expect } from "vitest";
import { renderMarkdown, verdictCode, type RunContext } from "@3f-consulting/spec-controller-core";
import { OUTCOME_DESCRIPTION } from "@3f-consulting/spec-controller-core/internal";
import { runReconcile } from "./ingestQualityChecks.js";
import { resolveTargetRoot } from "../run-management/resolveRunInputs.js";

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
      .find((s) => s.scnId === "SCN-PYF-001")
      ?.qualityCheckReconciliations.find((q) => q.qualityCheck === "unit");

    expect(unit?.outcome).toBe("satisfied");
    expect(unit?.evidenceObservation?.locator).toBe("test_cases::test_passing_cited");
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
      .find((s) => s.scnId === "SCN-PYF-002")
      ?.qualityCheckReconciliations.find((q) => q.qualityCheck === "unit");

    expect(unit?.outcome).toBe("failing");
    expect(unit?.evidenceObservation?.locator).toBe("test_cases::test_failing_cited");
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
      .find((s) => s.scnId === "SCN-PYF-003")
      ?.qualityCheckReconciliations.find((q) => q.qualityCheck === "unit");

    expect(unit?.outcome).toBe("missing");
    expect(unit?.evidenceObservation).toBeUndefined();
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
    const phantomClaim = balance.ledger.claimReconciliations.find((s) => s.scnId === "SCN-PYF-099");

    expect(phantomClaim?.kind).toBe("phantom-claim");
    expect(phantomClaim?.evidenceObservations).toEqual([
      { qualityCheck: "unit", scnId: "SCN-PYF-099", status: "passed", locator: "test_cases::test_unknown_code" },
    ]);
  });
});

describe("[SCN-PYT-005] runReconcile posts a pytest test citing no scenario to the unnamed claim", () => {
  it("holds the uncited test's observation on the unnamed claim, citing no scenario", () => {
    const balance = runReconcile({
      features: `${TARGET}/features`,
      packageJson: `${TARGET}/package.json`,
      ci: TARGET,
      pytest: `${TARGET}/report.xml`,
    }, resolveTargetRoot({ features: `${TARGET}/features` }));
    const unnamedClaim = balance.ledger.claimReconciliations.find((s) => s.kind === "unnamed-claim");

    expect(unnamedClaim?.evidenceObservations).toContainEqual({
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
      .find((s) => s.scnId === scnId)
      ?.qualityCheckReconciliations.find((q) => q.qualityCheck === "unit");

  it.each(["SCN-PYF-004", "SCN-PYF-005"])("leaves %s missing, with no observation", (scnId) => {
    expect(unitOf(scnId)?.outcome).toBe("missing");
    expect(unitOf(scnId)?.evidenceObservation).toBeUndefined();
  });

  it("names both codes on the unnamed claim's row, beside the test", () => {
    const ctx: RunContext = { target: TARGET, inputs: {}, corpus: "features", runStart: new Date("2026-10-13T09:00:00.000Z"), sourceSha: null };
    const unnamedClaimRow = renderMarkdown(balance(), ctx)
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
      row.reconcilingItems.filter((item) => item.outcome === "broken").map((item) => ({ kind: row.kind, item }))
    );

    expect(broken).toHaveLength(1);
    expect(broken[0]?.kind).toBe("unnamed-claim");
    expect(broken[0]?.item.locator).toBe("test_uncollectable");
    expect(broken[0]?.item.message).toContain("ModuleNotFoundError: No module named 'module_that_does_not_exist'");
  });

  it("stamps the run unsound", () => {
    expect(verdictCode({ ledger: balance().ledger, strict: false })).toBe(4);
  });
});

describe("[SCN-PYT-008] runReconcile reads a test whose setup errored in a real pytest report as broken evidence, and its scenario reads missing", () => {
  const balance = () =>
    runReconcile({
      features: `${TARGET}/features`,
      packageJson: `${TARGET}/package.json`,
      ci: TARGET,
      pytest: `${TARGET}/report.xml`,
    }, resolveTargetRoot({ features: `${TARGET}/features` }));

  it("leaves the scenario the test cites missing, with no observation", () => {
    const unit = balance()
      .ledger.claimReconciliations.find((s) => s.scnId === "SCN-PYF-006")
      ?.qualityCheckReconciliations.find((q) => q.qualityCheck === "unit");

    expect(unit?.outcome).toBe("missing");
    expect(unit?.evidenceObservation).toBeUndefined();
  });

  it("posts one broken item, on the unnamed claim's row, naming the test and carrying the setup error", () => {
    const broken = balance().ledger.claimReconciliations.flatMap((row) =>
      row.reconcilingItems.filter((item) => item.outcome === "broken").map((item) => ({ kind: row.kind, item }))
    );

    expect(broken).toHaveLength(1);
    expect(broken[0]?.kind).toBe("unnamed-claim");
    expect(broken[0]?.item.locator).toBe("test_cases::test_setup_error");
    expect(broken[0]?.item.message).toContain("RuntimeError: the resource could not be set up");
  });

  it("renders the broken item as a proof that errored before it ran, naming the test, never as a suite that failed to collect", () => {
    const ctx: RunContext = { target: TARGET, inputs: {}, corpus: "features", runStart: new Date("2026-10-13T09:00:00.000Z"), sourceSha: null };
    const unnamedClaimRow = renderMarkdown(balance(), ctx)
      .split("\n")
      .find((line) => line.startsWith("| (unnamed claim) | ") && line.includes("test_cases::test_setup_error"));

    expect(unnamedClaimRow ?? "").toContain(`${OUTCOME_DESCRIPTION.broken} (test_cases::test_setup_error`);
    expect(unnamedClaimRow ?? "").not.toContain("failed to collect");
  });
});
