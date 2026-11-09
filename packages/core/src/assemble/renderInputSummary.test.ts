import { describe, it, expect, beforeEach } from "vitest";
import { assembleRenderInput } from "./renderInput.js";
import { renderJson } from "./composers.js";
import { parseScenarios } from "../parse/scenarioReaders.test-utils.js";
import { reconcile } from "../domain/evidenceReconciliation.js";
import type { Ledger } from "../model.js";
import type { EvidenceObservation, Scenario } from "../model.js";
import { reportCtx as ctx } from "../render/runContext.test-utils.js";
import { __er } from "../evidenceReconciliation.test-utils.js";
import { claimReconciliationsOf } from "./reportClaimReconciliations.test-utils.js";
import { reconciliationTotalsOf } from "./reportReconciliationTotals.test-utils.js";
import { untaggedScenarioId, type EvidenceObligations } from "../domain/corpusCounts.js";
import { scenarioName } from "../domain/scenarioName.test-utils.js";

describe("[CLM-RMD-005] the summary states its reconciliation totals: its Claim Reconciliations, Reconciliation lines and pending items counted", () => {
  const rmd005Scenarios: Scenario[] = [
    { claimCode: "CLM-RMD-001", evidenceObligations: [{ qualityCheckKind: "unit" }] },
    { claimCode: "CLM-RMD-002", evidenceObligations: [{ qualityCheckKind: "unit" }, { qualityCheckKind: "integration", pending: true }] },
    { claimCode: "CLM-RMD-012", evidenceObligations: [{ qualityCheckKind: "unit" }] },
  ];
  const rmd005Observations: EvidenceObservation[] = [
    { qualityCheckKind: "unit", claimCode: "CLM-RMD-001", status: "passed" },
    { qualityCheckKind: "unit", claimCode: "CLM-RMD-002", status: "passed" },
    { qualityCheckKind: "unit", claimCode: "CLM-PHX-999", status: "passed" },
    { qualityCheckKind: "integration", claimCode: null, status: "passed" },
  ];
  const reconciliationTotals = {
    claimReconciliations: { total: 5, balanced: 2, outOfBalance: 3, phantomClaim: 1, unnamedClaim: 1 },
    reconciliationLines: {
      total: 5,
      byOutcome: {
        satisfied: 2,
        missing: 1,
        failing: 0,
        "cannot-fail": 0,
        "cites-unknown-claim": 1,
        "cites-no-claim": 1,
        "no-claim-code": 0,
        "duplicate-claim-code": 0,
        "never-ran": 0,
        "not-asked-for": 0,
        "no-quality-check": 0,
      },
      outOfBalance: 3,
    },
    pending: 1,
  };
  const reconciliationTotalsWithAnyMissingSplit = () => ({
    ...reconciliationTotals,
    reconciliationLines: { ...reconciliationTotals.reconciliationLines, missingByQualityCheckKind: expect.anything() },
  });
  let rmd005Balance: Ledger;
  let lintBalance: Ledger;
  beforeEach(() => {
    rmd005Balance = reconcile(rmd005Scenarios, rmd005Observations);
    lintBalance = reconcile(
      [
        { claimCode: "CLM-RMD-010", evidenceObligations: [{ qualityCheckKind: "fitness" }, { qualityCheckKind: "unit" }] },
        { claimCode: "CLM-RMD-011", evidenceObligations: [{ qualityCheckKind: "fitness" }] },
      ],
      [
        { qualityCheckKind: "fitness", fitnessFunction: "lint:foo", claimCode: "CLM-RMD-010", exists: true, enforcedOverRealSource: true },
        { qualityCheckKind: "fitness", fitnessFunction: "lint:bar", claimCode: "CLM-RMD-011", exists: true, enforcedOverRealSource: false },
      ],
    );
  });

  it("states the Claim Reconciliations, the Reconciliation lines and the pending items counted under reconciliationTotals", () => {
    const report = assembleRenderInput(__er(rmd005Balance), ctx);
    expect(report.summary.reconciliationTotals).toEqual(reconciliationTotalsWithAnyMissingSplit());
  });

  it("states no fitness-only tally beside the reconciliation totals, in the assembled summary or its JSON serialisation", () => {
    const summary = assembleRenderInput(__er(lintBalance), ctx).summary;
    expect(summary).not.toHaveProperty("fitness");
    expect(summary).not.toHaveProperty("lint");
    expect(JSON.parse(renderJson(__er(lintBalance), ctx)).summary).not.toHaveProperty("fitness");
  });

  it("carries the reconciliation totals through the glue-free JSON serialisation", () => {
    expect(JSON.parse(renderJson(__er(rmd005Balance), ctx)).summary.reconciliationTotals).toEqual(reconciliationTotalsWithAnyMissingSplit());
  });
});

describe("[CLM-RMD-006] the summary's out-of-balance view groups each out-of-balance scenario under its feature, named by its code and feature file", () => {
  const scenarios: Scenario[] = [
    { claimCode: "CLM-LDG-001", evidenceObligations: [{ qualityCheckKind: "unit" }] },
    { claimCode: "CLM-LDG-003", evidenceObligations: [{ qualityCheckKind: "unit" }] },
    { claimCode: "CLM-XYZ-001", evidenceObligations: [{ qualityCheckKind: "unit" }] },
    { claimCode: "CLM-LNT-002", evidenceObligations: [{ qualityCheckKind: "fitness" }] },
    { claimCode: "CLM-LDG-007", evidenceObligations: [{ qualityCheckKind: "integration" }] },
  ];
  const observations: EvidenceObservation[] = [
    { qualityCheckKind: "unit", claimCode: "CLM-LDG-001", status: "passed" },
    { qualityCheckKind: "integration", claimCode: "CLM-LDG-007", status: "failed" },
    { qualityCheckKind: "fitness", fitnessFunction: "lint:guard", claimCode: "CLM-LNT-002", exists: true, enforcedOverRealSource: true },
    { qualityCheckKind: "unit", claimCode: "CLM-PHX-999", status: "passed" },
    { qualityCheckKind: "unit", claimCode: null, status: "passed" },
  ];
  let evidenceObligations: EvidenceObligations;
  const featureNames = new Map([
    ["LDG", "ledger"],
    ["LNT", "fitness-evidence"],
    ["XYZ", "billing/checkout"],
  ]);
  const byNamedFeature = [
    { feature: "LDG", featureFile: "ledger.feature", count: 3, claims: ["CLM-LDG-003", "CLM-LDG-007"], scenariosWithNoClaimCode: 1 },
    { feature: "XYZ", featureFile: "billing/checkout.feature", count: 1, claims: ["CLM-XYZ-001"] },
    { feature: "loose.feature", count: 2, claims: [], scenariosWithNoClaimCode: 2 },
  ];
  let ledger: Ledger;
  beforeEach(() => {
    const untaggedScenarios = [
      scenarioName("ledger.feature", "a ledger scenario with no code"),
      scenarioName("loose.feature", "a loose scenario"),
      scenarioName("loose.feature", "another loose scenario"),
    ];
    evidenceObligations = { rawClaimCodeOccurrences: 5, scenarioCount: 8, excludedOccurrences: 0, untaggedScenarios };
    ledger = reconcile(scenarios, observations, untaggedScenarios.map(untaggedScenarioId));
  });

  it("groups the out-of-balance scenarios by feature in ledger order, a phantom and an unnamed claim in no group", () => {
    const report = assembleRenderInput(__er(ledger), ctx, evidenceObligations, featureNames);
    expect(report.summary.outOfBalanceByFeature).toEqual(byNamedFeature);
  });

  it("names no entry's feature file and keys each scenario with no claim code by its file when no feature files are named", () => {
    const report = assembleRenderInput(__er(ledger), ctx, evidenceObligations);
    expect(report.summary.outOfBalanceByFeature).toEqual([
      { feature: "LDG", count: 2, claims: ["CLM-LDG-003", "CLM-LDG-007"] },
      { feature: "XYZ", count: 1, claims: ["CLM-XYZ-001"] },
      { feature: "ledger.feature", count: 1, claims: [], scenariosWithNoClaimCode: 1 },
      { feature: "loose.feature", count: 2, claims: [], scenariosWithNoClaimCode: 2 },
    ]);
  });

  it("states no view when no scenario is out of balance, a phantom and an unnamed claim out of balance included", () => {
    const balanced = reconcile(scenarios.slice(0, 1), [observations[0]!, observations[3]!, observations[4]!]);
    const report = assembleRenderInput(__er(balanced), ctx, evidenceObligations, featureNames);
    expect(reconciliationTotalsOf(report).claimReconciliations).toMatchObject({ outOfBalance: 2 });
    expect(report.summary).not.toHaveProperty("outOfBalanceByFeature");
  });

  it("carries the view through the glue-free JSON serialisation", () => {
    const summary = JSON.parse(renderJson(__er(ledger), ctx, evidenceObligations, featureNames)).summary;
    expect(summary.outOfBalanceByFeature).toEqual(byNamedFeature);
  });
});

describe("[CLM-RMD-008] each quality-check reconciliation carries a single kind of quality check as its coordinate, and the missing split counts the missing Reconciliation lines by it", () => {
  const featureLines = [
    "@RMD",
    "Feature: fixture",
    "  Rule: a fixture rule",
    "    @unit @fitness @CLM-RMD-008",
    "    Scenario: a fixture scenario",
  ];
  const neverRanFitness: EvidenceObservation = {
    qualityCheckKind: "fitness",
    fitnessFunction: "lint:rmd",
    claimCode: "CLM-RMD-008",
    exists: false,
    enforcedOverRealSource: false,
    neverRan: true,
    message: "the check's step never ran",
  };
  const report = () =>
    JSON.parse(
      JSON.stringify(assembleRenderInput(__er(reconcile(parseScenarios(featureLines.join("\n")), [neverRanFitness])), ctx))
    ) as unknown;

  it("carries a fitness reconciliation keyed by qualityCheckKind 'fitness' alone, its fitness function named only on its observation", () => {
    const fitness = claimReconciliationsOf<{ qualityCheckReconciliations: Array<Record<string, unknown>> }>(report())
      .flatMap((s) => s.qualityCheckReconciliations)
      .filter((o) => o.qualityCheckKind === "fitness");
    expect(fitness).toEqual([
      {
        qualityCheckKind: "fitness",
        outcome: "missing",
        evidenceObligation: { qualityCheckKind: "fitness" },
        evidenceObservations: [
          {
            qualityCheckKind: "fitness",
            fitnessFunction: "lint:rmd",
            claimCode: "CLM-RMD-008",
            exists: false,
            enforcedOverRealSource: false,
            neverRan: true,
            message: "the check's step never ran",
            outcome: "never-ran",
          },
        ],
      },
    ]);
  });

  it("counts the missing Reconciliation lines by kind of quality check, an obligation answered only by an observation that never ran once", () => {
    const totals = reconciliationTotalsOf(report()).reconciliationLines;
    expect(totals).toMatchObject({ total: 3, byOutcome: { missing: 2, "never-ran": 1 } });
    expect(totals.missingByQualityCheckKind).toEqual([
      { qualityCheckKind: "fitness", count: 1 },
      { qualityCheckKind: "unit", count: 1 },
    ]);
  });
});
