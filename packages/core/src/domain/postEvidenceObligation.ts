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

// An Examples block as written: its tags, its columns, and each row's line and cells.
interface ExamplesBlockAsWritten {
  readonly tags: readonly string[];
  readonly columns: readonly string[];
  readonly rows: readonly { readonly line: number; readonly cells: readonly string[] }[];
}

// A scenario or Outline as written: its tags without their at-sign, its title, its line and its Examples blocks.
export interface ScenarioAsWritten {
  readonly tags: readonly string[];
  readonly title: string;
  readonly line: number;
  readonly examples: readonly ExamplesBlockAsWritten[];
}

export interface FeatureAsWritten {
  readonly file: string;
  readonly featureTags: readonly string[];
  readonly scenarios: readonly ScenarioAsWritten[];
  readonly tagFormWords: readonly string[];
}

interface ClaimRow {
  readonly line: number;
  readonly cell: string | undefined;
}

// A scenario as the claims are read off it: an Outline with a clm column has a row for each claim.
interface ScenarioRead {
  readonly tags: readonly string[];
  readonly title: string;
  readonly examplesTags: readonly string[];
  readonly rows: readonly ClaimRow[] | undefined;
}

const CLM_COLUMN = "clm";

const clmColumnOf = (block: ExamplesBlockAsWritten): number => block.columns.indexOf(CLM_COLUMN);

// An Outline with a clm column in any Examples block is one claim for each row of every block; a row of a block with
// no clm column has no clm cell, so it is a claim with no code.
function claimRowsOf({ examples }: ScenarioAsWritten): ClaimRow[] | undefined {
  if (!examples.some((block) => clmColumnOf(block) >= 0)) return undefined;
  return examples.flatMap((block) => {
    const column = clmColumnOf(block);
    return block.rows.map(({ line, cells }) => ({ line, cell: cells[column] }));
  });
}

function scenarioReadOf(scenario: ScenarioAsWritten): ScenarioRead {
  const rows = claimRowsOf(scenario);
  return { tags: scenario.tags, title: scenario.title, examplesTags: scenario.examples.flatMap(({ tags }) => tags), rows };
}

// Each feature file with its scenarios as the claims are read off them.
export function featureReadOf({ file, featureTags, scenarios }: FeatureAsWritten): { readonly file: string; readonly featureTags: readonly string[]; readonly scenarios: readonly ScenarioRead[] } {
  return { file, featureTags, scenarios: scenarios.map(scenarioReadOf) };
}

const codesIn = (words: readonly string[]): string[] => words.filter((word) => claimCodeFrom(word) !== undefined);

// The claim codes a scenario carries at each line a report may name it by: its tags at its own line, and the clm cell,
// if its block has one, at the line of each row.
export function claimCodesAtLinesOf(scenario: ScenarioAsWritten): { readonly line: number; readonly codes: readonly string[] }[] {
  const rows = scenario.examples
    .flatMap((block) => block.rows.map(({ line, cells }) => ({ line, codes: codesIn([cells[clmColumnOf(block)]!]) })));
  return [{ line: scenario.line, codes: codesIn(scenario.tags) }, ...rows];
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

function claimOf(file: string, scenario: ScenarioRead, strict: boolean, claimCode: ClaimCode | undefined): ExecutableClaim {
  return { file, title: scenario.title, obligations: obligationsRaisedBy(scenario.tags, strict), ...(claimCode && { claimCode }) };
}

function claimCodesIn(tags: readonly string[]): ClaimCode[] {
  return tags.flatMap((tag) => claimCodeFrom(tag) ?? []);
}

function claimsOf(file: string, scenario: ScenarioRead, settings: ReadingSettings): ExecutableClaim[] {
  if (isDeferred(scenario.tags, settings)) return [];
  const codes = claimCodesIn(scenario.tags);
  const claim = (claimCode: ClaimCode | undefined): ExecutableClaim => claimOf(file, scenario, settings.strict, claimCode);
  if (scenario.rows) return codes.length > 0 ? [] : scenario.rows.map((row) => claim(claimCodeFrom(row.cell)));
  return codes.length > 1 ? [] : [claim(codes[0])];
}

export function executableClaimsOf(features: readonly FeatureAsWritten[], settings: ReadingSettings): ExecutableClaim[] {
  return features.flatMap(({ file, scenarios }) => scenarios.flatMap((scenario) => claimsOf(file, scenarioReadOf(scenario), settings)));
}
