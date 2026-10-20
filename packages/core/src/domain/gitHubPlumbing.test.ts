import { describe, it, expect } from "vitest";
import { isCandidateStep, isExcludedFromDiscovery, notChecksApplied, stepDispositions } from "./uncitedFitnessFunctions.js";
import type { PipelineStep } from "./pipelineStep.js";
import { namedInItsWorkflow } from "./stepNaming.test-utils.js";
import { workflowSteps } from "../parse/parsedWorkflows.test-utils.js";

const IN_THE_QUALITY_JOB = { sourceIndex: 0, job: "quality", abortsJob: true, writesStepRecord: false, plumbing: false } as const;

const NO_RECONCILER = { isReconciler: () => false };
const RUNS_NO_RUNNER = (): boolean => false;

const PINNED_SHA = "1d0ff469b7ec7b3cb9d8673fde0c81c44821de2a";

const PLUMBING_USES = [
  "actions/checkout@v4",
  `actions/checkout@${PINNED_SHA}`,
  "actions/setup-node@v4",
  `actions/setup-node@${PINNED_SHA}`,
  "actions/cache@v4",
  `actions/cache@${PINNED_SHA}`,
  `actions/cache/restore@${PINNED_SHA}`,
  "actions/upload-artifact@v4",
  `actions/upload-artifact@${PINNED_SHA}`,
  "actions/download-artifact@v4",
  `actions/download-artifact@${PINNED_SHA}`,
];

const plumbingBesideLint = (): string => `jobs:
  quality:
    steps:
${PLUMBING_USES.map((uses) => `      - uses: ${uses}\n`).join("")}      - name: Lint
        run: pnpm lint
`;

const readThroughTheWorkflowModule = (): readonly PipelineStep[] => workflowSteps([plumbingBesideLint()]);

const dispositionWhereNothingElseDecides = (step: PipelineStep): string =>
  stepDispositions({ isReconciler: () => false, isNamedANonCheck: () => false, runsARunner: () => false })(step);

describe("[SCN-USG-030] a step that only uses one of GitHub's plumbing actions is not a candidate fitness function, whatever ref pins it", () => {
  it("marks each step using one of the plumbing actions as plumbing, at a tag, at a commit and under a sub-path", () => {
    const usingAnAction = readThroughTheWorkflowModule().filter((step) => "action" in step);
    expect(usingAnAction.map((step) => [step.identity, step.plumbing])).toStrictEqual(PLUMBING_USES.map((uses) => [uses, true]));
  });

  it("gives each marked step the plumbing disposition", () => {
    const usingAnAction = readThroughTheWorkflowModule().filter((step) => "action" in step);
    expect(usingAnAction.map(dispositionWhereNothingElseDecides)).toStrictEqual(PLUMBING_USES.map(() => "plumbing"));
  });

  it("leaves the run: step beside them unmarked, and a candidate", () => {
    const lint = readThroughTheWorkflowModule().filter((step) => "command" in step);
    expect(lint.map((step) => [step.identity, step.plumbing, dispositionWhereNothingElseDecides(step)])).toStrictEqual([
      ["Lint", false, "candidate"],
    ]);
  });
});

const OUTSIDE_THE_LIST_USES = [
  "actions/dependency-review-action@v4",
  "someone/checkout@v4",
  "actions/checkout-extra@v1",
  "./.github/actions/lint",
  "docker://alpine:3",
];

const outsideTheListBesideLint = (): string => `jobs:
  quality:
    steps:
${OUTSIDE_THE_LIST_USES.map((uses) => `      - uses: ${uses}\n`).join("")}      - name: Lint
        run: pnpm lint
`;

const outsideTheListThroughTheWorkflowModule = (): readonly PipelineStep[] =>
  workflowSteps([outsideTheListBesideLint()]).filter((step) => "action" in step);

describe("[SCN-USG-031] an action outside the closed list stays a candidate — dependency review, another owner's look-alike and a local action", () => {
  it("leaves each step using an action outside the closed list unmarked: another of GitHub's actions, another owner's checkout, a look-alike, a local action and an image", () => {
    expect(outsideTheListThroughTheWorkflowModule().map((step) => [step.identity, step.plumbing])).toStrictEqual(
      OUTSIDE_THE_LIST_USES.map((uses) => [uses, false])
    );
  });

  it("gives each unmarked step the candidate disposition", () => {
    expect(outsideTheListThroughTheWorkflowModule().map(dispositionWhereNothingElseDecides)).toStrictEqual(
      OUTSIDE_THE_LIST_USES.map(() => "candidate")
    );
  });
});

const SET_UP_NODE: PipelineStep = {
  ...IN_THE_QUALITY_JOB,
  identity: "Set up Node",
  plumbing: true,
  action: { name: "actions/setup-node@v4" },
};
const UNNAMED_CHECKOUT: PipelineStep = {
  ...IN_THE_QUALITY_JOB,
  identity: "actions/checkout@v4",
  plumbing: true,
  action: { name: "actions/checkout@v4" },
};
const NAMED_A_NON_CHECK = "ci.yml:quality:Set up Node";

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
    expect(stepDispositions({ ...NO_RECONCILER, isNamedANonCheck: isExcluded, runsARunner: RUNS_NO_RUNNER })(UNNAMED_CHECKOUT)).toBe("plumbing");
    expect(isExcluded(UNNAMED_CHECKOUT)).toBe(false);
  });
});
