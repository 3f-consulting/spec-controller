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

const KEY = [
  "Key: each evidence cell reads *obligation*/*observations*.",
  "- The letter says the scenario's tags raise an Evidence Obligation of that kind: (F)itness, (U)nit, (I)ntegration, (E)2e, (P)erformance. `-` means none is raised, or the obligation is pending.",
  "- The number counts the scenario's Evidence Observations of that kind that ran. `-` means none.",
  "- For example, `U/2` is a unit obligation answered by two unit tests; `U/-` is a unit obligation that no unit test answered; `-/1` is one unit test citing a scenario that asks for no unit evidence, or whose unit evidence is pending.",
  "- A blank cell means no obligation and no Evidence Observation that ran; `—` marks the row of a phantom claim or of the unnamed claim.",
  "- A row named `feature file : scenario title` is a scenario that carries no @SCN code. The run reads none of its tags, so its evidence cells are blank, and its reconciling item says that no Evidence Observation can link to it.",
  "- In Reconciling items, `—` means the row has no reconciling item, and *untagged* means a scenario that carries an @SCN code and no tag that raises an Evidence Obligation.",
  "- On the unnamed claim's row, the counts after an item, such as `1 ran, 1 passed, 0 failed`, are of that item's own tests, and a fitness item counts its CI steps; a broken item stands alone and is counted in none.",
  "- CI steps names the steps the Evidence observations table gives for each kind of quality check other than fitness that the row obligates or observes, whether or not an Evidence Observation of that kind ran for the row, and the step each of the row's fitness Evidence Observations names: `U/-` beside a step names the step that runs unit tests, none of which answered this row. A blank CI steps cell means no such step is known.",
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
    expect(section.slice(0, 14)).toEqual([
      CORE_MESSAGES[CoreMessage.ClaimReconciliationsHeading],
      "",
      `- ${CORE_MESSAGES[CoreMessage.ClaimReconciliationTally](2, 1, 1)}`,
      "",
      ...KEY,
      "",
    ]);
    const table = claimReconciliationsTable(section);
    expect(table.start).toBe(14);
    expect(table.evidenceColumns).toEqual(["Unit"]);
  });

  it("renders no line of the key when the table carries no evidence column", () => {
    const md = renderMarkdown(__er(ledger, false), ctx, publishedExitCodeOf);
    const table = claimReconciliationsTable(sectionOf(md));
    expect(table.start).toBe(4);
    expect(table.evidenceColumns).toEqual([]);
    for (const line of KEY) expect(md).not.toContain(line);
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
