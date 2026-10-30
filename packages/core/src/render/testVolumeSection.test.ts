import { describe, it, expect } from "vitest";
import type { EvidenceReconciliation } from "../assemble/renderInput.js";
import { evidenceReconciliationOf } from "../domain/evidenceReconciliation.js";
import { CORE_MESSAGES, CoreMessage } from "./messages.js";
import type { EvidenceObservation, Scenario } from "../model.js";
import { sectionUnder, linesOf } from "./renderedSection.test-utils.js";

const scenarios: Scenario[] = [
  { scnId: "SCN-VOL-001", evidenceObligations: [{ qualityCheck: "unit" }, { qualityCheck: "integration" }] },
];

const observations: EvidenceObservation[] = [
  { qualityCheck: "unit", scnId: "SCN-VOL-001", status: "passed" },
  { qualityCheck: "unit", scnId: "SCN-VOL-001", status: "passed" },
  { qualityCheck: "integration", scnId: "SCN-VOL-001", status: "passed" },
  { qualityCheck: "unit", scnId: "SCN-VOL-404", status: "passed" },
  { qualityCheck: "e2e", scnId: null, status: "passed" },
  { qualityCheck: "e2e", scnId: null, status: "failed" },
  { qualityCheck: "fitness", fitnessFunction: "guard-x", scnId: "SCN-VOL-001", exists: true, enforcedOverRealSource: true },
  { qualityCheck: "fitness", fitnessFunction: "guard-x", scnId: "SCN-VOL-001", exists: true, enforcedOverRealSource: true },
  { qualityCheck: "fitness", fitnessFunction: "guard-x", scnId: "SCN-VOL-001", exists: false, enforcedOverRealSource: true },
];

const heading = "### Evidence observations";
const sum = CORE_MESSAGES[CoreMessage.EvidenceObservationsSum];
const tableHeader = CORE_MESSAGES[CoreMessage.EvidenceObservationsTableHeader];

const section = (lines: readonly string[]): string[] => sectionUnder(heading)(lines);

function expectNoSectionAndNothingInItsPlace(reconciliation: EvidenceReconciliation): void {
  const lines = linesOf(reconciliation);
  expect(lines).not.toContain(heading);
  expect(lines).not.toContain(tableHeader);
  const headings = lines.flatMap((line, i) => (i > 0 && line.startsWith("#") ? [i] : []));
  expect(headings.length).toBeGreaterThan(0);
  for (const i of headings) expect(lines[i - 1]).toBe("");
}

describe("[SCN-RPT-010] the report renders the Evidence observations cut over every quality check, fitness included, and the evidence observation identity balances by construction", () => {
  it("renders heading, blank, the identity line, blank, the two-column table with a row per quality check and fitness last at the running count, then one blank", () => {
    const reconciliation = evidenceReconciliationOf(scenarios, observations, [], true, true);
    expect(reconciliation.summary.evidenceObservations).toMatchObject({
      total: 8,
      onScenario: 5,
      onPhantomClaim: 1,
      onUnnamedClaim: 2,
    });
    expect(section(linesOf(reconciliation))).toStrictEqual([
      heading,
      "",
      sum(8, 5, 1, 2),
      "",
      tableHeader,
      "| --- | --- |",
      "| unit | 3 |",
      "| integration | 1 |",
      "| e2e | 2 |",
      "| performance | 0 |",
      "| fitness | 2 |",
      "",
    ]);
  });

  it("renders no section, and nothing in its place, for a report with no evidence observations", () => {
    const reconciliation = evidenceReconciliationOf([], [], [], false, false);
    expect(reconciliation.summary).not.toHaveProperty("evidenceObservations");
    expectNoSectionAndNothingInItsPlace(reconciliation);
  });
});
