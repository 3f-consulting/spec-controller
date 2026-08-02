/**
 * Types for `complexityExceptionsReconciliation.mjs` (@SCN-CPX-003, 3F-2318) — THE RATCHET.
 *
 * A sibling of `complexityThresholds.d.mts` / `complexityExceptions.d.mts` and for the same reason:
 * eslint loads its flat config through Node's own ESM loader, so anything the config's own machinery
 * touches stays plain ESM with its types beside it. That also lets the Cucumber steps, the @unit
 * evidence and the CLI import ONE module with no loader in the middle.
 */

import type { ComplexityException, ExceptionRule } from "./complexityExceptions.d.mts";

export type { ComplexityException, ExceptionRule };

/**
 * One file's WORST measured value for one rule, as eslint reported it at the bare standard.
 *
 * A pair appears here only when it EXCEEDS the standard — eslint emits no message otherwise — so the
 * ABSENCE of a file/rule pair means "under the standard", which is exactly what a stale entry looks
 * like from this side.
 */
export interface MeasuredValue {
  /** Repo-relative path, in the form `complexityExceptions.mjs` records. */
  path: string;
  /** The eslint rule this value was measured against. */
  rule: ExceptionRule;
  /** The worst offender in that file for that rule. */
  value: number;
}

/**
 * The three ways a recorded entry can disagree with the tree. Each is a DIFFERENT fault with a
 * different fix, so each carries its own sentence rather than a shared "mismatch".
 */
export type DisagreementKind =
  /** Measured above recorded: the file has grown, and the debt is silently rising. */
  | "regression"
  /** Measured below recorded: an improvement nobody banked. Edit the entry down — THE RATCHET. */
  | "improvement-not-banked"
  /** No longer over the standard at all: delete the entry, and the list shrinks. */
  | "stale-entry";

/** One recorded entry that no longer states the measured truth. */
export interface Disagreement {
  path: string;
  rule: ExceptionRule;
  /** The value the exception list records. */
  recorded: number;
  /** The value eslint measured, or `null` when the file no longer exceeds the standard. */
  measured: number | null;
  kind: DisagreementKind;
  /** The red's sentence: names the file, the rule, the recorded value and the measured value. */
  message: string;
}

/** The subset of an eslint message this reconciliation reads. */
export interface LintMessage {
  ruleId: string | null;
  message: string;
}

/** The subset of an eslint per-file result this reconciliation reads. */
export interface LintFileResult {
  /** Absolute path, as eslint reports it. */
  filePath: string;
  messages: readonly LintMessage[];
}

/**
 * Read one rule's measured value out of one eslint message. THROWS when extraction fails, because a
 * silent null is the exact failure mode that would let a third of the list reconcile against nothing
 * and pass.
 */
export declare function measuredValueFrom(rule: ExceptionRule, message: string): number;

/**
 * Collapse eslint's per-message results into one WORST value per file per rule, with paths
 * relativised against the repo root. Throws on any message it cannot attribute to one of the three
 * rules — an unrecognised finding means the config or the parse has moved, and guessing hides it.
 */
export declare function worstMeasuredValues(
  results: readonly LintFileResult[],
  root: string,
): readonly MeasuredValue[];

/** Join the recorded list against the measured tree and name every disagreement. */
export declare function reconcileExceptions(
  recorded: readonly ComplexityException[],
  measured: readonly MeasuredValue[],
): readonly Disagreement[];

/** Run eslint at the bare standard over the measured population and collapse the findings. */
export declare function measureTreeAtBareStandard(root: string): Promise<readonly MeasuredValue[]>;

/**
 * The module's own runtime surface, named as a type so the @unit evidence can assert each export is
 * PRESENT with a sentence instead of dying on an ESM link error before a single assertion runs — the
 * same reason `complexityThreshold.test.ts` reaches its module through a namespace.
 */
export interface ReconciliationModule {
  measuredValueFrom: typeof measuredValueFrom;
  worstMeasuredValues: typeof worstMeasuredValues;
  reconcileExceptions: typeof reconcileExceptions;
  measureTreeAtBareStandard: typeof measureTreeAtBareStandard;
}
