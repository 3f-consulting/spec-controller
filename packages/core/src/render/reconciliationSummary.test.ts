import { describe, it, expect, beforeEach } from "vitest";
import { renderMarkdown } from "../assemble/composers.js";
import { reconcile, summaryOf } from "../domain/evidenceReconciliation.js";
import type { EvidenceReconciliation } from "../domain/evidenceReconciliation.js";
import { parseScenarios } from "../parse/scenarioReaders.test-utils.js";
import { CORE_MESSAGES, CoreMessage } from "./messages.js";
import { OUT_OF_BALANCE_OUTCOMES } from "../model.js";
import { OUTCOME_DESCRIPTION } from "./outcomeDescription.js";
import type { EvidenceObservation, Outcome } from "../model.js";
import type { RunContext } from "../domain/runProvenance.js";
import { FEATURES, VITEST, PYTEST, JEST, JUNIT, RSPEC, CUCUMBER, CI, PACKAGE_JSON, CI_STEPS } from "../runInputs.test-utils.js";
import { publishedExitCodeOf } from "./publishedExitCodes.test-utils.js";

const ctx: RunContext = {
  target: "reconciliation-summary-target",
  inputs: [{ ...FEATURES, path: "specs/features" }, VITEST, PYTEST, JEST, JUNIT, RSPEC, CUCUMBER, CI, PACKAGE_JSON, CI_STEPS],
  corpus: "specs/features",
  runStart: new Date("2026-10-05T18:00:00.000Z"),
  sourceSha: "4085f00dc0ffeeba110000000000000000deadbe",
  toolSha: "4085aaaa71ace511efdb2511276284b4cb50c247",
  toolVersion: "0.1.0",
};

const SETTLED = `Feature: the evidence reconciliation summary

  @unit @SCN-ERS-001
  Scenario: proved

  @unit @integration @SCN-ERS-002
  Scenario: its unit tier proved, its integration tier missing

  @unit @SCN-ERS-003
  Scenario: its unit tier failing

  @unit @SCN-ERS-005
  Scenario: its unit tier missing
`;

const ONE_DEFERRED = `
  @unit @SCN-ERS-004 @integrationpending
  Scenario: its integration tier deferred
`;

const OBSERVATIONS: EvidenceObservation[] = [
  { qualityCheck: "unit", scnId: "SCN-ERS-001", status: "passed", locator: "src/a.test.ts" },
  { qualityCheck: "unit", scnId: "SCN-ERS-002", status: "passed", locator: "src/b.test.ts" },
  { qualityCheck: "unit", scnId: "SCN-ERS-003", status: "failed", locator: "src/c.test.ts" },
];

const DEFERRED_OBSERVATIONS: EvidenceObservation[] = [
  { qualityCheck: "unit", scnId: "SCN-ERS-004", status: "passed", locator: "src/d.test.ts" },
];

function render(feature: string, observations: EvidenceObservation[] = OBSERVATIONS): string {
  const ledger = reconcile(parseScenarios(feature), observations);
  const reconciliation: EvidenceReconciliation = { summary: summaryOf(ledger, false), ledger };
  return renderMarkdown(reconciliation, ctx, publishedExitCodeOf);
}

function sectionLines(md: string): string[] {
  const lines = md.split("\n");
  const start = lines.indexOf(CORE_MESSAGES[CoreMessage.EvidenceReconciliationHeading]);
  expect(start).toBeGreaterThanOrEqual(0);
  const end = lines.findIndex((line, i) => i > start && line.startsWith("#"));
  expect(end).toBeGreaterThan(start);
  return lines.slice(start, end);
}

const row = (cells: readonly string[]): string => `| ${cells.join(" | ")} |`;

function expectedTable(
  scenarios: { total: number; balanced: number; outOfBalance: number },
  qualityCheckReconciliations: { total: number; satisfied: number },
  leafCounts: Partial<Record<Outcome, number>>,
  missingDetail: string
): string[] {
  const outOfBalance = Object.values(leafCounts).reduce((a, b) => a + b, 0);
  return [
    CORE_MESSAGES[CoreMessage.EvidenceReconciliationHeading],
    "",
    `- ${CORE_MESSAGES[CoreMessage.EvidenceReconciliationClaimReconciliationTerm]}`,
    `- ${CORE_MESSAGES[CoreMessage.EvidenceReconciliationQualityCheckReconciliationTerm]}`,
    `- ${CORE_MESSAGES[CoreMessage.EvidenceReconciliationEvidenceObligationTerm]}`,
    `- ${CORE_MESSAGES[CoreMessage.EvidenceReconciliationEvidenceObservationTerm]}`,
    "",
    row([
      CORE_MESSAGES[CoreMessage.SubjectColumn],
      CORE_MESSAGES[CoreMessage.TotalColumn],
      CORE_MESSAGES[CoreMessage.BalancedColumn],
      CORE_MESSAGES[CoreMessage.OutOfBalanceColumn],
      CORE_MESSAGES[CoreMessage.DetailColumn],
    ]),
    "| --- | --- | --- | --- | --- |",
    row([
      CORE_MESSAGES[CoreMessage.ClaimReconciliationSubject],
      String(scenarios.total),
      String(scenarios.balanced),
      String(scenarios.outOfBalance),
      "",
    ]),
    row([
      CORE_MESSAGES[CoreMessage.QualityCheckReconciliationSubject],
      String(qualityCheckReconciliations.total),
      String(qualityCheckReconciliations.satisfied),
      String(outOfBalance),
      "",
    ]),
    ...OUT_OF_BALANCE_OUTCOMES.map((outcome) =>
      row([
        OUTCOME_DESCRIPTION[outcome],
        "",
        "",
        String(leafCounts[outcome] ?? 0),
        outcome === "missing" ? missingDetail : "",
      ])
    ),
  ];
}

describe("[SCN-RPT-042] the Evidence Reconciliation Summary tallies Pending Items separately from balanced and out-of-balance", () => {
  let settledTable: string[];
  beforeEach(() => {
    settledTable = expectedTable(
      { total: 4, balanced: 1, outOfBalance: 3 },
      { total: 5, satisfied: 2 },
      { missing: 2, failing: 1 },
      "1 unit + 1 integration"
    );
  });

  it("with no Pending Item: the table, then one blank line, and no tally line", () => {
    expect(sectionLines(render(SETTLED))).toEqual([...settledTable, ""]);
  });

  it("with one Pending Item: a blank line, the tally carrying 1 on its own line, then a blank line; the counts are those of the settled tiers", () => {
    expect(sectionLines(render(SETTLED + ONE_DEFERRED, [...OBSERVATIONS, ...DEFERRED_OBSERVATIONS]))).toEqual([
      ...expectedTable(
        { total: 5, balanced: 2, outOfBalance: 3 },
        { total: 6, satisfied: 3 },
        { missing: 2, failing: 1 },
        "1 unit + 1 integration"
      ),
      "",
      "1 Pending Item(s) — deferred, tallied apart from balanced and out-of-balance.",
      "",
    ]);
  });
});
