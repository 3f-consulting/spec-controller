import type { FeatureAsWritten, ScenarioAsWritten } from "./postEvidenceObligation.js";

export interface ClaimCode {
  readonly featureCode: string;
  readonly number: string;
}

const FEATURE_CODE = /^[A-Z0-9]{2,5}$/;

const CLAIM_CODE = /^CLM-([A-Z0-9]{2,5})-(\d+)$/;

const RETIRED_SCENARIO_CODE = /^SCN-([A-Z0-9]{2,5})-(\d+)$/;

export function isFeatureCode(text: string): boolean {
  return FEATURE_CODE.test(text);
}

export function sameCode(a: ClaimCode, b: ClaimCode): boolean {
  return a.featureCode === b.featureCode && a.number === b.number;
}

function codeMatching(form: RegExp, text: string): ClaimCode | undefined {
  const parts = form.exec(text);
  return parts ? { featureCode: parts[1]!, number: parts[2]! } : undefined;
}

export function claimCodeFrom(text: string): ClaimCode | undefined {
  return codeMatching(CLAIM_CODE, text);
}

export function retiredScenarioCodeFrom(text: string): ClaimCode | undefined {
  return codeMatching(RETIRED_SCENARIO_CODE, text);
}

export function featureCodeOfFile({ featureTags }: Pick<FeatureAsWritten, "featureTags">): string | undefined {
  return featureTags.find(isFeatureCode);
}

interface DuplicateFeatureCodeError {
  readonly kind: "duplicate-feature-code";
  readonly featureCode: string;
  readonly files: readonly string[];
}

interface ForeignClaimCodeError {
  readonly kind: "foreign-claim-code";
  readonly files: readonly string[];
  readonly featureCode: string;
  readonly claimCode: string;
  readonly namedFeatureCode: string;
  readonly namedFeatureFiles: readonly string[];
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

interface ClaimCodeBesideClmColumnError {
  readonly kind: "claim-code-beside-clm-column";
  readonly files: readonly string[];
  readonly scenario: string;
  readonly codes: readonly string[];
}

export type ClaimCodeError =
  | DuplicateFeatureCodeError
  | ForeignClaimCodeError
  | NoFeatureCodeError
  | SeveralClaimCodesError
  | ClaimCodeBesideClmColumnError;

const written = ({ featureCode, number }: ClaimCode): string => `CLM-${featureCode}-${number}`;

const claimCodesIn = (words: readonly string[]): ClaimCode[] => words.flatMap((word) => claimCodeFrom(word) ?? []);

function codesCarriedBy(scenario: ScenarioAsWritten): ClaimCode[] {
  if (scenario.rows) return scenario.rows.flatMap((row) => claimCodeFrom(row.cell ?? "") ?? []);
  const codes = claimCodesIn(scenario.tags);
  return codes.length === 1 ? codes : [];
}

function filesByFeatureCode(features: readonly FeatureAsWritten[]): ReadonlyMap<string, readonly string[]> {
  const files = new Map<string, string[]>();
  for (const feature of features) {
    const featureCode = featureCodeOfFile(feature);
    if (featureCode !== undefined) files.set(featureCode, [...(files.get(featureCode) ?? []), feature.file]);
  }
  return files;
}

function duplicateFeatureCodes(filesByCode: ReadonlyMap<string, readonly string[]>): ClaimCodeError[] {
  return [...filesByCode].flatMap(([featureCode, files]) =>
    files.length < 2 ? [] : [{ kind: "duplicate-feature-code" as const, featureCode, files }],
  );
}

function misfiledCodes(feature: FeatureAsWritten, filesByCode: ReadonlyMap<string, readonly string[]>): ClaimCodeError[] {
  const carried = feature.scenarios.flatMap(codesCarriedBy);
  const featureCode = featureCodeOfFile(feature);
  if (featureCode === undefined) return carried.length === 0 ? [] : [{ kind: "no-feature-code", files: [feature.file] }];
  return carried
    .filter((code) => code.featureCode !== featureCode)
    .map((code) => ({
      kind: "foreign-claim-code" as const,
      files: [feature.file],
      featureCode,
      claimCode: written(code),
      namedFeatureCode: code.featureCode,
      namedFeatureFiles: filesByCode.get(code.featureCode) ?? [],
    }));
}

function codesOnOneScenario(file: string, scenario: ScenarioAsWritten): ClaimCodeError[] {
  const tagged = claimCodesIn([...scenario.tags, ...(scenario.rows ? scenario.examplesTags : [])]).map(written);
  const codes = [...new Set(tagged)];
  if (scenario.rows) return codes.length === 0 ? [] : [{ kind: "claim-code-beside-clm-column", files: [file], scenario: scenario.title, codes }];
  return codes.length < 2 ? [] : [{ kind: "several-claim-codes", files: [file], scenario: scenario.title, codes }];
}

export function claimCodeErrorsOf(features: readonly FeatureAsWritten[]): ClaimCodeError[] {
  const filesByCode = filesByFeatureCode(features);
  return [
    ...duplicateFeatureCodes(filesByCode),
    ...features.flatMap((feature) => misfiledCodes(feature, filesByCode)),
    ...features.flatMap(({ file, scenarios }) => scenarios.flatMap((scenario) => codesOnOneScenario(file, scenario))),
  ];
}

const CITATION = /\[(CLM-[A-Z0-9]{2,5}-\d+)\]/g;

export function claimCodeCitationsIn(text: string): ClaimCode[] {
  return [...text.matchAll(CITATION)].flatMap((match) => claimCodeFrom(match[1]!) ?? []);
}

export interface ClaimCodeOccurrence {
  readonly text: string;
  readonly path: string;
  readonly line: number;
  readonly commit?: string;
}

export interface AllocationRequest {
  readonly featureCode: string;
  readonly featureCodes: readonly string[];
  readonly isNew: boolean;
}

interface HighestSeen {
  readonly code: string;
  readonly occurrence: ClaimCodeOccurrence;
}

export interface Allocation {
  readonly kind: "allocated";
  readonly featureCode: string;
  readonly code: string;
  readonly highest?: HighestSeen;
  readonly alreadyHeaded?: true;
}

export interface UnknownFeatureCode {
  readonly kind: "unknown-feature-code";
  readonly featureCode: string;
  readonly featureCodes: readonly string[];
}

// A number a retired scenario code had is never handed out again.
const COUNTED_CODE = /(?:CLM|SCN)-([A-Z0-9]{2,5})-\d+/g;

const NUMBER_WIDTH = 3;

export function claimCodeMarksFor(featureCode: string): readonly string[] {
  return [`CLM-${featureCode}-`, `SCN-${featureCode}-`];
}

const numberOf = (code: string): number => Number(code.slice(code.lastIndexOf("-") + 1));

function outranks(code: string, occurrence: ClaimCodeOccurrence, highest: HighestSeen): boolean {
  const difference = numberOf(code) - numberOf(highest.code);
  return difference > 0 || (difference === 0 && occurrence.commit === undefined && highest.occurrence.commit !== undefined);
}

function highestOf(featureCode: string, occurrences: readonly ClaimCodeOccurrence[]): HighestSeen | undefined {
  let highest: HighestSeen | undefined;
  for (const occurrence of occurrences) {
    for (const [code, counted] of occurrence.text.matchAll(COUNTED_CODE)) {
      if (counted === featureCode && (highest === undefined || outranks(code, occurrence, highest))) highest = { code, occurrence };
    }
  }
  return highest;
}

export function nextClaimCode(request: AllocationRequest, occurrences: readonly ClaimCodeOccurrence[]): Allocation | UnknownFeatureCode {
  const { featureCode, featureCodes, isNew } = request;
  const headed = featureCodes.includes(featureCode);
  if (!headed && !isNew) return { kind: "unknown-feature-code", featureCode, featureCodes: [...new Set(featureCodes)].sort() };
  const highest = highestOf(featureCode, occurrences);
  const next = (highest === undefined ? 0 : numberOf(highest.code)) + 1;
  const code = written({ featureCode, number: String(next).padStart(NUMBER_WIDTH, "0") });
  return { kind: "allocated", featureCode, code, ...(highest && { highest }), ...(headed && isNew && { alreadyHeaded: true as const }) };
}
