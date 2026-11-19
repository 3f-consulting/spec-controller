import type { QualityCheckKind } from "./postEvidenceObligation.js";
import type { CiStep } from "./workflowSteps.js";

export type Layer = Exclude<QualityCheckKind, "fitness">;

// A step named in notChecks: its workflow, job and step name.
interface StepAddress {
  readonly workflow: string;
  readonly job: string;
  readonly step: string;
}

// A runner named with the evidence reports it writes, each by its file name.
export interface RunnerEntry {
  readonly runner: string;
  readonly reports: readonly string[];
}

// Where a runner's evidence report is: its path, and the format it is written in.
export interface ReportLocation {
  readonly path: string;
  readonly format: string;
}

// A layer's runner: the program it runs, with the evidence report the run names for it, or the file names of the reports
// a specController block's entry names.
export interface Runner {
  readonly name: string;
  readonly report?: ReportLocation;
  readonly reports?: readonly string[];
}

// Each layer's runners; a layer with none has an empty list.
export interface TargetConfiguration {
  readonly runners: Readonly<Record<Layer, readonly Runner[]>>;
  readonly nonChecks: readonly StepAddress[];
  readonly deferralTags: readonly string[];
}

// entry is the setting as written, such as runners.unit or deferralTags[0].
export interface ConfigurationError {
  readonly kind:
    | "configuration-wrong-kind"
    | "configuration-unknown-key"
    | "runner-key-not-a-layer"
    | "runner-report-not-read"
    | "runner-report-not-named"
    | "not-checks-entry-matches-no-step"
    | "not-checks-entry-not-a-step-name";
  readonly entry: string;
}

export interface NonCheck {
  readonly entry: string;
  readonly address: StepAddress;
}

// One part of a setting, in the order it is written: what the settings' reader took from it, or the error that left it out.
export type SettingPart<Value> = { readonly taken: Value } | { readonly error: ConfigurationError };

// A target's settings as its reader took them, before they are checked against the run.
export interface ConfigurationSettings {
  readonly runners: readonly SettingPart<readonly [Layer, Runner]>[];
  readonly nonChecks: readonly SettingPart<NonCheck>[];
  readonly deferralTags: readonly SettingPart<string>[];
  readonly unknownKeys: readonly ConfigurationError[];
}

export const NO_SETTINGS: ConfigurationSettings = { runners: [], nonChecks: [], deferralTags: [], unknownKeys: [] };

const isEntry = (runner: Runner | undefined): runner is RunnerEntry => typeof runner === "object" && runner !== null;

interface Checked<Value> {
  readonly value: Value;
  readonly errors: readonly ConfigurationError[];
}

function checked<Taken, Value>(parts: readonly SettingPart<Taken>[], check: (taken: Taken) => Checked<Value | undefined>): Checked<Value[]> {
  const each = parts.map((part): Checked<Value | undefined> => ("error" in part ? { value: undefined, errors: [part.error] } : check(part.taken)));
  return { value: each.flatMap(({ value }) => (value === undefined ? [] : [value])), errors: each.flatMap(({ errors }) => errors) };
}

// A runner entry keeps the reports the run read, matched by file name; each other report name is left out with an
// error naming it, and the runner stays.
function runnerChecked([layer, runner]: readonly [Layer, Runner], reportsRead: readonly string[]): Checked<readonly [Layer, Runner]> {
  if (!isEntry(runner)) return { value: [layer, runner], errors: [] };
  const read = (report: string): boolean => reportsRead.includes(report);
  return {
    value: [layer, { runner: runner.runner, reports: runner.reports.filter(read) }],
    errors: runner.reports.filter((report) => !read(report)).map((report) => ({ kind: "runner-report-not-read", entry: report })),
  };
}

// The name of the program a layer's runner runs, when it has one.
export const runnerNameOf = (runner: Runner | undefined): string | undefined => (isEntry(runner) ? runner.runner : (runner ?? undefined));

// The file names of the evidence reports a layer's runner writes, as its entry names them.
export const reportsOf = (runner: Runner | undefined): readonly string[] => (isEntry(runner) ? runner.reports : []);

// A non-check in a workflow that was read must be a step in it.
function nonCheckChecked({ entry, address }: NonCheck, steps: readonly CiStep[]): Checked<StepAddress | undefined> {
  const inItsWorkflow = steps.filter(({ workflow }) => workflow === address.workflow);
  const named = inItsWorkflow.some((step) => step.job === address.job && step.identity === address.step);
  return inItsWorkflow.length === 0 || named ? { value: address, errors: [] } : { value: undefined, errors: [{ kind: "not-checks-entry-matches-no-step", entry }] };
}

// The target's configuration: the settings checked against the steps and the reports the run read, with every error.
export function targetConfigurationOf(
  settings: ConfigurationSettings,
  steps: readonly CiStep[],
  reportsRead: readonly string[],
): { readonly configuration: TargetConfiguration; readonly errors: readonly ConfigurationError[] } {
  const runners = checked(settings.runners, (runner) => runnerChecked(runner, reportsRead));
  const nonChecks = checked(settings.nonChecks, (nonCheck) => nonCheckChecked(nonCheck, steps));
  const deferralTags = checked(settings.deferralTags, (tag) => ({ value: tag, errors: [] }));
  return {
    configuration: { runners: Object.fromEntries(runners.value), nonChecks: nonChecks.value, deferralTags: deferralTags.value },
    errors: [...runners.errors, ...nonChecks.errors, ...deferralTags.errors, ...settings.unknownKeys],
  };
}
