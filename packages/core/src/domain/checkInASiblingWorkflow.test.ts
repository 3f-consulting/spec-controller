import { describe, it, expect } from "vitest";
import { isCandidateStep, isExcludedFromDiscovery, runsADeclaredRunner, type ShellReading } from "./uncitedFitnessFunctions.js";
import type { PipelineStep } from "./pipelineStep.js";

const IN_CI_YML = { sourceIndex: 0, job: "ci", abortsJob: true, writesStepRecord: false } as const;
const IN_NIGHTLY_YML = { sourceIndex: 1, job: "nightly", abortsJob: true, writesStepRecord: false } as const;

const run = (workflow: typeof IN_CI_YML | typeof IN_NIGHTLY_YML, script: string): PipelineStep => ({
  ...workflow,
  identity: script,
  command: `pnpm ${script}`,
});

const SCRIPTS = { "lint:sweep": "echo sweep", test: "vitest run" };
const RUNNERS = { unit: "vitest" };

const scriptOf = (command: string, scripts: Readonly<Record<string, string>>): string =>
  scripts[command.replace(/^pnpm /, "")] ?? command;

const runsAsCommand: ShellReading["runsAsCommand"] = (commandText, invocation, scripts) =>
  scriptOf(commandText, scripts).startsWith(invocation);

const SHELL: ShellReading = { lastStagesOf: (commandText) => commandText, runsAsCommand };

const candidates = (pipeline: readonly PipelineStep[]): string[] =>
  pipeline.filter((step) =>
    isCandidateStep(
      step,
      (s) => isExcludedFromDiscovery(s, { isReconciler: () => false }, { isExcluded: () => false }),
      (s) => runsADeclaredRunner(s, SCRIPTS, RUNNERS, SHELL)
    )
  ).map((step) => step.identity);

describe("[SCN-USG-007] an uncited check running in a sibling workflow is a candidate fitness function", () => {
  it("keeps a check run by the first workflow among the candidates", () => {
    expect(candidates([run(IN_CI_YML, "test"), run(IN_CI_YML, "lint:sweep")])).toStrictEqual(["lint:sweep"]);
  });

  it("keeps the same check among the candidates when the second workflow runs it, as it does when the first does", () => {
    expect(candidates([run(IN_CI_YML, "test"), run(IN_NIGHTLY_YML, "lint:sweep")])).toStrictEqual(["lint:sweep"]);
  });
});
