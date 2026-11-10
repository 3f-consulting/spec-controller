import { claimCodeFrom, sameCode, type ClaimCode } from "./claimCodes.js";
import type { ExecutableClaim, QualityCheckKind } from "./postEvidenceObligation.js";

export interface EvidenceObservation {
  readonly cites: readonly ClaimCode[];
  readonly result: "passed" | "passed-on-error" | "failed" | "never-ran";
  readonly kind: QualityCheckKind;
  readonly place: string;
  readonly name?: string;
  readonly message?: string;
  readonly notes: readonly string[];
}

export interface PhantomClaim {
  readonly claimCode: ClaimCode;
  readonly file?: never;
}

export interface UnnamedClaim {
  readonly claimCode?: never;
  readonly file?: never;
}

interface UsedAction {
  readonly name: string;
}

export type PipelineStepAction = { readonly command: string } | { readonly action: UsedAction };

export type WorkflowStep = {
  readonly job: string;
  readonly identity: string;
  readonly id?: string;
  readonly writesStepRecord: boolean;
  readonly abortsJob: boolean;
  readonly plumbing: boolean;
} & PipelineStepAction;

export type PipelineStep = { readonly workflow: string } & WorkflowStep;

export type StepDisposition = "reconciler" | "nonCheck" | "plumbing" | "runner" | "candidate";

type Scripts = Readonly<Record<string, string>>;

export interface ShellReading {
  readonly runsAsCommand: (commandText: string, invocation: string, scripts: Scripts) => boolean;
}

export interface StepReadings {
  readonly runsTheReconciler: (command: string) => boolean;
  readonly nonChecks: readonly string[];
  readonly runners: Readonly<Record<string, string | null>>;
  readonly scripts: Scripts;
  readonly shell: ShellReading;
}

export function qualifiedStepName(step: PipelineStep): string {
  return `${step.workflow}:${step.job}:${step.identity}`;
}

function runsARunner(step: PipelineStep, { runners, scripts, shell }: StepReadings): boolean {
  if (!("command" in step)) return false;
  const command = step.command;
  return Object.values(runners).some((runner) => runner !== null && shell.runsAsCommand(command, runner, scripts));
}

export function stepDispositionOf(step: PipelineStep, readings: StepReadings): StepDisposition {
  if (step.writesStepRecord || ("command" in step && readings.runsTheReconciler(step.command))) return "reconciler";
  if (readings.nonChecks.includes(qualifiedStepName(step))) return "nonCheck";
  if (step.plumbing) return "plumbing";
  return runsARunner(step, readings) ? "runner" : "candidate";
}

export type StepReport = "succeeded" | "failed" | "other";

export interface RecordedCheckStep {
  readonly citedClaimCode: string;
  readonly report: StepReport;
  readonly said?: string;
}

function citesOfId(id: string | undefined): ClaimCode[] {
  const code = id === undefined ? undefined : claimCodeFrom(id);
  return code === undefined ? [] : [code];
}

function workflowObservationOf(step: PipelineStep): EvidenceObservation {
  return {
    cites: citesOfId(step.id),
    result: step.abortsJob ? "passed" : "passed-on-error",
    kind: "fitness",
    place: qualifiedStepName(step),
    notes: [],
  };
}

function recordedObservationOf(recorded: RecordedCheckStep, steps: readonly PipelineStep[]): EvidenceObservation {
  const [only, ...others] = steps.filter((step) => step.id === recorded.citedClaimCode);
  const place = only !== undefined && others.length === 0 ? qualifiedStepName(only) : recorded.citedClaimCode;
  const cites = citesOfId(recorded.citedClaimCode);
  if (recorded.report === "other") {
    return { cites, result: "never-ran", kind: "fitness", place, notes: recorded.said === undefined ? [] : [recorded.said] };
  }
  return { cites, result: recorded.report === "succeeded" ? "passed" : "failed", kind: "fitness", place, notes: [] };
}

export function fitnessObservationsOf(
  steps: readonly PipelineStep[],
  dispositionOf: (step: PipelineStep) => StepDisposition,
  recorded: readonly RecordedCheckStep[] | undefined,
): EvidenceObservation[] {
  const workflow = steps.filter((step) => dispositionOf(step) === "candidate").map(workflowObservationOf);
  if (recorded === undefined) return workflow;
  return [
    ...workflow.filter(({ cites }) => cites.length === 0),
    ...recorded.map((entry) => recordedObservationOf(entry, steps)),
  ];
}

export type RunResult = "passed" | "failed" | "never-reached-its-assertions" | "inconclusive";

export function resultOfRun(run: RunResult): EvidenceObservation["result"] | undefined {
  if (run === "inconclusive") return undefined;
  return run === "never-reached-its-assertions" ? "never-ran" : run;
}

export function neverRanObservation(kind: QualityCheckKind, place: string, message: string | undefined): EvidenceObservation {
  return { cites: [], result: "never-ran", kind, place, notes: [], ...(message === undefined ? {} : { message }) };
}

export function nearestCitation(levels: readonly (readonly ClaimCode[])[]): ClaimCode[] {
  const nearest = levels.find((codes) => codes.length > 0) ?? [];
  return nearest.filter((code, at) => nearest.findIndex((other) => sameCode(code, other)) === at);
}

export const TEST_REPORT_KIND: QualityCheckKind = "unit";

const KINDS_A_SCENARIO_TAG_NAMES: readonly QualityCheckKind[] = ["integration", "e2e", "performance"];

export function kindsTheTagsName(tags: readonly string[]): QualityCheckKind[] {
  const named = KINDS_A_SCENARIO_TAG_NAMES.filter((kind) => tags.includes(kind));
  return named.length > 0 ? named : ["integration"];
}

export function claimPostedTo(
  observation: EvidenceObservation,
  claims: readonly ExecutableClaim[],
): ExecutableClaim | PhantomClaim | UnnamedClaim {
  const [code, ...others] = observation.cites;
  if (code === undefined || others.length > 0) return {};
  const [only, ...shared] = claims.filter(({ claimCode }) => claimCode !== undefined && sameCode(claimCode, code));
  if (only === undefined) return { claimCode: code };
  return shared.length > 0 ? {} : only;
}
