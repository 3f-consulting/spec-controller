import type { ScenarioName } from "./qualityCheckReconciliation.js";

export function untaggedScenarioId({ feature, title }: ScenarioName): string {
  return `${feature} : ${title}`;
}

export interface SharedClaimCode {
  readonly claimCode: string;
  readonly scenarios: readonly ScenarioName[];
}

export interface EvidenceObligations {
  readonly rawClaimCodeOccurrences: number;
  readonly scenarioCount: number;
  readonly excludedOccurrences: number;
  readonly untaggedScenarios: readonly ScenarioName[];
  readonly sharedClaimCodes?: readonly SharedClaimCode[];
}

export interface ParsedFeatureCounts {
  readonly rawClaimCodeOccurrences: number;
  readonly tagClaimCodeOccurrences: number;
  readonly taggedScenarios: readonly { readonly claimCode: string; readonly name: string }[];
  readonly untaggedScenarios: readonly string[];
}

export interface ParsedFeature extends ParsedFeatureCounts {
  readonly feature: string;
}

export function sharedClaimCodesOf(
  files: readonly Pick<ParsedFeature, "feature" | "taggedScenarios">[]
): SharedClaimCode[] {
  const byCode = new Map<string, ScenarioName[]>();
  for (const { feature, taggedScenarios } of files) {
    for (const { claimCode, name } of taggedScenarios) {
      byCode.set(claimCode, [...(byCode.get(claimCode) ?? []), { feature, title: name }]);
    }
  }
  return [...byCode]
    .filter(([, scenarios]) => scenarios.length > 1)
    .map(([claimCode, scenarios]) => ({ claimCode, scenarios }))
    .sort((a, b) => a.claimCode.localeCompare(b.claimCode));
}

export function corpusCountsOf(files: readonly ParsedFeature[]): EvidenceObligations {
  const raw = files.reduce((n, f) => n + f.rawClaimCodeOccurrences, 0);
  const scenarioCount = files.reduce((n, f) => n + f.taggedScenarios.length, 0);
  const tagOccurrences = files.reduce((n, f) => n + f.tagClaimCodeOccurrences, 0);
  const untagged = files
    .flatMap(({ feature, untaggedScenarios }) => untaggedScenarios.map((title) => ({ feature, title })))
    .sort((a, b) => a.feature.localeCompare(b.feature) || a.title.localeCompare(b.title));
  return evidenceObligations(raw, scenarioCount, untagged, sharedClaimCodesOf(files), tagOccurrences);
}

export function evidenceObligations(
  raw: number,
  scenarioCount: number,
  untaggedScenarios: ScenarioName[] = [],
  sharedClaimCodes: SharedClaimCode[] = [],
  tagOccurrences: number = scenarioCount
): EvidenceObligations {
  return {
    rawClaimCodeOccurrences: raw,
    scenarioCount,
    excludedOccurrences: raw - tagOccurrences,
    untaggedScenarios,
    sharedClaimCodes,
  };
}
