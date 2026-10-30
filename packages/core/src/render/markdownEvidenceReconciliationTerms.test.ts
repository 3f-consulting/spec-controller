import { describe, it, expect } from "vitest";
import { renderMarkdown } from "../assemble/composers.js";
import { reconcile } from "../domain/evidenceReconciliation.js";
import { sampleReportCtx as ctx } from "./runContext.test-utils.js";
import { __er } from "../evidenceReconciliation.test-utils.js";
import { publishedExitCodeOf } from "./publishedExitCodes.test-utils.js";

const TERMS = [
  "- A Claim Reconciliation is one row of the ledger: the evidence for one claim, a scenario, a phantom claim or the unnamed claim, reconciled quality check by quality check.",
  "- A Reconciliation line is one line of a Quality Check Reconciliation, the evidence of one quality check within a claim, with its own outcome: each Evidence Observation it holds is one, so is its Evidence Obligation when no Evidence Observation that ran answers it, and so is a scenario's quality check that has neither. A scenario whose one Evidence Obligation two passing tests answer adds one to the Claim Reconciliation total and two to the Reconciliation line total.",
  "- An Evidence Obligation is what a scenario asks for: one for each quality check its tags name, met by Evidence Observations. A quality check its tags name as pending raises none.",
  "- An Evidence Observation is one reported result of a test or a fitness function, attributed by the code it cites: to that scenario, to a phantom claim when no scenario carries the code, or to the unnamed claim when it cites none. One that never reached its assertions is broken: it was reported, but did not run to a result.",
];

function linesBeforeTable(md: string): string[] {
  const lines = md.split("\n");
  const heading = lines.indexOf("### Evidence reconciliation");
  const header = lines.findIndex((line, i) => i > heading && line.startsWith("| Subject |"));
  return lines.slice(heading + 1, header);
}

function reconciliationLineTotal(md: string): number {
  const row = md.split("\n").find((line) => line.startsWith("| Reconciliation line |"));
  return Number(row?.split("|")[2]?.trim());
}

describe("[SCN-RPT-071] the evidence reconciliation section says what a Claim Reconciliation, a Reconciliation line, an Evidence Obligation and an Evidence Observation are before its table", () => {
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

  it("counts, under the Reconciliation line definition's rule, the Reconciliation line total the table prints", () => {
    const ledger = reconcile(
      [
        { scnId: "SCN-A", evidenceObligations: [{ qualityCheck: "unit" }, { qualityCheck: "integration" }] },
        { scnId: "SCN-B", evidenceObligations: [{ qualityCheck: "unit" }, { qualityCheck: "integration", pending: true }] },
        { scnId: "SCN-C", evidenceObligations: [] },
        { scnId: "SCN-D", evidenceObligations: [{ qualityCheck: "unit" }] },
      ],
      [
        { qualityCheck: "unit", scnId: "SCN-D", status: "failed", broken: true },
        { qualityCheck: "unit", scnId: "SCN-D", status: "passed" },
        { qualityCheck: "e2e", scnId: "SCN-D", status: "passed" },
        { qualityCheck: "unit", scnId: null, status: "passed" },
      ],
      ["fixture.feature : a scenario with no code"],
    );
    const linesByRule = {
      twoUnansweredObligations: 2,
      unansweredObligationBesidePendingTier: 1,
      scenarioWithNoTags: 1,
      brokenAndPassingObservationsPlusUnaskedCheck: 3,
      uncitedObservation: 1,
      scenarioWithNoCode: 1,
    };
    const byRule = Object.values(linesByRule).reduce((sum, n) => sum + n, 0);

    expect(byRule).toBe(9);
    expect(reconciliationLineTotal(renderMarkdown(__er(ledger), ctx, publishedExitCodeOf))).toBe(byRule);
  });
});
