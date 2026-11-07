import { describe, it, expect } from "vitest";
import { evidenceReconciliationFromSources } from "./evidenceReconciliationFromSources.js";
import { runningFitnessObservations } from "../domain/ledger.js";
import { parsedFeatures } from "../parse/parsedFeatures.test-utils.js";
import { parsedWorkflows } from "../parse/parsedWorkflows.test-utils.js";
import type { FitnessEvidenceObservation } from "../model.js";
import type { StepRecord } from "../parse/ciStepRecord.js";

const fitnessFeature = `Feature: fixture

  @fitness @CLM-FIX-002
  Scenario: a fixture property holds

  @fitness @CLM-FIX-003
  Scenario: another fixture property holds
`;

const lintCi = `name: fixture CI
jobs:
  quality:
    steps:
      - name: Lint
        run: pnpm lint
`;

const nightlyCi = `name: fixture nightly
jobs:
  sweep:
    steps:
      - name: Audit
        run: pnpm audit
`;

const recordedCi = `name: fixture CI
jobs:
  quality:
    steps:
      - name: Property
        id: CLM-FIX-002
        run: pnpm property
      - name: Lint
        run: pnpm lint
`;

const twiceRecordedCi = `name: fixture CI
jobs:
  quality:
    steps:
      - name: Property
        id: CLM-FIX-002
        run: pnpm property
  again:
    steps:
      - name: Property again
        id: CLM-FIX-002
        run: pnpm property
`;

const scripts = { lint: "eslint .", audit: "pnpm audit --prod", property: "node p.js" };

function observedFitness(
  workflowSources: readonly string[],
  workflowNames: readonly string[],
  ciStepRecord?: StepRecord
): FitnessEvidenceObservation[] {
  const reconciliation = evidenceReconciliationFromSources({
    features: parsedFeatures([fitnessFeature]),
    packageJson: { scripts },
    ciWorkflows: parsedWorkflows(workflowSources, workflowNames),
    behaviouralObservations: [],
    deferralTags: [],
    ...(ciStepRecord === undefined ? {} : { ciStepRecord }),
  });
  return runningFitnessObservations(reconciliation.ledger).sort((a, b) =>
    a.fitnessFunction.localeCompare(b.fitnessFunction)
  );
}

describe("[CLM-RMD-027] each fitness evidence observation names the CI step it was observed at, as workflow, job and step, and names none where no single step carries its code", () => {
  it("names the workflow, job and step of the candidate step a workflow observation was read from", () => {
    expect(observedFitness([lintCi], [])).toStrictEqual([
      {
        qualityCheckKind: "fitness",
        fitnessFunction: "lint",
        exists: true,
        enforcedOverRealSource: true,
        outcome: "cites-no-scenario",
        step: "workflow-0.yml:quality:Lint",
      },
    ]);
  });

  it("names, over two workflows, each observation's own workflow and job", () => {
    expect(observedFitness([lintCi, nightlyCi], ["ci.yml", "nightly.yml"])).toStrictEqual([
      {
        qualityCheckKind: "fitness",
        fitnessFunction: "audit",
        exists: true,
        enforcedOverRealSource: true,
        outcome: "cites-no-scenario",
        step: "nightly.yml:sweep:Audit",
      },
      {
        qualityCheckKind: "fitness",
        fitnessFunction: "lint",
        exists: true,
        enforcedOverRealSource: true,
        outcome: "cites-no-scenario",
        step: "ci.yml:quality:Lint",
      },
    ]);
  });

  it("names, on a step-record observation, the one step whose id is its code", () => {
    expect(
      observedFitness([recordedCi], ["ci.yml"], { "CLM-FIX-002": { outcome: "success", conclusion: "success" } })
    ).toStrictEqual([
      {
        qualityCheckKind: "fitness",
        fitnessFunction: "CLM-FIX-002",
        claimCode: "CLM-FIX-002",
        exists: true,
        enforcedOverRealSource: true,
        outcome: "satisfied",
        status: "passed",
        step: "ci.yml:quality:Property",
      },
      {
        qualityCheckKind: "fitness",
        fitnessFunction: "lint",
        exists: true,
        enforcedOverRealSource: true,
        outcome: "cites-no-scenario",
        step: "ci.yml:quality:Lint",
      },
    ]);
  });

  it("names no step on a step-record observation whose code no step carries", () => {
    expect(
      observedFitness([recordedCi], ["ci.yml"], { "CLM-FIX-003": { outcome: "failure", conclusion: "failure" } })
    ).toStrictEqual([
      {
        qualityCheckKind: "fitness",
        fitnessFunction: "CLM-FIX-003",
        claimCode: "CLM-FIX-003",
        exists: true,
        enforcedOverRealSource: true,
        outcome: "failing",
        status: "failed",
      },
      {
        qualityCheckKind: "fitness",
        fitnessFunction: "lint",
        exists: true,
        enforcedOverRealSource: true,
        outcome: "cites-no-scenario",
        step: "ci.yml:quality:Lint",
      },
    ]);
  });

  it("names no step on a step-record observation whose code two steps, in two jobs, carry", () => {
    expect(
      observedFitness([twiceRecordedCi], ["ci.yml"], { "CLM-FIX-002": { outcome: "success", conclusion: "success" } })
    ).toStrictEqual([
      {
        qualityCheckKind: "fitness",
        fitnessFunction: "CLM-FIX-002",
        claimCode: "CLM-FIX-002",
        exists: true,
        enforcedOverRealSource: true,
        outcome: "satisfied",
        status: "passed",
      },
    ]);
  });
});
