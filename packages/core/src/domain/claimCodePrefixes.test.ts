import { describe, it, expect } from "vitest";
import { evidenceReconciliationFromSources } from "../assemble/evidenceReconciliationFromSources.js";
import { parseVitestEvidenceObservations } from "../parse/vitest.js";
import { parsedFeatures } from "../parse/parsedFeatures.test-utils.js";

describe("[CLM-STG-036] a test citing a code under CLM answers the scenario tagged with it", () => {
  it("balances the scenario's claim, under the code as written", () => {
    const source = "@ONE\nFeature: one\n\n  @CLM-ONE-001 @unit\n  Scenario: a thing happens\n    Given a thing\n";
    const observations = parseVitestEvidenceObservations({
      testResults: [
        { name: "/r/one.test.ts", assertionResults: [{ title: "[CLM-ONE-001] a thing happens", status: "passed" }] },
      ],
    });
    const { ledger } = evidenceReconciliationFromSources({
      features: parsedFeatures([source], ["one.feature"]),
      packageJson: {},
      ciWorkflows: [],
      behaviouralObservations: observations,
      deferralTags: [],
    });
    expect(ledger.claimReconciliations.map(({ claim, verdict }) => ({ claim, verdict }))).toEqual([
      { claim: "CLM-ONE-001", verdict: "balanced" },
    ]);
  });
});
