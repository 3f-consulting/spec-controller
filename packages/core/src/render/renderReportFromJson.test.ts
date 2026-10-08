import { describe, it, expect } from "vitest";
import { renderJson } from "./json.js";
import { renderReportFromJson, renderMarkdown } from "./markdown.js";
import type { Ledger, Scenario, EvidenceObservation } from "../model.js";
import type { RunContext } from "../provenance/provenance.js";
import { reconcile } from "../domain/evidenceReconciliation.js";
import type { EvidenceObligations } from "../census/evidenceObligations.js";
import { __er } from "../evidenceReconciliation.testkit.js";

const scenarios: Scenario[] = [
  { scnId: "SCN-CHK-001", evidenceObligations: [{ qualityCheck: "unit" }] },
  { scnId: "SCN-CHK-002", evidenceObligations: [{ qualityCheck: "integration" }] },
  { scnId: "SCN-CHK-003", evidenceObligations: [{ qualityCheck: "fitness" }] },
];
const observations: EvidenceObservation[] = [
  { qualityCheck: "unit", scnId: "SCN-CHK-001", status: "passed" },
  { qualityCheck: "unit", scnId: "SCN-PHX-001", status: "passed" },
  { qualityCheck: "unit", scnId: null, status: "passed", locator: "src/b.test.ts" },
  { qualityCheck: "fitness", staticCheck: "lint:foo", scnId: "SCN-CHK-003", exists: true, enforcedOverRealSource: true },
  { qualityCheck: "fitness", staticCheck: "lint:bar", exists: true, enforcedOverRealSource: true },
];
const balance: Ledger = reconcile(scenarios, observations);

const ctx: RunContext = {
  target: "roundtrip-fixture",
  inputs: { features: "tests/fixtures/roundtrip/features" },
  runStart: new Date("2026-07-02T09:00:00.000Z"),
  sourceSha: null,
};

const evidenceObligations: EvidenceObligations = {
  rawScnOccurrences: 4,
  scenarioCount: 2,
  excludedOccurrences: 2,
  untaggedScenarios: [],
};

const featureNames = new Map([["CHK", "checkout"]]);

describe("[SCN-RMD-007] the markdown regenerates from a saved spec-reconciliation.json alone", () => {
  it("regenerates markdown byte-identical to the direct render (drift-equality)", () => {
    const savedJson = renderJson(__er(balance, true, true), ctx, evidenceObligations, featureNames);
    const regenerated = renderReportFromJson(savedJson);
    const direct = renderMarkdown(__er(balance, true, true), ctx, evidenceObligations, featureNames);
    expect(regenerated).toBe(direct);
  });

  it("names the coded out-of-balance feature in full from the JSON alone (the by-feature title teeth)", () => {
    const savedJson = renderJson(__er(balance, true, true), ctx, evidenceObligations, featureNames);
    const regenerated = renderReportFromJson(savedJson);
    expect(regenerated).toContain("| checkout (CHK) | 1 | SCN-CHK-002 |");
  });

  it("carries the whole document — the three-way test-volume line and the materialised summary totals", () => {
    const savedJson = renderJson(__er(balance, true, true), ctx, evidenceObligations, featureNames);
    const regenerated = renderReportFromJson(savedJson);
    expect(regenerated).toContain("3 evidence observations = 1 on scenarios + 1 on phantom scenarios + 1 on the suspense scenario.");
    expect(regenerated).toContain("2 static check(s) run, 1 uncited static check(s).");
    expect(regenerated).toContain('1 suspense-scenario(s): credits citing no scenario, aggregated into "(no scenario)".');
    expect(regenerated).toContain("fitness ❓ Evidence Observation cites no Scenario (lint:bar)");
    expect(regenerated).toContain("unit ❓ Evidence Observation cites no Scenario (src/b.test.ts)");
  });

  it("needs no RunContext — the JSON string alone reconstructs the report", () => {
    const savedJson = renderJson(__er(balance, true, true), ctx, evidenceObligations, featureNames);
    const regenerated = renderReportFromJson(savedJson);
    expect(regenerated).toContain("## Run provenance");
    expect(regenerated).toContain("- Target repo: roundtrip-fixture");
  });
});
