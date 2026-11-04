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
        { qualityCheckKind: "unit" },
        { qualityCheckKind: "fitness" },
      ],
    },
    { scnId: "SCN-B", evidenceObligations: [{ qualityCheckKind: "unit" }] },
    { scnId: "SCN-C", evidenceObligations: [{ qualityCheckKind: "unit" }] },
    { scnId: "SCN-D", evidenceObligations: [{ qualityCheckKind: "integration" }] },
    { scnId: "SCN-E", evidenceObligations: [{ qualityCheckKind: "fitness" }] },
    { scnId: "SCN-F", evidenceObligations: [{ qualityCheckKind: "unit", pending: true }] },
    { scnId: "SCN-G", evidenceObligations: [{ qualityCheckKind: "unit" }, { qualityCheckKind: "integration" }] },
    { scnId: "SCN-H", evidenceObligations: [{ qualityCheckKind: "fitness" }] },
  ];
  const observations: EvidenceObservation[] = [
    { qualityCheckKind: "unit", scnId: "SCN-A", status: "passed" },
    { qualityCheckKind: "unit", scnId: "SCN-A", status: "passed" },
    { qualityCheckKind: "unit", scnId: "SCN-C", status: "passed" },
    { qualityCheckKind: "integration", scnId: "SCN-C", status: "passed" },
    { qualityCheckKind: "integration", scnId: "SCN-D", status: "passed" },
    { qualityCheckKind: "unit", scnId: "SCN-F", status: "passed" },
    { qualityCheckKind: "fitness", fitnessFunction: "guard-x", scnId: "SCN-A", exists: true, enforcedOverRealSource: true },
    { qualityCheckKind: "fitness", fitnessFunction: "guard-y", scnId: "SCN-H", exists: true, enforcedOverRealSource: false },
    { qualityCheckKind: "unit", scnId: "SCN-G", status: "passed" },
    { qualityCheckKind: "integration", scnId: "SCN-G", status: "passed" },
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
    expect(scnC.qualityCheckReconciliations.flatMap(linesOf).some((line) => line.qualityCheckKind === "integration" && line.outcome === "no-evidence-obligation")).toBe(true);
    expect(scnC.qualityCheckReconciliations.flatMap(linesOf).some((line) => line.qualityCheckKind === "integration" && line.outcome === "satisfied")).toBe(false);
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
    ["[SCN-RPT-018] renders both cells for a scenario naming two layers — neither reads as missing", "SCN-G", ["", "U/1", "I/1"]],
    ["renders -/N for an evidence observation at a PENDING pair — no-evidence-obligation, no evidence-obligation letter", "SCN-F", ["", "-/1", ""]],
  ])("%s", (_title, claim, evidence) => {
    const table = claimReconciliationsTable(renderMarkdown(__er(balance, true), ctx, publishedExitCodeOf));
    expect(table.evidenceOf(table.rowOf(claim))).toEqual(evidence);
  });

  const evidenceRowsOf = (table: ClaimReconciliationsTable): string[][] =>
    table.rows.map((row) => [row.claim, ...table.evidenceOf(row)]);

  const unnamedClaimItemsOf = (table: ClaimReconciliationsTable): string =>
    table.rowOf("(unnamed claim)").cell(RECONCILING_ITEMS_COLUMN);

  it("adds a column for a behavioural layer the corpus names but no run observed, lettered E for e2e and P for performance", () => {
    const named = reconcile(
      [
        { scnId: "SCN-U", evidenceObligations: [{ qualityCheckKind: "unit" }] },
        { scnId: "SCN-E", evidenceObligations: [{ qualityCheckKind: "e2e" }] },
        { scnId: "SCN-P", evidenceObligations: [{ qualityCheckKind: "performance" }] },
      ],
      [{ qualityCheckKind: "unit", scnId: "SCN-U", status: "passed" }]
    );
    const table = claimReconciliationsTable(renderMarkdown(__er(named, true), ctx, publishedExitCodeOf));
    expect(table.evidenceColumns).toEqual(["Unit", "E2e", "Performance"]);
    expect(evidenceRowsOf(table)).toEqual([
      ["SCN-U", "U/1", "", ""],
      ["SCN-E", "", "E/-", ""],
      ["SCN-P", "", "", "P/-"],
    ]);
  });

  const citesNoScenario = (qualityCheckKind: string): string =>
    `${qualityCheckKind}: ${OUTCOME_DESCRIPTION["cites-no-scenario"]}`;

  it.each([
    [
      "letters a shared code's rows from their obligations alone, and adds no column for a layer only its citing evidence carries, which shows on the unnamed claim",
      { qualityCheckKind: "integration", scnId: "SCN-D", status: "passed" },
      ["unit", "integration"],
    ],
    [
      "adds no Fitness column for a fitness observation citing a shared code, which shows on the unnamed claim as a unit test citing it does",
      { qualityCheckKind: "fitness", fitnessFunction: "guard-d", scnId: "SCN-D", exists: true, enforcedOverRealSource: true },
      ["fitness", "unit"],
    ],
  ] as const)("%s", (_title, citing, qualityCheckKinds) => {
    const shared = reconcile(
      [
        { scnId: "SCN-D", evidenceObligations: [{ qualityCheckKind: "unit" }] },
        { scnId: "SCN-D", evidenceObligations: [{ qualityCheckKind: "unit" }] },
      ],
      [{ qualityCheckKind: "unit", scnId: "SCN-D", status: "passed" }, citing]
    );
    const table = claimReconciliationsTable(renderMarkdown(__er(shared, true), ctx, publishedExitCodeOf));
    expect(table.evidenceColumns).toEqual(["Unit"]);
    expect(evidenceRowsOf(table)).toEqual([
      ["SCN-D", "U/-"],
      ["SCN-D", "U/-"],
      ["(unnamed claim)", "—"],
    ]);
    for (const qualityCheckKind of qualityCheckKinds) {
      expect(unnamedClaimItemsOf(table)).toContain(citesNoScenario(qualityCheckKind));
    }
  });

  it("adds a Fitness column with a blank cell for the shared code's row whose scenario's fitness obligation is pending", () => {
    const shared = reconcile(
      [
        { scnId: "SCN-D", evidenceObligations: [{ qualityCheckKind: "fitness", pending: true }] },
        { scnId: "SCN-D", evidenceObligations: [{ qualityCheckKind: "unit" }] },
      ],
      [{ qualityCheckKind: "unit", scnId: "SCN-D", status: "passed" }]
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
        { scnId: "SCN-UNASKED", evidenceObligations: [{ qualityCheckKind: "unit" }] },
        { scnId: "SCN-PENDING", evidenceObligations: [{ qualityCheckKind: "fitness", pending: true }] },
        { scnId: "SCN-WATERMELON", evidenceObligations: [{ qualityCheckKind: "fitness" }] },
      ],
      [
        { qualityCheckKind: "unit", scnId: "SCN-UNASKED", status: "passed" },
        { qualityCheckKind: "fitness", fitnessFunction: "guard-a", scnId: "SCN-UNASKED", exists: true, enforcedOverRealSource: true },
        { qualityCheckKind: "fitness", fitnessFunction: "guard-b", scnId: "SCN-PENDING", exists: true, enforcedOverRealSource: true },
        { qualityCheckKind: "fitness", fitnessFunction: "guard-c", scnId: "SCN-WATERMELON", exists: true, enforcedOverRealSource: false },
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
      [{ scnId: "SCN-U", evidenceObligations: [{ qualityCheckKind: "unit" }] }],
      [
        { qualityCheckKind: "unit", scnId: "SCN-U", status: "passed" },
        { qualityCheckKind: "e2e", scnId: "SCN-GHOST", status: "passed" },
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
        { scnId: "SCN-FIT", evidenceObligations: [{ qualityCheckKind: "fitness" }] },
        { scnId: "SCN-UNIT", evidenceObligations: [{ qualityCheckKind: "unit" }] },
      ],
      [
        { qualityCheckKind: "fitness", fitnessFunction: "lint:fails", scnId: "SCN-FIT", exists: true, enforcedOverRealSource: true, status: "failed" },
        { qualityCheckKind: "unit", scnId: "SCN-UNIT", status: "failed" },
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

const spanningLedger = (): Ledger =>
  reconcile(
    [
      { scnId: "SCN-A", evidenceObligations: [{ qualityCheckKind: "unit" }] },
      { scnId: "SCN-C", evidenceObligations: [] },
    ],
    [{ qualityCheckKind: "unit", scnId: null, status: "passed", locator: "tests/stray.test.ts:1" }]
  );

describe("[SCN-RPT-019] the Reconciliation totals section lists the ten leaf outcomes summing to the Reconciliation line out-of-balance total", () => {
  let spanning: Ledger;
  beforeEach(() => {
    spanning = spanningLedger();
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

  it("decomposes the Reconciliation line out-of-balance into exactly the ten leaf outcome rows, each opening with its outcome's sentence alone", () => {
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

  it("sums the leaf counts to the Reconciliation line out-of-balance total", () => {
    const md = renderMarkdown(__er(spanning), ctx, publishedExitCodeOf);
    const subject = CORE_MESSAGES[CoreMessage.ReconciliationLineSubject].replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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

describe("[SCN-RPT-099] the Reconciliation totals section lists no group rows among the leaf outcomes", () => {
  let spanning: Ledger;
  beforeEach(() => {
    spanning = spanningLedger();
  });

  it("lists only the ten cause rows after the Reconciliation line row, with no debit-side, credit-side or neither-side subtotal row", () => {
    const lines = renderMarkdown(__er(spanning), ctx, publishedExitCodeOf).split("\n");
    const heading = lines.indexOf(CORE_MESSAGES[CoreMessage.ReconciliationTotalsHeading]);
    const subjectRow = `| ${CORE_MESSAGES[CoreMessage.ReconciliationLineSubject]} |`;
    const start = lines.findIndex((line, i) => i > heading && line.startsWith(subjectRow));
    const end = lines.findIndex((line, i) => i > start && !line.startsWith("|"));
    expect(heading).toBeGreaterThan(-1);
    expect(start).toBeGreaterThan(heading);
    expect(end).toBeGreaterThan(start);
    const firstCells = lines.slice(start + 1, end).map((line) => line.split(" | ")[0]?.replace(/^\| /, ""));
    const causes = (Object.keys(OUTCOME_DESCRIPTION) as Outcome[])
      .filter((outcome) => outcome !== "satisfied")
      .map((outcome) => OUTCOME_DESCRIPTION[outcome]);
    expect(causes.length).toBe(10);
    expect([...firstCells].sort()).toEqual([...causes].sort());
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
      [{ scnId: "SCN-U", evidenceObligations: [{ qualityCheckKind: "unit" }] }],
      [{ qualityCheckKind: "unit", scnId: "SCN-U", ...ranNever() }]
    );
    expect(grid.columns).toEqual(["Unit"]);
    expect(grid.cells.get("SCN-U")).toEqual(["U/-"]);
  });

  it("adds no E2e column for a broken e2e observation on a scenario that raises no e2e obligation", () => {
    const grid = gridOf(
      [{ scnId: "SCN-U", evidenceObligations: [{ qualityCheckKind: "unit" }] }],
      [
        { qualityCheckKind: "unit", scnId: "SCN-U", status: "passed" },
        { qualityCheckKind: "e2e", scnId: "SCN-U", ...ranNever() },
      ]
    );
    expect(grid.columns).toEqual(["Unit"]);
    expect(grid.cells.get("SCN-U")).toEqual(["U/1"]);
  });

  it("counts the observation that ran beside a broken one at the same check", () => {
    const grid = gridOf(
      [{ scnId: "SCN-U", evidenceObligations: [{ qualityCheckKind: "unit" }] }],
      [
        { qualityCheckKind: "unit", scnId: "SCN-U", ...ranNever() },
        { qualityCheckKind: "unit", scnId: "SCN-U", status: "passed" },
        { qualityCheckKind: "e2e", scnId: "SCN-U", ...ranNever() },
        { qualityCheckKind: "e2e", scnId: "SCN-U", status: "failed" },
      ]
    );
    expect(grid.columns).toEqual(["Unit", "E2e"]);
    expect(grid.cells.get("SCN-U")).toEqual(["U/1", "-/1"]);
  });
});
