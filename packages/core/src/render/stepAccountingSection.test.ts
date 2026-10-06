import { describe, it, expect } from "vitest";
import { evidenceReconciliationFromSources } from "../assemble/evidenceReconciliationFromSources.js";
import type { EvidenceReconciliation } from "../assemble/renderInput.js";
import { CORE_MESSAGES, CoreMessage } from "../domain/messages.js";
import type { RunContext } from "../provenance/provenance.js";
import { renderMarkdown } from "./markdown.js";

const ci = `name: fixture CI
jobs:
  ci:
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      - name: Install
        run: pnpm install --frozen-lockfile
      - name: Build
        run: pnpm build
      - name: Unit tests
        run: pnpm test
      - name: Sweep check
        run: pnpm lint:sweep
      - name: Types
        run: pnpm typecheck
      - name: Depth check
        run: pnpm lint:depth
      - name: Code scanning
        uses: github/codeql-action/analyze@v3
      - name: Dump this run's step record
        env:
          STEPS_JSON: \${{ toJSON(steps) }}
        run: printf '%s' "$STEPS_JSON" > ci-steps.json
      - name: Self-reconciliation balance
        run: pnpm exec spec-controller balance --features features --ci .github/workflows
`;

const feature = `Feature: fixture

  @unit @SCN-FIX-001
  Scenario: a fixture behaviour
    Given a fixture
`;

const packageJson = {
  scripts: {
    test: "vitest run",
    build: "tsc -b",
    typecheck: "tsc --noEmit",
    "lint:sweep": "madge --circular",
    "lint:depth": "depcruise src",
  },
  specController: {
    runners: { unit: "vitest" },
    notChecks: ["ci.yml:ci:Checkout", "ci.yml:ci:Install", "ci.yml:ci:Build"],
  },
} as Parameters<typeof evidenceReconciliationFromSources>[0]["packageJson"];

const ctx: RunContext = {
  target: "fixture",
  inputs: { features: "features" },
  runStart: new Date("2026-10-04T12:00:00.000Z"),
  sourceSha: null,
  toolSha: null,
  toolVersion: "0.0.0",
};

function reconcile(ciSources: readonly string[]): EvidenceReconciliation {
  return evidenceReconciliationFromSources({
    featureSources: [feature],
    untaggedScenarios: [],
    packageJson,
    ciSources,
    ciSourceNames: ciSources.map(() => "ci.yml"),
    reconcilerInvocation: "spec-controller balance",
    runtimeObservations: [],
    deferralTags: [],
  });
}

const heading = CORE_MESSAGES[CoreMessage.StepAccountingHeading];

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

describe("[SCN-USG-018] candidates, runners, the reconciler and the excluded sum to the steps read", () => {
  it("tables each count the assembler computed under its header, then states that every step read is accounted for", () => {
    const reconciliation = reconcile([ci]);
    const accounting = reconciliation.summary.stepAccounting;
    expect(accounting).toStrictEqual({
      stepsRead: 10,
      candidates: 4,
      runners: 1,
      reconciler: 2,
      excluded: 3,
      accountedFor: 10,
    });
    const lines = section(renderMarkdown(reconciliation, ctx).split("\n"));
    expect(lines).toHaveLength(8);
    expect(lines[0]).toBe(heading);
    expect(lines[1]).toBe("");
    expect(lines[2]).toBe(CORE_MESSAGES[CoreMessage.StepAccountingTableHeader]);
    expect(lines[3]).toBe("| --- | --- | --- | --- | --- | --- |");
    expect(lines[4]).toBe("| 10 | 4 | 1 | 2 | 3 | 10 |");
    expect(cells(lines[4]!)).toStrictEqual(
      [
        accounting!.stepsRead,
        accounting!.candidates,
        accounting!.runners,
        accounting!.reconciler,
        accounting!.excluded,
        accounting!.accountedFor,
      ].map(String)
    );
    expect(cells(lines[2]!)).toHaveLength(6);
    expect(lines[5]).toBe("");
    expect(lines[6]).toBe(`- ${CORE_MESSAGES[CoreMessage.EveryStepAccountedFor]}`);
    expect(lines[7]).toBe("");
    expect(lines).toStrictEqual([
      "### Step accounting",
      "",
      "| Steps read | Candidates | Runners | Reconciler | Excluded | Accounted for |",
      "| --- | --- | --- | --- | --- | --- |",
      "| 10 | 4 | 1 | 2 | 3 | 10 |",
      "",
      "- every step this run read is accounted for.",
      "",
    ]);
  });

  it("renders no section, and nothing in its place, where the run read no CI configuration", () => {
    const lines = renderMarkdown(reconcile([]), ctx).split("\n");
    expect(lines).not.toContain(heading);
    expect(lines).not.toContain(CORE_MESSAGES[CoreMessage.StepAccountingTableHeader]);
    expect(lines).not.toContain(`- ${CORE_MESSAGES[CoreMessage.EveryStepAccountedFor]}`);
    const headings = lines.flatMap((line, i) => (i > 0 && line.startsWith("#") ? [i] : []));
    expect(headings.length).toBeGreaterThan(0);
    for (const i of headings) expect(lines[i - 1]).toBe("");
  });
});
