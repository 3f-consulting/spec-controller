import { describe, it, expect } from "vitest";
import { obligationsRaisedBy } from "./scenarioObligations.js";

describe("[SCN-LNT-007] the retired @lint=<handle> form raises no Evidence Obligation", () => {
  it("leaves the scenario's OTHER obligations untouched — the form goes, the tier does not", () => {
    expect(obligationsRaisedBy(["unit", "lint=lint:feature-codes"], [])).toEqual([
      { qualityCheck: "unit" },
    ]);
  });
});
