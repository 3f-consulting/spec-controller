import type { QualityCheckKind } from "./postEvidenceObligation.js";
import { stepIdentityOf, type WorkflowStepAsWritten } from "./workflowSteps.js";

export type Layer = Exclude<QualityCheckKind, "fitness">;

// A step named in notChecks: its workflow, job and step name.
export interface StepAddress {
  readonly workflow: string;
  readonly job: string;
  readonly step: string;
}

// null under runners: the target has no runner for that kind.
export interface TargetConfiguration {
  readonly runners: Readonly<Partial<Record<Layer, string | null>>>;
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

// What the target's settings file holds, as written: its block of settings, absent when there is none, and its scripts.
export interface TargetSettingsAsWritten {
  readonly settingsBlock?: unknown;
  readonly scripts: Readonly<Record<string, string>>;
}

// The settings reader's answers, handed to the domain: the key each setting is written under, the step a non-check as
// written names, and a deferral tag as written.
export interface SettingSpellings {
  readonly keyOf: Readonly<Record<keyof TargetConfiguration, string>>;
  readonly stepAddressOf: (entry: string) => StepAddress | undefined;
  readonly tagOf: (entry: string) => string;
}

const LAYERS: readonly string[] = Object.keys({ unit: true, integration: true, e2e: true, performance: true } satisfies Record<Layer, true>);

const NO_SETTING: TargetConfiguration = { runners: {}, nonChecks: [], deferralTags: [] };

// A setting as read: what of it can be used, and an error for each part left out.
interface Read<Value> {
  readonly value: Value;
  readonly errors: readonly ConfigurationError[];
}

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> => typeof value === "object" && value !== null && !Array.isArray(value);

const wrongKind = (entry: string): ConfigurationError => ({ kind: "configuration-wrong-kind", entry });

function runnersRead(runners: unknown, name: string): Read<TargetConfiguration["runners"]> {
  if (runners === undefined) return { value: {}, errors: [] };
  if (!isRecord(runners)) return { value: {}, errors: [wrongKind(name)] };
  const entries = Object.entries(runners);
  const errors = entries.flatMap(([layer, runner]): ConfigurationError[] => {
    if (!LAYERS.includes(layer)) return [{ kind: "runner-key-not-a-layer", entry: `${name}.${layer}` }];
    return typeof runner === "string" || runner === null ? [] : [wrongKind(`${name}.${layer}`)];
  });
  return { value: Object.fromEntries(entries.filter(([layer, runner]) => LAYERS.includes(layer) && (typeof runner === "string" || runner === null))), errors };
}

// A list setting: each text entry read, or an error naming the entry; anything but a list is the wrong kind.
function listRead<Value>(list: unknown, name: string, readEntry: (entry: string) => Value | ConfigurationError): Read<Value[]> {
  if (list === undefined) return { value: [], errors: [] };
  if (!Array.isArray(list)) return { value: [], errors: [wrongKind(name)] };
  const read = list.map((entry: unknown, at) => (typeof entry === "string" ? readEntry(entry) : wrongKind(`${name}[${at}]`)));
  const isError = (entry: Value | ConfigurationError): entry is ConfigurationError => typeof entry === "object" && entry !== null && "kind" in entry;
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

// Each setting is read under the key it is written under, and named by it; a block broken as a whole, such as null, is
// no setting at all and throws.
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
