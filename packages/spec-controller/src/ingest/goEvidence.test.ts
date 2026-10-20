import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { parseJunitEvidenceObservations, renderMarkdown, verdictCode, type RunContext } from "@3f-consulting/spec-controller-core";
import { parseJunitXml } from "./junitXml.js";
import { runReconcile } from "./corpusReading.test-utils.js";
import { resolveTargetRoot } from "../run-management/resolveRunInputs.js";

const TARGET = "tests/fixtures/go";

describe("[SCN-GOT-001] runReconcile reads a real gotestsum report as unit evidence", () => {
  it("reconciles the scenario a passing Go subtest cites in its name as satisfied, by that subtest", () => {
    const balance = runReconcile({
      features: `${TARGET}/features`,
      packageJson: `${TARGET}/package.json`,
      ci: TARGET,
      junit: `${TARGET}/report.xml`,
    }, resolveTargetRoot({ features: `${TARGET}/features` }));
    const unit = balance.ledger.claimReconciliations
      .find((s) => s.scnId === "SCN-GOF-001")
      ?.qualityCheckReconciliations.find((q) => q.qualityCheck === "unit");

    expect(unit?.outcome).toBe("satisfied");
    expect(unit?.evidenceObservation).toMatchObject({
      status: "passed",
      locator: "example.com/gofixture/cited::TestCited/[SCN-GOF-001]_a_passing_subtest_cites_its_scenario",
    });
    expect(unit?.evidenceObservation?.notes).toBeUndefined();
  });
});

describe("[SCN-GOT-002] runReconcile reads a failing Go subtest as a failing unit evidence observation", () => {
  it("reconciles the scenario a failing Go subtest cites in its name as failing, by that subtest", () => {
    const balance = runReconcile({
      features: `${TARGET}/features`,
      packageJson: `${TARGET}/package.json`,
      ci: TARGET,
      junit: `${TARGET}/report.xml`,
    }, resolveTargetRoot({ features: `${TARGET}/features` }));
    const unit = balance.ledger.claimReconciliations
      .find((s) => s.scnId === "SCN-GOF-002")
      ?.qualityCheckReconciliations.find((q) => q.qualityCheck === "unit");

    expect(unit?.outcome).toBe("failing");
    expect(unit?.evidenceObservation).toMatchObject({
      status: "failed",
      locator: "example.com/gofixture/cited::TestCited/[SCN-GOF-002]_a_failing_subtest_cites_its_scenario",
    });
  });
});

describe("[SCN-GOT-003] parseJunitEvidenceObservations reads the code in a Go subtest's own name before the codes in the names around it", () => {
  const observationOf = (name: string) =>
    parseJunitEvidenceObservations(parseJunitXml(readFileSync(`${TARGET}/report.xml`, "utf8")), "unit")
      .find((o) => o.locator === `example.com/gofixture/cited::TestCited/${name}`);

  it("credits a child subtest whose own name cites a scenario with that scenario alone, not its parent's", () => {
    const child = observationOf("[SCN-GOF-004]_a_subtest_that_cites_a_scenario/[SCN-GOF-003]_a_child_whose_own_name_cites_a_scenario");

    expect(child).toMatchObject({ scnId: "SCN-GOF-003", status: "passed" });
    expect(child?.notes).toBeUndefined();
  });

  it("credits a child subtest whose own name cites nothing with the scenario its parent's name cites", () => {
    const child = observationOf("[SCN-GOF-004]_a_subtest_that_cites_a_scenario/a_child_whose_own_name_cites_nothing");

    expect(child).toMatchObject({ scnId: "SCN-GOF-004", status: "passed" });
    expect(child?.notes).toBeUndefined();
  });
});

describe("[SCN-GOT-004] runReconcile credits neither scenario a Go subtest's name cites when it cites two, and the unnamed claim's row names both codes", () => {
  const balance = () => runReconcile({
    features: `${TARGET}/features`,
    packageJson: `${TARGET}/package.json`,
    ci: TARGET,
    junit: `${TARGET}/report.xml`,
  }, resolveTargetRoot({ features: `${TARGET}/features` }));
  const unitOf = (scnId: string) =>
    balance()
      .ledger.claimReconciliations
      .find((s) => s.scnId === scnId)
      ?.qualityCheckReconciliations.find((q) => q.qualityCheck === "unit");

  it.each(["SCN-GOF-005", "SCN-GOF-006"])("leaves %s missing, with no observation", (scnId) => {
    expect(unitOf(scnId)?.outcome).toBe("missing");
    expect(unitOf(scnId)?.evidenceObservation).toBeUndefined();
  });

  it("names both codes on the unnamed claim's row, beside the subtest", () => {
    const ctx: RunContext = { target: TARGET, inputs: {}, corpus: "features", runStart: new Date("2026-10-15T09:00:00.000Z"), sourceSha: null };
    const unnamedClaimRow = renderMarkdown(balance(), ctx)
      .split("\n")
      .find((line) => line.startsWith("| (unnamed claim) | "));

    expect(unnamedClaimRow ?? "").toContain(
      "cited::TestCited/[SCN-GOF-005]_[SCN-GOF-006]_a_subtest_that_cites_two_scenarios: 2 scenario codes cite SCN-GOF-005, SCN-GOF-006",
    );
  });
});

describe("[SCN-GOT-005] runReconcile reads a skipped Go subtest as posting no evidence observation", () => {
  it("posts no observation for the skipped subtest", () => {
    const observations = parseJunitEvidenceObservations(parseJunitXml(readFileSync(`${TARGET}/report.xml`, "utf8")), "unit");

    expect(observations.filter((o) => o.locator?.includes("[SCN-GOF-007]"))).toEqual([]);
  });

  it("leaves the scenario the skipped subtest cites missing, with no observation", () => {
    const unit = runReconcile({
      features: `${TARGET}/features`,
      packageJson: `${TARGET}/package.json`,
      ci: TARGET,
      junit: `${TARGET}/report.xml`,
    }, resolveTargetRoot({ features: `${TARGET}/features` })).ledger.claimReconciliations
      .find((s) => s.scnId === "SCN-GOF-007")
      ?.qualityCheckReconciliations.find((q) => q.qualityCheck === "unit");

    expect(unit?.outcome).toBe("missing");
    expect(unit?.evidenceObservation).toBeUndefined();
  });
});

describe("[SCN-GOT-006] runReconcile reads a Go subtest whose enclosing test fails before starting it as posting nothing", () => {
  const balance = () => runReconcile({
    features: `${TARGET}/features`,
    packageJson: `${TARGET}/package.json`,
    ci: TARGET,
    junit: `${TARGET}/report.xml`,
  }, resolveTargetRoot({ features: `${TARGET}/features` }));

  it("leaves the scenario the never-started subtest cites missing, with no observation", () => {
    const unit = balance().ledger.claimReconciliations
      .find((s) => s.scnId === "SCN-GOF-008")
      ?.qualityCheckReconciliations.find((q) => q.qualityCheck === "unit");

    expect(unit?.outcome).toBe("missing");
    expect(unit?.evidenceObservation).toBeUndefined();
  });

  it("posts the enclosing test's failure to the unnamed claim, under its own name", () => {
    const ctx: RunContext = { target: TARGET, inputs: {}, corpus: "features", runStart: new Date("2026-10-15T09:00:00.000Z"), sourceSha: null };
    const unnamedClaimRow = renderMarkdown(balance(), ctx)
      .split("\n")
      .find((line) => line.startsWith("| (unnamed claim) | "));

    expect(unnamedClaimRow ?? "").toContain(
      "Evidence Observation cites no Scenario (example.com/gofixture/cited::TestEnclosingFailsFirst) — 1 ran, 0 passed, 1 failed",
    );
  });
});

describe("[SCN-GOT-007] runReconcile reads a Go package that failed to compile as broken evidence, and the run is unsound", () => {
  const balance = () => runReconcile({
    features: `${TARGET}/features`,
    packageJson: `${TARGET}/package.json`,
    ci: TARGET,
    junit: `${TARGET}/report.xml`,
  }, resolveTargetRoot({ features: `${TARGET}/features` }));

  it("posts one broken item, on the unnamed claim's row, naming the package and saying its build failed", () => {
    const broken = balance().ledger.claimReconciliations.flatMap((row) =>
      row.reconcilingItems.filter((item) => item.outcome === "broken").map((item) => ({ kind: row.kind, item }))
    );

    expect(broken).toHaveLength(1);
    expect(broken[0]?.kind).toBe("unnamed-claim");
    expect(broken[0]?.item.locator).toBe("example.com/gofixture/broken");
    expect(broken[0]?.item.message).toContain("example.com/gofixture/broken [build failed]");
  });

  it("stamps the run unsound", () => {
    expect(verdictCode({ ledger: balance().ledger, strict: false })).toBe(4);
  });
});

describe("[SCN-GOT-008] runReconcile reads a Go subtest that panics as a failing unit evidence observation", () => {
  const unitOf = (scnId: string) =>
    runReconcile({
      features: `${TARGET}/features`,
      packageJson: `${TARGET}/package.json`,
      ci: TARGET,
      junit: `${TARGET}/report.xml`,
    }, resolveTargetRoot({ features: `${TARGET}/features` })).ledger.claimReconciliations
      .find((s) => s.scnId === scnId)
      ?.qualityCheckReconciliations.find((q) => q.qualityCheck === "unit");

  it("reconciles the scenario a panicking Go subtest cites as failing, by that subtest", () => {
    const unit = unitOf("SCN-GOF-009");

    expect(unit?.outcome).toBe("failing");
    expect(unit?.evidenceObservation).toMatchObject({
      status: "failed",
      locator: "example.com/gofixture/panics::TestPanics/[SCN-GOF-009]_a_panicking_subtest_cites_its_scenario",
    });
  });

  it("leaves the scenario a subtest the panic stopped cites missing, with no observation", () => {
    const unit = unitOf("SCN-GOF-010");

    expect(unit?.outcome).toBe("missing");
    expect(unit?.evidenceObservation).toBeUndefined();
  });
});
