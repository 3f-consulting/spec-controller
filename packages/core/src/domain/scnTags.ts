import { attributionOf, type Attribution } from "./attribution.js";
import { featureCodeOf, SCN_CODE } from "./featureCode.js";

interface DuplicateFeatureCodeError {
  readonly kind: "duplicate-feature-code";
  readonly featureCode: string;
  readonly files: readonly string[];
}

export interface ForeignClaimCodeError {
  readonly kind: "foreign-claim-code";
  readonly files: readonly string[];
  readonly featureCode: string;
  readonly claimCode: string;
  readonly namedFeatureCode: string;
  readonly namedFeatureFiles: readonly string[];
}

export type ForeignCodeCarriers = { readonly kind: "none" } | { readonly kind: "carried"; readonly files: readonly [string, ...(readonly string[])] };

export function foreignCodeCarriersOf(error: ForeignClaimCodeError): ForeignCodeCarriers {
  const [first, ...rest] = error.namedFeatureFiles;
  return first === undefined ? { kind: "none" } : { kind: "carried", files: [first, ...rest] };
}

interface NoFeatureCodeError {
  readonly kind: "no-feature-code";
  readonly files: readonly string[];
}

interface SeveralClaimCodesError {
  readonly kind: "several-claim-codes";
  readonly files: readonly string[];
  readonly scenario: string;
  readonly codes: readonly string[];
}

export type ClaimCodeError = DuplicateFeatureCodeError | ForeignClaimCodeError | NoFeatureCodeError | SeveralClaimCodesError;

export type ClaimCodeErrorKind = ClaimCodeError["kind"];

export interface ScenarioCodePopulation {
  readonly featureFiles: number;
  readonly featureCodes: number;
}

export function hasScenarioCodeErrors(reconciliation: {
  readonly claimCodeErrors?: readonly ClaimCodeError[];
}): boolean {
  return (reconciliation.claimCodeErrors ?? []).length > 0;
}

type ScenarioCodeErrorsAre = "misfilings" | "several-codes" | "both";

export function scenarioCodeErrorsAre(errors: readonly ClaimCodeError[]): ScenarioCodeErrorsAre {
  const several = errors.filter((error) => error.kind === "several-claim-codes").length;
  if (several === 0) return "misfilings";
  return several === errors.length ? "several-codes" : "both";
}

export type ScenarioCodeCleanliness =
  | { readonly kind: "no-feature-file" }
  | { readonly kind: "no-coded-scenario"; readonly featureFiles: number }
  | { readonly kind: "each-file-own-code"; readonly featureFiles: number; readonly featureCodes: number }
  | { readonly kind: "others-no-feature-code"; readonly featureFiles: number; readonly featureCodes: number; readonly noFeatureCode: number };

// Read only of a population with no scenario code error, where no feature code is shared, so each code is one file's.
export function scenarioCodeCleanlinessOf({ featureFiles, featureCodes }: ScenarioCodePopulation): ScenarioCodeCleanliness {
  if (featureFiles === 0) return { kind: "no-feature-file" };
  if (featureCodes === 0) return { kind: "no-coded-scenario", featureFiles };
  if (featureCodes === featureFiles) return { kind: "each-file-own-code", featureFiles, featureCodes };
  return { kind: "others-no-feature-code", featureFiles, featureCodes, noFeatureCode: featureFiles - featureCodes };
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

export function duplicateFeatureCodes(features: readonly FeatureFileScenarios[]): ClaimCodeError[] {
  const faults: ClaimCodeError[] = [];
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
    const { claimCode } = scenarioCodesOf(tags);
    return claimCode === null ? [] : [claimCode];
  });
}

export function foreignScenarioCodes(features: readonly FeatureFileScenarios[]): ClaimCodeError[] {
  const carriersByCode = headerFilesByCode(features);
  const faults: ClaimCodeError[] = [];
  for (const feature of features) {
    if (feature.featureCode === null) continue;
    for (const claimCode of codedScenarioIds(feature)) {
      const named = featureCodeOf(claimCode);
      if (named === null || named === feature.featureCode) continue;
      const carriers = carriersByCode.get(named) ?? [];
      faults.push({
        kind: "foreign-claim-code",
        files: [feature.file],
        featureCode: feature.featureCode,
        claimCode,
        namedFeatureCode: named,
        namedFeatureFiles: carriers,
      });
    }
  }
  return faults;
}

function noFeatureCodeFiles(features: readonly FeatureFileScenarios[]): ClaimCodeError[] {
  return features
    .filter((feature) => feature.featureCode === null && codedScenarioIds(feature).length > 0)
    .map((feature) => ({
      kind: "no-feature-code" as const,
      files: [feature.file],
    }));
}

function severalScnCodes(features: readonly FeatureFileScenarios[]): ClaimCodeError[] {
  return features.flatMap((feature) =>
    feature.scenarios.flatMap(({ name, tags }) => {
      const { severalCodes } = scenarioCodesOf(tags);
      if (severalCodes === undefined) return [];
      return [
        {
          kind: "several-claim-codes" as const,
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

export function scenarioCodeErrorsOf(features: readonly FeatureFileScenarios[]): ClaimCodeError[] {
  return [
    ...duplicateFeatureCodes(features),
    ...foreignScenarioCodes(features),
    ...noFeatureCodeFiles(features),
    ...severalScnCodes(features),
  ];
}
