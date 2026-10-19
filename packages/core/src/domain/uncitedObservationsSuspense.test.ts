import { describe, it, expect } from "vitest";

import { reconcile } from "./evidenceReconciliation.js";
import type { Scenario, EvidenceObservation } from "./journal.js";

describe("[SCN-LDG-007] an evidence observation citing no scenario is reported as the unnamed claim's reconciliation, out of balance", () => {
  const scenarios: Scenario[] = [
    { scnId: "SCN-AAA-001", evidenceObligations: [{ qualityCheck: "unit" }] },
  ];
  const cited: EvidenceObservation = {
    qualityCheck: "unit",
    scnId: "SCN-AAA-001",
    status: "passed",
    locator: "tests/cited.test.ts",
  };
  const uncited: EvidenceObservation[] = [
    { qualityCheck: "unit", scnId: null, status: "passed", locator: "tests/orphan-a.test.ts" },
    { qualityCheck: "integration", scnId: null, status: "passed", locator: "features/orphan-b.feature" },
    { qualityCheck: "e2e", scnId: null, status: "failed", locator: "tests/orphan-c.e2e.ts" },
  ];
  const reconciled = () => reconcile(scenarios, [cited, ...uncited]).claimReconciliations;
  const suspenseRowsOf = (rows: ReturnType<typeof reconciled>) =>
    rows.filter((r) => r.kind === "unnamed-claim");

  it("aggregates every uncited evidence observation into exactly one unnamed-claim row, under the sentinel id", () => {
    const suspenseRows = suspenseRowsOf(reconciled());
    expect(suspenseRows).toHaveLength(1);
    expect(suspenseRows[0]!.scnId).toBe("(unnamed claim)");
  });

  it("gives each uncited evidence observation a cites-no-scenario item carrying its locator", () => {
    const suspenseRows = suspenseRowsOf(reconciled());
    const items = suspenseRows[0]!.qualityCheckReconciliations;
    expect(items.map((i) => i.outcome)).toEqual([
      "cites-no-scenario",
      "cites-no-scenario",
      "cites-no-scenario",
    ]);
    expect(items.map((i) => i.locator).sort()).toEqual([
      "features/orphan-b.feature",
      "tests/orphan-a.test.ts",
      "tests/orphan-c.e2e.ts",
    ]);
    for (const item of items) expect(item.locator).toBe(item.evidenceObservation?.locator);
  });

  it("lists every uncited evidence observation on the suspense row, and none of the cited ones", () => {
    const suspenseRows = suspenseRowsOf(reconciled());
    const listed = suspenseRows[0]!.evidenceObservations;
    expect(listed).toHaveLength(uncited.length);
    for (const observation of uncited) expect(listed).toContain(observation);
    expect(listed).not.toContain(cited);
  });

  it("judges the suspense row out of balance while the real scenario's row stays balanced", () => {
    const rows = reconciled();
    expect(suspenseRowsOf(rows)[0]!.verdict).toBe("out-of-balance");
    const real = rows.find((r) => r.scnId === "SCN-AAA-001");
    expect(real?.kind).toBe("scenario");
    expect(real?.verdict).toBe("balanced");
  });
});
