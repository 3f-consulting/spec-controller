import { describe, it, expect } from "vitest";
import { renderMarkdown } from "./markdown.js";
import { renderJson } from "./json.js";
import { reconcile, summaryOf } from "../domain/evidenceReconciliation.js";
import type { EvidenceReconciliation } from "../domain/evidenceReconciliation.js";
import { evidenceObligations } from "../census/evidenceObligations.js";
import type { EvidenceObligations } from "../census/evidenceObligations.js";
import type { Ledger } from "../model.js";
import type { RunContext } from "../provenance/provenance.js";

const er = (ledger: Ledger): EvidenceReconciliation => ({ summary: summaryOf(ledger, false, false), ledger });

const ctx: RunContext = {
  target: "stg-017",
  inputs: { features: "features" },
  runStart: new Date("2026-09-23T20:00:00.000Z"),
  sourceSha: "0000000000000000000000000000000000000000",
  toolSha: "0000000000000000000000000000000000000000",
  toolVersion: "0.1.0",
};

const ledger = reconcile(
  [
    { scnId: "SCN-ONE-001", evidenceObligations: [{ qualityCheck: "unit" }] },
    { scnId: "SCN-ONE-001", evidenceObligations: [{ qualityCheck: "unit" }] },
    { scnId: "SCN-OWN-001", evidenceObligations: [{ qualityCheck: "unit" }] },
  ],
  []
);
const census: EvidenceObligations = {
  ...evidenceObligations(3, 3),
  sharedScnCodes: [
    {
      scnId: "SCN-ONE-001",
      scenarios: [
        { feature: "one.feature", scenario: "the scenario in one" },
        { feature: "two.feature", scenario: "the scenario in two" },
      ],
    },
  ],
};

describe("[SCN-STG-017] the report states scenarios against accounts, and names the scenarios sharing each code", () => {
  it("states that the corpus holds three scenarios in two accounts", () => {
    const md = renderMarkdown(er(ledger), ctx, census);
    expect(md).toContain(
      "- The corpus holds 3 scenarios in 2 accounts — 1 @SCN code(s) carried by more than one scenario:"
    );
  });

  it("names the shared code with the file and the name of each scenario carrying it", () => {
    const md = renderMarkdown(er(ledger), ctx, census);
    expect(md).toContain("  - SCN-ONE-001: one.feature : the scenario in one; two.feature : the scenario in two");
  });

  it("carries the shared codes in the JSON census, and nothing when no code is shared", () => {
    const shared = JSON.parse(renderJson(er(ledger), ctx, census));
    expect(shared.evidenceObligations.sharedScnCodes).toEqual(census.sharedScnCodes);
    const clean = JSON.parse(renderJson(er(ledger), ctx, evidenceObligations(3, 3)));
    expect(clean.evidenceObligations).not.toHaveProperty("sharedScnCodes");
    expect(renderMarkdown(er(ledger), ctx, evidenceObligations(3, 3))).not.toContain("The corpus holds");
  });

  it("renders an account whose sharers name no quality check by its outcome alone, never an undefined subject", () => {
    const bare = reconcile(
      [
        { scnId: "SCN-ONE-001", evidenceObligations: [] },
        { scnId: "SCN-ONE-001", evidenceObligations: [] },
      ],
      []
    );
    const row = renderMarkdown(er(bare), ctx).split("\n").find((line) => line.startsWith("| SCN-ONE-001 "));
    expect(row).toContain("⧉ Evidence Obligation's @SCN code is carried by another Scenario");
    expect(row).not.toContain("undefined");
  });
});
