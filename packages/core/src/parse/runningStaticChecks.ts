import type { FitnessEvidenceObservation } from "../model.js";
import { commandRuns } from "./commandRuns.js";
import {
  ciWorkflowSteps,
  commandInvokesScript,
  type CiWorkflowStep,
  type PackageJsonScripts,
} from "./checkScriptsRunInCI.js";
import type { BehaviouralRunner } from "../domain/evidenceReconciliation.js";
import type { ScriptCitation } from "./fitnessCitations.js";

function namedRunnersAt(
  step: CiWorkflowStep,
  scripts: Readonly<Record<string, string>>,
  runners: Readonly<Record<string, string | null>>
): readonly (readonly [string, string])[] {
  if (!("runs" in step)) return [];
  const command = step.runs;
  return Object.entries(runners).filter(
    (entry): entry is [string, string] =>
      entry[1] !== null && commandRuns(command, entry[1], scripts)
  );
}

function handleOf(step: CiWorkflowStep, scripts: Readonly<Record<string, string>>): string {
  if (!("runs" in step)) return step.identity;
  const invoked = Object.keys(scripts).filter((name) => commandInvokesScript(step.runs, name));
  return invoked[0] ?? step.identity;
}

export function isCandidateStep(
  step: CiWorkflowStep,
  packageJson: PackageJsonScripts,
  runners: Readonly<Record<string, string | null>>,
  isExcludedFromDiscovery: (step: CiWorkflowStep) => boolean
): boolean {
  return !isExcludedFromDiscovery(step) && !runsNamedRunner(step, packageJson, runners);
}

export function runsNamedRunner(
  step: CiWorkflowStep,
  packageJson: PackageJsonScripts,
  runners: Readonly<Record<string, string | null>>
): boolean {
  return namedRunnersAt(step, packageJson.scripts ?? {}, runners).length > 0;
}

export function runningStaticChecks(
  ciSources: readonly string[],
  packageJson: PackageJsonScripts,
  runners: Readonly<Record<string, string | null>>,
  citedScn: (script: string, citedByStep?: string) => ScriptCitation | null = () => null,
  isExcludedFromDiscovery: (step: CiWorkflowStep) => boolean = () => false
): FitnessEvidenceObservation[] {
  const scripts = packageJson.scripts ?? {};
  const candidates = ciWorkflowSteps(ciSources).filter((step) =>
    isCandidateStep(step, packageJson, runners, isExcludedFromDiscovery)
  );
  return candidates
    .map((step) => {
      const staticCheck = handleOf(step, scripts);
      const citation = citedScn(staticCheck, step.id);
      return {
        qualityCheck: "fitness" as const,
        staticCheck,
        exists: true,
        enforcedOverRealSource: step.abortsJob,
        ...(citation !== null
          ? { scnId: step.id ?? citation.scnId }
          : {}),
      };
    })
    .sort((a, b) => a.staticCheck.localeCompare(b.staticCheck));
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
