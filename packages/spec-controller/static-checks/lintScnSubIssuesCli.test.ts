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
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  checkStaticEvidenceObligations,
  parseScenarios,
  runningStaticChecks,
} from "@3f-consulting/spec-controller-core";
import { staticCheckEvidenceObligationsOf } from "@3f-consulting/spec-controller-core/internal";
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

/**
 * @SCN-SSM-006 (3F-2366) — the check's own reconciliation, read over the REAL tree.
 *
 * The @unit half of the self-reconciliation: the two sides of the credit, read from
 * spec-controller's own ci.yml / package.json / features with the SAME production readers the
 * reconciler uses — never a hand-rolled grep, which would agree with the reconciler by
 * coincidence and drift the moment either changed.
 *
 * Debit side: a scenario NAMES lint:scn-subissues via @lint=, so the run has an Evidence
 * Obligation to settle against rather than folding onto the suspense scenario as an uncited
 * static check. Credit side: the check both EXISTS as a script and is ENFORCED over real
 * source by a CI run step — exists-without-enforcement is the watermelon, and asserting only
 * that the script is present would be asserting the check exists rather than that it fires.
 */
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const readRepoFile = (relative: string): string =>
  fs.readFileSync(path.join(repoRoot, relative), "utf8");

/** The static check whose own books this block reconciles. */
const OWN_STATIC_CHECK = "lint:scn-subissues";

/** The guard-prefix set the balance CLI SETS at its edge and injects into the core. */
const GUARD_PREFIXES = ["lint:", "guard:"] as const;

describe("[SCN-SSM-006] lint:scn-subissues is reconciled on spec-controller's own Ledger", () => {
  const ciSource = readRepoFile(".github/workflows/ci.yml");
  const packageJson = JSON.parse(readRepoFile("package.json")) as { scripts?: Record<string, string> };
  const featureSource = readRepoFile("features/scenario-sub-issue-match.feature");

  it("is named by a scenario, so its run has an Evidence Obligation to settle against", () => {
    const named = staticCheckEvidenceObligationsOf(parseScenarios(featureSource));
    expect([...named]).toContain(OWN_STATIC_CHECK);
  });

  it("exists as a script AND is enforced over real source — it fires, it is not merely present", () => {
    expect(checkStaticEvidenceObligations([OWN_STATIC_CHECK], [ciSource], packageJson)).toEqual([
      {
        qualityCheck: "lint",
        staticCheck: OWN_STATIC_CHECK,
        exists: true,
        enforcedOverRealSource: true,
      },
    ]);
  });

  it("is one of the running static checks the observer emits into the evidence stream", () => {
    const running = runningStaticChecks([ciSource], packageJson, GUARD_PREFIXES).map(
      (observation) => observation.staticCheck
    );
    expect(running).toContain(OWN_STATIC_CHECK);
  });
});
