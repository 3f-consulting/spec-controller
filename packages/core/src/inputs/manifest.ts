import {
  NO_SETTINGS,
  targetConfigurationOf,
  type ConfigurationError,
  type ConfigurationSettings,
  type Layer,
  type Runner,
  type RunnerEntry,
  type SettingPart,
  type TargetConfiguration,
} from "../domain/configuration.js";
import type { CiStep } from "../domain/workflowSteps.js";
import { deferralTagParsed, nonCheckParsed } from "./commandLineSettings.js";
import { isRecord, whereShapeBreaks } from "./shape.js";

// Each setting's key, as the specController block writes it.
const KEY_OF: Readonly<Record<keyof TargetConfiguration, string>> = { runners: "runners", nonChecks: "notChecks", deferralTags: "deferralTags" };

const LAYERS: readonly string[] = Object.keys({ unit: null, integration: null, e2e: null, performance: null } satisfies Record<Layer, null>);

const wrongKind = (entry: string): ConfigurationError => ({ kind: "configuration-wrong-kind", entry });

const isRunnerEntry = (runner: unknown): runner is RunnerEntry =>
  isRecord(runner) && typeof runner.runner === "string" && Array.isArray(runner.reports) && runner.reports.every((report) => typeof report === "string");

// A layer's runner as the block writes it: its name, null for none, or an entry naming it with the reports it writes.
type RunnerWritten = string | null | RunnerEntry;

const isRunner = (runner: unknown): runner is RunnerWritten => typeof runner === "string" || runner === null || isRunnerEntry(runner);

// A runner the block names reads only the reports its entry names, so a runner named alone reads none.
const runnerOf = (runner: string | RunnerEntry): Runner => (typeof runner === "string" ? { name: runner, reports: [] } : { name: runner.runner, reports: runner.reports });

function runnersParsed(runners: unknown, name: string): SettingPart<readonly [Layer, Runner]>[] {
  if (runners === undefined) return [];
  if (!isRecord(runners)) return [{ error: wrongKind(name) }];
  return Object.entries(runners).flatMap(([layer, runner]): SettingPart<readonly [Layer, Runner]>[] => {
    if (!LAYERS.includes(layer)) return [{ error: { kind: "runner-key-not-a-layer", entry: `${name}.${layer}` } }];
    if (!isRunner(runner)) return [{ error: wrongKind(`${name}.${layer}`) }];
    return runner === null ? [] : [{ taken: [layer as Layer, runnerOf(runner)] }];
  });
}

// A list setting: each text entry taken, or an error naming the entry; anything but a list is the wrong kind.
function listParsed<Value>(list: unknown, name: string, take: (entry: string) => SettingPart<Value>): SettingPart<Value>[] {
  if (list === undefined) return [];
  if (!Array.isArray(list)) return [{ error: wrongKind(name) }];
  return list.map((entry: unknown, at) => (typeof entry === "string" ? take(entry) : { error: wrongKind(`${name}[${at}]`) }));
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

// The settings a manifest's specController block writes, as parsed, before they are checked against the steps and reports.
export const configurationSettingsFrom = (manifest: unknown): ConfigurationSettings => settingsParsed(isRecord(manifest) ? manifest.specController : undefined);

export function targetConfigurationFrom(
  manifest: unknown,
  steps: readonly CiStep[],
  reportsRead: readonly string[],
): { readonly configuration: TargetConfiguration; readonly errors: readonly ConfigurationError[] } {
  return targetConfigurationOf(configurationSettingsFrom(manifest), steps, reportsRead);
}

// The scripts a manifest names, each as the command it runs.
export function scriptsFrom(manifest: unknown): Readonly<Record<string, string>> {
  const scripts = isRecord(manifest) ? manifest.scripts : undefined;
  return isRecord(scripts) ? Object.fromEntries(Object.entries(scripts).filter((entry): entry is [string, string] => typeof entry[1] === "string")) : {};
}
