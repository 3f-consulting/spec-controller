import type { SettingsNamed } from "./commandLineSettings.js";

// The settings file's entries: each key as written, with its value as YAML reads it.
export type SettingsFileEntries = Readonly<Record<string, unknown>>;

// balance's settings by the names its command line uses: each value-taking setting's values in the order given, and
// each setting that takes no value, given.
export interface SettingsGiven {
  readonly values: Readonly<Record<string, readonly string[]>>;
  readonly on: readonly string[];
}

export const settingsFileEntriesFrom = (_text: string): SettingsFileEntries => ({});

export const settingsMerged = (_entries: SettingsFileEntries): SettingsGiven => ({ values: {}, on: [] });

export const settingsNamedOf = (_given: SettingsGiven): SettingsNamed => ({ runners: {}, nonChecks: [], deferralTags: [] });
