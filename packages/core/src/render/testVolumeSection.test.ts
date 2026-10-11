import { describe, it, expect } from "vitest";
import { evidenceReconciliationFromSources } from "../assemble/evidenceReconciliationFromSources.js";
import type { EvidenceReconciliation } from "../assemble/renderInput.js";
import { evidenceReconciliationOf } from "../domain/evidenceReconciliation.js";
import { CORE_MESSAGES, CoreMessage } from "../domain/messages.js";
import type { EvidenceObservation } from "../model.js";
import { renderMarkdown } from "./markdown.js";
import { sectionCtxNextDay as ctx } from "./runContext.test-utils.js";
import { sectionUnder } from "./renderedSection.test-utils.js";

const corpus = `@VOL
Feature: fixture volume corpus

  Rule: observations land on scenarios

    @unit @integration @SCN-VOL-001
    Scenario: a scenario the runners credit
`;

const observations: EvidenceObservation[] = [
  { qualityCheck: "unit", scnId: "SCN-VOL-001", status: "passed" },
  { qualityCheck: "unit", scnId: "SCN-VOL-001", status: "passed" },
  { qualityCheck: "integration", scnId: "SCN-VOL-001", status: "passed" },
  { qualityCheck: "unit", scnId: "SCN-VOL-404", status: "passed" },
  { qualityCheck: "e2e", scnId: null, status: "passed" },
  { qualityCheck: "e2e", scnId: null, status: "failed" },
];

const reconcile = (): EvidenceReconciliation =>
  evidenceReconciliationFromSources({
    featureSources: [corpus],
    untaggedScenarios: [],
    packageJson: {},
    ciSources: [],
    runtimeObservations: observations,
    deferralTags: [],
  });

const heading = CORE_MESSAGES[CoreMessage.TestVolumeHeading];
const sum = CORE_MESSAGES[CoreMessage.TestVolumeSum];
const tableHeader = CORE_MESSAGES[CoreMessage.TestVolumeTableHeader];

const section = (lines: readonly string[]): string[] => sectionUnder(heading)(lines);

const linesOf = (reconciliation: EvidenceReconciliation): string[] =>
  renderMarkdown(reconciliation, ctx).split("\n");

function expectNoSectionAndNothingInItsPlace(reconciliation: EvidenceReconciliation): void {
  const lines = linesOf(reconciliation);
  expect(lines).not.toContain(heading);
  expect(lines).not.toContain(tableHeader);
  const headings = lines.flatMap((line, i) => (i > 0 && line.startsWith("#") ? [i] : []));
  expect(headings.length).toBeGreaterThan(0);
  for (const i of headings) expect(lines[i - 1]).toBe("");
}

describe("[SCN-RPT-010] the report renders the Test volume cut and the evidence observation identity balances by construction", () => {
  it("renders heading, blank, the identity line, blank, the two-column table with a row per runtime quality-check, then one blank", () => {
    const reconciliation = reconcile();
    expect(reconciliation.summary.testVolume).toStrictEqual({
      totalEvidenceObservations: 6,
      onScenario: 3,
      onPhantomScenario: 1,
      onSuspenseScenario: 2,
    });
    expect(section(linesOf(reconciliation))).toStrictEqual([
      heading,
      "",
      sum(6, 3, 1, 2),
      "",
      tableHeader,
      "| --- | --- |",
      "| unit | 3 |",
      "| integration | 1 |",
      "| e2e | 2 |",
      "| performance | 0 |",
      "",
    ]);
  });

  it("renders no section, and nothing in its place, for a report that read no runtime observations", () => {
    const reconciliation = evidenceReconciliationOf([], [], [], false, true);
    expect(reconciliation.summary).not.toHaveProperty("testVolume");
    expect(reconciliation.summary).not.toHaveProperty("rawByRuntimeQualityCheck");
    expectNoSectionAndNothingInItsPlace(reconciliation);
  });
});
