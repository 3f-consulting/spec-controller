import { describe, it, expect, beforeEach } from "vitest";
import { renderMarkdown } from "../assemble/composers.js";
import type { Ledger, Outcome } from "../model.js";
import { OUTCOME_DESCRIPTION } from "./outcomeDescription.js";
import { reconcile } from "../domain/evidenceReconciliation.js";
import type { EvidenceObservation, Scenario } from "../model.js";
import { CORE_MESSAGES, CoreMessage } from "./messages.js";
import { sampleReportCtx as ctx } from "./runContext.test-utils.js";
import { __er } from "../evidenceReconciliation.test-utils.js";

describe("[SCN-RPT-011] the markdown ledger renders per-scenario evidence columns", () => {
  const scenarios: Scenario[] = [
    {
      scnId: "SCN-A",
      evidenceObligations: [
        { qualityCheck: "unit" },
        { qualityCheck: "fitness" },
      ],
    },
    { scnId: "SCN-B", evidenceObligations: [{ qualityCheck: "unit" }] },
    { scnId: "SCN-C", evidenceObligations: [{ qualityCheck: "unit" }] },
    { scnId: "SCN-D", evidenceObligations: [{ qualityCheck: "integration" }] },
    { scnId: "SCN-E", evidenceObligations: [{ qualityCheck: "fitness" }] },
    { scnId: "SCN-F", evidenceObligations: [{ qualityCheck: "unit", pending: true }] },
    { scnId: "SCN-G", evidenceObligations: [{ qualityCheck: "unit" }, { qualityCheck: "integration" }] },
    { scnId: "SCN-H", evidenceObligations: [{ qualityCheck: "fitness" }] },
  ];
  const observations: EvidenceObservation[] = [
    { qualityCheck: "unit", scnId: "SCN-A", status: "passed" },
    { qualityCheck: "unit", scnId: "SCN-A", status: "passed" },
    { qualityCheck: "unit", scnId: "SCN-C", status: "passed" },
    { qualityCheck: "integration", scnId: "SCN-C", status: "passed" },
    { qualityCheck: "integration", scnId: "SCN-D", status: "passed" },
    { qualityCheck: "unit", scnId: "SCN-F", status: "passed" },
    { qualityCheck: "fitness", fitnessFunction: "guard-x", scnId: "SCN-A", exists: true, enforcedOverRealSource: true },
    { qualityCheck: "fitness", fitnessFunction: "guard-y", scnId: "SCN-H", exists: true, enforcedOverRealSource: false },
    { qualityCheck: "unit", scnId: "SCN-G", status: "passed" },
    { qualityCheck: "integration", scnId: "SCN-G", status: "passed" },
  ];
  let balance: Ledger;
  beforeEach(() => {
    balance = reconcile(scenarios, observations);
  });

  it("builds the fixture through the reconciler — the no-evidence-obligation evidence observation is OUT of an evidence obligation", () => {
    const noEvidenceObligation = balance.claimReconciliations.flatMap((s) =>
      s.qualityCheckReconciliations.filter((o) => o.outcome === "no-evidence-obligation")
    );
    expect(noEvidenceObligation).toHaveLength(2);
    const scnC = balance.claimReconciliations.find((s) => s.scnId === "SCN-C")!;
    expect(scnC.qualityCheckReconciliations.some((o) => o.qualityCheck === "integration" && o.outcome === "no-evidence-obligation")).toBe(true);
    expect(scnC.qualityCheckReconciliations.some((o) => o.qualityCheck === "integration" && o.outcome === "satisfied")).toBe(false);
  });

  it("renders corpus-driven columns — Fitness first, then the behavioural levels present (e2e/performance absent)", () => {
    const md = renderMarkdown(__er(balance, true, false), ctx);
    expect(md).toContain("| Scenario | Fitness | Unit | Integration | Verdict | Reconciling items |");
    expect(md).not.toContain("| Performance |");
    expect(md).not.toContain(" E2e ");
  });

  it("encodes the four cell cases two-sided — named+met, named+missing, no-evidence-obligation, and absent", () => {
    const md = renderMarkdown(__er(balance, true, false), ctx);
    expect(md).toContain("| SCN-A | F/1 | U/2 |  |");
    expect(md).toContain("| SCN-B |  | U/- |  |");
    expect(md).toContain("| SCN-C |  | U/1 | -/1 |");
    expect(md).toContain("| SCN-D |  |  | I/1 |");
    expect(md).toContain("| SCN-E | F/- |  |  |");
  });

  it.each([
    ["[SCN-RPT-018] renders both cells for a scenario naming two behavioural tiers — neither reads as missing", "| SCN-G |  | U/1 | I/1 |"],
    ["renders -/N for an evidence observation at a PENDING pair — no-evidence-obligation, no evidence-obligation letter", "| SCN-F |  | -/1 |  |"],
  ])("%s", (_title, row) => {
    const md = renderMarkdown(__er(balance, true, false), ctx);
    expect(md).toContain(row);
  });

  const headerOf = (...evidence: string[]): string =>
    `| ${[
      CORE_MESSAGES[CoreMessage.ScenarioColumn],
      ...evidence,
      CORE_MESSAGES[CoreMessage.VerdictColumn],
      CORE_MESSAGES[CoreMessage.ReconcilingItemsColumn],
    ].join(" | ")} |`;

  const ledgerTable = (md: string): string[] => {
    const lines = md.split("\n");
    const section = lines.indexOf(CORE_MESSAGES[CoreMessage.ClaimReconciliationsHeading]);
    expect(section).toBeGreaterThanOrEqual(0);
    const start = lines.findIndex(
      (l, i) => i > section && l.startsWith(`| ${CORE_MESSAGES[CoreMessage.ScenarioColumn]} |`)
    );
    expect(start).toBeGreaterThan(section);
    const end = lines.indexOf("", start);
    return lines.slice(start, end);
  };

  const cellsOf = (row: string, count: number): string[] =>
    row.slice(2, -2).split(" | ").slice(0, count);

  it("adds a column for a behavioural tier the corpus names but no run observed, lettered E for e2e and P for performance", () => {
    const named = reconcile(
      [
        { scnId: "SCN-U", evidenceObligations: [{ qualityCheck: "unit" }] },
        { scnId: "SCN-E", evidenceObligations: [{ qualityCheck: "e2e" }] },
        { scnId: "SCN-P", evidenceObligations: [{ qualityCheck: "performance" }] },
      ],
      [{ qualityCheck: "unit", scnId: "SCN-U", status: "passed" }]
    );
    const table = ledgerTable(renderMarkdown(__er(named, true, false), ctx));
    expect(table[0]).toBe(headerOf("Unit", "E2e", "Performance"));
    expect(table[1]).toBe("| --- | --- | --- | --- | --- | --- |");
    expect(table.slice(2).map((row) => cellsOf(row, 4))).toEqual([
      ["SCN-U", "U/1", "", ""],
      ["SCN-E", "", "E/-", ""],
      ["SCN-P", "", "", "P/-"],
    ]);
  });

  it("adds a column for a tier observed on a shared-code row, whose reconciliations name only the tiers its scenarios raise", () => {
    const shared = reconcile(
      [
        { scnId: "SCN-D", evidenceObligations: [{ qualityCheck: "unit" }] },
        { scnId: "SCN-D", evidenceObligations: [{ qualityCheck: "unit" }] },
      ],
      [
        { qualityCheck: "unit", scnId: "SCN-D", status: "passed" },
        { qualityCheck: "integration", scnId: "SCN-D", status: "passed" },
      ]
    );
    const table = ledgerTable(renderMarkdown(__er(shared, true, false), ctx));
    expect(table[0]).toBe(headerOf("Unit", "Integration"));
    expect(table[1]).toBe("| --- | --- | --- | --- | --- |");
    expect(table.slice(2).map((row) => cellsOf(row, 3))).toEqual([["SCN-D", "U/1", "-/1"]]);
  });

  it("adds a Fitness column for a fitness observation on a shared-code row, as it adds a Unit column for a unit test there", () => {
    const shared = reconcile(
      [
        { scnId: "SCN-D", evidenceObligations: [{ qualityCheck: "unit" }] },
        { scnId: "SCN-D", evidenceObligations: [{ qualityCheck: "unit" }] },
      ],
      [
        { qualityCheck: "unit", scnId: "SCN-D", status: "passed" },
        { qualityCheck: "fitness", fitnessFunction: "guard-d", scnId: "SCN-D", exists: true, enforcedOverRealSource: true },
      ]
    );
    const table = ledgerTable(renderMarkdown(__er(shared, true, false), ctx));
    expect(table[0]).toBe(headerOf("Fitness", "Unit"));
    expect(table.slice(2).map((row) => cellsOf(row, 3))).toEqual([["SCN-D", "-/1", "U/1"]]);
  });

  it("adds a Fitness column with a blank cell for a shared-code row where one scenario's fitness obligation is pending", () => {
    const shared = reconcile(
      [
        { scnId: "SCN-D", evidenceObligations: [{ qualityCheck: "fitness", pending: true }] },
        { scnId: "SCN-D", evidenceObligations: [{ qualityCheck: "unit" }] },
      ],
      [{ qualityCheck: "unit", scnId: "SCN-D", status: "passed" }]
    );
    const table = ledgerTable(renderMarkdown(__er(shared, true, false), ctx));
    expect(table[0]).toBe(headerOf("Fitness", "Unit"));
    expect(table.slice(2).map((row) => cellsOf(row, 3))).toEqual([["SCN-D", "", "U/1"]]);
  });

  it("letters the Fitness cell only for a scenario that raises a fitness obligation that is not pending, however its one fitness observation reconciles", () => {
    const fitness = reconcile(
      [
        { scnId: "SCN-UNASKED", evidenceObligations: [{ qualityCheck: "unit" }] },
        { scnId: "SCN-PENDING", evidenceObligations: [{ qualityCheck: "fitness", pending: true }] },
        { scnId: "SCN-WATERMELON", evidenceObligations: [{ qualityCheck: "fitness" }] },
      ],
      [
        { qualityCheck: "unit", scnId: "SCN-UNASKED", status: "passed" },
        { qualityCheck: "fitness", fitnessFunction: "guard-a", scnId: "SCN-UNASKED", exists: true, enforcedOverRealSource: true },
        { qualityCheck: "fitness", fitnessFunction: "guard-b", scnId: "SCN-PENDING", exists: true, enforcedOverRealSource: true },
        { qualityCheck: "fitness", fitnessFunction: "guard-c", scnId: "SCN-WATERMELON", exists: true, enforcedOverRealSource: false },
      ]
    );
    const table = ledgerTable(renderMarkdown(__er(fitness, true, false), ctx));
    expect(table[0]).toBe(headerOf("Fitness", "Unit"));
    expect(table.slice(2).map((row) => cellsOf(row, 3))).toEqual([
      ["SCN-UNASKED", "-/1", "U/1"],
      ["SCN-PENDING", "-/1", ""],
      ["SCN-WATERMELON", "F/1", ""],
    ]);
  });

  it("takes no column from a phantom row's evidence observations, and fills the phantom row's evidence cells with —", () => {
    const phantom = reconcile(
      [{ scnId: "SCN-U", evidenceObligations: [{ qualityCheck: "unit" }] }],
      [
        { qualityCheck: "unit", scnId: "SCN-U", status: "passed" },
        { qualityCheck: "e2e", scnId: "SCN-GHOST", status: "passed" },
      ]
    );
    expect(phantom.claimReconciliations.map((s) => [s.scnId, s.kind])).toEqual([
      ["SCN-U", "scenario"],
      ["SCN-GHOST", "phantom-claim"],
    ]);
    const table = ledgerTable(renderMarkdown(__er(phantom, true, false), ctx));
    expect(table[0]).toBe(headerOf("Unit"));
    expect(table[1]).toBe("| --- | --- | --- | --- |");
    expect(table.slice(2).map((row) => cellsOf(row, 2))).toEqual([
      ["SCN-U", "U/1"],
      ["SCN-GHOST", "—"],
    ]);
  });
});

describe("[SCN-RPT-054] a fitness function whose step ran and failed shows as one observation in its Fitness cell, as a failed test does in its column", () => {
  const rows = (): Map<string, string[]> => {
    const failed = reconcile(
      [
        { scnId: "SCN-FIT", evidenceObligations: [{ qualityCheck: "fitness" }] },
        { scnId: "SCN-UNIT", evidenceObligations: [{ qualityCheck: "unit" }] },
      ],
      [
        { qualityCheck: "fitness", fitnessFunction: "lint:fails", scnId: "SCN-FIT", exists: true, enforcedOverRealSource: true, status: "failed" },
        { qualityCheck: "unit", scnId: "SCN-UNIT", status: "failed" },
      ]
    );
    const lines = renderMarkdown(__er(failed, true, false), ctx).split("\n");
    const header = `| ${CORE_MESSAGES[CoreMessage.ScenarioColumn]} | Fitness | Unit | ${CORE_MESSAGES[CoreMessage.VerdictColumn]} | ${CORE_MESSAGES[CoreMessage.ReconcilingItemsColumn]} |`;
    const start = lines.indexOf(header);
    expect(start).toBeGreaterThanOrEqual(0);
    const table = lines.slice(start + 2, lines.indexOf("", start));
    return new Map(table.map((row): [string, string[]] => {
      const cells = row.slice(2, -2).split(" | ");
      return [cells[0]!, cells.slice(1)];
    }));
  };

  it("counts the failed fitness observation in the Fitness cell, as the failed unit test counts in the Unit cell", () => {
    const table = rows();
    expect(table.get("SCN-FIT")!.slice(0, 2)).toEqual(["F/1", ""]);
    expect(table.get("SCN-UNIT")!.slice(0, 2)).toEqual(["", "U/1"]);
  });

  it("shows the failure in Verdict and Reconciling items, as for the failed unit test", () => {
    const table = rows();
    const [, , fitnessVerdict, fitnessItems] = table.get("SCN-FIT")!;
    const [, , unitVerdict, unitItems] = table.get("SCN-UNIT")!;
    expect(fitnessVerdict).toBe(unitVerdict);
    expect(fitnessVerdict).toBe("out-of-balance");
    expect(unitItems).toBe(`unit: ${OUTCOME_DESCRIPTION.failing}`);
    expect(fitnessItems).toBe(`fitness: ${OUTCOME_DESCRIPTION.failing}`);
  });
});

describe("[SCN-RPT-019] the Quality Check Reconciliation summary lists the ten leaf outcomes summing to the out-of-balance total, with no group rows", () => {
  let spanning: Ledger;
  beforeEach(() => {
    spanning = reconcile(
      [
        { scnId: "SCN-A", evidenceObligations: [{ qualityCheck: "unit" }] },
        { scnId: "SCN-C", evidenceObligations: [] },
      ],
      [{ qualityCheck: "unit", scnId: null, status: "passed", locator: "tests/stray.test.ts:1" }]
    );
  });

  const LEAVES = [
    "missing",
    "failing",
    "watermelon",
    "no-scn-code",
    "duplicate-scn-code",
    "cites-unknown-scenario",
    "cites-no-scenario",
    "no-evidence-obligation",
    "broken",
    "both-missing",
  ] as const;

  const ALL_OUTCOMES: Record<Outcome, true> = {
    satisfied: true,
    failing: true,
    watermelon: true,
    missing: true,
    "cites-unknown-scenario": true,
    "cites-no-scenario": true,
    "no-scn-code": true,
    "duplicate-scn-code": true,
    broken: true,
    "no-evidence-obligation": true,
    "both-missing": true,
  };
  let EXPECTED_LEAVES: Outcome[];
  beforeEach(() => {
    EXPECTED_LEAVES = (Object.keys(ALL_OUTCOMES) as Outcome[]).filter(
      (outcome) => outcome !== "satisfied"
    );
  });

  it("decomposes the Quality Check Reconciliation out-of-balance into exactly the ten leaf outcome rows", () => {
    const md = renderMarkdown(__er(spanning), ctx);
    for (const leaf of LEAVES) {
      expect(md).toContain(`| ↳ ${OUTCOME_DESCRIPTION[leaf]} |`);
    }
    const arrowRows = md.split("\n").filter((line) => line.includes("↳"));
    expect(arrowRows.length).toBe(10);
  });

  it("renders a leaf row for EVERY Outcome member except satisfied (the exhaustiveness guard)", () => {
    const md = renderMarkdown(__er(spanning), ctx);
    const rendered = new Set(
      md
        .split("\n")
        .filter((line) => line.includes("↳"))
        .map((line) => line.split("|")[1]?.trim().replace("↳ ", ""))
    );
    for (const outcome of EXPECTED_LEAVES) {
      expect(rendered).toContain(OUTCOME_DESCRIPTION[outcome]);
    }
    expect(rendered.size).toBe(EXPECTED_LEAVES.length);
    expect(rendered).not.toContain(OUTCOME_DESCRIPTION.satisfied);
  });

  it("sums the leaf counts to the Quality Check Reconciliation out-of-balance total", () => {
    const md = renderMarkdown(__er(spanning), ctx);
    const subject = CORE_MESSAGES[CoreMessage.QualityCheckReconciliationSubject].replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const qcrOutOfBalance = Number(
      new RegExp(`\\| ${subject} \\| \\d+ \\| \\d+ \\| (\\d+) \\|`).exec(md)?.[1]
    );
    expect(qcrOutOfBalance).toBe(3);
    let leafSum = 0;
    for (const leaf of LEAVES) {
      const gloss = OUTCOME_DESCRIPTION[leaf].replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const n = Number(new RegExp(`↳ ${gloss} \\|[^\\d]*(\\d+) \\|`).exec(md)?.[1]);
      expect(Number.isNaN(n)).toBe(false);
      leafSum += n;
    }
    expect(leafSum).toBe(qcrOutOfBalance);
  });
});
