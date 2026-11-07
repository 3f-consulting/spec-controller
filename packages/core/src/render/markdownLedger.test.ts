import { describe, it, expect, beforeEach } from "vitest";
import { renderMarkdown } from "../assemble/composers.js";
import type { Ledger, Outcome } from "../model.js";
import { OUTCOME_DESCRIPTION, outcomeDescription } from "./outcomeDescription.js";
import { reconcile } from "../domain/evidenceReconciliation.js";
import { linesOf } from "../domain/claimReconciliation.js";
import type { EvidenceObservation, Scenario } from "../model.js";
import { CoreMessage } from "./messages.js";
import { coreMessage } from "./coreText.js";
import { markdownHeading } from "./heading.js";
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

describe("[CLM-RPT-011] the markdown ledger renders per-scenario evidence columns", () => {
  const scenarios: Scenario[] = [
    {
      claimCode: "CLM-A",
      evidenceObligations: [
        { qualityCheckKind: "unit" },
        { qualityCheckKind: "fitness" },
      ],
    },
    { claimCode: "CLM-B", evidenceObligations: [{ qualityCheckKind: "unit" }] },
    { claimCode: "CLM-C", evidenceObligations: [{ qualityCheckKind: "unit" }] },
    { claimCode: "CLM-D", evidenceObligations: [{ qualityCheckKind: "integration" }] },
    { claimCode: "CLM-E", evidenceObligations: [{ qualityCheckKind: "fitness" }] },
    { claimCode: "CLM-F", evidenceObligations: [{ qualityCheckKind: "unit", pending: true }] },
    { claimCode: "CLM-G", evidenceObligations: [{ qualityCheckKind: "unit" }, { qualityCheckKind: "integration" }] },
    { claimCode: "CLM-H", evidenceObligations: [{ qualityCheckKind: "fitness" }] },
  ];
  const observations: EvidenceObservation[] = [
    { qualityCheckKind: "unit", claimCode: "CLM-A", status: "passed" },
    { qualityCheckKind: "unit", claimCode: "CLM-A", status: "passed" },
    { qualityCheckKind: "unit", claimCode: "CLM-C", status: "passed" },
    { qualityCheckKind: "integration", claimCode: "CLM-C", status: "passed" },
    { qualityCheckKind: "integration", claimCode: "CLM-D", status: "passed" },
    { qualityCheckKind: "unit", claimCode: "CLM-F", status: "passed" },
    { qualityCheckKind: "fitness", fitnessFunction: "guard-x", claimCode: "CLM-A", exists: true, enforcedOverRealSource: true },
    { qualityCheckKind: "fitness", fitnessFunction: "guard-y", claimCode: "CLM-H", exists: true, enforcedOverRealSource: false },
    { qualityCheckKind: "unit", claimCode: "CLM-G", status: "passed" },
    { qualityCheckKind: "integration", claimCode: "CLM-G", status: "passed" },
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
    const claimC = balance.claimReconciliations.find((s) => s.claim === "CLM-C")!;
    expect(claimC.qualityCheckReconciliations.flatMap(linesOf).some((line) => line.qualityCheckKind === "integration" && line.outcome === "no-evidence-obligation")).toBe(true);
    expect(claimC.qualityCheckReconciliations.flatMap(linesOf).some((line) => line.qualityCheckKind === "integration" && line.outcome === "satisfied")).toBe(false);
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
    expect(evidence("CLM-A")).toEqual(["F/1", "U/2", ""]);
    expect(evidence("CLM-B")).toEqual(["", "U/-", ""]);
    expect(evidence("CLM-C")).toEqual(["", "U/1", "-/1"]);
    expect(evidence("CLM-D")).toEqual(["", "", "I/1"]);
    expect(evidence("CLM-E")).toEqual(["F/-", "", ""]);
  });

  it.each([
    ["[CLM-RPT-018] renders both cells for a scenario naming two layers — neither reads as missing", "CLM-G", ["", "U/1", "I/1"]],
    ["renders -/N for an evidence observation at a PENDING pair — no-evidence-obligation, no evidence-obligation letter", "CLM-F", ["", "-/1", ""]],
  ])("%s", (_title, claim, evidence) => {
    const table = claimReconciliationsTable(renderMarkdown(__er(balance, true), ctx, publishedExitCodeOf));
    expect(table.evidenceOf(table.rowOf(claim))).toEqual(evidence);
  });

  const evidenceRowsOf = (table: ClaimReconciliationsTable): string[][] =>
    table.rows.map((row) => [row.claim, ...table.evidenceOf(row)]);

  const unnamedClaimItemsOf = (table: ClaimReconciliationsTable): string =>
    table.rowOf("(unnamed claim)").cell(RECONCILING_ITEMS_COLUMN());

  it("adds a column for a behavioural layer the corpus names but no run observed, lettered E for e2e and P for performance", () => {
    const named = reconcile(
      [
        { claimCode: "CLM-U", evidenceObligations: [{ qualityCheckKind: "unit" }] },
        { claimCode: "CLM-E", evidenceObligations: [{ qualityCheckKind: "e2e" }] },
        { claimCode: "CLM-P", evidenceObligations: [{ qualityCheckKind: "performance" }] },
      ],
      [{ qualityCheckKind: "unit", claimCode: "CLM-U", status: "passed" }]
    );
    const table = claimReconciliationsTable(renderMarkdown(__er(named, true), ctx, publishedExitCodeOf));
    expect(table.evidenceColumns).toEqual(["Unit", "E2e", "Performance"]);
    expect(evidenceRowsOf(table)).toEqual([
      ["CLM-U", "U/1", "", ""],
      ["CLM-E", "", "E/-", ""],
      ["CLM-P", "", "", "P/-"],
    ]);
  });

  const citesNoScenario = (qualityCheckKind: string): string =>
    `${qualityCheckKind}: ${outcomeDescription("cites-no-scenario")}`;

  it.each([
    [
      "letters a shared code's rows from their obligations alone, and adds no column for a layer only its citing evidence carries, which shows on the unnamed claim",
      { qualityCheckKind: "integration", claimCode: "CLM-D", status: "passed" },
      ["unit", "integration"],
    ],
    [
      "adds no Fitness column for a fitness observation citing a shared code, which shows on the unnamed claim as a unit test citing it does",
      { qualityCheckKind: "fitness", fitnessFunction: "guard-d", claimCode: "CLM-D", exists: true, enforcedOverRealSource: true },
      ["fitness", "unit"],
    ],
  ] as const)("%s", (_title, citing, qualityCheckKinds) => {
    const shared = reconcile(
      [
        { claimCode: "CLM-D", evidenceObligations: [{ qualityCheckKind: "unit" }] },
        { claimCode: "CLM-D", evidenceObligations: [{ qualityCheckKind: "unit" }] },
      ],
      [{ qualityCheckKind: "unit", claimCode: "CLM-D", status: "passed" }, citing]
    );
    const table = claimReconciliationsTable(renderMarkdown(__er(shared, true), ctx, publishedExitCodeOf));
    expect(table.evidenceColumns).toEqual(["Unit"]);
    expect(evidenceRowsOf(table)).toEqual([
      ["CLM-D", "U/-"],
      ["CLM-D", "U/-"],
      ["(unnamed claim)", "—"],
    ]);
    for (const qualityCheckKind of qualityCheckKinds) {
      expect(unnamedClaimItemsOf(table)).toContain(citesNoScenario(qualityCheckKind));
    }
  });

  it("letters the Fitness cell of a shared code's row that raises a fitness obligation, as the key reads any obligation", () => {
    const shared = reconcile(
      [
        { claimCode: "CLM-D", evidenceObligations: [{ qualityCheckKind: "fitness" }] },
        { claimCode: "CLM-D", evidenceObligations: [{ qualityCheckKind: "unit" }] },
      ],
      [{ qualityCheckKind: "unit", claimCode: "CLM-D", status: "passed" }]
    );
    const table = claimReconciliationsTable(renderMarkdown(__er(shared, true), ctx, publishedExitCodeOf));
    expect(table.evidenceColumns).toEqual(["Fitness", "Unit"]);
    expect(evidenceRowsOf(table)).toEqual([
      ["CLM-D", "F/-", ""],
      ["CLM-D", "", "U/-"],
      ["(unnamed claim)", "—", "—"],
    ]);
    expect(unnamedClaimItemsOf(table)).toContain(citesNoScenario("unit"));
  });

  it("letters the Fitness cell only for a scenario that raises a fitness obligation that is not pending, however its one fitness observation reconciles", () => {
    const fitness = reconcile(
      [
        { claimCode: "CLM-UNASKED", evidenceObligations: [{ qualityCheckKind: "unit" }] },
        { claimCode: "CLM-PENDING", evidenceObligations: [{ qualityCheckKind: "fitness", pending: true }] },
        { claimCode: "CLM-WATERMELON", evidenceObligations: [{ qualityCheckKind: "fitness" }] },
      ],
      [
        { qualityCheckKind: "unit", claimCode: "CLM-UNASKED", status: "passed" },
        { qualityCheckKind: "fitness", fitnessFunction: "guard-a", claimCode: "CLM-UNASKED", exists: true, enforcedOverRealSource: true },
        { qualityCheckKind: "fitness", fitnessFunction: "guard-b", claimCode: "CLM-PENDING", exists: true, enforcedOverRealSource: true },
        { qualityCheckKind: "fitness", fitnessFunction: "guard-c", claimCode: "CLM-WATERMELON", exists: true, enforcedOverRealSource: false },
      ]
    );
    const table = claimReconciliationsTable(renderMarkdown(__er(fitness, true), ctx, publishedExitCodeOf));
    expect(table.evidenceColumns).toEqual(["Fitness", "Unit"]);
    expect(evidenceRowsOf(table)).toEqual([
      ["CLM-UNASKED", "-/1", "U/1"],
      ["CLM-PENDING", "-/1", ""],
      ["CLM-WATERMELON", "F/1", ""],
    ]);
  });

  it("takes no column from a phantom claim's row's evidence observations, and fills that row's evidence cells with —", () => {
    const ledgerWithPhantomClaimRow = reconcile(
      [{ claimCode: "CLM-U", evidenceObligations: [{ qualityCheckKind: "unit" }] }],
      [
        { qualityCheckKind: "unit", claimCode: "CLM-U", status: "passed" },
        { qualityCheckKind: "e2e", claimCode: "CLM-GHOST", status: "passed" },
      ]
    );
    expect(ledgerWithPhantomClaimRow.claimReconciliations.map((s) => [s.claim, s.kind])).toEqual([
      ["CLM-U", "scenario"],
      ["CLM-GHOST", "phantom-claim"],
    ]);
    const table = claimReconciliationsTable(renderMarkdown(__er(ledgerWithPhantomClaimRow, true), ctx, publishedExitCodeOf));
    expect(table.evidenceColumns).toEqual(["Unit"]);
    expect(evidenceRowsOf(table)).toEqual([
      ["CLM-U", "U/1"],
      ["CLM-GHOST", "—"],
    ]);
  });
});

describe("[CLM-RPT-054] a fitness function whose step ran and failed shows as one observation in its Fitness cell, as a failed test does in its column", () => {
  const tableOf = (): ClaimReconciliationsTable => {
    const failed = reconcile(
      [
        { claimCode: "CLM-FIT", evidenceObligations: [{ qualityCheckKind: "fitness" }] },
        { claimCode: "CLM-UNIT", evidenceObligations: [{ qualityCheckKind: "unit" }] },
      ],
      [
        { qualityCheckKind: "fitness", fitnessFunction: "lint:fails", claimCode: "CLM-FIT", exists: true, enforcedOverRealSource: true, status: "failed" },
        { qualityCheckKind: "unit", claimCode: "CLM-UNIT", status: "failed" },
      ]
    );
    const table = claimReconciliationsTable(renderMarkdown(__er(failed, true), ctx, publishedExitCodeOf));
    expect(table.evidenceColumns).toEqual(["Fitness", "Unit"]);
    return table;
  };

  it("counts the failed fitness observation in the Fitness cell, as the failed unit test counts in the Unit cell", () => {
    const table = tableOf();
    expect(table.evidenceOf(table.rowOf("CLM-FIT"))).toEqual(["F/1", ""]);
    expect(table.evidenceOf(table.rowOf("CLM-UNIT"))).toEqual(["", "U/1"]);
  });

  it("shows the failure in Verdict and Reconciling items, as for the failed unit test", () => {
    const table = tableOf();
    const fitnessVerdict = table.rowOf("CLM-FIT").cell(VERDICT_COLUMN());
    const fitnessItems = table.rowOf("CLM-FIT").cell(RECONCILING_ITEMS_COLUMN());
    const unitVerdict = table.rowOf("CLM-UNIT").cell(VERDICT_COLUMN());
    const unitItems = table.rowOf("CLM-UNIT").cell(RECONCILING_ITEMS_COLUMN());
    expect(fitnessVerdict).toBe(unitVerdict);
    expect(fitnessVerdict).toBe("out-of-balance");
    expect(unitItems.startsWith(`unit: ${outcomeDescription("failing")}`)).toBe(true);
    expect(fitnessItems.startsWith(`fitness: ${outcomeDescription("failing")}`)).toBe(true);
  });
});

const spanningLedger = (): Ledger =>
  reconcile(
    [
      { claimCode: "CLM-A", evidenceObligations: [{ qualityCheckKind: "unit" }] },
      { claimCode: "CLM-C", evidenceObligations: [] },
    ],
    [{ qualityCheckKind: "unit", claimCode: null, status: "passed", locator: "tests/stray.test.ts:1" }]
  );

describe("[CLM-RPT-019] the Reconciliation totals section lists the ten leaf outcomes summing to the Reconciliation line out-of-balance total", () => {
  let spanning: Ledger;
  beforeEach(() => {
    spanning = spanningLedger();
  });

  const LEAVES = [
    "missing",
    "failing",
    "watermelon",
    "no-claim-code",
    "duplicate-claim-code",
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
    "no-claim-code": true,
    "duplicate-claim-code": true,
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
    const sentences = new Set<string>((Object.keys(OUTCOME_DESCRIPTION) as Outcome[]).map(outcomeDescription));
    return md
      .split("\n")
      .map((line) => line.split(" | ")[0]?.replace(/^\| /, "") ?? "")
      .filter((cell) => sentences.has(cell));
  };

  it("decomposes the Reconciliation line out-of-balance into exactly the ten leaf outcome rows, each opening with its outcome's sentence alone", () => {
    const md = renderMarkdown(__er(spanning), ctx, publishedExitCodeOf);
    for (const leaf of LEAVES) {
      expect(md).toContain(`\n| ${outcomeDescription(leaf)} |`);
    }
    expect(leafCellsOf(md).length).toBe(10);
  });

  it("renders a leaf row for EVERY Outcome member except satisfied (the exhaustiveness guard)", () => {
    const md = renderMarkdown(__er(spanning), ctx, publishedExitCodeOf);
    const rendered = new Set(leafCellsOf(md));
    for (const outcome of EXPECTED_LEAVES) {
      expect(rendered).toContain(outcomeDescription(outcome));
    }
    expect(rendered.size).toBe(EXPECTED_LEAVES.length);
    expect(rendered).not.toContain(outcomeDescription("satisfied"));
  });

  it("sums the leaf counts to the Reconciliation line out-of-balance total", () => {
    const md = renderMarkdown(__er(spanning), ctx, publishedExitCodeOf);
    const subject = coreMessage(CoreMessage.ReconciliationLineSubject).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const qcrOutOfBalance = Number(
      new RegExp(`\\| ${subject} \\| \\d+ \\| \\d+ \\| (\\d+) \\|`).exec(md)?.[1]
    );
    expect(qcrOutOfBalance).toBe(3);
    let leafSum = 0;
    for (const leaf of LEAVES) {
      const gloss = outcomeDescription(leaf).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const n = Number(new RegExp(`\\n\\| ${gloss} \\|[^\\d]*(\\d+) \\|`).exec(md)?.[1]);
      expect(Number.isNaN(n)).toBe(false);
      leafSum += n;
    }
    expect(leafSum).toBe(qcrOutOfBalance);
  });
});

describe("[CLM-RPT-099] the Reconciliation totals section lists no group rows among the leaf outcomes", () => {
  let spanning: Ledger;
  beforeEach(() => {
    spanning = spanningLedger();
  });

  it("lists only the ten cause rows after the Reconciliation line row, with no debit-side, credit-side or neither-side subtotal row", () => {
    const lines = renderMarkdown(__er(spanning), ctx, publishedExitCodeOf).split("\n");
    const heading = lines.indexOf(markdownHeading(3, coreMessage(CoreMessage.ReconciliationTotalsHeading)));
    const subjectRow = `| ${coreMessage(CoreMessage.ReconciliationLineSubject)} |`;
    const start = lines.findIndex((line, i) => i > heading && line.startsWith(subjectRow));
    const end = lines.findIndex((line, i) => i > start && !line.startsWith("|"));
    expect(heading).toBeGreaterThan(-1);
    expect(start).toBeGreaterThan(heading);
    expect(end).toBeGreaterThan(start);
    const firstCells = lines.slice(start + 1, end).map((line) => line.split(" | ")[0]?.replace(/^\| /, ""));
    const causes = (Object.keys(OUTCOME_DESCRIPTION) as Outcome[])
      .filter((outcome) => outcome !== "satisfied")
      .map((outcome) => outcomeDescription(outcome));
    expect(causes.length).toBe(10);
    expect([...firstCells].sort()).toEqual([...causes].sort());
  });
});

describe("[CLM-RPT-069] the evidence grid counts only the evidence observations that ran, so a broken observation fills no cell and adds no column", () => {
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
      [{ claimCode: "CLM-U", evidenceObligations: [{ qualityCheckKind: "unit" }] }],
      [{ qualityCheckKind: "unit", claimCode: "CLM-U", ...ranNever() }]
    );
    expect(grid.columns).toEqual(["Unit"]);
    expect(grid.cells.get("CLM-U")).toEqual(["U/-"]);
  });

  it("adds no E2e column for a broken e2e observation on a scenario that raises no e2e obligation", () => {
    const grid = gridOf(
      [{ claimCode: "CLM-U", evidenceObligations: [{ qualityCheckKind: "unit" }] }],
      [
        { qualityCheckKind: "unit", claimCode: "CLM-U", status: "passed" },
        { qualityCheckKind: "e2e", claimCode: "CLM-U", ...ranNever() },
      ]
    );
    expect(grid.columns).toEqual(["Unit"]);
    expect(grid.cells.get("CLM-U")).toEqual(["U/1"]);
  });

  it("counts the observation that ran beside a broken one at the same check", () => {
    const grid = gridOf(
      [{ claimCode: "CLM-U", evidenceObligations: [{ qualityCheckKind: "unit" }] }],
      [
        { qualityCheckKind: "unit", claimCode: "CLM-U", ...ranNever() },
        { qualityCheckKind: "unit", claimCode: "CLM-U", status: "passed" },
        { qualityCheckKind: "e2e", claimCode: "CLM-U", ...ranNever() },
        { qualityCheckKind: "e2e", claimCode: "CLM-U", status: "failed" },
      ]
    );
    expect(grid.columns).toEqual(["Unit", "E2e"]);
    expect(grid.cells.get("CLM-U")).toEqual(["U/1", "-/1"]);
  });
});
