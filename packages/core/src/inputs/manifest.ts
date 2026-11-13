import { targetConfigurationOf, type ConfigurationError, type SettingSpellings, type TargetConfiguration } from "../domain/configuration.js";
import type { WorkflowStepAsWritten } from "../domain/workflowSteps.js";

// A step as notChecks writes it: its workflow, which ends .yml or .yaml and may hold a colon, its job, and its step.
const STEP_AS_WRITTEN = /^(.+?\.ya?ml):([^:]+):(.+)$/;

const settingSpellings: SettingSpellings = {
  keyOf: { runners: "runners", nonChecks: "notChecks", deferralTags: "deferralTags" },
  stepAddressOf: (entry) => {
    const step = STEP_AS_WRITTEN.exec(entry);
    return step === null ? undefined : { workflow: step[1]!, job: step[2]!, step: step[3]! };
  },
  tagOf: (entry) => entry.trim().replace(/^@/, ""),
};

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> => typeof value === "object" && value !== null && !Array.isArray(value);

export function targetConfigurationFrom(
  manifest: unknown,
  steps: readonly WorkflowStepAsWritten[],
): { readonly configuration: TargetConfiguration; readonly errors: readonly ConfigurationError[] } {
  return targetConfigurationOf(isRecord(manifest) ? manifest.specController : undefined, steps, settingSpellings);
}

// The scripts a manifest names, each as the command it runs.
export function scriptsFrom(manifest: unknown): Readonly<Record<string, string>> {
  const scripts = isRecord(manifest) ? manifest.scripts : undefined;
  return isRecord(scripts) ? Object.fromEntries(Object.entries(scripts).filter((entry): entry is [string, string] => typeof entry[1] === "string")) : {};
}
