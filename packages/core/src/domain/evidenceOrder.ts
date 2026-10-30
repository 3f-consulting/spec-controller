import type { EvidenceObservation } from "./journal.js";
import { TIER_ORDER_FITNESS_LAST } from "./ledger.js";

function withSortedKeys(_key: string, value: unknown): unknown {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return value;
  const fields = value as Record<string, unknown>;
  return Object.fromEntries(Object.keys(fields).sort().map((key) => [key, fields[key]]));
}

function evidenceOrderKey(o: EvidenceObservation): string {
  const content = JSON.stringify(o, withSortedKeys);
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
