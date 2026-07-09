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

describe("[SCN-SSM-002] a behaviour-bearing change on an internal PR with no ticket handle reds the gate", () => {
  it("reds an added scenario code when the PR carries no ticket handle and is not external, naming the unbound code", () => {
    const result = decideScnGate(
      baseInput({ addedCodes: ["SCN-LDG-002"], hasTicketHandle: false, isExternalPr: false })
    );
    expect(result.ok).toBe(false);
    expect(result.violations.length).toBeGreaterThan(0);
    const violation = result.violations[0]!;
    expect(violation.kind).toBe("missing-ticket-handle");
    expect(violation.code).toBe("SCN-LDG-002");
    // The violation NAMES the unbound code (the bidirectional teeth).
    expect(violation.message).toContain("SCN-LDG-002");
  });
});

describe("[SCN-SSM-003] a fork-sourced external PR is exempt from the gate", () => {
  it("exempts a behaviour-bearing added code with no ticket handle when the PR is external (fork)", () => {
    const result = decideScnGate(
      baseInput({ addedCodes: ["SCN-LDG-003"], hasTicketHandle: false, isExternalPr: true })
    );
    // The exemption: a fork PR is skipped regardless of the missing handle.
    expect(result.ok).toBe(true);
    expect(result.violations).toEqual([]);
  });

  it("still reds the SAME no-handle change on an INTERNAL PR — fork status is the only exemption (teeth intact)", () => {
    const result = decideScnGate(
      baseInput({ addedCodes: ["SCN-LDG-003"], hasTicketHandle: false, isExternalPr: false })
    );
    expect(result.ok).toBe(false);
    expect(result.violations[0]!.kind).toBe("missing-ticket-handle");
  });
});
