import type { ConfigurationError } from "./evidenceReconciliation.js";
import type { QualityCheckKind } from "./postEvidenceObligation.js";
import type { PipelineStep } from "./postEvidenceObservation.js";

type Layer = Exclude<QualityCheckKind, "fitness">;

export interface NotCheck {
  readonly workflow: string;
  readonly job: string;
  readonly step: string;
}

export interface TargetConfiguration {
  readonly runners: Readonly<Partial<Record<Layer, string | null>>>;
  readonly notChecks: readonly NotCheck[];
  readonly deferralTags: readonly string[];
}

export interface ConfigurationRead {
  readonly configuration: TargetConfiguration;
  readonly errors: readonly ConfigurationError[];
}

const isBlock = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const stringsIn = (value: unknown): string[] => (Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : []);

// A workflow's file name may hold a colon, so the job and step are split off from the right.
function notCheckOf(entry: string): NotCheck {
  const beforeStep = entry.lastIndexOf(":");
  const beforeJob = entry.lastIndexOf(":", beforeStep - 1);
  return { workflow: entry.slice(0, beforeJob), job: entry.slice(beforeJob + 1, beforeStep), step: entry.slice(beforeStep + 1) };
}

export function targetConfigurationOf(block: unknown, _stepsRead: readonly PipelineStep[]): ConfigurationRead {
  if (!isBlock(block)) return { configuration: { runners: {}, notChecks: [], deferralTags: [] }, errors: [] };
  const runners = isBlock(block.runners) ? (block.runners as TargetConfiguration["runners"]) : {};
  return {
    configuration: { runners, notChecks: stringsIn(block.notChecks).map(notCheckOf), deferralTags: stringsIn(block.deferralTags) },
    errors: [],
  };
}
