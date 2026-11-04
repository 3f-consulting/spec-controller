import { describe, it, expect } from "vitest";
import { assembleSavedReport, type SavedReport } from "./savedReport.js";
import { everyOutcomeCorpusJson } from "./everyOutcomeCorpus.test-utils.js";
import { RECONCILIATION_TOTALS_KEY } from "./reportReconciliationTotals.test-utils.js";

type Summary = Record<string, unknown>;

const withoutVerdict = ({ runVerdict: _verdict, ...rest }: Summary): Summary => rest;

interface SaveRow {
  readonly save: string;
  readonly reshape: (summary: Summary) => Summary;
}

const SAVES: readonly SaveRow[] = [
  { save: "a saved report holding no run verdict, as an earlier release wrote it", reshape: withoutVerdict },
  { save: "a saved report holding the run verdict last", reshape: (summary) => ({ ...withoutVerdict(summary), runVerdict: "unsound" }) },
  { save: "a saved report holding a stale run verdict first", reshape: (summary) => ({ runVerdict: "balanced", ...withoutVerdict(summary) }) },
];

describe("[SCN-RMD-029] the JSON report's summary states the run verdict first, on a fresh run and on a saved report concluded again", () => {
  it("a fresh run: the run verdict comes first and the rest of the summary keeps its order", () => {
    const report = JSON.parse(everyOutcomeCorpusJson()) as { readonly summary: Summary };

    expect(Object.keys(report.summary).filter((key) => key !== "scenarioCodes")).toEqual([
      "runVerdict",
      RECONCILIATION_TOTALS_KEY,
      "evidenceObservations",
      "stepAccounting",
      "outOfBalanceByFeature",
    ]);
    expect(report.summary.runVerdict).toBe("unsound");
  });

  for (const row of SAVES) {
    it(`${row.save}: the verdict worked out afresh comes first`, () => {
      const fresh = JSON.parse(everyOutcomeCorpusJson()) as SavedReport & { readonly summary: Summary };
      const saved = { ...fresh, summary: row.reshape(fresh.summary) } as SavedReport;

      const concluded = assembleSavedReport(saved, false);

      expect(Object.keys(concluded.summary)[0]).toBe("runVerdict");
      expect(concluded.summary.runVerdict).toBe("unsound");
    });
  }
});
