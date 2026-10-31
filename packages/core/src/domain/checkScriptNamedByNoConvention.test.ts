import { describe, it, expect } from "vitest";
import type { PipelineStep } from "./pipelineStep.js";
import { candidatesAmong, IN_THE_CI_JOB } from "./candidateStep.test-utils.js";

const run = (script: string): PipelineStep => ({ ...IN_THE_CI_JOB, identity: script, command: `pnpm ${script}` });

const SCRIPTS = {
  "lint:foo": "echo lint",
  audit: "echo audit",
  "check-licences": "echo licences",
  my_check: "echo mine",
};
const RUNNERS = { unit: "vitest", integration: "cucumber-js" };

const candidates = (pipeline: readonly PipelineStep[]): string[] => candidatesAmong(pipeline, SCRIPTS, RUNNERS);

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
