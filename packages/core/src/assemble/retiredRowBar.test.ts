/**
 * @unit for @SCN-LNT-035 — a bar a configured row still carries is named as a retired key, and the
 * row is credited by its own step's outcome as any row is.
 *
 * THROUGH THE WHOLE COMPOSITION AND ITS RENDER, over the @SCN-LNT-021 target with a bar written on
 * each row: the name is a graft onto the summary and the credit is the ledger, so a reader naming
 * the bar by dropping the row — or crediting the row by reading its bar — fails one arm or the
 * other. The resolver's own arms live in `parse/targetManifest.test.ts`.
 *
 * Bidirectional evidence: the describe carries its @SCN id, matching
 * features/fitness-reconciliation.feature and the @integration steps in
 * tests/steps/retiredRowBar.steps.ts.
 */

import { describe, it, expect } from "vitest";
import { renderMarkdown } from "../render/markdown.js";
import type { RunContext } from "../provenance/provenance.js";
import type { CiStepRecord } from "../parse/ciStepRecord.js";
import { evidenceReconciliationFromSources } from "./evidenceReconciliationFromSources.js";
import type { EvidenceReconciliation } from "./renderInput.js";

const corpus = `@CVT
Feature: a converted target's fitness corpus

  Rule: the tree stays inside its bars

    @fitness @SCN-CVT-001
    Scenario: the codebase stays under its complexity bar

    @fitness @SCN-CVT-002
    Scenario: the domain's mutation score stays above its gate
`;

const ci = `name: fixture CI
jobs:
  quality:
    steps:
      - name: Complexity
        id: SCN-CVT-001
        if: always()
        run: eslint
      - name: Mutation
        id: SCN-CVT-002
        if: always()
        run: stryker run
`;

const record: CiStepRecord = {
  "SCN-CVT-001": { outcome: "success", conclusion: "success" },
  "SCN-CVT-002": { outcome: "success", conclusion: "success" },
};

const ctx: RunContext = {
  target: "barred-row-target",
  inputs: { features: "features" },
  runStart: new Date("2026-09-18T09:00:00.000Z"),
  sourceSha: "905a987c0ffeeba110000000000000000deadbeef",
  toolSha: "13ee47f271ace511efdb2511276284b4cb50c247",
  toolVersion: "0.1.0",
};

/** The composition over the target, its rows written with or without the bars. */
function reconcile(barred: boolean): EvidenceReconciliation {
  const bars = (row: object): object => (barred ? row : {});
  return evidenceReconciliationFromSources({
    featureSources: [corpus],
    untaggedScenarios: [],
    packageJson: {
      specController: {
        fitnessChecks: [
          { scn: "SCN-CVT-001", command: "eslint", ...bars({ atMost: 10 }) },
          {
            scn: "SCN-CVT-002",
            command: "stryker run",
            ...bars({ atLeast: { mutationGate: "domain" }, atMost: 100 }),
          },
        ],
      },
    },
    ciSources: [ci],
    runtimeObservations: [],
    deferralTags: [],
    ciStepRecord: record,
  });
}

describe("[SCN-LNT-035] a bar a configured row still carries is named as a retired key, and the row is credited as any row is", () => {
  it("names each bar with its row on the summary", () => {
    expect(reconcile(true).summary.retiredKeys).toEqual([
      "fitnessChecks[SCN-CVT-001].atMost",
      "fitnessChecks[SCN-CVT-002].atLeast",
      "fitnessChecks[SCN-CVT-002].atMost",
    ]);
  });

  it("renders one line per bar under Static checks, saying the bar is unread and what credits the row", () => {
    const tail = "retired: this reader no longer reads a row's bar, and the row is credited by its step's outcome.";
    expect(
      renderMarkdown(reconcile(true), ctx)
        .split("\n")
        .filter((line) => line.startsWith("- specController."))
    ).toEqual([
      `- specController.fitnessChecks[SCN-CVT-001].atMost — ${tail}`,
      `- specController.fitnessChecks[SCN-CVT-002].atLeast — ${tail}`,
      `- specController.fitnessChecks[SCN-CVT-002].atMost — ${tail}`,
    ]);
  });

  it("credits each barred row by its own step's outcome, exactly as the same rows carrying no bar", () => {
    // THE LEDGER IS IDENTICAL WITH AND WITHOUT THE BARS — the bar is named, never read.
    const barred = reconcile(true);
    expect(barred.ledger).toEqual(reconcile(false).ledger);
    expect(
      barred.ledger.scenarioReconciliations.map((row) => [
        row.scnId,
        row.verdict,
        row.qualityCheckReconciliations.map((item) => [item.staticCheck, item.outcome, item.evidenceObligation]),
      ])
    ).toEqual([
      ["SCN-CVT-001", "balanced", [[undefined, "satisfied", { qualityCheck: "fitness" }]]],
      ["SCN-CVT-002", "balanced", [[undefined, "satisfied", { qualityCheck: "fitness" }]]],
    ]);
  });

  it("carries no account at all for rows written without a bar — omit-when-empty", () => {
    const plain = reconcile(false);
    expect("retiredKeys" in plain.summary).toBe(false);
    expect(renderMarkdown(plain, ctx)).not.toContain("- specController.");
  });
});
