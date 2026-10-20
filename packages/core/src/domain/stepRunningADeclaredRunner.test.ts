import { describe, it, expect } from "vitest";
import { isCandidateStep, isExcludedFromDiscovery, runsADeclaredRunner, type ShellReading } from "./uncitedFitnessFunctions.js";
import type { PipelineStep } from "./pipelineStep.js";

const IN_THE_CI_JOB = { sourceIndex: 0, job: "ci", abortsJob: true, writesStepRecord: false, plumbing: false } as const;

const run = (command: string): PipelineStep => ({ ...IN_THE_CI_JOB, identity: command, command });

const pipeline = (): readonly PipelineStep[] => [run("pnpm lint:foo"), run("pnpm test"), run("pnpm cucumber")];

const SCRIPTS = { "lint:foo": "echo x", test: "vitest run", cucumber: "cucumber-js" };
const RUNNERS = { unit: "vitest", integration: "cucumber-js" };

const scriptOf = (command: string, scripts: Readonly<Record<string, string>>): string =>
  scripts[command.replace(/^pnpm /, "")] ?? command;

const runsAsCommand: ShellReading["runsAsCommand"] = (commandText, invocation, scripts) =>
  scriptOf(commandText, scripts).startsWith(invocation);

const SHELL: ShellReading = { lastStagesOf: (commandText) => commandText, runsAsCommand };

const candidates = (): string[] =>
  pipeline().filter((step) =>
    isCandidateStep(
      step,
      (s) => isExcludedFromDiscovery(s, { isReconciler: () => false }, { isExcluded: () => false }),
      (s) => runsADeclaredRunner(s, SCRIPTS, RUNNERS, SHELL)
    )
  ).map((step) => step.identity);

describe("[SCN-USG-003] test and cucumber CI steps are not candidate fitness functions, because the manifest names their runners", () => {
  it("leaves out the steps that run the declared unit and integration runners, and keeps the step that runs neither", () => {
    expect(candidates()).toStrictEqual(["pnpm lint:foo"]);
  });
});
