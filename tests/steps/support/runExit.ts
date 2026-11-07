import assert from "node:assert/strict";
import type { VerdictHeadlineEntry } from "./reportLines.js";

const OUTCOME_EXIT: Readonly<Record<string, number>> = {
  "the balanced verdict": 0,
  success: 0,
  "the out-of-balance verdict": 1,
  "the claim-code-errors verdict": 1,
  "a usage error": 2,
  "the pending verdict": 3,
  "the unsound verdict": 4,
  "the nothing-to-reconcile verdict": 5,
};

export interface NamedHeadline {
  readonly headline: VerdictHeadlineEntry;
  readonly exit: number;
}

const HEADLINE_NAMED: Readonly<Record<string, NamedHeadline>> = {
  BALANCED: { headline: "balanced-headline", exit: 0 },
  "OUT-OF-BALANCE": { headline: "out-of-balance-headline", exit: 1 },
  PENDING: { headline: "pending-headline", exit: 3 },
  UNSOUND: { headline: "unsound-headline", exit: 4 },
};

export const RUN_OUTCOME = Object.keys(OUTCOME_EXIT).join("|");

export function exitOn(outcome: string): number {
  const code = OUTCOME_EXIT[outcome];
  assert.ok(code !== undefined, `no exit is named for "${outcome}"`);
  return code;
}

export function headlineNamedBy(headlineWord: string): NamedHeadline {
  const named = HEADLINE_NAMED[headlineWord];
  assert.ok(named !== undefined, `the word ${headlineWord} names no headline`);
  return named;
}
