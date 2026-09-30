export type ScenarioCodeErrorKind = "foreign-scn-code" | "no-feature-code" | "duplicate-feature-code";

export interface ScenarioCodeError {
  readonly kind: ScenarioCodeErrorKind;
  readonly files: readonly string[];
  readonly namedFeatureCode?: string;
  readonly namedFeatureFiles?: readonly string[];
  readonly message: string;
}

export interface ScenarioCodePopulation {
  readonly featureFiles: number;
  readonly featureCodes: number;
}

export function hasScenarioCodeErrors(reconciliation: {
  readonly scenarioCodeErrors?: readonly ScenarioCodeError[];
}): boolean {
  return (reconciliation.scenarioCodeErrors ?? []).length > 0;
}
