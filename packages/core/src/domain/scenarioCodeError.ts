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
