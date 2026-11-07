import { describe, it, expect } from "vitest";
import type { PipelineStep } from "./pipelineStep.js";
import { candidatesAmong, IN_THE_CI_JOB as IN_CI_YML } from "./candidateStep.test-utils.js";

const IN_NIGHTLY_YML = { workflow: "nightly.yml", job: "nightly", abortsJob: true, writesStepRecord: false, plumbing: false } as const;

const run = (workflow: typeof IN_CI_YML | typeof IN_NIGHTLY_YML, script: string): PipelineStep => ({
  ...workflow,
  identity: script,
  command: `pnpm ${script}`,
});

const SCRIPTS = { "lint:sweep": "echo sweep", test: "vitest run" };
const RUNNERS = { unit: "vitest" };

const candidates = (pipeline: readonly PipelineStep[]): string[] => candidatesAmong(pipeline, SCRIPTS, RUNNERS);

describe("[CLM-USG-007] an uncited check running in a sibling workflow is a candidate fitness function", () => {
  it("keeps a check run by the first workflow among the candidates", () => {
    expect(candidates([run(IN_CI_YML, "test"), run(IN_CI_YML, "lint:sweep")])).toStrictEqual(["lint:sweep"]);
  });

  it("keeps the same check among the candidates when the second workflow runs it, as it does when the first does", () => {
    expect(candidates([run(IN_CI_YML, "test"), run(IN_NIGHTLY_YML, "lint:sweep")])).toStrictEqual(["lint:sweep"]);
  });
});
