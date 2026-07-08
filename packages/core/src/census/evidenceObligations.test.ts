/**
 * Unit test for the EvidenceObligations builder (@SCN-RPT-008).
 *
 * Bidirectional evidence (Evidence Manifesto §9): the describe carries the
 * @SCN-RPT-008 id matching features/report.feature, so a grep of the id returns
 * both halves of the pair.
 *
 * Proves evidenceObligations in isolation: it computes the excluded-occurrence delta —
 * excludedOccurrences = rawScnOccurrences − scenarioCount — the lone non-derivable
 * corpus fact (scenarioCount is derivable from the balance; rawScnOccurrences is
 * derivable as scenarioCount + excludedOccurrences).
 *
 * Teeth: until the builder lands, the stub returns zeros, so every delta assertion
 * reds (the genuine red→green).
 *
 * Parent: (@SCN-RPT-008).
 */

import { describe, it, expect } from "vitest";
import { evidenceObligations as buildEvidenceObligations } from "./evidenceObligations.js";

describe("[SCN-RPT-008] evidenceObligations computes the excluded-occurrence delta", () => {
  it("excludedOccurrences = rawScnOccurrences − scenarioCount", () => {
    const evidenceObligations = buildEvidenceObligations(28, 21);
    expect(evidenceObligations.rawScnOccurrences).toBe(28);
    expect(evidenceObligations.scenarioCount).toBe(21);
    expect(evidenceObligations.excludedOccurrences).toBe(7);
  });

  it("is zero excluded when every raw occurrence is a declared scenario", () => {
    expect(buildEvidenceObligations(5, 5).excludedOccurrences).toBe(0);
  });
});
