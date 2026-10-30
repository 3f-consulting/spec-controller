import { describe, it, expect } from "vitest";
import { renderMarkdown } from "../assemble/composers.js";
import { reconcile, summaryOf } from "../domain/evidenceReconciliation.js";
import type { EvidenceReconciliation } from "../domain/evidenceReconciliation.js";
import { parseScenarios } from "../parse/scenarioReaders.test-utils.js";
import { CORE_MESSAGES, CoreMessage } from "./messages.js";
import { OUTCOME_DESCRIPTION } from "./outcomeDescription.js";
import type { EvidenceObservation } from "../model.js";
import type { RunContext } from "../domain/runProvenance.js";
import { FEATURES, VITEST, PYTEST, JEST, JUNIT, RSPEC, CUCUMBER, CI, PACKAGE_JSON, CI_STEPS } from "../runInputs.test-utils.js";
import { publishedExitCodeOf } from "./publishedExitCodes.test-utils.js";

const ctx: RunContext = {
  target: "pending-item-row-target",
  inputs: [{ ...FEATURES, path: "specs/features" }, VITEST, PYTEST, JEST, JUNIT, RSPEC, CUCUMBER, CI, PACKAGE_JSON, CI_STEPS],
  corpus: "specs/features",
  runStart: new Date("2026-10-05T16:00:00.000Z"),
  sourceSha: "1e5f00d0c0ffeeba110000000000000000deadbe",
  toolSha: "4083aaaa71ace511efdb2511276284b4cb50c247",
  toolVersion: "0.1.0",
};

const DEFERRAL_TAG = "@deferred";

const FEATURE = `Feature: pending items on their rows

  @SCN-PIR-001 ${DEFERRAL_TAG}
  Scenario: deferred whole, with no tier named

  @unit @SCN-PIR-002 @integrationpending
  Scenario: one tier deferred, the other proved

  @unit @integration @SCN-PIR-003 ${DEFERRAL_TAG}
  Scenario: every named tier deferred

  @unit @integration @SCN-PIR-004 @e2epending @performancepending
  Scenario: two tiers unproved and two deferred

  @unit @SCN-PIR-005
  Scenario: proved, with nothing deferred
`;

const OBSERVATIONS: EvidenceObservation[] = [
  { qualityCheck: "unit", scnId: "SCN-PIR-002", status: "passed", locator: "src/b.test.ts" },
  { qualityCheck: "unit", scnId: "SCN-PIR-005", status: "passed", locator: "src/e.test.ts" },
];

function render(): string {
  const ledger = reconcile(parseScenarios(FEATURE, [DEFERRAL_TAG.slice(1)]), OBSERVATIONS);
  const reconciliation: EvidenceReconciliation = { summary: summaryOf(ledger, false), ledger };
  return renderMarkdown(reconciliation, ctx, publishedExitCodeOf);
}

function rowFor(md: string, scnId: string): { verdict: string; items: string } {
  const lines = md.split("\n");
  const header = lines.indexOf(CORE_MESSAGES[CoreMessage.LedgerTableHeader]);
  expect(header).toBeGreaterThanOrEqual(0);
  const matching = lines.slice(header + 2).filter((line) => line.startsWith(`| ${scnId} | `));
  expect(matching).toHaveLength(1);
  const cells = matching[0]!.slice(2, -2).split(" | ");
  expect(cells).toHaveLength(3);
  expect(cells[0]).toBe(scnId);
  return { verdict: cells[1]!, items: cells[2]! };
}

const pendingFor = (qualityCheck: string): string => `pending: ${qualityCheck}`;
const missing = (qualityCheck: string): string => `${qualityCheck}: ${OUTCOME_DESCRIPTION.missing}`;

describe("[SCN-RPT-041] the Pending Item shows on its Quality Check Reconciliation, labelled distinct from a Reconciling Item", () => {
  it("a Pending Item with no quality check carries the bare pending label, and its row still balances", () => {
    expect(rowFor(render(), "SCN-PIR-001")).toEqual({
      verdict: "balanced",
      items: "pending",
    });
  });

  it("a Pending Item with a quality check carries the label that names it", () => {
    expect(rowFor(render(), "SCN-PIR-002")).toEqual({
      verdict: "balanced",
      items: pendingFor("integration"),
    });
    expect(rowFor(render(), "SCN-PIR-001").items).not.toBe(rowFor(render(), "SCN-PIR-002").items);
  });

  it("two Pending Items on one row are each labelled, joined in the order their tiers were tagged", () => {
    expect(rowFor(render(), "SCN-PIR-003")).toEqual({
      verdict: "balanced",
      items: [pendingFor("unit"), pendingFor("integration")].join("; "),
    });
  });

  it("Reconciling Items come first, then the Pending Items, every exception joined in order on the one cell", () => {
    expect(rowFor(render(), "SCN-PIR-004")).toEqual({
      verdict: "out-of-balance",
      items: [missing("unit"), missing("integration"), pendingFor("e2e"), pendingFor("performance")].join("; "),
    });
  });

  it("a row with neither Reconciling nor Pending Items shows the placeholder alone", () => {
    expect(rowFor(render(), "SCN-PIR-005")).toEqual({ verdict: "balanced", items: "—" });
  });
});
