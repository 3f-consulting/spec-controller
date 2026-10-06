import { describe, it, expect } from "vitest";
import { renderMarkdown } from "./markdown.js";
import { reconcile, summaryOf } from "../domain/evidenceReconciliation.js";
import type { EvidenceReconciliation } from "../domain/evidenceReconciliation.js";
import type { EvidenceObservation, Ledger, Scenario } from "../model.js";
import type { RunContext } from "../provenance/provenance.js";
import { CORE_MESSAGES, CoreMessage } from "../domain/messages.js";

const ctx: RunContext = {
  target: "an-adopters-repository",
  inputs: {
    features: "../an-adopters-repository/features",
    vitest: "../an-adopters-repository/vitest-report.json",
  },
  runStart: new Date("2026-06-27T08:17:53.000Z"),
  sourceSha: "905a987c0ffeeba110000000000000000deadbeef",
  toolSha: "13ee47f271ace511efdb2511276284b4cb50c247",
  toolVersion: "0.1.0",
};

const scenarios: Scenario[] = [{ scnId: "SCN-LDG-006", evidenceObligations: [{ qualityCheck: "unit" }] }];
const known: EvidenceObservation = { qualityCheck: "unit", scnId: "SCN-LDG-006", status: "passed" };

function phantomCredit(scnId: string): EvidenceObservation {
  return { qualityCheck: "unit", scnId, status: "passed", locator: `src/${scnId}.test.ts` };
}

function tallyBlock(observations: EvidenceObservation[]): string[] {
  const ledger: Ledger = reconcile(scenarios, observations);
  const report: EvidenceReconciliation = { summary: summaryOf(ledger, false, false), ledger };
  const lines = renderMarkdown(report, ctx).split("\n");
  const start = lines.indexOf(CORE_MESSAGES[CoreMessage.ScenarioReconciliationsHeading]);
  expect(start).toBeGreaterThan(0);
  const body = lines.slice(start + 2);
  return body.slice(0, body.indexOf(""));
}

describe("[SCN-LDG-006] a credit citing a scenario no feature carries is reported as a phantom-scenario reconciliation, out of balance", () => {
  it("states only the total when no credit cites an unknown scenario", () => {
    expect(tallyBlock([known])).toEqual([`- ${CORE_MESSAGES[CoreMessage.ScenarioReconciliationTally](1, 1, 0)}`]);
  });

  it("follows the total with the phantom-scenario count when one credit cites an unknown scenario", () => {
    expect(tallyBlock([known, phantomCredit("SCN-PHM-901")])).toEqual([
      `- ${CORE_MESSAGES[CoreMessage.ScenarioReconciliationTally](2, 1, 1)}`,
      `- ${CORE_MESSAGES[CoreMessage.PhantomScenarioTally](1)}`,
    ]);
  });

  it("counts each unknown scenario cited, two credits on two unknown codes giving 2", () => {
    expect(tallyBlock([known, phantomCredit("SCN-PHM-901"), phantomCredit("SCN-PHM-902")])).toEqual([
      `- ${CORE_MESSAGES[CoreMessage.ScenarioReconciliationTally](3, 1, 2)}`,
      `- ${CORE_MESSAGES[CoreMessage.PhantomScenarioTally](2)}`,
    ]);
  });
});
