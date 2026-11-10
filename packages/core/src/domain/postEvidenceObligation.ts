import type { ClaimCode } from "./claimCodes.js";

export type QualityCheckKind = "fitness" | "unit" | "integration" | "e2e" | "performance";

export interface EvidenceObligation {
  readonly kind?: QualityCheckKind;
}

export interface ExecutableClaim {
  readonly claimCode?: ClaimCode;
  readonly file: string;
  readonly title: string;
  readonly obligations: readonly EvidenceObligation[];
}

export interface RowAsWritten {
  readonly line: number;
  readonly cell?: string | undefined;
}

export interface ScenarioAsWritten {
  readonly tags: readonly string[];
  readonly title: string;
  readonly rows?: readonly RowAsWritten[];
}

export interface FeatureAsWritten {
  readonly file: string;
  readonly scenarios: readonly ScenarioAsWritten[];
}

export interface ReadingSettings {
  readonly deferralTags: readonly string[];
  readonly strict: boolean;
}

export function executableClaimsOf(_features: readonly FeatureAsWritten[], _settings: ReadingSettings): ExecutableClaim[] {
  return [];
}
