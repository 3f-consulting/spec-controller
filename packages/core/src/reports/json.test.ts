import { describe, expect, it } from "vitest";
import type { Totals } from "../domain/evidenceReconciliation.js";
import { jsonReportOf } from "./json.js";
import { reconciled } from "./reconciledRun.test-utils.js";

const KINDS = ["unit", "integration", "e2e", "performance", "fitness"];

describe("a run of passing unit tests alone still lists every kind of quality check in the JSON, at 0", () => {
  it("[CLM-RPT-128] the JSON totals of a run of passing unit tests alone list every kind of quality check, the ones the run had none of at 0", () => {
    const run = reconciled({ scenarios: ["@unit @CLM-ONE-001"], unitTests: [["passed", "ONE-001"]] });
    const { byKind } = (JSON.parse(jsonReportOf(run)) as { readonly totals: Totals }).totals.qualityCheckReconciliations;

    expect(byKind.map(({ kind, evidenceObligations, evidenceObservations }) => ({ kind, evidenceObligations, evidenceObservations }))).toEqual(
      KINDS.map((kind) => ({ kind, evidenceObligations: kind === "unit" ? 1 : 0, evidenceObservations: kind === "unit" ? 1 : 0 })),
    );
  });
});
