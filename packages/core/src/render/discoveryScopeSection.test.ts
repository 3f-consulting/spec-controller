import { describe, it, expect } from "vitest";
import { evidenceReconciliationFromSources } from "../assemble/evidenceReconciliationFromSources.js";
import type { EvidenceReconciliation } from "../assemble/renderInput.js";
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
`;

const nightly = `name: fixture nightly
jobs:
  sweep:
    steps:
      - name: Circular check
        run: pnpm lint:circular
      - name: Depth check
        run: pnpm lint:depth
  audit:
    steps:
      - name: Audit
        run: pnpm audit --audit-level=high
`;

const feature = `Feature: fixture

  @unit @SCN-FIX-001
  Scenario: a fixture behaviour
    Given a fixture
`;

const packageJson = {
  scripts: {
    test: "vitest run",
    "lint:circular": "madge --circular",
    "lint:depth": "depcruise src",
  },
  specController: { runners: { unit: "vitest" } },
} as Parameters<typeof evidenceReconciliationFromSources>[0]["packageJson"];

const ctx: RunContext = {
  target: "fixture",
  inputs: { features: "features" },
  runStart: new Date("2026-10-04T12:00:00.000Z"),
  sourceSha: null,
  toolSha: null,
  toolVersion: "0.0.0",
};

function reconcile(
  ciSources: readonly string[],
  ciSourceNames?: readonly string[]
): EvidenceReconciliation {
  return evidenceReconciliationFromSources({
    featureSources: [feature],
    untaggedScenarios: [],
    packageJson,
    ciSources,
    ...(ciSourceNames === undefined ? {} : { ciSourceNames }),
    runtimeObservations: [],
    deferralTags: [],
  });
}

const heading = CORE_MESSAGES[CoreMessage.DiscoveryScopeHeading];
const tableHeader = CORE_MESSAGES[CoreMessage.DiscoveryScopeTableHeader];

function section(lines: readonly string[]): string[] {
  const start = lines.indexOf(heading);
  expect(start).toBeGreaterThanOrEqual(0);
  const next = lines.findIndex((line, i) => i > start && line.startsWith("#"));
  return lines.slice(start, next === -1 ? lines.length : next);
}

const cells = (row: string): string[] =>
  row
    .split("|")
    .slice(1, -1)
    .map((cell) => cell.trim());

function rendered(reconciliation: EvidenceReconciliation): string[] {
  return section(renderMarkdown(reconciliation, ctx).split("\n"));
}

describe("[SCN-USG-020] the report names the workflows, the jobs and the step count discovery ranged over", () => {
  it("tables each workflow and job it read, with its steps and candidates, one row each in the settled order", () => {
    const reconciliation = reconcile([nightly, ci], ["nightly.yml", "ci.yml"]);
    const scope = reconciliation.summary.discoveryScope;
    expect(scope).toHaveLength(3);
    const lines = rendered(reconciliation);
    expect(lines).toHaveLength(8);
    expect(lines[0]).toBe(heading);
    expect(lines[1]).toBe("");
    expect(lines[2]).toBe(tableHeader);
    expect(cells(lines[2]!)).toHaveLength(4);
    expect(lines[3]).toBe("| --- | --- | --- | --- |");
    expect(lines.slice(4, 7)).toStrictEqual([
      "| ci.yml | quality | 3 | 2 |",
      "| nightly.yml | audit | 1 | 1 |",
      "| nightly.yml | sweep | 2 | 2 |",
    ]);
    expect(lines.slice(4, 7).map(cells)).toStrictEqual(
      scope!.map(({ source, job, steps, candidates }) => [source, job, String(steps), String(candidates)])
    );
    expect(lines.at(-1)).toBe("");
  });

  it("puts the placeholder in the workflow cell of every row when the target gives no workflow names", () => {
    const reconciliation = reconcile([nightly, ci]);
    const lines = rendered(reconciliation);
    expect(lines).toHaveLength(8);
    expect(lines.slice(4, 7)).toStrictEqual([
      "| — | audit | 1 | 1 |",
      "| — | quality | 3 | 2 |",
      "| — | sweep | 2 | 2 |",
    ]);
    expect(lines.at(-1)).toBe("");
  });

  it("renders no section, and nothing in its place, for a target with no pipeline", () => {
    const reconciliation = reconcile([], []);
    expect(reconciliation.summary).not.toHaveProperty("discoveryScope");
    const lines = renderMarkdown(reconciliation, ctx).split("\n");
    expect(lines).not.toContain(heading);
    expect(lines).not.toContain(tableHeader);
    const headings = lines.flatMap((line, i) => (i > 0 && line.startsWith("#") ? [i] : []));
    expect(headings.length).toBeGreaterThan(0);
    for (const i of headings) expect(lines[i - 1]).toBe("");
  });
});
