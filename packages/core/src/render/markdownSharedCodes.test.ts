import { describe, it, expect, beforeEach } from "vitest";
import { renderMarkdown } from "../assemble/composers.js";
import { renderJson } from "../assemble/composers.js";
import { reconcile, summaryOf } from "../domain/evidenceReconciliation.js";
import type { EvidenceReconciliation } from "../domain/evidenceReconciliation.js";
import { evidenceObligations, sharedScnCodesOf } from "../domain/corpusCounts.js";
import { countScnOccurrences, parseFeatureCounts, parseScenarios, parseUntaggedScenarios } from "../parse/scenarios.js";
import { CORE_MESSAGES, CoreMessage } from "./messages.js";
import type { EvidenceObligations } from "../domain/corpusCounts.js";
import type { Ledger } from "../model.js";
import type { RunContext } from "../domain/runProvenance.js";

const er = (ledger: Ledger): EvidenceReconciliation => ({ summary: summaryOf(ledger, false, false), ledger });

const ctx: RunContext = {
  target: "stg-017",
  inputs: { features: "features" },
  runStart: new Date("2026-09-23T20:00:00.000Z"),
  sourceSha: "0000000000000000000000000000000000000000",
  toolSha: "0000000000000000000000000000000000000000",
  toolVersion: "0.1.0",
};

let ledger: Ledger;
let census: EvidenceObligations;
beforeEach(() => {
  ledger = reconcile(
    [
      { scnId: "SCN-ONE-001", evidenceObligations: [{ qualityCheck: "unit" }] },
      { scnId: "SCN-ONE-001", evidenceObligations: [{ qualityCheck: "unit" }] },
      { scnId: "SCN-OWN-001", evidenceObligations: [{ qualityCheck: "unit" }] },
    ],
    []
  );
  census = {
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
});

const alpha = `Feature: alpha

  @unit @SCN-TRI-001
  Scenario: the first carrier of the three-way code
    Given a fixture

  @unit @SCN-DUO-001
  Scenario: the first carrier of the two-way code
    Given a fixture

  @unit @SCN-OWN-001
  Scenario: a scenario of its own
    Given a fixture
`;

const beta = `Feature: beta

  @unit @SCN-TRI-001
  Scenario: the second carrier of the three-way code
    Given a fixture

  @unit @SCN-DUO-001
  Scenario: the second carrier of the two-way code
    Given a fixture

  @unit @SCN-TRI-001
  Scenario: the third carrier of the three-way code
    Given a fixture
`;

function censusBlock(corpus: readonly { feature: string; source: string }[]): string[] {
  const untagged = corpus.flatMap(({ feature, source }) =>
    parseUntaggedScenarios(source).map((scenario) => ({ feature, scenario }))
  );
  const raw = corpus.reduce((n, { source }) => n + countScnOccurrences(source), 0);
  const scenarios = corpus.flatMap(({ source }) => parseScenarios(source));
  const md = renderMarkdown(
    er(reconcile(scenarios, [])),
    ctx,
    evidenceObligations(raw, scenarios.length, untagged, sharedScnCodesOf(corpus.map(({ feature, source }) => ({ feature, ...parseFeatureCounts(source) }))))
  );
  const lines = md.split("\n");
  const start = lines.indexOf(`- ${CORE_MESSAGES[CoreMessage.ExcludedScnOccurrences](0)}`);
  expect(start).toBeGreaterThan(0);
  const block = lines.slice(start);
  return block.slice(0, block.indexOf(""));
}

describe("[SCN-STG-017] the report states scenarios against accounts, and names the scenarios sharing each code", () => {
  it.each([
    [
      "states that the corpus holds three scenarios in two accounts",
      "- The corpus holds 3 scenarios in 2 accounts — 1 @SCN code(s) carried by more than one scenario:",
    ],
    [
      "names the shared code with the file and the name of each scenario carrying it",
      "  - SCN-ONE-001: one.feature : the scenario in one; two.feature : the scenario in two",
    ],
  ])("%s", (_title, line) => {
    const md = renderMarkdown(er(ledger), ctx, census);
    expect(md).toContain(line);
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

  it("counts every scenario against its accounts and names each shared code's carriers, a code to a line, in code order", () => {
    expect(
      censusBlock([
        { feature: "alpha.feature", source: alpha },
        { feature: "beta.feature", source: beta },
      ])
    ).toEqual([
      `- ${CORE_MESSAGES[CoreMessage.ExcludedScnOccurrences](0)}`,
      `- ${CORE_MESSAGES[CoreMessage.SharedScnCodes](6, 3, 2)}`,
      "  - SCN-DUO-001: alpha.feature : the first carrier of the two-way code; beta.feature : the second carrier of the two-way code",
      "  - SCN-TRI-001: alpha.feature : the first carrier of the three-way code; beta.feature : the second carrier of the three-way code; beta.feature : the third carrier of the three-way code",
    ]);
  });
});
