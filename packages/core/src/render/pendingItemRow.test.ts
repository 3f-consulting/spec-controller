import { describe, it, expect } from "vitest";
import { renderMarkdown } from "../assemble/composers.js";
import { reconcile, summaryOf } from "../domain/evidenceReconciliation.js";
import type { EvidenceReconciliation } from "../domain/evidenceReconciliation.js";
import type { Ledger } from "../domain/ledger.js";
import type { PendingItem } from "../domain/journal.js";
import { parseScenarios } from "../parse/scenarioReaders.test-utils.js";
import { outcomeDescription } from "./outcomeDescription.js";
import type { EvidenceObservation } from "../model.js";
import type { RunContext } from "../domain/runProvenance.js";
import { specsFeaturesInputs } from "./runContext.test-utils.js";
import { publishedExitCodeOf } from "./publishedExitCodes.test-utils.js";
import { verdictAndItemsOf as rowFor } from "./claimReconciliationsTable.test-utils.js";

const ctx: RunContext = {
  target: "pending-item-row-target",
  ...specsFeaturesInputs,
  runStart: new Date("2026-10-05T16:00:00.000Z"),
  sourceSha: "1e5f00d0c0ffeeba110000000000000000deadbe",
  toolSha: "4083aaaa71ace511efdb2511276284b4cb50c247",
  toolVersion: "0.1.0",
};

const DEFERRAL_TAG = "@deferred";

const FEATURE = `Feature: pending items on their rows

  @CLM-PIR-001 ${DEFERRAL_TAG}
  Scenario: deferred whole, with no layer named

  @unit @CLM-PIR-002 @integrationpending
  Scenario: one layer deferred, the other proved

  @unit @integration @CLM-PIR-003 ${DEFERRAL_TAG}
  Scenario: every named layer deferred

  @unit @integration @CLM-PIR-004 @e2epending @performancepending
  Scenario: two layers unproved and two deferred

  @unit @CLM-PIR-005
  Scenario: proved, with nothing deferred
`;

const OBSERVATIONS: EvidenceObservation[] = [
  { qualityCheckKind: "unit", claimCode: "CLM-PIR-002", status: "passed", locator: "src/b.test.ts" },
  { qualityCheckKind: "unit", claimCode: "CLM-PIR-005", status: "passed", locator: "src/e.test.ts" },
];

function render(rewrite: (ledger: Ledger) => Ledger = (ledger) => ledger): string {
  const ledger = rewrite(reconcile(parseScenarios(FEATURE, [DEFERRAL_TAG.slice(1)]), OBSERVATIONS));
  const reconciliation: EvidenceReconciliation = { summary: summaryOf(ledger, false), ledger };
  return renderMarkdown(reconciliation, ctx, publishedExitCodeOf);
}

const noKindAbsent = (ledger: Ledger): Ledger => ({
  claimReconciliations: ledger.claimReconciliations.map((row) => ({
    ...row,
    pendingItems: row.pendingItems.map((item) => (item.qualityCheckKind === null ? ({} as PendingItem) : item)),
  })),
});

const pendingFor = (qualityCheckKind: string): string => `pending: ${qualityCheckKind}`;
const missing = (qualityCheckKind: string): string => `${qualityCheckKind}: ${outcomeDescription("missing")}`;

describe("[CLM-RPT-041] the Pending Item shows on its Quality Check Reconciliation, labelled distinct from a Reconciling Item", () => {
  it("a Pending Item with no kind of quality check carries the bare pending label, and its row still balances", () => {
    expect(rowFor(render(), "CLM-PIR-001")).toEqual({
      verdict: "balanced",
      items: "pending",
    });
    expect(rowFor(render(noKindAbsent), "CLM-PIR-001")).toEqual({
      verdict: "balanced",
      items: "pending",
    });
  });

  it("a Pending Item with a kind of quality check carries the label that names it", () => {
    expect(rowFor(render(), "CLM-PIR-002")).toEqual({
      verdict: "balanced",
      items: pendingFor("integration"),
    });
    expect(rowFor(render(), "CLM-PIR-001").items).not.toBe(rowFor(render(), "CLM-PIR-002").items);
  });

  it("two Pending Items on one row are each labelled, joined in the order their layers were tagged", () => {
    expect(rowFor(render(), "CLM-PIR-003")).toEqual({
      verdict: "balanced",
      items: [pendingFor("unit"), pendingFor("integration")].join("; "),
    });
  });

  it("Reconciling Items come first, then the Pending Items, every exception joined in order on the one cell", () => {
    expect(rowFor(render(), "CLM-PIR-004")).toEqual({
      verdict: "out-of-balance",
      items: [missing("unit"), missing("integration"), pendingFor("e2e"), pendingFor("performance")].join("; "),
    });
  });

  it("a row with neither Reconciling nor Pending Items shows the placeholder alone", () => {
    expect(rowFor(render(), "CLM-PIR-005")).toEqual({ verdict: "balanced", items: "—" });
  });
});
