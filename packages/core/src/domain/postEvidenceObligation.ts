import { claimCodeFrom, type ClaimCode } from "./claimCodes.js";

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
  readonly cell?: string;
}

export interface ScenarioAsWritten {
  readonly tags: readonly string[];
  readonly title: string;
  readonly rows?: readonly RowAsWritten[];
}

export interface FeatureAsWritten {
  readonly file: string;
  readonly scenarios: readonly ScenarioAsWritten[];
  readonly tagFormWords: readonly string[];
}

export interface ReadingSettings {
  readonly deferralTags: readonly string[];
  readonly strict: boolean;
}

const BUILT_IN_DEFERRAL_TAGS: readonly string[] = ["wip", "ignore", "skip", "todo", "pending"];

function isDeferred(tags: readonly string[], { deferralTags, strict }: ReadingSettings): boolean {
  return !strict && tags.some((tag) => BUILT_IN_DEFERRAL_TAGS.includes(tag) || deferralTags.includes(tag));
}

const QUALITY_CHECK_KINDS: readonly QualityCheckKind[] = ["fitness", "unit", "integration", "e2e", "performance"];

function obligationsRaisedBy(tags: readonly string[], strict: boolean): EvidenceObligation[] {
  const raises = (kind: QualityCheckKind): boolean => tags.includes(kind) || (strict && tags.includes(`${kind}pending`));
  return QUALITY_CHECK_KINDS.filter(raises).map((kind) => ({ kind }));
}

function claimOf(file: string, scenario: ScenarioAsWritten, strict: boolean, claimCode: ClaimCode | undefined): ExecutableClaim {
  return { file, title: scenario.title, obligations: obligationsRaisedBy(scenario.tags, strict), ...(claimCode && { claimCode }) };
}

function claimCodesIn(tags: readonly string[]): ClaimCode[] {
  return tags.flatMap((tag) => claimCodeFrom(tag) ?? []);
}

function claimsOf(file: string, scenario: ScenarioAsWritten, settings: ReadingSettings): ExecutableClaim[] {
  if (isDeferred(scenario.tags, settings)) return [];
  const codes = claimCodesIn(scenario.tags);
  const claim = (claimCode: ClaimCode | undefined): ExecutableClaim => claimOf(file, scenario, settings.strict, claimCode);
  if (scenario.rows) return codes.length > 0 ? [] : scenario.rows.map((row) => claim(claimCodeFrom(row.cell ?? "")));
  return codes.length > 1 ? [] : [claim(codes[0])];
}

export function executableClaimsOf(features: readonly FeatureAsWritten[], settings: ReadingSettings): ExecutableClaim[] {
  return features.flatMap(({ file, scenarios }) => scenarios.flatMap((scenario) => claimsOf(file, scenario, settings)));
}
