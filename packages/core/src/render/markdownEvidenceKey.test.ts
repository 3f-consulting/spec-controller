import { describe, it, expect, beforeEach } from "vitest";
import { renderMarkdown } from "../assemble/composers.js";
import { reconcile } from "../domain/evidenceReconciliation.js";
import type { ClaimReconciliation, Ledger, QualityCheckKind } from "../model.js";
import { CORE_MESSAGES, CoreMessage } from "./messages.js";
import { sampleReportCtx as ctx } from "./runContext.test-utils.js";
import { __er } from "../evidenceReconciliation.test-utils.js";
import { publishedExitCodeOf } from "./publishedExitCodes.test-utils.js";
import { RECONCILING_ITEMS_COLUMN, claimReconciliationsTable } from "./claimReconciliationsTable.test-utils.js";
import { everyRowKind } from "./everyRowKind.test-utils.js";
import { UNNAMED_CLAIM_ID, obligationsOf, reconcilingItemsOf } from "../domain/claimReconciliation.js";
import { QUALITY_CHECK_KINDS } from "../domain/journal.js";
import { SCN_CODE } from "../domain/featureCode.js";

const keyLines = (): string[] => [
  ...CORE_MESSAGES[CoreMessage.EvidenceCellKey].split("\n"),
  CORE_MESSAGES[CoreMessage.WatermelonItemKey],
];

const heldOf = (row: ClaimReconciliation) => row.qualityCheckReconciliations.flatMap((q) => q.evidenceObservations ?? []);

const obligates = (row: ClaimReconciliation, kind: QualityCheckKind): boolean =>
  obligationsOf(row).some((o) => o.qualityCheckKind === kind && o.pending !== true);

function keyedCellOf(row: ClaimReconciliation, column: string): string {
  if (row.kind !== "scenario") return "—";
  const kind = column.toLowerCase() as QualityCheckKind;
  const ran = heldOf(row).filter((o) => o.qualityCheckKind === kind && o.broken !== true).length;
  if (!obligates(row, kind) && ran === 0) return "";
  return `${obligates(row, kind) ? column.charAt(0) : "-"}/${ran > 0 ? ran : "-"}`;
}

type SummarySteps = readonly { readonly qualityCheckKind: QualityCheckKind; readonly ciSteps?: readonly string[] }[];

function keyedStepsOf(row: ClaimReconciliation, summarySteps: SummarySteps): Set<string> {
  const held = heldOf(row);
  const fitnessSteps = held.flatMap((o) => (o.qualityCheckKind === "fitness" && "step" in o && o.step !== undefined ? [o.step] : []));
  const layers = QUALITY_CHECK_KINDS.filter(
    (kind) => kind !== "fitness" && (obligates(row, kind) || held.some((o) => o.qualityCheckKind === kind)),
  );
  const layerSteps = layers.flatMap((kind) => summarySteps.find((entry) => entry.qualityCheckKind === kind)?.ciSteps ?? []);
  return new Set([...fitnessSteps, ...layerSteps]);
}

describe("[SCN-RPT-044] a reader finds a key to the evidence cells before the Claim Reconciliations table, and none where the table has no evidence cell", () => {
  let ledger: Ledger;
  beforeEach(() => {
    ledger = reconcile(
      [
        { scnId: "SCN-LDG-001", evidenceObligations: [{ qualityCheckKind: "unit" }] },
        { scnId: "SCN-LDG-002", evidenceObligations: [{ qualityCheckKind: "unit" }] },
      ],
      [{ qualityCheckKind: "unit", scnId: "SCN-LDG-001", status: "passed" }]
    );
  });
  const sectionOf = (md: string): string[] => {
    const lines = md.split("\n");
    return lines.slice(lines.indexOf(CORE_MESSAGES[CoreMessage.ClaimReconciliationsHeading]));
  };

  it("renders the key after the tally lines and before a table that carries an evidence column", () => {
    const section = sectionOf(renderMarkdown(__er(ledger, true), ctx, publishedExitCodeOf));
    const expected = [
      CORE_MESSAGES[CoreMessage.ClaimReconciliationsHeading],
      "",
      `- ${CORE_MESSAGES[CoreMessage.ClaimReconciliationTally](2, 1, 1)}`,
      "",
      ...keyLines(),
      "",
    ];
    expect(section.slice(0, expected.length)).toEqual(expected);
    const table = claimReconciliationsTable(section);
    expect(table.start).toBe(expected.length);
    expect(table.evidenceColumns).toEqual(["Unit"]);
  });

  it("renders no line of the key when the table carries no evidence column", () => {
    const md = renderMarkdown(__er(ledger, false), ctx, publishedExitCodeOf);
    const table = claimReconciliationsTable(sectionOf(md));
    expect(table.start).toBe(4);
    expect(table.evidenceColumns).toEqual([]);
    for (const line of keyLines()) expect(md).not.toContain(line);
  });
  it("holds each line of the key, cell by cell, on a ledger holding every kind of row the table can show", () => {
    const reconciliation = everyRowKind();
    const rows = reconciliation.ledger.claimReconciliations;
    const table = claimReconciliationsTable(renderMarkdown(reconciliation, ctx, publishedExitCodeOf));
    const summarySteps = reconciliation.summary.evidenceObservations?.byQualityCheckKind ?? [];
    const shownOf = (row: ClaimReconciliation) => table.rowsOf(row.claim)[rows.filter((r) => r.claim === row.claim).indexOf(row)]!;

    expect(table.rows).toHaveLength(rows.length);
    expect(table.rowOf("SCN-ROW-010").cell("Integration")).toBe("");
    for (const row of rows) {
      const shown = shownOf(row);
      for (const column of table.evidenceColumns) expect(shown.cell(column), `${row.claim} ${column}`).toBe(keyedCellOf(row, column));
      const items = shown.cell(RECONCILING_ITEMS_COLUMN);
      expect(items === "—").toBe(reconcilingItemsOf(row).length === 0 && row.pendingItems.length === 0);
      if (items.includes("untagged")) expect([SCN_CODE.test(row.claim), obligationsOf(row)]).toEqual([true, []]);
      const named = shown.cell("CI steps");
      expect(new Set(named === "" ? [] : named.split(", ")), row.claim).toEqual(keyedStepsOf(row, summarySteps));
    }

    const unnamed = rows.find((row) => row.kind === "unnamed-claim")!;
    const fitness = unnamed.qualityCheckReconciliations.flatMap((q) => (q.qualityCheckKind === "fitness" ? q.evidenceObservations ?? [] : []));
    expect(table.rowOf(UNNAMED_CLAIM_ID).cell(RECONCILING_ITEMS_COLUMN)).toContain(`— ${fitness.length} CI step`);
    expect(rows.filter((row) => shownOf(row).cell(RECONCILING_ITEMS_COLUMN).includes("untagged"))).toHaveLength(1);
  });
});
