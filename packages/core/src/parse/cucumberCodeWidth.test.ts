import { describe, it, expect, beforeEach } from "vitest";
import { parseCucumberEvidenceObservations, type CucumberJsonReport } from "./cucumber.js";

describe("[CLM-CUC-005] a Cucumber scenario tagged with a feature part outside two to five characters cites no claim", () => {
  const tagged = (id: string) => ({ tags: [{ name: `@${id}` }], steps: [{ result: { status: "passed" as const } }] });
  let report: CucumberJsonReport;
  beforeEach(() => {
    report = [
      { uri: "features/x.feature", elements: ["CLM-A-001", "CLM-AB-001", "CLM-FIVEC-001", "CLM-SIXCHR-001", "CLM-AB-1"].map(tagged) },
    ];
  });

  it("cites the two- and five-character codes, any number width, and nothing for the one- or six-character tags", () => {
    expect(parseCucumberEvidenceObservations(report).map((o) => o.claimCode)).toEqual([
      null,
      "CLM-AB-001",
      "CLM-FIVEC-001",
      null,
      "CLM-AB-1",
    ]);
  });
});
