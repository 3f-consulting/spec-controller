import { describe, it, expect } from "vitest";
import { renderMarkdown } from "../assemble/composers.js";
import { reconcile } from "../domain/evidenceReconciliation.js";
import { sampleReportCtx as ctx } from "./runContext.test-utils.js";
import { __er } from "../evidenceReconciliation.test-utils.js";
import { publishedExitCodeOf } from "./publishedExitCodes.test-utils.js";

const TERMS = [
  "- A Claim Reconciliation is one row of the ledger: the evidence for one claim, a scenario, a phantom claim or the unnamed claim, reconciled quality check by quality check.",
  "- A Quality Check Reconciliation is one quality check's evidence within a claim. A claim holds one for each quality check its evidence names, so a scenario tagged both unit and integration adds one to the Claim Reconciliation total and two to the Quality Check Reconciliation total.",
  "- An Evidence Obligation is what a scenario asks for: one for each quality check its tags name, met by Evidence Observations.",
  "- An Evidence Observation is a test or a fitness function that ran, attributed to the scenario it cites.",
];

function linesBeforeTable(md: string): string[] {
  const lines = md.split("\n");
  const heading = lines.indexOf("### Evidence reconciliation");
  const header = lines.findIndex((line, i) => i > heading && line.startsWith("| Subject |"));
  return lines.slice(heading + 1, header);
}

describe("[SCN-RPT-071] the evidence reconciliation section says what a Claim Reconciliation, a Quality Check Reconciliation, an Evidence Obligation and an Evidence Observation are before its table", () => {
  it("prints the four definitions as a list between the heading and the table, the same on every ledger, with no count and nothing bold", () => {
    const small = reconcile(
      [{ scnId: "SCN-A", evidenceObligations: [{ qualityCheck: "unit" }] }],
      [{ qualityCheck: "unit", scnId: "SCN-A", status: "passed" }],
    );
    const large = reconcile(
      [
        { scnId: "SCN-A", evidenceObligations: [{ qualityCheck: "unit" }, { qualityCheck: "integration" }] },
        { scnId: "SCN-B", evidenceObligations: [{ qualityCheck: "unit" }] },
        { scnId: "SCN-C", evidenceObligations: [{ qualityCheck: "fitness" }] },
      ],
      [
        { qualityCheck: "unit", scnId: "SCN-A", status: "passed" },
        { qualityCheck: "unit", scnId: "SCN-Z", status: "failed" },
      ],
    );

    const smallLines = linesBeforeTable(renderMarkdown(__er(small), ctx, publishedExitCodeOf));
    const largeLines = linesBeforeTable(renderMarkdown(__er(large), ctx, publishedExitCodeOf));

    expect(smallLines).toEqual(["", ...TERMS, ""]);
    expect(largeLines).toEqual(smallLines);
    for (const line of largeLines) {
      expect(line).not.toMatch(/[0-9]/);
      expect(line).not.toContain("**");
    }
  });
});
