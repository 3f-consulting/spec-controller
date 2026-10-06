import { describe, it, expect } from "vitest";
import { evidenceReconciliationFromSources } from "../assemble/evidenceReconciliationFromSources.js";
import { CORE_MESSAGES, CoreMessage } from "../domain/messages.js";
import type { RunContext } from "../provenance/provenance.js";
import { renderMarkdown } from "./markdown.js";

const ci = `name: fixture CI
jobs:
  quality:
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      - name: Install
        run: pnpm install --frozen-lockfile
      - name: Unit tests
        run: pnpm test
      - name: Types
        run: pnpm typecheck
`;

const feature = `Feature: fixture

  @unit @SCN-FIX-001
  Scenario: a fixture behaviour
    Given a fixture
`;

const scripts = { test: "vitest run", typecheck: "tsc --noEmit" };

const excludedStep = "ci.yml:quality:Types";
const strayEntry = "ci.yml:quality:Lint";

const ctx: RunContext = {
  target: "fixture",
  inputs: { features: "features" },
  runStart: new Date("2026-10-04T12:00:00.000Z"),
  sourceSha: null,
  toolSha: null,
  toolVersion: "0.0.0",
};

function reportLines(notChecks?: readonly string[]): string[] {
  const specController = notChecks === undefined ? {} : { notChecks };
  const packageJson = { scripts, specController } as Parameters<
    typeof evidenceReconciliationFromSources
  >[0]["packageJson"];
  const reconciliation = evidenceReconciliationFromSources({
    featureSources: [feature],
    untaggedScenarios: [],
    packageJson,
    ciSources: [ci],
    ciSourceNames: ["ci.yml"],
    runtimeObservations: [],
    deferralTags: [],
  });
  return renderMarkdown(reconciliation, ctx).split("\n");
}

const heading = CORE_MESSAGES[CoreMessage.ExcludedStepsHeading];
const excludedLine = (step: string): string => `- ${CORE_MESSAGES[CoreMessage.StepExcluded](step)}`;
const unmatchedLine = (entry: string): string =>
  `- ${CORE_MESSAGES[CoreMessage.NotChecksEntryMatchesNoStep](entry)}`;

function section(lines: readonly string[]): string[] {
  const start = lines.indexOf(heading);
  expect(start).toBeGreaterThanOrEqual(0);
  const next = lines.findIndex((line, i) => i > start && line.startsWith("#"));
  return lines.slice(start, next === -1 ? lines.length : next);
}

describe("[SCN-USG-015] a step named in `notChecks` is not a candidate, and is reported as excluded rather than dropped", () => {
  it("lists the excluded step on one line with its reason, under a heading and a blank line, then one blank line", () => {
    const lines = section(reportLines([excludedStep]));
    expect(lines).toStrictEqual([heading, "", excludedLine(excludedStep), ""]);
    expect(lines[2]).toContain(excludedStep);
  });

  it("lists an entry that names no step on its own line, when it is the only account", () => {
    const lines = section(reportLines([strayEntry]));
    expect(lines).toStrictEqual([heading, "", unmatchedLine(strayEntry), ""]);
    expect(lines[2]).toContain(strayEntry);
  });

  it("lists the excluded step before the entry that names no step, each on its own line", () => {
    const lines = section(reportLines([excludedStep, strayEntry]));
    expect(lines).toStrictEqual([heading, "", excludedLine(excludedStep), unmatchedLine(strayEntry), ""]);
  });

  it("renders no section, and nothing in its place, for a target that names no step a non-check", () => {
    const lines = reportLines();
    expect(lines).not.toContain(heading);
    expect(lines.some((line) => line.includes(excludedStep) && line.startsWith("- "))).toBe(false);
    const headings = lines.flatMap((line, i) => (i > 0 && line.startsWith("#") ? [i] : []));
    expect(headings.length).toBeGreaterThan(0);
    for (const i of headings) expect(lines[i - 1]).toBe("");
  });
});
