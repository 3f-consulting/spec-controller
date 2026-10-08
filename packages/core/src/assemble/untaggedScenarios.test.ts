import { describe, it, expect } from "vitest";
import { evidenceReconciliationFromSources } from "./evidenceReconciliationFromSources.js";
import { assembleRenderInput, type EvidenceReconciliation } from "./renderInput.js";
import { renderReport } from "../render/markdown.js";
import { fixtureCtx as ctx } from "./runContext.testkit.js";

const feature = `Feature: alpha

  @unit @SCN-FIX-001
  Scenario: a fixture behaviour
    Given a fixture

  Scenario: a scenario with no anchor
    Given nothing cites it
`;

const locator = "alpha.feature : a scenario with no anchor";

function reconcile(untaggedScenarios: readonly string[]): EvidenceReconciliation {
  return evidenceReconciliationFromSources({
    featureSources: [feature],
    untaggedScenarios,
    packageJson: { scripts: {} },
    ciSources: [],
    runtimeObservations: [],
    deferralTags: [],
  });
}

describe("[SCN-RPT-014] Warnings lists the untagged scenarios with their feature locators", () => {
  it("carries each untagged scenario it was handed as an out-of-balance row named by its locator", () => {
    const row = reconcile([locator]).ledger.scenarioReconciliations.find((s) => s.scnId === locator);
    expect(row).toMatchObject({
      verdict: "out-of-balance",
      reconcilingItems: [{ outcome: "no-scn-code" }],
    });
  });

  it("lists the locator in the markdown ledger as having no @SCN code to link to", () => {
    const md = renderReport(assembleRenderInput(reconcile([locator]), ctx));
    const rows = md
      .split("\n")
      .filter((line) => line.startsWith(`| ${locator} |`) && line.includes("✗ out-of-balance"));
    expect(rows).toHaveLength(1);
    expect(rows[0]).toContain("Evidence Obligation has no @SCN code for an Evidence Observation to link to");
  });

  it("carries no untagged row when it was handed none", () => {
    const { ledger } = reconcile([]);
    expect(ledger.scenarioReconciliations.map((s) => s.scnId)).toStrictEqual(["SCN-FIX-001"]);
  });
});
