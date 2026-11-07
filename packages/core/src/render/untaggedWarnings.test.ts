import { describe, it, expect } from "vitest";
import { renderMarkdown } from "../assemble/composers.js";
import { reconcile, summaryOf } from "../domain/evidenceReconciliation.js";
import { readCorpus } from "../parse/scenarioReaders.test-utils.js";
import { censusBlock } from "./renderedSection.test-utils.js";
import { evidenceObligations } from "../domain/corpusCounts.js";
import { scenarioTitleOf } from "../domain/scenarioName.test-utils.js";
import type { RunContext } from "../domain/runProvenance.js";
import { CoreMessage } from "./messages.js";
import { FEATURES, VITEST, PYTEST, JEST, JUNIT, RSPEC, CUCUMBER, CI, PACKAGE_JSON, CI_STEPS } from "../runInputs.test-utils.js";
import { publishedExitCodeOf } from "./publishedExitCodes.test-utils.js";
import { coreMessage } from "./coreText.js";

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

  @unit @CLM-ZET-001
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
    untagged.map((name) => `${name.feature} : ${scenarioTitleOf(name)}`)
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

describe("[CLM-RPT-014] the report counts the scenarios with no claim code", () => {
  it("states the count of scenarios with no claim code, naming none of them there", () => {
    expect(censusBlock(renderCorpus(corpus))).toEqual([
      `- ${coreMessage(CoreMessage.ExcludedClaimOccurrences, { count: 0 })}`,
      `- ${coreMessage(CoreMessage.UntaggedScenarios, { count: 3 })}`,
    ]);
  });
});

describe("[CLM-RPT-095] each scenario with no claim code is listed once, on its own ledger row", () => {
  it.each(untaggedLocators)("names %s exactly once, on its own ledger row", (locator) => {
    const lines = renderCorpus(corpus).split("\n");
    const naming = lines.filter((line) => line.includes(locator));
    expect(naming).toHaveLength(1);
    expect(naming[0]?.startsWith(`| ${locator} |`)).toBe(true);
  });
});
