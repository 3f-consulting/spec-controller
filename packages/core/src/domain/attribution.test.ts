import { describe, it, expect } from "vitest";
import { attributionOf } from "./attribution.js";
import { reconcile } from "./evidenceReconciliation.js";
import { isUnnamedClaim, reconcilingItemsOf } from "./claimReconciliation.js";
import { unnamedClaimGroupsOf } from "./unnamedClaimGroups.js";
import type { BehaviouralEvidenceObservation } from "./journal.js";

const LOCATOR = "/r/several.test.ts";

function observationCiting(codes: readonly string[]): BehaviouralEvidenceObservation {
  const { scnId, severalCodes } = attributionOf(codes);
  return {
    qualityCheckKind: "unit",
    scnId,
    status: "passed",
    locator: LOCATOR,
    ...(severalCodes ? { notes: [{ kind: "several-scn-codes" as const, codes: severalCodes }] } : {}),
  };
}

describe("[SCN-LDG-042] an evidence observation citing two scenarios credits neither, and the unnamed claim's row names both codes", () => {
  it("credits no scenario and names both codes", () => {
    expect(attributionOf(["SCN-AAA-001", "SCN-AAA-002"])).toEqual({
      scnId: null,
      severalCodes: ["SCN-AAA-001", "SCN-AAA-002"],
    });
  });

  it.each([
    ["one code", ["SCN-AAA-001"]],
    ["one code repeated", ["SCN-AAA-001", "SCN-AAA-001"]],
  ])("CONTROL: %s credits that code, naming no codes", (_, codes) => {
    expect(attributionOf(codes)).toEqual({ scnId: "SCN-AAA-001" });
  });

  describe("assembled into the ledger", () => {
    const ledgerOf = (codes: readonly string[]) =>
      reconcile(
        [
          { scnId: "SCN-AAA-001", evidenceObligations: [{ qualityCheckKind: "unit" }] },
          { scnId: "SCN-AAA-002", evidenceObligations: [{ qualityCheckKind: "unit" }] },
        ],
        [observationCiting(codes)]
      );
    const unitOutcomeOf = (codes: readonly string[], scnId: string) =>
      ledgerOf(codes)
        .claimReconciliations.find((row) => row.claim === scnId)
        ?.qualityCheckReconciliations.find((q) => q.qualityCheckKind === "unit")?.outcome;
    const unnamedClaimGroups = (codes: readonly string[]) => {
      const row = ledgerOf(codes).claimReconciliations.find(isUnnamedClaim);
      return unnamedClaimGroupsOf(row === undefined ? [] : reconcilingItemsOf(row));
    };

    it.each(["SCN-AAA-001", "SCN-AAA-002"])("leaves %s missing", (scnId) => {
      expect(unitOutcomeOf(["SCN-AAA-001", "SCN-AAA-002"], scnId)).toBe("missing");
    });

    it("posts the observation to one group on the unnamed claim's row whose remark names both codes", () => {
      expect(unnamedClaimGroups(["SCN-AAA-001", "SCN-AAA-002"])).toEqual([
        {
          qualityCheckKind: "unit",
          locator: LOCATOR,
          remarks: [{ notes: [{ kind: "several-scn-codes", codes: ["SCN-AAA-001", "SCN-AAA-002"] }] }],
          ran: 1,
          passed: 1,
          failed: 0,
          failedNames: [],
        },
      ]);
    });

    it.each([
      ["one code", ["SCN-AAA-001"]],
      ["one code repeated", ["SCN-AAA-001", "SCN-AAA-001"]],
    ])("CONTROL: %s credits that scenario and posts nothing to the unnamed claim", (_, codes) => {
      expect(unitOutcomeOf(codes, "SCN-AAA-001")).not.toBe("missing");
      expect(unitOutcomeOf(codes, "SCN-AAA-002")).toBe("missing");
      expect(unnamedClaimGroups(codes)).toEqual([]);
    });
  });
});
