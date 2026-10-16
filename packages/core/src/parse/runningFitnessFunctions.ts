import type { FitnessEvidenceObservation } from "../model.js";
import { commandRunsAsCommand } from "./commandRuns.js";
import {
  ciWorkflowSteps,
  commandInvokesScript,
  type PackageJsonScripts,
} from "./checkScriptsRunInCI.js";
import type { PipelineStep } from "../domain/pipelineStep.js";
import type { BehaviouralRunner } from "../domain/evidenceReconciliation.js";
import type { ScriptCitation } from "./fitnessCitations.js";

const UP_TO_LAST_PIPE = /^.*(?<!\|)\|(?!\|)/;

function finalStages(command: string): string {
  return command
    .replace(/\\\r?\n/g, " ")
    .split(/\r?\n/)
    .map((line) => line.replace(UP_TO_LAST_PIPE, ""))
    .join("\n");
}

function namedRunnersAt(
  step: PipelineStep,
  scripts: Readonly<Record<string, string>>,
  runners: Readonly<Record<string, string | null>>
): readonly (readonly [string, string])[] {
  if (!("runs" in step)) return [];
  const command = finalStages(step.runs);
  const unpiped = Object.fromEntries(
    Object.entries(scripts).map(([name, body]) => [name, finalStages(body)])
  );
  return Object.entries(runners).filter(
    (entry): entry is [string, string] =>
      entry[1] !== null && commandRunsAsCommand(command, entry[1], unpiped)
  );
}

function handleOf(step: PipelineStep, scripts: Readonly<Record<string, string>>): string {
  if (!("runs" in step)) return step.identity;
  const invoked = Object.keys(scripts).filter((name) => commandInvokesScript(step.runs, name));
  return invoked[0] ?? step.identity;
}

export function isCandidateStep(
  step: PipelineStep,
  packageJson: PackageJsonScripts,
  runners: Readonly<Record<string, string | null>>,
  isExcludedFromDiscovery: (step: PipelineStep) => boolean
): boolean {
  return !isExcludedFromDiscovery(step) && !runsNamedRunner(step, packageJson, runners);
}

export function runsNamedRunner(
  step: PipelineStep,
  packageJson: PackageJsonScripts,
  runners: Readonly<Record<string, string | null>>
): boolean {
  return namedRunnersAt(step, packageJson.scripts ?? {}, runners).length > 0;
}

export function runningFitnessFunctions(
  ciSources: readonly string[],
  packageJson: PackageJsonScripts,
  runners: Readonly<Record<string, string | null>>,
  citedScn: (script: string, citedByStep?: string) => ScriptCitation | null = () => null,
  isExcludedFromDiscovery: (step: PipelineStep) => boolean = () => false
): FitnessEvidenceObservation[] {
  const scripts = packageJson.scripts ?? {};
  const candidates = ciWorkflowSteps(ciSources).filter((step) =>
    isCandidateStep(step, packageJson, runners, isExcludedFromDiscovery)
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

export function recognisedRunners(
  ciSources: readonly string[],
  packageJson: PackageJsonScripts,
  runners: Readonly<Record<string, string | null>>
): BehaviouralRunner[] {
  const scripts = packageJson.scripts ?? {};
  return ciWorkflowSteps(ciSources).flatMap((step) =>
    namedRunnersAt(step, scripts, runners).map(([tier, runner]) => ({
      tier,
      runner,
      step: step.identity,
    }))
  );
}
