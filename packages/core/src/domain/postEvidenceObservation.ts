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

export type ClaimCodesAt = (file: string, line: number) => readonly string[];

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

function qualifiedStepName(step: PipelineStep): string {
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

// An entry of the step record, as the record wrote it.
export interface RecordedCheckStep {
  readonly key: string;
  readonly outcome?: string;
  readonly conclusion?: string;
}

// A step's outcome says how its own run went; its conclusion is that outcome after continue-on-error, so it is not read.
const RESULT_OF_OUTCOME: ReadonlyMap<string, EvidenceObservation["result"]> = new Map([
  ["success", "passed"],
  ["failure", "failed"],
]);

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
  const [only, ...others] = steps.filter((step) => step.id === recorded.key);
  const place = only !== undefined && others.length === 0 ? qualifiedStepName(only) : recorded.key;
  const cites = citesOfId(recorded.key);
  const { outcome } = recorded;
  const result = outcome === undefined ? undefined : RESULT_OF_OUTCOME.get(outcome);
  if (result === undefined) {
    return { cites, result: "never-ran", kind: "fitness", place, notes: outcome === undefined ? [] : [outcome] };
  }
  return { cites, result, kind: "fitness", place, notes: [] };
}

// Only an entry keyed by a claim code stands for a fitness function; one keyed otherwise is known from its workflow alone.
const isKeyedByAClaimCode = ({ key }: RecordedCheckStep): boolean => claimCodeFrom(key) !== undefined;

export function fitnessObservationsOf(
  steps: readonly PipelineStep[],
  dispositionOf: (step: PipelineStep) => StepDisposition,
  recorded: readonly RecordedCheckStep[] | undefined,
): EvidenceObservation[] {
  const workflow = steps.filter((step) => dispositionOf(step) === "candidate").map(workflowObservationOf);
  if (recorded === undefined) return workflow;
  return [
    ...workflow.filter(({ cites }) => cites.length === 0),
    ...recorded.filter(isKeyedByAClaimCode).map((entry) => recordedObservationOf(entry, steps)),
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

// One code written in two places, such as a scenario's tag and the corpus at its line, is one citation.
export function nearestCitation(levels: readonly (readonly ClaimCode[])[]): readonly ClaimCode[] {
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

type Claim = ExecutableClaim | PhantomClaim | UnnamedClaim;

const isExecutable = (claim: Claim): claim is ExecutableClaim => "title" in claim;

export const isUnnamedClaim = (claim: Claim): claim is UnnamedClaim => !isExecutable(claim) && claim.claimCode === undefined;

export function filedUnder(claim: Claim, phantoms: PhantomClaim[], unnamed: UnnamedClaim): Claim {
  if (isExecutable(claim)) return claim;
  const { claimCode } = claim;
  if (claimCode === undefined) return unnamed;
  const known = phantoms.find((phantom) => sameCode(phantom.claimCode, claimCode));
  if (known) return known;
  const phantom = { claimCode };
  phantoms.push(phantom);
  return phantom;
}
