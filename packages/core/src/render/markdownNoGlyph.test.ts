import { describe, it, expect, beforeEach } from "vitest";
import { renderMarkdown } from "../assemble/composers.js";
import type { Ledger, Outcome } from "../model.js";
import { OUTCOME_DESCRIPTION } from "./outcomeDescription.js";
import { reconcile } from "../domain/evidenceReconciliation.js";
import { sampleReportCtx as ctx } from "./runContext.test-utils.js";
import { __er } from "../evidenceReconciliation.test-utils.js";
import { symbolCharactersIn } from "./symbolCharacter.test-utils.js";
import { publishedExitCodeOf } from "./publishedExitCodes.test-utils.js";
import { RECONCILING_ITEMS_COLUMN, VERDICT_COLUMN, claimReconciliationsTable, reconcilingItemsOf, type ClaimRow } from "./claimReconciliationsTable.test-utils.js";

const QUALITY_CHECKS = ["fitness", "unit", "integration", "e2e", "performance"];
const UNTAGGED = "features/checkout.feature : a scenario with no code";

function ledgerRows(md: string): readonly ClaimRow[] {
  return claimReconciliationsTable(md).rows;
}

function readsInWords(item: string): boolean {
  const sentence = (text: string): boolean => Object.values(OUTCOME_DESCRIPTION).some((s) => text.startsWith(s));
  const colon = item.indexOf(": ");
  return sentence(item) || (colon > 0 && QUALITY_CHECKS.includes(item.slice(0, colon)) && sentence(item.slice(colon + 2)));
}

describe("[SCN-RPT-066] a verdict reads balanced or out-of-balance, and a reconciling item reads its quality check and its outcome's sentence, with no symbol beside either", () => {
  let everyOutcome: Ledger;
  beforeEach(() => {
    everyOutcome = reconcile(
      [
        { scnId: "SCN-NGL-001", evidenceObligations: [{ qualityCheck: "unit" }, { qualityCheck: "fitness" }] },
        { scnId: "SCN-NGL-002", evidenceObligations: [{ qualityCheck: "unit" }] },
        { scnId: "SCN-NGL-003", evidenceObligations: [{ qualityCheck: "unit" }, { qualityCheck: "fitness" }] },
        { scnId: "SCN-NGL-004", evidenceObligations: [] },
        { scnId: "SCN-NGL-005", evidenceObligations: [{ qualityCheck: "unit" }] },
        { scnId: "SCN-NGL-005", evidenceObligations: [{ qualityCheck: "unit" }] },
      ],
      [
        { qualityCheck: "unit", scnId: "SCN-NGL-001", status: "passed", locator: "src/a.test.ts" },
        { qualityCheck: "fitness", fitnessFunction: "lint:sound", scnId: "SCN-NGL-001", exists: true, enforcedOverRealSource: true },
        { qualityCheck: "unit", scnId: "SCN-NGL-002", status: "failed", locator: "src/b.test.ts" },
        { qualityCheck: "integration", scnId: "SCN-NGL-002", status: "passed", locator: "tests/steps/b.steps.ts" },
        { qualityCheck: "fitness", fitnessFunction: "lint:fake", scnId: "SCN-NGL-003", exists: true, enforcedOverRealSource: false },
        { qualityCheck: "unit", scnId: "SCN-NGL-999", status: "passed", locator: "src/ghost.test.ts" },
        { qualityCheck: "unit", scnId: null, status: "passed", locator: "src/uncited.test.ts" },
        { qualityCheck: "fitness", fitnessFunction: "lint:uncited", exists: true, enforcedOverRealSource: true },
        { qualityCheck: "unit", scnId: null, status: "passed", broken: true, locator: "src/broken.test.ts" },
      ],
      [UNTAGGED],
    );
  });

  it("holds every outcome but satisfied among its reconciling items, so every item shape prints", () => {
    const items = ledgerRows(renderMarkdown(__er(everyOutcome), ctx, publishedExitCodeOf)).flatMap((row) => row.cell(RECONCILING_ITEMS_COLUMN).split("; "));
    const outcomes = Object.keys(OUTCOME_DESCRIPTION) as Outcome[];
    for (const outcome of outcomes.filter((o) => o !== "satisfied")) {
      expect(items.some((item) => item.includes(OUTCOME_DESCRIPTION[outcome])), outcome).toBe(true);
    }
  });

  it("shows each Verdict cell as balanced or out-of-balance, and nothing else", () => {
    const verdicts = ledgerRows(renderMarkdown(__er(everyOutcome), ctx, publishedExitCodeOf)).map((row) => row.cell(VERDICT_COLUMN));
    expect(new Set(verdicts)).toEqual(new Set(["balanced", "out-of-balance"]));
  });

  it("reads each reconciling item as its quality check and its outcome's sentence, or the sentence alone", () => {
    const items = ledgerRows(renderMarkdown(__er(everyOutcome), ctx, publishedExitCodeOf))
      .map((row) => row.cell(RECONCILING_ITEMS_COLUMN))
      .filter((cell) => cell !== "—")
      .flatMap((cell) => cell.split("; "));
    expect(items.length).toBeGreaterThan(0);
    for (const item of items) expect(readsInWords(item), item).toBe(true);
    expect(items).toContain(OUTCOME_DESCRIPTION["no-scn-code"]);
    expect(items).toContain(OUTCOME_DESCRIPTION["both-missing"]);
    expect(items.some((item) => item.startsWith(`unit: ${OUTCOME_DESCRIPTION.failing}`))).toBe(true);
  });

  it("reads each fitness evidence obligation's reconciling item on its claim's row as its quality check and its outcome's sentence, with no symbol", () => {
    const md = renderMarkdown(__er(everyOutcome), ctx, publishedExitCodeOf);
    const watermelon = reconcilingItemsOf(md, "SCN-NGL-003");
    expect(watermelon.some((item) => item.startsWith(`fitness: ${OUTCOME_DESCRIPTION.watermelon}`))).toBe(true);
    expect(symbolCharactersIn(watermelon.join("\n"))).toEqual([]);
    expect(reconcilingItemsOf(md, "SCN-NGL-001").filter((item) => item.startsWith("fitness")), "a satisfied obligation adds no item").toEqual([]);
  });

  it("holds no symbol character in any cell of the claim table, judged by what a symbol is, not by a list of known ones", () => {
    const cells = ledgerRows(renderMarkdown(__er(everyOutcome), ctx, publishedExitCodeOf)).flatMap((row) => row.cells);
    expect(cells.length).toBeGreaterThan(0);
    expect(symbolCharactersIn(cells.join("\n"))).toEqual([]);
  });
});
