import { describe, it, expect } from "vitest";
import type { EvidenceReconciliation } from "./renderInput.js";
import { block, reconcileConfiguration as reconcile } from "./configurationBlock.test-utils.js";

function withoutUnknownKeys(reconciliation: EvidenceReconciliation): EvidenceReconciliation {
  const { configurationKeysNotRead: _named, ...summary } = reconciliation.summary;
  return { ...reconciliation, summary };
}

const keys = ["notCheck", "fitnessChecks", "zzz"];

describe("[SCN-CFG-005] a key the specController block does not read, a retired one included, is named on the report as unknown in the same words as any other, and the run is not refused over it", () => {
  it.each(keys)("names %s on the report as a key the specController block does not read", (key) => {
    expect(reconcile({ ...block, [key]: true }).summary.configurationKeysNotRead).toEqual([key]);
  });

  it.each(keys)("gives otherwise the report the same target gives without %s", (key) => {
    expect(withoutUnknownKeys(reconcile({ ...block, [key]: true }))).toEqual(reconcile(block));
  });
});
