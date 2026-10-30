import { describe, it, expect } from "vitest";
import { renderMarkdown } from "../assemble/composers.js";
import { reconcile, summaryOf } from "../domain/evidenceReconciliation.js";
import type { EvidenceReconciliation } from "../domain/evidenceReconciliation.js";
import { parseScenarios } from "../parse/scenarioReaders.test-utils.js";
import { ciStepRecordObservations } from "../parse/ciStepRecord.js";
import type { StepRecord } from "../parse/ciStepRecord.js";
import { CORE_MESSAGES, CoreMessage } from "./messages.js";
import { OUTCOME_DESCRIPTION } from "./outcomeDescription.js";
import type { EvidenceObservation, Ledger } from "../model.js";
import { fitnessTally } from "../domain/ledger.js";
import type { RunContext } from "../domain/runProvenance.js";
import { FEATURES, VITEST, PYTEST, JEST, JUNIT, RSPEC, CUCUMBER, CI, PACKAGE_JSON, CI_STEPS } from "../runInputs.test-utils.js";
import { publishedExitCodeOf } from "./publishedExitCodes.test-utils.js";

const ctx: RunContext = {
  target: "fitness-section-target",
  inputs: [{ ...FEATURES, path: "specs/features" }, VITEST, PYTEST, JEST, JUNIT, RSPEC, CUCUMBER, CI, PACKAGE_JSON, CI_STEPS],
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
  const reconciliation: EvidenceReconciliation = { summary: summaryOf(ledger, false), ledger };
  return renderMarkdown(reconciliation, ctx, publishedExitCodeOf).split("\n");
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

describe("[SCN-RPT-068] the fitness evidence obligations count only the obligations scenarios raise, and each obligation's row names every Reconciliation line it holds, no line picked for it", () => {
  const BEHAVIOURAL_ONLY = `Feature: no fitness evidence obligation

  @unit @SCN-FNS-002
  Scenario: a behaviour proved by a unit test
`;

  function reconciled(feature: string, ciSteps: StepRecord): Ledger {
    return reconcile(parseScenarios(feature), [...ciStepRecordObservations(ciSteps), UNIT]);
  }

  it("counts a fitness obligation whose check step never ran as one obligation, its row naming its missing line and its broken one", () => {
    const ciSteps: StepRecord = { "SCN-FNS-001": { outcome: "skipped" } };
    const oneFitnessObligation = `Feature: one fitness evidence obligation

  @fitness @SCN-FNS-001
  Scenario: a check whose step never ran

  @unit @SCN-FNS-002
  Scenario: a behaviour proved by a unit test
`;

    expect(fitnessTally(reconciled(oneFitnessObligation, ciSteps))).toEqual({ satisfied: 0, total: 1 });
    expect(fitnessLines(render(oneFitnessObligation, ciSteps))).toEqual([
      CORE_MESSAGES[CoreMessage.FitnessHeading],
      "",
      CORE_MESSAGES[CoreMessage.FitnessSatisfiedOf](0, 1),
      "",
      CORE_MESSAGES[CoreMessage.FitnessTableHeader],
      "| --- | --- |",
      `| SCN-FNS-001 | ${OUTCOME_DESCRIPTION.missing}; ${OUTCOME_DESCRIPTION.broken} |`,
      "",
    ]);
  });

  it("adds no obligation and no section for a broken fitness observation on a row that raises no fitness obligation", () => {
    const ciSteps: StepRecord = { "SCN-FNS-002": { outcome: "skipped" } };

    expect(fitnessTally(reconciled(BEHAVIOURAL_ONLY, ciSteps))).toEqual({ satisfied: 0, total: 0 });
    const lines = render(BEHAVIOURAL_ONLY, ciSteps);
    expect(lines).not.toContain(CORE_MESSAGES[CoreMessage.FitnessHeading]);
    expect(lines.some((line) => line.includes("fitness evidence obligations reconcile satisfied"))).toBe(false);
  });

  it("names every Reconciliation line of a fitness obligation on its row, in evidence order, whatever order its observations arrive in", () => {
    const failed: EvidenceObservation = { qualityCheck: "fitness", fitnessFunction: "lint:failed", scnId: "SCN-FNS-001", exists: true, enforcedOverRealSource: true, status: "failed" };
    const watermelon: EvidenceObservation = { qualityCheck: "fitness", fitnessFunction: "lint:watermelon", scnId: "SCN-FNS-001", exists: true, enforcedOverRealSource: false };
    const scenarios = [{ scnId: "SCN-FNS-001", evidenceObligations: [{ qualityCheck: "fitness" as const }] }];

    for (const observations of [[failed, watermelon], [watermelon, failed]]) {
      const ledger = reconcile(scenarios, observations);
      const reconciliation: EvidenceReconciliation = { summary: summaryOf(ledger, false), ledger };
      const lines = renderMarkdown(reconciliation, ctx, publishedExitCodeOf).split("\n");

      expect(fitnessTally(ledger)).toEqual({ satisfied: 0, total: 1 });
      expect(fitnessLines(lines)).toEqual([
        CORE_MESSAGES[CoreMessage.FitnessHeading],
        "",
        CORE_MESSAGES[CoreMessage.FitnessSatisfiedOf](0, 1),
        "",
        CORE_MESSAGES[CoreMessage.FitnessTableHeader],
        "| --- | --- |",
        `| SCN-FNS-001 | ${OUTCOME_DESCRIPTION.watermelon}; ${OUTCOME_DESCRIPTION.failing} |`,
        "",
      ]);
    }
  });
});
