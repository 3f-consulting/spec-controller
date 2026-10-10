import { describe, it, expect, beforeEach } from "vitest";
import { assembleRenderInput } from "./renderInput.js";
import { evidenceReconciliationFromSources } from "./evidenceReconciliationFromSources.js";
import { renderJson } from "../render/json.js";
import { parseScenarios } from "../parse/scenarios.js";
import { reconcile } from "../domain/evidenceReconciliation.js";
import { isBalanced } from "../domain/ledger.js";
import type { Ledger } from "../model.js";
import type { EvidenceObligations } from "../census/evidenceObligations.js";
import type { EvidenceObservation, Scenario } from "../model.js";
import { reportCtx as ctx } from "./runContext.testkit.js";
import { reportLedger } from "./renderInput.testkit.js";
import { __er } from "../evidenceReconciliation.testkit.js";

const evidenceObligations: EvidenceObligations = {
  rawScnOccurrences: 10,
  scenarioCount: 7,
  excludedOccurrences: 3,
  untaggedScenarios: [],
};

describe("[SCN-RMD-001] assembleRenderInput builds one whole-document report model", () => {
  it("carries the sections as top-level keys in document order", () => {
    const judged = evidenceReconciliationFromSources({
      featureSources: ["@ONE\nFeature: one\n\n  @unit @SCN-ONE-001\n  Scenario: s\n    Given a thing\n", "Feature: plain\n"],
      featureFiles: [
        { slug: "one", featureCode: "ONE" },
        { slug: "plain", featureCode: null },
      ],
      untaggedScenarios: [],
      packageJson: {},
      ciSources: [],
      runtimeObservations: [],
      deferralTags: [],
    });
    const report = assembleRenderInput(judged, ctx, evidenceObligations) as unknown as Record<string, unknown>;
    expect(Object.keys(report)).toEqual([
      "runProvenance",
      "summary",
      "ledger",
      "scenarioCodeErrors",
      "scenarioCodePopulation",
      "evidenceObligations",
    ]);
    expect(report.scenarioCodePopulation).toEqual({ featureFiles: 2, featureCodes: 1 });
    expect(report).not.toHaveProperty("warnings");
  });

  it("renames the provenance section to runProvenance carrying the run facts", () => {
    const report = assembleRenderInput(__er(reportLedger()), ctx);
    expect(report.runProvenance.target).toBe("an-adopters-repository");
    expect(report.runProvenance.sourceSha).toBe("905a987c0ffeeba110000000000000000deadbeef");
    expect(report.runProvenance.runTimestamp).toBe("2026-07-02T08:17:53Z");
  });

  it("materialises the summary totals from the balance", () => {
    const report = assembleRenderInput(__er(reportLedger()), ctx);
    expect(report.summary.scenarioReconciliations).toEqual({ total: 2, balanced: 1, outOfBalance: 1, phantom: 0, suspense: 0 });
    expect(report.summary.evidenceObligations.total).toBe(3);
    expect(report.summary.evidenceObligations.outOfBalance).toBe(2);
    expect(report.summary.evidenceObligations.byOutcome["satisfied"]).toBe(1);
    expect(report.summary.evidenceObligations.byOutcome["missing"]).toBe(2);
    expect(report.summary.evidenceObligations.missingByQualityCheck).toEqual([
      { subject: "unit", count: 1 },
      { subject: "integration", count: 1 },
    ]);
  });

  const suspenseScenarios: Scenario[] = [
    { scnId: "SCN-TGT-001", evidenceObligations: [{ qualityCheck: "unit" }] },
    { scnId: "SCN-TGT-002", evidenceObligations: [{ qualityCheck: "unit" }] },
  ];
  const suspenseObservations: EvidenceObservation[] = [
    { qualityCheck: "unit", scnId: "SCN-TGT-001", status: "passed" },
    { qualityCheck: "unit", scnId: "SCN-TGT-002", status: "passed" },
    { qualityCheck: "fitness", staticCheck: "guard:static", exists: true, enforcedOverRealSource: true },
  ];
  let balanceWithSuspense: Ledger;
  beforeEach(() => {
    balanceWithSuspense = reconcile(suspenseScenarios, suspenseObservations);
  });

  it("counts the suspense reconciliation in the summary totals — a run whose only out-of-balance row is the suspense row tallies 1 out-of-balance, not 0", () => {
    const report = assembleRenderInput(__er(balanceWithSuspense), ctx);
    expect(report.summary.scenarioReconciliations).toEqual({
      total: 3,
      balanced: 2,
      outOfBalance: 1,
      phantom: 0,
      suspense: 1,
    });
    expect(isBalanced(balanceWithSuspense)).toBe(false);
    expect(report.summary.scenarioReconciliations.outOfBalance).toBeGreaterThan(0);
  });

  it("counts the phantom reconciliation in the summary totals too — a phantom scenario is out-of-balance, not a bucket apart", () => {
    const balanceWithPhantom: Ledger = reconcile(suspenseScenarios, [
      ...suspenseObservations,
      { qualityCheck: "unit", scnId: "SCN-PHM-999", status: "passed" },
    ]);
    const report = assembleRenderInput(__er(balanceWithPhantom), ctx);
    expect(report.summary.scenarioReconciliations).toEqual({
      total: 4,
      balanced: 2,
      outOfBalance: 2,
      phantom: 1,
      suspense: 1,
    });
    const t = report.summary.scenarioReconciliations;
    expect(t.total - t.phantom - t.suspense).toBe(2);
    expect(isBalanced(balanceWithPhantom)).toBe(false);
  });

  it("carries no warnings key — the retired authoring-quality axis", () => {
    const report = assembleRenderInput(__er(reportLedger()), ctx) as unknown as Record<string, unknown>;
    expect(report).not.toHaveProperty("warnings");
    expect(((report.ledger as { scenarioReconciliations: unknown[] }).scenarioReconciliations)).toHaveLength(2);
  });

  it("renderJson is a glue-free JSON.stringify of the assembled report", () => {
    const parsed = JSON.parse(renderJson(__er(reportLedger(), false, false), ctx, evidenceObligations));
    expect(parsed).toEqual(assembleRenderInput(__er(reportLedger(), false, false), ctx, evidenceObligations));
    expect(parsed.runProvenance).toBeDefined();
    expect(parsed.summary.scenarioReconciliations.total).toBe(2);
    expect(parsed).not.toHaveProperty("provenance");
  });
});

describe("[SCN-RMD-002] the ledger serialises under the top-level key ledger, beside summary", () => {
  it("carries the grid of Scenario Reconciliations under ledger — never evidenceReconciliation, never scenarios", () => {
    const parsed = JSON.parse(renderJson(__er(reportLedger()), ctx));
    expect(Array.isArray(parsed.ledger)).toBe(false);
    expect(Array.isArray(parsed.ledger.scenarioReconciliations)).toBe(true);
    expect(parsed.ledger.scenarioReconciliations).toHaveLength(2);
    expect(parsed.ledger.scenarioReconciliations[0].scnId).toBe("SCN-RMD-001");
    expect(parsed).not.toHaveProperty("evidenceReconciliation");
    expect(parsed).not.toHaveProperty("scenarios");
  });

  it("carries the ledger BESIDE summary — chain step 6: the summary has the totals and the ledger the detail", () => {
    const parsed = JSON.parse(renderJson(__er(reportLedger()), ctx));
    const keys = Object.keys(parsed);
    expect(keys).toContain("summary");
    expect(keys).toContain("ledger");
    expect(keys.indexOf("ledger")).toBeGreaterThan(keys.indexOf("summary"));
  });

  it("carries each account's posted evidence obligations and evidence observations alongside its reconciling items", () => {
    const feature = [
      "@AAA",
      "Feature: alpha",
      "",
      "  @unit @SCN-AAA-001",
      "  Scenario: a satisfied credit",
      "    Given a thing",
    ].join("\n");
    const credit = { scnId: "SCN-AAA-001", qualityCheck: "unit" as const, status: "passed" as const };
    const real = reconcile(parseScenarios(feature), [credit]);
    const parsed = JSON.parse(renderJson(__er(real), ctx));
    const account = parsed.ledger.scenarioReconciliations.find(
      (s: { scnId: string }) => s.scnId === "SCN-AAA-001"
    );
    expect(account.evidenceObligations).toEqual([{ qualityCheck: "unit" }]);
    expect(account.evidenceObservations).toEqual([credit]);
    expect(account.reconcilingItems).toEqual([]);
  });

  it("carries each quality check reconciliation's outcome field with the reconciliation-outcome literals", () => {
    const parsed = JSON.parse(renderJson(__er(reportLedger()), ctx));
    const outOfBalance = parsed.ledger.scenarioReconciliations.find(
      (s: { scnId: string }) => s.scnId === "SCN-RMD-002"
    );
    expect(outOfBalance.qualityCheckReconciliations[0].outcome).toBe("missing");
    expect(Object.keys(outOfBalance.qualityCheckReconciliations[0]).sort()).toEqual(
      ["evidenceObligation", "qualityCheck", "outcome"].sort()
    );
  });
});

describe("[SCN-RMD-003] the runtime-observation totals re-home onto summary; no evidenceObservations section", () => {
  const rmd003Scenarios: Scenario[] = [{ scnId: "SCN-RMD-001", evidenceObligations: [{ qualityCheck: "unit" }] }];
  const rmd003Observations: EvidenceObservation[] = [
    { qualityCheck: "unit", scnId: "SCN-RMD-001", status: "passed" },
    { qualityCheck: "unit", scnId: "SCN-RMD-001", status: "passed" },
    { qualityCheck: "unit", scnId: "SCN-RMD-001", status: "passed" },
    { qualityCheck: "unit", scnId: "SCN-RMD-001", status: "passed" },
    { qualityCheck: "unit", scnId: "SCN-PHX-999", status: "passed" },
    { qualityCheck: "integration", scnId: null, status: "passed" },
  ];
  let rmd003Balance: Ledger;
  beforeEach(() => {
    rmd003Balance = reconcile(rmd003Scenarios, rmd003Observations);
  });

  it("carries NO evidenceObservations section — the raw totals re-home onto summary", () => {
    const parsed = JSON.parse(renderJson(__er(rmd003Balance, true, false), ctx));
    expect(parsed).not.toHaveProperty("evidenceObservations");
    expect(parsed.summary.rawByRuntimeQualityCheck).toEqual({ unit: 5, integration: 1, e2e: 0, performance: 0 });
  });

  it("the phantom and suspense credits live on their ledger rows, not a section detail array", () => {
    const parsed = JSON.parse(renderJson(__er(rmd003Balance, true, false), ctx));
    const phantom = parsed.ledger.scenarioReconciliations.find((s: { kind: string }) => s.kind === "phantom-scenario");
    const suspense = parsed.ledger.scenarioReconciliations.find((s: { kind: string }) => s.kind === "suspense-scenario");
    expect(phantom.scnId).toBe("SCN-PHX-999");
    expect(suspense.evidenceObservations).toHaveLength(1);
    expect(parsed.summary.testVolume.onPhantomScenario).toBe(1);
    expect(parsed.summary.testVolume.onSuspenseScenario).toBe(1);
  });

  it("keeps the balancing identity: Σ rawByRuntimeQualityCheck = onScenario + onPhantomScenario + onSuspenseScenario (all summary folds)", () => {
    const parsed = JSON.parse(renderJson(__er(rmd003Balance, true, false), ctx));
    const raw = (Object.values(parsed.summary.rawByRuntimeQualityCheck) as number[]).reduce((a, b) => a + b, 0);
    const tv = parsed.summary.testVolume;
    expect(raw).toBe(tv.onScenario + tv.onPhantomScenario + tv.onSuspenseScenario);
  });

  it("omits summary.rawByRuntimeQualityCheck + testVolume when the runtime-observation axis is not in play", () => {
    const parsed = JSON.parse(renderJson(__er(rmd003Balance), ctx));
    expect(parsed).not.toHaveProperty("evidenceObservations");
    expect(parsed.summary).not.toHaveProperty("rawByRuntimeQualityCheck");
    expect(parsed.summary).not.toHaveProperty("testVolume");
  });
});

describe("[SCN-RMD-004] the static-check census is summary counts, no standalone section", () => {
  let staticChecksBalance: Ledger;
  beforeEach(() => {
    staticChecksBalance = reconcile(
      [{ scnId: "SCN-RMD-010", evidenceObligations: [{ qualityCheck: "fitness" }] }],
      [
        { qualityCheck: "fitness", staticCheck: "lint:foo", scnId: "SCN-RMD-010", exists: true, enforcedOverRealSource: true },
        { qualityCheck: "fitness", staticCheck: "lint:bar", exists: true, enforcedOverRealSource: true },
      ]
    );
  });

  it("carries NO standalone staticChecks (or guards) section — the census collapsed to summary counts", () => {
    const parsed = JSON.parse(renderJson(__er(staticChecksBalance, false, true), ctx, undefined, undefined));
    expect(parsed).not.toHaveProperty("staticChecks");
    expect(parsed).not.toHaveProperty("guards");
  });

  it("materialises the counts under summary.staticChecks ({ runningStaticCheckCount, uncitedStaticCheckCount })", () => {
    const parsed = JSON.parse(renderJson(__er(staticChecksBalance, false, true), ctx, undefined, undefined));
    expect(parsed.summary.staticChecks).toEqual({ runningStaticCheckCount: 2, uncitedStaticCheckCount: 1 });
  });
});
