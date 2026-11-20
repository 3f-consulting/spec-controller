import { parse } from "yaml";
import type { Layer } from "../domain/configuration.js";
import type { SettingsNamed } from "./commandLineSettings.js";
import { isRecord } from "./shape.js";

// What a setting takes: a list of values, one value, or none, given or not.
export type SettingShape = "list" | "one" | "none";

// The layers a run names its runners for, each by a setting of its own.
const LAYERS = ["unit", "integration", "e2e", "performance"] as const satisfies readonly Layer[];

// balance's settings, by the names its command line uses, in the order its help lists them.
export const BALANCE_SETTINGS = [
  { name: "features", shape: "one" },
  ...LAYERS.map((name) => ({ name, shape: "list" }) as const),
  { name: "not-check", shape: "list" },
  { name: "deferral-tag", shape: "list" },
  { name: "ci", shape: "one" },
  { name: "ci-steps", shape: "list" },
  { name: "package-json", shape: "one" },
  { name: "target", shape: "one" },
  { name: "source-sha", shape: "one" },
  { name: "format", shape: "list" },
  { name: "strict", shape: "none" },
  { name: "exit-zero", shape: "none" },
  { name: "written-claims-only", shape: "none" },
] as const satisfies readonly { readonly name: string; readonly shape: SettingShape }[];

export type BalanceSettingName = (typeof BALANCE_SETTINGS)[number]["name"];

// The settings file's entries: each key as written, with its value as YAML reads it.
export type SettingsFileEntries = Readonly<Record<string, unknown>>;

// balance's settings by the names its command line uses: each value-taking setting's values in the order given, and
// each setting that takes no value, given.
export interface SettingsGiven {
  readonly values: Readonly<Partial<Record<BalanceSettingName, readonly string[]>>>;
  readonly on: readonly BalanceSettingName[];
}

export function settingsFileEntriesFrom(text: string): SettingsFileEntries {
  const read: unknown = parse(text);
  return isRecord(read) ? read : {};
}

const isText = (value: unknown): value is string => typeof value === "string";

// What an entry gives the setting it names, read in that setting's shape: its values, or true for a setting that takes none.
const TAKEN: Readonly<Record<SettingShape, (value: unknown) => readonly string[] | true | undefined>> = {
  list: (value) => (Array.isArray(value) && value.every(isText) ? value : undefined),
  one: (value) => (isText(value) ? [value] : undefined),
  none: (value) => (value === true ? true : undefined),
};

const NOTHING_GIVEN: SettingsGiven = { values: {}, on: [] };

// The settings the file's entries give, by the command line's names; a setting the command line gives replaces the file's.
export function settingsMerged(entries: SettingsFileEntries, commandLine: SettingsGiven = NOTHING_GIVEN): SettingsGiven {
  const taken = BALANCE_SETTINGS.flatMap(({ name, shape }) => {
    const value = TAKEN[shape](entries[name]);
    return value === undefined ? [] : [{ name, value }];
  });
  return {
    values: { ...Object.fromEntries(taken.flatMap(({ name, value }) => (value === true ? [] : [[name, value]]))), ...commandLine.values },
    on: [...new Set([...taken.flatMap(({ name, value }) => (value === true ? [name] : [])), ...commandLine.on])],
  };
}

// The configuration settings among the settings given: the runners of each layer, the non-checks and the deferral tags.
export const settingsNamedOf = ({ values }: SettingsGiven): SettingsNamed => ({
  runners: Object.fromEntries(LAYERS.map((layer) => [layer, values[layer] ?? []])),
  nonChecks: values["not-check"] ?? [],
  deferralTags: values["deferral-tag"] ?? [],
});
