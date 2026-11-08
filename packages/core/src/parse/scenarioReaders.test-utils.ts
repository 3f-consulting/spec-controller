import type { ParsedFeatureCounts } from "../domain/corpusCounts.js";
import type { ScenarioName } from "../domain/qualityCheckReconciliation.js";
import type { ScenarioTags } from "../domain/claimCodes.js";
import type { Scenario } from "../model.js";
import { parsedFeatures } from "./parsedFeatures.test-utils.js";
import { scenarioName } from "../domain/scenarioName.test-utils.js";
import { countClaimCodeOccurrences, featureCountsOf, scenariosOf, untaggedScenariosOf, type ParsedFeatureFile } from "./scenarios.js";

function parsedFeature(source: string): ParsedFeatureFile {
  return parsedFeatures([source])[0]!;
}

export function parseScenarioTags(source: string): readonly ScenarioTags[] {
  return parsedFeature(source).scenarios;
}

export function parseUntaggedScenarios(source: string): string[] {
  return untaggedScenariosOf(parsedFeature(source));
}

export function parseFeatureCounts(source: string): ParsedFeatureCounts {
  return featureCountsOf(parsedFeature(source));
}

export function parseScenarios(source: string, deferralTags: readonly string[] = []): Scenario[] {
  return scenariosOf(parsedFeature(source), deferralTags);
}

export function readCorpus(corpus: readonly { feature: string; source: string }[]): {
  untagged: ScenarioName[];
  raw: number;
  scenarios: Scenario[];
} {
  const untagged = corpus.flatMap(({ feature, source }) =>
    parseUntaggedScenarios(source).map((title) => scenarioName(feature, title))
  );
  const raw = corpus.reduce((n, { source }) => n + countClaimCodeOccurrences(source), 0);
  const scenarios = corpus.flatMap(({ source }) => parseScenarios(source));
  return { untagged, raw, scenarios };
}
