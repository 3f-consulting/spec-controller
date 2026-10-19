import { describe, it, expect } from "vitest";
import type { EvidenceObservation, Scenario } from "../model.js";
import { tallyBlockOf } from "./tallyBlock.test-utils.js";

const scenarios: Scenario[] = [{ scnId: "SCN-AAA-001", evidenceObligations: [{ qualityCheck: "unit" }] }];
const known: EvidenceObservation = { qualityCheck: "unit", scnId: "SCN-AAA-001", status: "passed" };
const phantomClaimObservation: EvidenceObservation = { qualityCheck: "unit", scnId: "SCN-PHM-901", status: "passed", locator: "src/phm.test.ts" };

function uncitedObservation(locator: string): EvidenceObservation {
  return { qualityCheck: "unit", scnId: null, status: "passed", locator };
}

const tallyBlock = (observations: EvidenceObservation[]): string[] => tallyBlockOf(scenarios)(observations);

describe('[SCN-RPT-024] the verdict tally names the collection "Claim Reconciliation(s)" and counts every row: scenario, phantom claim and unnamed claim', () => {
  it("states only the total when every evidence observation cites a scenario", () => {
    expect(tallyBlock([known])).toEqual(["- 1 Claim Reconciliation(s): 1 balanced, 0 out-of-balance."]);
  });

  it("follows the total with the unnamed claim's count when one evidence observation cites no scenario", () => {
    expect(tallyBlock([known, uncitedObservation("src/a.test.ts")])).toEqual([
      "- 2 Claim Reconciliation(s): 1 balanced, 1 out-of-balance.",
      '- 1 Claim Reconciliation(s) for evidence observations citing no scenario, aggregated into "(unnamed claim)".',
    ]);
  });

  it("counts the real, phantom claims' and unnamed claim's rows in the total, then the phantom claims' count, then the unnamed claim's one row however many evidence observations cite no scenario", () => {
    expect(tallyBlock([known, phantomClaimObservation, uncitedObservation("src/a.test.ts"), uncitedObservation("src/b.test.ts")])).toEqual([
      "- 3 Claim Reconciliation(s): 1 balanced, 2 out-of-balance.",
      "- 1 Claim Reconciliation(s) for cited scenario ids with no real scenario.",
      '- 1 Claim Reconciliation(s) for evidence observations citing no scenario, aggregated into "(unnamed claim)".',
    ]);
  });
});
