import { describe, it, expect } from "vitest";
import { everyOutcomeCorpusJson } from "./everyOutcomeCorpus.test-utils.js";
import { RECONCILIATION_TOTALS_KEY } from "./reportReconciliationTotals.test-utils.js";

type Summary = Record<string, unknown>;

describe("[CLM-RMD-029] the JSON report's summary states the run verdict first", () => {
  it("a fresh run: the run verdict comes first and the rest of the summary keeps its order", () => {
    const report = JSON.parse(everyOutcomeCorpusJson()) as { readonly summary: Summary };

    expect(Object.keys(report.summary).filter((key) => key !== "claimCodes")).toEqual([
      "runVerdict",
      RECONCILIATION_TOTALS_KEY,
      "evidenceObservations",
      "stepAccounting",
      "outOfBalanceByFeature",
    ]);
    expect(report.summary.runVerdict).toBe("unsound");
  });
});
