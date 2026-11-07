import { describe, it, expect, beforeEach } from "vitest";
import { renderMarkdown } from "../assemble/composers.js";
import type { Ledger } from "../model.js";
import { reconcile } from "../domain/evidenceReconciliation.js";
import { sampleReportCtx as ctx } from "./runContext.test-utils.js";
import { __er } from "../evidenceReconciliation.test-utils.js";
import { publishedExitCodeOf } from "./publishedExitCodes.test-utils.js";
import { CoreMessage } from "./messages.js";
import { coreMessage } from "./coreText.js";
import { markdownHeading } from "./heading.js";

describe("[SCN-RPT-042] the Reconciliation totals section tallies the Pending Items on a line of their own after its table", () => {
  const reconciliationTotalsSection = (md: string): string => {
    const heading = markdownHeading(3, coreMessage(CoreMessage.ReconciliationTotalsHeading));
    const i = md.indexOf(heading);
    expect(i, `expected the section ${heading}`).toBeGreaterThanOrEqual(0);
    const rest = md.slice(i + 1);
    const next = rest.search(/\n#{2,3} /);
    return next >= 0 ? rest.slice(0, next) : rest;
  };

  let pendingBalance: Ledger;
  beforeEach(() => {
    pendingBalance = reconcile(
      [
        {
          claimCode: "SCN-PDX-001",
          evidenceObligations: [{ qualityCheckKind: "unit", pending: true }, { qualityCheckKind: "integration", pending: true }],
        },
        {
          claimCode: "SCN-PDX-002",
          evidenceObligations: [{ qualityCheckKind: "unit" }, { qualityCheckKind: "integration", pending: true }],
        },
      ],
      []
    );
  });

  it("renders the Pending Items tally (3) in the Reconciliation totals section, on a line that opens with its count", () => {
    const md = renderMarkdown(__er(pendingBalance), ctx, publishedExitCodeOf);
    const section = reconciliationTotalsSection(md);
    expect(section).toMatch(/^3 Pending Item\(s\) — deferred, tallied apart from balanced and out-of-balance\.$/m);
  });
});

describe("[SCN-RPT-043] a balanced-with-pending row is visibly distinguished from a clean-balanced one", () => {
  const rowFor = (md: string, claimCode: string): string => {
    const row = md.split("\n").find((line) => line.startsWith(`| ${claimCode} `));
    expect(row, `expected a rendered row for ${claimCode}`).toBeTruthy();
    return row!;
  };
  const exceptionsCell = (row: string): string => (row.split("|")[3] ?? "").trim();

  let contrastBalance: Ledger;
  beforeEach(() => {
    contrastBalance = reconcile(
      [
        { claimCode: "SCN-PDD-001", evidenceObligations: [{ qualityCheckKind: "unit" }] },
        { claimCode: "SCN-PDD-002", evidenceObligations: [{ qualityCheckKind: "integration", pending: true }] },
      ],
      [{ qualityCheckKind: "unit", claimCode: "SCN-PDD-001", status: "passed" }]
    );
  });

  it("makes the two balanced rows read differently at a glance — the pending cell is not the clean em-dash", () => {
    const md = renderMarkdown(__er(contrastBalance), ctx, publishedExitCodeOf);
    const cleanCell = exceptionsCell(rowFor(md, "SCN-PDD-001"));
    const pendingCell = exceptionsCell(rowFor(md, "SCN-PDD-002"));
    expect(cleanCell).toBe("—");
    expect(pendingCell).not.toBe(cleanCell);
    expect(pendingCell).toBe("pending: integration");
  });
});
