import { claimCodeCitationsIn, claimCodeFrom, type ClaimCode } from "./claimCodes.js";
import { reportsOf, runnerNameOf, type TargetConfiguration } from "./configuration.js";
import { QUALITY_CHECK_KINDS, type FeatureFile, type QualityCheckKind } from "./postEvidenceObligation.js";
import { shownFromTarget } from "./targetPath.js";
import { stepIdentityOf, type CiStep, type ContinueOnError } from "./workflowSteps.js";

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

// Where a test's result is: a file, shown from the target's folder, or a place its report names, shown as written.
export type TestPlace = { readonly file: string } | { readonly named: string };

// The titles a test sits under, outermost first; the codes written for it; or its scenario's tags and where it is.
export type TestCitation =
  | { readonly titles: readonly string[] }
  | { readonly codes: readonly string[] }
  | { readonly scenarioTags: readonly string[]; readonly file: string; readonly line: number };

// A test's result, in the domain's words. A reader leaves out a result the domain posts nothing for.
export interface TestResult {
  readonly place: TestPlace;
  readonly name?: string;
  readonly result: Extract<Result, "passed" | "failed" | "never-ran">;
  readonly message?: string;
  readonly cites: TestCitation;
}

// What each reader reports, as written. Which result each status means is the domain's. report, where kept, is the
// evidence report it came from, as its reader names it, since what a status means can differ between them.

// A report of scenario runs: one entry per scenario or Outline row that ran. A hook is a step with no text.
export interface ScenarioResultAsWritten {
  readonly file: string;
  readonly line: number;
  readonly title: string;
  readonly tags: readonly string[];
  readonly steps: readonly { readonly keyword: string; readonly text?: string; readonly status: string; readonly message?: string }[];
}

// A step the CI run recorded, keyed by the step's id, with how it went before continue-on-error turns a failure into success.
export interface RecordedStep {
  readonly key: string;
  readonly result: Extract<Result, "passed" | "failed" | "never-ran">;
}

// The shell reader's two answers, handed to the domain so it decides which question serves which step.
export interface ShellAnswers {
  readonly invokesTheReconciler: (commandLine: string) => boolean;
  readonly invokesAsCommand: (commandLine: string, program: string, scripts: Readonly<Record<string, string>>) => boolean;
}

// The codes a test cites: its own, or else those of its nearest parent that cites any. The chain runs outermost first.
const nearestCitations = (chain: readonly string[]): ClaimCode[] =>
  chain.reduceRight<ClaimCode[]>((found, title) => (found.length > 0 ? found : claimCodeCitationsIn(title)), []);

const UNIT: readonly QualityCheckKind[] = ["unit"];

// A scenario's layers are kindsOf's; any other result's, each layer its report serves, or unit where none names it.
const layersOf = (cites: TestCitation, served: readonly QualityCheckKind[]): readonly QualityCheckKind[] =>
  "scenarioTags" in cites ? kindsOf(cites.scenarioTags, served) : served.length > 0 ? served : UNIT;

// A scenario cites the codes its tags name, or failing those its Outline row's clm cell.
function codesCitedBy(cites: TestCitation, rowCodeOf: (file: string, line: number) => ClaimCode[]): ClaimCode[] {
  if ("titles" in cites) return nearestCitations(cites.titles);
  if ("codes" in cites) return [...new Set(cites.codes)].flatMap((code) => claimCodeFrom(code) ?? []);
  const tagged = cites.scenarioTags.flatMap((tag) => claimCodeFrom(tag) ?? []);
  return tagged.length > 0 ? tagged : rowCodeOf(cites.file, cites.line);
}

// features is the corpus as written, where an Outline row's claim code is.
export function observationsOfTestResults(
  results: readonly TestResult[],
  targetFolder: string,
  served: readonly QualityCheckKind[] = [],
  features: readonly FeatureFile[] = [],
): EvidenceObservation[] {
  const rowCodeOf = rowCodesOf(features);
  return results.flatMap(({ place, name, result, message, cites }) => {
    const observation = {
      cites: codesCitedBy(cites, rowCodeOf),
      result,
      place: "file" in place ? shownFromTarget(place.file, targetFolder) : place.named,
      ...(name !== undefined && { name }),
      ...(message !== undefined && { message }),
    };
    return layersOf(cites, served).map((kind): EvidenceObservation => ({ ...observation, kind }));
  });
}

// The layers whose runner entry names the report's file name, in the order the layers run; none when no entry does.
export function layersServing(report: string, runners: TargetConfiguration["runners"]): QualityCheckKind[] {
  return QUALITY_CHECK_KINDS.filter((kind) => kind !== "fitness" && reportsOf(runners[kind]).includes(report));
}

const INTEGRATION: readonly QualityCheckKind[] = ["integration"];

// A scenario is evidence of each layer its report serves that its tags name, and of every one where they name none. A
// report no runner entry names serves integration.
function kindsOf(tags: readonly string[], served: readonly QualityCheckKind[]): readonly QualityCheckKind[] {
  const layers = served.length > 0 ? served : INTEGRATION;
  const named = layers.filter((kind) => tags.includes(kind));
  return named.length > 0 ? named : layers;
}

type StepAsWritten = ScenarioResultAsWritten["steps"][number];

const asWritten = ({ keyword, text }: StepAsWritten): string => `${keyword.trim()} ${text}`;

// A step that matched no definition, or more than one, kept the scenario from running, whatever else its steps did. A
// scenario passed when every step passed, its hooks among them, and it had a step of its own.
function resultOfSteps(steps: readonly StepAsWritten[]): Pick<TestResult, "result" | "message"> | undefined {
  const unmatched = steps.find(({ status }) => status === "undefined" || status === "ambiguous");
  if (unmatched) return { result: "never-ran", message: asWritten(unmatched) };
  const failed = steps.find(({ status }) => status === "failed");
  if (failed) return { result: "failed", ...(failed.message !== undefined && { message: failed.message }) };
  return steps.some(({ text }) => text !== undefined) && steps.every(({ status }) => status === "passed") ? { result: "passed" } : undefined;
}

// An Outline row's code is its clm cell, in the feature file at the end of the result's path, at the row's line.
function rowCodesOf(features: readonly FeatureFile[]): (file: string, line: number) => ClaimCode[] {
  const byFile = new Map<string, ReadonlyMap<number, ClaimCode | undefined>>();
  for (const { file, scenarios } of features) {
    const byLine = new Map<number, ClaimCode | undefined>();
    for (const { rows } of scenarios.flatMap(({ examples }) => examples)) {
      for (const { line, clmCell } of rows) byLine.set(line, claimCodeFrom(clmCell));
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

// Results kept by scenario: Cucumber's. features is the corpus as written, where an Outline row's claim code is; served
// is the layers the report serves.
export function observationsOfScenarios(
  results: readonly ScenarioResultAsWritten[],
  features: readonly FeatureFile[],
  targetFolder: string,
  served: readonly QualityCheckKind[] = [],
): EvidenceObservation[] {
  const testResults = results.flatMap(({ file, line, title, tags, steps }): TestResult[] => {
    const outcome = resultOfSteps(steps);
    return outcome === undefined ? [] : [{ place: { file }, name: title, ...outcome, cites: { scenarioTags: tags, file, line } }];
  });
  return observationsOfTestResults(testResults, targetFolder, served, features);
}

// What a CI step is, for the evidence: the reconciler, a non-check, plumbing, a runner, or a fitness function.
export type StepDisposition = "reconciler" | "nonCheck" | "plumbing" | "runner" | "fitnessFunction";

const isNamedIn = (step: CiStep, { nonChecks }: TargetConfiguration): boolean =>
  nonChecks.some(({ workflow, job, step: named }) => workflow === step.workflow && job === step.job && named === stepIdentityOf(step));

// The reconciler is recognised in any command of the step, a runner only as the command the step runs, through its scripts.
const runsARunner = (run: string, { runners }: TargetConfiguration, scripts: Scripts, shell: ShellAnswers): boolean =>
  Object.values(runners).some((runner) => {
    const name = runnerNameOf(runner);
    return name !== undefined && shell.invokesAsCommand(run, name, scripts);
  });

export type Scripts = Readonly<Record<string, string>>;

// A runner is a fitness function of its own when its id is a claim code the step record holds.
export function stepDispositionOf(
  step: CiStep,
  configuration: TargetConfiguration,
  scripts: Scripts,
  shell: ShellAnswers,
  record: readonly RecordedStep[] = [],
): StepDisposition {
  if (step.writesStepRecord || (step.run !== undefined && shell.invokesTheReconciler(step.run))) return "reconciler";
  if (isNamedIn(step, configuration)) return "nonCheck";
  if (step.plumbing) return "plumbing";
  if (step.run !== undefined && runsARunner(step.run, configuration, scripts, shell)) {
    return claimCodeFrom(step.id) !== undefined && record.some(({ key }) => key === step.id) ? "fitnessFunction" : "runner";
  }
  return "fitnessFunction";
}

// continue-on-error allows failure when it is set to anything but false: an expression is decided by the run, so it may allow it.
const allows = (continueOnError: ContinueOnError | undefined): boolean => continueOnError !== undefined && continueOnError !== false;

const allowsFailure = ({ continueOnError, jobContinueOnError }: CiStep): boolean => allows(continueOnError) || allows(jobContinueOnError);

const placeOf = (step: CiStep): string => `${step.workflow}:${step.job}:${stepIdentityOf(step)}`;

function observationOf(step: CiStep, steps: readonly CiStep[], entry: RecordedStep | undefined): EvidenceObservation {
  const claimCode = claimCodeFrom(step.id);
  const result = entry === undefined ? "not-recorded" : entry.result;
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
const unheldObservationOf = ({ key, result }: RecordedStep): EvidenceObservation => {
  const claimCode = claimCodeFrom(key);
  return { cites: claimCode === undefined ? [] : [claimCode], result: result === "passed" ? "passed-on-error" : result, kind: "fitness", place: key };
};

export function fitnessObservationsOf(
  steps: readonly CiStep[],
  record: readonly RecordedStep[],
  configuration: TargetConfiguration,
  scripts: Scripts,
  shell: ShellAnswers,
): EvidenceObservation[] {
  const entryFor = ({ id }: CiStep) => record.find(({ key }) => key === id);
  const posting = steps.filter((step) => stepDispositionOf(step, configuration, scripts, shell, record) === "fitnessFunction");
  const postedOnce = posting.filter((step, at) => entryFor(step) === undefined || posting.findIndex(({ id }) => id === step.id) === at);
  return [
    ...postedOnce.map((step) => observationOf(step, posting, entryFor(step))),
    ...record.filter(({ key }) => !steps.some(({ id }) => id === key)).map(unheldObservationOf),
  ];
}
