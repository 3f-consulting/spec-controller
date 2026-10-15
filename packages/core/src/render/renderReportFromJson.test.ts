import { describe, it, expect, beforeEach } from "vitest";
import { renderJson } from "../assemble/composers.js";
import { renderMarkdown } from "../assemble/composers.js";
import { renderReportFromJson } from "./markdown.js";
import type { Ledger, Scenario, EvidenceObservation } from "../model.js";
import type { RunContext } from "../domain/runProvenance.js";
import { reconcile } from "../domain/evidenceReconciliation.js";
import type { EvidenceObligations } from "../domain/corpusCounts.js";
import { __er } from "../evidenceReconciliation.test-utils.js";
import { CORE_MESSAGES, CoreMessage } from "./messages.js";
import { OUTCOME_DESCRIPTION } from "./outcomeDescription.js";

const scenarios: Scenario[] = [
  { scnId: "SCN-CHK-001", evidenceObligations: [{ qualityCheck: "unit" }] },
  { scnId: "SCN-CHK-002", evidenceObligations: [{ qualityCheck: "integration" }] },
  { scnId: "SCN-CHK-003", evidenceObligations: [{ qualityCheck: "fitness" }] },
];
const observations: EvidenceObservation[] = [
  { qualityCheck: "unit", scnId: "SCN-CHK-001", status: "passed" },
  { qualityCheck: "unit", scnId: "SCN-PHX-001", status: "passed" },
  { qualityCheck: "unit", scnId: null, status: "passed", locator: "src/b.test.ts" },
  { qualityCheck: "fitness", fitnessFunction: "lint:foo", scnId: "SCN-CHK-003", exists: true, enforcedOverRealSource: true },
  { qualityCheck: "fitness", fitnessFunction: "lint:bar", exists: true, enforcedOverRealSource: true },
];
let balance: Ledger;
beforeEach(() => {
  balance = reconcile(scenarios, observations);
});

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
    const citesNoScenario = OUTCOME_DESCRIPTION["cites-no-scenario"];
    expect(regenerated).toContain(CORE_MESSAGES[CoreMessage.TestVolumeSum](3, 1, 1, 1));
    expect(regenerated).toContain("2 fitness function(s) run, 1 uncited fitness function(s).");
    expect(regenerated).toContain(CORE_MESSAGES[CoreMessage.SuspenseScenarioTally](1));
    const suspenseRow = regenerated.split("\n").find((line) => line.startsWith("| (no scenario) |"));
    expect(suspenseRow).toContain(`unit ❓ ${citesNoScenario} (src/b.test.ts)`);
    expect(suspenseRow).toContain(`fitness ❓ ${citesNoScenario}`);
    expect(suspenseRow).toMatch(/fitness ❓ [^;|]*\blint:bar\b/);
  });

  it("needs no RunContext — the JSON string alone reconstructs the report", () => {
    const savedJson = renderJson(__er(balance, true, true), ctx, evidenceObligations, featureNames);
    const regenerated = renderReportFromJson(savedJson);
    expect(regenerated).toContain("## Run provenance");
    expect(regenerated).toContain("- Target repo: roundtrip-fixture");
  });
});
