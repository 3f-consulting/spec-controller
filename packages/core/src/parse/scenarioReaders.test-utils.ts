import type { ParsedFeatureCounts, UntaggedScenario } from "../domain/corpusCounts.js";
import type { ScenarioTags } from "../domain/scnTags.js";
import type { Scenario } from "../model.js";
import { parsedFeatures } from "./parsedFeatures.test-utils.js";
import { countScnOccurrences, featureCountsOf, scenariosOf, untaggedScenariosOf, type ParsedFeatureFile } from "./scenarios.js";

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
  untagged: UntaggedScenario[];
  raw: number;
  scenarios: Scenario[];
} {
  const untagged = corpus.flatMap(({ feature, source }) =>
    parseUntaggedScenarios(source).map((scenario) => ({ feature, scenario }))
  );
  const raw = corpus.reduce((n, { source }) => n + countScnOccurrences(source), 0);
  const scenarios = corpus.flatMap(({ source }) => parseScenarios(source));
  return { untagged, raw, scenarios };
}
