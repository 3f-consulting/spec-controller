import { describe, it, expect } from "vitest";
import { renderMarkdown } from "./markdown.js";
import { reconcile, summaryOf } from "../domain/evidenceReconciliation.js";
import { countScnOccurrences, parseScenarios, parseUntaggedScenarios } from "../parse/scenarios.js";
import { evidenceObligations } from "../census/evidenceObligations.js";
import type { RunContext } from "../provenance/provenance.js";
import { CORE_MESSAGES, CoreMessage } from "../domain/messages.js";

const ctx: RunContext = {
  target: "fixture",
  inputs: { features: "features" },
  runStart: new Date("2026-10-05T00:00:00.000Z"),
  sourceSha: null,
};

const zeta = `Feature: zeta

  Scenario: untagged scenario b
    Given nothing cites it

  @unit @SCN-ZET-001
  Scenario: a tagged behaviour
    Given a fixture

  Scenario: untagged scenario a
    Given nothing cites it either
`;

const alpha = `Feature: alpha

  Scenario: untagged scenario c
    Given nothing cites it
`;

function censusBlock(corpus: readonly { feature: string; source: string }[]): string[] {
  const untagged = corpus.flatMap(({ feature, source }) =>
    parseUntaggedScenarios(source).map((scenario) => ({ feature, scenario }))
  );
  const raw = corpus.reduce((n, { source }) => n + countScnOccurrences(source), 0);
  const scenarios = corpus.flatMap(({ source }) => parseScenarios(source));
  const ledger = reconcile(
    scenarios,
    [],
    untagged.map(({ feature, scenario }) => `${feature} : ${scenario}`)
  );
  const md = renderMarkdown(
    { summary: summaryOf(ledger, false, false), ledger },
    ctx,
    evidenceObligations(raw, scenarios.length, untagged)
  );
  const lines = md.split("\n");
  const start = lines.indexOf(`- ${CORE_MESSAGES[CoreMessage.ExcludedScnOccurrences](0)}`);
  expect(start).toBeGreaterThan(0);
  const block = lines.slice(start);
  return block.slice(0, block.indexOf(""));
}

describe("[SCN-RPT-014] Warnings lists the untagged scenarios with their feature locators", () => {
  it("lists the untagged scenarios sorted by feature, then scenario, whatever order the corpus gives them in", () => {
    expect(
      censusBlock([
        { feature: "zeta.feature", source: zeta },
        { feature: "alpha.feature", source: alpha },
      ])
    ).toEqual([
      `- ${CORE_MESSAGES[CoreMessage.ExcludedScnOccurrences](0)}`,
      `- ${CORE_MESSAGES[CoreMessage.UntaggedScenarios](3)}`,
      "  - alpha.feature : untagged scenario c",
      "  - zeta.feature : untagged scenario a",
      "  - zeta.feature : untagged scenario b",
    ]);
  });
});
