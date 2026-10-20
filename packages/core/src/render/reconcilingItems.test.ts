import { describe, it, expect } from "vitest";
import { renderMarkdown } from "../assemble/composers.js";
import { reconcile, summaryOf } from "../domain/evidenceReconciliation.js";
import type { EvidenceReconciliation } from "../domain/evidenceReconciliation.js";
import { parseVitestEvidenceObservations } from "../parse/vitest.js";
import { CORE_MESSAGES, CoreMessage } from "./messages.js";
import { OUTCOME_DESCRIPTION } from "./outcomeDescription.js";
import type { EvidenceObservation, Outcome, Scenario } from "../model.js";
import type { RunContext } from "../domain/runProvenance.js";
import { FEATURES, VITEST, PYTEST, JEST, JUNIT, RSPEC, CUCUMBER, CI, PACKAGE_JSON, CI_STEPS } from "../runInputs.test-utils.js";

const ctx: RunContext = {
  target: "reconciling-items-target",
  inputs: [{ ...FEATURES, path: "specs/features" }, VITEST, PYTEST, JEST, JUNIT, RSPEC, CUCUMBER, CI, PACKAGE_JSON, CI_STEPS],
  corpus: "specs/features",
  runStart: new Date("2026-10-05T09:00:00.000Z"),
  sourceSha: "905a987c0ffeeba110000000000000000deadbeef",
  toolSha: "13ee47f271ace511efdb2511276284b4cb50c247",
  toolVersion: "0.1.0",
};

const UNNAMED_CLAIM_ROW = "(unnamed claim)";

function render(
  scenarios: Scenario[],
  observations: EvidenceObservation[],
  untagged: readonly string[] = []
): string {
  const ledger = reconcile(scenarios, observations, untagged);
  const reconciliation: EvidenceReconciliation = { summary: summaryOf(ledger, false, false), ledger };
  return renderMarkdown(reconciliation, ctx);
}

function ledgerRows(md: string): string[] {
  const lines = md.split("\n");
  const header = lines.indexOf(CORE_MESSAGES[CoreMessage.LedgerTableHeader]);
  expect(header).toBeGreaterThanOrEqual(0);
  expect(lines[header + 1]).toBe("| --- | --- | --- |");
  const rows: string[] = [];
  for (const line of lines.slice(header + 2)) {
    if (!line.startsWith("| ")) break;
    rows.push(line);
  }
  return rows;
}

function rowFor(md: string, account: string): { verdict: string; items: string } {
  const matching = ledgerRows(md).filter((row) => row.startsWith(`| ${account} | `));
  expect(matching).toHaveLength(1);
  const cells = matching[0]!.slice(2, -2).split(" | ");
  expect(cells).toHaveLength(3);
  expect(cells[0]).toBe(account);
  return { verdict: cells[1]!, items: cells[2]! };
}

function item(outcome: Outcome, subject?: string, suffix?: string, result?: string): string {
  const head = subject === undefined ? "" : `${subject}: `;
  const tail = suffix === undefined ? "" : ` (${suffix})`;
  const ran = result === undefined ? "" : ` — ${result}`;
  return `${head}${OUTCOME_DESCRIPTION[outcome]}${tail}${ran}`;
}

describe("[SCN-RPT-004] the markdown report renders the evidence reconciliation as subjects-rows with balanced and out-of-balance columns", () => {
  describe("an obligation side with nothing to show for it", () => {
    it("a failing observation renders its quality check and the outcome's sentence, with no suffix", () => {
      const md = render(
        [{ scnId: "SCN-RCI-001", evidenceObligations: [{ qualityCheck: "unit" }] }],
        [{ qualityCheck: "unit", scnId: "SCN-RCI-001", status: "failed", locator: "src/a.test.ts" }]
      );
      expect(rowFor(md, "SCN-RCI-001")).toEqual({
        verdict: "out-of-balance",
        items: item("failing", "unit"),
      });
    });

    it("a scenario with no obligation and no observation renders the both-missing sentence alone", () => {
      const md = render([{ scnId: "SCN-RCI-002", evidenceObligations: [] }], []);
      expect(rowFor(md, "SCN-RCI-002")).toEqual({
        verdict: "out-of-balance",
        items: item("both-missing"),
      });
    });

    it("a scenario with no @SCN code renders the no-scn-code sentence alone, under its feature and title", () => {
      const untagged = "features/checkout.feature : a scenario with no code";
      const md = render([], [], [untagged]);
      expect(rowFor(md, untagged)).toEqual({
        verdict: "out-of-balance",
        items: item("no-scn-code"),
      });
    });
  });

  describe("an observation the obligations do not ask for names where it came from", () => {
    it("a behavioural evidence observation on a scenario with no matching obligation names its locator", () => {
      const md = render(
        [{ scnId: "SCN-RCI-003", evidenceObligations: [{ qualityCheck: "unit" }] }],
        [
          { qualityCheck: "unit", scnId: "SCN-RCI-003", status: "passed", locator: "src/c.test.ts" },
          { qualityCheck: "integration", scnId: "SCN-RCI-003", status: "passed", locator: "tests/steps/c.steps.ts" },
        ]
      );
      expect(rowFor(md, "SCN-RCI-003")).toEqual({
        verdict: "out-of-balance",
        items: item("no-evidence-obligation", "integration", "tests/steps/c.steps.ts", "passed"),
      });
    });

    it("a fitness-function evidence observation on a scenario with no fitness obligation names its fitness function", () => {
      const md = render(
        [{ scnId: "SCN-RCI-004", evidenceObligations: [{ qualityCheck: "unit" }] }],
        [
          { qualityCheck: "unit", scnId: "SCN-RCI-004", status: "passed", locator: "src/d.test.ts" },
          {
            qualityCheck: "fitness",
            fitnessFunction: "lint:rci",
            scnId: "SCN-RCI-004",
            exists: true,
            enforcedOverRealSource: true,
          },
        ]
      );
      expect(rowFor(md, "SCN-RCI-004")).toEqual({
        verdict: "out-of-balance",
        items: item("no-evidence-obligation", "fitness", "lint:rci"),
      });
    });

    it("a behavioural evidence observation citing an unknown scenario names its locator on the phantom claim's row", () => {
      const md = render(
        [],
        [{ qualityCheck: "unit", scnId: "SCN-GHO-001", status: "passed", locator: "src/ghost.test.ts" }]
      );
      expect(rowFor(md, "SCN-GHO-001")).toEqual({
        verdict: "out-of-balance",
        items: item("cites-unknown-scenario", "unit", "src/ghost.test.ts", "passed"),
      });
    });

    it("a behavioural evidence observation citing an unknown scenario with no locator names no locator", () => {
      const md = render([], [{ qualityCheck: "unit", scnId: "SCN-GHO-002", status: "passed" }]);
      expect(rowFor(md, "SCN-GHO-002")).toEqual({
        verdict: "out-of-balance",
        items: item("cites-unknown-scenario", "unit", undefined, "passed"),
      });
    });

    it("a behavioural evidence observation citing no scenario names its check, outcome and file on the unnamed claim's row, and that it passed", () => {
      const md = render([], [{ qualityCheck: "unit", scnId: null, status: "passed", locator: "src/uncited.test.ts" }]);
      const { verdict, items } = rowFor(md, UNNAMED_CLAIM_ROW);
      expect(verdict).toBe("out-of-balance");
      const [named, result, ...rest] = items.split(" — ");
      expect(rest).toEqual([]);
      expect(named).toBe(item("cites-no-scenario", "unit", "src/uncited.test.ts"));
      expect(result).toMatch(/^(?:passed|1 ran, 1 passed, 0 failed)$/);
    });
  });

  describe("broken evidence on the unnamed claim's row names where it broke and what it said", () => {
    const brokenRow = (observations: EvidenceObservation[]) => rowFor(render([], observations), UNNAMED_CLAIM_ROW);

    it("a file that failed to collect, with its error, names the locator and the error joined by a colon", () => {
      const observations = parseVitestEvidenceObservations(
        { testResults: [{ name: "src/broken.test.ts", status: "failed", message: "Error: Cannot find module './gone.js'" }] },
        "unit"
      );
      expect(brokenRow(observations)).toEqual({
        verdict: "out-of-balance",
        items: item("broken", "unit", "src/broken.test.ts: Error: Cannot find module './gone.js'"),
      });
    });

    it.each([
      [
        "a file that failed to collect with no error names the locator alone",
        { name: "src/silent.test.ts", status: "failed" },
        "src/silent.test.ts",
      ],
      [
        "a file that failed to collect with an empty error names the locator alone, with no joiner",
        { name: "src/empty.test.ts", status: "failed", message: "" },
        "src/empty.test.ts",
      ],
    ])("%s", (_title, testResult, locator) => {
      const observations = parseVitestEvidenceObservations({ testResults: [testResult] }, "unit");
      expect(brokenRow(observations)).toEqual({
        verdict: "out-of-balance",
        items: item("broken", "unit", locator),
      });
    });

    it("a file with no name that failed to collect with no error renders no suffix", () => {
      const observations = parseVitestEvidenceObservations(
        { testResults: [{ name: "", status: "failed" }] },
        "unit"
      );
      expect(brokenRow(observations)).toEqual({
        verdict: "out-of-balance",
        items: item("broken", "unit"),
      });
    });
  });
});
