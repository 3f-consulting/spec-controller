import { describe, it, expect, beforeEach } from "vitest";
import { renderMarkdown } from "../assemble/composers.js";
import { reconcile } from "../domain/evidenceReconciliation.js";
import type { Ledger } from "../model.js";
import { CORE_MESSAGES, CoreMessage } from "./messages.js";
import { sampleReportCtx as ctx } from "./runContext.test-utils.js";
import { __er } from "../evidenceReconciliation.test-utils.js";

const KEY = [
  "Key: each evidence cell reads *obligation*/*observations*.",
  "- The letter says the scenario's tags raise an Evidence Obligation of that kind: (F)itness, (U)nit, (I)ntegration, (E)2e, (P)erformance. `-` means none is raised, or the obligation is pending.",
  "- The number counts the Evidence Observations posted to the scenario for that kind. `-` means none.",
  "- For example, `U/2` is a unit obligation answered by two unit tests; `U/-` is a unit obligation that no unit test answered; `-/1` is one unit test citing a scenario that asks for no unit evidence, or whose unit evidence is pending.",
  "- A blank cell means neither; `—` marks a row that is not a scenario of the corpus: a cited code no feature declares, or evidence that cites no scenario.",
  "- In Reconciling items, `—` means the row has no reconciling item.",
];

describe("[SCN-RPT-044] a reader finds a key to the evidence cells before the Claim Reconciliations table, and none where the table has no evidence cell", () => {
  let ledger: Ledger;
  beforeEach(() => {
    ledger = reconcile(
      [
        { scnId: "SCN-LDG-001", evidenceObligations: [{ qualityCheck: "unit" }] },
        { scnId: "SCN-LDG-002", evidenceObligations: [{ qualityCheck: "unit" }] },
      ],
      [{ qualityCheck: "unit", scnId: "SCN-LDG-001", status: "passed" }]
    );
  });
  const sectionOf = (md: string): string[] => {
    const lines = md.split("\n");
    return lines.slice(lines.indexOf(CORE_MESSAGES[CoreMessage.ClaimReconciliationsHeading]));
  };

  it("renders the key after the tally lines and before a table that carries an evidence column", () => {
    const section = sectionOf(renderMarkdown(__er(ledger, true), ctx));
    const header = `| ${[
      CORE_MESSAGES[CoreMessage.ScenarioColumn],
      "Unit",
      CORE_MESSAGES[CoreMessage.VerdictColumn],
      CORE_MESSAGES[CoreMessage.ReconcilingItemsColumn],
    ].join(" | ")} |`;
    expect(section.slice(0, 12)).toEqual([
      CORE_MESSAGES[CoreMessage.ClaimReconciliationsHeading],
      "",
      `- ${CORE_MESSAGES[CoreMessage.ClaimReconciliationTally](2, 1, 1)}`,
      "",
      ...KEY,
      "",
      header,
    ]);
  });

  it("renders no line of the key when the table carries no evidence column", () => {
    const md = renderMarkdown(__er(ledger, false), ctx);
    expect(sectionOf(md)[4]).toBe(
      `| ${[
        CORE_MESSAGES[CoreMessage.ScenarioColumn],
        CORE_MESSAGES[CoreMessage.VerdictColumn],
        CORE_MESSAGES[CoreMessage.ReconcilingItemsColumn],
      ].join(" | ")} |`
    );
    for (const line of KEY) expect(md).not.toContain(line);
  });
});
