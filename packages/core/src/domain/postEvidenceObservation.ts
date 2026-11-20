import { claimCodeCitationsIn, claimCodeFrom, type ClaimCode } from "./claimCodes.js";
import type { DefaultReportsOf, ReportsNamed, TargetConfiguration } from "./configuration.js";
import type { FeatureFile, QualityCheckKind } from "./postEvidenceObligation.js";
import { shownFromTarget } from "./targetPath.js";
import type { CiStep, FailureAllowed } from "./workflowSteps.js";

// not-recorded is a step a workflow has that no step record names: balance has no word on how it went.
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

// A step the CI run recorded, keyed by the step's id, with how it went before a step that allows failure has its failure read as success,
// and whether its record saved its job as succeeded.
export interface RecordedStep {
  readonly key: string;
  readonly result: Extract<Result, "passed" | "failed" | "never-ran"> | "skipped";
  readonly jobSucceeded: boolean;
}

// The shell reader's answers, handed to the domain so it decides which question serves which step.
export interface ShellAnswers {
  readonly invokesTheReconciler: (commandLine: string) => boolean;
  readonly invokesAsCommand: (commandLine: string, program: string, scripts: Readonly<Record<string, string>>) => boolean;
  readonly reportsNamed: ReportsNamed;
  readonly defaultReportsOf: DefaultReportsOf;
}

// The codes a test cites: its own, or else those of its nearest parent that cites any. The chain runs outermost first.
const nearestCitations = (chain: readonly string[]): ClaimCode[] =>
  chain.reduceRight<ClaimCode[]>((found, title) => (found.length > 0 ? found : claimCodeCitationsIn(title)), []);

// A scenario is evidence of kindsOf's layers of those its report serves; any other result, of each.
const layersOf = (cites: TestCitation, served: readonly QualityCheckKind[]): readonly QualityCheckKind[] => ("scenarioTags" in cites ? kindsOf(cites.scenarioTags, served) : served);

// A scenario cites the codes its tags name, or failing those its Outline row's clm cell.
function codesCitedBy(cites: TestCitation, rowCodeOf: (file: string, line: number) => ClaimCode[]): ClaimCode[] {
  if ("titles" in cites) return nearestCitations(cites.titles);
  if ("codes" in cites) return [...new Set(cites.codes)].flatMap((code) => claimCodeFrom(code) ?? []);
  const tagged = cites.scenarioTags.flatMap((tag) => claimCodeFrom(tag) ?? []);
  return tagged.length > 0 ? tagged : rowCodeOf(cites.file, cites.line);
}

// served is the layers the report's runners serve; features is the corpus as written, where an Outline row's claim code is.
export function observationsOfTestResults(
  results: readonly TestResult[],
  targetFolder: string,
  served: readonly QualityCheckKind[],
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

// A scenario is evidence of each layer its report serves that its tags name, and of every one where they name none.
function kindsOf(tags: readonly string[], layers: readonly QualityCheckKind[]): readonly QualityCheckKind[] {
  const named = layers.filter((kind) => tags.includes(kind));
  return named.length > 0 ? named : layers;
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

// What a CI step is, for the evidence: the reconciler, a non-check, plumbing, a runner, or a fitness function.
export type StepDisposition = "reconciler" | "nonCheck" | "plumbing" | "runner" | "fitnessFunction";

export type DisposedStep = { readonly step: CiStep; readonly disposition: StepDisposition };

const isNamedIn = (step: CiStep, { nonChecks }: TargetConfiguration): boolean =>
  nonChecks.some(({ workflow, job, step: named }) => workflow === step.workflow && job === step.job && named === step.identity);

// The reconciler is recognised in any command of the step, a runner only as the command the step runs, through its scripts.
const runsARunner = (command: string, { runners }: TargetConfiguration, scripts: Scripts, shell: ShellAnswers): boolean =>
  Object.values(runners).some((layerRunners) => layerRunners.some(({ name }) => shell.invokesAsCommand(command, name, scripts)));

export type Scripts = Readonly<Record<string, string>>;

// A runner is a fitness function of its own when its id is a claim code a step record holds.
export function stepDispositionOf(
  step: CiStep,
  configuration: TargetConfiguration,
  scripts: Scripts,
  shell: ShellAnswers,
  record: readonly RecordedStep[] = [],
): StepDisposition {
  if (step.writesStepRecord || (step.command !== undefined && shell.invokesTheReconciler(step.command))) return "reconciler";
  if (isNamedIn(step, configuration)) return "nonCheck";
  if (step.plumbing) return "plumbing";
  if (step.command !== undefined && runsARunner(step.command, configuration, scripts, shell)) {
    return claimCodeFrom(step.id) !== undefined && record.some(({ key }) => key === step.id) ? "fitnessFunction" : "runner";
  }
  return "fitnessFunction";
}

// A step or its job allows failure when set to anything but false: one decided by the run may allow it.
const allows = (failureAllowed: FailureAllowed | undefined): boolean => failureAllowed !== undefined && failureAllowed !== false;

const failureAllowedFor = ({ allowsFailure, jobAllowsFailure }: CiStep): boolean => allows(allowsFailure) || allows(jobAllowsFailure);

// A success fails closed: it may have hidden a failure when any step carrying its id, in any job or workflow, allows failure.
const anyAllowsFailure = (id: string | undefined, steps: readonly CiStep[]): boolean =>
  steps.some((step) => step.id === id && failureAllowedFor(step));

const placeOf = (step: CiStep): string => `${step.workflow}:${step.job}:${step.identity}`;

const postedResultOf = (recorded: RecordedStep["result"]): Result => (recorded === "skipped" ? "never-ran" : recorded);

// A step skipped in a job that succeeded was skipped by design, so it posts nothing, as a skipped test does.
const skippedByDesign = ({ result, jobSucceeded }: RecordedStep): boolean => result === "skipped" && jobSucceeded;

function observationOf(step: CiStep, steps: readonly CiStep[], allSteps: readonly CiStep[], entry: RecordedStep | undefined): EvidenceObservation {
  const claimCode = claimCodeFrom(step.id);
  const result = entry === undefined ? "not-recorded" : postedResultOf(entry.result);
  const jobsRecorded = new Set(steps.filter(({ id }) => entry !== undefined && id === entry.key).map(({ workflow, job }) => `${workflow}:${job}`));
  return {
    cites: claimCode === undefined || result === "not-recorded" ? [] : [claimCode],
    result: result === "passed" && anyAllowsFailure(step.id, allSteps) ? "passed-on-error" : result,
    kind: "fitness",
    place: jobsRecorded.size > 1 ? entry!.key : placeOf(step)
  };
}

// A recorded entry no step carries is posted as its record says, at its id. Without the step, whether it allows failure cannot
// be read, so a success may have hidden a failure: it fails closed, as passed-on-error.
const unheldObservationOf = ({ key, result: recorded }: RecordedStep): EvidenceObservation => {
  const result = postedResultOf(recorded);
  const claimCode = claimCodeFrom(key);
  return { cites: claimCode === undefined ? [] : [claimCode], result: result === "passed" ? "passed-on-error" : result, kind: "fitness", place: key };
};

// The one place a run's steps are disposed: each step with what it is, in the order read.
export function disposedStepsOf(
  steps: readonly CiStep[],
  configuration: TargetConfiguration,
  scripts: Scripts,
  shell: ShellAnswers,
  record: readonly RecordedStep[],
): DisposedStep[] {
  return steps.map((step) => ({ step, disposition: stepDispositionOf(step, configuration, scripts, shell, record) }));
}

export function fitnessObservationsOf(disposedSteps: readonly DisposedStep[], record: readonly RecordedStep[]): EvidenceObservation[] {
  const entriesFor = ({ id }: CiStep) => record.filter(({ key }) => key === id);
  const allSteps = disposedSteps.map(({ step }) => step);
  const posting = disposedSteps.filter(({ disposition }) => disposition === "fitnessFunction").map(({ step }) => step);
  const postedOnce = posting.filter((step, at) => entriesFor(step).length === 0 || posting.findIndex(({ id }) => id === step.id) === at);
  return [
    ...postedOnce.flatMap((step) => {
      const entries = entriesFor(step);
      return (entries.length === 0 ? [undefined] : entries.filter((entry) => !skippedByDesign(entry))).map((entry) => observationOf(step, posting, allSteps, entry));
    }),
    ...record.filter(({ key }) => !disposedSteps.some(({ step: { id } }) => id === key)).map(unheldObservationOf),
  ];
}
