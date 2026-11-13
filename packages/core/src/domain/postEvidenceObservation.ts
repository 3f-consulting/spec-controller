import { claimCodeCitationsIn, claimCodeFrom, sameCode, type ClaimCode } from "./claimCodes.js";
import type { TargetConfiguration } from "./configuration.js";
import type { ExecutableClaim, QualityCheckKind } from "./postEvidenceObligation.js";
import { shownFromTarget } from "./targetPath.js";

export type Result = "passed" | "passed-on-error" | "failed" | "never-ran";

// place is a file or a CI step; name is a test's title where it has one. A report joins them to say where to look.
export interface EvidenceObservation {
  readonly cites: readonly ClaimCode[];
  readonly result: Result;
  readonly kind: QualityCheckKind;
  readonly place: string;
  readonly name?: string;
  readonly message?: string;
  readonly notes: readonly string[];
}

export interface PhantomClaim {
  readonly claimCode: ClaimCode;
}

// The claim that takes evidence no one executable claim can: it holds nothing.
export interface UnnamedClaim {
  readonly claimCode?: never;
  readonly file?: never;
}

// What each reader reports, as written. Which result each status means is the domain's. report is the evidence
// report it came from, as its reader names it, since what a status means can differ between them.

// A report of test results kept by test file.
export interface ResultsByFileAsWritten {
  readonly report: string;
  readonly file: string;
  readonly status: string;
  readonly message?: string;
  readonly results: readonly ResultInFileAsWritten[];
}

export interface ResultInFileAsWritten {
  readonly ancestorTitles: readonly string[];
  readonly title: string;
  readonly status: string;
  readonly failureMessages: readonly string[];
}

// A report of test results kept by suite, each result with its properties.
export interface ResultsBySuiteAsWritten {
  readonly report: string;
  readonly name: string;
  readonly file?: string;
  readonly results: readonly ResultInSuiteAsWritten[];
  // A failure the suite records outside any of its results, such as a package that did not compile.
  readonly failure?: FailureAsWritten;
}

export interface ResultInSuiteAsWritten {
  readonly className?: string;
  readonly name: string;
  readonly file?: string;
  readonly clmProperties: readonly string[];
  readonly outcome: string;
  readonly failure?: FailureAsWritten;
}

export interface FailureAsWritten {
  readonly type?: string;
  readonly message?: string;
  readonly text?: string;
}

// A report of test results kept by example, each nested in its groups.
export interface ResultsByExampleAsWritten {
  readonly report: string;
  readonly examples: readonly ExampleResultAsWritten[];
  readonly loadErrors: readonly { readonly file?: string; readonly message: string }[];
}

export interface ExampleResultAsWritten {
  readonly file: string;
  readonly groupDescriptions: readonly string[];
  readonly description: string;
  readonly status: string;
  readonly message?: string;
}

// A report of scenario runs: one entry per scenario or Outline row that ran.
export interface ScenarioResultAsWritten {
  readonly file: string;
  readonly line: number;
  readonly title: string;
  readonly tags: readonly string[];
  readonly steps: readonly { readonly keyword: string; readonly text: string; readonly status: string; readonly message?: string }[];
}

// A step of a CI workflow, continue-on-error as the YAML gave it. plumbing and writesStepRecord are the reader's to say.
export interface WorkflowStepAsWritten {
  readonly workflow: string;
  readonly job: string;
  readonly jobContinueOnError?: unknown;
  readonly name?: string;
  readonly uses?: string;
  readonly run?: string;
  readonly id?: string;
  readonly continueOnError?: unknown;
  readonly plumbing: boolean;
  readonly writesStepRecord: boolean;
}

// An entry of the step record, keyed by the step's id.
export interface StepRecordEntryAsWritten {
  readonly key: string;
  readonly outcome: string;
  readonly conclusion: string;
}

// The shell reader's two answers, handed to the domain so it decides which question serves which step.
export interface ShellAnswers {
  readonly invokesAnywhere: (commandLine: string, program: string) => boolean;
  readonly invokesAsCommand: (commandLine: string, program: string, scripts: Readonly<Record<string, string>>) => boolean;
}

// The codes a test cites: its own, or else those of its nearest parent that cites any. The chain runs outermost first.
const nearestCitations = (chain: readonly string[]): ClaimCode[] =>
  chain.reduceRight<ClaimCode[]>((found, title) => (found.length > 0 ? found : claimCodeCitationsIn(title)), []);

const RESULT_BY_STATUS: Readonly<Record<string, Result>> = { passed: "passed", failed: "failed" };

// Results kept by test file: Vitest's and Jest's. A failed file with no results is one that could not run.
export function observationsByFile(results: readonly ResultsByFileAsWritten[], targetFolder: string): EvidenceObservation[] {
  return results.flatMap(({ file, status, message, results: inFile }): EvidenceObservation[] => {
    const place = shownFromTarget(file, targetFolder);
    if (status === "failed" && inFile.length === 0) {
      return [{ cites: [], result: "never-ran", kind: "unit", place, ...(message === undefined ? {} : { message }), notes: [] }];
    }
    return inFile.flatMap(({ ancestorTitles, title, status: resultStatus, failureMessages }) => {
      const result = RESULT_BY_STATUS[resultStatus];
      if (result === undefined) return [];
      const failure = failureMessages.join("\n");
      return [{ cites: nearestCitations([...ancestorTitles, title]), result, kind: "unit", place, name: title, ...(failure && { message: failure }), notes: [] }];
    });
  });
}

const saidBy = (failure: FailureAsWritten | undefined): { message?: string } => {
  const message = failure?.message ?? failure?.text;
  return message === undefined ? {} : { message };
};

// A pytest error is a test that never reached its assertions; with no class name, a file that did not collect.
function pytestObservation(result: ResultInSuiteAsWritten, targetFolder: string): EvidenceObservation[] {
  const { className, name, file, clmProperties, outcome, failure } = result;
  if (outcome === "skipped") return [];
  const collected = className !== "";
  const cites = collected ? clmProperties.flatMap((property) => claimCodeFrom(property) ?? []) : [];
  const resultOf: Result = outcome === "error" ? "never-ran" : outcome === "failure" ? "failed" : "passed";
  const place = shownFromTarget(file ?? (collected ? className ?? name : name), targetFolder);
  return [{ cites, result: resultOf, kind: "unit", place, ...(collected && { name }), ...saidBy(failure), notes: [] }];
}

// A JUnit case with no class name is its suite's own failure, such as a Go package that did not build; one with no name
// is its class's, such as a Java class whose setup before all its tests failed. Neither reached a test's assertions.
function junitObservation(suite: ResultsBySuiteAsWritten, result: ResultInSuiteAsWritten, targetFolder: string): EvidenceObservation[] {
  const { className = "", name, file, outcome, failure } = result;
  if (outcome === "skipped") return [];
  if (outcome !== "" && (className === "" || name === "")) {
    return [{ cites: [], result: "never-ran", kind: "unit", place: className || suite.name, ...saidBy(failure), notes: [] }];
  }
  const cites = nearestCitations([className, ...name.split("/")]);
  const place = shownFromTarget(file ?? (className || suite.name), targetFolder);
  return [{ cites, result: outcome === "" ? "passed" : "failed", kind: "unit", place, name, ...saidBy(failure), notes: [] }];
}

// Results kept by suite: JUnit's, from Go, Java and Kotlin, and pytest's.
export function observationsBySuite(suites: readonly ResultsBySuiteAsWritten[], targetFolder: string): EvidenceObservation[] {
  return suites.flatMap((suite) =>
    suite.results.flatMap((result) => (suite.report === "pytest" ? pytestObservation(result, targetFolder) : junitObservation(suite, result, targetFolder))),
  );
}

// Results kept by example: RSpec's, each example nested in its groups. An error outside any example kept the examples
// after it from running: it is placed at the spec file it names, or at none.
export function observationsByExample({ examples, loadErrors }: ResultsByExampleAsWritten, targetFolder: string): EvidenceObservation[] {
  const ran = examples.flatMap(({ file, groupDescriptions, description, status, message }): EvidenceObservation[] => {
    const result = RESULT_BY_STATUS[status];
    if (result === undefined) return [];
    const cites = nearestCitations([...groupDescriptions, description]);
    return [{ cites, result, kind: "unit", place: shownFromTarget(file, targetFolder), name: description, ...(message === undefined ? {} : { message }), notes: [] }];
  });
  const neverRan = loadErrors.map(({ file, message }): EvidenceObservation => ({
    cites: [],
    result: "never-ran",
    kind: "unit",
    place: file === undefined ? "" : shownFromTarget(file, targetFolder),
    message,
    notes: [],
  }));
  return [...ran, ...neverRan];
}

export function observationsFiledUnder({ claimCode }: ExecutableClaim, observations: readonly EvidenceObservation[]): EvidenceObservation[] {
  return claimCode === undefined ? [] : observations.filter(({ cites }) => cites.some((cited) => sameCode(cited, claimCode)));
}

// What a CI step is, for the evidence: the reconciler, a non-check, plumbing, a runner, or a candidate fitness function.
export type StepDisposition = "reconciler" | "nonCheck" | "plumbing" | "runner" | "candidate";

const RECONCILER = "spec-controller balance";

// A step is known by its name, else the action it uses, else the first line of its command.
function stepIdentityOf({ name, uses, run }: WorkflowStepAsWritten): string {
  return name ?? uses ?? run?.split("\n").find((line) => line.trim() !== "")?.trim() ?? "";
}

const isNamedIn = (step: WorkflowStepAsWritten, { nonChecks }: TargetConfiguration): boolean =>
  nonChecks.some(({ workflow, job, step: named }) => workflow === step.workflow && job === step.job && named === stepIdentityOf(step));

// The reconciler is recognised in any command of the step, a runner only as the command the step runs, through its scripts.
const runsARunner = (run: string, { runners }: TargetConfiguration, scripts: Scripts, shell: ShellAnswers): boolean =>
  Object.values(runners).some((runner) => typeof runner === "string" && shell.invokesAsCommand(run, runner, scripts));

export type Scripts = Readonly<Record<string, string>>;

export function stepDispositionOf(step: WorkflowStepAsWritten, configuration: TargetConfiguration, scripts: Scripts, shell: ShellAnswers): StepDisposition {
  if (step.writesStepRecord || (step.run !== undefined && shell.invokesAnywhere(step.run, RECONCILER))) return "reconciler";
  if (isNamedIn(step, configuration)) return "nonCheck";
  if (step.plumbing) return "plumbing";
  if (step.run !== undefined && runsARunner(step.run, configuration, scripts, shell)) return "runner";
  return "candidate";
}

// The step record says how a step went by its outcome, read before continue-on-error turns a failure into success.
const resultFrom = (outcome: string): Result => (outcome === "success" ? "passed" : outcome === "failure" ? "failed" : "never-ran");

const allowsFailure = ({ continueOnError, jobContinueOnError }: WorkflowStepAsWritten): boolean => continueOnError === true || jobContinueOnError === true;

const placeOf = (step: WorkflowStepAsWritten): string => `${step.workflow}:${step.job}:${stepIdentityOf(step)}`;

function observationOf(step: WorkflowStepAsWritten, steps: readonly WorkflowStepAsWritten[], entry: StepRecordEntryAsWritten | undefined): EvidenceObservation {
  const claimCode = step.id === undefined ? undefined : claimCodeFrom(step.id);
  const result = entry === undefined ? "passed" : resultFrom(entry.outcome);
  const jobsRecorded = new Set(steps.filter(({ id }) => entry !== undefined && id === entry.key).map(({ workflow, job }) => `${workflow}:${job}`));
  return {
    cites: claimCode === undefined ? [] : [claimCode],
    result: result === "passed" && allowsFailure(step) ? "passed-on-error" : result,
    kind: "fitness",
    place: jobsRecorded.size > 1 ? entry!.key : placeOf(step),
    notes: [],
  };
}

// A recorded entry no step carries never ran where the workflows say; it is placed at its code, with the record's word.
const unheldObservationOf = ({ key, outcome }: StepRecordEntryAsWritten, claimCode: ClaimCode): EvidenceObservation => ({
  cites: [claimCode],
  result: "never-ran",
  kind: "fitness",
  place: key,
  notes: [outcome],
});

export function fitnessObservationsOf(
  steps: readonly WorkflowStepAsWritten[],
  record: readonly StepRecordEntryAsWritten[],
  configuration: TargetConfiguration,
  scripts: Scripts,
  shell: ShellAnswers,
): EvidenceObservation[] {
  const byClaimCode = record.filter(({ key }) => claimCodeFrom(key) !== undefined);
  const entryFor = ({ id }: WorkflowStepAsWritten) => byClaimCode.find(({ key }) => key === id);
  // A runner posts nothing of its own, unless its id is a claim code the step record holds.
  const posting = steps.filter((step) => {
    const disposition = stepDispositionOf(step, configuration, scripts, shell);
    return disposition === "candidate" || (disposition === "runner" && entryFor(step) !== undefined);
  });
  const postedOnce = posting.filter((step, at) => entryFor(step) === undefined || posting.findIndex(({ id }) => id === step.id) === at);
  return [
    ...postedOnce.map((step) => observationOf(step, posting, entryFor(step))),
    ...byClaimCode.flatMap((entry) => (steps.some(({ id }) => id === entry.key) ? [] : [unheldObservationOf(entry, claimCodeFrom(entry.key)!)])),
  ];
}
