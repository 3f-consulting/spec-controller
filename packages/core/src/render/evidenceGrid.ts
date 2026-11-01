import type { ClaimReconciliation, QualityCheckKind } from "../model.js";
import { QUALITY_CHECK_KINDS } from "../domain/journal.js";
import {
  isScenario,
  carriesQualityCheckKind,
  namesQualityCheckKind,
  observationCountOf,
} from "../domain/claimReconciliation.js";

export type EvidenceColumn = QualityCheckKind;

export function evidenceColumns(
  claims: readonly ClaimReconciliation[]
): EvidenceColumn[] {
  const scenarioRows = claims.filter(isScenario);
  return QUALITY_CHECK_KINDS.filter((qualityCheckKind) => scenarioRows.some((row) => carriesQualityCheckKind(row, qualityCheckKind)));
}

export function columnHeader(qualityCheckKind: EvidenceColumn): string {
  return qualityCheckKind.charAt(0).toUpperCase() + qualityCheckKind.slice(1);
}

const QUALITY_CHECK_KIND_LETTER: Record<QualityCheckKind, string> = {
  fitness: "F",
  unit: "U",
  integration: "I",
  e2e: "E",
  performance: "P",
};

export function evidenceCell(
  s: ClaimReconciliation,
  qualityCheckKind: EvidenceColumn
): string {
  if (!isScenario(s)) return "—";
  const left = namesQualityCheckKind(s, qualityCheckKind) ? QUALITY_CHECK_KIND_LETTER[qualityCheckKind] : "-";
  const observed = observationCountOf(s, qualityCheckKind);
  const right = observed > 0 ? String(observed) : "-";
  return left === "-" && right === "-" ? "" : `${left}/${right}`;
}
