import { describe, it, expect } from "vitest";
import { isCandidateStep, isExcludedFromDiscovery, isGitHubPlumbingStep, notChecksApplied } from "./uncitedFitnessFunctions.js";
import type { PipelineStep } from "./pipelineStep.js";

const IN_THE_QUALITY_JOB = { sourceIndex: 0, job: "quality", abortsJob: true, writesStepRecord: false } as const;

const PLUMBING_REPOSITORIES = ["checkout", "cache", "upload-artifact", "download-artifact", "setup-node"];
const LINT: PipelineStep = { ...IN_THE_QUALITY_JOB, identity: "Lint", command: "pnpm lint" };

const NO_RECONCILER = { isReconciler: () => false };
const NO_NON_CHECKS = { isExcluded: () => false };
const RUNS_NO_RUNNER = (): boolean => false;

const using = (repository: string): PipelineStep => ({
  ...IN_THE_QUALITY_JOB,
  identity: `actions/${repository}@v4`,
  action: { name: `actions/${repository}@v4`, owner: "actions", repository },
});

const isCandidate = (step: PipelineStep): boolean =>
  isCandidateStep(step, (s) => isExcludedFromDiscovery(s, NO_RECONCILER, NO_NON_CHECKS), RUNS_NO_RUNNER);

describe("[SCN-USG-030] a step that only uses one of GitHub's plumbing actions is not a candidate fitness function, whatever ref pins it", () => {
  it.each(PLUMBING_REPOSITORIES)("a step using actions/%s is plumbing, and is not a candidate", (repository) => {
    const step = using(repository);
    expect(isGitHubPlumbingStep(step)).toBe(true);
    expect(isCandidate(step)).toBe(false);
  });

  it("leaves the command step beside them a candidate", () => {
    expect(isGitHubPlumbingStep(LINT)).toBe(false);
    expect(isCandidate(LINT)).toBe(true);
  });
});

const outsideTheList = (name: string, owner: string, repository: string): PipelineStep => ({
  ...IN_THE_QUALITY_JOB,
  identity: name,
  action: { name, owner, repository },
});

describe("[SCN-USG-031] an action outside the closed list stays a candidate — dependency review, another owner's look-alike and a local action", () => {
  it.each([
    ["actions/dependency-review-action@v4", "actions", "dependency-review-action"],
    ["actions/checkout-extra@v1", "actions", "checkout-extra"],
    ["someone/checkout@v1", "someone", "checkout"],
    ["./.github/actions/lint", ".", ".github"],
    ["docker://alpine:3", "docker:", ""],
  ])("a step using %s is not plumbing, and is a candidate", (name, owner, repository) => {
    const step = outsideTheList(name, owner, repository);
    expect(isGitHubPlumbingStep(step)).toBe(false);
    expect(isCandidate(step)).toBe(true);
  });
});

const SET_UP_NODE: PipelineStep = {
  ...IN_THE_QUALITY_JOB,
  identity: "Set up Node",
  action: { name: "actions/setup-node@v4", owner: "actions", repository: "setup-node" },
};
const UNNAMED_CHECKOUT: PipelineStep = {
  ...IN_THE_QUALITY_JOB,
  identity: "actions/checkout@v4",
  action: { name: "actions/checkout@v4", owner: "actions", repository: "checkout" },
};
const NAMED_A_NON_CHECK = "ci.yml:quality:Set up Node";

const namedInItsWorkflow = (step: PipelineStep): string => `ci.yml:${step.job}:${step.identity}`;

describe("[SCN-USG-032] a plumbing step the manifest names a non-check is excluded as the manifest says, and its entry is not stale", () => {
  it("names the plumbing step excluded, and reports no entry matching no step", () => {
    const { excluded, unmatchedEntries } = notChecksApplied(
      [SET_UP_NODE, UNNAMED_CHECKOUT],
      namedInItsWorkflow,
      [NAMED_A_NON_CHECK]
    );
    expect(excluded).toStrictEqual([NAMED_A_NON_CHECK]);
    expect(unmatchedEntries).toStrictEqual([]);
  });

  it("leaves the named plumbing step no candidate", () => {
    const notChecks = notChecksApplied([SET_UP_NODE, UNNAMED_CHECKOUT], namedInItsWorkflow, [NAMED_A_NON_CHECK]);
    expect(isCandidateStep(SET_UP_NODE, (s) => isExcludedFromDiscovery(s, NO_RECONCILER, notChecks), RUNS_NO_RUNNER)).toBe(false);
  });

  it("holds the unnamed checkout as plumbing, not as a step the manifest excludes", () => {
    const { isExcluded } = notChecksApplied([SET_UP_NODE, UNNAMED_CHECKOUT], namedInItsWorkflow, [NAMED_A_NON_CHECK]);
    expect(isGitHubPlumbingStep(UNNAMED_CHECKOUT)).toBe(true);
    expect(isExcluded(UNNAMED_CHECKOUT)).toBe(false);
  });
});
