import { describe, it, expect } from "vitest";
import { evidenceObligations as buildEvidenceObligations } from "./evidenceObligations.js";

describe("[SCN-RPT-008] evidenceObligations computes the excluded-occurrence delta", () => {
  it("excludedOccurrences = rawScnOccurrences − scenarioCount", () => {
    const evidenceObligations = buildEvidenceObligations(28, 21);
    expect(evidenceObligations.rawScnOccurrences).toBe(28);
    expect(evidenceObligations.scenarioCount).toBe(21);
    expect(evidenceObligations.excludedOccurrences).toBe(7);
  });

  it("is zero excluded when every raw occurrence is a scenario", () => {
    expect(buildEvidenceObligations(5, 5).excludedOccurrences).toBe(0);
  });
});
