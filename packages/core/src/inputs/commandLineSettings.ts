import { NO_SETTINGS, type ConfigurationSettings, type Layer } from "../domain/configuration.js";

// The configuration settings a run names on its command line, each as given: each layer's runners, the non-checks and the
// deferral tags.
export interface SettingsNamed {
  readonly runners: Readonly<Partial<Record<Layer, readonly string[]>>>;
  readonly nonChecks: readonly string[];
  readonly deferralTags: readonly string[];
}

export const configurationSettingsNamed = (_named: SettingsNamed): ConfigurationSettings => NO_SETTINGS;
