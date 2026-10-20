import { describe, it, expect, beforeEach } from "vitest";
import { assembleRenderInput } from "./renderInput.js";
import { evidenceReconciliationFromSources } from "./evidenceReconciliationFromSources.js";
import { renderJson } from "./composers.js";
import { parseScenarios } from "../parse/scenarioReaders.test-utils.js";
import { reconcile } from "../domain/evidenceReconciliation.js";
import { isBalanced } from "../domain/ledger.js";
import type { Ledger } from "../model.js";
import type { EvidenceObligations } from "../domain/corpusCounts.js";
import type { EvidenceObservation, Scenario } from "../model.js";
import { reportCtx as ctx } from "./runContext.test-utils.js";
import { reportLedger } from "./renderInput.test-utils.js";
import { __er } from "../evidenceReconciliation.test-utils.js";
import { parsedFeatures } from "../parse/parsedFeatures.test-utils.js";

const evidenceObligations: EvidenceObligations = {
  rawScnOccurrences: 10,
  scenarioCount: 7,
  excludedOccurrences: 3,
  untaggedScenarios: [],
};

describe("[SCN-RMD-001] assembleRenderInput builds one whole-document report model", () => {
  it("carries the sections as top-level keys in document order", () => {
    const judged = evidenceReconciliationFromSources({
      features: parsedFeatures(
        ["@ONE\nFeature: one\n\n  @unit @SCN-ONE-001\n  Scenario: s\n    Given a thing\n", "Feature: plain\n"],
        ["one.feature", "plain.feature"]
      ),
      untaggedScenarios: [],
      packageJson: {},
      ciWorkflows: [],
      behaviouralObservations: [],
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
    expect(report.summary.claimReconciliations).toEqual({ total: 2, balanced: 1, outOfBalance: 1, phantomClaim: 0, unnamedClaim: 0 });
    expect(report.summary.qualityCheckReconciliations.total).toBe(3);
    expect(report.summary.qualityCheckReconciliations.outOfBalance).toBe(2);
    expect(report.summary.qualityCheckReconciliations.byOutcome["satisfied"]).toBe(1);
    expect(report.summary.qualityCheckReconciliations.byOutcome["missing"]).toBe(2);
    expect(report.summary.qualityCheckReconciliations.missingByQualityCheck).toEqual([
      { subject: "unit", count: 1 },
      { subject: "integration", count: 1 },
    ]);
    expect(report.summary).not.toHaveProperty("evidenceObligations");
  });

  const twoBalancedScenarios: Scenario[] = [
    { scnId: "SCN-TGT-001", evidenceObligations: [{ qualityCheck: "unit" }] },
    { scnId: "SCN-TGT-002", evidenceObligations: [{ qualityCheck: "unit" }] },
  ];
  const twoPassingTestsAndAnUncitedCheck: EvidenceObservation[] = [
    { qualityCheck: "unit", scnId: "SCN-TGT-001", status: "passed" },
    { qualityCheck: "unit", scnId: "SCN-TGT-002", status: "passed" },
    { qualityCheck: "fitness", fitnessFunction: "guard:static", exists: true, enforcedOverRealSource: true },
  ];

  it("counts the phantom claim's reconciliation in the summary totals too — a phantom claim is out-of-balance, not a bucket apart", () => {
    const ledgerWithPhantomClaimRow: Ledger = reconcile(twoBalancedScenarios, [
      ...twoPassingTestsAndAnUncitedCheck,
      { qualityCheck: "unit", scnId: "SCN-PHM-999", status: "passed" },
    ]);
    const report = assembleRenderInput(__er(ledgerWithPhantomClaimRow), ctx);
    expect(report.summary.claimReconciliations).toEqual({
      total: 4,
      balanced: 2,
      outOfBalance: 2,
      phantomClaim: 1,
      unnamedClaim: 1,
    });
    const t = report.summary.claimReconciliations;
    expect(t.total - t.phantomClaim - t.unnamedClaim).toBe(2);
    expect(isBalanced(ledgerWithPhantomClaimRow)).toBe(false);
  });
});

describe("[SCN-RMD-002] the ledger serialises under the top-level key ledger, beside summary", () => {

  it("carries each account's posted evidence obligations and evidence observations alongside its reconciling items", () => {
    const feature = [
      "@AAA",
      "Feature: alpha",
      "",
      "  @unit @SCN-AAA-001",
      "  Scenario: a satisfied evidence observation",
      "    Given a thing",
    ].join("\n");
    const observation = { scnId: "SCN-AAA-001", qualityCheck: "unit" as const, status: "passed" as const };
    const real = reconcile(parseScenarios(feature), [observation]);
    const parsed = JSON.parse(renderJson(__er(real), ctx));
    const account = parsed.ledger.claimReconciliations.find(
      (s: { scnId: string }) => s.scnId === "SCN-AAA-001"
    );
    expect(account.evidenceObligations).toEqual([{ qualityCheck: "unit" }]);
    expect(account.evidenceObservations).toEqual([observation]);
    expect(account.reconcilingItems).toEqual([]);
  });
});

describe("[SCN-RMD-003] the behavioural-observation totals re-home onto summary; no evidenceObservations section", () => {
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
    expect(parsed.summary.rawByBehaviouralQualityCheck).toEqual({ unit: 5, integration: 1, e2e: 0, performance: 0 });
    expect(Object.keys(parsed.summary).filter((key) => key.startsWith("rawBy"))).toEqual(["rawByBehaviouralQualityCheck"]);
  });

  it("the phantom claim's and the unnamed claim's evidence observations live on their ledger rows, not a section detail array", () => {
    const parsed = JSON.parse(renderJson(__er(rmd003Balance, true, false), ctx));
    const phantomClaimRow = parsed.ledger.claimReconciliations.find((s: { kind: string }) => s.kind === "phantom-claim");
    const unnamedClaimRow = parsed.ledger.claimReconciliations.find((s: { kind: string }) => s.kind === "unnamed-claim");
    expect(phantomClaimRow.scnId).toBe("SCN-PHX-999");
    expect(unnamedClaimRow.evidenceObservations).toHaveLength(1);
    expect(parsed.summary.testVolume.onPhantomClaim).toBe(1);
    expect(parsed.summary.testVolume.onUnnamedClaim).toBe(1);
  });
});

describe("[SCN-RMD-004] the fitness-function census is summary counts, no standalone section", () => {
  let fitnessFunctionsBalance: Ledger;
  beforeEach(() => {
    fitnessFunctionsBalance = reconcile(
      [{ scnId: "SCN-RMD-010", evidenceObligations: [{ qualityCheck: "fitness" }] }],
      [
        { qualityCheck: "fitness", fitnessFunction: "lint:foo", scnId: "SCN-RMD-010", exists: true, enforcedOverRealSource: true },
        { qualityCheck: "fitness", fitnessFunction: "lint:bar", exists: true, enforcedOverRealSource: true },
      ]
    );
  });

  it("materialises the counts under summary.fitnessFunctions ({ runningFitnessFunctionCount, uncitedFitnessFunctionCount })", () => {
    const parsed = JSON.parse(renderJson(__er(fitnessFunctionsBalance, false, true), ctx, undefined, undefined));
    expect(parsed.summary.fitnessFunctions).toEqual({ runningFitnessFunctionCount: 2, uncitedFitnessFunctionCount: 1 });
  });
});
