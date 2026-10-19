import type { Outcome, QualityCheckReconciliation } from "./qualityCheckReconciliation.js";
import type { ClaimReconciliation } from "./claimReconciliation.js";
import { fitnessFunctionReconciliationsOf, isScenario } from "./claimReconciliation.js";
import type { BehaviouralQualityCheck } from "./journal.js";
import { QUALITY_CHECKS } from "./journal.js";

export interface Ledger {
  readonly claimReconciliations: readonly ClaimReconciliation[];
}

export function isBalanced(ledger: Ledger): boolean {
  return ledger.claimReconciliations.every(
    (row) => row.reconcilingItems.length === 0
  );
}

export function hasPendingItems(ledger: Ledger): boolean {
  return ledger.claimReconciliations.some((row) => row.pendingItems.length > 0);
}

export function hasBrokenEvidence(ledger: Ledger): boolean {
  return brokenItemsOf(ledger).length > 0;
}

export function hasNothingToReconcile(ledger: Ledger): boolean {
  return ledger.claimReconciliations.length === 0;
}

export function brokenItemsOf(ledger: Ledger): QualityCheckReconciliation[] {
  return ledger.claimReconciliations.flatMap((row) =>
    row.reconcilingItems.filter((item) => item.outcome === "broken")
  );
}

export function fitnessReconciliationsOf(
  ledger: Ledger
): { scnId: string; reconciliation: QualityCheckReconciliation }[] {
  return ledger.claimReconciliations
    .filter(isScenario)
    .flatMap((row) =>
      fitnessFunctionReconciliationsOf(row).map((r) => ({ scnId: row.scnId, reconciliation: r }))
    );
}

export interface ClaimReconciliationTotals {
  readonly total: number;
  readonly balanced: number;
  readonly outOfBalance: number;
  readonly phantomClaim: number;
  readonly unnamedClaim: number;
}

export interface MissingByQualityCheck {
  readonly subject: string;
  readonly count: number;
}

export interface QualityCheckReconciliationTotals {
  readonly total: number;
  readonly byOutcome: Record<Outcome, number>;
  readonly outOfBalance: number;
  readonly missingByQualityCheck: readonly MissingByQualityCheck[];
}

export interface FitnessTally {
  readonly satisfied: number;
  readonly total: number;
}

export interface LedgerTally {
  readonly claimReconciliations: ClaimReconciliationTotals;
  readonly qualityCheckReconciliations: QualityCheckReconciliationTotals;
  readonly pending: number;
  readonly fitness: FitnessTally;
}

export function ledgerTally(ledger: Ledger): LedgerTally {
  const { claimReconciliations, pending } = claimReconciliationTally(ledger);
  const qualityCheckReconciliations = qualityCheckReconciliationTotals(ledger);
  return {
    claimReconciliations,
    qualityCheckReconciliations,
    pending,
    fitness: fitnessTally(ledger),
  };
}

function claimReconciliationTally(ledger: Ledger): {
  claimReconciliations: ClaimReconciliationTotals;
  pending: number;
} {
  const verdict: Record<"balanced" | "out-of-balance", number> = { balanced: 0, "out-of-balance": 0 };
  let phantomClaim = 0;
  let unnamedClaim = 0;
  let pending = 0;
  for (const s of ledger.claimReconciliations) {
    pending += s.pendingItems.length;
    if (s.kind === "phantom-claim") phantomClaim++;
    if (s.kind === "unnamed-claim") unnamedClaim++;
    verdict[s.verdict]++;
  }
  return {
    claimReconciliations: {
      total: verdict.balanced + verdict["out-of-balance"],
      balanced: verdict.balanced,
      outOfBalance: verdict["out-of-balance"],
      phantomClaim,
      unnamedClaim,
    },
    pending,
  };
}

function qualityCheckReconciliationTotals(ledger: Ledger): QualityCheckReconciliationTotals {
  const byOutcome: Record<Outcome, number> = {
    satisfied: 0,
    "missing": 0,
    "failing": 0,
    "watermelon": 0,
    "cites-unknown-scenario": 0,
    "cites-no-scenario": 0,
    "no-scn-code": 0,
    "duplicate-scn-code": 0,
    "broken": 0,
    "no-evidence-obligation": 0,
    "both-missing": 0,
  };
  const missing = new Map<string, number>();
  for (const s of ledger.claimReconciliations) {
    for (const o of s.qualityCheckReconciliations) {
      byOutcome[o.outcome]++;
      if (o.outcome === "missing" && o.qualityCheck) {
        missing.set(o.qualityCheck, (missing.get(o.qualityCheck) ?? 0) + 1);
      }
    }
  }
  const total = (Object.values(byOutcome) as number[]).reduce((a, b) => a + b, 0);
  return {
    total,
    byOutcome,
    outOfBalance: total - byOutcome.satisfied,
    missingByQualityCheck: QUALITY_CHECKS.filter((s) => (missing.get(s) ?? 0) > 0).map(
      (subject) => ({ subject, count: missing.get(subject)! })
    ),
  };
}

export function fitnessTally(ledger: Ledger): FitnessTally {
  const fitness = fitnessReconciliationsOf(ledger);
  return {
    satisfied: fitness.filter(({ reconciliation }) => reconciliation.outcome === "satisfied").length,
    total: fitness.length,
  };
}

export const BEHAVIOURAL_QUALITY_CHECKS: readonly BehaviouralQualityCheck[] = QUALITY_CHECKS.filter(
  (qualityCheck): qualityCheck is BehaviouralQualityCheck => qualityCheck !== "fitness"
);

export interface BehaviouralObservationTally {
  readonly rawByBehaviouralQualityCheck: Record<BehaviouralQualityCheck, number>;
  readonly total: number;
  readonly onScenario: number;
  readonly onPhantomClaim: number;
  readonly onUnnamedClaim: number;
}

export function behaviouralObservationTally(ledger: Ledger): BehaviouralObservationTally {
  const rawByBehaviouralQualityCheck: Record<BehaviouralQualityCheck, number> = {
    unit: 0,
    integration: 0,
    e2e: 0,
    performance: 0,
  };
  let onScenario = 0;
  let onPhantomClaim = 0;
  let onUnnamedClaim = 0;

  for (const row of ledger.claimReconciliations) {
    for (const observation of row.evidenceObservations) {
      if (observation.qualityCheck === "fitness") continue;
      rawByBehaviouralQualityCheck[observation.qualityCheck]++;
      if (row.kind === "phantom-claim") onPhantomClaim++;
      else if (row.kind === "unnamed-claim") onUnnamedClaim++;
      else onScenario++;
    }
  }

  const total = BEHAVIOURAL_QUALITY_CHECKS.reduce((n, qc) => n + rawByBehaviouralQualityCheck[qc], 0);

  return { rawByBehaviouralQualityCheck, total, onScenario, onPhantomClaim, onUnnamedClaim };
}

export interface FitnessFunctionTally {
  readonly runningFitnessFunctionCount: number;
  readonly uncitedFitnessFunctionCount: number;
}

export function fitnessFunctionTally(ledger: Ledger): FitnessFunctionTally {
  let runningFitnessFunctionCount = 0;
  let uncitedFitnessFunctionCount = 0;
  for (const row of ledger.claimReconciliations) {
    for (const observation of row.evidenceObservations) {
      if (observation.qualityCheck !== "fitness") continue;
      if (observation.broken === true) continue;
      if (!observation.exists) continue;
      runningFitnessFunctionCount++;
      if (row.kind === "unnamed-claim") uncitedFitnessFunctionCount++;
    }
  }

  return { runningFitnessFunctionCount, uncitedFitnessFunctionCount };
}
