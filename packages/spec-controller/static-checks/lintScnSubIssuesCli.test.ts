/**
 * Unit tests for the scenario ⟷ sub-issue gate CLI's fork-read helper (the
 * @unit floor of @SCN-SSM-003 — the fork exemption). The pure helper decides
 * whether a PR is fork-sourced (external) from a parsed GitHub PR event payload:
 * head.repo.full_name != base.repo.full_name.
 *
 * Bidirectional evidence: the describe/it strings carry the @SCN-SSM-003 id
 * matching features/scenario-sub-issue-match.feature and the @integration steps
 * in tests/steps/scenarioSubIssueMatchExempt.steps.ts.
 *
 * Parent: 3F-1137 (the port + fork-exemption design).
 */

import { describe, it, expect } from "vitest";
import { isExternalPrFromEvent } from "./lintScnSubIssuesCli.js";

/** A minimal GitHub PR event payload with the given head/base repo full names. */
function eventPayload(headRepo: string, baseRepo: string): unknown {
  return {
    pull_request: {
      head: { repo: { full_name: headRepo } },
      base: { repo: { full_name: baseRepo } },
    },
  };
}

describe("[SCN-SSM-003] the fork-read helper decides external-PR status from the event payload", () => {
  it("returns true when the head repo differs from the base repo (a fork)", () => {
    expect(
      isExternalPrFromEvent(
        eventPayload("outside-contributor/spec-controller", "3f-consulting/spec-controller")
      )
    ).toBe(true);
  });

  it("returns false when the head repo equals the base repo (an internal branch)", () => {
    expect(
      isExternalPrFromEvent(
        eventPayload("3f-consulting/spec-controller", "3f-consulting/spec-controller")
      )
    ).toBe(false);
  });

  it("returns false when the payload is absent or malformed (local / non-PR runs)", () => {
    expect(isExternalPrFromEvent(undefined)).toBe(false);
    expect(isExternalPrFromEvent({})).toBe(false);
    expect(isExternalPrFromEvent({ pull_request: {} })).toBe(false);
  });
});
