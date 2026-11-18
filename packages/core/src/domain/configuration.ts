import type { QualityCheckKind } from "./postEvidenceObligation.js";
import { stepIdentityOf, type WorkflowStepAsWritten } from "./workflowSteps.js";

type Layer = Exclude<QualityCheckKind, "fitness">;

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

// null under runners: the target has no runner for that kind.
export interface TargetConfiguration {
  readonly runners: Readonly<Partial<Record<Layer, string | null | RunnerEntry>>>;
  readonly nonChecks: readonly StepAddress[];
  readonly deferralTags: readonly string[];
}

// entry is the setting as written, such as runners.unit or deferralTags[0].
export interface ConfigurationError {
  readonly kind:
    | "configuration-wrong-kind"
    | "configuration-unknown-key"
    | "runner-key-not-a-layer"
    | "not-checks-entry-matches-no-step"
    | "not-checks-entry-not-a-step-name";
  readonly entry: string;
}

// The settings reader's answers, handed to the domain: the key each setting is written under, the step a non-check as
// written names, and a deferral tag as written.
export interface SettingSpellings {
  readonly keyOf: Readonly<Record<keyof TargetConfiguration, string>>;
  readonly stepAddressOf: (entry: string) => StepAddress | undefined;
  readonly tagOf: (entry: string) => string;
}

const LAYERS: readonly string[] = Object.keys({ unit: null, integration: null, e2e: null, performance: null } satisfies Record<Layer, null>);

const NO_SETTING: TargetConfiguration = { runners: {}, nonChecks: [], deferralTags: [] };

// A setting as read: what of it can be used, and an error for each part left out.
interface Read<Value> {
  readonly value: Value;
  readonly errors: readonly ConfigurationError[];
}

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> => typeof value === "object" && value !== null && !Array.isArray(value);

const wrongKind = (entry: string): ConfigurationError => ({ kind: "configuration-wrong-kind", entry });

const isRunnerEntry = (runner: unknown): runner is RunnerEntry =>
  isRecord(runner) && typeof runner.runner === "string" && Array.isArray(runner.reports) && runner.reports.every((report) => typeof report === "string");

// A layer's runner: its name, null for none, or an entry naming it with the reports it writes.
const isRunner = (runner: unknown): runner is TargetConfiguration["runners"][Layer] => typeof runner === "string" || runner === null || isRunnerEntry(runner);

function runnersRead(runners: unknown, name: string): Read<TargetConfiguration["runners"]> {
  if (runners === undefined) return { value: {}, errors: [] };
  if (!isRecord(runners)) return { value: {}, errors: [wrongKind(name)] };
  const entries = Object.entries(runners);
  const errors = entries.flatMap(([layer, runner]): ConfigurationError[] => {
    if (!LAYERS.includes(layer)) return [{ kind: "runner-key-not-a-layer", entry: `${name}.${layer}` }];
    return isRunner(runner) ? [] : [wrongKind(`${name}.${layer}`)];
  });
  return { value: Object.fromEntries(entries.filter(([layer, runner]) => LAYERS.includes(layer) && isRunner(runner))), errors };
}

// The name of the program a layer's runner runs, when it has one.
export const runnerNameOf = (runner: TargetConfiguration["runners"][Layer]): string | undefined => (isRunnerEntry(runner) ? runner.runner : (runner ?? undefined));

// A list setting: each text entry read, or an error naming the entry; anything but a list is the wrong kind.
function listRead<Value>(list: unknown, name: string, readEntry: (entry: string) => Value | ConfigurationError): Read<Value[]> {
  if (list === undefined) return { value: [], errors: [] };
  if (!Array.isArray(list)) return { value: [], errors: [wrongKind(name)] };
  const read = list.map((entry: unknown, at) => (typeof entry === "string" ? readEntry(entry) : wrongKind(`${name}[${at}]`)));
  const isError = (entry: Value | ConfigurationError): entry is ConfigurationError => entry instanceof Object && "kind" in entry;
  return { value: read.filter((entry): entry is Value => !isError(entry)), errors: read.filter(isError) };
}

// A non-check names a step; one in a workflow that was read must be a step in it.
function nonCheckOf(entry: string, steps: readonly WorkflowStepAsWritten[], { stepAddressOf }: SettingSpellings): StepAddress | ConfigurationError {
  const address = stepAddressOf(entry);
  if (address === undefined) return { kind: "not-checks-entry-not-a-step-name", entry };
  const inItsWorkflow = steps.filter(({ workflow }) => workflow === address.workflow);
  const named = inItsWorkflow.some((step) => step.job === address.job && stepIdentityOf(step) === address.step);
  return inItsWorkflow.length === 0 || named ? address : { kind: "not-checks-entry-matches-no-step", entry };
}

// Each setting is read under the key it is written under, and named by it.
export function targetConfigurationOf(
  block: unknown,
  steps: readonly WorkflowStepAsWritten[],
  spellings: SettingSpellings,
): { readonly configuration: TargetConfiguration; readonly errors: readonly ConfigurationError[] } {
  if (block === undefined) return { configuration: NO_SETTING, errors: [] };
  const settings = block as Readonly<Record<string, unknown>>;
  const { keyOf } = spellings;
  const runners = runnersRead(settings[keyOf.runners], keyOf.runners);
  const nonChecks = listRead(settings[keyOf.nonChecks], keyOf.nonChecks, (entry) => nonCheckOf(entry, steps, spellings));
  const deferralTags = listRead(settings[keyOf.deferralTags], keyOf.deferralTags, spellings.tagOf);
  const known = Object.values(keyOf);
  const unknownKeys = Object.keys(settings).flatMap((key): ConfigurationError[] => (known.includes(key) ? [] : [{ kind: "configuration-unknown-key", entry: key }]));
  return {
    configuration: { runners: runners.value, nonChecks: nonChecks.value, deferralTags: deferralTags.value },
    errors: [...runners.errors, ...nonChecks.errors, ...deferralTags.errors, ...unknownKeys],
  };
}
