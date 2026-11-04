import type { ScenarioName } from "./qualityCheckReconciliation.js";

export function untaggedScenarioId({ feature, title }: ScenarioName): string {
  return `${feature} : ${title}`;
}

export interface SharedScnCode {
  readonly scnId: string;
  readonly scenarios: readonly ScenarioName[];
}

export interface EvidenceObligations {
  readonly rawScnOccurrences: number;
  readonly scenarioCount: number;
  readonly excludedOccurrences: number;
  readonly untaggedScenarios: readonly ScenarioName[];
  readonly sharedScnCodes?: readonly SharedScnCode[];
}

export interface ParsedFeatureCounts {
  readonly rawScnOccurrences: number;
  readonly tagScnOccurrences: number;
  readonly taggedScenarios: readonly { readonly scnId: string; readonly name: string }[];
  readonly untaggedScenarios: readonly string[];
}

export interface ParsedFeature extends ParsedFeatureCounts {
  readonly feature: string;
}

export function sharedScnCodesOf(
  files: readonly Pick<ParsedFeature, "feature" | "taggedScenarios">[]
): SharedScnCode[] {
  const byCode = new Map<string, ScenarioName[]>();
  for (const { feature, taggedScenarios } of files) {
    for (const { scnId, name } of taggedScenarios) {
      byCode.set(scnId, [...(byCode.get(scnId) ?? []), { feature, title: name }]);
    }
  }
  return [...byCode]
    .filter(([, scenarios]) => scenarios.length > 1)
    .map(([scnId, scenarios]) => ({ scnId, scenarios }))
    .sort((a, b) => a.scnId.localeCompare(b.scnId));
}

export function corpusCountsOf(files: readonly ParsedFeature[]): EvidenceObligations {
  const raw = files.reduce((n, f) => n + f.rawScnOccurrences, 0);
  const scenarioCount = files.reduce((n, f) => n + f.taggedScenarios.length, 0);
  const tagOccurrences = files.reduce((n, f) => n + f.tagScnOccurrences, 0);
  const untagged = files
    .flatMap(({ feature, untaggedScenarios }) => untaggedScenarios.map((title) => ({ feature, title })))
    .sort((a, b) => a.feature.localeCompare(b.feature) || a.title.localeCompare(b.title));
  return evidenceObligations(raw, scenarioCount, untagged, sharedScnCodesOf(files), tagOccurrences);
}

export function evidenceObligations(
  raw: number,
  scenarioCount: number,
  untaggedScenarios: ScenarioName[] = [],
  sharedScnCodes: SharedScnCode[] = [],
  tagOccurrences: number = scenarioCount
): EvidenceObligations {
  return {
    rawScnOccurrences: raw,
    scenarioCount,
    excludedOccurrences: raw - tagOccurrences,
    untaggedScenarios,
    sharedScnCodes,
  };
}
