import { describe, it, expect, beforeEach } from "vitest";
import { renderMarkdown } from "../assemble/composers.js";
import type { Ledger } from "../model.js";
import { reconcile } from "../domain/evidenceReconciliation.js";
import { sampleReportCtx as ctx } from "./runContext.test-utils.js";
import { __er } from "../evidenceReconciliation.test-utils.js";
import { publishedExitCodeOf } from "./publishedExitCodes.test-utils.js";

describe("[SCN-RPT-042] the markdown Summary tallies Pending Items separately from the verdict counts", () => {
  const evidenceReconciliationSection = (md: string): string => {
    const i = md.indexOf("### Evidence reconciliation");
    expect(i, "expected the Evidence reconciliation section").toBeGreaterThanOrEqual(0);
    const rest = md.slice(i + 1);
    const next = rest.search(/\n#{2,3} /);
    return next >= 0 ? rest.slice(0, next) : rest;
  };

  let pendingBalance: Ledger;
  beforeEach(() => {
    pendingBalance = reconcile(
      [
        {
          scnId: "SCN-PDX-001",
          evidenceObligations: [{ qualityCheckKind: "unit", pending: true }, { qualityCheckKind: "integration", pending: true }],
        },
        {
          scnId: "SCN-PDX-002",
          evidenceObligations: [{ qualityCheckKind: "unit" }, { qualityCheckKind: "integration", pending: true }],
        },
      ],
      []
    );
  });

  it("renders the Pending Items tally (3) in the Evidence reconciliation view, on a line that opens with its count", () => {
    const md = renderMarkdown(__er(pendingBalance), ctx, publishedExitCodeOf);
    const section = evidenceReconciliationSection(md);
    expect(section).toMatch(/^3 Pending Item\(s\) — deferred, tallied apart from balanced and out-of-balance\.$/m);
  });
});

describe("[SCN-RPT-043] a balanced-with-pending row is visibly distinguished from a clean-balanced one", () => {
  const rowFor = (md: string, scnId: string): string => {
    const row = md.split("\n").find((line) => line.startsWith(`| ${scnId} `));
    expect(row, `expected a rendered row for ${scnId}`).toBeTruthy();
    return row!;
  };
  const exceptionsCell = (row: string): string => (row.split("|")[3] ?? "").trim();

  let contrastBalance: Ledger;
  beforeEach(() => {
    contrastBalance = reconcile(
      [
        { scnId: "SCN-PDD-001", evidenceObligations: [{ qualityCheckKind: "unit" }] },
        { scnId: "SCN-PDD-002", evidenceObligations: [{ qualityCheckKind: "integration", pending: true }] },
      ],
      [{ qualityCheckKind: "unit", scnId: "SCN-PDD-001", status: "passed" }]
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
