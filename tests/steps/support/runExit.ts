import assert from "node:assert/strict";

const OUTCOME_EXIT: Readonly<Record<string, number>> = {
  "the balanced verdict": 0,
  success: 0,
  "the out-of-balance verdict": 1,
  "the scenario-code-errors verdict": 1,
  "a usage error": 2,
  "the pending verdict": 3,
  "the unsound verdict": 4,
  "the nothing-to-reconcile verdict": 5,
};

const HEADLINE_EXIT: Readonly<Record<string, number>> = {
  BALANCED: 0,
  "OUT-OF-BALANCE": 1,
  PENDING: 3,
  UNSOUND: 4,
};

export const RUN_OUTCOME = Object.keys(OUTCOME_EXIT).join("|");

export function exitOn(outcome: string): number {
  const code = OUTCOME_EXIT[outcome];
  assert.ok(code !== undefined, `no exit is named for "${outcome}"`);
  return code;
}

export function exitNamedBy(headlineWord: string): number {
  const code = HEADLINE_EXIT[headlineWord];
  assert.ok(code !== undefined, `no exit is named for the headline word ${headlineWord}`);
  return code;
}
