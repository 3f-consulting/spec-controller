import { describe, it, expect } from "vitest";
import { attributionOf } from "./attribution.js";
import { reconcile } from "./evidenceReconciliation.js";
import { isUnnamedClaim, reconcilingItemsOf } from "./claimReconciliation.js";
import { unnamedClaimGroupsOf } from "./unnamedClaimGroups.js";
import type { BehaviouralEvidenceObservation } from "./journal.js";

const LOCATOR = "/r/several.test.ts";

function observationCiting(codes: readonly string[]): BehaviouralEvidenceObservation {
  const { claimCode, severalCodes } = attributionOf(codes);
  return {
    qualityCheckKind: "unit",
    claimCode,
    status: "passed",
    locator: LOCATOR,
    ...(severalCodes ? { notes: [{ kind: "several-claim-codes" as const, codes: severalCodes }] } : {}),
  };
}

describe("[CLM-LDG-042] an evidence observation citing two scenarios credits neither, and the unnamed claim's row names both codes", () => {
  it("credits no scenario and names both codes", () => {
    expect(attributionOf(["CLM-AAA-001", "CLM-AAA-002"])).toEqual({
      claimCode: null,
      severalCodes: ["CLM-AAA-001", "CLM-AAA-002"],
    });
  });

  it.each([
    ["one code", ["CLM-AAA-001"]],
    ["one code repeated", ["CLM-AAA-001", "CLM-AAA-001"]],
  ])("CONTROL: %s credits that code, naming no codes", (_, codes) => {
    expect(attributionOf(codes)).toEqual({ claimCode: "CLM-AAA-001" });
  });

  describe("assembled into the ledger", () => {
    const ledgerOf = (codes: readonly string[]) =>
      reconcile(
        [
          { claimCode: "CLM-AAA-001", evidenceObligations: [{ qualityCheckKind: "unit" }] },
          { claimCode: "CLM-AAA-002", evidenceObligations: [{ qualityCheckKind: "unit" }] },
        ],
        [observationCiting(codes)]
      );
    const unitOutcomeOf = (codes: readonly string[], claimCode: string) =>
      ledgerOf(codes)
        .claimReconciliations.find((row) => row.claim === claimCode)
        ?.qualityCheckReconciliations.find((q) => q.qualityCheckKind === "unit")?.outcome;
    const unnamedClaimGroups = (codes: readonly string[]) => {
      const row = ledgerOf(codes).claimReconciliations.find(isUnnamedClaim);
      return unnamedClaimGroupsOf(row === undefined ? [] : reconcilingItemsOf(row));
    };

    it.each(["CLM-AAA-001", "CLM-AAA-002"])("leaves %s missing", (claimCode) => {
      expect(unitOutcomeOf(["CLM-AAA-001", "CLM-AAA-002"], claimCode)).toBe("missing");
    });

    it("posts the observation to one group on the unnamed claim's row whose remark names both codes", () => {
      expect(unnamedClaimGroups(["CLM-AAA-001", "CLM-AAA-002"])).toEqual([
        {
          qualityCheckKind: "unit",
          locator: LOCATOR,
          remarks: [{ notes: [{ kind: "several-claim-codes", codes: ["CLM-AAA-001", "CLM-AAA-002"] }] }],
          ran: 1,
          passed: 1,
          failed: 0,
          failedNames: [],
        },
      ]);
    });

    it.each([
      ["one code", ["CLM-AAA-001"]],
      ["one code repeated", ["CLM-AAA-001", "CLM-AAA-001"]],
    ])("CONTROL: %s credits that scenario and posts nothing to the unnamed claim", (_, codes) => {
      expect(unitOutcomeOf(codes, "CLM-AAA-001")).not.toBe("missing");
      expect(unitOutcomeOf(codes, "CLM-AAA-002")).toBe("missing");
      expect(unnamedClaimGroups(codes)).toEqual([]);
    });
  });
});
