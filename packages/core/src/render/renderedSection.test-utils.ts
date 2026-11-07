import { expect } from "vitest";
import type { EvidenceReconciliation } from "../assemble/renderInput.js";
import { renderMarkdown } from "../assemble/composers.js";
import { sectionCtxNextDay as ctx } from "./runContext.test-utils.js";
import { publishedExitCodeOf } from "./publishedExitCodes.test-utils.js";
import { CoreMessage } from "./messages.js";
import { coreMessage } from "./coreText.js";
import { markdownHeading } from "./heading.js";

export function sectionUnder(heading: string): (lines: readonly string[]) => string[] {
  return function section(lines: readonly string[]): string[] {
    const start = lines.indexOf(heading);
    expect(start).toBeGreaterThanOrEqual(0);
    const next = lines.findIndex((line, i) => i > start && line.startsWith("#"));
    return lines.slice(start, next === -1 ? lines.length : next);
  };
}

export const cells = (row: string): string[] =>
  row
    .split("|")
    .slice(1, -1)
    .map((cell) => cell.trim());

export const linesOf = (reconciliation: EvidenceReconciliation): string[] =>
  renderMarkdown(reconciliation, ctx, publishedExitCodeOf).split("\n");

export const stepAccountingSection = (lines: readonly string[]): string[] =>
  sectionUnder(markdownHeading(3, coreMessage(CoreMessage.StepAccountingHeading)))(lines);

export const endOfStepAccountingTable = (section: readonly string[]): number => {
  const header = section.indexOf(coreMessage(CoreMessage.StepAccountingTableHeader));
  expect(header).toBeGreaterThanOrEqual(0);
  const end = section.indexOf("", header);
  expect(end).toBeGreaterThan(header);
  return end;
};

export function censusBlock(md: string): string[] {
  const lines = md.split("\n");
  const start = lines.indexOf(`- ${coreMessage(CoreMessage.ExcludedClaimOccurrences, { count: 0 })}`);
  expect(start).toBeGreaterThan(0);
  const block = lines.slice(start);
  return block.slice(0, block.indexOf(""));
}
