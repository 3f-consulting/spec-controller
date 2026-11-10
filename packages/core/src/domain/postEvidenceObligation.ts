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

function readCode(text: string): ClaimCode {
  const [, featureCode = "", number = ""] = text.split("-");
  return { featureCode, number };
}

function claimOf(file: string, scenario: ScenarioAsWritten, code: string | undefined): ExecutableClaim {
  return { file, title: scenario.title, obligations: [], ...(code === undefined ? {} : { claimCode: readCode(code) }) };
}

function claimsOf(file: string, scenario: ScenarioAsWritten): ExecutableClaim[] {
  if (scenario.rows) return scenario.rows.map((row) => claimOf(file, scenario, row.cell));
  return [claimOf(file, scenario, scenario.tags.find((tag) => tag.startsWith("@CLM-"))?.slice(1))];
}

export function executableClaimsOf(features: readonly FeatureAsWritten[], settings: ReadingSettings): ExecutableClaim[] {
  return features.flatMap(({ file, scenarios }) => scenarios.flatMap((scenario) => claimsOf(file, scenario)));
}
