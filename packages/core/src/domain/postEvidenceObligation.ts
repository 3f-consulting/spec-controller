import type { ClaimCode } from "./claimCodes.js";

export type QualityCheckKind = "fitness" | "unit" | "integration" | "e2e" | "performance";

// Absent kind: a scenario with no single claim code that names no kind of quality check.
export interface EvidenceObligation {
  readonly kind?: QualityCheckKind;
}

export interface ExecutableClaim {
  readonly claimCode?: ClaimCode;
  readonly file: string;
  readonly title: string;
  readonly obligations: readonly EvidenceObligation[];
}

// What the Gherkin reader reports, as written: tags without their at-sign, and every cell as text.
export interface OutlineExamplesAsWritten {
  readonly tags: readonly string[];
  readonly columns: readonly string[];
  readonly rows: readonly { readonly line: number; readonly cells: readonly string[] }[];
}

export interface ScenarioAsWritten {
  readonly tags: readonly string[];
  readonly title: string;
  readonly line: number;
  readonly examples: readonly OutlineExamplesAsWritten[];
}

export interface FeatureAsWritten {
  readonly file: string;
  readonly fileTags: readonly string[];
  readonly scenarios: readonly ScenarioAsWritten[];
  // Every word written with an at-sign anywhere in the file, tags included, without the at-sign.
  readonly wordsWrittenAsTags: readonly string[];
}

export interface ClaimReadingSettings {
  readonly deferralTags: readonly string[];
  readonly strict: boolean;
}

export function executableClaimsOf(features: readonly FeatureAsWritten[]): ExecutableClaim[] {
  return features.flatMap(({ file, scenarios }) =>
    scenarios.map(({ tags, title }) => ({ file, title, obligations: tags.includes("unit") ? [{ kind: "unit" as const }] : [] })),
  );
}
