import { describe, it, expect } from "vitest";
import { evidenceReconciliationFromSources } from "../assemble/evidenceReconciliationFromSources.js";
import { CORE_MESSAGES, CoreMessage } from "../domain/messages.js";
import type { RunContext } from "../provenance/provenance.js";
import { renderMarkdown } from "./markdown.js";

const ci = `name: fixture CI
jobs:
  ci:
    steps:
      - name: Dump this run's step record
        env:
          STEPS_JSON: \${{ toJSON(steps) }}
        run: printf '%s' "$STEPS_JSON" > ci-steps.json
      - name: Self-reconciliation balance
        run: pnpm exec spec-controller balance --features features --ci .github/workflows
      - name: Sweep check
        run: pnpm lint:sweep
`;

const ciWithoutReconciler = `name: fixture CI
jobs:
  ci:
    steps:
      - name: Sweep check
        run: pnpm lint:sweep
`;

const feature = `Feature: fixture

  @unit @SCN-FIX-001
  Scenario: a fixture behaviour
    Given a fixture
`;

const packageJson = {
  scripts: { "lint:sweep": "madge --circular" },
} as Parameters<typeof evidenceReconciliationFromSources>[0]["packageJson"];

const ctx: RunContext = {
  target: "fixture",
  inputs: { features: "features" },
  runStart: new Date("2026-10-04T12:00:00.000Z"),
  sourceSha: null,
  toolSha: null,
  toolVersion: "0.0.0",
};

function reportLines(ciSource: string): string[] {
  const reconciliation = evidenceReconciliationFromSources({
    featureSources: [feature],
    untaggedScenarios: [],
    packageJson,
    ciSources: [ciSource],
    ciSourceNames: ["ci.yml"],
    reconcilerInvocation: "spec-controller balance",
    runtimeObservations: [],
    deferralTags: [],
  });
  return renderMarkdown(reconciliation, ctx).split("\n");
}

const heading = CORE_MESSAGES[CoreMessage.ReconcilerHeading];
const reconciles = CORE_MESSAGES[CoreMessage.ReconcilerReconciles];
const records = CORE_MESSAGES[CoreMessage.ReconcilerRecords];
const stepLine = (step: string, whatItIs: string): string =>
  `- ${CORE_MESSAGES[CoreMessage.ReconcilerStep](step, whatItIs)}`;

function section(lines: readonly string[]): string[] {
  const start = lines.indexOf(heading);
  expect(start).toBeGreaterThanOrEqual(0);
  const next = lines.findIndex((line, i) => i > start && line.startsWith("#"));
  return lines.slice(start, next === -1 ? lines.length : next);
}

describe("[SCN-USG-014] the balance step and its step-record dump are not candidates, and no configuration says so", () => {
  it("names each reconciler step on its own list line, with what that step does, under a heading and a blank line", () => {
    const lines = section(reportLines(ci));
    const dump = "ci.yml:ci:Dump this run's step record";
    const balance = "ci.yml:ci:Self-reconciliation balance";

    expect(reconciles).not.toBe(records);
    expect(lines.slice(0, 2)).toStrictEqual([heading, ""]);
    expect(lines.slice(2, 4)).toStrictEqual([stepLine(dump, records), stepLine(balance, reconciles)]);
    expect(lines.filter((line) => line.startsWith("- "))).toHaveLength(2);
    expect(lines[2]).toContain(dump);
    expect(lines[3]).toContain(balance);
    expect(reportLines(ci)).not.toContain(CORE_MESSAGES[CoreMessage.ExcludedStepsHeading]);
  });

  it("follows the list with exactly one blank line before the next section", () => {
    const lines = section(reportLines(ci));
    expect(lines).toHaveLength(5);
    expect(lines.at(-1)).toBe("");
    expect(lines.at(-2)).not.toBe("");
  });

  it("renders no section, and nothing in its place, for a pipeline that runs no reconciliation", () => {
    const lines = reportLines(ciWithoutReconciler);
    expect(lines).not.toContain(heading);
    expect(lines.some((line) => line.includes(reconciles) || line.includes(records))).toBe(false);
    const headings = lines.flatMap((line, i) => (i > 0 && line.startsWith("#") ? [i] : []));
    expect(headings.length).toBeGreaterThan(0);
    for (const i of headings) expect(lines[i - 1]).toBe("");
  });
});
