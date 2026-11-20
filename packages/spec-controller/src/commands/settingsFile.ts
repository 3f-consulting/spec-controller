import { settingsMerged, type SettingsFileEntries } from "@3f-consulting/spec-controller-core";
import { dirname, join, relative, resolve } from "node:path";
import { inputsReadFor } from "../inputs/inputsRead.js";
import { gitIn } from "../repository/git.js";
import type { Refusal } from "../runEnding/runEnding.js";
import { balanceRequestOf, type BalanceRequest, type InputRequest } from "../runRequest/runRequest.js";

// What comes before the path in each setting that names one, and the path: the whole value, a runner's long form's report
// after its second colon, or a format's file after its first.
const WHOLE = /()(.+)/s;
const LONG_FORM = /([^:]*:[^:]*:)(.+)/s;
const PATH_IN = new Map<string, RegExp>([
  ["features", WHOLE],
  ["ci", WHOLE],
  ["ci-steps", WHOLE],
  ["package-json", WHOLE],
  ["unit", LONG_FORM],
  ["integration", LONG_FORM],
  ["e2e", LONG_FORM],
  ["performance", LONG_FORM],
  ["format", /([^:]*:)(.+)/s],
]);

// Each path the settings file names, read from its folder: an input's written from the folder balance runs in, a report's
// file in full. A value of a shape no setting takes is left as written.
function pathsFromFolder(entries: SettingsFileEntries, folder: string, ranIn: string): SettingsFileEntries {
  const joined = (path: RegExp, written: (full: string) => string) => (value: unknown) =>
    typeof value === "string" ? value.replace(path, (_all, before: string, after: string) => `${before}${written(resolve(folder, after))}`) : value;
  const fromRunFolder = (full: string): string => relative(ranIn, full) || ".";
  return Object.fromEntries(
    Object.entries(entries).map(([key, value]) => {
      const path = PATH_IN.get(key);
      if (path === undefined) return [key, value];
      const each = joined(path, key === "format" ? (full) => full : fromRunFolder);
      return [key, Array.isArray(value) ? value.map(each) : each(value)];
    }),
  );
}

// The settings file the run names, or else spec-controller.yml at the top of the git repository it runs in, or in the
// folder it runs in outside git. A default that does not exist is no settings file.
function settingsFileOf({ inputs }: BalanceRequest, folder: string): InputRequest {
  const named = inputs.find(({ kind }) => kind === "settingsFile");
  if (named !== undefined) return named;
  const { status, stdout } = gitIn(folder, ["rev-parse", "--show-toplevel"]);
  return { kind: "settingsFile", path: join(status === 0 ? stdout.trim() : folder, "spec-controller.yml"), byDefault: true };
}

// The run with the settings file it names read first, since the file names inputs: its settings beside the command
// line's, which replace any of the same name. A settings file that cannot be read is refused, as any input is.
export function withSettingsFile(request: BalanceRequest, folder: string): BalanceRequest | { readonly refusals: readonly Refusal[] } {
  const file = settingsFileOf(request, folder);
  const read = inputsReadFor([file], folder);
  if ("refusals" in read) return read;
  const { settings, errors } = settingsMerged(pathsFromFolder(read.settingsFile ?? {}, resolve(folder, dirname(file.path)), folder), request.given);
  const merged = balanceRequestOf(settings);
  if ("refusals" in merged) return merged;
  const named = merged.inputs.some(({ kind }) => kind === "settingsFile");
  return { ...merged, inputs: named || read.settingsFile === undefined ? merged.inputs : [...merged.inputs, file], settingsFileErrors: errors };
}
