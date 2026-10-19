import type { ClaimReconciliation, QualityCheck } from "../model.js";
import { QUALITY_CHECKS } from "../domain/journal.js";
import {
  isScenario,
  carriesQualityCheck,
  namesQualityCheck,
  observationCountOf,
} from "../domain/claimReconciliation.js";

export type EvidenceColumn = QualityCheck;

export function evidenceColumns(
  claims: readonly ClaimReconciliation[]
): EvidenceColumn[] {
  const scenarioRows = claims.filter(isScenario);
  return QUALITY_CHECKS.filter((qualityCheck) => scenarioRows.some((row) => carriesQualityCheck(row, qualityCheck)));
}

export function columnHeader(qualityCheck: EvidenceColumn): string {
  return qualityCheck.charAt(0).toUpperCase() + qualityCheck.slice(1);
}

const QUALITY_CHECK_LETTER: Record<QualityCheck, string> = {
  fitness: "F",
  unit: "U",
  integration: "I",
  e2e: "E",
  performance: "P",
};

export function evidenceCell(
  s: ClaimReconciliation,
  qualityCheck: EvidenceColumn
): string {
  if (!isScenario(s)) return "—";
  const left = namesQualityCheck(s, qualityCheck) ? QUALITY_CHECK_LETTER[qualityCheck] : "-";
  const observed = observationCountOf(s, qualityCheck);
  const right = observed > 0 ? String(observed) : "-";
  return left === "-" && right === "-" ? "" : `${left}/${right}`;
}
