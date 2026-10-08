import { describe, it, expect } from "vitest";
import { evidenceReconciliationFromSources } from "../assemble/evidenceReconciliationFromSources.js";
import type { EvidenceReconciliation } from "../assemble/renderInput.js";
import { evidenceReconciliationOf } from "../domain/evidenceReconciliation.js";
import { CORE_MESSAGES, CoreMessage } from "../domain/messages.js";
import type { RunContext } from "../provenance/provenance.js";
import { renderMarkdown } from "./markdown.js";

const corpus = `@CVT
Feature: fixture fitness corpus

  Rule: the tree stays inside its thresholds

    @fitness @SCN-CVT-001
    Scenario: the codebase stays under its complexity threshold

    @fitness @SCN-CVT-002
    Scenario: every feature file carries a registered header code
`;

const packageJson = {
  scripts: { "lint:foo": "eslint", "lint:bar": "scn-subissues" },
  specController: { notChecks: ["ci.yml:quality:Checkout"] },
};

const ci = (barCitation: string): string => `name: fixture CI
jobs:
  quality:
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      - name: Complexity
        id: SCN-CVT-001
        run: pnpm lint:foo
      - name: Traceability${barCitation}
        run: pnpm lint:bar
`;

const ctx: RunContext = {
  target: "fixture",
  inputs: { features: "features" },
  runStart: new Date("2026-10-05T12:00:00.000Z"),
  sourceSha: null,
  toolSha: null,
  toolVersion: "0.0.0",
};

function reconcile(barCitation: string): EvidenceReconciliation {
  return evidenceReconciliationFromSources({
    featureSources: [corpus],
    untaggedScenarios: [],
    packageJson,
    ciSources: [ci(barCitation)],
    ciSourceNames: ["ci.yml"],
    runtimeObservations: [],
    deferralTags: [],
  });
}

const heading = CORE_MESSAGES[CoreMessage.StaticChecksHeading];
const counts = CORE_MESSAGES[CoreMessage.StaticChecksCounts];

function section(lines: readonly string[]): string[] {
  const start = lines.indexOf(heading);
  expect(start).toBeGreaterThanOrEqual(0);
  const next = lines.findIndex((line, i) => i > start && line.startsWith("#"));
  return lines.slice(start, next === -1 ? lines.length : next);
}

const linesOf = (reconciliation: EvidenceReconciliation): string[] =>
  renderMarkdown(reconciliation, ctx).split("\n");

describe("[SCN-USG-001] a CI check no fitness scenario cites is reported as an uncited static check", () => {
  it.each([
    ["renders the section as heading, blank, the counts line with the one uncited check, then one blank", "", 1],
    ["still renders the section, counting no uncited check, when every check is cited", "\n        id: SCN-CVT-002", 0],
  ])("%s", (_title, citation, uncited) => {
    const reconciliation = reconcile(citation);
    expect(reconciliation.summary.staticChecks).toStrictEqual({
      runningStaticCheckCount: 2,
      uncitedStaticCheckCount: uncited,
    });
    expect(section(linesOf(reconciliation))).toStrictEqual([heading, "", counts(2, uncited), ""]);
  });

  it("renders no section, and nothing in its place, for a report that carries no static-check axis", () => {
    const reconciliation = evidenceReconciliationOf([], [], [], true, false);
    expect(reconciliation.summary).not.toHaveProperty("staticChecks");
    const lines = linesOf(reconciliation);
    expect(lines).not.toContain(heading);
    const headings = lines.flatMap((line, i) => (i > 0 && line.startsWith("#") ? [i] : []));
    expect(headings.length).toBeGreaterThan(0);
    for (const i of headings) expect(lines[i - 1]).toBe("");
  });
});
