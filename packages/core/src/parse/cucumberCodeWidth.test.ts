import { describe, it, expect, beforeEach } from "vitest";
import { parseCucumberEvidenceObservations, type CucumberJsonReport } from "./cucumber.js";

describe("[SCN-CUC-005] a Cucumber scenario tagged with a feature part outside two to five characters cites no scenario", () => {
  const tagged = (id: string) => ({ tags: [{ name: `@${id}` }], steps: [{ result: { status: "passed" as const } }] });
  let report: CucumberJsonReport;
  beforeEach(() => {
    report = [
      { uri: "features/x.feature", elements: ["SCN-A-001", "SCN-AB-001", "SCN-FIVEC-001", "SCN-SIXCHR-001", "SCN-AB-1"].map(tagged) },
    ];
  });

  it("cites the two- and five-character codes, any number width, and nothing for the one- or six-character tags", () => {
    expect(parseCucumberEvidenceObservations(report).map((o) => o.claimCode)).toEqual([
      null,
      "SCN-AB-001",
      "SCN-FIVEC-001",
      null,
      "SCN-AB-1",
    ]);
  });
});
