import type { Outcome } from "./qualityCheckReconciliation.js";
import type { ClaimReconciliation, ReconciliationLine } from "./claimReconciliation.js";
import {
  linesOf,
  observationsOf,
  reconcilingItemsOf,
} from "./claimReconciliation.js";
import type {
  Layer,
  FitnessEvidenceObservation,
  QualityCheckKind,
} from "./journal.js";
import { QUALITY_CHECK_KINDS, ranAsFitnessFunction } from "./journal.js";
import type { ClaimKind } from "./claimKind.js";

export interface Ledger {
  readonly claimReconciliations: readonly ClaimReconciliation[];
}

export function isBalanced(ledger: Ledger): boolean {
  return ledger.claimReconciliations.every(
    (row) => reconcilingItemsOf(row).length === 0
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

export function brokenItemsOf(ledger: Ledger): ReconciliationLine[] {
  return ledger.claimReconciliations.flatMap((row) =>
    reconcilingItemsOf(row).filter((item) => item.outcome === "broken")
  );
}

export interface ClaimReconciliationTotals {
  readonly total: number;
  readonly balanced: number;
  readonly outOfBalance: number;
  readonly phantomClaim: number;
  readonly unnamedClaim: number;
}

export interface MissingByQualityCheckKind {
  readonly qualityCheckKind: QualityCheckKind;
  readonly count: number;
}

export interface ReconciliationLineTotals {
  readonly total: number;
  readonly byOutcome: Record<Outcome, number>;
  readonly outOfBalance: number;
  readonly missingByQualityCheckKind: readonly MissingByQualityCheckKind[];
}

export interface LedgerTally {
  readonly claimReconciliations: ClaimReconciliationTotals;
  readonly reconciliationLines: ReconciliationLineTotals;
  readonly pending: number;
}

export function ledgerTally(ledger: Ledger): LedgerTally {
  const { claimReconciliations, pending } = claimReconciliationTally(ledger);
  const reconciliationLines = reconciliationLineTotals(ledger);
  return {
    claimReconciliations,
    reconciliationLines,
    pending,
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

function reconciliationLineTotals(ledger: Ledger): ReconciliationLineTotals {
  const byOutcome: Record<Outcome, number> = {
    satisfied: 0,
    "missing": 0,
    "failing": 0,
    "watermelon": 0,
    "cites-unknown-scenario": 0,
    "cites-no-scenario": 0,
    "no-claim-code": 0,
    "duplicate-claim-code": 0,
    "broken": 0,
    "no-evidence-obligation": 0,
    "both-missing": 0,
  };
  const missing = new Map<string, number>();
  for (const s of ledger.claimReconciliations) {
    for (const line of s.qualityCheckReconciliations.flatMap(linesOf)) {
      byOutcome[line.outcome]++;
      if (line.outcome === "missing" && line.qualityCheckKind) {
        missing.set(line.qualityCheckKind, (missing.get(line.qualityCheckKind) ?? 0) + 1);
      }
    }
  }
  const total = (Object.values(byOutcome) as number[]).reduce((a, b) => a + b, 0);
  return {
    total,
    byOutcome,
    outOfBalance: total - byOutcome.satisfied,
    missingByQualityCheckKind: QUALITY_CHECK_KINDS.filter((s) => (missing.get(s) ?? 0) > 0).map(
      (qualityCheckKind) => ({ qualityCheckKind, count: missing.get(qualityCheckKind)! })
    ),
  };
}

export const LAYERS: readonly Layer[] = QUALITY_CHECK_KINDS.filter(
  (qualityCheckKind): qualityCheckKind is Layer => qualityCheckKind !== "fitness"
);

export const QUALITY_CHECK_KINDS_FITNESS_LAST: readonly QualityCheckKind[] = [...LAYERS, "fitness"];

export interface BehaviouralObservationTally {
  readonly rawByLayer: Record<Layer, number>;
  readonly total: number;
  readonly onScenario: number;
  readonly onPhantomClaim: number;
  readonly onUnnamedClaim: number;
}

export function behaviouralObservationTally(ledger: Ledger): BehaviouralObservationTally {
  const rawByLayer: Record<Layer, number> = {
    unit: 0,
    integration: 0,
    e2e: 0,
    performance: 0,
  };
  let onScenario = 0;
  let onPhantomClaim = 0;
  let onUnnamedClaim = 0;

  for (const row of ledger.claimReconciliations) {
    for (const observation of observationsOf(row)) {
      if (observation.qualityCheckKind === "fitness") continue;
      rawByLayer[observation.qualityCheckKind]++;
      if (row.kind === "phantom-claim") onPhantomClaim++;
      else if (row.kind === "unnamed-claim") onUnnamedClaim++;
      else onScenario++;
    }
  }

  const total = LAYERS.reduce((n, layer) => n + rawByLayer[layer], 0);

  return { rawByLayer, total, onScenario, onPhantomClaim, onUnnamedClaim };
}

export function runningFitnessObservations(ledger: Ledger): FitnessEvidenceObservation[] {
  return ledger.claimReconciliations.flatMap((row) =>
    observationsOf(row).flatMap((observation) => (ranAsFitnessFunction(observation) ? [observation] : []))
  );
}

export interface FitnessFunctionTally {
  readonly runningFitnessFunctionCount: number;
  readonly uncitedFitnessFunctionCount: number;
}

export function fitnessFunctionTally(ledger: Ledger): FitnessFunctionTally {
  let runningFitnessFunctionCount = 0;
  let uncitedFitnessFunctionCount = 0;
  for (const row of ledger.claimReconciliations) {
    for (const observation of observationsOf(row)) {
      if (!ranAsFitnessFunction(observation)) continue;
      runningFitnessFunctionCount++;
      if (row.kind === "unnamed-claim") uncitedFitnessFunctionCount++;
    }
  }

  return { runningFitnessFunctionCount, uncitedFitnessFunctionCount };
}

export interface QualityCheckKindObservations {
  readonly qualityCheckKind: QualityCheckKind;
  readonly count: number;
  readonly runner?: string | null;
  readonly ciSteps?: readonly string[];
}

export type RunnerSteps = { readonly kind: "none" } | { readonly kind: "some"; readonly ciSteps: readonly [string, ...(readonly string[])] };

export function runnerSteps({ ciSteps }: QualityCheckKindObservations): RunnerSteps {
  const [first, ...rest] = ciSteps ?? [];
  if (first === undefined) return { kind: "none" };
  return { kind: "some", ciSteps: [first, ...rest] };
}

export interface EvidenceObservationTally {
  readonly total: number;
  readonly onScenario: number;
  readonly onPhantomClaim: number;
  readonly onUnnamedClaim: number;
  readonly byQualityCheckKind: readonly QualityCheckKindObservations[];
}

export function evidenceObservationTally(ledger: Ledger): EvidenceObservationTally {
  const behavioural = behaviouralObservationTally(ledger);
  const ranByKind: Record<ClaimKind, number> = { scenario: 0, "phantom-claim": 0, "unnamed-claim": 0 };
  for (const row of ledger.claimReconciliations) {
    ranByKind[row.kind] += observationsOf(row).filter(ranAsFitnessFunction).length;
  }
  const ran = ranByKind.scenario + ranByKind["phantom-claim"] + ranByKind["unnamed-claim"];

  return {
    total: behavioural.total + ran,
    onScenario: behavioural.onScenario + ranByKind.scenario,
    onPhantomClaim: behavioural.onPhantomClaim + ranByKind["phantom-claim"],
    onUnnamedClaim: behavioural.onUnnamedClaim + ranByKind["unnamed-claim"],
    byQualityCheckKind: QUALITY_CHECK_KINDS_FITNESS_LAST.map((qualityCheckKind) => ({
      qualityCheckKind,
      count: qualityCheckKind === "fitness" ? ran : behavioural.rawByLayer[qualityCheckKind],
    })),
  };
}
