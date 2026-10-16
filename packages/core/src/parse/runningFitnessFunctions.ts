import type { FitnessEvidenceObservation } from "../model.js";
import { shellReading } from "./commandRuns.js";
import {
  ciWorkflowSteps,
  commandInvokesScript,
  type PackageJsonScripts,
} from "./checkScriptsRunInCI.js";
import type { PipelineStep } from "../domain/pipelineStep.js";
import type { ScriptCitation } from "./fitnessCitations.js";
import { isCandidateStep, runsADeclaredRunner } from "../domain/fitnessDiscovery.js";

function handleOf(step: PipelineStep, scripts: Readonly<Record<string, string>>): string {
  if (!("command" in step)) return step.identity;
  const invoked = Object.keys(scripts).filter((name) => commandInvokesScript(step.command, name));
  return invoked[0] ?? step.identity;
}

export function runningFitnessFunctions(
  ciSources: readonly string[],
  packageJson: PackageJsonScripts,
  runners: Readonly<Record<string, string | null>>,
  citedScn: (script: string, citedByStep?: string) => ScriptCitation | null = () => null,
  isExcluded: (step: PipelineStep) => boolean = () => false
): FitnessEvidenceObservation[] {
  return fitnessFunctionsAmong(
    ciWorkflowSteps(ciSources),
    packageJson,
    runners,
    citedScn,
    isExcluded
  );
}

type RunnerTiers = Readonly<Record<string, string | null>>;
type CitationOf = (script: string, citedByStep?: string) => ScriptCitation | null;
type StepTest = (step: PipelineStep) => boolean;

export function fitnessFunctionsAmong(
  steps: readonly PipelineStep[],
  packageJson: PackageJsonScripts,
  runners: RunnerTiers,
  citedScn: CitationOf = () => null,
  isExcluded: StepTest = () => false
): FitnessEvidenceObservation[] {
  const scripts = packageJson.scripts ?? {};
  const candidates = steps.filter((step) =>
    isCandidateStep(step, isExcluded, (s) => runsADeclaredRunner(s, scripts, runners, shellReading))
  );
  return candidates
    .map((step) => {
      const fitnessFunction = handleOf(step, scripts);
      const citation = citedScn(fitnessFunction, step.id);
      return {
        qualityCheck: "fitness" as const,
        fitnessFunction,
        exists: true,
        enforcedOverRealSource: step.abortsJob,
        ...(citation !== null
          ? { scnId: step.id ?? citation.scnId }
          : {}),
      };
    })
    .sort((a, b) => a.fitnessFunction.localeCompare(b.fitnessFunction));
}
