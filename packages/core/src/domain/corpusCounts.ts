import { CORE_MESSAGES, CoreMessage } from "./messages.js";

export interface UntaggedScenario {
  readonly feature: string;
  readonly scenario: string;
}

export function untaggedScenarioId({ feature, scenario }: UntaggedScenario): string {
  return CORE_MESSAGES[CoreMessage.UntaggedScenarioId](feature, scenario);
}

export interface SharedScnCode {
  readonly scnId: string;
  readonly scenarios: readonly UntaggedScenario[];
}

export interface EvidenceObligations {
  readonly rawScnOccurrences: number;
  readonly scenarioCount: number;
  readonly excludedOccurrences: number;
  readonly untaggedScenarios: readonly UntaggedScenario[];
  readonly sharedScnCodes?: readonly SharedScnCode[];
}

export interface ParsedFeatureCounts {
  readonly rawScnOccurrences: number;
  readonly taggedScenarios: readonly { readonly scnId: string; readonly name: string }[];
  readonly untaggedScenarios: readonly string[];
}

export interface ParsedFeature extends ParsedFeatureCounts {
  readonly feature: string;
}

export function sharedScnCodesOf(
  files: readonly Pick<ParsedFeature, "feature" | "taggedScenarios">[]
): SharedScnCode[] {
  const byCode = new Map<string, UntaggedScenario[]>();
  for (const { feature, taggedScenarios } of files) {
    for (const { scnId, name } of taggedScenarios) {
      byCode.set(scnId, [...(byCode.get(scnId) ?? []), { feature, scenario: name }]);
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
  const untagged = files
    .flatMap(({ feature, untaggedScenarios }) => untaggedScenarios.map((scenario) => ({ feature, scenario })))
    .sort((a, b) => a.feature.localeCompare(b.feature) || a.scenario.localeCompare(b.scenario));
  return evidenceObligations(raw, scenarioCount, untagged, sharedScnCodesOf(files));
}

export function scenariosBehindAccountsOf(accounts: number, sharedScnCodes: readonly SharedScnCode[]): number {
  return accounts + sharedScnCodes.reduce((extra, code) => extra + code.scenarios.length - 1, 0);
}

export function evidenceObligations(
  raw: number,
  scenarioCount: number,
  untaggedScenarios: UntaggedScenario[] = [],
  sharedScnCodes: SharedScnCode[] = []
): EvidenceObligations {
  return {
    rawScnOccurrences: raw,
    scenarioCount,
    excludedOccurrences: raw - scenarioCount,
    untaggedScenarios,
    sharedScnCodes,
  };
}
