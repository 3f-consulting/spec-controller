import type { ScenarioReconciliation, QualityCheck, RuntimeQualityCheck } from "../model.js";
import { RUNTIME_QUALITY_CHECKS } from "../domain/ledger.js";
import {
  isScenario,
  fitnessFunctionReconciliationsOf,
  presentFitnessFunctionCountOf,
} from "../domain/scenarioReconciliation.js";
import { evidenceObligationsOf } from "../domain/journal.js";

export type EvidenceColumn = { readonly kind: "fitness" } | { readonly kind: "runtime"; readonly qualityCheck: RuntimeQualityCheck };

function runtimeQualityChecksPresent(
  scenarioRows: readonly ScenarioReconciliation[]
): ReadonlySet<RuntimeQualityCheck> {
  const present = new Set<RuntimeQualityCheck>();
  for (const s of scenarioRows) {
    for (const o of s.qualityCheckReconciliations) {
      if (o.qualityCheck && o.qualityCheck !== "fitness") present.add(o.qualityCheck);
    }
    for (const o of s.evidenceObservations) {
      if (o.qualityCheck !== "fitness") present.add(o.qualityCheck);
    }
  }
  return present;
}

export function evidenceColumns(
  scenarios: readonly ScenarioReconciliation[]
): EvidenceColumn[] {
  const scenarioRows = scenarios.filter(
    isScenario
  );
  const hasFitnessFunction = scenarioRows.some((s) => fitnessFunctionReconciliationsOf(s).length > 0);
  const qualityChecksPresent = runtimeQualityChecksPresent(scenarioRows);
  const columns: EvidenceColumn[] = [];
  if (hasFitnessFunction) columns.push({ kind: "fitness" });
  for (const qualityCheck of RUNTIME_QUALITY_CHECKS) {
    if (qualityChecksPresent.has(qualityCheck)) columns.push({ kind: "runtime", qualityCheck });
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
  return col.kind === "fitness" ? fitnessCell(s) : runtimeCell(s, col.qualityCheck);
}

function twoSided(left: string, right: string): string {
  return left === "-" && right === "-" ? "" : `${left}/${right}`;
}

function fitnessCell(s: ScenarioReconciliation): string {
  const left = fitnessFunctionReconciliationsOf(s).length > 0 ? QUALITY_CHECK_LETTER.fitness : "-";
  const present = presentFitnessFunctionCountOf(s);
  const right = present > 0 ? String(present) : "-";
  return twoSided(left, right);
}

function runtimeCell(s: ScenarioReconciliation, qualityCheck: RuntimeQualityCheck): string {
  const named = evidenceObligationsOf(s.evidenceObligations).some(
    (o) => o.qualityCheck === qualityCheck
  );
  const left = named ? QUALITY_CHECK_LETTER[qualityCheck] : "-";
  const observed = s.evidenceObservations.filter(
    (o) => o.qualityCheck === qualityCheck
  ).length;
  const right = observed > 0 ? String(observed) : "-";
  return twoSided(left, right);
}
