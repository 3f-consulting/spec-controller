import type { Ledger } from "./ledger.js";
import { hasBrokenEvidence, hasNothingToReconcile, hasPendingItems, isBalanced } from "./ledger.js";
import { hasScenarioCodeErrors, type ClaimCodeError } from "./scnTags.js";

export type RunVerdict =
  | "nothing-to-reconcile"
  | "unsound"
  | "claim-code-errors"
  | "out-of-balance"
  | "pending"
  | "balanced";

export interface VerdictInputs {
  readonly ledger: Ledger;
  readonly claimCodeErrors?: readonly ClaimCodeError[];
  readonly strict: boolean;
}

export function runVerdict(run: VerdictInputs): RunVerdict {
  if (hasNothingToReconcile(run.ledger)) return "nothing-to-reconcile";
  if (hasBrokenEvidence(run.ledger)) return "unsound";
  if (hasScenarioCodeErrors(run)) return "claim-code-errors";
  if (!isBalanced(run.ledger)) return "out-of-balance";
  if (run.strict && hasPendingItems(run.ledger)) return "pending";
  return "balanced";
}
