import type { EvidenceObservation, QualityCheck } from "./journal.js";
import { RUNTIME_QUALITY_CHECKS } from "./ledger.js";

const TIER_ORDER_FITNESS_LAST: readonly QualityCheck[] = [...RUNTIME_QUALITY_CHECKS, "fitness"];

function evidenceOrderKey(o: EvidenceObservation): string {
  const content = JSON.stringify(o, Object.keys(o).sort());
  return [TIER_ORDER_FITNESS_LAST.indexOf(o.qualityCheck), o.locator ?? "", o.scnId ?? "", content].join("\u0000");
}

export function inEvidenceOrder(
  observations: readonly EvidenceObservation[]
): EvidenceObservation[] {
  const byKey = new Map<string, EvidenceObservation[]>();
  for (const o of observations) {
    const key = evidenceOrderKey(o);
    byKey.set(key, [...(byKey.get(key) ?? []), o]);
  }
  return [...byKey.keys()].sort().flatMap((key) => byKey.get(key)!);
}
