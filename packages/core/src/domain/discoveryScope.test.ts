import { describe, it, expect } from "vitest";
import { discoveryScope, type StepDisposition } from "./uncitedFitnessFunctions.js";
import type { PipelineStep } from "./pipelineStep.js";
import { workflowSteps } from "../parse/parsedWorkflows.test-utils.js";

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

describe("[SCN-USG-020] discoveryScope — the workflows and the jobs a run read", () => {
  it("names every workflow and every job, with the steps it read from each", () => {
    const dispositionOf = answering({ ...CHECKOUT_IS_PLUMBING, Install: "nonCheck", "Unit tests": "runner" });
    expect(
      discoveryScope(workflowSteps([ciYml(), nightlyYml()], ["ci.yml", "nightly.yml"]), dispositionOf)
    ).toEqual([
      { source: "ci.yml", job: "ci", steps: 4, candidates: 1 },
      { source: "nightly.yml", job: "audit", steps: 1, candidates: 1 },
      { source: "nightly.yml", job: "sweep", steps: 2, candidates: 2 },
    ]);
  });

  it("adds no steps for a job that calls a reusable workflow, or for a job with no body", () => {
    const withStepless = [ciYml(), "  reuse:", "    uses: ./.github/workflows/x.yml", "  empty:"].join("\n");
    expect(discoveryScope(workflowSteps([withStepless], ["ci.yml"]), answering(CHECKOUT_IS_PLUMBING))).toEqual([
      { source: "ci.yml", job: "ci", steps: 4, candidates: 3 },
    ]);
  });

  it("reads nothing from a document that parses to no jobs", () => {
    expect(discoveryScope(workflowSteps(["name: CI\non: [push]\n"], ["ci.yml"]), answering({}))).toEqual([]);
  });
});
