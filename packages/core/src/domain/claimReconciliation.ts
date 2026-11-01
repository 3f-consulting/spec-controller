import type {
  EvidenceObligation,
  PendingItem,
  QualityCheckKind,
} from "./journal.js";
import { QUALITY_CHECK_KINDS, evidenceObligationsOf, ranAsFitnessFunction } from "./journal.js";
import type { ClaimKind } from "./claimKind.js";
import type { Outcome, QualityCheckReconciliation, ReconciledEvidenceObservation, ScenarioName } from "./qualityCheckReconciliation.js";
import { bothMissingReconciliation, carriesEvidenceObligation, isObligationLineOutcome } from "./qualityCheckReconciliation.js";

export type Verdict = "balanced" | "out-of-balance";

export type { ClaimKind } from "./claimKind.js";

export const UNNAMED_CLAIM_ID = "(unnamed claim)";

export interface ClaimReconciliation {
  readonly claim: string;
  readonly kind: ClaimKind;
  readonly verdict: Verdict;
  readonly qualityCheckReconciliations: readonly QualityCheckReconciliation[];
  readonly pendingItems: readonly PendingItem[];
}

/** One Reconciliation line of a Quality Check Reconciliation: its obligation's own, or one evidence observation's. */
export interface ReconciliationLine {
  readonly qualityCheckKind?: QualityCheckKind;
  readonly outcome: Outcome;
  readonly evidenceObligation?: EvidenceObligation;
  readonly evidenceObservation?: ReconciledEvidenceObservation;
  readonly scenario?: ScenarioName;
}

function observationLineOf(
  reconciliation: QualityCheckReconciliation,
  observation: ReconciledEvidenceObservation
): ReconciliationLine {
  const carriesObligation = carriesEvidenceObligation(reconciliation, observation);
  return {
    ...(reconciliation.qualityCheckKind === undefined ? {} : { qualityCheckKind: reconciliation.qualityCheckKind }),
    outcome: observation.outcome,
    ...(carriesObligation ? { evidenceObligation: reconciliation.evidenceObligation } : {}),
    evidenceObservation: observation,
  };
}

/** A Quality Check Reconciliation's lines: its own outcome's, when it has one, then each evidence observation's. */
export function linesOf(reconciliation: QualityCheckReconciliation): ReconciliationLine[] {
  const own: ReconciliationLine[] =
    !isObligationLineOutcome(reconciliation.outcome)
      ? []
      : [
          {
            ...(reconciliation.qualityCheckKind === undefined ? {} : { qualityCheckKind: reconciliation.qualityCheckKind }),
            outcome: reconciliation.outcome,
            ...(reconciliation.evidenceObligation === undefined ? {} : { evidenceObligation: reconciliation.evidenceObligation }),
            ...(reconciliation.scenario === undefined ? {} : { scenario: reconciliation.scenario }),
          },
        ];
  return [
    ...own,
    ...(reconciliation.evidenceObservations ?? []).map((observation) => observationLineOf(reconciliation, observation)),
  ];
}

function unsatisfiedOf(reconciliations: readonly QualityCheckReconciliation[]): ReconciliationLine[] {
  return reconciliations.flatMap(linesOf).filter((line) => line.outcome !== "satisfied");
}

export function verdictFor(reconciliations: readonly QualityCheckReconciliation[]): Verdict {
  return unsatisfiedOf(reconciliations).length === 0 ? "balanced" : "out-of-balance";
}

export function reconcilingItemsOf(row: ClaimReconciliation): readonly ReconciliationLine[] {
  return unsatisfiedOf(row.qualityCheckReconciliations);
}

/** A row's evidence observations: those its Quality Check Reconciliations hold, each once, with its line's outcome. */
export function observationsOf(row: ClaimReconciliation): readonly ReconciledEvidenceObservation[] {
  return row.qualityCheckReconciliations.flatMap((reconciliation) => reconciliation.evidenceObservations ?? []);
}

/** A row's evidence obligations at a quality check, read from its Quality Check Reconciliations: a scenario-scope obligation names none. */
export function obligationsOf(row: ClaimReconciliation): readonly EvidenceObligation[] {
  return row.qualityCheckReconciliations.flatMap(({ evidenceObligation }) =>
    evidenceObligation?.qualityCheckKind === undefined ? [] : [evidenceObligation]
  );
}

export function isScenario(row: ClaimReconciliation): boolean {
  return row.kind === "scenario";
}

export function isPhantomClaim(row: ClaimReconciliation): boolean {
  return row.kind === "phantom-claim";
}

export function isUnnamedClaim(row: ClaimReconciliation): boolean {
  return row.kind === "unnamed-claim";
}

export function isOutOfBalance(row: ClaimReconciliation): boolean {
  return row.verdict === "out-of-balance";
}

export function outOfBalanceCountOf(rows: readonly ClaimReconciliation[]): number {
  return rows.filter(isOutOfBalance).length;
}

export function carriesNoScnCode(row: ClaimReconciliation): boolean {
  return reconcilingItemsOf(row).some((item) => item.outcome === "no-scn-code");
}

export function fitnessFunctionReconciliationsOf(
  row: ClaimReconciliation
): QualityCheckReconciliation[] {
  return row.qualityCheckReconciliations.filter(
    (r) => r.qualityCheckKind === "fitness" && r.evidenceObligation !== undefined
  );
}

/** A row's evidence observations that ran: a broken one never reached its assertions, so backs nothing. */
function ranObservationsOf(row: ClaimReconciliation): readonly ReconciledEvidenceObservation[] {
  return observationsOf(row).filter((o) => o.broken !== true);
}

export function carriesQualityCheckKind(row: ClaimReconciliation, qualityCheckKind: QualityCheckKind): boolean {
  return row.qualityCheckReconciliations.some(
    (r) => r.qualityCheckKind === qualityCheckKind && linesOf(r).some((line) => line.outcome !== "broken")
  );
}

export function namesQualityCheckKind(row: ClaimReconciliation, qualityCheckKind: QualityCheckKind): boolean {
  return evidenceObligationsOf(obligationsOf(row)).some((o) => o.qualityCheckKind === qualityCheckKind);
}

export function observationCountOf(row: ClaimReconciliation, qualityCheckKind: QualityCheckKind): number {
  return ranObservationsOf(row).filter((o) => o.qualityCheckKind === qualityCheckKind).length;
}

type StepsAtQualityCheckKind = { readonly qualityCheckKind: QualityCheckKind; readonly ciSteps?: readonly string[] };

function stepsAt(
  row: ClaimReconciliation,
  qualityCheckKind: QualityCheckKind,
  stepsByQualityCheckKind: readonly StepsAtQualityCheckKind[]
): readonly string[] {
  if (qualityCheckKind === "fitness") {
    return observationsOf(row).flatMap((o) => (ranAsFitnessFunction(o) && o.step !== undefined ? [o.step] : []));
  }
  const observed = observationsOf(row).some((o) => o.qualityCheckKind === qualityCheckKind);
  if (!namesQualityCheckKind(row, qualityCheckKind) && !observed) return [];
  return stepsByQualityCheckKind.find((entry) => entry.qualityCheckKind === qualityCheckKind)?.ciSteps ?? [];
}

/** The CI steps behind each kind of quality check a row obligates or observes, in kind order, each step once. */
export function ciStepsOf(
  row: ClaimReconciliation,
  stepsByQualityCheckKind: readonly StepsAtQualityCheckKind[]
): readonly string[] {
  return [...new Set(QUALITY_CHECK_KINDS.flatMap((qualityCheckKind) => stepsAt(row, qualityCheckKind, stepsByQualityCheckKind)))];
}

export function qualityCheckReconciliationsOf(
  reconciledEvidenceObligations: readonly QualityCheckReconciliation[],
  noEvidenceObligationItems: readonly QualityCheckReconciliation[],
  pendingItems: readonly PendingItem[]
): QualityCheckReconciliation[] {
  const rows = [...reconciledEvidenceObligations, ...noEvidenceObligationItems];
  return rows.length === 0 && pendingItems.length === 0 ? [bothMissingReconciliation()] : rows;
}
