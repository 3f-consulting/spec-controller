/**
 * THE ORDER THE BOOKS READ EVIDENCE IN (@SCN-RMD-009, 3F-3495) — one order, whatever order the
 * runners reported it in.
 *
 * A runner decides the order its report lists files in, and vitest's changes between two runs
 * over one unchanged tree. The ledger used to keep that order: a row's posted credits followed
 * it, and so did the credit each reconciliation names, because the first matching credit is the
 * one it names. Two runs over the same books then wrote two different reports. The report now
 * reads evidence in an order the evidence itself fixes: quality check in tier order with fitness
 * last, then locator, then the scenario cited, then everything else the credit says.
 */
import type { EvidenceObservation } from "./journal.js";
import { RUNTIME_QUALITY_CHECKS } from "./ledger.js";

const QUALITY_CHECK_ORDER: readonly string[] = [...RUNTIME_QUALITY_CHECKS, "fitness"];

// The last part is every field the credit carries, keys sorted, so two credits with the same key
// serialise to the same bytes and the order between them cannot show in the report.
function evidenceOrderKey(o: EvidenceObservation): string {
  const content = JSON.stringify(o, Object.keys(o).sort());
  return [QUALITY_CHECK_ORDER.indexOf(o.qualityCheck), o.locator ?? "", o.scnId ?? "", content].join("\u0000");
}

/**
 * The observations in evidence order, as a new array. The keys are sorted by `sort()`'s default
 * code-unit comparison; `localeCompare` would make the order depend on the machine's locale.
 */
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
