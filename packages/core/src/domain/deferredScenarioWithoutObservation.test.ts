import { describe, it, expect } from "vitest";
import { reconcilingItemsOf } from "./claimReconciliation.js";

import { reconcile } from "./evidenceReconciliation.js";
import { obligationsRaisedBy } from "./scenarioObligations.js";

const COMMUNITY_DEFERRAL_TAGS: readonly string[] = ["wip", "ignore", "skip", "todo", "pending"];

// A scenario its runner filtered out and one it reported pending reach reconcile alike: with no evidence observation.
describe("[CLM-PND-019] a community deferral tag raises the Pending Item for a scenario with no evidence observation", () => {
  it.each(COMMUNITY_DEFERRAL_TAGS)(
    "@%s defers its scenario to one Pending Item and no Reconciling Item, while its untagged twin reads missing",
    (tag) => {
      const ledger = reconcile(
        [
          { claimCode: "CLM-DFR-001", evidenceObligations: obligationsRaisedBy([tag, "unit"], COMMUNITY_DEFERRAL_TAGS) },
          { claimCode: "CLM-DFR-002", evidenceObligations: obligationsRaisedBy(["unit"], COMMUNITY_DEFERRAL_TAGS) },
        ],
        []
      );
      const scenario = (claimCode: string) => ledger.claimReconciliations.find((s) => s.claim === claimCode);

      expect(scenario("CLM-DFR-001")?.pendingItems).toEqual([{ qualityCheckKind: "unit" }]);
      expect(reconcilingItemsOf(scenario("CLM-DFR-001")!)).toEqual([]);
      expect(scenario("CLM-DFR-002")?.pendingItems).toEqual([]);
      expect(reconcilingItemsOf(scenario("CLM-DFR-002")!)).toEqual([
        { qualityCheckKind: "unit", outcome: "missing", evidenceObligation: { qualityCheckKind: "unit" } },
      ]);
    }
  );
});
