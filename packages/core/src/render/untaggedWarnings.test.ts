import { describe, it, expect } from "vitest";
import { renderMarkdown } from "../assemble/composers.js";
import { reconcile, summaryOf } from "../domain/evidenceReconciliation.js";
import { readCorpus } from "../parse/scenarioReaders.test-utils.js";
import { censusBlock } from "./renderedSection.test-utils.js";
import { evidenceObligations } from "../domain/corpusCounts.js";
import type { RunContext } from "../domain/runProvenance.js";
import { CORE_MESSAGES, CoreMessage } from "./messages.js";
import { FEATURES, VITEST, PYTEST, JEST, JUNIT, RSPEC, CUCUMBER, CI, PACKAGE_JSON, CI_STEPS } from "../runInputs.test-utils.js";
import { publishedExitCodeOf } from "./publishedExitCodes.test-utils.js";

const ctx: RunContext = {
  target: "fixture",
  inputs: [{ ...FEATURES, path: "features" }, VITEST, PYTEST, JEST, JUNIT, RSPEC, CUCUMBER, CI, PACKAGE_JSON, CI_STEPS],
  corpus: "features",
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
  const { untagged, raw, scenarios } = readCorpus(corpus);
  const ledger = reconcile(
    scenarios,
    [],
    untagged.map(({ feature, scenario }) => `${feature} : ${scenario}`)
  );
  return renderMarkdown(
    { summary: summaryOf(ledger, false), ledger },
    ctx,
    publishedExitCodeOf,
    evidenceObligations(raw, scenarios.length, untagged)
  );
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
      "- 3 scenario(s) carry no @SCN code",
    ]);
  });

  it.each(untaggedLocators)("names %s exactly once, on its own ledger row", (locator) => {
    const lines = renderCorpus(corpus).split("\n");
    const naming = lines.filter((line) => line.includes(locator));
    expect(naming).toHaveLength(1);
    expect(naming[0]?.startsWith(`| ${locator} |`)).toBe(true);
  });
});
