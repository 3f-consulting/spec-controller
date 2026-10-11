import type { Outcome, QualityCheckReconciliation } from "./qualityCheckReconciliation.js";
import type { ScenarioReconciliation } from "./scenarioReconciliation.js";
import { fitnessFunctionReconciliationsOf, isScenario } from "./scenarioReconciliation.js";
import type { RuntimeQualityCheck, FitnessEvidenceObservation } from "./journal.js";

export interface Ledger {
  readonly scenarioReconciliations: readonly ScenarioReconciliation[];
}

export function isBalanced(reconciliation: Ledger): boolean {
  return reconciliation.scenarioReconciliations.every(
    (row) => row.reconcilingItems.length === 0
  );
}

export function hasPendingItems(reconciliation: Ledger): boolean {
  return reconciliation.scenarioReconciliations.some((row) => row.pendingItems.length > 0);
}

export function hasBrokenEvidence(reconciliation: Ledger): boolean {
  return brokenItemsOf(reconciliation).length > 0;
}

export function hasNothingToReconcile(reconciliation: Ledger): boolean {
  return reconciliation.scenarioReconciliations.length === 0;
}

export function brokenItemsOf(reconciliation: Ledger): QualityCheckReconciliation[] {
  return reconciliation.scenarioReconciliations.flatMap((row) =>
    row.reconcilingItems.filter((item) => item.outcome === "broken")
  );
}

export function fitnessReconciliationsOf(
  reconciliation: Ledger
): { scnId: string; reconciliation: QualityCheckReconciliation }[] {
  return reconciliation.scenarioReconciliations
    .filter(isScenario)
    .flatMap((row) =>
      fitnessFunctionReconciliationsOf(row).map((r) => ({ scnId: row.scnId, reconciliation: r }))
    );
}

export interface ScenarioReconciliationTotals {
  readonly total: number;
  readonly balanced: number;
  readonly outOfBalance: number;
  readonly phantom: number;
  readonly suspense: number;
}

export interface MissingByQualityCheck {
  readonly subject: string;
  readonly count: number;
}

export interface EvidenceObligationTotals {
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
  readonly scenarioReconciliations: ScenarioReconciliationTotals;
  readonly evidenceObligations: EvidenceObligationTotals;
  readonly pending: number;
  readonly fitness: FitnessTally;
}

const QUALITY_CHECK_ORDER: readonly string[] = ["fitness", "unit", "integration", "e2e", "performance"];

export function ledgerTally(balance: Ledger): LedgerTally {
  const { scenarioReconciliations, pending } = scenarioReconciliationTally(balance);
  return {
    scenarioReconciliations,
    evidenceObligations: evidenceObligationTotals(balance),
    pending,
    fitness: fitnessTally(balance),
  };
}

function scenarioReconciliationTally(balance: Ledger): {
  scenarioReconciliations: ScenarioReconciliationTotals;
  pending: number;
} {
  const verdict: Record<"balanced" | "out-of-balance", number> = { balanced: 0, "out-of-balance": 0 };
  let phantom = 0;
  let suspense = 0;
  let pending = 0;
  for (const s of balance.scenarioReconciliations) {
    pending += s.pendingItems.length;
    if (s.kind === "phantom-scenario") phantom++;
    if (s.kind === "suspense-scenario") suspense++;
    verdict[s.verdict]++;
  }
  return {
    scenarioReconciliations: {
      total: verdict.balanced + verdict["out-of-balance"],
      balanced: verdict.balanced,
      outOfBalance: verdict["out-of-balance"],
      phantom,
      suspense,
    },
    pending,
  };
}

function evidenceObligationTotals(balance: Ledger): EvidenceObligationTotals {
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
  for (const s of balance.scenarioReconciliations) {
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
    missingByQualityCheck: QUALITY_CHECK_ORDER.filter((s) => (missing.get(s) ?? 0) > 0).map(
      (subject) => ({ subject, count: missing.get(subject)! })
    ),
  };
}

export function fitnessTally(balance: Ledger): FitnessTally {
  const fitness = fitnessReconciliationsOf(balance);
  return {
    satisfied: fitness.filter(({ reconciliation }) => reconciliation.outcome === "satisfied").length,
    total: fitness.length,
  };
}

export const RUNTIME_QUALITY_CHECKS: readonly RuntimeQualityCheck[] = ["unit", "integration", "e2e", "performance"];

export interface RuntimeObservationTally {
  readonly rawByRuntimeQualityCheck: Record<RuntimeQualityCheck, number>;
  readonly total: number;
  readonly onScenario: number;
  readonly onPhantomScenario: number;
  readonly onSuspenseScenario: number;
}

export function runtimeObservationTally(ledger: Ledger): RuntimeObservationTally {
  const rawByRuntimeQualityCheck: Record<RuntimeQualityCheck, number> = {
    unit: 0,
    integration: 0,
    e2e: 0,
    performance: 0,
  };
  let onScenario = 0;
  let onPhantomScenario = 0;
  let onSuspenseScenario = 0;

  for (const row of ledger.scenarioReconciliations) {
    for (const observation of row.evidenceObservations) {
      if (observation.qualityCheck === "fitness") continue;
      rawByRuntimeQualityCheck[observation.qualityCheck]++;
      if (row.kind === "phantom-scenario") onPhantomScenario++;
      else if (row.kind === "suspense-scenario") onSuspenseScenario++;
      else onScenario++;
    }
  }

  const total = RUNTIME_QUALITY_CHECKS.reduce((n, qc) => n + rawByRuntimeQualityCheck[qc], 0);

  return { rawByRuntimeQualityCheck, total, onScenario, onPhantomScenario, onSuspenseScenario };
}

export interface FitnessFunctionTally {
  readonly runningFitnessFunctionCount: number;
  readonly uncitedFitnessFunctionCount: number;
}

export function fitnessFunctionTally(ledger: Ledger): FitnessFunctionTally {
  let runningFitnessFunctionCount = 0;
  let uncitedFitnessFunctionCount = 0;
  for (const row of ledger.scenarioReconciliations) {
    for (const observation of row.evidenceObservations) {
      if (observation.qualityCheck !== "fitness") continue;
      if (observation.broken === true) continue;
      if (!observation.exists) continue;
      runningFitnessFunctionCount++;
      if (row.kind === "suspense-scenario") uncitedFitnessFunctionCount++;
    }
  }

  return { runningFitnessFunctionCount, uncitedFitnessFunctionCount };
}
