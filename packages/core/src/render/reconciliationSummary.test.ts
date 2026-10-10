import { describe, it, expect, beforeEach } from "vitest";
import { renderMarkdown } from "./markdown.js";
import { reconcile, summaryOf } from "../domain/evidenceReconciliation.js";
import type { EvidenceReconciliation } from "../domain/evidenceReconciliation.js";
import { parseScenarios } from "../parse/scenarios.js";
import { CORE_MESSAGES, CoreMessage } from "../domain/messages.js";
import { OUTCOME_DESCRIPTION, OUT_OF_BALANCE_OUTCOMES } from "../model.js";
import type { EvidenceObservation, Outcome } from "../model.js";
import type { RunContext } from "../provenance/provenance.js";

const ctx: RunContext = {
  target: "reconciliation-summary-target",
  inputs: { features: "specs/features" },
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

const TWO_DEFERRED = `
  @unit @SCN-ERS-004 @integrationpending @e2epending
  Scenario: two tiers deferred
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
  const reconciliation: EvidenceReconciliation = { summary: summaryOf(ledger, false, false), ledger };
  return renderMarkdown(reconciliation, ctx);
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
  obligations: { total: number; satisfied: number },
  leafCounts: Partial<Record<Outcome, number>>,
  missingDetail: string
): string[] {
  const outOfBalance = Object.values(leafCounts).reduce((a, b) => a + b, 0);
  return [
    CORE_MESSAGES[CoreMessage.EvidenceReconciliationHeading],
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
      CORE_MESSAGES[CoreMessage.ScenarioReconciliationSubject],
      String(scenarios.total),
      String(scenarios.balanced),
      String(scenarios.outOfBalance),
      "",
    ]),
    row([
      CORE_MESSAGES[CoreMessage.EvidenceObligationSubject],
      String(obligations.total),
      String(obligations.satisfied),
      String(outOfBalance),
      "",
    ]),
    ...OUT_OF_BALANCE_OUTCOMES.map((outcome) =>
      row([
        `↳ ${OUTCOME_DESCRIPTION[outcome]}`,
        "",
        "",
        String(leafCounts[outcome] ?? 0),
        outcome === "missing" ? missingDetail : "",
      ])
    ),
  ];
}

describe("[SCN-PND-011] the Evidence Reconciliation Summary tallies Pending Items separately from balanced and out-of-balance", () => {
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
      CORE_MESSAGES[CoreMessage.PendingTally](1),
      "",
    ]);
  });

  it("with two Pending Items on one scenario: the tally carries 2", () => {
    const lines = sectionLines(render(SETTLED + TWO_DEFERRED, [...OBSERVATIONS, ...DEFERRED_OBSERVATIONS]));
    expect(lines.slice(-3)).toEqual(["", CORE_MESSAGES[CoreMessage.PendingTally](2), ""]);
  });

  it("only the missing outcome's row carries a Detail, the missing count split by quality check; every other row's Detail is empty", () => {
    const lines = sectionLines(render(SETTLED));
    const separator = lines.indexOf("| --- | --- | --- | --- | --- |");
    const bodyRows = lines.slice(separator + 1).filter((line) => line.startsWith("| "));
    expect(bodyRows).toHaveLength(2 + OUT_OF_BALANCE_OUTCOMES.length);
    const withDetail = bodyRows.filter((line) => line.slice(2, -2).split(" | ")[4] !== "");
    expect(withDetail).toEqual([
      row([`↳ ${OUTCOME_DESCRIPTION.missing}`, "", "", "2", "1 unit + 1 integration"]),
    ]);
  });

  it("with no missing outcome, the missing row's Detail is empty too", () => {
    const allProved = `Feature: all proved

  @unit @SCN-ERS-001
  Scenario: proved
`;
    expect(sectionLines(render(allProved, OBSERVATIONS.slice(0, 1)))).toEqual([
      ...expectedTable({ total: 1, balanced: 1, outOfBalance: 0 }, { total: 1, satisfied: 1 }, {}, ""),
      "",
    ]);
  });
});
