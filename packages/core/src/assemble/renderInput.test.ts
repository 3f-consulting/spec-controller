import { describe, it, expect, beforeEach } from "vitest";
import { assembleRenderInput } from "./renderInput.js";
import { evidenceReconciliationFromSources } from "./evidenceReconciliationFromSources.js";
import { renderJson } from "./composers.js";
import { parseScenarios } from "../parse/scenarioReaders.test-utils.js";
import { reconcile } from "../domain/evidenceReconciliation.js";
import { isBalanced } from "../domain/ledger.js";
import type { Ledger } from "../model.js";
import { untaggedScenarioId, type EvidenceObligations } from "../domain/corpusCounts.js";
import type { EvidenceObservation, Scenario } from "../model.js";
import { reportCtx as ctx } from "./runContext.test-utils.js";
import { reportLedger } from "./renderInput.test-utils.js";
import { parsedFeatures } from "../parse/parsedFeatures.test-utils.js";
import { parsedWorkflows } from "../parse/parsedWorkflows.test-utils.js";
import { __er, heldObservationsOf, unitTestsAndLintCi } from "../evidenceReconciliation.test-utils.js";
import { corpusCountsOfFeatures } from "../parse/scenarios.js";
import { everyOutcomeCorpusJson } from "./everyOutcomeCorpus.test-utils.js";

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
      packageJson: {},
      ciWorkflows: [],
      behaviouralObservations: [],
      deferralTags: [],
    });
    const report = assembleRenderInput(judged, ctx, evidenceObligations, new Map([["ONE", "one"]])) as unknown as Record<
      string,
      unknown
    >;
    expect(Object.keys(report)).toEqual([
      "runProvenance",
      "scenarioCodes",
      "summary",
      "ledger",
    ]);
    expect(report).not.toHaveProperty("metadata");
    expect(report.scenarioCodes).toEqual({
      featureFiles: 2,
      featureCodes: 1,
      excludedOccurrences: 3,
      untaggedScenarios: [],
    });
    expect(report).not.toHaveProperty("warnings");
  });

  it("states each fact once: the faults only under errors and the corpus's facts only under scenarioCodes", () => {
    const features = parsedFeatures(
      [
        "Feature: uncoded\n\n  @unit @SCN-FIX-001\n  Scenario: one\n    Given a thing\n\n  @unit @SCN-FIX-001\n  Scenario: two\n    Given a thing\n",
      ],
      ["uncoded.feature"]
    );
    const judged = evidenceReconciliationFromSources({
      features,
      packageJson: {
        scripts: { test: "vitest run", lint: "eslint ." },
        specController: {
          runners: { unit: "vitest", lint: "eslint" },
          notChecks: ["ci.yml:quality:Checkout", "ci.yml:quality:Install", "ci.yml:quality:Deploy"],
          deferralTags: { a: 1 },
          zzz: true,
        },
      } as Parameters<typeof evidenceReconciliationFromSources>[0]["packageJson"],
      ciWorkflows: parsedWorkflows([unitTestsAndLintCi], ["ci.yml"]),
      behaviouralObservations: [],
      deferralTags: [],
    });
    const report = assembleRenderInput(judged, ctx, corpusCountsOfFeatures(features)) as unknown as Record<
      string,
      unknown
    >;
    const errors = report.errors as { scenarioCodes: unknown; configuration: Record<string, unknown> };
    expect(Object.keys(errors)).toEqual(["scenarioCodes", "configuration"]);
    expect(Object.keys(errors.configuration)).toEqual([
      "keysNotRead",
      "ofWrongKind",
      "runnerKeysNotATier",
      "nonChecksMatchingNoStep",
    ]);
    expect(report.scenarioCodes).toHaveProperty("sharedScnCodes");
    for (const oldPlace of ["scenarioCodeErrors", "scenarioCodePopulation", "evidenceObligations"]) {
      expect(report).not.toHaveProperty(oldPlace);
    }
    for (const oldPlace of [
      "configurationKeysNotRead",
      "configurationOfWrongKind",
      "runnerKeysNotATier",
      "nonChecksMatchingNoStep",
    ]) {
      expect(report.summary).not.toHaveProperty(oldPlace);
    }
  });

  it("renames the provenance section to runProvenance carrying the run facts", () => {
    const report = assembleRenderInput(__er(reportLedger()), ctx);
    expect(report.runProvenance.target).toBe("an-adopters-repository");
    expect(report.runProvenance.sourceSha).toBe("905a987c0ffeeba110000000000000000deadbeef");
    expect(report.runProvenance.runTimestamp).toBe("2026-07-02T08:17:53Z");
  });

  it("materialises the summary totals from the balance", () => {
    const report = assembleRenderInput(__er(reportLedger()), ctx);
    const { claimReconciliations, qualityCheckReconciliations } = report.summary.evidenceReconciliation;
    expect(claimReconciliations).toEqual({ total: 2, balanced: 1, outOfBalance: 1, phantomClaim: 0, unnamedClaim: 0 });
    expect(qualityCheckReconciliations.total).toBe(3);
    expect(qualityCheckReconciliations.outOfBalance).toBe(2);
    expect(qualityCheckReconciliations.byOutcome["satisfied"]).toBe(1);
    expect(qualityCheckReconciliations.byOutcome["missing"]).toBe(2);
    expect(qualityCheckReconciliations.missingByQualityCheck).toEqual([
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
    const t = report.summary.evidenceReconciliation.claimReconciliations;
    expect(t).toEqual({
      total: 4,
      balanced: 2,
      outOfBalance: 2,
      phantomClaim: 1,
      unnamedClaim: 1,
    });
    expect(t.total - t.phantomClaim - t.unnamedClaim).toBe(2);
    expect(isBalanced(ledgerWithPhantomClaimRow)).toBe(false);
  });

  it("states each summary total once: under evidenceReconciliation and evidenceObservations, and at none of their old places", () => {
    const summary = (JSON.parse(everyOutcomeCorpusJson()) as { readonly summary: Record<string, unknown> }).summary;
    expect(summary).toHaveProperty("evidenceReconciliation");
    expect(summary).toHaveProperty("evidenceObservations");
    for (const oldPlace of [
      "claimReconciliations",
      "qualityCheckReconciliations",
      "pending",
      "testVolume",
      "rawByBehaviouralQualityCheck",
      "fitnessFunctions",
      "behaviouralRunners",
    ]) {
      expect(summary).not.toHaveProperty(oldPlace);
    }
  });
});

describe("[SCN-RMD-002] the ledger serialises under the top-level key ledger, beside summary, each Claim Reconciliation carrying its claim, kind, verdict, Quality Check Reconciliations and pending items and nothing else", () => {
  it("writes every row of the every-outcome corpus's ledger with exactly its claim, kind, verdict, Quality Check Reconciliations and pending items", () => {
    const parsed = JSON.parse(everyOutcomeCorpusJson()) as {
      readonly summary: unknown;
      readonly ledger: { readonly claimReconciliations: readonly Record<string, unknown>[] };
    };
    const rows = parsed.ledger.claimReconciliations;

    expect(parsed).toHaveProperty("summary");
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(Object.keys(row)).toEqual(["claim", "kind", "verdict", "qualityCheckReconciliations", "pendingItems"]);
    }
  });
});

describe("[SCN-RMD-020] each Claim Reconciliation names the claim it reconciles", () => {
  it("names a scenario by its @SCN, a phantom claim by its cited code, the unnamed claim, and a scenario with no @SCN by its feature and title", () => {
    const feature = [
      "@AAA",
      "Feature: alpha",
      "",
      "  @unit @SCN-AAA-001",
      "  Scenario: a tagged scenario",
      "    Given a thing",
    ].join("\n");
    const ledger = reconcile(
      parseScenarios(feature),
      [
        { qualityCheck: "unit", scnId: "SCN-AAA-001", status: "passed" },
        { qualityCheck: "unit", scnId: "SCN-PHM-999", status: "passed" },
        { qualityCheck: "unit", scnId: null, status: "passed" },
      ],
      [untaggedScenarioId({ feature: "alpha.feature", scenario: "an untagged scenario" })]
    );
    const rows: Record<string, unknown>[] = JSON.parse(renderJson(__er(ledger), ctx)).ledger.claimReconciliations;
    expect(rows.map((row) => [row.kind, row.claim])).toEqual([
      ["scenario", "SCN-AAA-001"],
      ["phantom-claim", "SCN-PHM-999"],
      ["unnamed-claim", "(unnamed claim)"],
      ["scenario", "alpha.feature : an untagged scenario"],
    ]);
    for (const row of rows) expect(row).not.toHaveProperty("scnId");
  });
});

describe("[SCN-RMD-003] the summary's evidence observations count each of the five quality checks', fitness included, by the kind of claim each posts to, and their total is the five counts' sum", () => {
  const rmd003Scenarios: Scenario[] = [
    { scnId: "SCN-RMD-001", evidenceObligations: [{ qualityCheck: "unit" }, { qualityCheck: "integration" }] },
    { scnId: "SCN-RMD-010", evidenceObligations: [{ qualityCheck: "fitness" }] },
    { scnId: "SCN-RMD-011", evidenceObligations: [{ qualityCheck: "fitness" }] },
  ];
  const rmd003Observations: EvidenceObservation[] = [
    { qualityCheck: "unit", scnId: "SCN-RMD-001", status: "passed" },
    { qualityCheck: "unit", scnId: "SCN-RMD-001", status: "passed" },
    { qualityCheck: "unit", scnId: "SCN-RMD-001", status: "failed", broken: true, locator: "src/rmd.test.ts" },
    { qualityCheck: "integration", scnId: "SCN-RMD-001", status: "passed" },
    { qualityCheck: "unit", scnId: "SCN-PHX-999", status: "passed" },
    { qualityCheck: "integration", scnId: null, status: "passed" },
    { qualityCheck: "fitness", fitnessFunction: "lint:foo", scnId: "SCN-RMD-010", exists: true, enforcedOverRealSource: true },
    { qualityCheck: "fitness", fitnessFunction: "lint:bar", scnId: "SCN-RMD-011", exists: true, enforcedOverRealSource: false },
    { qualityCheck: "fitness", fitnessFunction: "lint:qux", scnId: "SCN-RMD-011", exists: false, enforcedOverRealSource: false },
    {
      qualityCheck: "fitness",
      fitnessFunction: "lint:quux",
      scnId: "SCN-RMD-010",
      exists: true,
      enforcedOverRealSource: true,
      broken: true,
      locator: ".github/workflows/ci.yml",
    },
    { qualityCheck: "fitness", fitnessFunction: "lint:baz", exists: true, enforcedOverRealSource: true },
  ];
  const evidenceObservations = {
    total: 9,
    onScenario: 6,
    onPhantomClaim: 1,
    onUnnamedClaim: 2,
    byQualityCheck: [
      { qualityCheck: "unit", count: 4 },
      { qualityCheck: "integration", count: 2 },
      { qualityCheck: "e2e", count: 0 },
      { qualityCheck: "performance", count: 0 },
      { qualityCheck: "fitness", count: 3 },
    ],
  };
  let rmd003Balance: Ledger;
  beforeEach(() => {
    rmd003Balance = reconcile(rmd003Scenarios, rmd003Observations);
  });

  it("states the evidence observations under the summary: a broken behavioural one counted, and each fitness function that ran", () => {
    const report = assembleRenderInput(__er(rmd003Balance, true), ctx);
    expect(report.summary.evidenceObservations).toEqual(evidenceObservations);
  });

  it("carries them on the persisted file, where the total is the sum of the five counts and of the counts on each kind of claim", () => {
    const parsed = JSON.parse(renderJson(__er(rmd003Balance, true), ctx));
    const persisted = parsed.summary.evidenceObservations;
    expect(persisted).toEqual(evidenceObservations);
    expect(parsed).not.toHaveProperty("evidenceObservations");
    expect(persisted.byQualityCheck.reduce((n: number, { count }: { count: number }) => n + count, 0)).toBe(persisted.total);
    expect(persisted.onScenario + persisted.onPhantomClaim + persisted.onUnnamedClaim).toBe(persisted.total);
  });

  it("counts the phantom claim's and the unnamed claim's evidence observations where their ledger rows hold them", () => {
    const parsed = JSON.parse(renderJson(__er(rmd003Balance, true), ctx));
    const phantomClaimRow = parsed.ledger.claimReconciliations.find((s: { kind: string }) => s.kind === "phantom-claim");
    const unnamedClaimRow = parsed.ledger.claimReconciliations.find((s: { kind: string }) => s.kind === "unnamed-claim");
    expect(phantomClaimRow.claim).toBe("SCN-PHX-999");
    expect(heldObservationsOf(unnamedClaimRow)).toHaveLength(2);
    expect(parsed.summary.evidenceObservations.onPhantomClaim).toBe(1);
    expect(parsed.summary.evidenceObservations.onUnnamedClaim).toBe(2);
  });

  it("states them when the summary is asked for evidence observations, and not when it is not", () => {
    expect(assembleRenderInput(__er(rmd003Balance, true), ctx).summary.evidenceObservations).toEqual(evidenceObservations);
    expect(assembleRenderInput(__er(rmd003Balance, false), ctx).summary).not.toHaveProperty("evidenceObservations");
  });
});
