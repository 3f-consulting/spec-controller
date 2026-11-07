import { describe, it, expect } from "vitest";
import type { EvidenceReconciliation } from "../assemble/renderInput.js";
import { evidenceReconciliationOf, reconcile, summaryOf } from "../domain/evidenceReconciliation.js";
import { CoreMessage } from "./messages.js";
import { coreMessage } from "./coreText.js";
import { markdownHeading } from "./heading.js";
import type { EvidenceObservation, Scenario } from "../model.js";
import { sectionUnder, linesOf } from "./renderedSection.test-utils.js";

const scenarios: Scenario[] = [
  { claimCode: "CLM-VOL-001", evidenceObligations: [{ qualityCheckKind: "unit" }, { qualityCheckKind: "integration" }] },
];

const observations: EvidenceObservation[] = [
  { qualityCheckKind: "unit", claimCode: "CLM-VOL-001", status: "passed" },
  { qualityCheckKind: "unit", claimCode: "CLM-VOL-001", status: "passed" },
  { qualityCheckKind: "integration", claimCode: "CLM-VOL-001", status: "passed" },
  { qualityCheckKind: "unit", claimCode: "CLM-VOL-404", status: "passed" },
  { qualityCheckKind: "e2e", claimCode: null, status: "passed" },
  { qualityCheckKind: "e2e", claimCode: null, status: "failed" },
  { qualityCheckKind: "fitness", fitnessFunction: "guard-x", claimCode: "CLM-VOL-001", exists: true, enforcedOverRealSource: true },
  { qualityCheckKind: "fitness", fitnessFunction: "guard-x", claimCode: "CLM-VOL-001", exists: true, enforcedOverRealSource: true },
  { qualityCheckKind: "fitness", fitnessFunction: "guard-x", claimCode: "CLM-VOL-001", exists: false, enforcedOverRealSource: true },
];

const heading = (): string => markdownHeading(3, coreMessage(CoreMessage.EvidenceObservationsHeading));
const tableHeader = (): string => coreMessage(CoreMessage.EvidenceObservationsTableHeader);

const section = (lines: readonly string[]): string[] => sectionUnder(heading())(lines);

// The runner and CI step cells are asserted by the scenarios that own them.
function qualityCheckKindAndCount(row: string): string[] {
  return row.split("|").slice(1, 3).map((cell) => cell.trim());
}

function expectNoSectionAndNothingInItsPlace(reconciliation: EvidenceReconciliation): void {
  const lines = linesOf(reconciliation);
  expect(lines).not.toContain(heading());
  expect(lines).not.toContain(tableHeader());
  const headings = lines.flatMap((line, i) => (i > 0 && line.startsWith("#") ? [i] : []));
  expect(headings.length).toBeGreaterThan(0);
  for (const i of headings) expect(lines[i - 1]).toBe("");
}

describe("[CLM-RPT-010] the report renders the Evidence observations cut over every kind of quality check, fitness included, and the evidence observation identity balances by construction", () => {
  it("renders heading, blank, the identity line, blank, the four-column table with a row per kind of quality check and fitness last at the running count, then one blank", () => {
    const reconciliation = evidenceReconciliationOf(scenarios, observations, []);
    expect(reconciliation.summary.evidenceObservations).toMatchObject({
      total: 8,
      onScenario: 5,
      onPhantomClaim: 1,
      onUnnamedClaim: 2,
    });
    const lines = section(linesOf(reconciliation));
    expect(lines.slice(0, 6)).toStrictEqual([heading(), "", coreMessage(CoreMessage.EvidenceObservationsSum, { total: 8, onScenario: 5, onPhantomClaim: 1, onUnnamedClaim: 2 }), "", tableHeader(), "| --- | --- | --- | --- |"]);
    expect(lines.slice(6, -1).map(qualityCheckKindAndCount)).toStrictEqual([
      ["unit", "3"],
      ["integration", "1"],
      ["e2e", "2"],
      ["performance", "0"],
      ["fitness", "2"],
    ]);
    expect(lines.at(-1)).toBe("");
  });

  it("renders no section, and nothing in its place, for a report with no evidence observations", () => {
    const ledger = reconcile([], []);
    const reconciliation: EvidenceReconciliation = { summary: summaryOf(ledger, false), ledger };
    expect(reconciliation.summary).not.toHaveProperty("evidenceObservations");
    expectNoSectionAndNothingInItsPlace(reconciliation);
  });
});
