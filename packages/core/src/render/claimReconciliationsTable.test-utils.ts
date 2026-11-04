import { expect } from "vitest";
import { CoreMessage } from "./messages.js";
import { coreMessage } from "./coreText.js";
import { markdownHeading } from "./heading.js";

const CLAIM_COLUMN = (): string => coreMessage(CoreMessage.ClaimColumn);
export const VERDICT_COLUMN = (): string => coreMessage(CoreMessage.VerdictColumn);
export const RECONCILING_ITEMS_COLUMN = (): string => coreMessage(CoreMessage.ReconcilingItemsColumn);
const CLAIM_TABLE_START = (): string => `| ${CLAIM_COLUMN()} |`;
const CLAIM_RECONCILIATIONS_HEADING = (): string => markdownHeading(2, coreMessage(CoreMessage.ClaimReconciliationsHeading));

export interface ClaimRow {
  readonly claim: string;
  readonly cells: readonly string[];
  cell(column: string): string;
}

export interface ClaimReconciliationsTable {
  readonly header: readonly string[];
  readonly evidenceColumns: readonly string[];
  readonly rows: readonly ClaimRow[];
  readonly start: number;
  readonly end: number;
  rowOf(claim: string): ClaimRow;
  rowsOf(claim: string): ClaimRow[];
  evidenceOf(row: ClaimRow): string[];
}

// The renderer joins a row's cells with " | " between "| " and " |"; this is its inverse, so a blank cell reads "".
function cellsOf(line: string): string[] {
  expect(line.startsWith("| ") && line.endsWith(" |"), line).toBe(true);
  return line.slice(2, -2).split(" | ");
}

function claimRow(header: readonly string[], line: string): ClaimRow {
  const cells = cellsOf(line);
  expect(cells, line).toHaveLength(header.length);
  return {
    claim: cells[0]!,
    cells,
    cell(column) {
      const at = header.indexOf(column);
      expect(at, `no ${column} column in ${header.join(", ")}`).toBeGreaterThanOrEqual(0);
      return cells[at]!;
    },
  };
}

function tableStart(lines: readonly string[]): number {
  const section = lines.indexOf(CLAIM_RECONCILIATIONS_HEADING());
  expect(section, `expected the heading ${CLAIM_RECONCILIATIONS_HEADING()}`).toBeGreaterThanOrEqual(0);
  const start = lines.findIndex((line, i) => i > section && line.startsWith(CLAIM_TABLE_START()));
  expect(start, `expected the table under ${CLAIM_RECONCILIATIONS_HEADING()}`).toBeGreaterThan(section);
  return start;
}

function tableEnd(lines: readonly string[], start: number): number {
  const end = lines.findIndex((line, i) => i > start && !line.startsWith("|"));
  return end === -1 ? lines.length : end;
}

export function claimReconciliationsTable(markdown: string | readonly string[]): ClaimReconciliationsTable {
  const lines = typeof markdown === "string" ? markdown.split("\n") : markdown;
  const start = tableStart(lines);
  const end = tableEnd(lines, start);
  const header = cellsOf(lines[start]!);
  expect(lines[start + 1]).toBe(`| ${header.map(() => "---").join(" | ")} |`);
  const rows = lines.slice(start + 2, end).map((line) => claimRow(header, line));
  const evidenceColumns = header.slice(1, header.indexOf(VERDICT_COLUMN()));
  const rowsOf = (claim: string): ClaimRow[] => rows.filter((row) => row.claim === claim);
  return {
    header,
    evidenceColumns,
    rows,
    start,
    end,
    rowsOf,
    rowOf(claim) {
      const matching = rowsOf(claim);
      expect(matching, `expected one ${claim} row`).toHaveLength(1);
      return matching[0]!;
    },
    evidenceOf: (row) => evidenceColumns.map((column) => row.cell(column)),
  };
}

export function reconcilingItemsOf(markdown: string, claim: string): string[] {
  return claimReconciliationsTable(markdown).rowOf(claim).cell(RECONCILING_ITEMS_COLUMN()).split("; ");
}

export function verdictAndItemsOf(markdown: string, claim: string): { verdict: string; items: string } {
  const table = claimReconciliationsTable(markdown);
  expect(table.evidenceColumns).toEqual([]);
  const row = table.rowOf(claim);
  return { verdict: row.cell(VERDICT_COLUMN()), items: row.cell(RECONCILING_ITEMS_COLUMN()) };
}
