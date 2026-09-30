import { featureCodeOf } from "../domain/featureCode.js";
import type { ScenarioCodeError, ScenarioCodePopulation } from "../domain/scenarioCodeError.js";
import { parseTaggedScenarios } from "./scenarios.js";

export interface CorpusFile {
  slug: string;
  featureCode: string | null;
  source: string;
}

export function duplicateFeatureCodes(features: readonly CorpusFile[]): ScenarioCodeError[] {
  const faults: ScenarioCodeError[] = [];
  for (const [code, files] of headerFilesByCode(features)) {
    if (files.length < 2) continue;
    faults.push({
      kind: "duplicate-feature-code",
      files,
      message:
        `the feature code @${code} is carried by ${files.length} feature ` +
        `files — ${files.join(", ")}. A feature code names exactly one feature file: a ` +
        `reconciliation's by-feature cut groups on it, so two files sharing a code report as one ` +
        `row and attribute one file's scenarios to the other. Give one of them a code of its own.`,
    });
  }
  return faults;
}

function headerFilesByCode(features: readonly CorpusFile[]): Map<string, string[]> {
  const filesByCode = new Map<string, string[]>();
  for (const file of features) {
    if (file.featureCode === null) continue;
    filesByCode.set(file.featureCode, [...(filesByCode.get(file.featureCode) ?? []), `${file.slug}.feature`]);
  }
  return filesByCode;
}

function foreignMessage(file: CorpusFile & { featureCode: string }, scnId: string, named: string, carriers: readonly string[]): string {
  const opening =
    `${file.slug}.feature carries the feature code @${file.featureCode}, but holds the scenario ` +
    `@${scnId}, whose feature part names ${named}. A reconciliation's by-feature cut groups on the id, so `;
  const recode = `Re-code the scenario for @${file.featureCode}`;
  if (carriers.length === 1) {
    return (
      `${opening}it counts this scenario under ${carriers[0]}'s row, not ${file.slug}.feature's. ` +
      `${recode}, or move it to ${carriers[0]}.`
    );
  }
  if (carriers.length > 1) {
    return (
      `${opening}it counts this scenario under the one row for ${named}, which ${carriers.length} feature ` +
      `files carry — ${carriers.join(", ")} — so that row cannot say which of them it belongs to. ` +
      `${recode}, or move it once a single file carries ${named}.`
    );
  }
  return (
    `${opening}it opens a row for ${named}, which no feature file carries as its header code, so ` +
    `that row stands for no file. ${recode}.`
  );
}

export function foreignScenarioCodes(features: readonly CorpusFile[]): ScenarioCodeError[] {
  const carriersByCode = headerFilesByCode(features);
  const faults: ScenarioCodeError[] = [];
  for (const file of features) {
    if (file.featureCode === null) continue;
    const coded = { ...file, featureCode: file.featureCode };
    for (const scenario of parseTaggedScenarios(file.source)) {
      const named = featureCodeOf(scenario.scnId);
      if (named === null || named === file.featureCode) continue;
      const carriers = carriersByCode.get(named) ?? [];
      faults.push({
        kind: "foreign-scn-code",
        files: [`${file.slug}.feature`],
        namedFeatureCode: named,
        namedFeatureFiles: carriers,
        message: foreignMessage(coded, scenario.scnId, named, carriers),
      });
    }
  }
  return faults;
}

export function uncodedFeatureFiles(features: readonly CorpusFile[]): ScenarioCodeError[] {
  return features
    .filter((file) => file.featureCode === null && parseTaggedScenarios(file.source).length > 0)
    .map((file) => ({
      kind: "no-feature-code" as const,
      files: [`${file.slug}.feature`],
      message:
        `${file.slug}.feature carries no feature code, but its scenarios carry @SCN codes. A feature ` +
        `file is the class its scenarios' codes are filed under: give it a header code of its own, ` +
        `and code its scenarios for it.`,
    }));
}

export function scenarioCodePopulationOf(features: readonly CorpusFile[]): ScenarioCodePopulation {
  return { featureFiles: features.length, featureCodes: headerFilesByCode(features).size };
}

export function scenarioCodeErrorsOf(features: readonly CorpusFile[]): ScenarioCodeError[] {
  return [
    ...duplicateFeatureCodes(features),
    ...foreignScenarioCodes(features),
    ...uncodedFeatureFiles(features),
  ];
}
