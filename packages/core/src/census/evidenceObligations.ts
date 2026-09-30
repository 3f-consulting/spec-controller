import { parseTaggedScenarios } from "../parse/scenarios.js";

export interface UntaggedScenario {
  feature: string;
  scenario: string;
}

export interface SharedScnCode {
  scnId: string;
  scenarios: UntaggedScenario[];
}

export interface EvidenceObligations {
  rawScnOccurrences: number;
  scenarioCount: number;
  excludedOccurrences: number;
  untaggedScenarios: UntaggedScenario[];
  proseOnlyCodes: string[];
  sharedScnCodes?: SharedScnCode[];
}

export function evidenceObligations(
  raw: number,
  scenarioCount: number,
  untaggedScenarios: UntaggedScenario[] = [],
  proseOnlyCodes: string[] = [],
  sharedScnCodes: SharedScnCode[] = []
): EvidenceObligations {
  return {
    rawScnOccurrences: raw,
    scenarioCount,
    excludedOccurrences: raw - scenarioCount,
    untaggedScenarios,
    proseOnlyCodes,
    ...(sharedScnCodes.length > 0 ? { sharedScnCodes } : {}),
  };
}

export function sharedScnCodesOf(
  files: readonly { feature: string; source: string }[]
): SharedScnCode[] {
  const byCode = new Map<string, UntaggedScenario[]>();
  for (const { feature, source } of files) {
    for (const { scnId, name } of parseTaggedScenarios(source)) {
      byCode.set(scnId, [...(byCode.get(scnId) ?? []), { feature, scenario: name }]);
    }
  }
  return [...byCode]
    .filter(([, scenarios]) => scenarios.length > 1)
    .map(([scnId, scenarios]) => ({ scnId, scenarios }))
    .sort((a, b) => a.scnId.localeCompare(b.scnId));
}
