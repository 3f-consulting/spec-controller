import { describe, it, expect, beforeEach } from "vitest";
import { assembleRenderInput } from "./renderInput.js";
import { renderJson } from "../render/json.js";
import { parseScenarios } from "../parse/scenarios.js";
import { reconcile } from "../domain/evidenceReconciliation.js";
import type { Ledger } from "../model.js";
import type { EvidenceObservation, Scenario } from "../model.js";
import { reportCtx as ctx } from "./runContext.test-utils.js";
import { __er } from "../evidenceReconciliation.test-utils.js";

describe("[SCN-RMD-005] the summary materialises the three report totals", () => {
  const rmd005Scenarios: Scenario[] = [
    { scnId: "SCN-RMD-001", evidenceObligations: [{ qualityCheck: "unit" }] },
    { scnId: "SCN-RMD-002", evidenceObligations: [{ qualityCheck: "integration" }] },
    { scnId: "SCN-RMD-010", evidenceObligations: [{ qualityCheck: "fitness" }] },
    { scnId: "SCN-RMD-011", evidenceObligations: [{ qualityCheck: "fitness" }] },
  ];
  const rmd005Observations: EvidenceObservation[] = [
    { qualityCheck: "unit", scnId: "SCN-RMD-001", status: "passed" },
    { qualityCheck: "unit", scnId: "SCN-RMD-001", status: "passed" },
    { qualityCheck: "unit", scnId: "SCN-RMD-001", status: "passed" },
    { qualityCheck: "integration", scnId: "SCN-RMD-002", status: "passed" },
    { qualityCheck: "unit", scnId: "SCN-PHX-999", status: "passed" },
    { qualityCheck: "integration", scnId: null, status: "passed" },
    { qualityCheck: "fitness", fitnessFunction: "lint:foo", scnId: "SCN-RMD-010", exists: true, enforcedOverRealSource: true },
    { qualityCheck: "fitness", fitnessFunction: "lint:bar", scnId: "SCN-RMD-011", exists: true, enforcedOverRealSource: false },
    { qualityCheck: "fitness", fitnessFunction: "lint:baz", exists: true, enforcedOverRealSource: true },
  ];
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

  it("materialises the test-volume totals (onScenario excludes onPhantomScenario)", () => {
    const report = assembleRenderInput(__er(rmd005Balance, true, false), ctx);
    expect(report.summary.testVolume).toEqual({
      totalEvidenceObservations: 6,
      onScenario: 4,
      onPhantomScenario: 1,
      onSuspenseScenario: 1,
    });
  });

  it("materialises the fitness-function totals", () => {
    const report = assembleRenderInput(__er(rmd005Balance, false, true), ctx, undefined, undefined);
    expect(report.summary.fitnessFunctions).toEqual({
      runningFitnessFunctionCount: 3,
      uncitedFitnessFunctionCount: 1,
    });
  });

  it("materialises the fitness-only tally (satisfied / total) under summary.fitness, ignoring behavioural evidenceObligations", () => {
    const report = assembleRenderInput(__er(lintBalance), ctx);
    expect(report.summary.fitness).toEqual({ satisfied: 1, total: 2 });
    expect(report.summary).not.toHaveProperty("lint");
  });

  it("carries the three totals through the glue-free JSON serialisation", () => {
    const parsed = JSON.parse(renderJson(__er(rmd005Balance, true, true), ctx));
    expect(parsed.summary.testVolume).toEqual({ totalEvidenceObservations: 6, onScenario: 4, onPhantomScenario: 1, onSuspenseScenario: 1 });
    expect(parsed.summary.fitnessFunctions).toEqual({ runningFitnessFunctionCount: 3, uncitedFitnessFunctionCount: 1 });
    expect(parsed.summary.fitness).toEqual({ satisfied: 1, total: 2 });
  });
});

describe("[SCN-RMD-006] the report model carries the feature titles", () => {
  let codedBalance: Ledger;
  beforeEach(() => {
    codedBalance = reconcile(
      [
        { scnId: "SCN-LDG-003", evidenceObligations: [{ qualityCheck: "unit" }] },
        { scnId: "SCN-LNT-002", evidenceObligations: [{ qualityCheck: "fitness" }] },
      ],
      [{ qualityCheck: "fitness", fitnessFunction: "guard-lint", scnId: "SCN-LNT-002", exists: true, enforcedOverRealSource: false }],
    );
  });
  const featureNames = new Map([
    ["LDG", "ledger"],
    ["LNT", "fitness-evidence"],
  ]);

  it("materialises the feature titles under metadata as a plain object", () => {
    const report = assembleRenderInput(__er(codedBalance, false, false), ctx, undefined, featureNames);
    expect(report.metadata?.featureNames).toEqual({ LDG: "ledger", LNT: "fitness-evidence" });
    expect(report).not.toHaveProperty("featureNames");
  });

  it("omits metadata when no coded feature is named (no map, or an empty map)", () => {
    expect(assembleRenderInput(__er(codedBalance), ctx)).not.toHaveProperty("metadata");
    expect(assembleRenderInput(__er(codedBalance), ctx)).not.toHaveProperty("featureNames");
    expect(
      assembleRenderInput(__er(codedBalance, false, false), ctx, undefined, new Map())
    ).not.toHaveProperty("metadata");
  });
});

describe("[SCN-RMD-008] each reconciled evidence sub-row carries a single quality-check coordinate", () => {
  const featureLines = [
    "@RMD",
    "Feature: fixture",
    "  Rule: a fixture rule",
    "    @unit @fitness @SCN-RMD-008",
    "    Scenario: a fixture scenario",
  ];
  const report = () =>
    JSON.parse(JSON.stringify(assembleRenderInput(__er(reconcile(parseScenarios(featureLines.join("\n")), [])), ctx))) as {
      ledger: {
        scenarioReconciliations: Array<{
          qualityCheckReconciliations: Array<Record<string, unknown>>;
          reconcilingItems: Array<Record<string, unknown>>;
        }>;
      };
      summary: { qualityCheckReconciliations: Record<string, unknown> };
    };

  it("carries a fitness sub-row's qualityCheck as 'fitness', naming no characteristic", () => {
    const r = report();
    const fitness = r.ledger.scenarioReconciliations
      .flatMap((s) => s.qualityCheckReconciliations)
      .find((o) => o.qualityCheck === "fitness");
    expect(fitness).toBeDefined();
    expect(fitness!.qualityCheck).toBe("fitness");
    expect(fitness).not.toHaveProperty("fitnessFunction");
  });

  it("carries the missing split under missingByQualityCheck, keyed by quality-check", () => {
    const summary = report().summary;
    expect(summary).toHaveProperty("qualityCheckReconciliations.missingByQualityCheck");
    const split = summary.qualityCheckReconciliations.missingByQualityCheck as Array<{ subject: string; count: number }>;
    expect(split).toEqual([
      { subject: "fitness", count: 1 },
      { subject: "unit", count: 1 },
    ]);
  });
});
