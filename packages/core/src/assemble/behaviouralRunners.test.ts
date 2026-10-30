import { describe, it, expect, beforeEach } from "vitest";
import { runnersReconciler } from "./runnerTiers.test-utils.js";
import { evidenceReconciliationFromSources } from "./evidenceReconciliationFromSources.js";
import { feature } from "../evidenceReconciliation.test-utils.js";
import { lineReadingsOf } from "../domain/qualityCheckReconciliation.test-utils.js";
import { parsedFeatures } from "../parse/parsedFeatures.test-utils.js";
import { parsedWorkflows } from "../parse/parsedWorkflows.test-utils.js";
import type { EvidenceReconciliation } from "./renderInput.js";
import type { QualityCheckObservations } from "../domain/ledger.js";
import type { BehaviouralEvidenceObservation } from "../domain/journal.js";

const ci = `name: fixture CI
jobs:
  quality:
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      - name: Install
        run: pnpm install --frozen-lockfile
      - name: Unit tests
        run: pnpm test
      - name: Lint
        run: pnpm lint
      - uses: github/codeql-action/analyze@v3
`;

const unitTwiceCi = `name: fixture CI
jobs:
  quality:
    steps:
      - name: Unit tests
        run: pnpm test
      - name: Lint
        run: pnpm lint
  again:
    steps:
      - name: Unit tests again
        run: pnpm test
`;

const scripts = { test: "vitest run", lint: "eslint ." };

const fitnessFeature = `Feature: fixture

  @fitness @SCN-FIX-002
  Scenario: a fixture property holds

  @fitness @SCN-FIX-003
  Scenario: another fixture property holds
`;

const recordedCi = `name: fixture CI
jobs:
  quality:
    steps:
      - name: Types
        run: pnpm typecheck
      - name: Property
        id: SCN-FIX-003
        run: pnpm property
      - name: Lint
        run: pnpm lint
      - name: Other property
        id: SCN-FIX-002
        run: pnpm other
`;

function withRecordedSteps(): EvidenceReconciliation {
  return evidenceReconciliationFromSources({
    features: parsedFeatures([fitnessFeature]),
    packageJson: { scripts: { typecheck: "tsc", property: "node p.js", lint: "eslint .", other: "node o.js" } },
    ciWorkflows: parsedWorkflows([recordedCi]),
    behaviouralObservations: [],
    deferralTags: [],
    ciStepRecord: {
      "SCN-FIX-002": { outcome: "success", conclusion: "success" },
      "SCN-FIX-003": { outcome: "skipped", conclusion: "skipped" },
    },
  });
}

const runnerStepCi = `name: fixture CI
jobs:
  quality:
    steps:
      - name: Unit tests
        id: SCN-FIX-002
        run: pnpm test
      - name: Lint
        run: pnpm lint
`;

function withARecordedRunnerStep(): EvidenceReconciliation {
  return evidenceReconciliationFromSources({
    features: parsedFeatures([fitnessFeature]),
    packageJson: { scripts, specController: { runners: { unit: "vitest" } } },
    ciWorkflows: parsedWorkflows([runnerStepCi]),
    behaviouralObservations: [],
    deferralTags: [],
    ciStepRecord: { "SCN-FIX-002": { outcome: "success", conclusion: "success" } },
  });
}

const excludedTwinCi = `name: fixture CI
jobs:
  quality:
    steps:
      - name: Early lint
        run: pnpm lint
      - name: Lint
        run: pnpm lint
`;

function withAnExcludedTwin(): EvidenceReconciliation {
  return evidenceReconciliationFromSources({
    features: parsedFeatures([feature]),
    packageJson: { scripts, specController: { notChecks: ["workflow-0.yml:quality:Early lint"] } },
    ciWorkflows: parsedWorkflows([excludedTwinCi]),
    behaviouralObservations: [],
    deferralTags: [],
  });
}

function withObservations(
  specController: Record<string, unknown>,
  behaviouralObservations: readonly BehaviouralEvidenceObservation[]
): EvidenceReconciliation {
  const packageJson = { scripts, specController } as Parameters<
    typeof evidenceReconciliationFromSources
  >[0]["packageJson"];
  return evidenceReconciliationFromSources({
    features: parsedFeatures([feature]),
    packageJson,
    ciWorkflows: parsedWorkflows([ci]),
    behaviouralObservations,
    deferralTags: [],
  });
}

function entries(reconciliation: EvidenceReconciliation): readonly QualityCheckObservations[] {
  return reconciliation.summary.evidenceObservations?.byQualityCheck ?? [];
}

function entryFor(reconciliation: EvidenceReconciliation, qualityCheck: string): QualityCheckObservations | undefined {
  return entries(reconciliation).find((entry) => entry.qualityCheck === qualityCheck);
}

let reconcile: ReturnType<typeof runnersReconciler>;
beforeEach(() => {
  reconcile = runnersReconciler(feature, ci, scripts);
});

describe("[SCN-RMD-015] each quality check in the summary's evidence observations names the CI steps its evidence came from, fitness included, and a behavioural one the runner the target declares for it, or none where the target names none, whatever its count", () => {
  it("posts every step of the pipeline but its checkout to the unnamed claim's row, each counted run and uncited, and names no runner for a target with no runners block", () => {
    const reconciliation = reconcile();
    const unnamedClaimRowItems = reconciliation.ledger.claimReconciliations
      .filter((row) => row.kind === "unnamed-claim")
      .flatMap((row) => lineReadingsOf(row.qualityCheckReconciliations));
    expect(unnamedClaimRowItems).toStrictEqual([
      [["Install"], "cites-no-scenario"],
      [["github/codeql-action/analyze@v3"], "cites-no-scenario"],
      [["lint"], "cites-no-scenario"],
      [["test"], "cites-no-scenario"],
    ]);
    expect(entries(reconciliation)).toStrictEqual([
      { qualityCheck: "unit", count: 0 },
      { qualityCheck: "integration", count: 0 },
      { qualityCheck: "e2e", count: 0 },
      { qualityCheck: "performance", count: 0 },
      {
        qualityCheck: "fitness",
        count: 4,
        ciSteps: [
          "workflow-0.yml:quality:Install",
          "workflow-0.yml:quality:Unit tests",
          "workflow-0.yml:quality:Lint",
          "workflow-0.yml:quality:github/codeql-action/analyze@v3",
        ],
      },
    ]);
    expect(reconciliation.summary).not.toHaveProperty("tiersWithoutRunner");
    expect(reconciliation.summary).not.toHaveProperty("runnerKeysNotATier");
  });

  it("names no runner and no CI step on a behavioural quality check for a runners block that names no tier", () => {
    const reconciliation = reconcile({});
    for (const entry of entries(reconciliation).filter((entry) => entry.qualityCheck !== "fitness")) {
      expect(entry).not.toHaveProperty("runner");
      expect(entry).not.toHaveProperty("ciSteps");
    }
    expect(reconciliation.summary).not.toHaveProperty("tiersWithoutRunner");
  });

  it("names a declared runner that no step read runs on its entry, with no CI step, where it has evidence", () => {
    const reconciliation = withObservations({ runners: { unit: "vitest", e2e: "playwright" } }, [
      { qualityCheck: "e2e", scnId: "SCN-FIX-001", status: "passed" },
    ]);
    expect(entryFor(reconciliation, "e2e")).toStrictEqual({ qualityCheck: "e2e", count: 1, runner: "playwright" });
  });

  it("names null as the runner of a tier the target names none for, with no CI step, at count 0 and with evidence", () => {
    const reconciliation = withObservations({ runners: { unit: "vitest", integration: null, performance: null } }, [
      { qualityCheck: "performance", scnId: "SCN-FIX-001", status: "passed" },
    ]);
    expect(entryFor(reconciliation, "integration")).toStrictEqual({ qualityCheck: "integration", count: 0, runner: null });
    expect(entryFor(reconciliation, "performance")).toStrictEqual({ qualityCheck: "performance", count: 1, runner: null });
    expect(reconciliation.summary).not.toHaveProperty("tiersWithoutRunner");
  });

  it("names no runner on a tier the target has not said, left out, of the wrong kind, or with no runners block, where it has evidence", () => {
    const unitObservations: BehaviouralEvidenceObservation[] = [
      { qualityCheck: "unit", scnId: "SCN-FIX-001", status: "passed" },
      { qualityCheck: "unit", scnId: "SCN-FIX-001", status: "failed" },
    ];
    for (const specController of [{}, { runners: { e2e: "playwright" } }, { runners: { unit: 5 } }]) {
      const reconciliation = withObservations(specController, unitObservations);
      expect(entryFor(reconciliation, "unit")).toStrictEqual({ qualityCheck: "unit", count: 2 });
      expect(reconciliation.summary).not.toHaveProperty("tiersWithoutRunner");
    }
  });

  it("names the declared runner and the step that runs it on the unit entry once the runners block names it, and that step leaves fitness", () => {
    const reconciliation = reconcile({ unit: "vitest" });
    expect(entryFor(reconciliation, "unit")).toStrictEqual({
      qualityCheck: "unit",
      count: 0,
      runner: "vitest",
      ciSteps: ["Unit tests"],
    });
    expect(entryFor(reconciliation, "integration")).toStrictEqual({ qualityCheck: "integration", count: 0 });
    expect(entryFor(reconciliation, "fitness")).toStrictEqual({
      qualityCheck: "fitness",
      count: 3,
      ciSteps: [
        "workflow-0.yml:quality:Install",
        "workflow-0.yml:quality:Lint",
        "workflow-0.yml:quality:github/codeql-action/analyze@v3",
      ],
    });
  });

  it("lists both steps, in step order, for a runner run at two steps", () => {
    const reconciliation = runnersReconciler(feature, unitTwiceCi, scripts)({ unit: "vitest" });
    expect(entryFor(reconciliation, "unit")).toStrictEqual({
      qualityCheck: "unit",
      count: 0,
      runner: "vitest",
      ciSteps: ["Unit tests", "Unit tests again"],
    });
    expect(entryFor(reconciliation, "fitness")).toStrictEqual({
      qualityCheck: "fitness",
      count: 1,
      ciSteps: ["workflow-0.yml:quality:Lint"],
    });
  });

  it("names on fitness the step behind each fitness function that ran, in step order, and none behind one the run's record says did not run", () => {
    const fitness = entryFor(withRecordedSteps(), "fitness");
    expect(fitness).toStrictEqual({
      qualityCheck: "fitness",
      count: 3,
      ciSteps: ["workflow-0.yml:quality:Types", "workflow-0.yml:quality:Lint", "workflow-0.yml:quality:Other property"],
    });
    expect(fitness?.ciSteps).toHaveLength(fitness?.count ?? -1);
  });

  it("names on fitness a step that runs a declared runner when the run's record says its fitness function ran there", () => {
    const reconciliation = withARecordedRunnerStep();
    expect(entryFor(reconciliation, "unit")).toStrictEqual({
      qualityCheck: "unit",
      count: 0,
      runner: "vitest",
      ciSteps: ["Unit tests"],
    });
    expect(entryFor(reconciliation, "fitness")).toStrictEqual({
      qualityCheck: "fitness",
      count: 2,
      ciSteps: ["workflow-0.yml:quality:Unit tests", "workflow-0.yml:quality:Lint"],
    });
  });

  it("names on fitness the candidate step behind its fitness function, never an excluded step running the same script before it", () => {
    expect(entryFor(withAnExcludedTwin(), "fitness")).toStrictEqual({
      qualityCheck: "fitness",
      count: 1,
      ciSteps: ["workflow-0.yml:quality:Lint"],
    });
  });

  it("names as many fitness steps as fitness functions ran, with and without a declared runner", () => {
    for (const reconciliation of [reconcile(), reconcile({ unit: "vitest" }), withRecordedSteps(), withARecordedRunnerStep()]) {
      const fitness = entryFor(reconciliation, "fitness");
      expect(fitness?.ciSteps).toHaveLength(fitness?.count ?? -1);
      expect(fitness).not.toHaveProperty("runner");
    }
  });
});
