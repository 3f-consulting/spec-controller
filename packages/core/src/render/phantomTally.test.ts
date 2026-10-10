import { describe, it, expect } from "vitest";
import type { EvidenceObservation, Scenario } from "../model.js";
import { CORE_MESSAGES, CoreMessage } from "../domain/messages.js";
import { tallyBlockOf } from "./tallyBlock.testkit.js";

const scenarios: Scenario[] = [{ scnId: "SCN-LDG-006", evidenceObligations: [{ qualityCheck: "unit" }] }];
const known: EvidenceObservation = { qualityCheck: "unit", scnId: "SCN-LDG-006", status: "passed" };

function phantomCredit(scnId: string): EvidenceObservation {
  return { qualityCheck: "unit", scnId, status: "passed", locator: `src/${scnId}.test.ts` };
}

const tallyBlock = (observations: EvidenceObservation[]): string[] => tallyBlockOf(scenarios)(observations);

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
