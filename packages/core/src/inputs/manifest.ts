import {
  NO_SETTINGS,
  targetConfigurationOf,
  type ConfigurationError,
  type ConfigurationSettings,
  type Layer,
  type NonCheck,
  type Runner,
  type RunnerEntry,
  type SettingPart,
  type TargetConfiguration,
} from "../domain/configuration.js";
import type { CiStep } from "../domain/workflowSteps.js";
import { isRecord, whereShapeBreaks } from "./shape.js";

// Each setting's key, as the specController block writes it.
const KEY_OF: Readonly<Record<keyof TargetConfiguration, string>> = { runners: "runners", nonChecks: "notChecks", deferralTags: "deferralTags" };

const LAYERS: readonly string[] = Object.keys({ unit: null, integration: null, e2e: null, performance: null } satisfies Record<Layer, null>);

// A step as notChecks writes it: its workflow, which ends .yml or .yaml and may hold a colon, its job, and its step.
const STEP_AS_WRITTEN = /^(.+?\.ya?ml):([^:]+):(.+)$/;

const wrongKind = (entry: string): ConfigurationError => ({ kind: "configuration-wrong-kind", entry });

const isRunnerEntry = (runner: unknown): runner is RunnerEntry =>
  isRecord(runner) && typeof runner.runner === "string" && Array.isArray(runner.reports) && runner.reports.every((report) => typeof report === "string");

const isRunner = (runner: unknown): runner is Runner => typeof runner === "string" || runner === null || isRunnerEntry(runner);

function runnersParsed(runners: unknown, name: string): SettingPart<readonly [Layer, Runner]>[] {
  if (runners === undefined) return [];
  if (!isRecord(runners)) return [{ error: wrongKind(name) }];
  return Object.entries(runners).map(([layer, runner]): SettingPart<readonly [Layer, Runner]> => {
    if (!LAYERS.includes(layer)) return { error: { kind: "runner-key-not-a-layer", entry: `${name}.${layer}` } };
    return isRunner(runner) ? { taken: [layer as Layer, runner] } : { error: wrongKind(`${name}.${layer}`) };
  });
}

// A list setting: each text entry taken, or an error naming the entry; anything but a list is the wrong kind.
function listParsed<Value>(list: unknown, name: string, take: (entry: string) => SettingPart<Value>): SettingPart<Value>[] {
  if (list === undefined) return [];
  if (!Array.isArray(list)) return [{ error: wrongKind(name) }];
  return list.map((entry: unknown, at) => (typeof entry === "string" ? take(entry) : { error: wrongKind(`${name}[${at}]`) }));
}

// A non-check names a step by its workflow, job and step.
function nonCheckParsed(entry: string): SettingPart<NonCheck> {
  const step = STEP_AS_WRITTEN.exec(entry);
  if (step === null) return { error: { kind: "not-checks-entry-not-a-step-name", entry } };
  return { taken: { entry, address: { workflow: step[1]!, job: step[2]!, step: step[3]! } } };
}

// A deferral tag is taken with or without its @, and without the spaces around it.
function deferralTagParsed(entry: string): SettingPart<string> {
  const tag = entry.trim();
  return { taken: tag.startsWith("@") ? tag.slice(1) : tag };
}

// Each setting is read under the key it is written under, and named by it.
function settingsParsed(block: unknown): ConfigurationSettings {
  if (block === undefined) return NO_SETTINGS;
  const settings = block as Readonly<Record<string, unknown>>;
  const known = Object.values(KEY_OF);
  return {
    runners: runnersParsed(settings[KEY_OF.runners], KEY_OF.runners),
    nonChecks: listParsed(settings[KEY_OF.nonChecks], KEY_OF.nonChecks, nonCheckParsed),
    deferralTags: listParsed(settings[KEY_OF.deferralTags], KEY_OF.deferralTags, deferralTagParsed),
    unknownKeys: Object.keys(settings).flatMap((key): ConfigurationError[] => (known.includes(key) ? [] : [{ kind: "configuration-unknown-key", entry: key }])),
  };
}

// A manifest is a record of fields, its specController block, when it has one, a record too; what each other field
// holds is its own reader's to say.
export const whereManifestBreaks = (manifest: unknown): string | undefined =>
  whereShapeBreaks(manifest, { fields: { specController: { fields: {} } }, optional: ["specController"] });

export function targetConfigurationFrom(
  manifest: unknown,
  steps: readonly CiStep[],
  reportsRead: readonly string[],
): { readonly configuration: TargetConfiguration; readonly errors: readonly ConfigurationError[] } {
  return targetConfigurationOf(settingsParsed(isRecord(manifest) ? manifest.specController : undefined), steps, reportsRead);
}

// The scripts a manifest names, each as the command it runs.
export function scriptsFrom(manifest: unknown): Readonly<Record<string, string>> {
  const scripts = isRecord(manifest) ? manifest.scripts : undefined;
  return isRecord(scripts) ? Object.fromEntries(Object.entries(scripts).filter((entry): entry is [string, string] => typeof entry[1] === "string")) : {};
}
