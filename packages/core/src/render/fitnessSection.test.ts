import { describe, it, expect } from "vitest";
import { renderMarkdown } from "../assemble/composers.js";
import { reconcile, summaryOf } from "../domain/evidenceReconciliation.js";
import type { EvidenceReconciliation } from "../domain/evidenceReconciliation.js";
import { parseScenarios } from "../parse/scenarioReaders.test-utils.js";
import { ciStepRecordObservations } from "../parse/ciStepRecord.js";
import type { StepRecord } from "../parse/ciStepRecord.js";
import { CORE_MESSAGES, CoreMessage } from "./messages.js";
import { OUTCOME_DESCRIPTION } from "./outcomeDescription.js";
import type { EvidenceObservation } from "../model.js";
import type { RunContext } from "../domain/runProvenance.js";

const ctx: RunContext = {
  target: "fitness-section-target",
  inputs: { features: "specs/features" },
  corpus: "specs/features",
  runStart: new Date("2026-10-05T19:00:00.000Z"),
  sourceSha: "4086f00dc0ffeeba110000000000000000deadbe",
  toolSha: "4086aaaa71ace511efdb2511276284b4cb50c247",
  toolVersion: "0.1.0",
};

const FEATURE = `Feature: the fitness evidence obligations

  @fitness @SCN-FNS-001
  Scenario: a check that passes on CI

  @unit @SCN-FNS-002
  Scenario: a behaviour proved by a unit test

  @fitness @SCN-FNS-003
  Scenario: a check that fails on CI
`;

const UNIT: EvidenceObservation = {
  qualityCheck: "unit",
  scnId: "SCN-FNS-002",
  status: "passed",
  locator: "src/b.test.ts",
};

function render(feature: string, ciSteps: StepRecord): string[] {
  const ledger = reconcile(parseScenarios(feature), [...ciStepRecordObservations(ciSteps), UNIT]);
  const reconciliation: EvidenceReconciliation = { summary: summaryOf(ledger, false, false), ledger };
  return renderMarkdown(reconciliation, ctx).split("\n");
}

function fitnessLines(lines: string[]): string[] {
  const start = lines.indexOf(CORE_MESSAGES[CoreMessage.FitnessHeading]);
  expect(start).toBeGreaterThanOrEqual(0);
  const end = lines.findIndex((line, i) => i > start && line.startsWith("#"));
  expect(end).toBeGreaterThan(start);
  return lines.slice(start, end);
}

const SATISFIED_ROW = OUTCOME_DESCRIPTION.satisfied;
const FAILING_ROW = OUTCOME_DESCRIPTION.failing;

describe("[SCN-RPT-005] the markdown report lists the fitness evidence obligations as their own section", () => {
  it("renders heading, blank, total line, blank, header, separator, one row per fitness obligation naming its scenario, then one blank", () => {
    const lines = render(FEATURE, {
      "SCN-FNS-001": { outcome: "success" },
      "SCN-FNS-003": { outcome: "failure" },
    });

    expect(fitnessLines(lines)).toEqual([
      CORE_MESSAGES[CoreMessage.FitnessHeading],
      "",
      CORE_MESSAGES[CoreMessage.FitnessSatisfiedOf](1, 2),
      "",
      CORE_MESSAGES[CoreMessage.FitnessTableHeader],
      "| --- | --- |",
      `| SCN-FNS-001 | ${SATISFIED_ROW} |`,
      `| SCN-FNS-003 | ${FAILING_ROW} |`,
      "",
    ]);
  });
});
