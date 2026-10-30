import { describe, it, expect } from "vitest";
import { stepAccountOf, type StepDisposition } from "./uncitedFitnessFunctions.js";
import type { JobStepAccount } from "./evidenceReconciliation.js";
import type { PipelineStep } from "./pipelineStep.js";
import { workflowSteps } from "../parse/parsedWorkflows.test-utils.js";
import { qualifiedStepName } from "../parse/stepNames.js";

const noRole = (): undefined => undefined;

const ciYml = (): string =>
  [
    "jobs:",
    "  ci:",
    "    steps:",
    "      - uses: actions/checkout@v4",
    "      - name: Install",
    "        run: pnpm install --frozen-lockfile",
    "      - name: Unit tests",
    "        run: pnpm test",
    "      - name: Rule check",
    "        run: pnpm lint:rules",
  ].join("\n");

const nightlyYml = (): string =>
  [
    "jobs:",
    "  sweep:",
    "    steps:",
    "      - name: Sweep check",
    "        run: pnpm lint:sweep",
    "      - name: Depth check",
    "        run: pnpm lint:depth",
    "  audit:",
    "    steps:",
    "      - name: Audit",
    "        run: pnpm audit --audit-level=high",
  ].join("\n");

const answering =
  (answers: Readonly<Record<string, StepDisposition>>) =>
  (step: PipelineStep): StepDisposition =>
    answers[step.identity] ?? "candidate";

const CHECKOUT_IS_PLUMBING = { "actions/checkout@v4": "plumbing" } as const;

const dispositionsSummed = ({ candidates, runners, reconciler, excluded, plumbing }: JobStepAccount): number =>
  candidates + runners + reconciler + excluded + plumbing;

describe("[SCN-USG-020] the step account's rows, one per workflow and job read, carry each disposition's count beside the steps read, and how many steps those dispositions account for", () => {
  it("gives a row for every workflow and job, in workflow then job order, with each disposition's count summing to the steps read", () => {
    const dispositionOf = answering({
      ...CHECKOUT_IS_PLUMBING,
      Install: "nonCheck",
      "Unit tests": "runner",
      "Depth check": "reconciler",
    });
    const { byJob } = stepAccountOf(
      workflowSteps([nightlyYml(), ciYml()], ["nightly.yml", "ci.yml"]),
      dispositionOf,
      qualifiedStepName,
      noRole
    );
    expect(byJob).toEqual([
      { workflow: "ci.yml", job: "ci", stepsRead: 4, candidates: 1, runners: 1, reconciler: 0, excluded: 1, plumbing: 1, accountedFor: 4 },
      { workflow: "nightly.yml", job: "audit", stepsRead: 1, candidates: 1, runners: 0, reconciler: 0, excluded: 0, plumbing: 0, accountedFor: 1 },
      { workflow: "nightly.yml", job: "sweep", stepsRead: 2, candidates: 1, runners: 0, reconciler: 1, excluded: 0, plumbing: 0, accountedFor: 2 },
    ]);
    expect(byJob.map((row) => dispositionsSummed(row) - row.stepsRead)).toEqual([0, 0, 0]);
  });

  it("gives no row for a job that calls a reusable workflow, or for a job with no body", () => {
    const withStepless = [ciYml(), "  reuse:", "    uses: ./.github/workflows/x.yml", "  empty:"].join("\n");
    expect(stepAccountOf(workflowSteps([withStepless], ["ci.yml"]), answering(CHECKOUT_IS_PLUMBING), qualifiedStepName, noRole).byJob).toEqual([
      { workflow: "ci.yml", job: "ci", stepsRead: 4, candidates: 3, runners: 0, reconciler: 0, excluded: 0, plumbing: 1, accountedFor: 4 },
    ]);
  });

  it("gives no row for a workflow that parses to no jobs", () => {
    expect(stepAccountOf(workflowSteps(["name: CI\non: [push]\n"], ["ci.yml"]), answering({}), qualifiedStepName, noRole).byJob).toEqual([]);
  });
});
