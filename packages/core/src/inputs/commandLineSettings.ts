import type { ConfigurationSettings, Layer, NonCheck, Runner, SettingPart } from "../domain/configuration.js";

// The configuration settings a run names on its command line, each as given.
export interface SettingsNamed {
  readonly runners: Readonly<Partial<Record<Layer, readonly string[]>>>;
  readonly nonChecks: readonly string[];
  readonly deferralTags: readonly string[];
}

// A step as a non-check writes it: its workflow, which ends .yml or .yaml and may hold a colon, its job, and its step.
const STEP_AS_WRITTEN = /^(.+?\.ya?ml):([^:]+):(.+)$/;

// A runner's long form, <runner>:<format>:<report>, splits at its first two colons, so its report's path may hold one.
const LONG_FORM = /^([^:]*):([^:]*):(.*)$/s;

export function nonCheckParsed(entry: string): SettingPart<NonCheck> {
  const step = STEP_AS_WRITTEN.exec(entry);
  if (step === null) return { error: { kind: "not-checks-entry-not-a-step-name", entry } };
  return { taken: { entry, address: { workflow: step[1]!, job: step[2]!, step: step[3]! } } };
}

// A deferral tag is taken with or without its @, and without the spaces around it.
export function deferralTagParsed(entry: string): SettingPart<string> {
  const tag = entry.trim();
  return { taken: tag.startsWith("@") ? tag.slice(1) : tag };
}

function runnerParsed(named: string): Runner {
  const long = LONG_FORM.exec(named);
  return long === null ? { name: named.trim() } : { name: long[1]!.trim(), report: { path: long[3]!, format: long[2]! } };
}

export const configurationSettingsNamed = ({ runners, nonChecks, deferralTags }: SettingsNamed): ConfigurationSettings => ({
  runners: Object.entries(runners).flatMap(([layer, named = []]) => named.map((runner) => ({ taken: [layer as Layer, runnerParsed(runner)] as const }))),
  nonChecks: nonChecks.map(nonCheckParsed),
  deferralTags: deferralTags.map(deferralTagParsed),
  unknownKeys: [],
});
