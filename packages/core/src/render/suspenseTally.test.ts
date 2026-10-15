import { describe, it, expect } from "vitest";
import type { EvidenceObservation, Scenario } from "../model.js";
import { CORE_MESSAGES, CoreMessage } from "./messages.js";
import { tallyBlockOf } from "./tallyBlock.test-utils.js";

const scenarios: Scenario[] = [{ scnId: "SCN-LDG-007", evidenceObligations: [{ qualityCheck: "unit" }] }];
const known: EvidenceObservation = { qualityCheck: "unit", scnId: "SCN-LDG-007", status: "passed" };
const phantom: EvidenceObservation = { qualityCheck: "unit", scnId: "SCN-PHM-901", status: "passed", locator: "src/phm.test.ts" };

function uncitedObservation(locator: string): EvidenceObservation {
  return { qualityCheck: "unit", scnId: null, status: "passed", locator };
}

const tallyBlock = (observations: EvidenceObservation[]): string[] => tallyBlockOf(scenarios)(observations);

describe("[SCN-RPT-024] an evidence observation citing no scenario is reported as a suspense-scenario reconciliation, out of balance", () => {
  it("states only the total when every evidence observation cites a scenario", () => {
    expect(tallyBlock([known])).toEqual([`- ${CORE_MESSAGES[CoreMessage.ScenarioReconciliationTally](1, 1, 0)}`]);
  });

  it("follows the total with the suspense-scenario count when one evidence observation cites no scenario", () => {
    expect(tallyBlock([known, uncitedObservation("src/a.test.ts")])).toEqual([
      `- ${CORE_MESSAGES[CoreMessage.ScenarioReconciliationTally](2, 1, 1)}`,
      `- ${CORE_MESSAGES[CoreMessage.SuspenseScenarioTally](1)}`,
    ]);
  });

  it("counts one suspense scenario however many evidence observations cite no scenario, and places it after the phantom count", () => {
    expect(tallyBlock([known, phantom, uncitedObservation("src/a.test.ts"), uncitedObservation("src/b.test.ts")])).toEqual([
      `- ${CORE_MESSAGES[CoreMessage.ScenarioReconciliationTally](3, 1, 2)}`,
      `- ${CORE_MESSAGES[CoreMessage.PhantomScenarioTally](1)}`,
      `- ${CORE_MESSAGES[CoreMessage.SuspenseScenarioTally](1)}`,
    ]);
  });
});
