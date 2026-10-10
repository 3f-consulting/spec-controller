import { describe, it, expect, beforeEach } from "vitest";
import { assembleRenderInput } from "./renderInput.js";
import { renderJson } from "../render/json.js";
import { renderReport, renderMarkdown } from "../render/markdown.js";
import { parseScenarios } from "../parse/scenarios.js";
import { reconcile } from "../domain/evidenceReconciliation.js";
import type { Ledger } from "../model.js";
import type { EvidenceObservation, Scenario } from "../model.js";
import { reportCtx as ctx } from "./runContext.testkit.js";
import { reportLedger } from "./renderInput.testkit.js";
import { __er } from "../evidenceReconciliation.testkit.js";

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
    { qualityCheck: "fitness", staticCheck: "lint:foo", scnId: "SCN-RMD-010", exists: true, enforcedOverRealSource: true },
    { qualityCheck: "fitness", staticCheck: "lint:bar", scnId: "SCN-RMD-011", exists: true, enforcedOverRealSource: false },
    { qualityCheck: "fitness", staticCheck: "lint:baz", exists: true, enforcedOverRealSource: true },
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
        { qualityCheck: "fitness", staticCheck: "lint:foo", scnId: "SCN-RMD-010", exists: true, enforcedOverRealSource: true },
        { qualityCheck: "fitness", staticCheck: "lint:bar", scnId: "SCN-RMD-011", exists: true, enforcedOverRealSource: false },
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

  it("re-homes the raw per-quality-check totals onto summary (folded from the Ledger, 3F-2102)", () => {
    const report = assembleRenderInput(__er(rmd005Balance, true, false), ctx);
    expect(report.summary.rawByRuntimeQualityCheck).toEqual({ unit: 4, integration: 2, e2e: 0, performance: 0 });
  });

  it("keeps the test-volume identity Σ rawByRuntimeQualityCheck = onScenario + onPhantomScenario + onSuspenseScenario", () => {
    const report = assembleRenderInput(__er(rmd005Balance, true, false), ctx);
    const tv = report.summary.testVolume!;
    expect(tv.totalEvidenceObservations).toBe(tv.onScenario + tv.onPhantomScenario + tv.onSuspenseScenario);
  });

  it("materialises the static-check totals", () => {
    const report = assembleRenderInput(__er(rmd005Balance, false, true), ctx, undefined, undefined);
    expect(report.summary.staticChecks).toEqual({
      runningStaticCheckCount: 3,
      uncitedStaticCheckCount: 1,
    });
  });

  it("carries the 2-field census shape, with the evidence-obligation count implicit", () => {
    const report = assembleRenderInput(__er(rmd005Balance, false, true), ctx, undefined, undefined);
    const sg = report.summary.staticChecks!;
    expect(sg.runningStaticCheckCount - sg.uncitedStaticCheckCount).toBe(2);
    expect(Object.keys(sg).sort()).toEqual(["runningStaticCheckCount", "uncitedStaticCheckCount"]);
  });

  it("materialises the fitness-only tally (satisfied / total) under summary.fitness, ignoring runtime evidenceObligations", () => {
    const report = assembleRenderInput(__er(lintBalance), ctx);
    expect(report.summary.fitness).toEqual({ satisfied: 1, total: 2 });
    expect(report.summary).not.toHaveProperty("lint");
  });

  it("omits testVolume / staticChecks when their sibling read is not threaded, but always carries the fitness tally", () => {
    const report = assembleRenderInput(__er(reportLedger()), ctx);
    expect(report.summary).not.toHaveProperty("testVolume");
    expect(report.summary).not.toHaveProperty("staticChecks");
    expect(report.summary.fitness).toEqual({ satisfied: 0, total: 0 });
  });

  it("carries the three totals through the glue-free JSON serialisation", () => {
    const parsed = JSON.parse(renderJson(__er(rmd005Balance, true, true), ctx));
    expect(parsed.summary.testVolume).toEqual({ totalEvidenceObservations: 6, onScenario: 4, onPhantomScenario: 1, onSuspenseScenario: 1 });
    expect(parsed.summary.staticChecks).toEqual({ runningStaticCheckCount: 3, uncitedStaticCheckCount: 1 });
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
      [{ qualityCheck: "fitness", staticCheck: "guard-lint", scnId: "SCN-LNT-002", exists: true, enforcedOverRealSource: false }],
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

  it("serialises the feature titles under metadata through the glue-free JSON", () => {
    const parsed = JSON.parse(
      renderJson(__er(codedBalance, false, false), ctx, undefined, featureNames)
    );
    expect(parsed.metadata.featureNames).toEqual({ LDG: "ledger", LNT: "fitness-evidence" });
    expect(parsed).not.toHaveProperty("featureNames");
  });

  it("renderReport names each feature in full sourced from the model, no external map", () => {
    const report = assembleRenderInput(__er(codedBalance, false, false), ctx, undefined, featureNames);
    const md = renderReport(report);
    expect(md).toContain("| ledger (LDG) | 1 | SCN-LDG-003 |");
    expect(md).toContain("| fitness-evidence (LNT) | 1 | SCN-LNT-002 |");
  });

  it("keeps the markdown byte-identical: the model-sourced render equals the map-threaded render", () => {
    const modelSourced = renderReport(
      assembleRenderInput(__er(codedBalance, false, false), ctx, undefined, featureNames)
    );
    const mapThreaded = renderMarkdown(__er(codedBalance, false, false), ctx, undefined, featureNames);
    expect(modelSourced).toBe(mapThreaded);
  });

  it("omits metadata when no coded feature is named (no map, or an empty map)", () => {
    expect(assembleRenderInput(__er(codedBalance), ctx)).not.toHaveProperty("metadata");
    expect(assembleRenderInput(__er(codedBalance), ctx)).not.toHaveProperty("featureNames");
    expect(
      assembleRenderInput(__er(codedBalance, false, false), ctx, undefined, new Map())
    ).not.toHaveProperty("metadata");
  });

  it("places metadata last, carrying featureNames — no top-level featureNames sibling", () => {
    const report = assembleRenderInput(__er(codedBalance, false, false), ctx, undefined, featureNames) as unknown as Record<string, unknown>;
    const keys = Object.keys(report);
    expect(keys).toContain("metadata");
    expect(keys).not.toContain("featureNames");
    expect(keys[keys.length - 1]).toBe("metadata");
    expect((report.metadata as Record<string, unknown>).featureNames).toEqual({
      LDG: "ledger",
      LNT: "fitness-evidence",
    });
    expect(report).not.toHaveProperty("warnings");
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
      summary: { evidenceObligations: Record<string, unknown> };
    };

  it("keys each evidence sub-row by a single qualityCheck field with no kind or level", () => {
    const r = report();
    const qualityCheckReconciliations = r.ledger.scenarioReconciliations.flatMap((s) => [...s.qualityCheckReconciliations, ...s.reconcilingItems]);
    expect(qualityCheckReconciliations.length).toBeGreaterThan(0);
    for (const row of qualityCheckReconciliations) {
      expect(typeof row.qualityCheck).toBe("string");
      expect(row).not.toHaveProperty("kind");
      expect(row).not.toHaveProperty("level");
    }
  });

  it("carries a fitness sub-row's qualityCheck as 'fitness', naming no characteristic", () => {
    const r = report();
    const fitness = r.ledger.scenarioReconciliations
      .flatMap((s) => s.qualityCheckReconciliations)
      .find((o) => o.qualityCheck === "fitness");
    expect(fitness).toBeDefined();
    expect(fitness!.qualityCheck).toBe("fitness");
    expect(fitness).not.toHaveProperty("staticCheck");
  });

  it("keys a runtime sub-row by its level as the quality-check", () => {
    const r = report();
    const runtime = r.ledger.scenarioReconciliations
      .flatMap((s) => s.qualityCheckReconciliations)
      .find((o) => o.qualityCheck === "unit");
    expect(runtime).toBeDefined();
    expect(runtime).not.toHaveProperty("staticCheck");
  });

  it("carries the missing split under missingByQualityCheck, keyed by quality-check", () => {
    const eo = report().summary.evidenceObligations;
    expect(eo).toHaveProperty("missingByQualityCheck");
    const split = eo.missingByQualityCheck as Array<{ subject: string; count: number }>;
    expect(split).toEqual([
      { subject: "fitness", count: 1 },
      { subject: "unit", count: 1 },
    ]);
  });
});
