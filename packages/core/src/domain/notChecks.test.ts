import { describe, it, expect } from "vitest";
import { notChecksApplied } from "./uncitedFitnessFunctions.js";
import type { PipelineStep } from "./pipelineStep.js";

const IN_THE_QUALITY_JOB = { sourceIndex: 0, job: "quality", abortsJob: true, writesStepRecord: false } as const;

const TYPES: PipelineStep = { ...IN_THE_QUALITY_JOB, identity: "Types", command: "pnpm typecheck" };
const TESTS: PipelineStep = { ...IN_THE_QUALITY_JOB, identity: "Tests", command: "pnpm test" };
const STEPS = [TYPES, TESTS];

const EXCLUDED_STEP = "ci.yml:quality:Types";
const STRAY_ENTRY = "ci.yml:quality:Lint";

const namedInItsWorkflow = (step: PipelineStep): string => `ci.yml:${step.job}:${step.identity}`;

describe("[SCN-USG-015] a step named in `notChecks` is not a candidate, and is reported as excluded rather than dropped", () => {
  it("excludes the step an entry names, and reports it as excluded", () => {
    const { excluded, isExcluded } = notChecksApplied(STEPS, namedInItsWorkflow, [EXCLUDED_STEP, STRAY_ENTRY]);
    expect(excluded).toStrictEqual([EXCLUDED_STEP]);
    expect(isExcluded(TYPES)).toBe(true);
  });

  it("reports an entry that names no step as matching no step", () => {
    const { unmatchedEntries } = notChecksApplied(STEPS, namedInItsWorkflow, [EXCLUDED_STEP, STRAY_ENTRY]);
    expect(unmatchedEntries).toStrictEqual([STRAY_ENTRY]);
  });

  it("does not exclude a step that no entry names", () => {
    const { isExcluded } = notChecksApplied(STEPS, namedInItsWorkflow, [EXCLUDED_STEP, STRAY_ENTRY]);
    expect(isExcluded(TESTS)).toBe(false);
  });

  it("carries nothing in either account when the manifest names no step a non-check", () => {
    const { excluded, unmatchedEntries, isExcluded } = notChecksApplied(STEPS, namedInItsWorkflow, []);
    expect(excluded).toStrictEqual([]);
    expect(unmatchedEntries).toStrictEqual([]);
    expect(isExcluded(TYPES)).toBe(false);
  });
});
