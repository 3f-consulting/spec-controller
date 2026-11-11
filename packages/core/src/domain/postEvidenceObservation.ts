import { claimCodeCitationsIn, claimCodeFrom, sameCode, type ClaimCode } from "./claimCodes.js";
import type { ExecutableClaim, QualityCheckKind } from "./postEvidenceObligation.js";
import { relativizeToRoot } from "./targetPath.js";

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

// A workflow's step as the workflow wrote it: its name, its id, the continue-on-error of the step and of its job,
// whatever was written there, whether it writes out the record of the job's steps, and whether it only sets the job up.
export type WorkflowStep = {
  readonly job: string;
  readonly name?: string;
  readonly id?: string;
  readonly continueOnError?: unknown;
  readonly jobContinueOnError?: unknown;
  readonly writesStepRecord: boolean;
  readonly plumbing: boolean;
} & PipelineStepAction;

export type PipelineStep = { readonly workflow: string } & WorkflowStep;

export type StepDisposition = "reconciler" | "nonCheck" | "plumbing" | "runner" | "candidate";

type Scripts = Readonly<Record<string, string>>;

// The shell's two answers about a step's command: whether it invokes something on any of its lines, and whether it
// invokes it as the command the step runs; each follows the scripts the command runs.
export interface ShellReading {
  readonly runsAnywhere: (commandText: string, invocation: string, scripts: Scripts) => boolean;
  readonly runsAsCommand: (commandText: string, invocation: string, scripts: Scripts) => boolean;
}

export interface StepReadings {
  readonly nonChecks: readonly string[];
  readonly runners: Readonly<Record<string, string | null>>;
  readonly scripts: Scripts;
  readonly shell: ShellReading;
}

// A step is known by its name, else the action it uses, else the first line of its command.
export function stepIdentityOf(step: WorkflowStep): string {
  const name = step.name?.trim() ?? "";
  if (name !== "") return name;
  if ("action" in step) return step.action.name;
  return step.command.split(/\r?\n/).find((line) => line.trim() !== "")?.trim() ?? "";
}

function qualifiedStepName(step: PipelineStep): string {
  return `${step.workflow}:${step.job}:${stepIdentityOf(step)}`;
}

// Only a continue-on-error left unset or written false lets a step's failure fail its job.
function vouchesForTheStep(continueOnError: unknown): boolean {
  return continueOnError === undefined || continueOnError === false || continueOnError === "false";
}

const abortsJob = (step: WorkflowStep): boolean => vouchesForTheStep(step.continueOnError) && vouchesForTheStep(step.jobContinueOnError);

const RECONCILER_INVOCATION = "spec-controller balance";

// The reconciler is found wherever a step's command invokes it; a runner only where it is the command the step runs.
function runsTheReconciler(step: PipelineStep, { scripts, shell }: StepReadings): boolean {
  return "command" in step && shell.runsAnywhere(step.command, RECONCILER_INVOCATION, scripts);
}

function runsARunner(step: PipelineStep, { runners, scripts, shell }: StepReadings): boolean {
  if (!("command" in step)) return false;
  const command = step.command;
  return Object.values(runners).some((runner) => runner !== null && shell.runsAsCommand(command, runner, scripts));
}

export function stepDispositionOf(step: PipelineStep, readings: StepReadings): StepDisposition {
  if (step.writesStepRecord || runsTheReconciler(step, readings)) return "reconciler";
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
    result: abortsJob(step) ? "passed" : "passed-on-error",
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

// A test in a report of test results, as the report wrote it: its own title, its title within its groups, its status.
interface TestAsWritten {
  readonly title?: string;
  readonly fullTitle?: string;
  readonly status?: string;
}

// A test file in a report of test results, as the report wrote it.
export interface TestFileAsWritten {
  readonly path?: string;
  readonly status?: string;
  readonly message?: string;
  readonly tests: readonly TestAsWritten[];
}

// A test that passed or failed posts that result; one skipped, pending or marked todo posts nothing.
const RESULT_OF_TEST_STATUS: ReadonlyMap<string, EvidenceObservation["result"]> = new Map([
  ["passed", "passed"],
  ["failed", "failed"],
]);

const resultOfTestStatus = (status: string | undefined): EvidenceObservation["result"] | undefined =>
  status === undefined ? undefined : RESULT_OF_TEST_STATUS.get(status);

const FAILED_FILE = "failed";

function testObservationOf(test: TestAsWritten, place: string): EvidenceObservation[] {
  const result = resultOfTestStatus(test.status);
  if (result === undefined) return [];
  const cites = nearestCitation([claimCodeCitationsIn(test.title ?? ""), claimCodeCitationsIn(test.fullTitle ?? "")]);
  const name = test.fullTitle ?? test.title;
  return [{ cites, result, kind: TEST_REPORT_KIND, place, notes: [], ...(name === undefined ? {} : { name }) }];
}

// Each test posts at its file; a file that failed with no test in it never reached its tests, and posts as never ran.
export function testFileObservationsOf(files: readonly TestFileAsWritten[], root?: string): EvidenceObservation[] {
  return files.flatMap((file) => {
    const place = relativizeToRoot(file.path ?? "", root);
    if (file.status === FAILED_FILE && file.tests.length === 0) return [neverRanObservation(TEST_REPORT_KIND, place, file.message)];
    return file.tests.flatMap((test) => testObservationOf(test, place));
  });
}

// An example in a report of examples, as the report wrote it: its own title, its title within its groups, its status
// and the path of its file.
interface ExampleAsWritten {
  readonly title?: string;
  readonly fullTitle?: string;
  readonly status?: string;
  readonly path?: string;
}

// A report of examples as written: its examples, how many errors it met outside any example, and its messages.
export interface ExamplesAsWritten {
  readonly examples: readonly ExampleAsWritten[];
  readonly errorsOutsideExamples?: number;
  readonly messages: readonly string[];
}

function placeOfExample(path: string, root?: string): string {
  return relativizeToRoot(path.replace(/^\.\//, ""), root);
}

const LOADED_FILE = /^\s*(?:While loading (.+?) a |An error occurred while loading (.+?)\.(?:\n|$))/;

// Each error outside the examples never ran: one naming the file it was loading posts at that file, and the rest,
// when the messages name fewer files than the report counted errors, post once together at no file.
function loadErrorsOf({ errorsOutsideExamples = 0, messages }: ExamplesAsWritten, root?: string): EvidenceObservation[] {
  if (errorsOutsideExamples === 0) return [];
  const read = messages.map((message) => ({ message, loaded: LOADED_FILE.exec(message) }));
  const named = read.flatMap(({ message, loaded }) => {
    const path = loaded?.[1] ?? loaded?.[2];
    return path === undefined ? [] : [neverRanObservation(TEST_REPORT_KIND, placeOfExample(path, root), message)];
  });
  if (errorsOutsideExamples <= named.length) return named;
  const unnamed = read.filter(({ loaded }) => loaded === null).map(({ message }) => message);
  return [...named, neverRanObservation(TEST_REPORT_KIND, "", unnamed.length > 0 ? unnamed.join("\n") : undefined)];
}

function exampleObservationOf(example: ExampleAsWritten, root?: string): EvidenceObservation[] {
  const result = resultOfTestStatus(example.status);
  if (result === undefined) return [];
  const cites = nearestCitation([claimCodeCitationsIn(example.title ?? ""), claimCodeCitationsIn(example.fullTitle ?? "")]);
  const name = example.fullTitle;
  return [{ cites, result, kind: TEST_REPORT_KIND, place: placeOfExample(example.path ?? "", root), notes: [], ...(name === undefined ? {} : { name }) }];
}

// Each example posts at its file under its full title, then each error outside the examples posts as never ran.
export function exampleObservationsOf(report: ExamplesAsWritten, root?: string): EvidenceObservation[] {
  return [...report.examples.flatMap((example) => exampleObservationOf(example, root)), ...loadErrorsOf(report, root)];
}

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
