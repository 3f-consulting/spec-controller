/**
 * THE MESSAGE CATALOGUE (@SCN-MSG-001, 3F-2872) — the human-facing prose for every
 * `QualityCheckFaultCode`, and NOTHING ELSE.
 *
 * PURE DATA, DELIBERATELY. This module holds one table and no behaviour at all: the indexing
 * that turns a fault into its sentence lives in `qualityCheckFault.ts`, on the mutated surface,
 * where it belongs. The split is what makes the mutate exclusion honest — "do not mutate this
 * file" is defensible over a table of sentences and indefensible over anything that decides
 * something. A render helper parked here would leave the deciding logic unmutated too, and the
 * exclusion would then hide more than the prose it was granted for. (@SCN-MSG-002, 3F-2873, reads
 * the real stryker config back and reds if the exclusion names anything wider than this file.)
 *
 * TOTALITY IS NOT ASSERTED, IT IS UNCONSTRUCTIBLE. `QualityCheckFaultMessages` is a mapped type
 * over the code union, so the compiler refuses both a code with no message AND a message reaching
 * for a parameter its own fault does not carry. That is the same type-forced totality
 * `OUTCOME_SIDE_PROFILE` and `OUTCOME_DESCRIPTION` already rely on: a new code cannot join the
 * union without stating its sentence here.
 */

import { QualityCheckFaultCode, type QualityCheckFault } from "./qualityCheckFault.js";

/**
 * One renderer per code, each seeing EXACTLY its own fault member.
 *
 * `Extract<…, { code: C }>` narrows per key, so a renderer for the obligation-side code cannot
 * reach a field only the observation-side fault carries — the compiler, not a reviewer, is what
 * keeps each sentence honest about the parameters available to it.
 */
export type QualityCheckFaultMessages = {
  readonly [C in QualityCheckFaultCode]: (fault: Extract<QualityCheckFault, { code: C }>) => string;
};

/**
 * The catalogue. Prose is the one thing in this tree that may be rewritten without a ticket, and
 * this is where it may be rewritten: no test reads these sentences, and no mutant is raised over
 * them once the exclusion lands.
 */
export const QUALITY_CHECK_FAULT_MESSAGES: QualityCheckFaultMessages = {
  [QualityCheckFaultCode.ObligationSideDivergesFromCanon]: (fault) =>
    `QualityCheckReconciliation invariant (@SCN-LDG-030): outcome "${fault.outcome}" requires the ` +
    `evidence obligation (debit) side to be ${fault.required}, but it was ` +
    `${fault.actual}.`,
  [QualityCheckFaultCode.ObservationSideDivergesFromCanon]: (fault) =>
    `QualityCheckReconciliation invariant (@SCN-LDG-030): outcome "${fault.outcome}" requires the ` +
    `evidence observation (credit) side to be ${fault.required}, but it was ` +
    `${fault.actual}.`,
};
