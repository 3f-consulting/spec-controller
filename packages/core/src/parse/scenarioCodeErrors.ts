import { featureCodeOf } from "../domain/featureCode.js";
import type { ScenarioCodeError, ScenarioCodePopulation } from "../domain/scenarioCodeError.js";
import { parseSeveralCodedScenarios, parseTaggedScenarios } from "./scenarios.js";
import { CORE_MESSAGES, CoreMessage } from "../domain/messages.js";

export interface CorpusFile {
  readonly slug: string;
  readonly featureCode: string | null;
  readonly source: string;
}

export function duplicateFeatureCodes(features: readonly CorpusFile[]): ScenarioCodeError[] {
  const faults: ScenarioCodeError[] = [];
  for (const [code, files] of headerFilesByCode(features)) {
    if (files.length < 2) continue;
    faults.push({
      kind: "duplicate-feature-code",
      files,
      message: CORE_MESSAGES[CoreMessage.DuplicateFeatureCode](code, files.length, files.join(", ")),
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
  const fileName = `${file.slug}.feature`;
  if (carriers.length === 1) {
    return CORE_MESSAGES[CoreMessage.ForeignScnCodeOneCarrier](fileName, file.featureCode, scnId, named, carriers[0]!);
  }
  if (carriers.length > 1) {
    return CORE_MESSAGES[CoreMessage.ForeignScnCodeManyCarriers](
      fileName,
      file.featureCode,
      scnId,
      named,
      carriers.length,
      carriers.join(", ")
    );
  }
  return CORE_MESSAGES[CoreMessage.ForeignScnCodeNoCarrier](fileName, file.featureCode, scnId, named);
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

function noFeatureCodeFiles(features: readonly CorpusFile[]): ScenarioCodeError[] {
  return features
    .filter((file) => file.featureCode === null && parseTaggedScenarios(file.source).length > 0)
    .map((file) => ({
      kind: "no-feature-code" as const,
      files: [`${file.slug}.feature`],
      message: CORE_MESSAGES[CoreMessage.NoFeatureCode](`${file.slug}.feature`),
    }));
}

function severalScnCodes(features: readonly CorpusFile[]): ScenarioCodeError[] {
  return features.flatMap((file) =>
    parseSeveralCodedScenarios(file.source).map(({ name, codes }) => ({
      kind: "several-scn-codes" as const,
      files: [`${file.slug}.feature`],
      message: CORE_MESSAGES[CoreMessage.ScenarioSeveralScnCodes](`${file.slug}.feature`, name, codes),
    }))
  );
}

export function scenarioCodePopulationOf(features: readonly CorpusFile[]): ScenarioCodePopulation {
  return { featureFiles: features.length, featureCodes: headerFilesByCode(features).size };
}

export function scenarioCodeErrorsOf(features: readonly CorpusFile[]): ScenarioCodeError[] {
  return [
    ...duplicateFeatureCodes(features),
    ...foreignScenarioCodes(features),
    ...noFeatureCodeFiles(features),
    ...severalScnCodes(features),
  ];
}
