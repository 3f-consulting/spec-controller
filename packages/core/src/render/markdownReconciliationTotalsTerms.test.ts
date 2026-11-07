import { describe, it, expect } from "vitest";
import { renderMarkdown } from "../assemble/composers.js";
import { reconcile } from "../domain/evidenceReconciliation.js";
import { CoreMessage } from "./messages.js";
import { coreMessage } from "./coreText.js";
import { markdownHeading } from "./heading.js";
import { sampleReportCtx as ctx } from "./runContext.test-utils.js";
import { __er } from "../evidenceReconciliation.test-utils.js";
import { publishedExitCodeOf } from "./publishedExitCodes.test-utils.js";

const TERMS = (): string[] => [
  `- ${coreMessage(CoreMessage.ReconciliationTotalsClaimReconciliationTerm)}`,
  `- ${coreMessage(CoreMessage.ReconciliationTotalsReconciliationLineTerm)}`,
  `- ${coreMessage(CoreMessage.ReconciliationTotalsEvidenceObligationTerm)}`,
  `- ${coreMessage(CoreMessage.ReconciliationTotalsEvidenceObservationTerm)}`,
];

function linesBeforeTable(md: string): string[] {
  const lines = md.split("\n");
  const heading = lines.indexOf(markdownHeading(3, coreMessage(CoreMessage.ReconciliationTotalsHeading)));
  const header = lines.findIndex((line, i) => i > heading && line.startsWith("| Subject |"));
  return lines.slice(heading + 1, header);
}

function totalOf(md: string, subject: string): number {
  const row = md.split("\n").find((line) => line.startsWith(`| ${subject} |`));
  return Number(row?.split("|")[2]?.trim());
}

describe("[SCN-RPT-071] the Reconciliation totals section says what a Claim Reconciliation, a Reconciliation line, an Evidence Obligation and an Evidence Observation are before its table", () => {
  it("prints the four definitions as a list between the heading and the table, the same on a one-scenario ledger and on one holding a phantom claim and the unnamed claim, with no count and nothing bold", () => {
    const small = reconcile(
      [{ claimCode: "SCN-A", evidenceObligations: [{ qualityCheckKind: "unit" }] }],
      [{ qualityCheckKind: "unit", claimCode: "SCN-A", status: "passed" }],
    );
    const large = reconcile(
      [{ claimCode: "SCN-A", evidenceObligations: [{ qualityCheckKind: "unit" }] }],
      [
        { qualityCheckKind: "unit", claimCode: "SCN-A", status: "passed" },
        { qualityCheckKind: "unit", claimCode: "SCN-Z", status: "failed" },
        { qualityCheckKind: "unit", claimCode: null, status: "passed" },
      ],
    );

    const smallLines = linesBeforeTable(renderMarkdown(__er(small), ctx, publishedExitCodeOf));
    const largeLines = linesBeforeTable(renderMarkdown(__er(large), ctx, publishedExitCodeOf));

    expect(new Set(large.claimReconciliations.map((r) => r.kind))).toEqual(
      new Set(["scenario", "phantom-claim", "unnamed-claim"]),
    );
    expect(smallLines).toEqual(["", ...TERMS(), ""]);
    expect(largeLines).toEqual(smallLines);
    for (const line of largeLines) {
      expect(line).not.toMatch(/[0-9]/);
      expect(line).not.toContain("**");
    }
  });

  it("prints, for the worked example its Reconciliation line definition states, one Claim Reconciliation and two Reconciliation lines", () => {
    const ledger = reconcile(
      [{ claimCode: "SCN-A", evidenceObligations: [{ qualityCheckKind: "unit" }] }],
      [
        { qualityCheckKind: "unit", claimCode: "SCN-A", status: "passed" },
        { qualityCheckKind: "unit", claimCode: "SCN-A", status: "passed" },
      ],
    );
    const md = renderMarkdown(__er(ledger), ctx, publishedExitCodeOf);

    expect(totalOf(md, coreMessage(CoreMessage.ClaimReconciliationSubject))).toBe(1);
    expect(totalOf(md, coreMessage(CoreMessage.ReconciliationLineSubject))).toBe(2);
  });
});
