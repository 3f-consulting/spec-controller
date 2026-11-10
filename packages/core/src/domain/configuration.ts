import type { ConfigurationError } from "./evidenceReconciliation.js";
import type { QualityCheckKind } from "./postEvidenceObligation.js";
import type { PipelineStep } from "./postEvidenceObservation.js";

type Layer = Exclude<QualityCheckKind, "fitness">;

interface NonCheck {
  readonly workflow: string;
  readonly job: string;
  readonly step: string;
}

export interface TargetConfiguration {
  readonly runners: Readonly<Partial<Record<Layer, string | null>>>;
  readonly nonChecks: readonly NonCheck[];
  readonly deferralTags: readonly string[];
}

export interface ConfigurationRead {
  readonly configuration: TargetConfiguration;
  readonly errors: readonly ConfigurationError[];
}

type Setting = "runners" | "nonChecks" | "deferralTags";

// How the target spells the block and each of its settings, so an error names the setting as written.
export interface SettingNames {
  readonly block: string;
  readonly settings: Readonly<Record<string, Setting>>;
}

const LAYERS: readonly Layer[] = ["unit", "integration", "e2e", "performance"];

const NOTHING_READ: TargetConfiguration = { runners: {}, nonChecks: [], deferralTags: [] };

const isBlock = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isLayer = (key: string): key is Layer => (LAYERS as readonly string[]).includes(key);

const isRunner = (runner: unknown): runner is string | null => typeof runner === "string" || runner === null;

const wrongKind = (entry: string): ConfigurationError => ({ kind: "configuration-wrong-kind", entry });

function runnersIn(value: unknown, written: string, errors: ConfigurationError[]): TargetConfiguration["runners"] {
  if (value === undefined) return {};
  if (!isBlock(value)) return errors.push(wrongKind(written)), {};
  const runners: Partial<Record<Layer, string | null>> = {};
  for (const [key, runner] of Object.entries(value)) {
    if (!isLayer(key)) errors.push({ kind: "runner-key-not-a-layer", entry: `${written}.${key}` });
    else if (isRunner(runner)) runners[key] = runner;
    else errors.push(wrongKind(`${written}.${key}`));
  }
  return runners;
}

function stringsIn(value: unknown, setting: string, errors: ConfigurationError[]): string[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) return errors.push(wrongKind(setting)), [];
  return value.flatMap((entry: unknown, at) => (typeof entry === "string" ? [entry] : (errors.push(wrongKind(`${setting}[${at}]`)), [])));
}

// A workflow's file name may hold a colon, so the job and step are split off from the right.
function nonCheckOf(entry: string): NonCheck | undefined {
  const beforeStep = entry.lastIndexOf(":");
  const beforeJob = entry.lastIndexOf(":", beforeStep - 1);
  if (beforeJob <= 0) return undefined;
  return { workflow: entry.slice(0, beforeJob), job: entry.slice(beforeJob + 1, beforeStep), step: entry.slice(beforeStep + 1) };
}

function nonChecksIn(entries: readonly string[], stepsRead: readonly PipelineStep[], errors: ConfigurationError[]): NonCheck[] {
  return entries.flatMap((entry) => {
    const nonCheck = nonCheckOf(entry);
    if (nonCheck === undefined) return errors.push({ kind: "not-checks-entry-not-a-step-name", entry }), [];
    const { workflow, job, step } = nonCheck;
    const inWorkflow = stepsRead.filter((read) => read.workflow === workflow);
    if (inWorkflow.length > 0 && !inWorkflow.some((read) => read.job === job && read.identity === step)) {
      return errors.push({ kind: "not-checks-entry-matches-no-step", entry }), [];
    }
    return [nonCheck];
  });
}

export function targetConfigurationOf(block: unknown, names: SettingNames, stepsRead: readonly PipelineStep[]): ConfigurationRead {
  if (block === undefined) return { configuration: NOTHING_READ, errors: [] };
  if (!isBlock(block)) return { configuration: NOTHING_READ, errors: [wrongKind(names.block)] };
  const errors: ConfigurationError[] = [];
  const read: Partial<Record<Setting, { readonly written: string; readonly value: unknown }>> = {};
  for (const [written, value] of Object.entries(block)) {
    const setting = names.settings[written];
    if (setting === undefined) errors.push({ kind: "configuration-unknown-key", entry: written });
    else read[setting] = { written, value };
  }
  const { runners, nonChecks, deferralTags } = read;
  const configuration = {
    runners: runnersIn(runners?.value, runners?.written ?? "", errors),
    nonChecks: nonChecksIn(stringsIn(nonChecks?.value, nonChecks?.written ?? "", errors), stepsRead, errors),
    deferralTags: stringsIn(deferralTags?.value, deferralTags?.written ?? "", errors),
  };
  return { configuration, errors };
}
