import type { EvidenceObligation, QualityCheckKind, Layer } from "./journal.js";

const PENDING_TAG_TO_QUALITY_CHECK_KIND: Record<string, QualityCheckKind> = {
  fitnesspending: "fitness",
  unitpending: "unit",
  integrationpending: "integration",
  e2epending: "e2e",
  performancepending: "performance",
};

function pendingQualityCheckKind(tag: string): QualityCheckKind | null {
  return PENDING_TAG_TO_QUALITY_CHECK_KIND[tag] ?? null;
}

const TAG_TO_LAYER: Record<string, Layer> = {
  unit: "unit",
  integration: "integration",
  e2e: "e2e",
  performance: "performance",
};

export const FITNESS_AXIS_TAG = "fitness";

function convertedFitnessObligationsOf(tags: readonly string[]): EvidenceObligation[] {
  if (!tags.includes(FITNESS_AXIS_TAG)) return [];
  return [{ qualityCheckKind: "fitness" }];
}

export function obligationsRaisedBy(
  tags: readonly string[],
  deferralTags: readonly string[]
): EvidenceObligation[] {
  const evidenceObligations: EvidenceObligation[] = [];
  const seenLayers = new Set<Layer>();
  const seenPending = new Set<QualityCheckKind>();
  for (const t of tags) {
    const pendingCheck = pendingQualityCheckKind(t);
    if (pendingCheck && !seenPending.has(pendingCheck)) {
      seenPending.add(pendingCheck);
      evidenceObligations.push({ qualityCheckKind: pendingCheck, pending: true });
      continue;
    }
    const layer = TAG_TO_LAYER[t];
    if (layer && !seenLayers.has(layer)) {
      seenLayers.add(layer);
      evidenceObligations.push({ qualityCheckKind: layer });
      continue;
    }
  }
  evidenceObligations.push(...convertedFitnessObligationsOf(tags));
  if (!tags.some((t) => deferralTags.includes(t))) return evidenceObligations;
  if (evidenceObligations.length === 0) return [{ pending: true }];
  return evidenceObligations.map((obligation) => ({ ...obligation, pending: true }));
}
