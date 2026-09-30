import type { Outcome, QualityCheckReconciliation } from "./qualityCheckReconciliation.js";
import type { ScenarioReconciliation } from "./scenarioReconciliation.js";
import { staticCheckReconciliationsOf, isScenario } from "./scenarioReconciliation.js";
import type { RuntimeQualityCheck, FitnessEvidenceObservation } from "./journal.js";

export interface Ledger {
  scenarioReconciliations: ScenarioReconciliation[];
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
      staticCheckReconciliationsOf(row).map((r) => ({ scnId: row.scnId, reconciliation: r }))
    );
}

export interface ScenarioReconciliationTotals {
  total: number;
  balanced: number;
  outOfBalance: number;
  phantom: number;
  suspense: number;
}

export interface MissingByQualityCheck {
  subject: string;
  count: number;
}

export interface EvidenceObligationTotals {
  total: number;
  byOutcome: Record<Outcome, number>;
  outOfBalance: number;
  missingByQualityCheck: MissingByQualityCheck[];
}

export interface FitnessTally {
  satisfied: number;
  total: number;
}

export interface LedgerTally {
  scenarioReconciliations: ScenarioReconciliationTotals;
  evidenceObligations: EvidenceObligationTotals;
  pending: number;
  fitness: FitnessTally;
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
  rawByRuntimeQualityCheck: Record<RuntimeQualityCheck, number>;
  total: number;
  onScenario: number;
  onPhantomScenario: number;
  onSuspenseScenario: number;
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
    for (const obs of row.evidenceObservations) {
      if (obs.qualityCheck === "fitness") continue;
      rawByRuntimeQualityCheck[obs.qualityCheck]++;
      if (row.kind === "phantom-scenario") onPhantomScenario++;
      else if (row.kind === "suspense-scenario") onSuspenseScenario++;
      else onScenario++;
    }
  }

  const total = RUNTIME_QUALITY_CHECKS.reduce((n, qc) => n + rawByRuntimeQualityCheck[qc], 0);

  return { rawByRuntimeQualityCheck, total, onScenario, onPhantomScenario, onSuspenseScenario };
}

export interface StaticObservationTally {
  runningStaticCheckCount: number;
  uncitedStaticCheckCount: number;
}

export function staticObservationTally(ledger: Ledger): StaticObservationTally {
  let runningStaticCheckCount = 0;
  let uncitedStaticCheckCount = 0;
  for (const row of ledger.scenarioReconciliations) {
    for (const obs of row.evidenceObservations) {
      if (obs.qualityCheck !== "fitness") continue;
      if (obs.broken === true) continue;
      if (!obs.exists) continue;
      runningStaticCheckCount++;
      if (row.kind === "suspense-scenario") uncitedStaticCheckCount++;
    }
  }

  return { runningStaticCheckCount, uncitedStaticCheckCount };
}
