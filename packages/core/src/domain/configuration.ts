import type { QualityCheckKind } from "./postEvidenceObligation.js";

export type Layer = Exclude<QualityCheckKind, "fitness">;

// A step named in notChecks: its workflow, job and step name.
export interface StepAddress {
  readonly workflow: string;
  readonly job: string;
  readonly step: string;
}

// null under runners: the target has no runner for that kind.
export interface TargetConfiguration {
  readonly runners: Readonly<Partial<Record<Layer, string | null>>>;
  readonly nonChecks: readonly StepAddress[];
  readonly deferralTags: readonly string[];
}

// entry is the setting as written, such as runners.unit or deferralTags[0].
export interface ConfigurationError {
  readonly kind:
    | "configuration-wrong-kind"
    | "configuration-unknown-key"
    | "runner-key-not-a-layer"
    | "not-checks-entry-matches-no-step"
    | "not-checks-entry-not-a-step-name";
  readonly entry: string;
}

// What the target's settings file holds, as written: its block of settings, absent when there is none, and its scripts.
export interface TargetSettingsAsWritten {
  readonly settingsBlock?: unknown;
  readonly scripts: Readonly<Record<string, string>>;
}
