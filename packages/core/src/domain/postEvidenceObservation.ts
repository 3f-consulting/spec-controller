import { CLM_COLUMN, claimCodeCitationsIn, claimCodeFrom, type ClaimCode } from "./claimCodes.js";
import type { TargetConfiguration } from "./configuration.js";
import type { FeatureAsWritten, QualityCheckKind } from "./postEvidenceObligation.js";
import { shownFromTarget } from "./targetPath.js";
import { stepIdentityOf, type WorkflowStepAsWritten } from "./workflowSteps.js";

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

// The report kept by suite whose errors are written only for a test that never reached its assertions, and which cites a
// test's claim codes in its properties. Its reader names its reports so; any other report kept by suite writes an error for
// a test that failed, and cites in its names.
export const ERRORS_BEFORE_ASSERTIONS = "errors-before-assertions";

// An error is a test that never reached its assertions; with no class name, a file that was never collected.
function observationWhereErrorsNeverRan(result: ResultInSuiteAsWritten, targetFolder: string): EvidenceObservation[] {
  const { className, name, file, clmProperties, outcome, failure } = result;
  if (outcome === "skipped") return [];
  const collected = (className ?? "") !== "";
  const cites = collected ? clmProperties.flatMap((property) => claimCodeFrom(property) ?? []) : [];
  const resultOf: Result = outcome === "error" ? "never-ran" : outcome === "failure" ? "failed" : "passed";
  const place = shownFromTarget(file ?? (collected ? className! : name), targetFolder);
  return [{ cites, result: resultOf, kind: "unit", place, ...(collected && { name }), ...saidBy(failure), notes: [] }];
}

// A case with no class name is its suite's own failure, such as a package that did not build; one with no name is its
// class's, such as a class whose setup before all its tests failed. Neither reached a test's assertions.
function observationWhereErrorsFailed(suite: ResultsBySuiteAsWritten, result: ResultInSuiteAsWritten, targetFolder: string): EvidenceObservation[] {
  const { className = "", name, file, outcome, failure } = result;
  if (outcome === "skipped") return [];
  if (outcome !== "" && (className === "" || name === "")) {
    return [{ cites: [], result: "never-ran", kind: "unit", place: className || suite.name, ...saidBy(failure), notes: [] }];
  }
  const cites = nearestCitations([className, ...name.split("/")]);
  const place = shownFromTarget(file ?? (className || suite.name), targetFolder);
  return [{ cites, result: outcome === "" ? "passed" : "failed", kind: "unit", place, name, ...saidBy(failure), notes: [] }];
}

// Results kept by suite, each case in its suite.
export function observationsBySuite(suites: readonly ResultsBySuiteAsWritten[], targetFolder: string): EvidenceObservation[] {
  return suites.flatMap((suite) =>
    suite.results.flatMap((result) => 
      suite.report === ERRORS_BEFORE_ASSERTIONS ? observationWhereErrorsNeverRan(result, targetFolder) : observationWhereErrorsFailed(suite, result, targetFolder),
    ),
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

const BEHAVIOURAL_KINDS: readonly QualityCheckKind[] = ["integration", "e2e", "performance"];

// A scenario is evidence of each behavioural kind its tags name, and of integration where they name none.
function kindsOf(tags: readonly string[]): readonly QualityCheckKind[] {
  const named = BEHAVIOURAL_KINDS.filter((kind) => tags.includes(kind));
  return named.length > 0 ? named : ["integration"];
}

type StepAsWritten = ScenarioResultAsWritten["steps"][number];

const asWritten = ({ keyword, text }: StepAsWritten): string => `${keyword.trim()} ${text}`;

// A step that matched no definition, or more than one, kept the scenario from running, whatever else its steps did.
function resultOfSteps(steps: readonly StepAsWritten[]): { readonly result: Result; readonly message?: string } | undefined {
  const unmatched = steps.find(({ status }) => status === "undefined" || status === "ambiguous");
  if (unmatched) return { result: "never-ran", message: asWritten(unmatched) };
  const failed = steps.find(({ status }) => status === "failed");
  if (failed) return { result: "failed", ...(failed.message === undefined ? {} : { message: failed.message }) };
  return steps.length > 0 && steps.every(({ status }) => status === "passed") ? { result: "passed" } : undefined;
}

// An Outline row's code is its clm cell, in the feature file at the end of the result's path, at the row's line.
function rowCodesOf(features: readonly FeatureAsWritten[]): (file: string, line: number) => ClaimCode[] {
  const byFile = new Map<string, ReadonlyMap<number, ClaimCode | undefined>>();
  for (const { file, scenarios } of features) {
    const byLine = new Map<number, ClaimCode | undefined>();
    for (const { columns, rows } of scenarios.flatMap(({ examples }) => examples)) {
      for (const { line, cells } of rows) byLine.set(line, claimCodeFrom(cells[columns.indexOf(CLM_COLUMN)] ?? ""));
    }
    byFile.set(file, byLine);
  }
  // The longest feature file path the result's path ends with is its file.
  const longestFirst = [...byFile.keys()].sort((one, other) => other.length - one.length);
  return (file, line) => {
    const featureFile = longestFirst.find((candidate) => file === candidate || file.endsWith(`/${candidate}`));
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
    return kindsOf(tags).map((kind): EvidenceObservation => ({ cites, ...outcome, kind, place, name: title, notes: [] }));
  });
}

// What a CI step is, for the evidence: the reconciler, a non-check, plumbing, a runner, or a candidate fitness function.
export type StepDisposition = "reconciler" | "nonCheck" | "plumbing" | "runner" | "candidate";

const RECONCILER = "spec-controller balance";

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
