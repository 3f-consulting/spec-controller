import { describe, it, expect } from "vitest";
import { isCandidateStep, isExcludedFromDiscovery, runsADeclaredRunner, type ShellReading } from "./uncitedFitnessFunctions.js";
import type { PipelineStep } from "./pipelineStep.js";
import { runsAsCommand } from "./shellReading.test-utils.js";

const IN_THE_CI_JOB = { workflow: "ci.yml", job: "ci", abortsJob: true, writesStepRecord: false, plumbing: false } as const;

const run = (script: string): PipelineStep => ({ ...IN_THE_CI_JOB, identity: script, command: `pnpm ${script}` });

const SCRIPTS = {
  "lint:foo": "echo lint",
  audit: "echo audit",
  "check-licences": "echo licences",
  my_check: "echo mine",
};
const RUNNERS = { unit: "vitest", integration: "cucumber-js" };

const SHELL: ShellReading = { runsAsCommand };

const candidates = (pipeline: readonly PipelineStep[]): string[] =>
  pipeline.filter((step) =>
    isCandidateStep(
      step,
      (s) => isExcludedFromDiscovery(s, { isReconciler: () => false }, { isExcluded: () => false }),
      (s) => runsADeclaredRunner(s, SCRIPTS, RUNNERS, SHELL)
    )
  ).map((step) => step.identity);

describe("[SCN-USG-004] an uncited check whose script name carries no prefix of ours is a candidate fitness function", () => {
  it("keeps a step whose script is named by a convention of ours among the candidates", () => {
    expect(candidates([run("lint:foo")])).toStrictEqual(["lint:foo"]);
  });

  it.each(["audit", "check-licences", "my_check"])(
    "keeps a step running the script %j among the candidates, as it keeps the conventionally named one",
    (script) => {
      expect(candidates([run("lint:foo"), run(script)])).toStrictEqual(["lint:foo", script]);
    }
  );
});
