import type { Ledger } from "./ledger.js";
import { hasBrokenEvidence, hasNothingToReconcile, hasPendingItems, isBalanced } from "./ledger.js";
import { hasScenarioCodeErrors, type ScenarioCodeError } from "./scenarioCodeError.js";

export type VerdictCode = 0 | 1 | 3 | 4 | 5;

export interface VerdictInputs {
  readonly ledger: Ledger;
  readonly scenarioCodeErrors?: readonly ScenarioCodeError[];
  readonly strict: boolean;
}

export function verdictCode(run: VerdictInputs): VerdictCode {
  if (hasNothingToReconcile(run.ledger)) return 5;
  if (hasBrokenEvidence(run.ledger)) return 4;
  if (hasScenarioCodeErrors(run)) return 1;
  if (!isBalanced(run.ledger)) return 1;
  if (run.strict && hasPendingItems(run.ledger)) return 3;
  return 0;
}
