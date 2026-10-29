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

describe("[SCN-USG-001] fitnessFunctionTally folds the posted fitness-function evidence observations, filtered to what ran", () => {
  const scenarios: Scenario[] = [
    { scnId: "SCN-A", evidenceObligations: [{ qualityCheck: "fitness" }] },
    { scnId: "SCN-C", evidenceObligations: [{ qualityCheck: "fitness" }] },
    { scnId: "SCN-D", evidenceObligations: [{ qualityCheck: "fitness" }] },
  ];
  const observations: EvidenceObservation[] = [
    { qualityCheck: "fitness", fitnessFunction: "lint:foo", scnId: "SCN-A", exists: true, enforcedOverRealSource: true },
    { qualityCheck: "fitness", fitnessFunction: "lint:water", scnId: "SCN-C", exists: true, enforcedOverRealSource: false },
    { qualityCheck: "fitness", fitnessFunction: "lint:absent", scnId: "SCN-D", exists: false, enforcedOverRealSource: false },
    { qualityCheck: "fitness", fitnessFunction: "lint:bar", exists: true, enforcedOverRealSource: true },
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
      qualityCheck: "unit" as const,
      scnId: "SCN-A",
      status: "passed" as const,
      exists: true,
      enforcedOverRealSource: true,
    };
    const withBehavioural = reconcile(scenarios, [...observations, behaviouralCarryingGuardFields]);
    expect(fitnessFunctionTally(withBehavioural)).toEqual(tally);
  });
});

describe("[SCN-USG-001] a fitness function no scenario cites is banked on the unnamed claim's row and counted uncited", () => {
  const rowFor = (ledger: Ledger, scnId: string): ClaimReconciliation | undefined =>
    ledger.claimReconciliations.find((r) => r.claim === scnId);

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
    { scnId: "SCN-TGT-001", evidenceObligations: [{ qualityCheck: "fitness" }] },
  ];

  const citedScn = (script: string): ScriptCitation | null =>
    script === "lint:foo" ? { scnId: "SCN-TGT-001" } : null;

  let citedObservations: ReturnType<typeof runningFitnessFunctions>;
  let uncitedObservations: ReturnType<typeof runningFitnessFunctions>;
  let ledger: Ledger;
  beforeEach(() => {
    const runningObservations = runningFitnessFunctions(parsedWorkflows([ciLines.join("\n")]), pkg, SUITE_RUNNERS, citedScn);
    citedObservations = runningObservations.filter((o) => o.fitnessFunction === "lint:foo");
    uncitedObservations = runningObservations.filter((o) => o.fitnessFunction !== "lint:foo");
    ledger = reconcile(fitness, [...citedObservations, ...uncitedObservations]);
  });

  it("derives one citing evidence observation and one uncited evidence observation from the CI source (the corpus is real, not seeded)", () => {
    expect(citedObservations).toEqual([
      {
        qualityCheck: "fitness",
        fitnessFunction: "lint:foo",
        exists: true,
        enforcedOverRealSource: true,
        scnId: "SCN-TGT-001",
      },
    ]);
    expect(uncitedObservations).toEqual([
      { qualityCheck: "fitness", fitnessFunction: "lint:bar", exists: true, enforcedOverRealSource: true },
    ]);
  });

  it("banks the uncited evidence observation on the unnamed claim's row as cites-no-scenario, naming the handle that ran", () => {
    expect(rowFor(ledger, "(unnamed claim)")?.qualityCheckReconciliations).toEqual([
      {
        qualityCheck: "fitness",
        evidenceObservations: [{ ...uncitedObservations[0], outcome: "cites-no-scenario" }],
      },
    ]);
  });
});

describe("[SCN-USG-005] a cited fitness function under no convention of ours is attributed to its scenario, never an uncited fitness function", () => {
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

  const citedScn = (script: string): ScriptCitation | null =>
    script === "domain-purity" ? { scnId: "SCN-GRD-001" } : null;

  const fitness: Scenario[] = [
    {
      scnId: "SCN-GRD-001",
      evidenceObligations: [{ qualityCheck: "fitness" }],
    },
  ];
  let observations: ReturnType<typeof runningFitnessFunctions>;
  let ledger: Ledger;
  beforeEach(() => {
    observations = runningFitnessFunctions(parsedWorkflows([guardCiLines.join("\n")]), guardPkg, SUITE_RUNNERS, citedScn).filter(
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
