import { describe, expect, it } from "vitest";
import { shellAnswers } from "../inputs/shell.js";
import { workflowStepsFrom } from "../inputs/workflows.js";
import type { ClaimReconciliation } from "./claimReconciliation.js";
import { runVerdictOf, stepAccountOf } from "./evidenceReconciliation.js";
import { stepDispositionOf } from "./postEvidenceObservation.js";

const balancedClaim = (number: string): ClaimReconciliation => ({
  claim: { claimCode: { featureCode: "ONE", number }, file: "one.feature", title: `scenario ${number}`, obligations: [] },
  qualityCheckReconciliations: [],
  verdict: "balanced",
});

describe("the run will be balanced or out of balance, as its Claim Reconciliations call for", () => {
  it("[CLM-EVR-001] a run of only balanced Claim Reconciliations is balanced", () => {
    expect(runVerdictOf([balancedClaim("001"), balancedClaim("002")])).toEqual({ verdict: "balanced" });
  });
});

describe("balance accounts for every step it reads", () => {
  const twoJobs = () =>
    workflowStepsFrom(
      "ci.yml",
      JSON.stringify({
        jobs: {
          build: { steps: [{ uses: "actions/checkout@v4" }, { run: "pnpm lint" }, { run: "spec-controller balance" }] },
          test: { steps: [{ name: "Install", run: "pnpm install" }, { run: "pnpm audit-the-tree" }] },
        },
      }),
    ).map((step) => ({ step, disposition: stepDispositionOf(step, { runners: {}, nonChecks: [{ workflow: "ci.yml", job: "test", step: "Install" }], deferralTags: [] }, {}, shellAnswers) }));

  it("[CLM-EVR-032] each job's counts will add up to the steps read in it", () => {
    const { jobs } = stepAccountOf(twoJobs());

    expect(jobs.map(({ stepsRead, runners, reconcilerSteps, nonChecks, plumbing, candidates }) => ({ stepsRead, sum: runners + reconcilerSteps + nonChecks + plumbing + candidates }))).toEqual([
      { stepsRead: 3, sum: 3 },
      { stepsRead: 2, sum: 2 },
    ]);
  });

  it("[CLM-EVR-033] the total will be the sum of the jobs", () => {
    const { total } = stepAccountOf(twoJobs());

    expect(total).toEqual({ stepsRead: 5, runners: 0, reconcilerSteps: 1, nonChecks: 1, plumbing: 1, candidates: 2, accountedFor: 5 });
  });
});
