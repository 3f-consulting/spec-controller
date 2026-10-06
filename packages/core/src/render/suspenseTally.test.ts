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

const scenarios: Scenario[] = [{ scnId: "SCN-LDG-007", evidenceObligations: [{ qualityCheck: "unit" }] }];
const known: EvidenceObservation = { qualityCheck: "unit", scnId: "SCN-LDG-007", status: "passed" };
const phantom: EvidenceObservation = { qualityCheck: "unit", scnId: "SCN-PHM-901", status: "passed", locator: "src/phm.test.ts" };

function uncitedCredit(locator: string): EvidenceObservation {
  return { qualityCheck: "unit", scnId: null, status: "passed", locator };
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

describe("[SCN-LDG-007] a credit citing no scenario is reported as a suspense-scenario reconciliation, out of balance", () => {
  it("states only the total when every credit cites a scenario", () => {
    expect(tallyBlock([known])).toEqual([`- ${CORE_MESSAGES[CoreMessage.ScenarioReconciliationTally](1, 1, 0)}`]);
  });

  it("follows the total with the suspense-scenario count when one credit cites no scenario", () => {
    expect(tallyBlock([known, uncitedCredit("src/a.test.ts")])).toEqual([
      `- ${CORE_MESSAGES[CoreMessage.ScenarioReconciliationTally](2, 1, 1)}`,
      `- ${CORE_MESSAGES[CoreMessage.SuspenseScenarioTally](1)}`,
    ]);
  });

  it("counts one suspense scenario however many credits cite no scenario, and places it after the phantom count", () => {
    expect(tallyBlock([known, phantom, uncitedCredit("src/a.test.ts"), uncitedCredit("src/b.test.ts")])).toEqual([
      `- ${CORE_MESSAGES[CoreMessage.ScenarioReconciliationTally](3, 1, 2)}`,
      `- ${CORE_MESSAGES[CoreMessage.PhantomScenarioTally](1)}`,
      `- ${CORE_MESSAGES[CoreMessage.SuspenseScenarioTally](1)}`,
    ]);
  });
});
