import { targetConfigurationOf, type ConfigurationError, type SettingSpellings, type TargetConfiguration } from "../domain/configuration.js";
import type { WorkflowStepAsWritten } from "../domain/workflowSteps.js";
import { isRecord, whereShapeBreaks } from "./shape.js";

// A step as notChecks writes it: its workflow, which ends .yml and may hold a colon, its job, and its step.
const STEP_AS_WRITTEN = /^(.+?\.yml):([^:]+):(.+)$/;

const settingSpellings: SettingSpellings = {
  keyOf: { runners: "runners", nonChecks: "notChecks", deferralTags: "deferralTags" },
  stepAddressOf: (entry) => {
    const step = STEP_AS_WRITTEN.exec(entry);
    return step === null ? undefined : { workflow: step[1]!, job: step[2]!, step: step[3]! };
  },
  tagOf: (entry) => {
    const tag = entry.trim();
    return tag.startsWith("@") ? tag.slice(1) : tag;
  },
};

// A manifest is a record of fields, its specController block, if it has one, a record of settings; what each setting
// holds is its own reader's to say.
export const whereManifestBreaks = (manifest: unknown): string | undefined =>
  whereShapeBreaks(manifest, { fields: { specController: { fields: {} } }, optional: ["specController"] });

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
