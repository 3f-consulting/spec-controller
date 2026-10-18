import { describe, it, expect } from "vitest";

import { reconcile } from "./evidenceReconciliation.js";
import { obligationsRaisedBy } from "./scenarioObligations.js";

const COMMUNITY_DEFERRAL_TAGS: readonly string[] = ["wip", "ignore", "skip", "todo", "pending"];

// A scenario its runner filtered out and one it reported pending reach reconcile alike: with no evidence observation.
describe("[SCN-PND-019] a community deferral tag raises the Pending Item for a scenario with no evidence observation", () => {
  it.each(COMMUNITY_DEFERRAL_TAGS)(
    "@%s defers its scenario to one Pending Item and no Reconciling Item, while its untagged twin reads missing",
    (tag) => {
      const ledger = reconcile(
        [
          { scnId: "SCN-DFR-001", evidenceObligations: obligationsRaisedBy([tag, "unit"], COMMUNITY_DEFERRAL_TAGS) },
          { scnId: "SCN-DFR-002", evidenceObligations: obligationsRaisedBy(["unit"], COMMUNITY_DEFERRAL_TAGS) },
        ],
        []
      );
      const scenario = (scnId: string) => ledger.scenarioReconciliations.find((s) => s.scnId === scnId);

      expect(scenario("SCN-DFR-001")?.pendingItems).toEqual([{ qualityCheck: "unit" }]);
      expect(scenario("SCN-DFR-001")?.reconcilingItems).toEqual([]);
      expect(scenario("SCN-DFR-002")?.pendingItems).toEqual([]);
      expect(scenario("SCN-DFR-002")?.reconcilingItems).toEqual([
        { qualityCheck: "unit", outcome: "missing", evidenceObligation: { qualityCheck: "unit" } },
      ]);
    }
  );
});
