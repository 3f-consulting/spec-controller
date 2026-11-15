import { describe, expect, it } from "vitest";
import type { Totals } from "../domain/evidenceReconciliation.js";
import { jsonReportOf } from "./json.js";
import { reconciled } from "./reconciledRun.test-utils.js";

const KINDS = ["unit", "integration", "e2e", "performance", "fitness"];

const OUTCOMES = ["satisfied", "failing", "cannot-fail", "missing", "no-claim-code", "duplicate-claim-code", "not-asked-for", "cites-unknown-claim", "cites-no-claim", "never-ran", "no-quality-check"];

describe("a run of passing unit tests alone still has the JSON count failing and performance, at 0", () => {
  it("[CLM-RPT-128] the JSON totals of a run of passing unit tests have every kind, the row with no kind, and every outcome under each", () => {
    const run = reconciled({ scenarios: ["@unit @CLM-ONE-001"], unitTests: [["passed", "ONE-001"]] });
    const { byKind, noKind } = (JSON.parse(jsonReportOf(run)) as { readonly totals: Totals }).totals.qualityCheckReconciliations;

    expect({
      kinds: byKind.map(({ kind }) => kind),
      outcomes: [...byKind, noKind].map(({ byOutcome }) => Object.keys(byOutcome)),
      failing: byKind.find(({ kind }) => kind === "unit")?.byOutcome.failing,
      performance: byKind.find(({ kind }) => kind === "performance")?.evidenceObligations,
    }).toEqual({ kinds: KINDS, outcomes: [OUTCOMES, OUTCOMES, OUTCOMES, OUTCOMES, OUTCOMES, OUTCOMES], failing: 0, performance: 0 });
  });
});
