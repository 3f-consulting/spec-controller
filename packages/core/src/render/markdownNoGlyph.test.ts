import { describe, it, expect, beforeEach } from "vitest";
import { renderMarkdown } from "../assemble/composers.js";
import type { Ledger, Outcome } from "../model.js";
import { OUTCOME_DESCRIPTION, outcomeDescription } from "./outcomeDescription.js";
import { reconcile } from "../domain/evidenceReconciliation.js";
import { sampleReportCtx as ctx } from "./runContext.test-utils.js";
import { __er } from "../evidenceReconciliation.test-utils.js";
import { symbolCharactersIn } from "./symbolCharacter.test-utils.js";
import { publishedExitCodeOf } from "./publishedExitCodes.test-utils.js";
import { RECONCILING_ITEMS_COLUMN, VERDICT_COLUMN, claimReconciliationsTable, reconcilingItemsOf, type ClaimRow } from "./claimReconciliationsTable.test-utils.js";

const QUALITY_CHECK_KINDS = ["fitness", "unit", "integration", "e2e", "performance"];
const UNTAGGED = "features/checkout.feature : a scenario with no code";

function ledgerRows(md: string): readonly ClaimRow[] {
  return claimReconciliationsTable(md).rows;
}

function readsInWords(item: string): boolean {
  const sentence = (text: string): boolean => (Object.keys(OUTCOME_DESCRIPTION) as Outcome[]).map(outcomeDescription).some((s) => text.startsWith(s));
  const colon = item.indexOf(": ");
  return sentence(item) || (colon > 0 && QUALITY_CHECK_KINDS.includes(item.slice(0, colon)) && sentence(item.slice(colon + 2)));
}

describe("[CLM-RPT-066] a verdict reads balanced or out-of-balance, and a reconciling item reads its kind of quality check and its outcome's sentence, with no symbol beside either", () => {
  let everyOutcome: Ledger;
  beforeEach(() => {
    everyOutcome = reconcile(
      [
        { claimCode: "CLM-NGL-001", evidenceObligations: [{ qualityCheckKind: "unit" }, { qualityCheckKind: "fitness" }] },
        { claimCode: "CLM-NGL-002", evidenceObligations: [{ qualityCheckKind: "unit" }] },
        { claimCode: "CLM-NGL-003", evidenceObligations: [{ qualityCheckKind: "unit" }, { qualityCheckKind: "fitness" }] },
        { claimCode: "CLM-NGL-004", evidenceObligations: [] },
        { claimCode: "CLM-NGL-005", evidenceObligations: [{ qualityCheckKind: "unit" }] },
        { claimCode: "CLM-NGL-005", evidenceObligations: [{ qualityCheckKind: "unit" }] },
      ],
      [
        { qualityCheckKind: "unit", claimCode: "CLM-NGL-001", status: "passed", locator: "src/a.test.ts" },
        { qualityCheckKind: "fitness", fitnessFunction: "lint:sound", claimCode: "CLM-NGL-001", exists: true, enforcedOverRealSource: true },
        { qualityCheckKind: "unit", claimCode: "CLM-NGL-002", status: "failed", locator: "src/b.test.ts" },
        { qualityCheckKind: "integration", claimCode: "CLM-NGL-002", status: "passed", locator: "tests/steps/b.steps.ts" },
        { qualityCheckKind: "fitness", fitnessFunction: "lint:fake", claimCode: "CLM-NGL-003", exists: true, enforcedOverRealSource: false },
        { qualityCheckKind: "unit", claimCode: "CLM-NGL-999", status: "passed", locator: "src/ghost.test.ts" },
        { qualityCheckKind: "unit", claimCode: null, status: "passed", locator: "src/uncited.test.ts" },
        { qualityCheckKind: "fitness", fitnessFunction: "lint:uncited", exists: true, enforcedOverRealSource: true },
        { qualityCheckKind: "unit", claimCode: null, status: "passed", broken: true, locator: "src/broken.test.ts" },
      ],
      [UNTAGGED],
    );
  });

  it("holds every outcome but satisfied among its reconciling items, so every item shape prints", () => {
    const items = ledgerRows(renderMarkdown(__er(everyOutcome), ctx, publishedExitCodeOf)).flatMap((row) => row.cell(RECONCILING_ITEMS_COLUMN()).split("; "));
    const outcomes = Object.keys(OUTCOME_DESCRIPTION) as Outcome[];
    for (const outcome of outcomes.filter((o) => o !== "satisfied")) {
      expect(items.some((item) => item.includes(outcomeDescription(outcome))), outcome).toBe(true);
    }
  });

  it("shows each Verdict cell as balanced or out-of-balance, and nothing else", () => {
    const verdicts = ledgerRows(renderMarkdown(__er(everyOutcome), ctx, publishedExitCodeOf)).map((row) => row.cell(VERDICT_COLUMN()));
    expect(new Set(verdicts)).toEqual(new Set(["balanced", "out-of-balance"]));
  });

  it("reads each reconciling item as its kind of quality check and its outcome's sentence, or the sentence alone", () => {
    const items = ledgerRows(renderMarkdown(__er(everyOutcome), ctx, publishedExitCodeOf))
      .map((row) => row.cell(RECONCILING_ITEMS_COLUMN()))
      .filter((cell) => cell !== "—")
      .flatMap((cell) => cell.split("; "));
    expect(items.length).toBeGreaterThan(0);
    for (const item of items) expect(readsInWords(item), item).toBe(true);
    expect(items).toContain(outcomeDescription("no-claim-code"));
    expect(items).toContain(outcomeDescription("both-missing"));
    expect(items.some((item) => item.startsWith(`unit: ${outcomeDescription("failing")}`))).toBe(true);
  });

  it("reads each fitness evidence obligation's reconciling item on its claim's row as its kind of quality check and its outcome's sentence, with no symbol", () => {
    const md = renderMarkdown(__er(everyOutcome), ctx, publishedExitCodeOf);
    const watermelon = reconcilingItemsOf(md, "CLM-NGL-003");
    expect(watermelon.some((item) => item.startsWith(`fitness: ${outcomeDescription("watermelon")}`))).toBe(true);
    expect(symbolCharactersIn(watermelon.join("\n"))).toEqual([]);
    expect(reconcilingItemsOf(md, "CLM-NGL-001").filter((item) => item.startsWith("fitness")), "a satisfied obligation adds no item").toEqual([]);
  });

  it("holds no symbol character in any cell of the claim table, judged by what a symbol is, not by a list of known ones", () => {
    const cells = ledgerRows(renderMarkdown(__er(everyOutcome), ctx, publishedExitCodeOf)).flatMap((row) => row.cells);
    expect(cells.length).toBeGreaterThan(0);
    expect(symbolCharactersIn(cells.join("\n"))).toEqual([]);
  });
});
