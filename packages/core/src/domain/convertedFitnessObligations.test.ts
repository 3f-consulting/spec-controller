import { describe, it, expect } from "vitest";
import { obligationsRaisedBy } from "./scenarioObligations.js";

describe("[SCN-LNT-018] a @fitness scenario raises one fitness obligation, from its tag, keyed by its own @SCN", () => {

  it("leaves the tier obligations of a @fitness scenario untouched", () => {
    expect(obligationsRaisedBy(["unit", "fitness"], [])).toEqual([
      { qualityCheck: "unit" },
      { qualityCheck: "fitness" },
    ]);
  });
});
