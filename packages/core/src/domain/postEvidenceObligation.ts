import { anyClmColumn, claimCodeFrom, type ClaimCode } from "./claimCodes.js";

export type QualityCheckKind = "fitness" | "unit" | "integration" | "e2e" | "performance";

export interface EvidenceObligation {
  readonly kind: QualityCheckKind;
}

export interface ExecutableClaim {
  readonly claimCode?: ClaimCode;
  readonly file: string;
  readonly title: string;
  readonly obligations: readonly EvidenceObligation[];
}

// An Examples block: its tags without their at-sign, whether it has a clm column, and each row's line and its clm cell,
// which a row has only when the block has the column and the row a cell in it.
export interface ExamplesBlock {
  readonly tags: readonly string[];
  readonly hasClmColumn: boolean;
  readonly rows: readonly { readonly line: number; readonly clmCell?: string }[];
}

// ruleTags: the tags of the Rule it sits under, none under no Rule.
export interface FeatureScenario {
  readonly tags: readonly string[];
  readonly ruleTags: readonly string[];
  readonly title: string;
  readonly line: number;
  readonly examples: readonly ExamplesBlock[];
}

export interface FeatureFile {
  readonly file: string;
  readonly fileTags: readonly string[];
  readonly scenarios: readonly FeatureScenario[];
  // Every word written with an at-sign anywhere in the file, tags included, without the at-sign.
  readonly wordsWrittenAsTags: readonly string[];
}

export interface ClaimReadingSettings {
  readonly deferralTags: readonly string[];
  readonly strict: boolean;
}

const BUILT_IN_DEFERRAL_TAGS: readonly string[] = ["wip", "ignore", "skip", "todo", "pending"];

// The one order of the kinds of quality check, wherever they are listed or sorted.
export const QUALITY_CHECK_KINDS: readonly QualityCheckKind[] = ["unit", "integration", "e2e", "performance", "fitness"];

const isDeferred = (tags: readonly string[], { deferralTags, strict }: ClaimReadingSettings): boolean =>
  !strict && tags.some((tag) => BUILT_IN_DEFERRAL_TAGS.includes(tag) || deferralTags.includes(tag));

// A strict run reads a pending kind of check, such as @integrationpending, as that kind.
const obligationsOf = (tags: readonly string[], strict: boolean): EvidenceObligation[] =>
  QUALITY_CHECK_KINDS.filter((kind) => tags.includes(kind) || (strict && tags.includes(`${kind}pending`))).map((kind) => ({ kind }));

// Each row's clm cell, across every Examples block, when any block has a clm column; a row of a block without one has no cell.
const clmCellsOf = ({ examples }: FeatureScenario): (string | undefined)[] | undefined =>
  anyClmColumn(examples) ? examples.flatMap(({ rows }) => rows.map(({ clmCell }) => clmCell)) : undefined;

// A deferral tag on the scenario, its Rule or its file defers it; only its own tags raise obligations.
function claimsOf({ file, fileTags }: FeatureFile, scenario: FeatureScenario, settings: ClaimReadingSettings): ExecutableClaim[] {
  if (isDeferred([...scenario.tags, ...scenario.ruleTags, ...fileTags], settings)) return [];
  const obligations = obligationsOf(scenario.tags, settings.strict);
  const tagged = scenario.tags.flatMap((tag) => claimCodeFrom(tag) ?? []);
  const claim = (claimCode: ClaimCode | undefined): ExecutableClaim => ({ file, title: scenario.title, obligations, ...(claimCode && { claimCode }) });
  const cells = clmCellsOf(scenario);
  if (cells === undefined) return [claim(tagged.length === 1 ? tagged[0] : undefined)];
  return cells.map((cell) => claim(tagged.length === 0 ? claimCodeFrom(cell) : undefined));
}

export function executableClaimsOf(features: readonly FeatureFile[], settings: ClaimReadingSettings): ExecutableClaim[] {
  return features.flatMap((feature) => feature.scenarios.flatMap((scenario) => claimsOf(feature, scenario, settings)));
}
