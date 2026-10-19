import { expect } from "vitest";
import { renderMarkdown } from "../assemble/composers.js";
import { reconcile, summaryOf } from "../domain/evidenceReconciliation.js";
import type { EvidenceReconciliation } from "../domain/evidenceReconciliation.js";
import type { EvidenceObservation, Ledger, Scenario } from "../model.js";
import { CORE_MESSAGES, CoreMessage } from "./messages.js";
import { sampleReportCtx as ctx } from "./runContext.test-utils.js";

export function tallyBlockOf(scenarios: Scenario[]): (observations: EvidenceObservation[]) => string[] {
  return function tallyBlock(observations: EvidenceObservation[]): string[] {
    const ledger: Ledger = reconcile(scenarios, observations);
    const report: EvidenceReconciliation = { summary: summaryOf(ledger, false, false), ledger };
    const lines = renderMarkdown(report, ctx).split("\n");
    const start = lines.indexOf(CORE_MESSAGES[CoreMessage.ClaimReconciliationsHeading]);
    expect(start).toBeGreaterThan(0);
    const body = lines.slice(start + 2);
    return body.slice(0, body.indexOf(""));
  };
}
