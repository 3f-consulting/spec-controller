import { describe, it, expect, beforeEach } from "vitest";
import { renderMarkdown } from "../assemble/composers.js";
import { reconcile } from "../domain/evidenceReconciliation.js";
import type { Ledger } from "../model.js";
import { CORE_MESSAGES, CoreMessage } from "./messages.js";
import { sampleReportCtx as ctx } from "./runContext.test-utils.js";
import { __er } from "../evidenceReconciliation.test-utils.js";
import { publishedExitCodeOf } from "./publishedExitCodes.test-utils.js";
import { claimReconciliationsTable } from "./claimReconciliationsTable.test-utils.js";

const KEY = [
  "Key: each evidence cell reads *obligation*/*observations*.",
  "- The letter says the scenario's tags raise an Evidence Obligation of that kind: (F)itness, (U)nit, (I)ntegration, (E)2e, (P)erformance. The table has a column only for a kind some row obligates or observes. `-` means none is raised, or the obligation is pending.",
  "- The number counts the Evidence Observations posted to the scenario for that kind. `-` means none.",
  "- For example, `U/2` is a unit obligation answered by two unit tests; `U/-` is a unit obligation that no unit test answered; `-/1` is one unit test citing a scenario that asks for no unit evidence, or whose unit evidence is pending.",
  "- A blank cell means neither; `—` marks a row that is not a scenario of the corpus: a cited code no feature declares, or evidence that cites no scenario.",
  "- A row named `feature file : scenario title` is a scenario that carries no @SCN code. The run reads none of its tags, so its evidence cells are blank, and its reconciling item says that no Evidence Observation can link to it.",
  "- In Reconciling items, `—` means the row has no reconciling item, and *untagged* means the scenario carries no tag that raises an Evidence Obligation, though it may carry an @SCN code.",
  "- On the unnamed claim's row, the counts after an item, such as `1 ran, 1 passed, 0 failed`, are of that item's own tests; a broken item stands alone and is counted in none.",
  "- CI steps names the CI steps behind each kind of quality check the row obligates or observes, whether or not any Evidence Observation of that kind ran for the row: `U/-` beside a step names the step that runs unit tests, none of which answered this row.",
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
});
