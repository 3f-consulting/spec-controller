import { parseTaggedScenarios } from "../parse/scenarios.js";
import { CORE_MESSAGES, CoreMessage } from "../domain/messages.js";

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
