import { describe, it, expect, beforeEach } from "vitest";
import { renderJson } from "../assemble/composers.js";
import { renderMarkdown } from "../assemble/composers.js";
import { renderReportFromJson } from "../assemble/composers.js";
import type { Ledger, Scenario, EvidenceObservation } from "../model.js";
import type { RunContext } from "../domain/runProvenance.js";
import { reconcile } from "../domain/evidenceReconciliation.js";
import type { EvidenceObligations } from "../domain/corpusCounts.js";
import { __er } from "../evidenceReconciliation.test-utils.js";
import { CoreMessage } from "./messages.js";
import { coreMessage } from "./coreText.js";
import { outcomeDescription } from "./outcomeDescription.js";
import { HANDED_INPUT_NAMES, FEATURES, VITEST, PYTEST, JEST, JUNIT, RSPEC, CUCUMBER, CI, PACKAGE_JSON, CI_STEPS } from "../runInputs.test-utils.js";
import { publishedExitCodeOf } from "./publishedExitCodes.test-utils.js";
import { markdownHeading } from "./heading.js";
import { UNNAMED_CLAIM_ID } from "../domain/claimReconciliation.js";

const scenarios: Scenario[] = [
  { claimCode: "SCN-CHK-001", evidenceObligations: [{ qualityCheckKind: "unit" }] },
  { claimCode: "SCN-CHK-002", evidenceObligations: [{ qualityCheckKind: "integration" }] },
  { claimCode: "SCN-CHK-003", evidenceObligations: [{ qualityCheckKind: "fitness" }] },
];
const observations: EvidenceObservation[] = [
  { qualityCheckKind: "unit", claimCode: "SCN-CHK-001", status: "passed" },
  { qualityCheckKind: "unit", claimCode: "SCN-PHX-001", status: "passed" },
  { qualityCheckKind: "unit", claimCode: null, status: "passed", locator: "src/b.test.ts" },
  { qualityCheckKind: "fitness", fitnessFunction: "lint:foo", claimCode: "SCN-CHK-003", exists: true, enforcedOverRealSource: true },
  { qualityCheckKind: "fitness", fitnessFunction: "lint:bar", exists: true, enforcedOverRealSource: true },
];
let balance: Ledger;
beforeEach(() => {
  balance = reconcile(scenarios, observations);
});

const ctx: RunContext = {
  target: "roundtrip-fixture",
  inputs: [{ ...FEATURES, path: "tests/fixtures/roundtrip/features" }, VITEST, PYTEST, JEST, JUNIT, RSPEC, CUCUMBER, CI, PACKAGE_JSON, CI_STEPS],
  corpus: "tests/fixtures/roundtrip/features",
  runStart: new Date("2026-07-02T09:00:00.000Z"),
  sourceSha: null,
};

const evidenceObligations: EvidenceObligations = {
  rawClaimCodeOccurrences: 4,
  scenarioCount: 2,
  excludedOccurrences: 2,
  untaggedScenarios: [],
};

const featureNames = new Map([["CHK", "checkout"]]);

function byFeatureRowOf(md: string, code: string): string[] | undefined {
  const section = md.slice(md.indexOf(markdownHeading(3, coreMessage(CoreMessage.OutOfBalanceByFeatureHeading))));
  const end = section.indexOf("\n#", 1);
  return (end > 0 ? section.slice(0, end) : section)
    .split("\n")
    .filter((line) => line.startsWith("| "))
    .map((line) => line.split("|").slice(1, -1).map((cell) => cell.trim()))
    .find(([feature = ""]) => feature === code || feature.endsWith(` (${code})`));
}

describe("[SCN-RMD-007] the markdown regenerates from a saved spec-reconciliation.json alone", () => {
  it("regenerates markdown byte-identical to the direct render (drift-equality)", () => {
    const savedJson = renderJson(__er(balance, true), ctx, evidenceObligations, featureNames);
    const regenerated = renderReportFromJson(savedJson, HANDED_INPUT_NAMES, publishedExitCodeOf);
    const direct = renderMarkdown(__er(balance, true), ctx, publishedExitCodeOf, evidenceObligations, featureNames);
    expect(regenerated).toBe(direct);
  });

  it("names the coded out-of-balance feature in full from the JSON alone, as the direct render names it (the by-feature feature file teeth)", () => {
    const savedJson = renderJson(__er(balance, true), ctx, evidenceObligations, featureNames);
    const regenerated = renderReportFromJson(savedJson, HANDED_INPUT_NAMES, publishedExitCodeOf);
    const direct = renderMarkdown(__er(balance, true), ctx, publishedExitCodeOf, evidenceObligations, featureNames);
    const row = byFeatureRowOf(direct, "CHK");
    expect(row?.[0]).toMatch(/^.+ \(CHK\)$/);
    expect(byFeatureRowOf(regenerated, "CHK")).toEqual(row);
  });

  it("carries the whole document — the three-way evidence observations line and the materialised summary totals", () => {
    const savedJson = renderJson(__er(balance, true), ctx, evidenceObligations, featureNames);
    const regenerated = renderReportFromJson(savedJson, HANDED_INPUT_NAMES, publishedExitCodeOf);
    const citesNoScenario = outcomeDescription("cites-no-scenario");
    expect(regenerated).toContain(coreMessage(CoreMessage.EvidenceObservationsSum, { total: 5, onScenario: 2, onPhantomClaim: 1, onUnnamedClaim: 2 }));
    expect(regenerated).toContain("| fitness | 2 |");
    expect(regenerated).toContain(coreMessage(CoreMessage.UnnamedClaimTally, { count: 1, unnamedClaimId: UNNAMED_CLAIM_ID }));
    const unnamedClaimRow = regenerated.split("\n").find((line) => line.startsWith("| (unnamed claim) |"));
    expect(unnamedClaimRow).toContain(`unit: ${citesNoScenario} (src/b.test.ts)`);
    expect(unnamedClaimRow).toContain(`fitness: ${citesNoScenario}`);
    expect(unnamedClaimRow).toMatch(/fitness: [^;|]*\blint:bar\b/);
  });

  it("needs no RunContext — the JSON string alone reconstructs the report", () => {
    const savedJson = renderJson(__er(balance, true), ctx, evidenceObligations, featureNames);
    const regenerated = renderReportFromJson(savedJson, HANDED_INPUT_NAMES, publishedExitCodeOf);
    expect(regenerated).toContain("## Run provenance");
    expect(regenerated).toContain("- Target repo: roundtrip-fixture");
  });

  it("regenerates a non-strict report with a pending item exactly as it was rendered", () => {
    const er = __er(reconcile([{ claimCode: "SCN-P", evidenceObligations: [{ qualityCheckKind: "unit", pending: true }] }], []));
    const regenerated = renderReportFromJson(renderJson(er, ctx), HANDED_INPUT_NAMES, publishedExitCodeOf);
    expect(regenerated).toBe(renderMarkdown(er, ctx, publishedExitCodeOf));
  });
});
