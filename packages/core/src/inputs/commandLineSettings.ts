import type { ConfigurationSettings, Layer, NonCheck, Runner, SettingPart } from "../domain/configuration.js";
import { EVIDENCE_REPORT_FORMATS } from "./evidenceReportFormats.js";

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

const FORMATS: readonly string[] = EVIDENCE_REPORT_FORMATS.map(({ kind }) => kind);

// A setting with nothing in it, or in a form balance does not read, is left out, named as written.
const wrongKind = (entry: string): SettingPart<never> => ({ error: { kind: "configuration-wrong-kind", entry } });

function nonCheckParsed(entry: string): SettingPart<NonCheck> {
  if (entry.trim() === "") return wrongKind(entry);
  const step = STEP_AS_WRITTEN.exec(entry);
  if (step === null) return { error: { kind: "not-checks-entry-not-a-step-name", entry } };
  return { taken: { entry, address: { workflow: step[1]!, job: step[2]!, step: step[3]! } } };
}

// A deferral tag is taken with or without its @, and without the spaces around it.
function deferralTagParsed(entry: string): SettingPart<string> {
  const trimmed = entry.trim();
  const tag = trimmed.startsWith("@") ? trimmed.slice(1) : trimmed;
  return tag === "" ? wrongKind(entry) : { taken: tag };
}

// A runner named alone, or in its long form with a runner, a format balance reads and a report.
function runnerParsed(named: string): Runner | undefined {
  const long = LONG_FORM.exec(named);
  if (long === null) return named.includes(":") || named.trim() === "" ? undefined : { name: named.trim() };
  const name = long[1]!.trim();
  const format = long[2]!;
  const path = long[3]!;
  return name === "" || path === "" || !FORMATS.includes(format) ? undefined : { name, report: { path, format } };
}

const runnerPart = (layer: Layer, named: string): SettingPart<readonly [Layer, Runner]> => {
  const runner = runnerParsed(named);
  return runner === undefined ? wrongKind(named) : { taken: [layer, runner] };
};

export const configurationSettingsNamed = ({ runners, nonChecks, deferralTags }: SettingsNamed): ConfigurationSettings => ({
  runners: Object.entries(runners).flatMap(([layer, named = []]) => named.map((runner) => runnerPart(layer as Layer, runner))),
  nonChecks: nonChecks.map(nonCheckParsed),
  deferralTags: deferralTags.map(deferralTagParsed),
});
