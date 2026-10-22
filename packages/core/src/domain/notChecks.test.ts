import { describe, it, expect } from "vitest";
import { nonChecksApplied } from "./uncitedFitnessFunctions.js";
import type { PipelineStep } from "./pipelineStep.js";
import { namedInItsWorkflow } from "./stepNaming.test-utils.js";

const IN_THE_QUALITY_JOB = { workflow: "ci.yml", job: "quality", abortsJob: true, writesStepRecord: false, plumbing: false } as const;

const TYPES: PipelineStep = { ...IN_THE_QUALITY_JOB, identity: "Types", command: "pnpm typecheck" };
const TESTS: PipelineStep = { ...IN_THE_QUALITY_JOB, identity: "Tests", command: "pnpm test" };
const STEPS = [TYPES, TESTS];

const EXCLUDED_STEP = "ci.yml:quality:Types";
const STRAY_ENTRY = "ci.yml:quality:Lint";

describe("[SCN-USG-015] a step named in `notChecks` is not a candidate, and is reported as excluded rather than dropped", () => {
  it("excludes the step an entry names, and reports it as excluded", () => {
    const { excluded, isExcluded } = nonChecksApplied(STEPS, namedInItsWorkflow, [EXCLUDED_STEP, STRAY_ENTRY]);
    expect(excluded).toStrictEqual([EXCLUDED_STEP]);
    expect(isExcluded(TYPES)).toBe(true);
  });

  it("reports an entry that names no step as matching no step", () => {
    const { unmatchedEntries } = nonChecksApplied(STEPS, namedInItsWorkflow, [EXCLUDED_STEP, STRAY_ENTRY]);
    expect(unmatchedEntries).toStrictEqual([STRAY_ENTRY]);
  });

  it("does not exclude a step that no entry names", () => {
    const { isExcluded } = nonChecksApplied(STEPS, namedInItsWorkflow, [EXCLUDED_STEP, STRAY_ENTRY]);
    expect(isExcluded(TESTS)).toBe(false);
  });

  it("carries nothing in either account when the manifest names no step a non-check", () => {
    const { excluded, unmatchedEntries, isExcluded } = nonChecksApplied(STEPS, namedInItsWorkflow, []);
    expect(excluded).toStrictEqual([]);
    expect(unmatchedEntries).toStrictEqual([]);
    expect(isExcluded(TYPES)).toBe(false);
  });
});
