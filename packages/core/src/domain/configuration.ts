import type { QualityCheckKind } from "./postEvidenceObligation.js";
import type { CiStep } from "./workflowSteps.js";

export type Layer = Exclude<QualityCheckKind, "fitness">;

// A step a non-check names: its workflow, job and step name.
interface StepAddress {
  readonly workflow: string;
  readonly job: string;
  readonly step: string;
}

// Where a runner's evidence report is: its path, and the format it is written in.
export interface ReportLocation {
  readonly path: string;
  readonly format: string;
}

// The shell reader's answer of the evidence reports a step's command, with the variables the step sets, names for a
// runner, each path as the command writes it.
export type ReportsNamed = (
  commandLine: string,
  runner: string,
  scripts: Readonly<Record<string, string>>,
  environment: Readonly<Record<string, string>>,
) => readonly ReportLocation[];

// A layer's runner: the program it runs, with the evidence report the run names for it.
export interface Runner {
  readonly name: string;
  readonly report?: ReportLocation;
}

// Each layer's runners; a layer with none has an empty list.
export interface TargetConfiguration {
  readonly runners: Readonly<Record<Layer, readonly Runner[]>>;
  readonly nonChecks: readonly StepAddress[];
  readonly deferralTags: readonly string[];
}

// entry is the setting as written, such as a runner's long form or a deferral tag; for a report error, the runner or the report's path.
export interface ConfigurationError {
  readonly kind:
    | "configuration-wrong-kind"
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

// The settings a run names, as their reader took them, before they are checked against the run.
export interface ConfigurationSettings {
  readonly runners: readonly SettingPart<readonly [Layer, Runner]>[];
  readonly nonChecks: readonly SettingPart<NonCheck>[];
  readonly deferralTags: readonly SettingPart<string>[];
}

export const NO_SETTINGS: ConfigurationSettings = { runners: [], nonChecks: [], deferralTags: [] };

interface Checked<Value> {
  readonly value: Value;
  readonly errors: readonly ConfigurationError[];
}

function checked<Taken, Value>(parts: readonly SettingPart<Taken>[], check: (taken: Taken) => Checked<Value | undefined>): Checked<Value[]> {
  const each = parts.map((part): Checked<Value | undefined> => ("error" in part ? { value: undefined, errors: [part.error] } : check(part.taken)));
  return { value: each.flatMap(({ value }) => (value === undefined ? [] : [value])), errors: each.flatMap(({ errors }) => errors) };
}

// A runner is kept, naming as an error a report path with no file, or no report.
function runnerChecked([layer, runner]: readonly [Layer, Runner], reportsNotFound: readonly string[]): Checked<readonly [Layer, Runner]> {
  if (runner.report === undefined) return { value: [layer, runner], errors: [{ kind: "runner-report-not-named", entry: runner.name }] };
  if (reportsNotFound.includes(runner.report.path)) return { value: [layer, { name: runner.name }], errors: [{ kind: "runner-report-not-read", entry: runner.report.path }] };
  return { value: [layer, runner], errors: [] };
}

// Each layer's runners, in the order they were named.
function runnersByLayer(runners: readonly (readonly [Layer, Runner])[]): TargetConfiguration["runners"] {
  const of = (layer: Layer): Runner[] => runners.flatMap(([named, runner]) => (named === layer ? [runner] : []));
  return { unit: of("unit"), integration: of("integration"), e2e: of("e2e"), performance: of("performance") };
}

// A non-check in a workflow that was read must be a step in it.
function nonCheckChecked({ entry, address }: NonCheck, steps: readonly CiStep[]): Checked<StepAddress | undefined> {
  const inItsWorkflow = steps.filter(({ workflow }) => workflow === address.workflow);
  const named = inItsWorkflow.some((step) => step.job === address.job && step.identity === address.step);
  return inItsWorkflow.length === 0 || named ? { value: address, errors: [] } : { value: undefined, errors: [{ kind: "not-checks-entry-matches-no-step", entry }] };
}

// The target's configuration: the settings the run names, checked against the steps and the report paths with no file, with every error.
export function targetConfigurationOf(
  settings: ConfigurationSettings,
  steps: readonly CiStep[],
  reportsNotFound: readonly string[] = [],
): { readonly configuration: TargetConfiguration; readonly errors: readonly ConfigurationError[] } {
  const runners = checked(settings.runners, (runner) => runnerChecked(runner, reportsNotFound));
  const nonChecks = checked(settings.nonChecks, (nonCheck) => nonCheckChecked(nonCheck, steps));
  const deferralTags = checked(settings.deferralTags, (tag) => ({ value: tag, errors: [] }));
  return {
    configuration: { runners: runnersByLayer(runners.value), nonChecks: nonChecks.value, deferralTags: deferralTags.value },
    errors: [...runners.errors, ...nonChecks.errors, ...deferralTags.errors],
  };
}

// A path a step's command writes, from the target's folder: joined to the step's working directory, unless it is absolute.
const fromTarget = (path: string, workingDirectory: string | undefined): string =>
  workingDirectory === undefined || path.startsWith("/") ? path : `${workingDirectory}/${path}`;

// Where each runner's evidence reports are, before the configuration is checked: a long form's report, else every report
// a step running the runner names, else none, which the check names as not named.
export function reportsLocatedOf(
  settings: ConfigurationSettings,
  steps: readonly CiStep[],
  scripts: Readonly<Record<string, string>>,
  reportsNamed: ReportsNamed,
): ConfigurationSettings {
  const runners = settings.runners.flatMap((part): SettingPart<readonly [Layer, Runner]>[] => {
    if ("error" in part || part.taken[1].report !== undefined) return [part];
    const [layer, { name }] = part.taken;
    const reports = steps.flatMap(({ command, workingDirectory, environment = {} }) =>
      command === undefined ? [] : reportsNamed(command, name, scripts, environment).map(({ path, format }) => ({ path: fromTarget(path, workingDirectory), format })),
    );
    return reports.length === 0 ? [part] : reports.map((report) => ({ taken: [layer, { name, report }] }));
  });
  return { ...settings, runners };
}
