import { describe, it, expect, beforeEach } from "vitest";
import { renderMarkdown } from "../assemble/composers.js";
import { reconcile } from "../domain/evidenceReconciliation.js";
import type { Ledger } from "../model.js";
import { CORE_MESSAGES, CoreMessage } from "./messages.js";
import { sampleReportCtx as ctx } from "./runContext.test-utils.js";
import { __er } from "../evidenceReconciliation.test-utils.js";
import { publishedExitCodeOf } from "./publishedExitCodes.test-utils.js";
import { claimReconciliationsTable } from "./claimReconciliationsTable.test-utils.js";

const keyLines = (): string[] => [
  ...CORE_MESSAGES[CoreMessage.EvidenceCellKey].split("\n"),
  CORE_MESSAGES[CoreMessage.WatermelonItemKey],
];

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
});
