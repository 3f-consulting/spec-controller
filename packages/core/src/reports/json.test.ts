import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { EvidenceReconciliation } from "../domain/evidenceReconciliation.js";
import { jsonReportOf } from "./json.js";
import { reconciled } from "./reconciledRun.test-utils.js";

const KINDS = ["unit", "integration", "e2e", "performance", "fitness"];

const OUTCOMES = ["satisfied", "failing", "cannot-fail", "missing", "no-claim-code", "duplicate-claim-code", "not-asked-for", "cites-unknown-claim", "cites-no-claim", "never-ran", "no-quality-check"];

describe("the JSON report keeps every part and every count, empty or zero", () => {
  it("[CLM-RPT-128] the JSON report of a run of passing unit tests alone has every part, the ones with nothing empty, and its totals have every kind, the row with no kind, and every outcome under each", () => {
    const run = reconciled({ scenarios: ["@unit @CLM-ONE-001"], unitTests: [["passed", "ONE-001"]] });
    const json = JSON.parse(jsonReportOf(run)) as EvidenceReconciliation;
    const { byKind, noKind } = json.totals.qualityCheckReconciliations;

    expect({
      errorsInTheInputs: json.errorsInTheInputs,
      runIntegrity: json.runIntegrity,
      stepAccount: json.stepAccount?.jobs,
      outOfBalanceByFeature: json.totals.outOfBalanceByFeature,
    }).toEqual({ errorsInTheInputs: { claimCodeErrors: [], configurationErrors: [] }, runIntegrity: { neverRan: [] }, stepAccount: [], outOfBalanceByFeature: [] });
    expect({
      kinds: new Set(byKind.map(({ kind }) => kind)),
      outcomes: [...byKind, noKind].map(({ byOutcome }) => Object.keys(byOutcome)),
      failing: byKind.find(({ kind }) => kind === "unit")?.byOutcome.failing,
      performance: byKind.find(({ kind }) => kind === "performance")?.evidenceObligations,
    }).toEqual({ kinds: new Set(KINDS), outcomes: [OUTCOMES, OUTCOMES, OUTCOMES, OUTCOMES, OUTCOMES, OUTCOMES], failing: 0, performance: 0 });
  });
});

describe("each report has the structure it promises", () => {
  it("[CLM-RPT-171] the JSON report names the version of the schema the package publishes", () => {
    const run = reconciled({ scenarios: ["@unit @CLM-ONE-001"], unitTests: [["passed", "ONE-001"]] });
    const schema = JSON.parse(readFileSync(new URL("../../../../schema/spec-reconciliation.schema.json", import.meta.url), "utf8")) as {
      definitions: { JsonReport: { properties: { schemaVersion: { const: unknown } } } };
    };

    expect((JSON.parse(jsonReportOf(run)) as { schemaVersion?: unknown }).schemaVersion).toBe(schema.definitions.JsonReport.properties.schemaVersion.const);
  });
});
