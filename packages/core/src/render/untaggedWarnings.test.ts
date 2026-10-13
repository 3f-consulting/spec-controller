import { describe, it, expect } from "vitest";
import { renderMarkdown } from "./markdown.js";
import { reconcile, summaryOf } from "../domain/evidenceReconciliation.js";
import { countScnOccurrences, parseScenarios, parseUntaggedScenarios } from "../parse/scenarios.js";
import { evidenceObligations } from "../domain/corpusCounts.js";
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

function renderCorpus(corpus: readonly { feature: string; source: string }[]): string {
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
  return renderMarkdown(
    { summary: summaryOf(ledger, false, false), ledger },
    ctx,
    evidenceObligations(raw, scenarios.length, untagged)
  );
}

function censusBlock(md: string): string[] {
  const lines = md.split("\n");
  const start = lines.indexOf(`- ${CORE_MESSAGES[CoreMessage.ExcludedScnOccurrences](0)}`);
  expect(start).toBeGreaterThan(0);
  const block = lines.slice(start);
  return block.slice(0, block.indexOf(""));
}

const corpus = [
  { feature: "zeta.feature", source: zeta },
  { feature: "alpha.feature", source: alpha },
];

const untaggedLocators = [
  "alpha.feature : untagged scenario c",
  "zeta.feature : untagged scenario a",
  "zeta.feature : untagged scenario b",
];

describe("[SCN-RPT-014] the ledger summary counts the untagged scenarios, and each is named once, on its own ledger row", () => {
  it("states the untagged count in the ledger summary, naming none of them there", () => {
    expect(censusBlock(renderCorpus(corpus))).toEqual([
      `- ${CORE_MESSAGES[CoreMessage.ExcludedScnOccurrences](0)}`,
      "- 3 scenario(s) carry no @SCN tag",
    ]);
  });

  it.each(untaggedLocators)("names %s exactly once, on its own ledger row", (locator) => {
    const lines = renderCorpus(corpus).split("\n");
    const naming = lines.filter((line) => line.includes(locator));
    expect(naming).toHaveLength(1);
    expect(naming[0]?.startsWith(`| ${locator} |`)).toBe(true);
  });
});
