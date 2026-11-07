import { describe, it, expect, beforeEach } from "vitest";

import { fitnessFunctionTally } from "./ledger.js";
import { reconcile } from "./evidenceReconciliation.js";
import { runningFitnessFunctions } from "../parse/runningFitnessFunctions.js";
import type { PackageJsonScripts } from "../parse/checkScriptsRunInCI.js";
import type { ScriptCitation } from "../parse/fitnessCitations.js";
import type {
  EvidenceObservation,
  Ledger,
  Scenario,
  ClaimReconciliation,
} from "../model.js";
import { parsedWorkflows } from "../parse/parsedWorkflows.test-utils.js";

const SUITE_RUNNERS: Readonly<Record<string, string | null>> = {
  unit: "vitest",
  integration: "cucumber-js",
};

describe("[CLM-USG-001] fitnessFunctionTally folds the posted fitness-function evidence observations, filtered to what ran", () => {
  const scenarios: Scenario[] = [
    { claimCode: "CLM-A", evidenceObligations: [{ qualityCheckKind: "fitness" }] },
    { claimCode: "CLM-C", evidenceObligations: [{ qualityCheckKind: "fitness" }] },
    { claimCode: "CLM-D", evidenceObligations: [{ qualityCheckKind: "fitness" }] },
  ];
  const observations: EvidenceObservation[] = [
    { qualityCheckKind: "fitness", fitnessFunction: "lint:foo", claimCode: "CLM-A", exists: true, enforcedOverRealSource: true },
    { qualityCheckKind: "fitness", fitnessFunction: "lint:water", claimCode: "CLM-C", exists: true, enforcedOverRealSource: false },
    { qualityCheckKind: "fitness", fitnessFunction: "lint:absent", claimCode: "CLM-D", exists: false, enforcedOverRealSource: false },
    { qualityCheckKind: "fitness", fitnessFunction: "lint:bar", exists: true, enforcedOverRealSource: true },
  ];
  let tally: ReturnType<typeof fitnessFunctionTally>;
  beforeEach(() => {
    tally = fitnessFunctionTally(reconcile(scenarios, observations));
  });

  it("counts every check that ran, the watermelon included, and not the missing one", () => {
    expect(tally.runningFitnessFunctionCount).toBe(3);
  });

  it("counts the fitness evidence observations on the UNNAMED CLAIM's row as the uncited fitness functions", () => {
    expect(tally.uncitedFitnessFunctionCount).toBe(1);
  });

  it("counts no behavioural evidence observation, whatever fields it arrives carrying", () => {
    const behaviouralCarryingGuardFields = {
      qualityCheckKind: "unit" as const,
      claimCode: "CLM-A",
      status: "passed" as const,
      exists: true,
      enforcedOverRealSource: true,
    };
    const withBehavioural = reconcile(scenarios, [...observations, behaviouralCarryingGuardFields]);
    expect(fitnessFunctionTally(withBehavioural)).toEqual(tally);
  });
});

describe("[CLM-USG-001] a fitness function no scenario cites is banked on the unnamed claim's row and counted uncited", () => {
  const rowFor = (ledger: Ledger, claimCode: string): ClaimReconciliation | undefined =>
    ledger.claimReconciliations.find((r) => r.claim === claimCode);

  const pkg: PackageJsonScripts = {
    scripts: {
      "lint:foo": "echo foo-check",
      "lint:bar": "echo bar-check",
      test: "vitest run",
      cucumber: "cucumber-js",
    },
  };
  const ciLines = [
    "jobs:",
    "  ci:",
    "    steps:",
    "      - run: pnpm lint:foo",
    "      - run: pnpm lint:bar",
    "      - run: pnpm test",
    "      - run: pnpm cucumber",
  ];

  const fitness: Scenario[] = [
    { claimCode: "CLM-TGT-001", evidenceObligations: [{ qualityCheckKind: "fitness" }] },
  ];

  const citedClaimCode = (script: string): ScriptCitation | null =>
    script === "lint:foo" ? { claimCode: "CLM-TGT-001" } : null;

  let citedObservations: ReturnType<typeof runningFitnessFunctions>;
  let uncitedObservations: ReturnType<typeof runningFitnessFunctions>;
  let ledger: Ledger;
  beforeEach(() => {
    const runningObservations = runningFitnessFunctions(parsedWorkflows([ciLines.join("\n")]), pkg, SUITE_RUNNERS, citedClaimCode);
    citedObservations = runningObservations.filter((o) => o.fitnessFunction === "lint:foo");
    uncitedObservations = runningObservations.filter((o) => o.fitnessFunction !== "lint:foo");
    ledger = reconcile(fitness, [...citedObservations, ...uncitedObservations]);
  });

  it("derives one citing evidence observation and one uncited evidence observation from the CI source (the corpus is real, not seeded)", () => {
    const withoutStep = ({ step: _step, ...rest }: (typeof citedObservations)[number] & { step?: string }) => rest;
    expect(citedObservations.map(withoutStep)).toEqual([
      {
        qualityCheckKind: "fitness",
        fitnessFunction: "lint:foo",
        exists: true,
        enforcedOverRealSource: true,
        claimCode: "CLM-TGT-001",
      },
    ]);
    expect(uncitedObservations.map(withoutStep)).toEqual([
      { qualityCheckKind: "fitness", fitnessFunction: "lint:bar", exists: true, enforcedOverRealSource: true },
    ]);
  });

  it("banks the uncited evidence observation on the unnamed claim's row as cites-no-scenario, naming the handle that ran", () => {
    expect(rowFor(ledger, "(unnamed claim)")?.qualityCheckReconciliations).toEqual([
      {
        qualityCheckKind: "fitness",
        evidenceObservations: [{ ...uncitedObservations[0], outcome: "cites-no-scenario" }],
      },
    ]);
  });
});

describe("[CLM-USG-005] a cited fitness function under no convention of ours is attributed to its scenario, never an uncited fitness function", () => {
  const guardPkg: PackageJsonScripts = {
    scripts: {
      "domain-purity": "echo domain-purity",
      test: "vitest run",
      cucumber: "cucumber-js",
    },
  };
  const guardCiLines = [
    "jobs:",
    "  ci:",
    "    steps:",
    "      - run: pnpm install --frozen-lockfile",
    "      - run: pnpm domain-purity",
    "      - run: pnpm test",
    "      - run: pnpm cucumber",
  ];

  const citedClaimCode = (script: string): ScriptCitation | null =>
    script === "domain-purity" ? { claimCode: "CLM-GRD-001" } : null;

  const fitness: Scenario[] = [
    {
      claimCode: "CLM-GRD-001",
      evidenceObligations: [{ qualityCheckKind: "fitness" }],
    },
  ];
  let observations: ReturnType<typeof runningFitnessFunctions>;
  let ledger: Ledger;
  beforeEach(() => {
    observations = runningFitnessFunctions(parsedWorkflows([guardCiLines.join("\n")]), guardPkg, SUITE_RUNNERS, citedClaimCode).filter(
      (o) => o.fitnessFunction === "domain-purity"
    );
    ledger = reconcile(fitness, observations);
  });

  it("tallies the run as 1 running fitness function and 0 uncited", () => {
    expect(fitnessFunctionTally(ledger)).toEqual({
      runningFitnessFunctionCount: 1,
      uncitedFitnessFunctionCount: 0,
    });
  });
});
