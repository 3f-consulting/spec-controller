import { describe, it, expect, beforeEach } from "vitest";
import { evidenceReconciliationFromSources } from "./evidenceReconciliationFromSources.js";
import { feature } from "../evidenceReconciliation.test-utils.js";
import { lineReadingsOf } from "../domain/qualityCheckReconciliation.test-utils.js";
import { parsedFeatures } from "../parse/parsedFeatures.test-utils.js";
import { parsedWorkflows } from "../parse/parsedWorkflows.test-utils.js";
import type { EvidenceReconciliation } from "./renderInput.js";
import type { QualityCheckKindObservations } from "../domain/ledger.js";
import type { BehaviouralEvidenceObservation } from "../domain/journal.js";

function runnersReconciler(
  feature: string,
  ci: string,
  scripts: Record<string, string>,
): (runners?: Record<string, string | null>) => EvidenceReconciliation {
  return (runners) => {
    const specController = runners === undefined ? {} : { runners };
    const packageJson = { scripts, specController } as Parameters<
      typeof evidenceReconciliationFromSources
    >[0]["packageJson"];
    return evidenceReconciliationFromSources({
      features: parsedFeatures([feature]),
      packageJson,
      ciWorkflows: parsedWorkflows([ci]),
      behaviouralObservations: [],
      deferralTags: [],
    });
  };
}

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

const unitInTwoJobsCi = `name: fixture CI
jobs:
  quality:
    steps:
      - name: Unit tests
        run: pnpm test
      - name: Lint
        run: pnpm lint
  again:
    steps:
      - name: Unit tests
        run: pnpm test
`;

const unitTwiceInOneJobCi = `name: fixture CI
jobs:
  quality:
    steps:
      - name: Unit tests
        run: pnpm test
      - name: Unit tests
        run: pnpm test
      - name: Lint
        run: pnpm lint
`;

const fitnessNameSharedCi = `name: fixture CI
jobs:
  quality:
    steps:
      - name: Lint
        run: pnpm lint
      - name: Lint
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

const excludedRunnersCi = `name: fixture CI
jobs:
  zeta:
    steps:
      - name: Unit tests
        run: pnpm test
  alpha:
    steps:
      - name: Unit tests not a check
        run: pnpm test
      - name: Reconciliation
        run: pnpm test && pnpm exec spec-controller balance
      - name: Unit tests
        run: pnpm test
`;

const fitnessJobsOutOfOrderCi = `name: fixture CI
jobs:
  zeta:
    steps:
      - name: Lint
        run: pnpm lint
  alpha:
    steps:
      - name: Install
        run: pnpm install --frozen-lockfile
`;

function withExcludedRunners(): EvidenceReconciliation {
  return evidenceReconciliationFromSources({
    features: parsedFeatures([feature]),
    packageJson: {
      scripts,
      specController: { runners: { unit: "vitest" }, notChecks: ["workflow-0.yml:alpha:Unit tests not a check"] },
    },
    ciWorkflows: parsedWorkflows([excludedRunnersCi]),
    reconcilerInvocation: "spec-controller balance",
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

function entries(reconciliation: EvidenceReconciliation): readonly QualityCheckKindObservations[] {
  return reconciliation.summary.evidenceObservations?.byQualityCheckKind ?? [];
}

function entryFor(reconciliation: EvidenceReconciliation, qualityCheckKind: string): QualityCheckKindObservations | undefined {
  return entries(reconciliation).find((entry) => entry.qualityCheckKind === qualityCheckKind);
}

let reconcile: ReturnType<typeof runnersReconciler>;
beforeEach(() => {
  reconcile = runnersReconciler(feature, ci, scripts);
});

describe("[SCN-RMD-015] each kind of quality check in the summary's evidence observations names its CI steps in the step accounting's order, one entry for each step: a layer the steps the step accounting counts as its runners, never a non-check or the reconciler's own, and the runner the target declares for it, or none where the target names none, whatever its count; fitness the step behind each fitness function that ran", () => {
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
      { qualityCheckKind: "unit", count: 0 },
      { qualityCheckKind: "integration", count: 0 },
      { qualityCheckKind: "e2e", count: 0 },
      { qualityCheckKind: "performance", count: 0 },
      {
        qualityCheckKind: "fitness",
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
    expect(reconciliation.summary).not.toHaveProperty("runnerKeysNotALayer");
  });

  it("names no runner and no CI step on a layer for a runners block that names no layer", () => {
    const reconciliation = reconcile({});
    for (const entry of entries(reconciliation).filter((entry) => entry.qualityCheckKind !== "fitness")) {
      expect(entry).not.toHaveProperty("runner");
      expect(entry).not.toHaveProperty("ciSteps");
    }
    expect(reconciliation.summary).not.toHaveProperty("tiersWithoutRunner");
  });

  it("names a declared runner that no step counted as a runner runs on its entry, with no CI step, where it has evidence", () => {
    const reconciliation = withObservations({ runners: { unit: "vitest", e2e: "playwright" } }, [
      { qualityCheckKind: "e2e", scnId: "SCN-FIX-001", status: "passed" },
    ]);
    expect(entryFor(reconciliation, "e2e")).toStrictEqual({ qualityCheckKind: "e2e", count: 1, runner: "playwright" });
  });

  it("names null as the runner of a layer the target names none for, with no CI step, at count 0 and with evidence", () => {
    const reconciliation = withObservations({ runners: { unit: "vitest", integration: null, performance: null } }, [
      { qualityCheckKind: "performance", scnId: "SCN-FIX-001", status: "passed" },
    ]);
    expect(entryFor(reconciliation, "integration")).toStrictEqual({ qualityCheckKind: "integration", count: 0, runner: null });
    expect(entryFor(reconciliation, "performance")).toStrictEqual({ qualityCheckKind: "performance", count: 1, runner: null });
    expect(reconciliation.summary).not.toHaveProperty("tiersWithoutRunner");
  });

  it("names no runner on a layer the target has not said, left out, of the wrong kind, or with no runners block, where it has evidence", () => {
    const unitObservations: BehaviouralEvidenceObservation[] = [
      { qualityCheckKind: "unit", scnId: "SCN-FIX-001", status: "passed" },
      { qualityCheckKind: "unit", scnId: "SCN-FIX-001", status: "failed" },
    ];
    for (const specController of [{}, { runners: { e2e: "playwright" } }, { runners: { unit: 5 } }]) {
      const reconciliation = withObservations(specController, unitObservations);
      expect(entryFor(reconciliation, "unit")).toStrictEqual({ qualityCheckKind: "unit", count: 2 });
      expect(reconciliation.summary).not.toHaveProperty("tiersWithoutRunner");
    }
  });

  it("names the declared runner and the step that runs it on the unit entry once the runners block names it, and that step leaves fitness", () => {
    const reconciliation = reconcile({ unit: "vitest" });
    expect(entryFor(reconciliation, "unit")).toStrictEqual({
      qualityCheckKind: "unit",
      count: 0,
      runner: "vitest",
      ciSteps: ["workflow-0.yml:quality:Unit tests"],
    });
    expect(entryFor(reconciliation, "integration")).toStrictEqual({ qualityCheckKind: "integration", count: 0 });
    expect(entryFor(reconciliation, "fitness")).toStrictEqual({
      qualityCheckKind: "fitness",
      count: 3,
      ciSteps: [
        "workflow-0.yml:quality:Install",
        "workflow-0.yml:quality:Lint",
        "workflow-0.yml:quality:github/codeql-action/analyze@v3",
      ],
    });
  });

  it("names on a layer the step accounting's runners, entry for entry and in its order, never a non-check or the reconciler's step that runs its runner", () => {
    const reconciliation = withExcludedRunners();
    const runners = reconciliation.summary.stepAccounting?.steps.runners;
    expect(runners).toStrictEqual(["workflow-0.yml:alpha:Unit tests", "workflow-0.yml:zeta:Unit tests"]);
    expect(entryFor(reconciliation, "unit")).toStrictEqual({
      qualityCheckKind: "unit",
      count: 0,
      runner: "vitest",
      ciSteps: runners,
    });
  });

  it("names on fitness the step behind each fitness function in the step accounting's order, whatever order its jobs are read in", () => {
    expect(entryFor(runnersReconciler(feature, fitnessJobsOutOfOrderCi, scripts)(), "fitness")).toStrictEqual({
      qualityCheckKind: "fitness",
      count: 2,
      ciSteps: ["workflow-0.yml:alpha:Install", "workflow-0.yml:zeta:Lint"],
    });
  });

  it.each([
    [
      "lists both steps, in the step accounting's order, for a runner run at two steps",
      unitTwiceCi,
      ["workflow-0.yml:again:Unit tests again", "workflow-0.yml:quality:Unit tests"],
    ],
    [
      "tells two jobs' runner steps of one name apart by job",
      unitInTwoJobsCi,
      ["workflow-0.yml:again:Unit tests", "workflow-0.yml:quality:Unit tests"],
    ],
    [
      "names once a runner run at two steps of one name in one job",
      unitTwiceInOneJobCi,
      ["workflow-0.yml:quality:Unit tests"],
    ],
    [
      "names a fitness step once where a runner step in its job shares its name",
      fitnessNameSharedCi,
      ["workflow-0.yml:quality:Lint"],
    ],
  ])("%s", (_, pipeline, unitSteps) => {
    const reconciliation = runnersReconciler(feature, pipeline, scripts)({ unit: "vitest" });
    expect(entryFor(reconciliation, "fitness")).toStrictEqual({
      qualityCheckKind: "fitness",
      count: 1,
      ciSteps: ["workflow-0.yml:quality:Lint"],
    });
    expect(entryFor(reconciliation, "unit")).toStrictEqual({
      qualityCheckKind: "unit",
      count: 0,
      runner: "vitest",
      ciSteps: unitSteps,
    });
  });

  it("names on fitness the step behind each fitness function that ran, in the step accounting's order, and none behind one the run's record says did not run", () => {
    const fitness = entryFor(withRecordedSteps(), "fitness");
    expect(fitness).toStrictEqual({
      qualityCheckKind: "fitness",
      count: 3,
      ciSteps: ["workflow-0.yml:quality:Types", "workflow-0.yml:quality:Lint", "workflow-0.yml:quality:Other property"],
    });
    expect(fitness?.ciSteps).toHaveLength(fitness?.count ?? -1);
  });

  it("names on fitness a step that runs a declared runner when the run's record says its fitness function ran there", () => {
    const reconciliation = withARecordedRunnerStep();
    expect(entryFor(reconciliation, "unit")).toStrictEqual({
      qualityCheckKind: "unit",
      count: 0,
      runner: "vitest",
      ciSteps: ["workflow-0.yml:quality:Unit tests"],
    });
    expect(entryFor(reconciliation, "fitness")).toStrictEqual({
      qualityCheckKind: "fitness",
      count: 2,
      ciSteps: ["workflow-0.yml:quality:Unit tests", "workflow-0.yml:quality:Lint"],
    });
  });

  it("names on fitness the candidate step behind its fitness function, never an excluded step running the same script before it", () => {
    expect(entryFor(withAnExcludedTwin(), "fitness")).toStrictEqual({
      qualityCheckKind: "fitness",
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
