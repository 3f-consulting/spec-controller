import { describe, it, expect } from "vitest";
import { evidenceReconciliationFromSources } from "./evidenceReconciliationFromSources.js";
import type { EvidenceReconciliation } from "./renderInput.js";

const uncitedCorpus = `@TSC
Feature: a fixture target whose corpus names neither of the two fitness functions its CI runs

  Rule: the target holds itself to the one behaviour it has written down

    @unit @SCN-TSC-001
    Scenario: the target keeps a behaviour it has actually specified
`;

const uncitedManifest = {
  scripts: {
    "lint:advisory": "eslint",
    "lint:enforced": "anemic-domain",
  },
  specController: {
    notChecks: ["ci.yml:quality:Checkout"],
    checkRegistry: {
      "lint:advisory": "complexity",
      "lint:enforced": "tech-conformance",
    },
  },
};

const uncitedCi = `name: fixture CI
on: [push, pull_request]
jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      - name: Advisory analysis
        continue-on-error: true
        run: pnpm lint:advisory
      - name: Enforced analysis
        run: pnpm lint:enforced
`;

function reconcileUncited(): EvidenceReconciliation {
  return evidenceReconciliationFromSources({
    featureSources: [uncitedCorpus],
    untaggedScenarios: [],
    packageJson: uncitedManifest,
    ciSources: [uncitedCi],
    ciSourceNames: ["ci.yml"],
    runtimeObservations: [],
    deferralTags: [],
  });
}

describe("[SCN-LNT-033] the fitness-function census counts a check whose red its job survives as a check that ran", () => {
  it("counts the severed uncited check in both census counts", () => {
    expect(reconcileUncited().summary.fitnessFunctions).toEqual({
      runningFitnessFunctionCount: 2,
      uncitedFitnessFunctionCount: 2,
    });
  });

  it("leaves the named count it implies at nil, and never below it", () => {
    const census = reconcileUncited().summary.fitnessFunctions;
    const named = (census?.runningFitnessFunctionCount ?? 0) - (census?.uncitedFitnessFunctionCount ?? 0);
    expect(named).toBe(0);
  });

  it("still POSTS both checks to the suspense row, the severed one included", () => {
    const suspense = reconcileUncited().ledger.scenarioReconciliations.filter(
      (row) => row.kind === "suspense-scenario"
    );
    expect(suspense.flatMap((row) => row.evidenceObservations)).toEqual([
      {
        qualityCheck: "fitness",
        fitnessFunction: "lint:advisory",
        exists: true,
        enforcedOverRealSource: false,
      },
      {
        qualityCheck: "fitness",
        fitnessFunction: "lint:enforced",
        exists: true,
        enforcedOverRealSource: true,
      },
    ]);
  });
});
