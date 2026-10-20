import type { ParsedFeatureCounts } from "../domain/corpusCounts.js";
import type { ScenarioTags } from "../domain/scnTags.js";
import type { Scenario } from "../model.js";
import { parsedFeatures } from "./parsedFeatures.test-utils.js";
import { featureCountsOf, scenariosOf, untaggedScenariosOf, type ParsedFeatureFile } from "./scenarios.js";

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
