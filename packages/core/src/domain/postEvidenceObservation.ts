import { claimCodeCitationsIn, claimCodeFrom, sameCode, type ClaimCode } from "./claimCodes.js";
import { claimCodesAtLinesOf, type ExecutableClaim, type FeatureAsWritten, type QualityCheckKind } from "./postEvidenceObligation.js";
import { relativizeToRoot } from "./targetPath.js";

export interface EvidenceObservation {
  readonly cites: readonly ClaimCode[];
  readonly result: "passed" | "passed-on-error" | "failed" | "never-ran";
  readonly kind: QualityCheckKind;
  readonly place: string;
  readonly name?: string | undefined;
  readonly message?: string | undefined;
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

// A report names a feature file by a path that ends in the file's path within the corpus.
export function claimCodesAtOf(features: readonly FeatureAsWritten[]): ClaimCodesAt {
  const byLine = new Map<number, { readonly file: string; readonly codes: readonly string[] }[]>();
  for (const { file, scenarios } of features) {
    for (const { line, codes } of scenarios.flatMap(claimCodesAtLinesOf)) {
      const atLine = byLine.get(line);
      if (atLine) atLine.push({ file: `/${file}`, codes });
      else byLine.set(line, [{ file: `/${file}`, codes }]);
    }
  }
  return (path, line) => byLine.get(line)?.find((at) => `/${path}`.endsWith(at.file))?.codes ?? [];
}

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
const RESULT_OF_OUTCOME: ReadonlyMap<string | undefined, EvidenceObservation["result"]> = new Map([
  ["success", "passed"],
  ["failure", "failed"],
]);

function citesOfId(id: string | undefined): ClaimCode[] {
  const code = claimCodeFrom(id);
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
  const result = RESULT_OF_OUTCOME.get(outcome);
  if (result === undefined) {
    return { cites, result: "never-ran", kind: "fitness", place, notes: [String(outcome)] };
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

function neverRanObservation(kind: QualityCheckKind, place: string, message: string | undefined): EvidenceObservation {
  return { cites: [], result: "never-ran", kind, place, notes: [], message };
}

// One code written in two places, such as a scenario's tag and the corpus at its line, is one citation.
function nearestCitation(levels: readonly (readonly ClaimCode[])[]): readonly ClaimCode[] {
  const nearest = levels.find((codes) => codes.length > 0) ?? [];
  return nearest.filter((code, at) => nearest.findIndex((other) => sameCode(code, other)) === at);
}

const TEST_REPORT_KIND: QualityCheckKind = "unit";

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
const RESULT_OF_TEST_STATUS: ReadonlyMap<string | undefined, EvidenceObservation["result"]> = new Map([
  ["passed", "passed"],
  ["failed", "failed"],
]);

const resultOfTestStatus = (status: string | undefined): EvidenceObservation["result"] | undefined => RESULT_OF_TEST_STATUS.get(status);

const FAILED_FILE = "failed";

function testObservationOf(test: TestAsWritten, place: string): EvidenceObservation[] {
  const result = resultOfTestStatus(test.status);
  if (result === undefined) return [];
  const cites = nearestCitation([claimCodeCitationsIn(test.title), claimCodeCitationsIn(test.fullTitle)]);
  return [{ cites, result, kind: TEST_REPORT_KIND, place, notes: [], name: test.fullTitle ?? test.title }];
}

// Each test posts at its file; a file that failed with no test in it never reached its tests, and posts as never ran.
export function testFileObservationsOf(files: readonly TestFileAsWritten[], root?: string): EvidenceObservation[] {
  return files.flatMap((file) => {
    const place = relativizeToRoot(String(file.path), root);
    if (file.status === FAILED_FILE && file.tests.length === 0) return [neverRanObservation(TEST_REPORT_KIND, place, file.message)];
    return file.tests.flatMap((test) => testObservationOf(test, place));
  });
}

interface EndingAsWritten {
  readonly message?: string;
  readonly text?: string;
}

// An error, as its report says where it happened: in the test's setup or teardown, or in the test itself.
type ErrorAsWritten = EndingAsWritten & { readonly inSetupOrTeardown?: boolean };

// A test case in a report of test cases, as the report wrote it: the suite it is in, its class and name, its
// properties, and the failure, error or skip it ended in, each with the message and text written there.
export interface TestCaseAsWritten {
  readonly suite?: string;
  readonly classname?: string;
  readonly name?: string;
  readonly properties: readonly { readonly name?: string; readonly value?: string }[];
  readonly failure?: EndingAsWritten;
  readonly error?: ErrorAsWritten;
  readonly skipped?: boolean;
}

const CLAIM_CODE_PROPERTY = "clm";
type Errored = TestCaseAsWritten & { readonly error: ErrorAsWritten };

const isCollectionFailure = (testCase: TestCaseAsWritten): testCase is Errored => testCase.error !== undefined && !testCase.classname;

const isClassSetupFailure = (testCase: TestCaseAsWritten): testCase is Errored => testCase.error !== undefined && !testCase.name;

const isSetupError = (testCase: TestCaseAsWritten): testCase is Errored => testCase.error?.inSetupOrTeardown === true;

// Go writes a package whose tests never ran, because it failed to build or its TestMain failed, as a failing TestMain with no
// classname; no writer leaves the classname off a test that ran.
const isPackageFailure = (testCase: TestCaseAsWritten): testCase is TestCaseAsWritten & { readonly failure: EndingAsWritten } =>
  !testCase.classname && testCase.failure !== undefined;

const errorTextOf = ({ error }: Errored): string | undefined => error.text ?? error.message;

function nameCitationsOf(name: string | undefined): ClaimCode[] {
  const segmentsLeafFirst = String(name).split("/").reverse();
  return segmentsLeafFirst.map(claimCodeCitationsIn).find((codes) => codes.length > 0) ?? [];
}

function propertyCitationsOf(testCase: TestCaseAsWritten): ClaimCode[] {
  return testCase.properties
    .filter((property) => property.name === CLAIM_CODE_PROPERTY)
    .flatMap((property) => claimCodeFrom(property.value) ?? []);
}

// A test case cites its clm properties and its name's innermost cited segment, else the last code its class cites.
function testCaseCitesOf(testCase: TestCaseAsWritten): readonly ClaimCode[] {
  return nearestCitation([
    [...propertyCitationsOf(testCase), ...nameCitationsOf(testCase.name)],
    claimCodeCitationsIn(testCase.classname).slice(-1),
  ]);
}

// An error in a test's setup or teardown means it never reached its assertions; an error in the test itself, that it failed.
function testCaseResultOf(testCase: TestCaseAsWritten): EvidenceObservation["result"] {
  if (isSetupError(testCase)) return "never-ran";
  if (testCase.error !== undefined) return "failed";
  return testCase.failure === undefined ? "passed" : "failed";
}

function testCaseObservationOf(testCase: TestCaseAsWritten): EvidenceObservation[] {
  if (testCase.skipped === true) return [];
  if (isCollectionFailure(testCase)) return [neverRanObservation(TEST_REPORT_KIND, String(testCase.name), errorTextOf(testCase))];
  if (isPackageFailure(testCase)) return [neverRanObservation(TEST_REPORT_KIND, String(testCase.suite), testCase.failure.text)];
  // A class setup failure has a class: a failure with neither class nor name was taken as a collection failure.
  if (isClassSetupFailure(testCase)) return [neverRanObservation(TEST_REPORT_KIND, testCase.classname!, errorTextOf(testCase))];
  return [{
    cites: testCaseCitesOf(testCase),
    result: testCaseResultOf(testCase),
    kind: TEST_REPORT_KIND,
    place: String(testCase.classname),
    notes: [],
    name: testCase.name,
    message: isSetupError(testCase) ? errorTextOf(testCase) : undefined,
  }];
}

// A skipped test case posts nothing. One that never reached its tests (a collection failure, a class whose setup failed,
// a package that did not build) posts as never ran. Any other posts as passed, failed, or as its error says.
export function testCaseObservationsOf(cases: readonly TestCaseAsWritten[]): EvidenceObservation[] {
  return cases.flatMap(testCaseObservationOf);
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
  return relativizeToRoot(path.replace(/\.\//, ""), root);
}

const LOADED_FILE = /(?:While loading (.+?) a |An error occurred while loading (.+?)\.(?:\n|$))/;

// Each error outside the examples never ran: one naming the file it was loading posts at that file, and the rest,
// when the messages name fewer files than the report counted errors, post once together at no file.
function loadErrorsOf({ errorsOutsideExamples = 0, messages }: ExamplesAsWritten, root?: string): EvidenceObservation[] {
  const read = messages.map((message) => ({ message, loaded: LOADED_FILE.exec(message) }));
  const named = read.flatMap(({ message, loaded }) => {
    const path = loaded?.[1] ?? loaded?.[2];
    return path === undefined ? [] : [neverRanObservation(TEST_REPORT_KIND, placeOfExample(path, root), message)];
  });
  if (errorsOutsideExamples <= named.length) return named;
  const unnamed = read.filter(({ loaded }) => loaded === null).map(({ message }) => message);
  return [...named, neverRanObservation(TEST_REPORT_KIND, "", unnamed.join("\n"))];
}

function exampleObservationOf(example: ExampleAsWritten, root?: string): EvidenceObservation[] {
  const result = resultOfTestStatus(example.status);
  if (result === undefined) return [];
  const cites = nearestCitation([claimCodeCitationsIn(example.title), claimCodeCitationsIn(example.fullTitle)]);
  return [{ cites, result, kind: TEST_REPORT_KIND, place: placeOfExample(String(example.path), root), notes: [], name: example.fullTitle }];
}

// Each example posts at its file under its full title, then each error outside the examples posts as never ran.
export function exampleObservationsOf(report: ExamplesAsWritten, root?: string): EvidenceObservation[] {
  return [...report.examples.flatMap((example) => exampleObservationOf(example, root)), ...loadErrorsOf(report, root)];
}

const KINDS_A_SCENARIO_TAG_NAMES: readonly QualityCheckKind[] = ["integration", "e2e", "performance"];

function kindsTheTagsName(tags: readonly string[]): QualityCheckKind[] {
  const named = KINDS_A_SCENARIO_TAG_NAMES.filter((kind) => tags.includes(kind));
  return named.length > 0 ? named : ["integration"];
}

// A step of a scenario run, as the report wrote it: its keyword, its text and its status.
interface StepRunAsWritten {
  readonly keyword?: string;
  readonly text?: string;
  readonly status?: string;
}

// A scenario run in a report of scenario runs, as the report wrote it: its feature's path and name, the line it ran
// from, its name, its tags without their at-sign, and its steps.
export interface ScenarioRunAsWritten {
  readonly featurePath?: string;
  readonly featureName?: string;
  readonly line?: number;
  readonly name?: string;
  readonly tags: readonly string[];
  readonly steps: readonly StepRunAsWritten[];
}

type StepEnding = "passed" | "failed" | "could-not-run";

// A step that matched no definition, or two, could not run; a step skipped, pending or of any other status ends nothing.
const ENDING_OF_STEP_STATUS: ReadonlyMap<string | undefined, StepEnding> = new Map([
  ["passed", "passed"],
  ["failed", "failed"],
  ["ambiguous", "could-not-run"],
  ["undefined", "could-not-run"],
]);

const endingOf = (step: StepRunAsWritten): StepEnding | undefined => ENDING_OF_STEP_STATUS.get(step.status);

// A failed step fails the scenario; else one that could not run means it never ran; else it passed only when every step passed.
function scenarioResultOf(steps: readonly StepRunAsWritten[]): EvidenceObservation["result"] | undefined {
  const endings = steps.map(endingOf);
  if (endings.includes("failed")) return "failed";
  if (endings.includes("could-not-run")) return "never-ran";
  return endings.length > 0 && endings.every((ending) => ending === "passed") ? "passed" : undefined;
}

const stepText = (step: StepRunAsWritten): string => `${(step.keyword ?? "").trim()} ${step.text ?? ""}`;

const codesIn = (texts: readonly string[]): ClaimCode[] => texts.flatMap((text) => claimCodeFrom(text) ?? []);

function scenarioRunObservationOf(run: ScenarioRunAsWritten, root: string | undefined, claimCodesAt: ClaimCodesAt): EvidenceObservation[] {
  const result = scenarioResultOf(run.steps);
  if (result === undefined) return [];
  const place = relativizeToRoot(run.featurePath ?? run.featureName ?? "", root);
  const rowCodes = run.line === undefined ? [] : claimCodesAt(place, run.line);
  const [firstKind, ...otherKinds] = kindsTheTagsName(run.tags);
  const cites = nearestCitation([codesIn([...run.tags, ...rowCodes])]);
  if (result === "never-ran") {
    return [{ cites, result, kind: firstKind!, place, notes: run.steps.filter((step) => endingOf(step) === "could-not-run").map(stepText) }];
  }
  return [firstKind!, ...otherKinds].map((kind) => ({ cites, result, kind, place, notes: [], name: run.name }));
}

// A scenario run posts at its feature file, citing its tags' codes and the code the corpus has at its line, once at each
// kind its tags name; one that never ran posts once, naming the steps that could not run.
export function scenarioRunObservationsOf(runs: readonly ScenarioRunAsWritten[], root: string | undefined, claimCodesAt: ClaimCodesAt): EvidenceObservation[] {
  return runs.flatMap((run) => scenarioRunObservationOf(run, root, claimCodesAt));
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
