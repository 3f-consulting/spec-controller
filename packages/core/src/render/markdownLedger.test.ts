import { describe, it, expect, beforeEach } from "vitest";
import { renderMarkdown } from "../assemble/composers.js";
import type { Ledger, Outcome } from "../model.js";
import { OUTCOME_DESCRIPTION } from "./outcomeDescription.js";
import { reconcile } from "../domain/evidenceReconciliation.js";
import { linesOf } from "../domain/claimReconciliation.js";
import type { EvidenceObservation, Scenario } from "../model.js";
import { CORE_MESSAGES, CoreMessage } from "./messages.js";
import { sampleReportCtx as ctx } from "./runContext.test-utils.js";
import { __er } from "../evidenceReconciliation.test-utils.js";
import { publishedExitCodeOf } from "./publishedExitCodes.test-utils.js";
import { evidenceOfRunResult } from "../domain/journal.js";
import {
  RECONCILING_ITEMS_COLUMN,
  VERDICT_COLUMN,
  claimReconciliationsTable,
  type ClaimReconciliationsTable,
} from "./claimReconciliationsTable.test-utils.js";

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
      s.qualityCheckReconciliations.flatMap(linesOf).filter((line) => line.outcome === "no-evidence-obligation")
    );
    expect(noEvidenceObligation).toHaveLength(2);
    const scnC = balance.claimReconciliations.find((s) => s.claim === "SCN-C")!;
    expect(scnC.qualityCheckReconciliations.flatMap(linesOf).some((line) => line.qualityCheck === "integration" && line.outcome === "no-evidence-obligation")).toBe(true);
    expect(scnC.qualityCheckReconciliations.flatMap(linesOf).some((line) => line.qualityCheck === "integration" && line.outcome === "satisfied")).toBe(false);
  });

  it("renders corpus-driven columns — Fitness first, then the behavioural levels present (e2e/performance absent)", () => {
    const md = renderMarkdown(__er(balance, true), ctx, publishedExitCodeOf);
    expect(claimReconciliationsTable(md).evidenceColumns).toEqual(["Fitness", "Unit", "Integration"]);
    expect(md).not.toContain("| Performance |");
    expect(md).not.toContain(" E2e ");
  });

  it("encodes the four cell cases two-sided — named+met, named+missing, no-evidence-obligation, and absent", () => {
    const table = claimReconciliationsTable(renderMarkdown(__er(balance, true), ctx, publishedExitCodeOf));
    const evidence = (claim: string): string[] => table.evidenceOf(table.rowOf(claim));
    expect(evidence("SCN-A")).toEqual(["F/1", "U/2", ""]);
    expect(evidence("SCN-B")).toEqual(["", "U/-", ""]);
    expect(evidence("SCN-C")).toEqual(["", "U/1", "-/1"]);
    expect(evidence("SCN-D")).toEqual(["", "", "I/1"]);
    expect(evidence("SCN-E")).toEqual(["F/-", "", ""]);
  });

  it.each([
    ["[SCN-RPT-018] renders both cells for a scenario naming two behavioural tiers — neither reads as missing", "SCN-G", ["", "U/1", "I/1"]],
    ["renders -/N for an evidence observation at a PENDING pair — no-evidence-obligation, no evidence-obligation letter", "SCN-F", ["", "-/1", ""]],
  ])("%s", (_title, claim, evidence) => {
    const table = claimReconciliationsTable(renderMarkdown(__er(balance, true), ctx, publishedExitCodeOf));
    expect(table.evidenceOf(table.rowOf(claim))).toEqual(evidence);
  });

  const evidenceRowsOf = (table: ClaimReconciliationsTable): string[][] =>
    table.rows.map((row) => [row.claim, ...table.evidenceOf(row)]);

  const unnamedClaimItemsOf = (table: ClaimReconciliationsTable): string =>
    table.rowOf("(unnamed claim)").cell(RECONCILING_ITEMS_COLUMN);

  it("adds a column for a behavioural tier the corpus names but no run observed, lettered E for e2e and P for performance", () => {
    const named = reconcile(
      [
        { scnId: "SCN-U", evidenceObligations: [{ qualityCheck: "unit" }] },
        { scnId: "SCN-E", evidenceObligations: [{ qualityCheck: "e2e" }] },
        { scnId: "SCN-P", evidenceObligations: [{ qualityCheck: "performance" }] },
      ],
      [{ qualityCheck: "unit", scnId: "SCN-U", status: "passed" }]
    );
    const table = claimReconciliationsTable(renderMarkdown(__er(named, true), ctx, publishedExitCodeOf));
    expect(table.evidenceColumns).toEqual(["Unit", "E2e", "Performance"]);
    expect(evidenceRowsOf(table)).toEqual([
      ["SCN-U", "U/1", "", ""],
      ["SCN-E", "", "E/-", ""],
      ["SCN-P", "", "", "P/-"],
    ]);
  });

  const citesNoScenario = (qualityCheck: string): string =>
    `${qualityCheck}: ${OUTCOME_DESCRIPTION["cites-no-scenario"]}`;

  it.each([
    [
      "letters a shared code's rows from their obligations alone, and adds no column for a tier only its citing evidence carries, which shows on the unnamed claim",
      { qualityCheck: "integration", scnId: "SCN-D", status: "passed" },
      ["unit", "integration"],
    ],
    [
      "adds no Fitness column for a fitness observation citing a shared code, which shows on the unnamed claim as a unit test citing it does",
      { qualityCheck: "fitness", fitnessFunction: "guard-d", scnId: "SCN-D", exists: true, enforcedOverRealSource: true },
      ["fitness", "unit"],
    ],
  ] as const)("%s", (_title, citing, qualityChecks) => {
    const shared = reconcile(
      [
        { scnId: "SCN-D", evidenceObligations: [{ qualityCheck: "unit" }] },
        { scnId: "SCN-D", evidenceObligations: [{ qualityCheck: "unit" }] },
      ],
      [{ qualityCheck: "unit", scnId: "SCN-D", status: "passed" }, citing]
    );
    const table = claimReconciliationsTable(renderMarkdown(__er(shared, true), ctx, publishedExitCodeOf));
    expect(table.evidenceColumns).toEqual(["Unit"]);
    expect(evidenceRowsOf(table)).toEqual([
      ["SCN-D", "U/-"],
      ["SCN-D", "U/-"],
      ["(unnamed claim)", "—"],
    ]);
    for (const qualityCheck of qualityChecks) {
      expect(unnamedClaimItemsOf(table)).toContain(citesNoScenario(qualityCheck));
    }
  });

  it("adds a Fitness column with a blank cell for the shared code's row whose scenario's fitness obligation is pending", () => {
    const shared = reconcile(
      [
        { scnId: "SCN-D", evidenceObligations: [{ qualityCheck: "fitness", pending: true }] },
        { scnId: "SCN-D", evidenceObligations: [{ qualityCheck: "unit" }] },
      ],
      [{ qualityCheck: "unit", scnId: "SCN-D", status: "passed" }]
    );
    const table = claimReconciliationsTable(renderMarkdown(__er(shared, true), ctx, publishedExitCodeOf));
    expect(table.evidenceColumns).toEqual(["Fitness", "Unit"]);
    expect(evidenceRowsOf(table)).toEqual([
      ["SCN-D", "", ""],
      ["SCN-D", "", "U/-"],
      ["(unnamed claim)", "—", "—"],
    ]);
    expect(unnamedClaimItemsOf(table)).toContain(citesNoScenario("unit"));
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
    const table = claimReconciliationsTable(renderMarkdown(__er(fitness, true), ctx, publishedExitCodeOf));
    expect(table.evidenceColumns).toEqual(["Fitness", "Unit"]);
    expect(evidenceRowsOf(table)).toEqual([
      ["SCN-UNASKED", "-/1", "U/1"],
      ["SCN-PENDING", "-/1", ""],
      ["SCN-WATERMELON", "F/1", ""],
    ]);
  });

  it("takes no column from a phantom claim's row's evidence observations, and fills that row's evidence cells with —", () => {
    const ledgerWithPhantomClaimRow = reconcile(
      [{ scnId: "SCN-U", evidenceObligations: [{ qualityCheck: "unit" }] }],
      [
        { qualityCheck: "unit", scnId: "SCN-U", status: "passed" },
        { qualityCheck: "e2e", scnId: "SCN-GHOST", status: "passed" },
      ]
    );
    expect(ledgerWithPhantomClaimRow.claimReconciliations.map((s) => [s.claim, s.kind])).toEqual([
      ["SCN-U", "scenario"],
      ["SCN-GHOST", "phantom-claim"],
    ]);
    const table = claimReconciliationsTable(renderMarkdown(__er(ledgerWithPhantomClaimRow, true), ctx, publishedExitCodeOf));
    expect(table.evidenceColumns).toEqual(["Unit"]);
    expect(evidenceRowsOf(table)).toEqual([
      ["SCN-U", "U/1"],
      ["SCN-GHOST", "—"],
    ]);
  });
});

describe("[SCN-RPT-054] a fitness function whose step ran and failed shows as one observation in its Fitness cell, as a failed test does in its column", () => {
  const tableOf = (): ClaimReconciliationsTable => {
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
    const table = claimReconciliationsTable(renderMarkdown(__er(failed, true), ctx, publishedExitCodeOf));
    expect(table.evidenceColumns).toEqual(["Fitness", "Unit"]);
    return table;
  };

  it("counts the failed fitness observation in the Fitness cell, as the failed unit test counts in the Unit cell", () => {
    const table = tableOf();
    expect(table.evidenceOf(table.rowOf("SCN-FIT"))).toEqual(["F/1", ""]);
    expect(table.evidenceOf(table.rowOf("SCN-UNIT"))).toEqual(["", "U/1"]);
  });

  it("shows the failure in Verdict and Reconciling items, as for the failed unit test", () => {
    const table = tableOf();
    const fitnessVerdict = table.rowOf("SCN-FIT").cell(VERDICT_COLUMN);
    const fitnessItems = table.rowOf("SCN-FIT").cell(RECONCILING_ITEMS_COLUMN);
    const unitVerdict = table.rowOf("SCN-UNIT").cell(VERDICT_COLUMN);
    const unitItems = table.rowOf("SCN-UNIT").cell(RECONCILING_ITEMS_COLUMN);
    expect(fitnessVerdict).toBe(unitVerdict);
    expect(fitnessVerdict).toBe("out-of-balance");
    expect(unitItems.startsWith(`unit: ${OUTCOME_DESCRIPTION.failing}`)).toBe(true);
    expect(fitnessItems.startsWith(`fitness: ${OUTCOME_DESCRIPTION.failing}`)).toBe(true);
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

  const leafCellsOf = (md: string): string[] => {
    const sentences = new Set<string>(Object.values(OUTCOME_DESCRIPTION));
    return md
      .split("\n")
      .map((line) => line.split(" | ")[0]?.replace(/^\| /, "") ?? "")
      .filter((cell) => sentences.has(cell));
  };

  it("decomposes the Quality Check Reconciliation out-of-balance into exactly the ten leaf outcome rows, each opening with its outcome's sentence alone", () => {
    const md = renderMarkdown(__er(spanning), ctx, publishedExitCodeOf);
    for (const leaf of LEAVES) {
      expect(md).toContain(`\n| ${OUTCOME_DESCRIPTION[leaf]} |`);
    }
    expect(leafCellsOf(md).length).toBe(10);
  });

  it("renders a leaf row for EVERY Outcome member except satisfied (the exhaustiveness guard)", () => {
    const md = renderMarkdown(__er(spanning), ctx, publishedExitCodeOf);
    const rendered = new Set(leafCellsOf(md));
    for (const outcome of EXPECTED_LEAVES) {
      expect(rendered).toContain(OUTCOME_DESCRIPTION[outcome]);
    }
    expect(rendered.size).toBe(EXPECTED_LEAVES.length);
    expect(rendered).not.toContain(OUTCOME_DESCRIPTION.satisfied);
  });

  it("sums the leaf counts to the Quality Check Reconciliation out-of-balance total", () => {
    const md = renderMarkdown(__er(spanning), ctx, publishedExitCodeOf);
    const subject = CORE_MESSAGES[CoreMessage.QualityCheckReconciliationSubject].replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const qcrOutOfBalance = Number(
      new RegExp(`\\| ${subject} \\| \\d+ \\| \\d+ \\| (\\d+) \\|`).exec(md)?.[1]
    );
    expect(qcrOutOfBalance).toBe(3);
    let leafSum = 0;
    for (const leaf of LEAVES) {
      const gloss = OUTCOME_DESCRIPTION[leaf].replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const n = Number(new RegExp(`\\n\\| ${gloss} \\|[^\\d]*(\\d+) \\|`).exec(md)?.[1]);
      expect(Number.isNaN(n)).toBe(false);
      leafSum += n;
    }
    expect(leafSum).toBe(qcrOutOfBalance);
  });
});

describe("[SCN-RPT-069] the evidence grid counts only the evidence observations that ran, so a broken observation fills no cell and adds no column", () => {
  const ranNever = () => evidenceOfRunResult("never-reached-its-assertions")!;

  const gridOf = (scenarios: Scenario[], observations: EvidenceObservation[]): { columns: readonly string[]; cells: Map<string, string[]> } => {
    const table = claimReconciliationsTable(renderMarkdown(__er(reconcile(scenarios, observations), true), ctx, publishedExitCodeOf));
    return {
      columns: table.evidenceColumns,
      cells: new Map(table.rows.map((row): [string, string[]] => [row.claim, table.evidenceOf(row)])),
    };
  };

  it("reads U/- for a unit obligation whose only unit test never reached its assertions", () => {
    const grid = gridOf(
      [{ scnId: "SCN-U", evidenceObligations: [{ qualityCheck: "unit" }] }],
      [{ qualityCheck: "unit", scnId: "SCN-U", ...ranNever() }]
    );
    expect(grid.columns).toEqual(["Unit"]);
    expect(grid.cells.get("SCN-U")).toEqual(["U/-"]);
  });

  it("adds no E2e column for a broken e2e observation on a scenario that raises no e2e obligation", () => {
    const grid = gridOf(
      [{ scnId: "SCN-U", evidenceObligations: [{ qualityCheck: "unit" }] }],
      [
        { qualityCheck: "unit", scnId: "SCN-U", status: "passed" },
        { qualityCheck: "e2e", scnId: "SCN-U", ...ranNever() },
      ]
    );
    expect(grid.columns).toEqual(["Unit"]);
    expect(grid.cells.get("SCN-U")).toEqual(["U/1"]);
  });

  it("counts the observation that ran beside a broken one at the same check", () => {
    const grid = gridOf(
      [{ scnId: "SCN-U", evidenceObligations: [{ qualityCheck: "unit" }] }],
      [
        { qualityCheck: "unit", scnId: "SCN-U", ...ranNever() },
        { qualityCheck: "unit", scnId: "SCN-U", status: "passed" },
        { qualityCheck: "e2e", scnId: "SCN-U", ...ranNever() },
        { qualityCheck: "e2e", scnId: "SCN-U", status: "failed" },
      ]
    );
    expect(grid.columns).toEqual(["Unit", "E2e"]);
    expect(grid.cells.get("SCN-U")).toEqual(["U/1", "-/1"]);
  });
});
