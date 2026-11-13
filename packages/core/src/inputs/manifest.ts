import { targetConfigurationOf, type ConfigurationError, type SettingSpellings, type TargetConfiguration } from "../domain/configuration.js";
import type { WorkflowStepAsWritten } from "../domain/workflowSteps.js";
import { isRecord, whereShapeBreaks, type Shape } from "./shape.js";

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

// A manifest's specController block, where it has one, is an object of settings.
const WITH_ITS_SETTINGS: Shape = { fields: { specController: { fields: {} } }, optional: ["specController"] };

// A manifest is a record of fields; what each holds is its own reader's to say.
export const whereManifestBreaks = (manifest: unknown): string | undefined => whereShapeBreaks(manifest, { fields: {} });

export function targetConfigurationFrom(
  manifest: unknown,
  steps: readonly WorkflowStepAsWritten[],
): { readonly configuration: TargetConfiguration; readonly errors: readonly ConfigurationError[] } {
  const block = isRecord(manifest) ? manifest.specController : undefined;
  // A block that is not an object is no setting at all, and stops the run, naming where the manifest breaks.
  const breaks = whereShapeBreaks({ specController: block }, WITH_ITS_SETTINGS);
  if (breaks !== undefined) throw new TypeError(breaks);
  return targetConfigurationOf(block, steps, settingSpellings);
}

// The scripts a manifest names, each as the command it runs.
export function scriptsFrom(manifest: unknown): Readonly<Record<string, string>> {
  const scripts = isRecord(manifest) ? manifest.scripts : undefined;
  return isRecord(scripts) ? Object.fromEntries(Object.entries(scripts).filter((entry): entry is [string, string] => typeof entry[1] === "string")) : {};
}
