import { CLM_COLUMN, claimCodeCitationsIn, claimCodeFrom, type ClaimCode } from "./claimCodes.js";
import type { TargetConfiguration } from "./configuration.js";
import type { FeatureAsWritten, QualityCheckKind } from "./postEvidenceObligation.js";
import { shownFromTarget } from "./targetPath.js";
import { stepIdentityOf, type WorkflowStepAsWritten } from "./workflowSteps.js";

// not-recorded is a step a workflow has that the step record does not name: balance has no word on how it went.
export type Result = "passed" | "passed-on-error" | "failed" | "never-ran" | "not-recorded";

// place is a file or a CI step; name is a test's title where it has one. A report joins them to say where to look.
export interface EvidenceObservation {
  readonly cites: readonly ClaimCode[];
  readonly result: Result;
  readonly kind: QualityCheckKind;
  readonly place: string;
  readonly name?: string;
  readonly message?: string;
}

export interface PhantomClaim {
  readonly claimCode: ClaimCode;
}

// The claim that takes evidence no one executable claim can: it holds nothing.
export interface UnnamedClaim {
  readonly claimCode?: never;
  readonly file?: never;
}

// What each reader reports, as written. Which result each status means is the domain's. report, where kept, is the
// evidence report it came from, as its reader names it, since what a status means can differ between them.

// A report of test results kept by test file.
export interface ResultsByFileAsWritten {
  readonly file: string;
  readonly message?: string;
  readonly results: readonly ResultInFileAsWritten[];
}

interface ResultInFileAsWritten {
  readonly ancestorTitles: readonly string[];
  readonly title: string;
  readonly status: string;
  readonly failureMessages: readonly string[];
}

// A report of test results kept by suite, each result with its properties. errorMeansNeverRan is the reader's to say: a
// report that writes an error only for a test that never reached its assertions, and cites in its properties.
export interface ResultsBySuiteAsWritten {
  readonly errorMeansNeverRan: boolean;
  readonly name: string;
  readonly results: readonly ResultInSuiteAsWritten[];
}

export interface ResultInSuiteAsWritten {
  readonly className?: string;
  readonly name: string;
  readonly clmProperties: readonly string[];
  readonly outcome: string;
  readonly failure?: FailureAsWritten;
}

export interface FailureAsWritten {
  readonly message?: string;
}

// A report of test results kept by example, each nested in its groups.
export interface ResultsByExampleAsWritten {
  readonly examples: readonly ExampleResultAsWritten[];
  readonly loadErrors: readonly { readonly file?: string; readonly message: string }[];
}

interface ExampleResultAsWritten {
  readonly file: string;
  // Its groups' descriptions, then its own.
  readonly fullDescription: string;
  readonly description: string;
  readonly status: string;
  readonly message?: string;
}

// A report of scenario runs: one entry per scenario or Outline row that ran. A hook is a step with no text.
export interface ScenarioResultAsWritten {
  readonly file: string;
  readonly line: number;
  readonly title: string;
  readonly tags: readonly string[];
  readonly steps: readonly { readonly keyword: string; readonly text?: string; readonly status: string; readonly message?: string }[];
}

// An entry of the step record, keyed by the step's id.
export interface StepRecordEntryAsWritten {
  readonly key: string;
  readonly outcome: string;
}

// The shell reader's two answers, handed to the domain so it decides which question serves which step.
export interface ShellAnswers {
  readonly invokesAnywhere: (commandLine: string, program: string) => boolean;
  readonly invokesAsCommand: (commandLine: string, program: string, scripts: Readonly<Record<string, string>>) => boolean;
}

// The codes a test cites: its own, or else those of its nearest parent that cites any. The chain runs outermost first.
const nearestCitations = (chain: readonly string[]): ClaimCode[] =>
  chain.reduceRight<ClaimCode[]>((found, title) => (found.length > 0 ? found : claimCodeCitationsIn(title)), []);

// A nested class's name holds its outer classes' display names first, each opening with its citation when it has one.
const classesIn = (className: string): string[] => className.split(/(?=\[CLM-)/);

const RESULT_BY_STATUS: Readonly<Record<string, Result>> = { passed: "passed", failed: "failed" };

// A test report's result is unit evidence, whatever its source.
const unitObservation = (observation: Omit<EvidenceObservation, "kind">): EvidenceObservation => ({ ...observation, kind: "unit" });

// Results kept by test file: Vitest's and Jest's. A file with no results is one that could not run: each writes such a
// file as failed.
export function observationsByFile(results: readonly ResultsByFileAsWritten[], targetFolder: string): EvidenceObservation[] {
  return results.flatMap(({ file, message, results: inFile }): EvidenceObservation[] => {
    const place = shownFromTarget(file, targetFolder);
    if (inFile.length === 0) {
      return [unitObservation({ cites: [], result: "never-ran", place, message })];
    }
    return inFile.flatMap(({ ancestorTitles, title, status: resultStatus, failureMessages }) => {
      const result = RESULT_BY_STATUS[resultStatus];
      if (result === undefined) return [];
      const failure = failureMessages.join("\n");
      return [unitObservation({ cites: nearestCitations([...ancestorTitles, title]), result, place, name: title, ...(failure && { message: failure }) })];
    });
  });
}

const saidBy = (failure: FailureAsWritten | undefined): { message?: string } =>
  failure?.message === undefined ? {} : { message: failure.message };

// An error is a test that never reached its assertions; with no class name, a file that was never collected.
function observationWhereErrorsNeverRan(result: ResultInSuiteAsWritten, targetFolder: string): EvidenceObservation[] {
  const { className, name, clmProperties, outcome, failure } = result;
  if (outcome === "skipped") return [];
  const collected = Boolean(className);
  const cites = collected ? [...new Set(clmProperties)].flatMap((property) => claimCodeFrom(property) ?? []) : [];
  const resultOf: Result = outcome === "error" ? "never-ran" : outcome === "failure" ? "failed" : "passed";
  const place = shownFromTarget(collected ? className! : name, targetFolder);
  return [unitObservation({ cites, result: resultOf, place, ...(collected && { name }), ...saidBy(failure) })];
}

// A case with no class name is its suite's own failure, such as a package that did not build; one with no name is its
// class's, such as a class whose setup before all its tests failed. Neither reached a test's assertions, and no report
// writes either for a test that passed.
function observationWhereErrorsFailed(suite: ResultsBySuiteAsWritten, result: ResultInSuiteAsWritten, targetFolder: string): EvidenceObservation[] {
  const { className, name, outcome, failure } = result;
  if (outcome === "skipped") return [];
  if (!className || name === "") {
    return [unitObservation({ cites: [], result: "never-ran", place: className || suite.name, ...saidBy(failure) })];
  }
  const cites = nearestCitations([...classesIn(className), ...name.split("/")]);
  const place = shownFromTarget(className, targetFolder);
  return [unitObservation({ cites, result: outcome === "" ? "passed" : "failed", place, name, ...saidBy(failure) })];
}

// Results kept by suite, each case in its suite.
export function observationsBySuite(suites: readonly ResultsBySuiteAsWritten[], targetFolder: string): EvidenceObservation[] {
  return suites.flatMap((suite) =>
    suite.results.flatMap((result) => 
      suite.errorMeansNeverRan ? observationWhereErrorsNeverRan(result, targetFolder) : observationWhereErrorsFailed(suite, result, targetFolder),
    ),
  );
}

// Results kept by example: RSpec's, each example nested in its groups. An error outside any example kept the examples
// after it from running: it is placed at the spec file it names, or at none.
export function observationsByExample({ examples, loadErrors }: ResultsByExampleAsWritten, targetFolder: string): EvidenceObservation[] {
  const ran = examples.flatMap(({ file, fullDescription, description, status, message }): EvidenceObservation[] => {
    const result = RESULT_BY_STATUS[status];
    if (result === undefined) return [];
    // Its own description cites first; failing that, its groups' do, in its full description.
    const cites = nearestCitations([fullDescription, description]);
    return [unitObservation({ cites, result, place: shownFromTarget(file, targetFolder), name: description, message })];
  });
  const neverRan = loadErrors.map(({ file, message }) =>
    unitObservation({ cites: [], result: "never-ran", place: file === undefined ? "" : shownFromTarget(file, targetFolder), message }),
  );
  return [...ran, ...neverRan];
}

const BEHAVIOURAL_KINDS: readonly QualityCheckKind[] = ["integration", "e2e", "performance"];

// A scenario is evidence of each behavioural kind its tags name, and of integration where they name none.
function kindsOf(tags: readonly string[]): readonly QualityCheckKind[] {
  const named = BEHAVIOURAL_KINDS.filter((kind) => tags.includes(kind));
  return named.length > 0 ? named : ["integration"];
}

type StepAsWritten = ScenarioResultAsWritten["steps"][number];

const asWritten = ({ keyword, text }: StepAsWritten): string => `${keyword.trim()} ${text}`;

// A step that matched no definition, or more than one, kept the scenario from running, whatever else its steps did. A
// scenario passed when every step passed, its hooks among them, and it had a step of its own.
function resultOfSteps(steps: readonly StepAsWritten[]): { readonly result: Result; readonly message?: string } | undefined {
  const unmatched = steps.find(({ status }) => status === "undefined" || status === "ambiguous");
  if (unmatched) return { result: "never-ran", message: asWritten(unmatched) };
  const failed = steps.find(({ status }) => status === "failed");
  if (failed) return { result: "failed", message: failed.message };
  return steps.some(({ text }) => text !== undefined) && steps.every(({ status }) => status === "passed") ? { result: "passed" } : undefined;
}

// An Outline row's code is its clm cell, in the feature file at the end of the result's path, at the row's line.
function rowCodesOf(features: readonly FeatureAsWritten[]): (file: string, line: number) => ClaimCode[] {
  const byFile = new Map<string, ReadonlyMap<number, ClaimCode | undefined>>();
  for (const { file, scenarios } of features) {
    const byLine = new Map<number, ClaimCode | undefined>();
    for (const { columns, rows } of scenarios.flatMap(({ examples }) => examples)) {
      for (const { line, cells } of rows) byLine.set(line, claimCodeFrom(cells[columns.indexOf(CLM_COLUMN)]));
    }
    byFile.set(file, byLine);
  }
  // The longest feature file path the result's path ends with is its file.
  const longestFirst = [...byFile.keys()].sort((one, other) => other.length - one.length);
  return (file, line) => {
    const featureFile = longestFirst.find((candidate) => `/${file}`.endsWith(`/${candidate}`));
    const code = featureFile === undefined ? undefined : byFile.get(featureFile)!.get(line);
    return code ? [code] : [];
  };
}

// Results kept by scenario: Cucumber's. features is the corpus as written, where an Outline row's claim code is.
export function observationsOfScenarios(
  results: readonly ScenarioResultAsWritten[],
  features: readonly FeatureAsWritten[],
  targetFolder: string,
): EvidenceObservation[] {
  const rowCodeOf = rowCodesOf(features);
  return results.flatMap(({ file, line, title, tags, steps }) => {
    const outcome = resultOfSteps(steps);
    if (outcome === undefined) return [];
    const tagged = tags.flatMap((tag) => claimCodeFrom(tag) ?? []);
    const cites = tagged.length > 0 ? tagged : rowCodeOf(file, line);
    const place = shownFromTarget(file, targetFolder);
    return kindsOf(tags).map((kind): EvidenceObservation => ({ cites, ...outcome, kind, place, name: title }));
  });
}

// What a CI step is, for the evidence: the reconciler, a non-check, plumbing, a runner, or a fitness function.
export type StepDisposition = "reconciler" | "nonCheck" | "plumbing" | "runner" | "fitnessFunction";

const RECONCILER = "spec-controller balance";

const isNamedIn = (step: WorkflowStepAsWritten, { nonChecks }: TargetConfiguration): boolean =>
  nonChecks.some(({ workflow, job, step: named }) => workflow === step.workflow && job === step.job && named === stepIdentityOf(step));

// The reconciler is recognised in any command of the step, a runner only as the command the step runs, through its scripts.
const runsARunner = (run: string, { runners }: TargetConfiguration, scripts: Scripts, shell: ShellAnswers): boolean =>
  Object.values(runners).some((runner) => typeof runner === "string" && shell.invokesAsCommand(run, runner, scripts));

export type Scripts = Readonly<Record<string, string>>;

// A runner is a fitness function of its own when its id is a claim code the step record holds.
export function stepDispositionOf(
  step: WorkflowStepAsWritten,
  configuration: TargetConfiguration,
  scripts: Scripts,
  shell: ShellAnswers,
  record: readonly StepRecordEntryAsWritten[] = [],
): StepDisposition {
  if (step.writesStepRecord || (step.run !== undefined && shell.invokesAnywhere(step.run, RECONCILER))) return "reconciler";
  if (isNamedIn(step, configuration)) return "nonCheck";
  if (step.plumbing) return "plumbing";
  if (step.run !== undefined && runsARunner(step.run, configuration, scripts, shell)) {
    return claimCodeFrom(step.id) !== undefined && record.some(({ key }) => key === step.id) ? "fitnessFunction" : "runner";
  }
  return "fitnessFunction";
}

// The step record says how a step went by its outcome, read before continue-on-error turns a failure into success.
const resultFrom = (outcome: string): Result => (outcome === "success" ? "passed" : outcome === "failure" ? "failed" : "never-ran");

// continue-on-error allows failure when it is set to anything but false: an expression is decided by the run, so it may allow it.
const allows = (continueOnError: unknown): boolean => continueOnError !== undefined && continueOnError !== false;

const allowsFailure = ({ continueOnError, jobContinueOnError }: WorkflowStepAsWritten): boolean => allows(continueOnError) || allows(jobContinueOnError);

const placeOf = (step: WorkflowStepAsWritten): string => `${step.workflow}:${step.job}:${stepIdentityOf(step)}`;

function observationOf(step: WorkflowStepAsWritten, steps: readonly WorkflowStepAsWritten[], entry: StepRecordEntryAsWritten | undefined): EvidenceObservation {
  const claimCode = claimCodeFrom(step.id);
  const result = entry === undefined ? "not-recorded" : resultFrom(entry.outcome);
  const jobsRecorded = new Set(steps.filter(({ id }) => entry !== undefined && id === entry.key).map(({ workflow, job }) => `${workflow}:${job}`));
  return {
    cites: claimCode === undefined || result === "not-recorded" ? [] : [claimCode],
    result: result === "passed" && allowsFailure(step) ? "passed-on-error" : result,
    kind: "fitness",
    place: jobsRecorded.size > 1 ? entry!.key : placeOf(step)
  };
}

// A recorded entry no step carries is posted as its record says, at its id. Without the step, continue-on-error cannot be
// read, so a success may have hidden a failure: it fails closed, as passed-on-error.
const unheldObservationOf = ({ key, outcome }: StepRecordEntryAsWritten): EvidenceObservation => {
  const claimCode = claimCodeFrom(key);
  const result = resultFrom(outcome);
  return { cites: claimCode === undefined ? [] : [claimCode], result: result === "passed" ? "passed-on-error" : result, kind: "fitness", place: key };
};

export function fitnessObservationsOf(
  steps: readonly WorkflowStepAsWritten[],
  record: readonly StepRecordEntryAsWritten[],
  configuration: TargetConfiguration,
  scripts: Scripts,
  shell: ShellAnswers,
): EvidenceObservation[] {
  const entryFor = ({ id }: WorkflowStepAsWritten) => record.find(({ key }) => key === id);
  const posting = steps.filter((step) => stepDispositionOf(step, configuration, scripts, shell, record) === "fitnessFunction");
  const postedOnce = posting.filter((step, at) => entryFor(step) === undefined || posting.findIndex(({ id }) => id === step.id) === at);
  return [
    ...postedOnce.map((step) => observationOf(step, posting, entryFor(step))),
    ...record.filter(({ key }) => !steps.some(({ id }) => id === key)).map(unheldObservationOf),
  ];
}
