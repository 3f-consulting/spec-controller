import { describe, it, expect } from "vitest";
import { obligationsRaisedBy } from "./scenarioObligations.js";

describe("[CLM-LNT-018] a @fitness scenario raises one fitness obligation, from its tag, keyed by its own claim code", () => {

  it("leaves the layer obligations of a @fitness scenario untouched", () => {
    expect(obligationsRaisedBy(["unit", "fitness"], [])).toEqual([
      { qualityCheckKind: "unit" },
      { qualityCheckKind: "fitness" },
    ]);
  });
});
