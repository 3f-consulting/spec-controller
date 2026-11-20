import { settingsMerged, type SettingsFileEntries } from "@3f-consulting/spec-controller-core";
import { dirname, resolve } from "node:path";
import { inputsReadFor } from "../inputs/inputsRead.js";
import type { Refusal } from "../runEnding/runEnding.js";
import { balanceRequestOf, type BalanceRequest } from "../runRequest/runRequest.js";

// What comes before the path in each setting that names one, and the path: the whole value, a runner's long form's report
// after its second colon, or a format's file after its first.
const WHOLE = /^()(.+)$/s;
const LONG_FORM = /^([^:]*:[^:]*:)(.+)$/s;
const PATH_IN = new Map<string, RegExp>([
  ["features", WHOLE],
  ["ci", WHOLE],
  ["ci-steps", WHOLE],
  ["package-json", WHOLE],
  ["unit", LONG_FORM],
  ["integration", LONG_FORM],
  ["e2e", LONG_FORM],
  ["performance", LONG_FORM],
  ["format", /^([^:]*:)(.+)$/s],
]);

// Each path the settings file names, read from the file's folder; a value of a shape no setting takes is left as written.
function pathsFromFolder(entries: SettingsFileEntries, folder: string): SettingsFileEntries {
  const joined = (path: RegExp) => (value: unknown) => (typeof value === "string" ? value.replace(path, (_all, before: string, after: string) => `${before}${resolve(folder, after)}`) : value);
  return Object.fromEntries(
    Object.entries(entries).map(([key, value]) => {
      const path = PATH_IN.get(key);
      if (path === undefined) return [key, value];
      return [key, Array.isArray(value) ? value.map(joined(path)) : joined(path)(value)];
    }),
  );
}

// The run with the settings file it names read first, since the file names inputs: its settings beside the command
// line's, which replace any of the same name. A settings file that cannot be read is refused, as any input is.
export function withSettingsFile(request: BalanceRequest, folder: string): BalanceRequest | { readonly refusals: readonly Refusal[] } {
  const file = request.inputs.find(({ kind }) => kind === "settingsFile");
  if (file === undefined) return request;
  const read = inputsReadFor([file], folder);
  if ("refusals" in read) return read;
  const { settings, errors } = settingsMerged(pathsFromFolder(read.settingsFile ?? {}, resolve(folder, dirname(file.path))), request.given);
  const merged = balanceRequestOf(settings);
  return "refusals" in merged ? merged : { ...merged, settingsFileErrors: errors };
}
