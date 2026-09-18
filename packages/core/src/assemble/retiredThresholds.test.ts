/**
 * @unit for @SCN-USG-023 — a manifest carrying `specController.thresholds` is named as a retired
 * key, and none of its entries raises an Evidence Obligation.
 *
 * THROUGH THE WHOLE COMPOSITION AND ITS RENDER, over a target whose one scenario carries the check
 * tag its ceiling was written for and no evidence tag: the name is a graft onto the summary and the
 * absence is the ledger, so a reader naming the key while still raising the ceiling's obligation —
 * or dropping the obligation without naming the key — fails one arm or the other. The resolver's
 * own arms live in `parse/targetManifest.test.ts`.
 *
 * Bidirectional evidence: the describe carries its @SCN id, matching
 * features/uncited-static-checks.feature and the @integration steps in
 * tests/steps/uncitedStaticChecks.steps.ts.
 */

import { describe, it, expect } from "vitest";
import { renderMarkdown } from "../render/markdown.js";
import type { RunContext } from "../provenance/provenance.js";
import { evidenceReconciliationFromSources } from "./evidenceReconciliationFromSources.js";
import type { EvidenceReconciliation } from "./renderInput.js";

const corpus = `@TTH
Feature: a target whose manifest still holds a scenario to a ceiling

  @SCN-TTH-001 @ci-run-time
  Scenario: the suite runs inside its ceiling
`;

const ctx: RunContext = {
  target: "ceilinged-target",
  inputs: { features: "features" },
  runStart: new Date("2026-09-18T09:00:00.000Z"),
  sourceSha: "905a987c0ffeeba110000000000000000deadbeef",
  toolSha: "13ee47f271ace511efdb2511276284b4cb50c247",
  toolVersion: "0.1.0",
};

/** The composition over the target, its manifest written with or without the ceilings. */
function reconcile(ceilinged: boolean): EvidenceReconciliation {
  // WIDENED ON PURPOSE: the composition's manifest type names only the keys it reads, and this key
  // is exactly the one it no longer does.
  const specController: Record<string, unknown> = ceilinged
    ? { thresholds: { "SCN-TTH-001": { "ci-run-time": 75 } } }
    : {};
  return evidenceReconciliationFromSources({
    featureSources: [corpus],
    untaggedScenarios: [],
    packageJson: { specController },
    ciSources: [],
    runtimeObservations: [],
    deferralTags: [],
  });
}

describe("[SCN-USG-023] a manifest carrying specController.thresholds is named as a retired key, and none of its entries raises an Evidence Obligation", () => {
  it("names thresholds on the summary", () => {
    expect(reconcile(true).summary.retiredKeys).toEqual(["thresholds"]);
  });

  it("renders the same top-level line checkRegistry and staticChecks render, under Static checks", () => {
    expect(
      renderMarkdown(reconcile(true), ctx)
        .split("\n")
        .filter((line) => line.startsWith("- specController."))
    ).toEqual([
      "- specController.thresholds — retired: this reader no longer reads it, and none of its entries reach the books.",
    ]);
  });

  it("raises no Evidence Obligation for the scenario the ceiling names — the ledger is the one a manifest without it produces", () => {
    const ceilinged = reconcile(true);
    expect(ceilinged.ledger).toEqual(reconcile(false).ledger);
    expect(
      ceilinged.ledger.scenarioReconciliations.map((row) => [
        row.scnId,
        row.qualityCheckReconciliations.map((item) => [item.outcome, item.evidenceObligation]),
      ])
    ).toEqual([["SCN-TTH-001", [["both-missing", undefined]]]]);
  });
});
