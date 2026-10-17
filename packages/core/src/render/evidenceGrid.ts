import type { ScenarioReconciliation, QualityCheck, BehaviouralQualityCheck } from "../model.js";
import { BEHAVIOURAL_QUALITY_CHECKS } from "../domain/ledger.js";
import {
  isScenario,
  carriesFitnessFunction,
  carriesBehaviouralQualityCheck,
  namesQualityCheck,
  observationCountOf,
} from "../domain/scenarioReconciliation.js";

export type EvidenceColumn = { readonly kind: "fitness" } | { readonly kind: "behavioural"; readonly qualityCheck: BehaviouralQualityCheck };

export function evidenceColumns(
  scenarios: readonly ScenarioReconciliation[]
): EvidenceColumn[] {
  const scenarioRows = scenarios.filter(
    isScenario
  );
  const hasFitnessFunction = scenarioRows.some(carriesFitnessFunction);
  const columns: EvidenceColumn[] = [];
  if (hasFitnessFunction) columns.push({ kind: "fitness" });
  for (const qualityCheck of BEHAVIOURAL_QUALITY_CHECKS) {
    if (scenarioRows.some((row) => carriesBehaviouralQualityCheck(row, qualityCheck))) columns.push({ kind: "behavioural", qualityCheck });
  }
  return columns;
}

function qualityCheckOf(col: EvidenceColumn): QualityCheck {
  return col.kind === "fitness" ? "fitness" : col.qualityCheck;
}

export function columnHeader(col: EvidenceColumn): string {
  const word = qualityCheckOf(col);
  return word.charAt(0).toUpperCase() + word.slice(1);
}

const QUALITY_CHECK_LETTER: Record<QualityCheck, string> = {
  fitness: "F",
  unit: "U",
  integration: "I",
  e2e: "E",
  performance: "P",
};

export function evidenceCell(
  s: ScenarioReconciliation,
  col: EvidenceColumn
): string {
  if (!isScenario(s)) return "—";
  const qualityCheck = qualityCheckOf(col);
  const left = namesQualityCheck(s, qualityCheck) ? QUALITY_CHECK_LETTER[qualityCheck] : "-";
  const observed = observationCountOf(s, qualityCheck);
  const right = observed > 0 ? String(observed) : "-";
  return left === "-" && right === "-" ? "" : `${left}/${right}`;
}
