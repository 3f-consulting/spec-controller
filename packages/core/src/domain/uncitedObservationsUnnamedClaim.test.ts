import { describe, it, expect } from "vitest";
import { observationsOf } from "./claimReconciliation.js";

import { reconcile } from "./evidenceReconciliation.js";
import type { Scenario, EvidenceObservation } from "./journal.js";

const postedOf = <T extends { readonly outcome: unknown }>({ outcome: _outcome, ...posted }: T) => posted;

describe("[SCN-LDG-007] an evidence observation citing no scenario is reported as the unnamed claim's reconciliation, out of balance", () => {
  const scenarios: Scenario[] = [
    { claimCode: "SCN-AAA-001", evidenceObligations: [{ qualityCheckKind: "unit" }] },
  ];
  const cited: EvidenceObservation = {
    qualityCheckKind: "unit",
    claimCode: "SCN-AAA-001",
    status: "passed",
    locator: "tests/cited.test.ts",
  };
  const uncited: EvidenceObservation[] = [
    { qualityCheckKind: "unit", claimCode: null, status: "passed", locator: "tests/orphan-a.test.ts" },
    { qualityCheckKind: "integration", claimCode: null, status: "passed", locator: "features/orphan-b.feature" },
    { qualityCheckKind: "e2e", claimCode: null, status: "failed", locator: "tests/orphan-c.e2e.ts" },
  ];
  const reconciled = () => reconcile(scenarios, [cited, ...uncited]).claimReconciliations;
  const unnamedClaimRowsOf = (rows: ReturnType<typeof reconciled>) =>
    rows.filter((r) => r.kind === "unnamed-claim");

  it("aggregates every uncited evidence observation into the unnamed claim's one row, under the sentinel id", () => {
    const unnamedClaimRows = unnamedClaimRowsOf(reconciled());
    expect(unnamedClaimRows).toHaveLength(1);
    expect(unnamedClaimRows[0]!.claim).toBe("(unnamed claim)");
  });

  it("gives each uncited evidence observation a cites-no-scenario item carrying its locator", () => {
    const unnamedClaimRows = unnamedClaimRowsOf(reconciled());
    const items = unnamedClaimRows[0]!.qualityCheckReconciliations;
    expect(items.flatMap((i) => i.evidenceObservations ?? []).map((o) => o.outcome)).toEqual([
      "cites-no-scenario",
      "cites-no-scenario",
      "cites-no-scenario",
    ]);
    expect(items.flatMap((i) => i.evidenceObservations ?? []).map((o) => o.locator).sort()).toEqual([
      "features/orphan-b.feature",
      "tests/orphan-a.test.ts",
      "tests/orphan-c.e2e.ts",
    ]);
    for (const item of items) {
      expect(item.evidenceObservations?.map((o) => o.qualityCheckKind)).toEqual([item.qualityCheckKind]);
    }
  });

  it("lists every uncited evidence observation on the unnamed claim's row, and none of the cited ones", () => {
    const unnamedClaimRows = unnamedClaimRowsOf(reconciled());
    const listed = observationsOf(unnamedClaimRows[0]!).map(postedOf);
    expect(listed).toHaveLength(uncited.length);
    for (const observation of uncited) expect(listed).toContainEqual(observation);
    expect(listed).not.toContainEqual(cited);
  });

  it("judges the unnamed claim's row out of balance while the real scenario's row stays balanced", () => {
    const rows = reconciled();
    expect(unnamedClaimRowsOf(rows)[0]!.verdict).toBe("out-of-balance");
    const real = rows.find((r) => r.claim === "SCN-AAA-001");
    expect(real?.kind).toBe("scenario");
    expect(real?.verdict).toBe("balanced");
  });
});
