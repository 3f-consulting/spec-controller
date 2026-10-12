import type { ScenarioReconciliation, QualityCheck, BehaviouralQualityCheck } from "../model.js";
import { BEHAVIOURAL_QUALITY_CHECKS } from "../domain/ledger.js";
import {
  isScenario,
  carriesFitnessFunction,
  carriesBehaviouralQualityCheck,
  presentFitnessFunctionCountOf,
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

export function columnHeader(col: EvidenceColumn): string {
  const word = col.kind === "fitness" ? "fitness" : col.qualityCheck;
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
  return col.kind === "fitness" ? fitnessCell(s) : behaviouralCell(s, col.qualityCheck);
}

function twoSided(left: string, right: string): string {
  return left === "-" && right === "-" ? "" : `${left}/${right}`;
}

function fitnessCell(s: ScenarioReconciliation): string {
  const left = carriesFitnessFunction(s) ? QUALITY_CHECK_LETTER.fitness : "-";
  const present = presentFitnessFunctionCountOf(s);
  const right = present > 0 ? String(present) : "-";
  return twoSided(left, right);
}

function behaviouralCell(s: ScenarioReconciliation, qualityCheck: BehaviouralQualityCheck): string {
  const left = namesQualityCheck(s, qualityCheck) ? QUALITY_CHECK_LETTER[qualityCheck] : "-";
  const observed = observationCountOf(s, qualityCheck);
  const right = observed > 0 ? String(observed) : "-";
  return twoSided(left, right);
}
