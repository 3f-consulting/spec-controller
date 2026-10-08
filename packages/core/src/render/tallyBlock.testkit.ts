import { expect } from "vitest";
import { renderMarkdown } from "./markdown.js";
import { reconcile, summaryOf } from "../domain/evidenceReconciliation.js";
import type { EvidenceReconciliation } from "../domain/evidenceReconciliation.js";
import type { EvidenceObservation, Ledger, Scenario } from "../model.js";
import { CORE_MESSAGES, CoreMessage } from "../domain/messages.js";
import { adopterReportCtx as ctx } from "./runContext.testkit.js";

export function tallyBlockOf(scenarios: Scenario[]): (observations: EvidenceObservation[]) => string[] {
  return function tallyBlock(observations: EvidenceObservation[]): string[] {
    const ledger: Ledger = reconcile(scenarios, observations);
    const report: EvidenceReconciliation = { summary: summaryOf(ledger, false, false), ledger };
    const lines = renderMarkdown(report, ctx).split("\n");
    const start = lines.indexOf(CORE_MESSAGES[CoreMessage.ScenarioReconciliationsHeading]);
    expect(start).toBeGreaterThan(0);
    const body = lines.slice(start + 2);
    return body.slice(0, body.indexOf(""));
  };
}
