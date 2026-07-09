/**
 * Unit tests for the scenario ⟷ sub-issue gate decision (the @unit floor of
 * spec-controller's OWN light gate coverage — ported from an earlier internal tool, kept
 * light; NOT a wholesale port of the source gate-test corpus).
 *
 * Bidirectional evidence: the describe/it strings carry the @SCN-SSM-NNN id
 * matching features/scenario-sub-issue-match.feature.
 *
 * Parent: 3F-1137 (the port + fork-exemption design).
 */

import { describe, it, expect } from "vitest";
import { decideScnGate, type ScnGateInput } from "./scnSubIssueGate.js";

function baseInput(overrides: Partial<ScnGateInput> = {}): ScnGateInput {
  return {
    addedCodes: [],
    updatedCodes: [],
    deletedCodes: [],
    renumberPairs: [],
    exemptions: [],
    unitEquivalentBehaviourBearing: false,
    unitEquivalentCitedCodes: [],
    hasTicketHandle: false,
    isExternalPr: false,
    ...overrides,
  };
}

describe("[SCN-SSM-001] a behaviour-bearing change on a ticketed internal PR passes the gate", () => {
  it("passes an added scenario code when the PR carries a ticket handle and is not external", () => {
    const result = decideScnGate(
      baseInput({ addedCodes: ["SCN-LDG-001"], hasTicketHandle: true, isExternalPr: false })
    );
    expect(result.ok).toBe(true);
    expect(result.violations).toEqual([]);
  });
});
