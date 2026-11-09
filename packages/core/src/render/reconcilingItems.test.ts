import { describe, it, expect } from "vitest";
import { renderMarkdown } from "../assemble/composers.js";
import { reconcile, summaryOf } from "../domain/evidenceReconciliation.js";
import type { EvidenceReconciliation } from "../domain/evidenceReconciliation.js";
import { parseVitestEvidenceObservations } from "../parse/vitest.js";
import { outcomeDescription } from "./outcomeDescription.js";
import { remarkWordsOf } from "./remarkWords.js";
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
  return `${head}${outcomeDescription(outcome)}${tail}${ran}`;
}

describe("[CLM-RPT-004] the markdown report renders the reconciliation totals as subjects-rows with balanced and out-of-balance columns", () => {
  describe("an obligation side with nothing to show for it", () => {
    it("a scenario with no obligation and no observation renders the no-quality-check sentence alone", () => {
      const md = render([{ claimCode: "CLM-RCI-002", evidenceObligations: [] }], []);
      expect(rowFor(md, "CLM-RCI-002")).toEqual({
        verdict: "out-of-balance",
        items: item("no-quality-check"),
      });
    });

    it("a scenario with no claim code renders the no-claim-code sentence alone, under its feature and title", () => {
      const untagged = "features/checkout.feature : a scenario with no code";
      const md = render([], [], [untagged]);
      expect(rowFor(md, untagged)).toEqual({
        verdict: "out-of-balance",
        items: item("no-claim-code"),
      });
    });
  });

  describe("an observation the obligations do not ask for names where it came from", () => {
    it("a behavioural evidence observation on a scenario with no matching obligation names its locator", () => {
      const md = render(
        [{ claimCode: "CLM-RCI-003", evidenceObligations: [{ qualityCheckKind: "unit" }] }],
        [
          { qualityCheckKind: "unit", claimCode: "CLM-RCI-003", status: "passed", locator: "src/c.test.ts" },
          { qualityCheckKind: "integration", claimCode: "CLM-RCI-003", status: "passed", locator: "tests/steps/c.steps.ts" },
        ]
      );
      expect(rowFor(md, "CLM-RCI-003")).toEqual({
        verdict: "out-of-balance",
        items: item("not-asked-for", "integration", "tests/steps/c.steps.ts", "passed"),
      });
    });

    it("a fitness-function evidence observation on a scenario with no fitness obligation names its fitness function", () => {
      const md = render(
        [{ claimCode: "CLM-RCI-004", evidenceObligations: [{ qualityCheckKind: "unit" }] }],
        [
          { qualityCheckKind: "unit", claimCode: "CLM-RCI-004", status: "passed", locator: "src/d.test.ts" },
          {
            qualityCheckKind: "fitness",
            fitnessFunction: "lint:rci",
            claimCode: "CLM-RCI-004",
            exists: true,
            enforcedOverRealSource: true,
          },
        ]
      );
      expect(rowFor(md, "CLM-RCI-004")).toEqual({
        verdict: "out-of-balance",
        items: item("not-asked-for", "fitness", "lint:rci"),
      });
    });

    it("a behavioural evidence observation citing an unknown claim names its locator on the phantom claim's row", () => {
      const md = render(
        [],
        [{ qualityCheckKind: "unit", claimCode: "CLM-GHO-001", status: "passed", locator: "src/ghost.test.ts" }]
      );
      expect(rowFor(md, "CLM-GHO-001")).toEqual({
        verdict: "out-of-balance",
        items: item("cites-unknown-claim", "unit", "src/ghost.test.ts", "passed"),
      });
    });

    it("a behavioural evidence observation citing an unknown claim with no locator names no locator", () => {
      const md = render([], [{ qualityCheckKind: "unit", claimCode: "CLM-GHO-002", status: "passed" }]);
      expect(rowFor(md, "CLM-GHO-002")).toEqual({
        verdict: "out-of-balance",
        items: item("cites-unknown-claim", "unit", undefined, "passed"),
      });
    });

    it("a behavioural evidence observation citing no claim names its check, outcome and file on the unnamed claim's row, and that it passed", () => {
      const md = render([], [{ qualityCheckKind: "unit", claimCode: null, status: "passed", locator: "src/uncited.test.ts" }]);
      const { verdict, items } = rowFor(md, UNNAMED_CLAIM_ROW);
      expect(verdict).toBe("out-of-balance");
      const [named, result, ...rest] = items.split(" — ");
      expect(rest).toEqual([]);
      expect(named).toBe(item("cites-no-claim", "unit", "src/uncited.test.ts"));
      expect(result).toMatch(/^(?:passed|1 ran, 1 passed, 0 failed)$/);
    });
  });

  describe("evidence that never ran on the unnamed claim's row names where it broke and what it said", () => {
    const brokenRow = (observations: EvidenceObservation[]) => rowFor(render([], observations), UNNAMED_CLAIM_ROW);

    it("a file that failed to collect, with its error, names the locator and the error joined by a colon", () => {
      const observations = parseVitestEvidenceObservations(
        { testResults: [{ name: "src/never-ran.test.ts", status: "failed", message: "Cannot find module './gone.js'" }] }
      );
      expect(brokenRow(observations)).toEqual({
        verdict: "out-of-balance",
        items: item("never-ran", "unit", "src/never-ran.test.ts: Cannot find module './gone.js'"),
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
        items: item("never-ran", "unit", locator),
      });
    });

    it("a file with no name that failed to collect with no error renders no suffix", () => {
      const observations = parseVitestEvidenceObservations(
        { testResults: [{ name: "", status: "failed" }] }
      );
      expect(brokenRow(observations)).toEqual({
        verdict: "out-of-balance",
        items: item("never-ran", "unit"),
      });
    });
  });
});

describe("[CLM-RPT-082] each failing test on a scenario's row is named by its file and its test name, so two failing tests read as two items", () => {
  it("two failing tests in one file read as two items, each naming the file and its test name", () => {
    const ran = (testName: string, status: "failed" | "passed" = "failed"): EvidenceObservation =>
      ({ qualityCheckKind: "unit", claimCode: "CLM-DEM-001", status, locator: "src/widget.test.ts", testName });
    const md = render(
      [{ claimCode: "CLM-DEM-001", evidenceObligations: [{ qualityCheckKind: "unit" }] }],
      [ran("renders the header"), ran("renders the body", "passed"), ran("renders the footer")]
    );
    expect(rowFor(md, "CLM-DEM-001")).toEqual({
      verdict: "out-of-balance",
      items: ["renders the footer", "renders the header"].map((name) => item("failing", "unit", `src/widget.test.ts: ${name}`)).join("; "),
    });
  });
});

describe("[CLM-RPT-083] a failing or cannot-fail fitness evidence observation on a scenario's row is named by its fitness function", () => {
  it.each([
    ["failing", { status: "failed", enforcedOverRealSource: true }],
    ["cannot-fail", { status: "passed", enforcedOverRealSource: false }],
  ] as const)("a %s fitness item names its fitness function", (outcome, ran) => {
    const md = render(
      [{ claimCode: "CLM-DEM-002", evidenceObligations: [{ qualityCheckKind: "fitness" }] }],
      [{ qualityCheckKind: "fitness", fitnessFunction: "lint:demo", claimCode: "CLM-DEM-002", exists: true, ...ran }]
    );
    expect(rowFor(md, "CLM-DEM-002")).toEqual({ verdict: "out-of-balance", items: item(outcome, "fitness", "lint:demo") });
  });
});

describe("[CLM-RPT-084] every reconciling item quotes what the run reported whole in its cell, a pipe, a backslash or a line break included, and leaves out a part the run did not give", () => {
  it.each([
    ["a test's name holding a pipe", { locator: "src/a.test.ts", testName: "a | b" }, "failing", "src/a.test.ts: a \\| b"],
    ["a test's name holding a line break", { locator: "src/a.test.ts", testName: "renders\n  the header " }, "failing", "src/a.test.ts: renders the header"],
    ["a file and no test name", { locator: "src/a.test.ts" }, "failing", "src/a.test.ts"],
    ["a test name and a file that is empty once made safe", { locator: " ", testName: "renders" }, "failing", "renders"],
    ["a test name and no file", { testName: "renders" }, "failing", "renders"],
    ["neither a file nor a test name", {}, "failing", undefined],
    ["a fitness function with an empty name", { qualityCheckKind: "fitness", fitnessFunction: "", exists: true, enforcedOverRealSource: true }, "failing", undefined],
    ["an observation-only item whose file holds a pipe", { claimCode: "CLM-GHO-003", locator: "src/a|b.test.ts" }, "cites-unknown-claim", "src/a\\|b.test.ts", "failed"],
    ["a test's name holding a backslash and a pipe", { locator: "src/a.test.ts", testName: "a \\| b" }, "failing", "src/a.test.ts: a \\\\\\| b"],
    ["a file group's file holding a pipe", { claimCode: null, status: "passed", locator: "src/a|b.test.ts" }, "cites-no-claim", "src/a\\|b.test.ts", "1 ran, 1 passed, 0 failed"],
    ["a CI step's name holding a pipe", { qualityCheckKind: "fitness", claimCode: null, fitnessFunction: "lint | x", exists: true, enforcedOverRealSource: true }, "cites-no-claim", undefined, "1 CI step: lint \\| x"],
    ["a never-ran item whose file is whitespace only", { claimCode: null, neverRan: true, locator: " " }, "never-ran", undefined],
    ["a CI step whose name is empty", { qualityCheckKind: "fitness", claimCode: null, fitnessFunction: "", exists: true, enforcedOverRealSource: true }, "cites-no-claim", undefined, "1 CI step"],
    ["a CI step whose name is whitespace only", { qualityCheckKind: "fitness", claimCode: null, fitnessFunction: " ", exists: true, enforcedOverRealSource: true }, "cites-no-claim", undefined, "1 CI step"],
    ["a test's name holding a semicolon", { locator: "src/a.test.ts", testName: "a; b" }, "failing", "src/a.test.ts: `a; b`"],
    ["a file holding a colon", { locator: "src/a: b.test.ts" }, "failing", "`src/a: b.test.ts`"],
    ["a fitness function holding a comma", { qualityCheckKind: "fitness", fitnessFunction: "lint, x", exists: true, enforcedOverRealSource: true }, "failing", "`lint, x`"],
    ["a CI step's name holding a slash", { qualityCheckKind: "fitness", claimCode: null, fitnessFunction: "lint / x", exists: true, enforcedOverRealSource: true }, "cites-no-claim", undefined, "1 CI step: `lint / x`"],
    ["a file group's failed test name holding a slash", { claimCode: null, locator: "src/a.test.ts", testName: "a / b" }, "cites-no-claim", "src/a.test.ts", "1 ran, 0 passed, 1 failed (failed: `a / b`)"],
    ["a never-ran item's message holding a colon", { claimCode: null, neverRan: true, locator: "src/a.test.ts", message: "Error: gone" }, "never-ran", "src/a.test.ts: `Error: gone`"],
    ["a file group's message holding a colon", { claimCode: null, status: "passed", locator: "src/a.test.ts", message: "Error: gone" }, "cites-no-claim", "src/a.test.ts: `Error: gone`", "1 ran, 1 passed, 0 failed"],
    ["a test's name holding a semicolon and a backslash", { locator: "src/a.test.ts", testName: "a; b\\c" }, "failing", "src/a.test.ts: `a; b\\c`"],
    ["a test's name holding a semicolon and a pipe", { locator: "src/a.test.ts", testName: "a; b | c" }, "failing", "src/a.test.ts: `a; b \\| c`"],
    ["a test's name holding a semicolon, a backtick and a backslash", { locator: "src/a.test.ts", testName: "a`b; c\\d" }, "failing", "src/a.test.ts: ``a`b; c\\d``"],
  ] as const)("%s", (_title, fields, outcome, suffix, result?: string) => {
    const observation = { qualityCheckKind: "unit", claimCode: "CLM-DEM-003", status: "failed", ...fields } as EvidenceObservation;
    const md = render([{ claimCode: "CLM-DEM-003", evidenceObligations: [{ qualityCheckKind: observation.qualityCheckKind }] }], [observation]);
    expect(rowFor(md, observation.claimCode ?? UNNAMED_CLAIM_ROW).items).toBe(item(outcome, observation.qualityCheckKind, suffix, result));
  });

  it("a CI step with a blank name beside one named lint", () => {
    const step = (fitnessFunction: string): EvidenceObservation => ({ qualityCheckKind: "fitness", fitnessFunction, exists: true, enforcedOverRealSource: true });
    const md = render([], [step(""), step("lint")]);
    expect(rowFor(md, UNNAMED_CLAIM_ROW).items).toBe(item("cites-no-claim", "fitness", undefined, "2 CI steps: lint"));
  });

  it.each([
    ["a pipe", "a | b", "a \\| b"],
    ["a semicolon", "a; b", "`a; b`"],
  ])("a shared code's scenario title holding %s", (_title, title, quoted) => {
    const sharer = (title: string): Scenario => ({ claimCode: "CLM-DEM-004", evidenceObligations: [{ qualityCheckKind: "unit" }], feature: "a.feature", title });
    const rows = claimReconciliationsTable(render([sharer(title), sharer("c")], [])).rowsOf("CLM-DEM-004");
    expect(rows.map((row) => row.cell(RECONCILING_ITEMS_COLUMN()))).toContain(item("duplicate-claim-code", "unit") + ` — this one is a.feature : ${quoted}`);
  });

  it.each([
    ["several claim codes", { kind: "several-claim-codes", codes: ["CLM-A", "CLM-B"] }, { kind: "several-claim-codes", codes: ["CLM-A", "CLM-B"] }],
    ["an ambiguous step whose name holds a line break", { kind: "ambiguous-step", step: "run\n  lint" }, { kind: "ambiguous-step", step: "run lint" }],
  ] as const)("a never-ran item's message holding no separator, with a note on %s, reads as written and leaves the note's words outside any code span", (_title, note, shown) => {
    const md = render([], [{ qualityCheckKind: "unit", claimCode: null, status: "failed", neverRan: true, locator: "src/a.test.ts", message: "gone", notes: [note] }]);
    expect(rowFor(md, UNNAMED_CLAIM_ROW).items).toBe(item("never-ran", "unit", `src/a.test.ts: gone ${remarkWordsOf({ notes: [shown] })}`));
  });
});
