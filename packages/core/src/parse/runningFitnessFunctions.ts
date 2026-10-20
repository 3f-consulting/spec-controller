import type { FitnessEvidenceObservation } from "../model.js";
import { shellReading } from "./commandRuns.js";
import {
  commandInvokesScript,
  pipelineStepsOf,
  type PackageJsonScripts,
  type ParsedWorkflow,
} from "./checkScriptsRunInCI.js";
import type { PipelineStep } from "../domain/pipelineStep.js";
import type { ScriptCitation } from "./fitnessCitations.js";
import {
  declaredRunnerTest,
  isCandidateStep,
  type RunnerTiers,
  type StepTest,
} from "../domain/uncitedFitnessFunctions.js";
import { workflowObservationsOf } from "../domain/fitnessReconciliation.js";

function handleOf(step: PipelineStep, scripts: Readonly<Record<string, string>>): string {
  if (!("command" in step)) return step.identity;
  const invoked = Object.keys(scripts).filter((name) => commandInvokesScript(step.command, name));
  return invoked[0] ?? step.identity;
}

type CitationOf = (script: string, citedByStep?: string) => ScriptCitation | null;

export function runningFitnessFunctions(
  ciWorkflows: readonly ParsedWorkflow[],
  packageJson: PackageJsonScripts,
  runners: RunnerTiers,
  citedScn: CitationOf = () => null,
  isExcluded: StepTest = () => false
): FitnessEvidenceObservation[] {
  const runsARunner = declaredRunnerTest(packageJson.scripts ?? {}, runners, shellReading);
  return fitnessFunctionsAmong(
    pipelineStepsOf(ciWorkflows),
    packageJson,
    (step) => isCandidateStep(step, isExcluded, runsARunner),
    citedScn
  );
}

export function fitnessFunctionsAmong(
  steps: readonly PipelineStep[],
  packageJson: PackageJsonScripts,
  isCandidate: StepTest,
  citedScn: CitationOf
): FitnessEvidenceObservation[] {
  const scripts = packageJson.scripts ?? {};
  return workflowObservationsOf(steps, isCandidate, (step) => handleOf(step, scripts), citedScn);
}
