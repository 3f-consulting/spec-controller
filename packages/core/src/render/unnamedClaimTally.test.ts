import { describe, it, expect } from "vitest";
import type { EvidenceObservation, Ledger, Scenario } from "../model.js";
import { renderMarkdown } from "../assemble/composers.js";
import { reconcile, summaryOf } from "../domain/evidenceReconciliation.js";
import type { EvidenceReconciliation } from "../domain/evidenceReconciliation.js";
import { CORE_MESSAGES, CoreMessage } from "./messages.js";
import { sampleReportCtx as ctx } from "./runContext.test-utils.js";
import { publishedExitCodeOf } from "./publishedExitCodes.test-utils.js";

function tallyBlockOf(scenarios: Scenario[]): (observations: EvidenceObservation[]) => string[] {
  return function tallyBlock(observations: EvidenceObservation[]): string[] {
    const ledger: Ledger = reconcile(scenarios, observations);
    const report: EvidenceReconciliation = { summary: summaryOf(ledger, false), ledger };
    const lines = renderMarkdown(report, ctx, publishedExitCodeOf).split("\n");
    const start = lines.indexOf(CORE_MESSAGES[CoreMessage.ClaimReconciliationsHeading]);
    expect(start).toBeGreaterThan(0);
    const body = lines.slice(start + 2);
    return body.slice(0, body.indexOf(""));
  };
}

const scenarios: Scenario[] = [{ scnId: "SCN-AAA-001", evidenceObligations: [{ qualityCheckKind: "unit" }] }];
const known: EvidenceObservation = { qualityCheckKind: "unit", scnId: "SCN-AAA-001", status: "passed" };
const phantomClaimObservation: EvidenceObservation = { qualityCheckKind: "unit", scnId: "SCN-PHM-901", status: "passed", locator: "src/phm.test.ts" };

function uncitedObservation(locator: string): EvidenceObservation {
  return { qualityCheckKind: "unit", scnId: null, status: "passed", locator };
}

const tallyBlock = (observations: EvidenceObservation[]): string[] => tallyBlockOf(scenarios)(observations);

describe('[SCN-RPT-024] the verdict tally names the collection "Claim Reconciliation(s)" and counts every row: scenario, phantom claim and unnamed claim', () => {
  it("states only the total when every evidence observation cites a scenario", () => {
    expect(tallyBlock([known])).toEqual([`- ${CORE_MESSAGES[CoreMessage.ClaimReconciliationTally](1, 1, 0)}`]);
  });

  it("follows the total with the unnamed claim's count when one evidence observation cites no scenario", () => {
    expect(tallyBlock([known, uncitedObservation("src/a.test.ts")])).toEqual([
      `- ${CORE_MESSAGES[CoreMessage.ClaimReconciliationTally](2, 1, 1)}`,
      `- ${CORE_MESSAGES[CoreMessage.UnnamedClaimTally](1)}`,
    ]);
  });

  it("counts the real, phantom claims' and unnamed claim's rows in the total, then the phantom claims' count, then the unnamed claim's one row however many evidence observations cite no scenario", () => {
    expect(tallyBlock([known, phantomClaimObservation, uncitedObservation("src/a.test.ts"), uncitedObservation("src/b.test.ts")])).toEqual([
      `- ${CORE_MESSAGES[CoreMessage.ClaimReconciliationTally](3, 1, 2)}`,
      `- ${CORE_MESSAGES[CoreMessage.PhantomClaimTally](1)}`,
      `- ${CORE_MESSAGES[CoreMessage.UnnamedClaimTally](1)}`,
    ]);
  });
});
