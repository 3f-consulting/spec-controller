/**
 * The whole-run verdict as the enumerated status a consumer's pipeline branches on. The live run's
 * exit, a re-render's exit and the headline both print all read this one ladder, so none can name a
 * code another does not give.
 */

import type { Ledger } from "./ledger.js";
import { hasBrokenEvidence, hasNothingToReconcile, hasPendingItems, isBalanced } from "./ledger.js";
import { hasScenarioCodeErrors, type ScenarioCodeError } from "./scenarioCodeError.js";

/** The statuses a verdict maps to. `2` is a usage fault and is never reached by a verdict. */
export type VerdictCode = 0 | 1 | 3 | 4 | 5;

/** What the verdict is read from: the accounts, the corpus's code errors, and the run's strictness. */
export interface VerdictInputs {
  readonly ledger: Ledger;
  readonly scenarioCodeErrors?: readonly ScenarioCodeError[];
  readonly strict: boolean;
}

export function verdictCode(run: VerdictInputs): VerdictCode {
  // The order is load-bearing. An empty ledger is vacuously balanced, so its own code has to come
  // before the default rather than after it. A broken run is always out of balance too (its item
  // sits on the suspense row), so asking balance first would make unsound unreachable. A misfiled
  // code leaves every account reconciling, so balance alone would pass it.
  if (hasNothingToReconcile(run.ledger)) return 5;
  if (hasBrokenEvidence(run.ledger)) return 4;
  if (hasScenarioCodeErrors(run)) return 1;
  if (!isBalanced(run.ledger)) return 1;
  if (run.strict && hasPendingItems(run.ledger)) return 3;
  return 0;
}
