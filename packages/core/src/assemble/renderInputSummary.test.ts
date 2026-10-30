import { describe, it, expect, beforeEach } from "vitest";
import { assembleRenderInput } from "./renderInput.js";
import { renderJson } from "./composers.js";
import { parseScenarios } from "../parse/scenarioReaders.test-utils.js";
import { reconcile } from "../domain/evidenceReconciliation.js";
import type { Ledger } from "../model.js";
import type { EvidenceObservation, Scenario } from "../model.js";
import { reportCtx as ctx } from "./runContext.test-utils.js";
import { __er } from "../evidenceReconciliation.test-utils.js";
import { untaggedScenarioId, type EvidenceObligations } from "../domain/corpusCounts.js";

describe("[SCN-RMD-005] the summary states its evidence reconciliation: its Claim Reconciliations, Quality Check Reconciliations and pending items counted", () => {
  const rmd005Scenarios: Scenario[] = [
    { scnId: "SCN-RMD-001", evidenceObligations: [{ qualityCheck: "unit" }] },
    { scnId: "SCN-RMD-002", evidenceObligations: [{ qualityCheck: "unit" }, { qualityCheck: "integration", pending: true }] },
    { scnId: "SCN-RMD-012", evidenceObligations: [{ qualityCheck: "unit" }] },
  ];
  const rmd005Observations: EvidenceObservation[] = [
    { qualityCheck: "unit", scnId: "SCN-RMD-001", status: "passed" },
    { qualityCheck: "unit", scnId: "SCN-RMD-002", status: "passed" },
    { qualityCheck: "unit", scnId: "SCN-PHX-999", status: "passed" },
    { qualityCheck: "integration", scnId: null, status: "passed" },
  ];
  const evidenceReconciliation = {
    claimReconciliations: { total: 5, balanced: 2, outOfBalance: 3, phantomClaim: 1, unnamedClaim: 1 },
    qualityCheckReconciliations: {
      total: 5,
      byOutcome: {
        satisfied: 2,
        missing: 1,
        failing: 0,
        watermelon: 0,
        "cites-unknown-scenario": 1,
        "cites-no-scenario": 1,
        "no-scn-code": 0,
        "duplicate-scn-code": 0,
        broken: 0,
        "no-evidence-obligation": 0,
        "both-missing": 0,
      },
      outOfBalance: 3,
      missingByQualityCheck: [{ subject: "unit", count: 1 }],
    },
    pending: 1,
  };
  let rmd005Balance: Ledger;
  let lintBalance: Ledger;
  beforeEach(() => {
    rmd005Balance = reconcile(rmd005Scenarios, rmd005Observations);
    lintBalance = reconcile(
      [
        { scnId: "SCN-RMD-010", evidenceObligations: [{ qualityCheck: "fitness" }, { qualityCheck: "unit" }] },
        { scnId: "SCN-RMD-011", evidenceObligations: [{ qualityCheck: "fitness" }] },
      ],
      [
        { qualityCheck: "fitness", fitnessFunction: "lint:foo", scnId: "SCN-RMD-010", exists: true, enforcedOverRealSource: true },
        { qualityCheck: "fitness", fitnessFunction: "lint:bar", scnId: "SCN-RMD-011", exists: true, enforcedOverRealSource: false },
      ],
    );
  });

  it("states the Claim Reconciliations, the Quality Check Reconciliations and the pending items counted under evidenceReconciliation", () => {
    const report = assembleRenderInput(__er(rmd005Balance), ctx);
    expect(report.summary.evidenceReconciliation).toEqual(evidenceReconciliation);
  });

  it("states no fitness-only tally beside the evidence reconciliation, in the assembled summary or its JSON serialisation", () => {
    const summary = assembleRenderInput(__er(lintBalance), ctx).summary;
    expect(summary).not.toHaveProperty("fitness");
    expect(summary).not.toHaveProperty("lint");
    expect(JSON.parse(renderJson(__er(lintBalance), ctx)).summary).not.toHaveProperty("fitness");
  });

  it("carries the evidence reconciliation through the glue-free JSON serialisation", () => {
    expect(JSON.parse(renderJson(__er(rmd005Balance), ctx)).summary.evidenceReconciliation).toEqual(evidenceReconciliation);
  });
});

describe("[SCN-RMD-006] the summary's out-of-balance view groups each out-of-balance scenario under its feature, named by its code and title", () => {
  const scenarios: Scenario[] = [
    { scnId: "SCN-LDG-001", evidenceObligations: [{ qualityCheck: "unit" }] },
    { scnId: "SCN-LDG-003", evidenceObligations: [{ qualityCheck: "unit" }] },
    { scnId: "SCN-XYZ-001", evidenceObligations: [{ qualityCheck: "unit" }] },
    { scnId: "SCN-LNT-002", evidenceObligations: [{ qualityCheck: "fitness" }] },
    { scnId: "SCN-LDG-007", evidenceObligations: [{ qualityCheck: "integration" }] },
  ];
  const observations: EvidenceObservation[] = [
    { qualityCheck: "unit", scnId: "SCN-LDG-001", status: "passed" },
    { qualityCheck: "integration", scnId: "SCN-LDG-007", status: "failed" },
    { qualityCheck: "fitness", fitnessFunction: "lint:guard", scnId: "SCN-LNT-002", exists: true, enforcedOverRealSource: true },
    { qualityCheck: "unit", scnId: "SCN-PHX-999", status: "passed" },
    { qualityCheck: "unit", scnId: null, status: "passed" },
  ];
  const untaggedScenarios = [
    { feature: "ledger.feature", scenario: "a ledger scenario with no code" },
    { feature: "loose.feature", scenario: "a loose scenario" },
    { feature: "loose.feature", scenario: "another loose scenario" },
  ];
  const evidenceObligations: EvidenceObligations = {
    rawScnOccurrences: 5,
    scenarioCount: 8,
    excludedOccurrences: 0,
    untaggedScenarios,
  };
  const featureNames = new Map([
    ["LDG", "ledger"],
    ["LNT", "fitness-evidence"],
  ]);
  let ledger: Ledger;
  beforeEach(() => {
    ledger = reconcile(scenarios, observations, untaggedScenarios.map(untaggedScenarioId));
  });

  it("groups the out-of-balance scenarios by feature in ledger order, a phantom and an unnamed claim in no group", () => {
    const report = assembleRenderInput(__er(ledger), ctx, evidenceObligations, featureNames);
    expect(report.summary.outOfBalanceByFeature).toEqual([
      { feature: "LDG", title: "ledger", count: 3, claims: ["SCN-LDG-003", "SCN-LDG-007"], scenariosWithNoScnCode: 1 },
      { feature: "XYZ", count: 1, claims: ["SCN-XYZ-001"] },
      { feature: "loose.feature", count: 2, claims: [], scenariosWithNoScnCode: 2 },
    ]);
  });

  it("names no feature by its title and keys each scenario with no @SCN by its file when no feature titles are read", () => {
    const report = assembleRenderInput(__er(ledger), ctx, evidenceObligations);
    expect(report.summary.outOfBalanceByFeature).toEqual([
      { feature: "LDG", count: 2, claims: ["SCN-LDG-003", "SCN-LDG-007"] },
      { feature: "XYZ", count: 1, claims: ["SCN-XYZ-001"] },
      { feature: "ledger.feature", count: 1, claims: [], scenariosWithNoScnCode: 1 },
      { feature: "loose.feature", count: 2, claims: [], scenariosWithNoScnCode: 2 },
    ]);
  });

  it("states no view when no scenario is out of balance, a phantom and an unnamed claim out of balance included", () => {
    const balanced = reconcile(scenarios.slice(0, 1), [observations[0]!, observations[3]!, observations[4]!]);
    const report = assembleRenderInput(__er(balanced), ctx, evidenceObligations, featureNames);
    expect(report.summary.evidenceReconciliation.claimReconciliations).toMatchObject({ outOfBalance: 2 });
    expect(report.summary).not.toHaveProperty("outOfBalanceByFeature");
  });

  it("carries the view through the glue-free JSON serialisation", () => {
    const summary = JSON.parse(renderJson(__er(ledger), ctx, evidenceObligations, featureNames)).summary;
    expect(summary.outOfBalanceByFeature).toEqual([
      { feature: "LDG", title: "ledger", count: 3, claims: ["SCN-LDG-003", "SCN-LDG-007"], scenariosWithNoScnCode: 1 },
      { feature: "XYZ", count: 1, claims: ["SCN-XYZ-001"] },
      { feature: "loose.feature", count: 2, claims: [], scenariosWithNoScnCode: 2 },
    ]);
  });
});

describe("[SCN-RMD-008] each quality-check reconciliation carries a single quality-check coordinate, and the missing split counts the missing Reconciliation lines by it", () => {
  const featureLines = [
    "@RMD",
    "Feature: fixture",
    "  Rule: a fixture rule",
    "    @unit @fitness @SCN-RMD-008",
    "    Scenario: a fixture scenario",
  ];
  const brokenFitness: EvidenceObservation = {
    qualityCheck: "fitness",
    fitnessFunction: "lint:rmd",
    scnId: "SCN-RMD-008",
    exists: false,
    enforcedOverRealSource: false,
    broken: true,
    message: "the check's step never ran",
  };
  const report = () =>
    JSON.parse(
      JSON.stringify(assembleRenderInput(__er(reconcile(parseScenarios(featureLines.join("\n")), [brokenFitness])), ctx))
    ) as {
      ledger: {
        claimReconciliations: Array<{
          qualityCheckReconciliations: Array<Record<string, unknown>>;
        }>;
      };
      summary: { evidenceReconciliation: { qualityCheckReconciliations: Record<string, unknown> } };
    };

  it("carries a fitness reconciliation keyed by qualityCheck 'fitness' alone, its fitness function named only on its observation", () => {
    const fitness = report()
      .ledger.claimReconciliations.flatMap((s) => s.qualityCheckReconciliations)
      .filter((o) => o.qualityCheck === "fitness");
    expect(fitness).toEqual([
      {
        qualityCheck: "fitness",
        outcome: "missing",
        evidenceObligation: { qualityCheck: "fitness" },
        evidenceObservations: [
          {
            qualityCheck: "fitness",
            fitnessFunction: "lint:rmd",
            scnId: "SCN-RMD-008",
            exists: false,
            enforcedOverRealSource: false,
            broken: true,
            message: "the check's step never ran",
            outcome: "broken",
          },
        ],
      },
    ]);
  });

  it("counts the missing Reconciliation lines by quality check, an obligation answered only by a broken observation once", () => {
    const totals = report().summary.evidenceReconciliation.qualityCheckReconciliations;
    expect(totals).toMatchObject({ total: 3, byOutcome: { missing: 2, broken: 1 } });
    expect(totals.missingByQualityCheck).toEqual([
      { subject: "fitness", count: 1 },
      { subject: "unit", count: 1 },
    ]);
  });
});
