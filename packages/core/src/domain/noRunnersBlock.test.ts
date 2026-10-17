import { describe, it, expect } from "vitest";
import { isCandidateStep, isExcludedFromDiscovery, runsADeclaredRunner, type ShellReading } from "./uncitedFitnessFunctions.js";
import type { PipelineStep } from "./pipelineStep.js";

const IN_THE_QUALITY_JOB = { sourceIndex: 0, job: "quality", abortsJob: true, writesStepRecord: false } as const;

const run = (identity: string, command: string): PipelineStep => ({ ...IN_THE_QUALITY_JOB, identity, command });
const using = (name: string, owner: string, repository: string): PipelineStep => ({
  ...IN_THE_QUALITY_JOB,
  identity: name,
  action: { name, owner, repository },
});

const pipeline = (): readonly PipelineStep[] => [
  using("actions/checkout@v4", "actions", "checkout"),
  run("Install", "pnpm install --frozen-lockfile"),
  run("Unit tests", "pnpm test"),
  run("Lint", "pnpm lint"),
  using("github/codeql-action/analyze@v3", "github", "codeql-action"),
];

const SCRIPTS = { test: "vitest run", lint: "eslint ." };
const NO_RUNNERS = {};

const scriptOf = (command: string, scripts: Readonly<Record<string, string>>): string =>
  scripts[command.replace(/^pnpm /, "")] ?? command;

const runsAsCommand: ShellReading["runsAsCommand"] = (commandText, invocation, scripts) =>
  scriptOf(commandText, scripts).startsWith(invocation);

const SHELL: ShellReading = { lastStagesOf: (commandText) => commandText, runsAsCommand };

const candidates = (runners: Readonly<Record<string, string | null>>): string[] =>
  pipeline().filter((step) =>
    isCandidateStep(
      step,
      (s) => isExcludedFromDiscovery(s, { isReconciler: () => false }, { isExcluded: () => false }),
      (s) => runsADeclaredRunner(s, SCRIPTS, runners, SHELL)
    )
  ).map((step) => step.identity);

describe("[SCN-USG-017] a target with no runners block reports every step of its pipeline but GitHub's plumbing as a candidate", () => {
  it("makes every step but the checkout a candidate, the test step among them, when the runners block names nothing", () => {
    expect(candidates(NO_RUNNERS)).toStrictEqual([
      "Install",
      "Unit tests",
      "Lint",
      "github/codeql-action/analyze@v3",
    ]);
  });

  it("takes the test step out of the candidates once the runners block names the runner it runs", () => {
    expect(candidates({ unit: "vitest" })).toStrictEqual(["Install", "Lint", "github/codeql-action/analyze@v3"]);
  });
});
