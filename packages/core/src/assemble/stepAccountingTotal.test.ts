import { describe, it, expect } from "vitest";
import { evidenceReconciliationFromSources } from "./evidenceReconciliationFromSources.js";
import type { EvidenceReconciliation } from "./renderInput.js";
import type { JobStepAccount } from "../domain/evidenceReconciliation.js";
import {
  feature,
  nightly,
  stepAccountingCi as ci,
  reconcileStepAccounting,
} from "../evidenceReconciliation.test-utils.js";
import { parsedFeatures } from "../parse/parsedFeatures.test-utils.js";
import { parsedWorkflows } from "../parse/parsedWorkflows.test-utils.js";

const manifest = {
  scripts: {
    test: "vitest run",
    build: "tsc -b",
    typecheck: "tsc --noEmit",
    "lint:sweep": "madge --circular",
    "lint:circular": "madge --circular",
    "lint:depth": "depcruise src",
  },
  specController: {
    runners: { unit: "vitest" },
    notChecks: ["ci.yml:ci:Checkout", "ci.yml:ci:Install", "ci.yml:ci:Build"],
  },
} as Parameters<typeof evidenceReconciliationFromSources>[0]["packageJson"];

function reconcileTwoWorkflows(): EvidenceReconciliation {
  return evidenceReconciliationFromSources({
    features: parsedFeatures([feature]),
    packageJson: manifest,
    ciWorkflows: parsedWorkflows([ci, nightly], ["ci.yml", "nightly.yml"]),
    reconcilerInvocation: "spec-controller balance",
    behaviouralObservations: [],
    deferralTags: [],
  });
}

const COUNTS = ["stepsRead", "candidates", "runners", "reconciler", "excluded", "plumbing"] as const;

type Counts = Record<(typeof COUNTS)[number], number>;

function countsOf(account: Counts): Counts {
  return Object.fromEntries(COUNTS.map((count) => [count, account[count]])) as Counts;
}

function summedOver(rows: readonly JobStepAccount[]): Counts {
  return Object.fromEntries(COUNTS.map((count) => [count, rows.reduce((total, row) => total + row[count], 0)])) as Counts;
}

describe("[SCN-RMD-023] the step accounting's total sums each count over its rows, one per workflow and job", () => {
  it("sums each count over the rows of two workflows and three jobs", () => {
    const accounting = reconcileTwoWorkflows().summary.stepAccounting!;
    expect(accounting.byJob.map(({ workflow, job }) => `${workflow}:${job}`)).toStrictEqual([
      "ci.yml:ci",
      "nightly.yml:audit",
      "nightly.yml:sweep",
    ]);
    expect(countsOf(accounting.total)).toStrictEqual({
      stepsRead: 18,
      candidates: 7,
      runners: 1,
      reconciler: 2,
      excluded: 3,
      plumbing: 5,
    });
    expect(countsOf(accounting.total)).toStrictEqual(summedOver(accounting.byJob));
  });

  it("carries, for a pipeline of one job, a total equal to that job's row", () => {
    const accounting = reconcileStepAccounting([ci]).summary.stepAccounting!;
    expect(accounting.byJob).toHaveLength(1);
    expect(countsOf(accounting.total)).toStrictEqual(countsOf(accounting.byJob[0]!));
    expect(accounting.total.stepsRead).toBe(15);
  });
});
