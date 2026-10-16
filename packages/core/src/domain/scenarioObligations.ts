import type { EvidenceObligation, QualityCheck, BehaviouralQualityCheck } from "./journal.js";

const PENDING_TAG_TO_QUALITY_CHECK: Record<string, QualityCheck> = {
  fitnesspending: "fitness",
  unitpending: "unit",
  integrationpending: "integration",
  e2epending: "e2e",
  performancepending: "performance",
};

export function pendingQualityCheck(tag: string): QualityCheck | null {
  return PENDING_TAG_TO_QUALITY_CHECK[tag] ?? null;
}

const TAG_TO_QUALITY_CHECK: Record<string, BehaviouralQualityCheck> = {
  unit: "unit",
  integration: "integration",
  e2e: "e2e",
  performance: "performance",
};

export const FITNESS_AXIS_TAG = "fitness";

function convertedFitnessObligationsOf(tags: readonly string[]): EvidenceObligation[] {
  if (!tags.includes(FITNESS_AXIS_TAG)) return [];
  return [{ qualityCheck: "fitness" }];
}

export function evidenceObligationsOf(
  tags: readonly string[],
  deferralTags: readonly string[]
): EvidenceObligation[] {
  const evidenceObligations: EvidenceObligation[] = [];
  const seenQualityChecks = new Set<BehaviouralQualityCheck>();
  const seenPending = new Set<QualityCheck>();
  for (const t of tags) {
    const pendingCheck = pendingQualityCheck(t);
    if (pendingCheck && !seenPending.has(pendingCheck)) {
      seenPending.add(pendingCheck);
      evidenceObligations.push({ qualityCheck: pendingCheck, pending: true });
      continue;
    }
    const qualityCheck = TAG_TO_QUALITY_CHECK[t];
    if (qualityCheck && !seenQualityChecks.has(qualityCheck)) {
      seenQualityChecks.add(qualityCheck);
      evidenceObligations.push({ qualityCheck });
      continue;
    }
  }
  evidenceObligations.push(...convertedFitnessObligationsOf(tags));
  if (!tags.some((t) => deferralTags.includes(t))) return evidenceObligations;
  if (evidenceObligations.length === 0) return [{ pending: true }];
  return evidenceObligations.map((obligation) => ({ ...obligation, pending: true }));
}
