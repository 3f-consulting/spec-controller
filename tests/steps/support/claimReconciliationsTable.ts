import assert from "node:assert/strict";
import { entryText } from "./catalogue.js";
import { headingLine } from "./reportLines.js";

const cellsOf = (line: string): string[] => line.slice(2, -2).split(" | ");

function tableLines(report: string): string[] {
  const lines = report.split("\n");
  const section = lines.indexOf(headingLine(2, "claim-reconciliations-heading"));
  const tableStart = `| ${entryText("claim-column")} |`;
  const start = lines.findIndex((line, i) => section >= 0 && i > section && line.startsWith(tableStart));
  assert.ok(start > section, `expected the Claim Reconciliations table in the report; got:\n${report}`);
  const end = lines.findIndex((line, i) => i > start && !line.startsWith("|"));
  return lines.slice(start, end === -1 ? lines.length : end);
}

export function claimReconciliationCell(report: string, claim: string, column: string): string {
  const [header = "", , ...rows] = tableLines(report);
  const at = cellsOf(header).indexOf(column);
  assert.ok(at >= 0, `expected a ${column} column in the Claim Reconciliations table; got:\n${header}`);
  const matching = rows.map(cellsOf).filter((cells) => cells[0] === claim);
  assert.equal(matching.length, 1, `expected one ${claim} row in the Claim Reconciliations table; got:\n${rows.join("\n")}`);
  return matching[0]![at]!;
}
