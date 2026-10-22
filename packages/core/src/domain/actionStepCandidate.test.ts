import { describe, it, expect } from "vitest";
import { isCandidateStep, isExcludedFromDiscovery, runsADeclaredRunner, type ShellReading } from "./uncitedFitnessFunctions.js";
import type { PipelineStep } from "./pipelineStep.js";
import { runsAsCommand } from "./shellReading.test-utils.js";

const IN_THE_CI_JOB = { workflow: "ci.yml", job: "ci", abortsJob: true, writesStepRecord: false, plumbing: false } as const;

const CODEQL: PipelineStep = {
  ...IN_THE_CI_JOB,
  identity: "github/codeql-action/analyze@v3",
  action: { name: "github/codeql-action/analyze@v3" },
};
const DEPENDENCY_REVIEW: PipelineStep = {
  ...IN_THE_CI_JOB,
  identity: "Dependency review",
  action: { name: "actions/dependency-review-action@v4" },
};
const DOMAIN_PURITY: PipelineStep = { ...IN_THE_CI_JOB, identity: "domain-purity", command: "pnpm domain-purity" };

const SCRIPTS = { "domain-purity": "echo domain-purity", test: "vitest run" };
const RUNNERS = { unit: "vitest" };

const SHELL: ShellReading = { lastStagesOf: (commandText) => commandText, runsAsCommand };

const candidates = (pipeline: readonly PipelineStep[]): string[] =>
  pipeline.filter((step) =>
    isCandidateStep(
      step,
      (s) => isExcludedFromDiscovery(s, { isReconciler: () => false }, { isExcluded: () => false }),
      (s) => runsADeclaredRunner(s, SCRIPTS, RUNNERS, SHELL)
    )
  ).map((step) => step.identity);

describe("[SCN-USG-013] a `uses:` step is a candidate fitness function, reported by the action it uses", () => {
  it("keeps a `run:` step running no runner among the candidates", () => {
    expect(candidates([DOMAIN_PURITY])).toStrictEqual(["domain-purity"]);
  });

  it("keeps an action step outside GitHub's plumbing among the candidates, as it keeps a `run:` step, under the identity the step carries", () => {
    expect(candidates([CODEQL, DEPENDENCY_REVIEW, DOMAIN_PURITY])).toStrictEqual([
      "github/codeql-action/analyze@v3",
      "Dependency review",
      "domain-purity",
    ]);
  });
});
