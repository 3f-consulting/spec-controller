import { isFitnessObservation } from "./journal.js";
import type { Outcome, QualityCheckReconciliation } from "./qualityCheckReconciliation.js";
import { linesOf, type ReconciliationLine } from "./claimReconciliation.js";

/** Each Reconciliation line of these reconciliations as the fitness functions it carries and its outcome. */
export function lineReadingsOf(reconciliations: readonly QualityCheckReconciliation[]): [string[], Outcome][] {
  return readingsOf(reconciliations.flatMap(linesOf));
}

export function readingsOf(lines: readonly ReconciliationLine[]): [string[], Outcome][] {
  return lines.map((line) => [
    line.evidenceObservation !== undefined && isFitnessObservation(line.evidenceObservation)
      ? [line.evidenceObservation.fitnessFunction]
      : [],
    line.outcome,
  ]);
}
