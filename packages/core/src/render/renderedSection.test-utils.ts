import { expect } from "vitest";
import type { EvidenceReconciliation } from "../assemble/renderInput.js";
import { renderMarkdown } from "../assemble/composers.js";
import { CORE_MESSAGES, CoreMessage } from "./messages.js";
import { sectionCtxNextDay as ctx } from "./runContext.test-utils.js";

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

export const behaviouralRunnersSection = (lines: readonly string[]): string[] =>
  sectionUnder(CORE_MESSAGES[CoreMessage.BehaviouralRunnersHeading])(lines);

export const linesOf = (reconciliation: EvidenceReconciliation): string[] =>
  renderMarkdown(reconciliation, ctx).split("\n");
