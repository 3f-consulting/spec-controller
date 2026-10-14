import { CORE_MESSAGES, CoreMessage } from "./messages.js";

export type ScenarioCodeErrorKind =
  | "foreign-scn-code"
  | "no-feature-code"
  | "duplicate-feature-code"
  | "several-scn-codes";

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

type ErrorsAre = "misfilings" | "several-codes" | "both";

function errorsAre(errors: readonly ScenarioCodeError[]): ErrorsAre {
  const several = errors.filter((error) => error.kind === "several-scn-codes").length;
  if (several === 0) return "misfilings";
  return several === errors.length ? "several-codes" : "both";
}

export function scenarioCodeErrorsFraming(errors: readonly ScenarioCodeError[], count: string): string {
  switch (errorsAre(errors)) {
    case "misfilings":
      return CORE_MESSAGES[CoreMessage.ScenarioCodeErrorsFraming](count);
    case "several-codes":
      return CORE_MESSAGES[CoreMessage.SeveralScnCodesFraming](count);
    case "both":
      return CORE_MESSAGES[CoreMessage.MisfiledAndSeveralScnCodesFraming](count);
  }
}

export function scenarioCodeErrorsGloss(errors: readonly ScenarioCodeError[], alsoOutOfBalance: string): string {
  switch (errorsAre(errors)) {
    case "misfilings":
      return CORE_MESSAGES[CoreMessage.ScenarioCodeErrorsGloss](alsoOutOfBalance);
    case "several-codes":
      return CORE_MESSAGES[CoreMessage.SeveralScnCodesGloss](alsoOutOfBalance);
    case "both":
      return CORE_MESSAGES[CoreMessage.MisfiledAndSeveralScnCodesGloss](alsoOutOfBalance);
  }
}
