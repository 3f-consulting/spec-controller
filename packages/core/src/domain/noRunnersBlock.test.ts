import { describe, it, expect } from "vitest";
import { isCandidateStep, isExcludedFromDiscovery, runsADeclaredRunner, type ShellReading } from "./uncitedFitnessFunctions.js";
import type { PipelineStep } from "./pipelineStep.js";
import { runsAsCommand } from "./shellReading.test-utils.js";

const IN_THE_QUALITY_JOB = { workflow: "ci.yml", job: "quality", abortsJob: true, writesStepRecord: false, plumbing: false } as const;

const run = (identity: string, command: string): PipelineStep => ({ ...IN_THE_QUALITY_JOB, identity, command });
const using = (name: string, plumbing = false): PipelineStep => ({
  ...IN_THE_QUALITY_JOB,
  identity: name,
  plumbing,
  action: { name },
});

const pipeline = (): readonly PipelineStep[] => [
  using("actions/checkout@v4", true),
  run("Install", "pnpm install --frozen-lockfile"),
  run("Unit tests", "pnpm test"),
  run("Lint", "pnpm lint"),
  using("github/codeql-action/analyze@v3"),
];

const SCRIPTS = { test: "vitest run", lint: "eslint ." };
const NO_RUNNERS = {};

const SHELL: ShellReading = { runsAsCommand };

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
