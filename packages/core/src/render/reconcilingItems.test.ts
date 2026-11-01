import { describe, it, expect } from "vitest";
import { renderMarkdown } from "../assemble/composers.js";
import { reconcile, summaryOf } from "../domain/evidenceReconciliation.js";
import type { EvidenceReconciliation } from "../domain/evidenceReconciliation.js";
import { parseVitestEvidenceObservations } from "../parse/vitest.js";
import { OUTCOME_DESCRIPTION } from "./outcomeDescription.js";
import type { EvidenceObservation, Outcome, Scenario } from "../model.js";
import type { RunContext } from "../domain/runProvenance.js";
import { specsFeaturesInputs } from "./runContext.test-utils.js";
import { publishedExitCodeOf } from "./publishedExitCodes.test-utils.js";
import { claimReconciliationsTable, RECONCILING_ITEMS_COLUMN, verdictAndItemsOf as rowFor } from "./claimReconciliationsTable.test-utils.js";

const ctx: RunContext = {
  target: "reconciling-items-target",
  ...specsFeaturesInputs,
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
  const reconciliation: EvidenceReconciliation = { summary: summaryOf(ledger, false), ledger };
  return renderMarkdown(reconciliation, ctx, publishedExitCodeOf);
}

function item(outcome: Outcome, subject?: string, suffix?: string, result?: string): string {
  const head = subject === undefined ? "" : `${subject}: `;
  const tail = suffix === undefined ? "" : ` (${suffix})`;
  const ran = result === undefined ? "" : ` — ${result}`;
  return `${head}${OUTCOME_DESCRIPTION[outcome]}${tail}${ran}`;
}

describe("[SCN-RPT-004] the markdown report renders the evidence reconciliation as subjects-rows with balanced and out-of-balance columns", () => {
  describe("an obligation side with nothing to show for it", () => {
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
        [{ scnId: "SCN-RCI-003", evidenceObligations: [{ qualityCheckKind: "unit" }] }],
        [
          { qualityCheckKind: "unit", scnId: "SCN-RCI-003", status: "passed", locator: "src/c.test.ts" },
          { qualityCheckKind: "integration", scnId: "SCN-RCI-003", status: "passed", locator: "tests/steps/c.steps.ts" },
        ]
      );
      expect(rowFor(md, "SCN-RCI-003")).toEqual({
        verdict: "out-of-balance",
        items: item("no-evidence-obligation", "integration", "tests/steps/c.steps.ts", "passed"),
      });
    });

    it("a fitness-function evidence observation on a scenario with no fitness obligation names its fitness function", () => {
      const md = render(
        [{ scnId: "SCN-RCI-004", evidenceObligations: [{ qualityCheckKind: "unit" }] }],
        [
          { qualityCheckKind: "unit", scnId: "SCN-RCI-004", status: "passed", locator: "src/d.test.ts" },
          {
            qualityCheckKind: "fitness",
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
        [{ qualityCheckKind: "unit", scnId: "SCN-GHO-001", status: "passed", locator: "src/ghost.test.ts" }]
      );
      expect(rowFor(md, "SCN-GHO-001")).toEqual({
        verdict: "out-of-balance",
        items: item("cites-unknown-scenario", "unit", "src/ghost.test.ts", "passed"),
      });
    });

    it("a behavioural evidence observation citing an unknown scenario with no locator names no locator", () => {
      const md = render([], [{ qualityCheckKind: "unit", scnId: "SCN-GHO-002", status: "passed" }]);
      expect(rowFor(md, "SCN-GHO-002")).toEqual({
        verdict: "out-of-balance",
        items: item("cites-unknown-scenario", "unit", undefined, "passed"),
      });
    });

    it("a behavioural evidence observation citing no scenario names its check, outcome and file on the unnamed claim's row, and that it passed", () => {
      const md = render([], [{ qualityCheckKind: "unit", scnId: null, status: "passed", locator: "src/uncited.test.ts" }]);
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
        { testResults: [{ name: "src/broken.test.ts", status: "failed", message: "Error: Cannot find module './gone.js'" }] }
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
      const observations = parseVitestEvidenceObservations({ testResults: [testResult] });
      expect(brokenRow(observations)).toEqual({
        verdict: "out-of-balance",
        items: item("broken", "unit", locator),
      });
    });

    it("a file with no name that failed to collect with no error renders no suffix", () => {
      const observations = parseVitestEvidenceObservations(
        { testResults: [{ name: "", status: "failed" }] }
      );
      expect(brokenRow(observations)).toEqual({
        verdict: "out-of-balance",
        items: item("broken", "unit"),
      });
    });
  });
});

describe("[SCN-RPT-082] each failing test on a scenario's row is named by its file and its test name, so two failing tests read as two items", () => {
  it("two failing tests in one file read as two items, each naming the file and its test name", () => {
    const ran = (testName: string, status: "failed" | "passed" = "failed"): EvidenceObservation =>
      ({ qualityCheckKind: "unit", scnId: "SCN-DEM-001", status, locator: "src/widget.test.ts", testName });
    const md = render(
      [{ scnId: "SCN-DEM-001", evidenceObligations: [{ qualityCheckKind: "unit" }] }],
      [ran("renders the header"), ran("renders the body", "passed"), ran("renders the footer")]
    );
    expect(rowFor(md, "SCN-DEM-001")).toEqual({
      verdict: "out-of-balance",
      items: ["renders the footer", "renders the header"].map((name) => item("failing", "unit", `src/widget.test.ts: ${name}`)).join("; "),
    });
  });
});

describe("[SCN-RPT-083] a failing or watermelon fitness evidence observation on a scenario's row is named by its fitness function", () => {
  it.each([
    ["failing", { status: "failed", enforcedOverRealSource: true }],
    ["watermelon", { status: "passed", enforcedOverRealSource: false }],
  ] as const)("a %s fitness item names its fitness function", (outcome, ran) => {
    const md = render(
      [{ scnId: "SCN-DEM-002", evidenceObligations: [{ qualityCheckKind: "fitness" }] }],
      [{ qualityCheckKind: "fitness", fitnessFunction: "lint:demo", scnId: "SCN-DEM-002", exists: true, ...ran }]
    );
    expect(rowFor(md, "SCN-DEM-002")).toEqual({ verdict: "out-of-balance", items: item(outcome, "fitness", "lint:demo") });
  });
});

describe("[SCN-RPT-084] every reconciling item quotes what the run reported whole in its cell, a pipe, a backslash or a line break included, and leaves out a part the run did not give", () => {
  it.each([
    ["a test's name holding a pipe", { locator: "src/a.test.ts", testName: "a | b" }, "failing", "src/a.test.ts: a \\| b"],
    ["a test's name holding a line break", { locator: "src/a.test.ts", testName: "renders\n  the header " }, "failing", "src/a.test.ts: renders the header"],
    ["a file and no test name", { locator: "src/a.test.ts" }, "failing", "src/a.test.ts"],
    ["a test name and a file that is empty once made safe", { locator: " ", testName: "renders" }, "failing", "renders"],
    ["a test name and no file", { testName: "renders" }, "failing", "renders"],
    ["neither a file nor a test name", {}, "failing", undefined],
    ["a fitness function with an empty name", { qualityCheckKind: "fitness", fitnessFunction: "", exists: true, enforcedOverRealSource: true }, "failing", undefined],
    ["an observation-only item whose file holds a pipe", { scnId: "SCN-GHO-003", locator: "src/a|b.test.ts" }, "cites-unknown-scenario", "src/a\\|b.test.ts", "failed"],
    ["a test's name holding a backslash and a pipe", { locator: "src/a.test.ts", testName: "a \\| b" }, "failing", "src/a.test.ts: a \\\\\\| b"],
    ["a file group's file holding a pipe", { scnId: null, status: "passed", locator: "src/a|b.test.ts" }, "cites-no-scenario", "src/a\\|b.test.ts", "1 ran, 1 passed, 0 failed"],
    ["a CI step's name holding a pipe", { qualityCheckKind: "fitness", scnId: null, fitnessFunction: "lint | x", exists: true, enforcedOverRealSource: true }, "cites-no-scenario", undefined, "1 CI step: lint \\| x"],
    ["a broken item whose file is whitespace only", { scnId: null, broken: true, locator: " " }, "broken", undefined],
    ["a CI step whose name is empty", { qualityCheckKind: "fitness", scnId: null, fitnessFunction: "", exists: true, enforcedOverRealSource: true }, "cites-no-scenario", undefined, "1 CI step"],
    ["a CI step whose name is whitespace only", { qualityCheckKind: "fitness", scnId: null, fitnessFunction: " ", exists: true, enforcedOverRealSource: true }, "cites-no-scenario", undefined, "1 CI step"],
  ] as const)("%s", (_title, fields, outcome, suffix, result?: string) => {
    const observation = { qualityCheckKind: "unit", scnId: "SCN-DEM-003", status: "failed", ...fields } as EvidenceObservation;
    const md = render([{ scnId: "SCN-DEM-003", evidenceObligations: [{ qualityCheckKind: observation.qualityCheckKind }] }], [observation]);
    expect(rowFor(md, observation.scnId ?? UNNAMED_CLAIM_ROW).items).toBe(item(outcome, observation.qualityCheckKind, suffix, result));
  });

  it("a CI step with a blank name beside one named lint", () => {
    const step = (fitnessFunction: string): EvidenceObservation => ({ qualityCheckKind: "fitness", fitnessFunction, exists: true, enforcedOverRealSource: true });
    const md = render([], [step(""), step("lint")]);
    expect(rowFor(md, UNNAMED_CLAIM_ROW).items).toBe(item("cites-no-scenario", "fitness", undefined, "2 CI steps: lint"));
  });

  it("a shared code's scenario title holding a pipe", () => {
    const sharer = (title: string): Scenario => ({ scnId: "SCN-DEM-004", evidenceObligations: [{ qualityCheckKind: "unit" }], feature: "a.feature", title });
    const rows = claimReconciliationsTable(render([sharer("a | b"), sharer("c")], [])).rowsOf("SCN-DEM-004");
    expect(rows.map((row) => row.cell(RECONCILING_ITEMS_COLUMN))).toContain(item("duplicate-scn-code", "unit") + " — this one is a.feature : a \\| b");
  });
});
