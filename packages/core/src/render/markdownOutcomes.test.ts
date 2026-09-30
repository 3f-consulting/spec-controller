import { describe, it, expect } from "vitest";
import { renderMarkdown } from "./markdown.js";
import type { Ledger, Outcome } from "../model.js";
import { OUTCOME_DESCRIPTION } from "../model.js";
import { reconcile } from "../domain/evidenceReconciliation.js";
import type { RunContext } from "../provenance/provenance.js";
import { summaryOf } from "../domain/evidenceReconciliation.js";
import type { EvidenceReconciliation } from "../domain/evidenceReconciliation.js";

const __er = (ledger: Ledger, wo = false, wg = false): EvidenceReconciliation => ({
  summary: summaryOf(ledger, wo, wg),
  ledger,
});

const ctx: RunContext = {
  target: "an-adopters-repository",
  inputs: {
    features: "../an-adopters-repository/features",
    vitest: "../an-adopters-repository/vitest-report.json",
  },
  runStart: new Date("2026-06-27T08:17:53.000Z"),
  sourceSha: "905a987c0ffeeba110000000000000000deadbeef",
  toolSha: "13ee47f271ace511efdb2511276284b4cb50c247",
  toolVersion: "0.1.0",
};

describe("[SCN-RPT-020] the markdown renders each outcome's canon description, not the bare handle", () => {
  const rich: Ledger = reconcile(
    [
      {
        scnId: "SCN-A",
        evidenceObligations: [{ qualityCheck: "unit" }, { qualityCheck: "fitness" }],
      },
      { scnId: "SCN-B", evidenceObligations: [] },
    ],
    [
      { qualityCheck: "fitness", staticCheck: "typecheck", scnId: "SCN-A", exists: true, enforcedOverRealSource: false },
      { qualityCheck: "integration", scnId: null, status: "passed", locator: "tests/stray.test.ts:1" },
    ]
  );

  it("renders every summary ↳ decomposition row with the canon description, and no bare handle", () => {
    const md = renderMarkdown(__er(rich), ctx);
    expect(md).toContain("| ↳ Evidence Observation is missing |");
    expect(md).toContain("| ↳ Evidence Observation is failing |");
    expect(md).toContain("| ↳ Evidence Observation is passing but fabricated |");
    expect(md).toContain("| ↳ Evidence Observation cites an unknown Scenario |");
    expect(md).toContain("| ↳ Evidence Observation cites no Scenario |");
    expect(md).toContain("| ↳ Evidence Observation cites a Scenario with no matching Evidence Obligation |");
    expect(md).toContain(
      "| ↳ Evidence Obligation and Evidence Observation are both missing — the Scenario is untagged and uncited |"
    );
    for (const handle of [
      "missing",
      "failing",
      "watermelon",
      "cites-unknown-scenario",
      "cites-no-scenario",
      "no-evidence-obligation",
      "both-missing",
    ]) {
      expect(md).not.toContain(`| ↳ ${handle} |`);
    }
  });

  it("renders each per-scenario reconciling item with the canon description, glyph retained", () => {
    const md = renderMarkdown(__er(rich), ctx);
    expect(md).toContain("unit ∅ Evidence Observation is missing");
    expect(md).toContain("fitness 🍉 Evidence Observation is passing but fabricated");
    expect(md).toContain(
      "⊘ Evidence Obligation and Evidence Observation are both missing — the Scenario is untagged and uncited"
    );
    expect(md).toContain(
      "integration ❓ Evidence Observation cites no Scenario (tests/stray.test.ts:1)"
    );
    expect(md).not.toContain("∅ missing");
    expect(md).not.toContain("🍉 watermelon");
    expect(md).not.toContain("❓ cites-no-scenario");
  });

  it("renders the fitness table's Outcome column with the canon description", () => {
    const md = renderMarkdown(__er(rich), ctx);
    expect(md).toContain("| SCN-A | 🍉 Evidence Observation is passing but fabricated |");
  });

  it("single-sources the gloss from OUTCOME_DESCRIPTION — the render cannot drift from the map", () => {
    const md = renderMarkdown(__er(rich), ctx);
    expect(md).toContain(`↳ ${OUTCOME_DESCRIPTION.missing}`);
    expect(md).toContain(`unit ∅ ${OUTCOME_DESCRIPTION.missing}`);
    expect(md).toContain(`🍉 ${OUTCOME_DESCRIPTION.watermelon}`);
    expect(md).toContain(`⊘ ${OUTCOME_DESCRIPTION["both-missing"]}`);
  });
});

describe("[SCN-RPT-025] every outcome glosses as the manifesto's canon Outcome text", () => {
  const CANON_OUTCOME_TEXT: Record<Outcome, string> = {
    satisfied: "Evidence Observation satisfies its Evidence Obligation",
    missing: "Evidence Observation is missing",
    failing: "Evidence Observation is failing",
    watermelon: "Evidence Observation is passing but fabricated",
    "no-scn-code": "Evidence Obligation has no @SCN code for an Evidence Observation to link to",
    "duplicate-scn-code": "Evidence Obligation's @SCN code is carried by another Scenario",
    "cites-unknown-scenario": "Evidence Observation cites an unknown Scenario",
    "cites-no-scenario": "Evidence Observation cites no Scenario",
    "no-evidence-obligation": "Evidence Observation cites a Scenario with no matching Evidence Obligation",
    broken:
      "Evidence Observation ATTEMPT errored before it could cite a Scenario (the proving suite failed to collect; behaviour never exercised)",
    "both-missing":
      "Evidence Obligation and Evidence Observation are both missing — the Scenario is untagged and uncited",
  };

  it.each(Object.entries(CANON_OUTCOME_TEXT) as [Outcome, string][])(
    'the "%s" outcome glosses as the manifesto canon text',
    (handle, canon) => {
      expect(OUTCOME_DESCRIPTION[handle]).toBe(canon);
    }
  );
});

describe("[SCN-PND-010] the markdown report renders a Pending Item distinct from a reconciling item", () => {
  const rowFor = (md: string, scnId: string): string => {
    const row = md.split("\n").find((line) => line.startsWith(`| ${scnId} `));
    expect(row, `expected a rendered row for ${scnId}`).toBeTruthy();
    return row!;
  };

  const pendingBalance: Ledger = reconcile(
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

  const pendingBalance: Ledger = reconcile(
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

  const contrastBalance: Ledger = reconcile(
    [
      { scnId: "SCN-PDD-001", evidenceObligations: [{ qualityCheck: "unit" }] },
      { scnId: "SCN-PDD-002", evidenceObligations: [{ qualityCheck: "integration", pending: true }] },
    ],
    [{ qualityCheck: "unit", scnId: "SCN-PDD-001", status: "passed" }]
  );

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
