import { attributionOf, type Attribution } from "./attribution.js";
import { featureCodeOf, SCN_CODE } from "./featureCode.js";

interface DuplicateFeatureCodeError {
  readonly kind: "duplicate-feature-code";
  readonly featureCode: string;
  readonly files: readonly string[];
}

export interface ForeignScnCodeError {
  readonly kind: "foreign-scn-code";
  readonly files: readonly string[];
  readonly featureCode: string;
  readonly scnId: string;
  readonly namedFeatureCode: string;
  readonly namedFeatureFiles: readonly string[];
}

export type ForeignCodeCarriers = { readonly kind: "none" } | { readonly kind: "carried"; readonly files: readonly [string, ...(readonly string[])] };

export function foreignCodeCarriersOf(error: ForeignScnCodeError): ForeignCodeCarriers {
  const [first, ...rest] = error.namedFeatureFiles;
  return first === undefined ? { kind: "none" } : { kind: "carried", files: [first, ...rest] };
}

interface NoFeatureCodeError {
  readonly kind: "no-feature-code";
  readonly files: readonly string[];
}

interface SeveralScnCodesError {
  readonly kind: "several-scn-codes";
  readonly files: readonly string[];
  readonly scenario: string;
  readonly codes: readonly string[];
}

export type ScenarioCodeError = DuplicateFeatureCodeError | ForeignScnCodeError | NoFeatureCodeError | SeveralScnCodesError;

export type ScenarioCodeErrorKind = ScenarioCodeError["kind"];

export interface ScenarioCodePopulation {
  readonly featureFiles: number;
  readonly featureCodes: number;
}

export function hasScenarioCodeErrors(reconciliation: {
  readonly scenarioCodeErrors?: readonly ScenarioCodeError[];
}): boolean {
  return (reconciliation.scenarioCodeErrors ?? []).length > 0;
}

type ScenarioCodeErrorsAre = "misfilings" | "several-codes" | "both";

export function scenarioCodeErrorsAre(errors: readonly ScenarioCodeError[]): ScenarioCodeErrorsAre {
  const several = errors.filter((error) => error.kind === "several-scn-codes").length;
  if (several === 0) return "misfilings";
  return several === errors.length ? "several-codes" : "both";
}

export function scenarioCodesOf(tags: readonly string[]): Attribution {
  return attributionOf(tags.filter((tag) => SCN_CODE.test(tag)));
}

export interface ScenarioTags {
  readonly name: string;
  readonly tags: readonly string[];
}

export interface FeatureFileScenarios {
  readonly file: string;
  readonly featureCode: string | null;
  readonly scenarios: readonly ScenarioTags[];
}

function headerFilesByCode(features: readonly FeatureFileScenarios[]): Map<string, string[]> {
  const filesByCode = new Map<string, string[]>();
  for (const feature of features) {
    if (feature.featureCode === null) continue;
    filesByCode.set(feature.featureCode, [...(filesByCode.get(feature.featureCode) ?? []), feature.file]);
  }
  return filesByCode;
}

export function duplicateFeatureCodes(features: readonly FeatureFileScenarios[]): ScenarioCodeError[] {
  const faults: ScenarioCodeError[] = [];
  for (const [code, files] of headerFilesByCode(features)) {
    if (files.length < 2) continue;
    faults.push({
      kind: "duplicate-feature-code",
      featureCode: code,
      files,
    });
  }
  return faults;
}

function codedScenarioIds(feature: FeatureFileScenarios): string[] {
  return feature.scenarios.flatMap(({ tags }) => {
    const { scnId } = scenarioCodesOf(tags);
    return scnId === null ? [] : [scnId];
  });
}

export function foreignScenarioCodes(features: readonly FeatureFileScenarios[]): ScenarioCodeError[] {
  const carriersByCode = headerFilesByCode(features);
  const faults: ScenarioCodeError[] = [];
  for (const feature of features) {
    if (feature.featureCode === null) continue;
    for (const scnId of codedScenarioIds(feature)) {
      const named = featureCodeOf(scnId);
      if (named === null || named === feature.featureCode) continue;
      const carriers = carriersByCode.get(named) ?? [];
      faults.push({
        kind: "foreign-scn-code",
        files: [feature.file],
        featureCode: feature.featureCode,
        scnId,
        namedFeatureCode: named,
        namedFeatureFiles: carriers,
      });
    }
  }
  return faults;
}

function noFeatureCodeFiles(features: readonly FeatureFileScenarios[]): ScenarioCodeError[] {
  return features
    .filter((feature) => feature.featureCode === null && codedScenarioIds(feature).length > 0)
    .map((feature) => ({
      kind: "no-feature-code" as const,
      files: [feature.file],
    }));
}

function severalScnCodes(features: readonly FeatureFileScenarios[]): ScenarioCodeError[] {
  return features.flatMap((feature) =>
    feature.scenarios.flatMap(({ name, tags }) => {
      const { severalCodes } = scenarioCodesOf(tags);
      if (severalCodes === undefined) return [];
      return [
        {
          kind: "several-scn-codes" as const,
          files: [feature.file],
          scenario: name,
          codes: severalCodes,
        },
      ];
    })
  );
}

export function scenarioCodePopulationOf(features: readonly FeatureFileScenarios[]): ScenarioCodePopulation {
  return { featureFiles: features.length, featureCodes: headerFilesByCode(features).size };
}

export function scenarioCodeErrorsOf(features: readonly FeatureFileScenarios[]): ScenarioCodeError[] {
  return [
    ...duplicateFeatureCodes(features),
    ...foreignScenarioCodes(features),
    ...noFeatureCodeFiles(features),
    ...severalScnCodes(features),
  ];
}
