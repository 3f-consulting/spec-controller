import { describe, it, expect, beforeEach } from "vitest";
import { renderMarkdown } from "./markdown.js";
import type { Ledger } from "../model.js";
import { OUTCOME_DESCRIPTION } from "../model.js";
import { reconcile } from "../domain/evidenceReconciliation.js";
import { adopterReportCtx as ctx } from "./runContext.testkit.js";
import { __er } from "../evidenceReconciliation.testkit.js";

describe("[SCN-PND-010] the markdown report renders a Pending Item distinct from a reconciling item", () => {
  const rowFor = (md: string, scnId: string): string => {
    const row = md.split("\n").find((line) => line.startsWith(`| ${scnId} `));
    expect(row, `expected a rendered row for ${scnId}`).toBeTruthy();
    return row!;
  };

  let pendingBalance: Ledger;
  beforeEach(() => {
    pendingBalance = reconcile(
      [
        { scnId: "SCN-PDX-001", evidenceObligations: [{ qualityCheck: "integration", pending: true }] },
        {
          scnId: "SCN-PDX-002",
          evidenceObligations: [{ qualityCheck: "unit" }, { qualityCheck: "integration", pending: true }],
        },
        { scnId: "SCN-PDX-003", evidenceObligations: [{ qualityCheck: "unit" }] },
      ],
      [{ qualityCheck: "unit", scnId: "SCN-PDX-003", status: "passed" }]
    );
  });

  it("renders a balanced-with-pending row's Pending Item as a distinct ⏳ pending label, not a reconciling error", () => {
    const md = renderMarkdown(__er(pendingBalance), ctx);
    const row = rowFor(md, "SCN-PDX-001");
    expect(row).toMatch(/⏳ pending: integration/);
    expect(row).toContain("✓ balanced");
    expect(row).not.toMatch(/integration ∅ Evidence Observation is missing|integration ✗ Evidence Observation is failing/);
    expect(row).not.toMatch(/\|\s*—\s*\|$/);
  });

  it("renders a mixed row's error and Pending Item as separate, distinctly-labelled categories", () => {
    const md = renderMarkdown(__er(pendingBalance), ctx);
    const row = rowFor(md, "SCN-PDX-002");
    expect(row).toMatch(/unit ∅ Evidence Observation is missing/);
    expect(row).toMatch(/⏳ pending: integration/);
    expect(row).toContain("✗ out-of-balance");
  });

  it("leaves a clean-balanced row (no Pending Item) rendering the em-dash placeholder — the regression guard", () => {
    const md = renderMarkdown(__er(pendingBalance), ctx);
    const row = rowFor(md, "SCN-PDX-003");
    expect(row).toContain("| SCN-PDX-003 | ✓ balanced | — |");
    expect(row).not.toContain("⏳");
  });

  it("keeps the Pending Item distinct in the wide evidence-column ledger path too", () => {
    const md = renderMarkdown(__er(pendingBalance, true, false), ctx);
    expect(rowFor(md, "SCN-PDX-001")).toMatch(/⏳ pending: integration/);
    expect(rowFor(md, "SCN-PDX-002")).toMatch(/⏳ pending: integration/);
    expect(md).not.toMatch(/integration ∅ Evidence Observation is missing|integration ✗ Evidence Observation is failing/);
  });
});

describe("[SCN-PND-011] the markdown Summary tallies Pending Items separately from the verdict counts", () => {
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
          evidenceObligations: [{ qualityCheck: "unit", pending: true }, { qualityCheck: "integration", pending: true }],
        },
        {
          scnId: "SCN-PDX-002",
          evidenceObligations: [{ qualityCheck: "unit" }, { qualityCheck: "integration", pending: true }],
        },
      ],
      []
    );
  });

  it("renders the Pending Items tally (3) in the Evidence reconciliation view, marked with ⏳", () => {
    const md = renderMarkdown(__er(pendingBalance), ctx);
    const section = evidenceReconciliationSection(md);
    expect(section).toMatch(/⏳\s*3 Pending Item/);
  });

  it("keeps the out-of-balance leaf decomposition intact — the tally is NOT a leaf of its own", () => {
    const md = renderMarkdown(__er(pendingBalance), ctx);
    const section = evidenceReconciliationSection(md);
    for (const leaf of [
      "missing",
      "failing",
      "watermelon",
      "cites-unknown-scenario",
      "cites-no-scenario",
      "no-evidence-obligation",
      "both-missing",
    ] as const) {
      expect(section).toContain(`↳ ${OUTCOME_DESCRIPTION[leaf]} `);
    }
    expect(md).not.toContain("↳ pending");
  });

  it("renders the tally as its OWN line, after the out-of-balance decomposition (not a table row)", () => {
    const md = renderMarkdown(__er(pendingBalance), ctx);
    const iBothMissing = md.indexOf(`↳ ${OUTCOME_DESCRIPTION["both-missing"]}`);
    const iTally = md.search(/⏳\s*3 Pending Item/);
    expect(iBothMissing).toBeGreaterThanOrEqual(0);
    expect(iTally).toBeGreaterThan(iBothMissing);
    const tallyLine = md.split("\n").find((l) => /⏳\s*3 Pending Item/.test(l))!;
    expect(tallyLine.startsWith("| ↳")).toBe(false);
  });

  it("omits the tally line entirely when no scenario carries a Pending Item (byte-identical regression)", () => {
    const noPending: Ledger = reconcile(
      [{ scnId: "SCN-PDX-003", evidenceObligations: [{ qualityCheck: "unit" }] }],
      [{ qualityCheck: "unit", scnId: "SCN-PDX-003", status: "passed" }]
    );
    const md = renderMarkdown(__er(noPending), ctx);
    expect(md).not.toContain("Pending Item");
    expect(md).not.toContain("⏳");
  });
});

describe("[SCN-PND-012] a balanced-with-pending row is visibly distinguished from a clean-balanced one", () => {
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
        { scnId: "SCN-PDD-001", evidenceObligations: [{ qualityCheck: "unit" }] },
        { scnId: "SCN-PDD-002", evidenceObligations: [{ qualityCheck: "integration", pending: true }] },
      ],
      [{ qualityCheck: "unit", scnId: "SCN-PDD-001", status: "passed" }]
    );
  });

  it("renders the clean-balanced row as ✓ balanced with the em-dash placeholder — nothing outstanding", () => {
    const md = renderMarkdown(__er(contrastBalance), ctx);
    const row = rowFor(md, "SCN-PDD-001");
    expect(row).toContain("| SCN-PDD-001 | ✓ balanced | — |");
    expect(row).not.toContain("⏳");
  });

  it("renders the balanced-with-pending row as ✓ balanced with the ⏳ pending label — owed work, not an error", () => {
    const md = renderMarkdown(__er(contrastBalance), ctx);
    const row = rowFor(md, "SCN-PDD-002");
    expect(row).toContain("✓ balanced");
    expect(row).toMatch(/⏳ pending: integration/);
    expect(row).not.toMatch(/\|\s*—\s*\|/);
    expect(row).not.toMatch(/integration ∅ Evidence Observation is missing|integration ✗ Evidence Observation is failing/);
  });

  it("makes the two balanced rows read differently at a glance — the pending cell is not the clean em-dash", () => {
    const md = renderMarkdown(__er(contrastBalance), ctx);
    const cleanCell = exceptionsCell(rowFor(md, "SCN-PDD-001"));
    const pendingCell = exceptionsCell(rowFor(md, "SCN-PDD-002"));
    expect(cleanCell).toBe("—");
    expect(pendingCell).not.toBe(cleanCell);
    expect(pendingCell).toMatch(/⏳ pending: integration/);
  });
});
