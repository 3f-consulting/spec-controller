import { describe, it, expect, beforeEach } from "vitest";
import { renderMarkdown } from "../assemble/composers.js";
import { reconcile } from "../domain/evidenceReconciliation.js";
import type { Ledger } from "../model.js";
import { CoreMessage } from "./messages.js";
import { sampleReportCtx as ctx } from "./runContext.test-utils.js";
import { __er } from "../evidenceReconciliation.test-utils.js";
import { publishedExitCodeOf } from "./publishedExitCodes.test-utils.js";
import { claimReconciliationsTable } from "./claimReconciliationsTable.test-utils.js";
import { coreMessage } from "./coreText.js";
import { markdownHeading } from "./heading.js";

const keyLines = (): string[] => [
  ...coreMessage(CoreMessage.EvidenceCellKey).split("\n"),
  coreMessage(CoreMessage.CannotFailItemKey),
];

describe("[CLM-RPT-044] a reader finds a key to the evidence cells before the Claim Reconciliations table, and none where the table has no evidence cell", () => {
  let ledger: Ledger;
  beforeEach(() => {
    ledger = reconcile(
      [
        { claimCode: "CLM-LDG-001", evidenceObligations: [{ qualityCheckKind: "unit" }] },
        { claimCode: "CLM-LDG-002", evidenceObligations: [{ qualityCheckKind: "unit" }] },
      ],
      [{ qualityCheckKind: "unit", claimCode: "CLM-LDG-001", status: "passed" }]
    );
  });
  const sectionOf = (md: string): string[] => {
    const lines = md.split("\n");
    return lines.slice(lines.indexOf(markdownHeading(2, coreMessage(CoreMessage.ClaimReconciliationsHeading))));
  };

  it("renders the key after the tally lines and before a table that carries an evidence column", () => {
    const section = sectionOf(renderMarkdown(__er(ledger, true), ctx, publishedExitCodeOf));
    const expected = [
      markdownHeading(2, coreMessage(CoreMessage.ClaimReconciliationsHeading)),
      "",
      `- ${coreMessage(CoreMessage.ClaimReconciliationTally, { total: 2, balanced: 1, outOfBalance: 1 })}`,
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
