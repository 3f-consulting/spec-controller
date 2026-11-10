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

export function targetConfigurationOf(_block: unknown, _stepsRead: readonly PipelineStep[]): ConfigurationRead {
  return { configuration: { runners: {}, notChecks: [], deferralTags: ["unread"] }, errors: [] };
}
