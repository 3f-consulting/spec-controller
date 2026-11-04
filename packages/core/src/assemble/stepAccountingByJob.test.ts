import { describe, it, expect } from "vitest";
import { evidenceReconciliationFromSources } from "./evidenceReconciliationFromSources.js";
import type { EvidenceReconciliation } from "./renderInput.js";
import { unitTestsCi as ci, nightly, feature, byJobPackageJson as packageJson } from "../evidenceReconciliation.test-utils.js";
import { parsedFeatures } from "../parse/parsedFeatures.test-utils.js";
import { parsedWorkflows } from "../parse/parsedWorkflows.test-utils.js";

function reconcile(
  workflowSources: readonly string[],
  files?: readonly string[],
  manifest: typeof packageJson = packageJson
): EvidenceReconciliation {
  return evidenceReconciliationFromSources({
    features: parsedFeatures([feature]),
    packageJson: manifest,
    ciWorkflows: parsedWorkflows(workflowSources, files),
    behaviouralObservations: [],
    deferralTags: [],
  });
}

const nightlyRows = [
  { workflow: "nightly.yml", job: "audit", stepsRead: 1, candidates: 1, runners: 0, reconciler: 0, nonChecks: 0, plumbing: 0 },
  { workflow: "nightly.yml", job: "sweep", stepsRead: 2, candidates: 2, runners: 0, reconciler: 0, nonChecks: 0, plumbing: 0 },
];

describe("[SCN-RMD-012] the step accounting carries a row per workflow and job read, with its steps read and each disposition's count, ordered by workflow and then job compared character by character whatever the locale, and none for a run that reads no CI step and has no notChecks entry naming a workflow it did not read", () => {
  it("carries a row for every workflow and job read, with its steps read and each disposition's count, in one settled order", () => {
    const { summary } = reconcile([nightly, ci], ["nightly.yml", "ci.yml"]);
    expect(summary.stepAccounting?.byJob).toMatchObject([
      { workflow: "ci.yml", job: "quality", stepsRead: 3, candidates: 1, runners: 1, reconciler: 0, nonChecks: 0, plumbing: 1 },
      ...nightlyRows,
    ]);
  });

  it("orders the rows by workflow and then job, each compared character by character, whatever the locale", () => {
    const lintAndBuild = `name: fixture CI
jobs:
  build:
    steps:
      - name: Unit tests
        run: pnpm test
  Lint:
    steps:
      - name: Circular check
        run: pnpm lint:circular
`;
    const { summary } = reconcile([nightly, lintAndBuild], ["build.yml", "CI.yml"]);
    expect(summary.stepAccounting?.byJob.map(({ workflow, job }) => `${workflow}:${job}`)).toEqual([
      "CI.yml:Lint",
      "CI.yml:build",
      "build.yml:audit",
      "build.yml:sweep",
    ]);
  });

  it("counts a step the target calls a non-check under nonChecks, not as a candidate, in its row", () => {
    const { summary } = reconcile([nightly, ci], ["nightly.yml", "ci.yml"], {
      ...packageJson,
      specController: { runners: { unit: "vitest" }, notChecks: ["ci.yml:quality:Install"] },
    });
    expect(summary.stepAccounting?.byJob).toMatchObject([
      { workflow: "ci.yml", job: "quality", stepsRead: 3, candidates: 0, runners: 1, reconciler: 0, nonChecks: 1, plumbing: 1 },
      ...nightlyRows,
    ]);
  });

  it("carries no step accounting for a run that reads no workflow and names no notChecks entry, for one whose only workflow read has no step and whose entry names it, and for one whose only entry is malformed", () => {
    const usesOnly = "jobs:\n  release:\n    uses: ./.github/workflows/reuse.yml\n";
    const runs = {
      "no workflow read, no notChecks": reconcile([], []),
      "a step-less workflow read, its entry naming it": reconcile([usesOnly], ["release.yml"], {
        ...packageJson,
        specController: { runners: { unit: "vitest" }, notChecks: ["release.yml:release:Ship"] },
      }),
      "no workflow read, a malformed entry": reconcile([], [], {
        ...packageJson,
        specController: { runners: { unit: "vitest" }, notChecks: ["ci.yml:build"] },
      }),
    };
    for (const [run, { summary }] of Object.entries(runs)) {
      expect.soft(summary, run).not.toHaveProperty("stepAccounting");
    }
  });
});

describe("[SCN-RMD-028] a run that reads no CI step carries each notChecks entry naming a workflow it did not read in its step accounting, with every workflow it read, no row and a zero total", () => {
  it("carries those entries, the workflows read, no row and a zero total, for a run that reads no workflow and for one whose only workflow read has no step", () => {
    const usesOnly = "jobs:\n  release:\n    uses: ./.github/workflows/reuse.yml\n";
    const withNotChecks = (notChecks: string[]): typeof packageJson => ({
      ...packageJson,
      specController: { runners: { unit: "vitest" }, notChecks },
    });
    const zeroTotal = { stepsRead: 0, candidates: 0, runners: 0, reconciler: 0, nonChecks: 0, plumbing: 0 };
    const runs = [
      {
        run: "no workflow read",
        reconciled: reconcile([], [], withNotChecks(["deploy.yml:release:Ship", "a:b.yml:j:s", " ci.yml:j:s", "ci.yml:build"])),
        stepAccounting: {
          byJob: [],
          total: zeroTotal,
          steps: {},
          nonChecksNamingAWorkflowNotRead: ["deploy.yml:release:Ship", "a:b.yml:j:s", " ci.yml:j:s"],
          workflowsRead: [],
        },
        elsewhere: { nonChecksNotAStepName: ["ci.yml:build"] },
      },
      {
        run: "a step-less workflow read",
        reconciled: reconcile([usesOnly], ["caller.yml"], withNotChecks(["deploy.yml:release:Ship", "caller.yml:release:Ship"])),
        stepAccounting: {
          byJob: [],
          total: zeroTotal,
          steps: {},
          nonChecksNamingAWorkflowNotRead: ["deploy.yml:release:Ship"],
          workflowsRead: ["caller.yml"],
        },
        elsewhere: { nonChecksMatchingNoStep: ["caller.yml:release:Ship"] },
      },
    ];
    for (const { run, reconciled: { summary }, stepAccounting, elsewhere } of runs) {
      expect.soft(summary.stepAccounting, run).toStrictEqual(stepAccounting);
      expect.soft(summary, run).toMatchObject(elsewhere);
    }
  });
});
