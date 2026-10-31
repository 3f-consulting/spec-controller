import { describe, it, expect } from "vitest";
import type { PipelineStep } from "./pipelineStep.js";
import { candidatesAmong, IN_THE_CI_JOB } from "./candidateStep.test-utils.js";

const run = (command: string): PipelineStep => ({ ...IN_THE_CI_JOB, identity: command, command });

const pipeline = (): readonly PipelineStep[] => [run("pnpm lint:foo"), run("pnpm test"), run("pnpm cucumber")];

const SCRIPTS = { "lint:foo": "echo x", test: "vitest run", cucumber: "cucumber-js" };
const RUNNERS = { unit: "vitest", integration: "cucumber-js" };

const candidates = (): string[] => candidatesAmong(pipeline(), SCRIPTS, RUNNERS);

describe("[SCN-USG-003] test and cucumber CI steps are not candidate fitness functions, because the manifest names their runners", () => {
  it("leaves out the steps that run the declared unit and integration runners, and keeps the step that runs neither", () => {
    expect(candidates()).toStrictEqual(["pnpm lint:foo"]);
  });
});
